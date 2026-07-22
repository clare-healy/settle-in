// Restore validation — parse and VALIDATE the entire backup before any write.
//
// docs/implementation-treaty.md § Export and the build plan's restore-atomicity
// amendment: a whole-library restore parses and validates the entire backup
// BEFORE any write transaction opens; merge or replacement is then applied
// atomically (Store.restore), so a failure mid-validate or mid-apply leaves the
// library byte-identical. A future `backup_schema_version` is rejected intact
// with a §14-style update-required message.
//
// This module is PURE: it turns untrusted text into either a rejection (with a
// plain-language reason) or a fully validated, typed BackupPayload. It opens no
// transaction and touches no store. Identity integrity and dangling-run/-event
// detection happen here, so the atomic apply can trust its input.

import type {
  PreferenceValue,
  StoredClassRevision,
  StoredEvent,
  StoredNotes,
  StoredRun,
} from '../store/index.js';
import { BACKUP_SCHEMA_VERSION, type BackupPayload, type PreferenceEntry } from './backup.js';

/** The outcome of validating a candidate backup. */
export type RestoreValidation =
  | { readonly ok: true; readonly payload: BackupPayload; readonly appVersion: string; readonly exportedAt: string }
  | { readonly ok: false; readonly reason: string };

function reject(reason: string): RestoreValidation {
  return { ok: false, reason };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Parse the JSON text; a syntax error (corrupt or truncated file) is a clean rejection. */
export function parseBackupText(text: string): { ok: true; value: unknown } | { ok: false; reason: string } {
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, reason: 'This file is not a readable backup. It may be corrupted or incomplete.' };
  }
}

/**
 * Validate a parsed backup object into a typed, integrity-checked payload. Rejects
 * corrupt structure, an unsupported future version, identity collisions inside the
 * backup, and dangling runs/events/notes — all before any write can begin.
 */
export function validateBackup(raw: unknown): RestoreValidation {
  if (!isRecord(raw)) return reject('This file is not a readable backup.');

  const version = raw['backup_schema_version'];
  if (!isFiniteNumber(version)) {
    return reject('This file is not a Settle In backup (no backup version).');
  }
  if (version > BACKUP_SCHEMA_VERSION) {
    // §14-style: reject intact and explain that the app must be updated first.
    return reject(
      `This backup uses backup version ${version}. Update Settle In before restoring it; nothing was changed.`,
    );
  }
  if (version < BACKUP_SCHEMA_VERSION) {
    return reject(`This backup uses an older backup version ${version} that this build cannot read.`);
  }

  const payloadRaw = raw['payload'];
  if (!isRecord(payloadRaw)) return reject('This backup is missing its library contents.');

  const revisions = validateRevisions(payloadRaw['revisions']);
  if (!revisions.ok) return reject(revisions.reason);

  const runs = validateRuns(payloadRaw['runs'], revisions.sourceHashes);
  if (!runs.ok) return reject(runs.reason);

  const events = validateEvents(payloadRaw['events'], runs.runIds);
  if (!events.ok) return reject(events.reason);

  const notes = validateNotes(payloadRaw['notes'], runs.runIds);
  if (!notes.ok) return reject(notes.reason);

  const preferences = validatePreferences(payloadRaw['preferences']);
  if (!preferences.ok) return reject(preferences.reason);

  const appVersion = isString(raw['app_version']) ? raw['app_version'] : '';
  const exportedAt = isString(raw['exported_at']) ? raw['exported_at'] : '';

  return {
    ok: true,
    appVersion,
    exportedAt,
    payload: {
      revisions: revisions.value,
      runs: runs.value,
      events: events.value,
      notes: notes.value,
      preferences: preferences.value,
    },
  };
}

// --- Per-collection validators ----------------------------------------------

function validateRevisions(
  raw: unknown,
): { ok: true; value: StoredClassRevision[]; sourceHashes: Set<string> } | { ok: false; reason: string } {
  if (!Array.isArray(raw)) return { ok: false, reason: 'This backup has no class list.' };
  const value: StoredClassRevision[] = [];
  const sourceHashes = new Set<string>();
  for (const item of raw) {
    if (!isRecord(item)) return { ok: false, reason: 'A class entry in this backup is unreadable.' };
    const sourceHash = item['sourceHash'];
    const classId = item['classId'];
    const definition = item['definition'];
    if (!isString(sourceHash) || !isString(classId) || !isRecord(definition)) {
      return { ok: false, reason: 'A class entry in this backup is missing its identity.' };
    }
    // Identity integrity: the record, its hash, and the embedded definition agree.
    if (definition['sourceHash'] !== sourceHash || definition['revisionId'] !== sourceHash) {
      return { ok: false, reason: 'A class entry in this backup has an inconsistent identity.' };
    }
    if (definition['classId'] !== classId) {
      return { ok: false, reason: 'A class entry in this backup has a mismatched class id.' };
    }
    if (sourceHashes.has(sourceHash)) {
      return { ok: false, reason: 'This backup lists the same class revision twice.' };
    }
    sourceHashes.add(sourceHash);
    value.push(item as unknown as StoredClassRevision);
  }
  return { ok: true, value, sourceHashes };
}

