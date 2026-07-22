// Whole-library backup — the versioned, machine-readable JSON safety net.
//
// docs/implementation-treaty.md § Export: the backup is a versioned JSON file
// named like `settle-in-backup-2026-07-28.json` whose top level carries
// `backup_schema_version`, `exported_at`, `app_version`, and the complete payload
// needed for LOSSLESS restore. It is not the weekly authoring format. Merge/replace
// semantics live in the restore path (restore.ts + Store.restore); this module
// only shapes and serializes the payload.
//
// The payload mirrors the persistence list (implementation-treaty § Persistence
// model). A stored class revision already embeds its original Markdown and the
// normalized definition, so `revisions` is lossless for classes; runs, events,
// notes, and preferences complete the picture.

import type {
  PreferenceValue,
  StoredClassRevision,
  StoredEvent,
  StoredNotes,
  StoredRun,
} from '../store/index.js';
import { localDateAt } from '../model/index.js';

/** Backup file schema version, versioned independently of every other schema. */
export const BACKUP_SCHEMA_VERSION = 1;

/** One preference entry (the preferences store is keyed out-of-line). */
export interface PreferenceEntry {
  readonly key: string;
  readonly value: PreferenceValue;
}

/** The complete, lossless library payload. */
export interface BackupPayload {
  readonly revisions: readonly StoredClassRevision[];
  readonly runs: readonly StoredRun[];
  readonly events: readonly StoredEvent[];
  readonly notes: readonly StoredNotes[];
  readonly preferences: readonly PreferenceEntry[];
}

/** The serialized backup file's top-level shape. */
export interface BackupFile {
  readonly backup_schema_version: number;
  /** ISO 8601 with offset — when the backup was exported. */
  readonly exported_at: string;
  readonly app_version: string;
  readonly payload: BackupPayload;
}

/** Assemble a backup file object from the payload and stamp it. */
export function buildBackup(
  payload: BackupPayload,
  exportedAt: string,
  appVersion: string,
): BackupFile {
  return {
    backup_schema_version: BACKUP_SCHEMA_VERSION,
    exported_at: exportedAt,
    app_version: appVersion,
    payload,
  };
}

/** Serialize a backup file to pretty JSON (2-space) — deterministic for a payload. */
export function serializeBackup(file: BackupFile): string {
  return `${JSON.stringify(file, null, 2)}\n`;
}

/** The canonical backup filename `settle-in-backup-YYYY-MM-DD.json` for a local date. */
export function backupFilename(localDate: string): string {
  return `settle-in-backup-${localDate}.json`;
}

/** Backup filename derived from an instant + offset (uses the local calendar date). */
export function backupFilenameFor(epochMs: number, offsetMinutes: number): string {
  return backupFilename(localDateAt(epochMs, offsetMinutes));
}
