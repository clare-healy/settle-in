import { describe, expect, it } from 'vitest';
import type { RunEvent } from '../schema/index.js';
import { openDatabase } from './db.js';
import { Store } from './store.js';
import { rebuildProjections } from './projections.js';
import type { RunProjection, StoredRun } from './types.js';
import {
  classFromSource,
  freshStore,
  jul28,
  loadValidClass,
  revisionOf,
} from './test-support.js';
import { MINIMAL_VALID, replaceOnce } from '../parser/test-helpers.js';

const EMPTY_PROJECTION: RunProjection = {
  currentSegmentId: null,
  savasanaStep: 0,
  expandedReferenceSegmentId: null,
  wakeMessageShown: false,
};

function runStartedEvent(runId: string, classId: string, sourceHash: string): RunEvent {
  return {
    seq: 0,
    type: 'run_started',
    wall: '2026-07-28T19:00:00-05:00',
    wallEpochMs: jul28(19, 0),
    monotonic: 0,
    executionId: 'exec-1',
    runId,
    classId,
    revisionSourceHash: sourceHash,
    runStartedAt: '2026-07-28T19:00:00-05:00',
    runStartedAtEpochMs: jul28(19, 0),
    runLocalDate: '2026-07-28',
    offsetMinutesAtBegin: -300,
    hardCloseAt: '2026-07-28T20:00:00-05:00',
    hardCloseAtEpochMs: jul28(20, 0),
  };
}

function runRecord(runId: string, classId: string, sourceHash: string, status: StoredRun['status'] = 'active_run'): StoredRun {
  return {
    runId,
    classId,
    revisionSourceHash: sourceHash,
    status,
    runStartedAt: '2026-07-28T19:00:00-05:00',
    runStartedAtEpochMs: jul28(19, 0),
    runLocalDate: '2026-07-28',
    hardCloseAt: '2026-07-28T20:00:00-05:00',
    hardCloseAtEpochMs: jul28(20, 0),
    projection: EMPTY_PROJECTION,
    updatedAt: '2026-07-28T19:00:00-05:00',
  };
}

describe('class revisions — identity and immutability (H5, C5, C6)', () => {
  it('re-importing an identical source_hash is a no-op, not a duplicate', async () => {
    const store = await freshStore();
    const def = await loadValidClass();
    const first = await store.putClassRevision(revisionOf(def));
    const second = await store.putClassRevision(revisionOf(def, '2030-01-01T00:00:00-05:00'));

    expect(first.stored).toBe('inserted');
    expect(second.stored).toBe('existing');
    // The second import did not overwrite: importedAt is still the first value.
    expect(second.record.importedAt).toBe('2026-07-28T18:55:00-05:00');
    const all = await store.getClassRevisionsByClassId(def.classId);
    expect(all).toHaveLength(1);
    store.close();
  });

  it('the store exposes no update path for a stored definition (H5)', () => {
    // Immutability is enforced by API shape: the only writer is put-if-absent.
    const methods = Object.getOwnPropertyNames(Store.prototype);
    expect(methods).not.toContain('updateClassRevision');
    expect(methods).not.toContain('updateClass');
    expect(methods.filter((m) => /class/i.test(m) && /update|mutate|edit|patch/i.test(m))).toHaveLength(0);
  });

  it('same class_id with a different source_hash is a new revision (C6)', async () => {
    const store = await freshStore();
    const original = await loadValidClass();
    // A changed source (a reworded cue) with the same class_id → different source_hash.
    const changedSource = replaceOnce(MINIMAL_VALID, 'notes: Notes here.', 'notes: Reworded teaching notes.');
    const revised = await classFromSource(changedSource);
    const baseFromMinimal = await classFromSource(MINIMAL_VALID);

    expect(revised.classId).toBe(baseFromMinimal.classId);
    expect(revised.sourceHash).not.toBe(baseFromMinimal.sourceHash);

    await store.putClassRevision(revisionOf(baseFromMinimal));
    await store.putClassRevision(revisionOf(revised));
    const revisions = await store.getClassRevisionsByClassId(baseFromMinimal.classId);
    expect(revisions).toHaveLength(2);
    // The valid fixture is a different class_id entirely.
    await store.putClassRevision(revisionOf(original));
    expect(await store.getClassRevisionsByClassId(original.classId)).toHaveLength(1);
    store.close();
  });
});

describe('single active run guard (F7)', () => {
  it('blocks a second begin while a run is active, allows it after finish/abandon', async () => {
    const store = await freshStore();
    const def = await loadValidClass();
    await store.putClassRevision(revisionOf(def));

    const first = await store.beginRun(runRecord('run-1', def.classId, def.sourceHash), [
      runStartedEvent('run-1', def.classId, def.sourceHash),
    ]);
    expect(first.ok).toBe(true);

    const blocked = await store.beginRun(runRecord('run-2', def.classId, def.sourceHash), [
      runStartedEvent('run-2', def.classId, def.sourceHash),
    ]);
    expect(blocked).toEqual({ ok: false, reason: 'active-run-exists' });
    // Nothing partial was written for run-2.
    expect(await store.getRun('run-2')).toBeUndefined();
    expect(await store.getEvents('run-2')).toHaveLength(0);

    // Resolve run-1 (finished) → a new begin is allowed.
    await store.appendEvent(
      'run-1',
      { ...runStartedEvent('run-1', def.classId, def.sourceHash), seq: 1, type: 'run_finished' } as unknown as RunEvent,
      { status: 'finished_run_pending_notes' },
      'strict',
    );
    const afterFinish = await store.beginRun(runRecord('run-3', def.classId, def.sourceHash), [
      runStartedEvent('run-3', def.classId, def.sourceHash),
    ]);
    expect(afterFinish.ok).toBe(true);
    store.close();
  });
});

