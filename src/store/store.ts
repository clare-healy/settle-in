// The store: durable IndexedDB access with strict durability where the treaty
// requires it, and transactional projections written atomically with events.
//
// Strict durability (docs/implementation-treaty.md § Persistence model, build
// plan § Strict durability): run-start, teaching-state, wake-message,
// finish/abandon, and note transactions pass `durability: 'strict'` and resolve
// only on transaction completion (`await tx.done`). Relaxed durability is used
// only for presentation events and preferences. fake-indexeddb ignores the
// option; real-browser verification lands later (M6/M7 per the build plan).
//
// Immutability (§ Identity and immutability): class revisions have no update
// path. `putClassRevision` is put-if-absent, so re-importing an identical
// source_hash is a no-op and nothing can mutate a stored definition (H5).

import type { RunEvent } from '../schema/index.js';
import { openDatabase, type OpenOptions, type SettleInDatabase } from './db.js';
import type {
  LibrarySnapshot,
  PreferenceEntry,
  PreferenceValue,
  RestoreHooks,
  RestoreMode,
  RunProjection,
  StoredClassRevision,
  StoredEvent,
  StoredNotes,
  StoredRun,
} from './types.js';

/** Transaction durability. Strict for durable teaching state; relaxed otherwise. */
type Durability = 'strict' | 'relaxed';

function durabilityOption(d: Durability): IDBTransactionOptions | undefined {
  return d === 'strict' ? { durability: 'strict' } : undefined;
}

export type BeginRunResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: 'active-run-exists' };

export type PutClassResult = {
  readonly stored: 'inserted' | 'existing';
  readonly record: StoredClassRevision;
};

/**
 * A patch applied to a run record inside the same transaction as an appended
 * event. `projection` and/or `status` are updated atomically with the event.
 */
export interface RunPatch {
  readonly projection?: RunProjection;
  readonly status?: StoredRun['status'];
}

export class Store {
  private constructor(private readonly db: SettleInDatabase) {}

  /** Open (creating/migrating) the database and return a Store over it. */
  static async open(options: OpenOptions = {}): Promise<Store> {
    const db = await openDatabase(options);
    return new Store(db);
  }

  /** For an already-open idb database (used by tests that manage the connection). */
  static fromDatabase(db: SettleInDatabase): Store {
    return new Store(db);
  }

  close(): void {
    this.db.close();
  }

  // --- Classes (immutable revisions) ---------------------------------------

  /**
   * Store a class revision idempotently. If `sourceHash` already exists, the
   * existing record is returned unchanged and nothing is written — a stored
   * definition is never mutated (H5, C5). A different source_hash for the same
   * class_id is simply a new record (C6 new-revision identity); the caller
   * signals confirmation, the store only enforces identity.
   */
  async putClassRevision(record: StoredClassRevision): Promise<PutClassResult> {
    const tx = this.db.transaction('classes', 'readwrite', durabilityOption('strict'));
    const store = tx.objectStore('classes');
    const existing = await store.get(record.sourceHash);
    if (existing) {
      await tx.done;
      return { stored: 'existing', record: existing };
    }
    await store.put(record);
    await tx.done;
    return { stored: 'inserted', record };
  }

  getClassRevision(sourceHash: string): Promise<StoredClassRevision | undefined> {
    return this.db.get('classes', sourceHash);
  }

  getClassRevisionsByClassId(classId: string): Promise<StoredClassRevision[]> {
    return this.db.getAllFromIndex('classes', 'by_class_id', classId);
  }

  getAllClassRevisions(): Promise<StoredClassRevision[]> {
    return this.db.getAll('classes');
  }

  // --- Runs -----------------------------------------------------------------

  /**
   * Begin a run: the single-active-run guard and the first writes happen in ONE
   * strict transaction, so two concurrent begins cannot both pass the guard
   * (F7). If any run is already `active_run`, the transaction is abandoned and
   * nothing is written. `startEvents` are the run's opening events
   * (`run_started`, then the first `segment_entered`).
   */
  async beginRun(run: StoredRun, startEvents: readonly RunEvent[]): Promise<BeginRunResult> {
    const tx = this.db.transaction(['runs', 'events'], 'readwrite', durabilityOption('strict'));
    const runs = tx.objectStore('runs');
    const active = await runs.index('by_status').getAllKeys('active_run');
    if (active.length > 0) {
      tx.abort();
      try {
        await tx.done;
      } catch {
        // Expected AbortError — the guard fired and nothing was written.
      }
      return { ok: false, reason: 'active-run-exists' };
    }
    await runs.put(run);
    const events = tx.objectStore('events');
    for (const e of startEvents) {
      await events.put({ ...e, runId: run.runId });
    }
    await tx.done;
    return { ok: true };
  }