function validateRuns(
  raw: unknown,
  knownSourceHashes: ReadonlySet<string>,
): { ok: true; value: StoredRun[]; runIds: Set<string> } | { ok: false; reason: string } {
  if (!Array.isArray(raw)) return { ok: false, reason: 'This backup has no run list.' };
  const value: StoredRun[] = [];
  const runIds = new Set<string>();
  for (const item of raw) {
    if (!isRecord(item)) return { ok: false, reason: 'A run entry in this backup is unreadable.' };
    const runId = item['runId'];
    const revisionSourceHash = item['revisionSourceHash'];
    if (!isString(runId) || !isString(revisionSourceHash)) {
      return { ok: false, reason: 'A run entry in this backup is missing its identity.' };
    }
    // Dangling-run detection: every run must reference a class revision in the backup.
    if (!knownSourceHashes.has(revisionSourceHash)) {
      return { ok: false, reason: 'This backup has a run whose class is missing (a dangling run).' };
    }
    if (runIds.has(runId)) {
      return { ok: false, reason: 'This backup lists the same run twice.' };
    }
    runIds.add(runId);
    value.push(item as unknown as StoredRun);
  }
  return { ok: true, value, runIds };
}

function validateEvents(
  raw: unknown,
  knownRunIds: ReadonlySet<string>,
): { ok: true; value: StoredEvent[] } | { ok: false; reason: string } {
  if (!Array.isArray(raw)) return { ok: false, reason: 'This backup has no event history.' };
  const value: StoredEvent[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!isRecord(item)) return { ok: false, reason: 'An event entry in this backup is unreadable.' };
    const runId = item['runId'];
    const seq = item['seq'];
    if (!isString(runId) || !isFiniteNumber(seq)) {
      return { ok: false, reason: 'An event entry in this backup is missing its identity.' };
    }
    // Dangling-event detection: every event must belong to a run in the backup.
    if (!knownRunIds.has(runId)) {
      return { ok: false, reason: 'This backup has an event with no matching run.' };
    }
    const key = `${runId}#${seq}`;
    if (seen.has(key)) return { ok: false, reason: 'This backup lists the same event twice.' };
    seen.add(key);
    value.push(item as unknown as StoredEvent);
  }
  return { ok: true, value };
}

function validateNotes(
  raw: unknown,
  knownRunIds: ReadonlySet<string>,
): { ok: true; value: StoredNotes[] } | { ok: false; reason: string } {
  if (!Array.isArray(raw)) return { ok: false, reason: 'This backup has no notes list.' };
  const value: StoredNotes[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!isRecord(item)) return { ok: false, reason: 'A note entry in this backup is unreadable.' };
    const runId = item['runId'];
    if (!isString(runId)) return { ok: false, reason: 'A note entry in this backup is missing its run.' };
    if (!knownRunIds.has(runId)) {
      return { ok: false, reason: 'This backup has a note with no matching run.' };
    }
    if (seen.has(runId)) return { ok: false, reason: 'This backup lists two notes for one run.' };
    seen.add(runId);
    value.push(item as unknown as StoredNotes);
  }
  return { ok: true, value };
}

function validatePreferences(
  raw: unknown,
): { ok: true; value: PreferenceEntry[] } | { ok: false; reason: string } {
  // Preferences are optional; an absent list is an empty one.
  if (raw === undefined) return { ok: true, value: [] };
  if (!Array.isArray(raw)) return { ok: false, reason: 'This backup has an unreadable preferences list.' };
  const value: PreferenceEntry[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!isRecord(item)) return { ok: false, reason: 'A preference entry in this backup is unreadable.' };
    const key = item['key'];
    const val = item['value'] as PreferenceValue;
    if (!isString(key)) return { ok: false, reason: 'A preference entry in this backup is missing its key.' };
    if (seen.has(key)) return { ok: false, reason: 'This backup lists the same preference twice.' };
    seen.add(key);
    value.push({ key, value: val });
  }
  return { ok: true, value };
}