describe('separate reruns (H6)', () => {
  it('two runs of one class keep two run_ids and both event histories', async () => {
    const store = await freshStore();
    const def = await loadValidClass();
    await store.putClassRevision(revisionOf(def));

    await store.beginRun(runRecord('run-a', def.classId, def.sourceHash), [
      runStartedEvent('run-a', def.classId, def.sourceHash),
    ]);
    await store.appendEvent(
      'run-a',
      { ...runStartedEvent('run-a', def.classId, def.sourceHash), seq: 1, type: 'run_finished' } as unknown as RunEvent,
      { status: 'completed_run' },
      'strict',
    );
    await store.beginRun(runRecord('run-b', def.classId, def.sourceHash), [
      runStartedEvent('run-b', def.classId, def.sourceHash),
    ]);

    const runs = await store.getRunsByClassId(def.classId);
    expect(runs.map((r) => r.runId).sort()).toEqual(['run-a', 'run-b']);
    expect(await store.getEvents('run-a')).toHaveLength(2);
    expect(await store.getEvents('run-b')).toHaveLength(1);
    // Both reference the exact revision they began with.
    expect(runs.every((r) => r.revisionSourceHash === def.sourceHash)).toBe(true);
    store.close();
  });
});

describe('transactional projection written with its event', () => {
  it('the persisted projection equals a rebuild from the durable log', async () => {
    const store = await freshStore();
    const def = await loadValidClass();
    await store.putClassRevision(revisionOf(def));
    const seg0 = def.expandedRuntimeSegments[0]!.id;
    const seg1 = def.expandedRuntimeSegments[1]!.id;

    await store.beginRun(
      { ...runRecord('run-x', def.classId, def.sourceHash), projection: rebuildProjections([], 6) },
      [runStartedEvent('run-x', def.classId, def.sourceHash)],
    );
    const entered0: RunEvent = {
      seq: 1, type: 'segment_entered', wall: 'w', wallEpochMs: jul28(19, 0), monotonic: 0, executionId: 'e', segmentId: seg0,
    };
    await store.appendEvent('run-x', entered0, { projection: rebuildProjections([entered0], 6) }, 'strict');
    const entered1: RunEvent = {
      seq: 2, type: 'segment_entered', wall: 'w', wallEpochMs: jul28(19, 10), monotonic: 0, executionId: 'e', segmentId: seg1,
    };
    await store.appendEvent('run-x', entered1, { projection: rebuildProjections([entered0, entered1], 6) }, 'strict');

    const run = await store.getRun('run-x');
    const durableEvents = await store.getEvents('run-x');
    expect(run!.projection).toEqual(rebuildProjections(durableEvents, 6));
    expect(run!.projection.currentSegmentId).toBe(seg1);
    store.close();
  });
});

describe('migration scaffold', () => {
  it('opens at v1 and creates every object store and index', async () => {
    const db = await openDatabase({ name: `mig-v1-${Date.now()}` });
    expect(Array.from(db.objectStoreNames).sort()).toEqual(['classes', 'events', 'notes', 'preferences', 'runs']);
    const tx = db.transaction(['classes', 'runs', 'events']);
    expect(Array.from(tx.objectStore('classes').indexNames)).toContain('by_class_id');
    expect(Array.from(tx.objectStore('runs').indexNames).sort()).toEqual(['by_class_id', 'by_status']);
    expect(Array.from(tx.objectStore('events').indexNames)).toContain('by_run');
    await tx.done;
    db.close();
  });

  it('re-opening at the same version runs no destructive upgrade (data survives)', async () => {
    const name = `mig-reopen-${Date.now()}`;
    const store1 = Store.fromDatabase(await openDatabase({ name }));
    const def = await loadValidClass();
    await store1.putClassRevision(revisionOf(def));
    store1.close();

    const store2 = Store.fromDatabase(await openDatabase({ name }));
    expect(await store2.getClassRevision(def.sourceHash)).toBeDefined();
    store2.close();
  });
});

describe('notes and preferences', () => {
  it('draft then finalize completes the run', async () => {
    const store = await freshStore();
    const def = await loadValidClass();
    await store.putClassRevision(revisionOf(def));
    await store.beginRun(runRecord('run-n', def.classId, def.sourceHash), [
      runStartedEvent('run-n', def.classId, def.sourceHash),
    ]);

    await store.saveDraftNote('run-n', 'room felt calm', 'w1');
    expect((await store.getNotes('run-n'))!.draft).toBe('room felt calm');
    expect((await store.getNotes('run-n'))!.final).toBeNull();

    await store.finalizeNotes('run-n', 'room felt calm; three students', 'w2');
    const notes = await store.getNotes('run-n');
    expect(notes!.final).toBe('room felt calm; three students');
    expect((await store.getRun('run-n'))!.status).toBe('completed_run');
    store.close();
  });

  it('preferences round-trip', async () => {
    const store = await freshStore();
    await store.setPreference('persistedStorageGranted', true);
    expect(await store.getPreference('persistedStorageGranted')).toBe(true);
    store.close();
  });
});