  /**
   * Append one event and update the run's projection/status in the SAME
   * transaction (transactional projections). Teaching-state, wake-message, and
   * finish/abandon events use strict durability; presentation events may use
   * relaxed. Resolves only after `tx.done`, so the caller learns of success only
   * once the write is durable (persist-before-acknowledge, H1).
   */
  async appendEvent(
    runId: string,
    event: RunEvent,
    patch: RunPatch,
    durability: Durability,
  ): Promise<void> {
    const tx = this.db.transaction(['events', 'runs'], 'readwrite', durabilityOption(durability));
    const events = tx.objectStore('events');
    const runs = tx.objectStore('runs');
    const run = await runs.get(runId);
    if (!run) {
      tx.abort();
      try {
        await tx.done;
      } catch {
        /* expected */
      }
      throw new Error(`appendEvent: no run ${runId}`);
    }
    await events.put({ ...event, runId });
    const updated: StoredRun = {
      ...run,
      projection: patch.projection ?? run.projection,
      status: patch.status ?? run.status,
      updatedAt: event.wall,
    };
    await runs.put(updated);
    await tx.done;
  }

  getRun(runId: string): Promise<StoredRun | undefined> {
    return this.db.get('runs', runId);
  }

  getRunsByClassId(classId: string): Promise<StoredRun[]> {
    return this.db.getAllFromIndex('runs', 'by_class_id', classId);
  }

  getAllRuns(): Promise<StoredRun[]> {
    return this.db.getAll('runs');
  }

  /** The one unresolved active run, or undefined. Only `active_run` recovers (H2/H3). */
  async getActiveRun(): Promise<StoredRun | undefined> {
    const active = await this.db.getAllFromIndex('runs', 'by_status', 'active_run');
    return active[0];
  }

  getEvents(runId: string): Promise<StoredEvent[]> {
    // The composite key [runId, seq] means index('by_run') returns seq-ordered rows.
    return this.db.getAllFromIndex('events', 'by_run', runId);
  }

  /**
   * Repair a run's cached projection from the authoritative event log, quietly
   * (Principle 7). Used on recovery when the persisted projection disagrees with
   * a rebuild: the log wins, the projection is corrected, the event log is never
   * rewritten. Strict — a repaired projection must survive the next process death.
   */
  async repairProjection(runId: string, projection: RunProjection): Promise<void> {
    const tx = this.db.transaction('runs', 'readwrite', durabilityOption('strict'));
    const runs = tx.objectStore('runs');
    const run = await runs.get(runId);
    if (run) {
      await runs.put({ ...run, projection });
    }
    await tx.done;
  }

  // --- Notes (draft + final) ------------------------------------------------

  getNotes(runId: string): Promise<StoredNotes | undefined> {
    return this.db.get('notes', runId);
  }

  /** Save/replace the draft note. Strict — a draft-note change is durable (H1). */
  async saveDraftNote(runId: string, draft: string, wall: string): Promise<void> {
    const tx = this.db.transaction('notes', 'readwrite', durabilityOption('strict'));
    const store = tx.objectStore('notes');
    const existing = await store.get(runId);
    const record: StoredNotes = {
      runId,
      draft,
      final: existing?.final ?? null,
      finalizedAt: existing?.finalizedAt ?? null,
      updatedAt: wall,
    };
    await store.put(record);
    await tx.done;
  }

  /**
   * Finalize notes and transition the run to `completed_run`, atomically across
   * both stores. Strict.
   */
  async finalizeNotes(runId: string, final: string, wall: string): Promise<void> {
    const tx = this.db.transaction(['notes', 'runs'], 'readwrite', durabilityOption('strict'));
    const notes = tx.objectStore('notes');
    const runs = tx.objectStore('runs');
    const existing = await notes.get(runId);
    await notes.put({
      runId,
      draft: existing?.draft ?? final,
      final,
      finalizedAt: wall,
      updatedAt: wall,
    });
    const run = await runs.get(runId);
    if (run) {
      await runs.put({ ...run, status: 'completed_run', updatedAt: wall });
    }
    await tx.done;
  }

  // --- Preferences (relaxed) ------------------------------------------------

  getPreference(key: string): Promise<PreferenceValue | undefined> {
    return this.db.get('preferences', key);
  }

  async setPreference(key: string, value: PreferenceValue): Promise<void> {
    // Relaxed durability is acceptable for preferences (build plan § Strict durability).
    const tx = this.db.transaction('preferences', 'readwrite');
    await tx.objectStore('preferences').put(value, key);
    await tx.done;
  }

