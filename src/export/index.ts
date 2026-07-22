// The export module's public surface: the original-markdown passthrough, the
// as-taught Export Schema v1 generator, the whole-library backup shaping, and the
// restore-validation path. Delivery (Blob + anchor download, clipboard copy) is a
// DOM concern and lives in src/ui/deliver.ts; this module stays free of the DOM so
// its generators and validators are pure and golden-testable.

export { exportOriginalMarkdown } from './original.js';
export { exportAsTaught, finishInstant, type AsTaughtInputs } from './as-taught.js';
export {
  BACKUP_SCHEMA_VERSION,
  buildBackup,
  serializeBackup,
  backupFilename,
  backupFilenameFor,
  type BackupFile,
  type BackupPayload,
  type PreferenceEntry,
} from './backup.js';
export { parseBackupText, validateBackup, type RestoreValidation } from './restore.js';
