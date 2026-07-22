// IndexedDB schema and the forward-only, versioned migration scaffold.
//
// docs/implementation-treaty.md § Updates and migrations requires database
// migrations to be forward-only, transactional where possible, and tested
// against fixtures; a failed migration must preserve prior data. idb runs the
// upgrade callback inside a single `versionchange` transaction, so every step
// below shares one transaction and either all apply or none do.
//
// ADDING A FUTURE VERSION (the pattern):
//   1. Bump DB_VERSION to the new number.
//   2. Append a MIGRATION_STEPS entry `{ version: N, apply(db, tx) { ... } }`.
//   3. Its `apply` runs ONLY when the stored oldVersion < N, and runs inside the
//      shared versionchange transaction (`tx`), so v1→vN upgrades apply each
//      intermediate step in order, transactionally. Never edit an existing
//      step's shape (that would rewrite history for already-migrated devices);
//      only add new steps. Data reshaping in a future step uses `tx` to read and
//      rewrite existing records within the same atomic upgrade.

import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase, IDBPTransaction } from 'idb';
import type {
  StoredClassRevision,
  StoredEvent,
  StoredNotes,
  StoredRun,
  PreferenceValue,
} from './types.js';

/** The persistent database name. Origin-bound; permanent per the hosting treaty. */
export const DB_NAME = 'settle-in';

/** Current store schema version. Bump this when adding a MIGRATION_STEPS entry. */
export const DB_VERSION = 1;

// --- Typed schema -----------------------------------------------------------

export interface SettleInDB extends DBSchema {
  classes: {
    key: string;
    value: StoredClassRevision;
    indexes: { by_class_id: string };
  };
  runs: {
    key: string;
    value: StoredRun;
    indexes: { by_status: string; by_class_id: string };
  };
  events: {
    key: [string, number];
    value: StoredEvent;
    indexes: { by_run: string };
  };
  notes: {
    key: string;
    value: StoredNotes;
  };
  preferences: {
    key: string;
    value: PreferenceValue;
  };
}

export type SettleInDatabase = IDBPDatabase<SettleInDB>;
type UpgradeTx = IDBPTransaction<SettleInDB, ArrayLike<'classes' | 'runs' | 'events' | 'notes' | 'preferences'>, 'versionchange'>;

// --- Migration steps (forward-only) -----------------------------------------

interface MigrationStep {
  readonly version: number;
  /** Runs inside the shared versionchange transaction when oldVersion < version. */
  readonly apply: (db: SettleInDatabase, tx: UpgradeTx) => void;
}

const MIGRATION_STEPS: readonly MigrationStep[] = [
  {
    version: 1,
    apply: (db, _tx) => {
      // classes: immutable revisions keyed by source_hash, grouped by class_id.
      const classes = db.createObjectStore('classes', { keyPath: 'sourceHash' });
      classes.createIndex('by_class_id', 'classId');

      // runs: sessions keyed by run_id; indexed by status (single-active guard)
      // and by class_id (H6 reruns of one class).
      const runs = db.createObjectStore('runs', { keyPath: 'runId' });
      runs.createIndex('by_status', 'status');
      runs.createIndex('by_class_id', 'classId');

      // events: the append-only log, composite key keeps a run's events ordered.
      const events = db.createObjectStore('events', { keyPath: ['runId', 'seq'] });
      events.createIndex('by_run', 'runId');

      // notes: post-class notes (draft + final) keyed by run_id.
      db.createObjectStore('notes', { keyPath: 'runId' });

      // preferences: simple string-keyed local values.
      db.createObjectStore('preferences');
    },
  },
];

/**
 * Apply every migration step whose version is newer than the stored oldVersion,
 * in ascending order, inside the single upgrade transaction. Forward-only: a step
 * never runs when the device is already at or beyond its version.
 */
function runMigrations(db: SettleInDatabase, oldVersion: number, tx: UpgradeTx): void {
  for (const step of MIGRATION_STEPS) {
    if (oldVersion < step.version) step.apply(db, tx);
  }
}

// --- Open --------------------------------------------------------------------

export interface OpenOptions {
  /** Override the database name (tests use unique names for isolation). */
  readonly name?: string;
  /** Override the version (tests exercise the migration scaffold). */
  readonly version?: number;
  /**
   * Called when another tab holds an older connection open and blocks an upgrade.
   * A running client with an active run must never be force-reloaded (A5); the
   * caller decides how to surface this quietly.
   */
  readonly onBlocked?: () => void;
}

/**
 * Open (creating/upgrading) the database. Recovery is version-crossing: because a
 * migration may run before the recovery screen after process death, this must
 * complete before any run is read (docs/implementation-treaty.md § Updates and
 * migrations). A failed migration leaves the prior data intact because the whole
 * versionchange transaction rolls back.
 */
export function openDatabase(options: OpenOptions = {}): Promise<SettleInDatabase> {
  const name = options.name ?? DB_NAME;
  const version = options.version ?? DB_VERSION;
  return openDB<SettleInDB>(name, version, {
    upgrade(db, oldVersion, _newVersion, tx) {
      runMigrations(db, oldVersion, tx as unknown as UpgradeTx);
    },
    blocked() {
      options.onBlocked?.();
    },
  });
}