  // --- Whole-library backup read --------------------------------------------

  /** Every event across all runs, for a whole-library backup (additive; read-only). */
  getAllEvents(): Promise<StoredEvent[]> {
    return this.db.getAll('events');
  }

  /** Every run's notes, for a whole-library backup (additive; read-only). */
  getAllNotes(): Promise<StoredNotes[]> {
    return this.db.getAll('notes');
  }

  /** Every preference as a keyed entry (the store keeps keys out of line). */
  async getAllPreferenceEntries(): Promise<PreferenceEntry[]> {
    const tx = this.db.transaction('preferences', 'readonly');
    const store = tx.objectStore('preferences');
    // getAllKeys and getAll both return in key order, so the two lists align.
    const [keys, values] = await Promise.all([store.getAllKeys(), store.getAll()]);
    await tx.done;
    return keys.map((key, i) => ({ key: String(key), value: values[i] as PreferenceValue }));
  }

  /**
   * Read the complete durable library as flat arrays — the source for a
   * whole-library backup. Ordering is by primary key within each store; the
   * as-taught/backup layers do not depend on cross-store ordering.
   */
  async exportLibrary(): Promise<LibrarySnapshot> {
    const [revisions, runs, events, notes, preferences] = await Promise.all([
      this.getAllClassRevisions(),
      this.getAllRuns(),
      this.getAllEvents(),
      this.getAllNotes(),
      this.getAllPreferenceEntries(),
    ]);
    return { revisions, runs, events, notes, preferences };
  }

  // --- Whole-library restore (atomic) ---------------------------------------

  /**
   * Apply an already-validated library snapshot atomically, in one strict
   * transaction across every store, so a failure mid-apply leaves the library
   * byte-identical (docs/implementation-treaty.md § Export; build plan restore
   * atomicity). The caller must have parsed and validated the backup BEFORE
   * calling this — validation opens no transaction (src/export/restore.ts).
   *
   * merge (default): deterministic union by identity — revisions by `sourceHash`,
   * runs by `runId` (their events and notes travel with them), preferences by key.
   * An identity already present locally is skipped, never overwritten, so merge
   * cannot destroy local data. replace: wipe-and-write; destructive, and gated by
   * the caller's explicit confirmation (screen-states § 13).
   */
  async restore(snapshot: LibrarySnapshot, mode: RestoreMode, hooks?: RestoreHooks): Promise<void> {
    const tx = this.db.transaction(
      ['classes', 'runs', 'events', 'notes', 'preferences'],
      'readwrite',
      durabilityOption('strict'),
    );
    try {
      const classes = tx.objectStore('classes');
      const runs = tx.objectStore('runs');
      const events = tx.objectStore('events');
      const notes = tx.objectStore('notes');
      const prefs = tx.objectStore('preferences');

      if (mode === 'replace') {
        await Promise.all([classes.clear(), runs.clear(), events.clear(), notes.clear(), prefs.clear()]);
        for (const r of snapshot.revisions) await classes.put(r);
        hooks?.midApply?.(); // test-injection point: a throw here aborts the whole apply
        for (const run of snapshot.runs) await runs.put(run);
        for (const e of snapshot.events) await events.put(e);
        for (const n of snapshot.notes) await notes.put(n);
        for (const p of snapshot.preferences) await prefs.put(p.value, p.key);
      } else {
        // Merge: skip any identity that already exists locally.
        for (const r of snapshot.revisions) {
          if (!(await classes.get(r.sourceHash))) await classes.put(r);
        }
        hooks?.midApply?.();
        const newRunIds = new Set<string>();
        for (const run of snapshot.runs) {
          if (!(await runs.get(run.runId))) {
            await runs.put(run);
            newRunIds.add(run.runId);
          }
        }
        // Events and notes travel with a run: only a newly added run brings its own.
        for (const e of snapshot.events) {
          if (newRunIds.has(e.runId)) await events.put(e);
        }
        for (const n of snapshot.notes) {
          if (newRunIds.has(n.runId)) await notes.put(n);
        }
        for (const p of snapshot.preferences) {
          if ((await prefs.get(p.key)) === undefined) await prefs.put(p.value, p.key);
        }
      }
      await tx.done;
    } catch (err) {
      // Abort so a mid-apply fault writes nothing; swallow the resulting AbortError.
      try {
        tx.abort();
      } catch {
        /* already settling */
      }
      try {
        await tx.done;
      } catch {
        /* expected AbortError */
      }
      throw err;
    }
  }
}
