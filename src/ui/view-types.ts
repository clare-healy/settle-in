// Shared view-layer types: the app route model, the action surface screens call,
// and the live-screen handle. Kept separate so screen modules and the controller
// agree on shapes without importing each other.

import type {
  ClassDefinition,
  EventSample,
  ImportSummary,
  RunEvent,
  RunStateKind,
  ValidationError,
  Warning,
} from '../schema/index.js';
import type { RunSnapshot } from '../run/index.js';
import type { RecoverySnapshot } from '../run/index.js';
import type { StoredClassRevision } from '../store/index.js';
import type { Preferences } from './preferences.js';
import type { ClassGroup } from './library-model.js';

/** The single top-level route. Dialogs are a separate overlay layer. */
export type Route =
  | { readonly kind: 'loading' }
  | { readonly kind: 'empty' }
  | { readonly kind: 'home' }
  | { readonly kind: 'prep' }
  | { readonly kind: 'recovery' }
  | { readonly kind: 'run' }
  | { readonly kind: 'post-class' }
  | { readonly kind: 'import' }
  | { readonly kind: 'library' }
  | { readonly kind: 'class-detail'; readonly classId: string };

/** Overlay dialogs, resolved above the route. */
export type Dialog =
  | { readonly kind: 'leave-guard' }
  | { readonly kind: 'end-run-confirm' }
  | { readonly kind: 'finish-confirm' }
  | { readonly kind: 'recovery-end-confirm' }
  | { readonly kind: 'restore-replace-confirm' };

// --- Import flow (screen-states § 2) ----------------------------------------

/**
 * The import screen's internal state machine. The paste field's live value is the
 * source of truth during `input`; `source` is carried into error/confirm so the
 * original is preserved (screen-states § 2 blocking-error, § Return to source).
 */
export type ImportView =
  | { readonly phase: 'input'; readonly source: string }
  | { readonly phase: 'validating'; readonly source: string }
  | {
      readonly phase: 'error';
      readonly source: string;
      readonly errors: readonly ValidationError[];
      readonly copied: boolean;
    }
  | {
      readonly phase: 'confirm';
      readonly source: string;
      /** `new` for a first import; `revision` for a same-class_id, different-hash change (C6). */
      readonly kind: 'new' | 'revision';
      readonly def: ClassDefinition;
      readonly summary: ImportSummary;
      readonly warnings: readonly Warning[];
    }
  | {
      readonly phase: 'duplicate';
      readonly source: string;
      /** The existing class to open instead of duplicating (C5). */
      readonly existingClassId: string;
    };

// --- Restore flow (screen-states § 13; I5/I6) -------------------------------

/** Counts shown before a restore is applied. */
export interface RestoreCounts {
  readonly classes: number;
  readonly runs: number;
}

/** The restore section's state, surfaced inside the Library. */
export type RestoreView =
  | { readonly phase: 'idle' }
  | { readonly phase: 'error'; readonly reason: string }
  | { readonly phase: 'confirm'; readonly counts: RestoreCounts };

/** Every side-effecting thing a screen can ask the controller to do. */
export interface AppActions {
  openPrep(): void;
  applyUpdate(): void;
  beginClass(): void;
  next(): void;
  previous(): void;
  toggleReference(): void;
  closeReference(): void;
  setNextPosePreview(value: boolean): void;
  retryWakeLock(): void;

  openLeaveGuard(): void;
  closeDialog(): void;
  leaveOpen(): void;
  requestEndRun(): void;
  confirmEndRun(): void;

  requestFinish(): void;
  confirmFinish(): void;

  resume(): void;
  requestEndRecovery(): void;
  confirmEndRecovery(): void;

  // Post-Class is one reflection: no per-segment corrections exist to dispatch
  // (Q5c). The store/event capability for `segment_skipped` / `substitution_noted`
  // remains in the run machine so historic runs still export correctly.
  saveNote(value: string): void;
  finalizeNotes(): void;
  skipNotes(): void;

  // Navigation between the library-side screens.
  openImport(): void;
  openLibrary(): void;
  openClassDetail(classId: string): void;
  goHome(): void;

  // Import flow (screen-states § 2).
  importFileLoaded(source: string): void;
  importValidate(source: string): void;
  importCheckAgain(): void;
  importReturnToSource(): void;
  importCopyErrors(): void;
  importConfirm(): void;
  importOpenExisting(classId: string): void;

  // Library / class detail.
  setUpcoming(classId: string): void;
  runClassAgain(classId: string): void;
  exportOriginal(sourceHash: string): void;
  exportAsTaughtRun(runId: string): void;

  // Backup / restore (screen-states § 13).
  exportBackup(): void;
  restoreFileLoaded(text: string): void;
  restoreMerge(): void;
  requestRestoreReplace(): void;
  confirmRestoreReplace(): void;
  dismissRestore(): void;
}

/** A mounted live screen: its root plus a per-tick in-place time refresh. */
export interface LiveHandle {
  readonly root: HTMLElement;
  update(now: EventSample): void;
}

/** Props for the home screen. */
export interface HomeProps {
  readonly upcoming: ClassDefinition | null;
  readonly updateReady: boolean;
  readonly actions: AppActions;
}

/** Props for the first-launch / empty-library screen (screen-states § 1). */
export interface EmptyProps {
  readonly updateReady: boolean;
  readonly actions: AppActions;
}

/** Props for the import screen (screen-states § 2). */
export interface ImportProps {
  readonly view: ImportView;
  readonly actions: AppActions;
}

/** A taught run listed under a class, with its export handle. */
export interface RunRow {
  readonly runId: string;
  readonly runLocalDate: string;
  readonly startedAtEpochMs: number;
  readonly status: RunStateKind;
}

/** Props for the library list (screen-states § 13). */
export interface LibraryProps {
  readonly groups: readonly ClassGroup[];
  readonly upcomingClassId: string | null;
  readonly ambiguousUpcoming: boolean;
  readonly restore: RestoreView;
  readonly storageWarning: boolean;
  readonly updateReady: boolean;
  readonly offsetMinutes: number;
  readonly actions: AppActions;
}

/** Props for a class-detail screen (screen-states § 13). */
export interface ClassDetailProps {
  readonly group: ClassGroup;
  readonly isUpcoming: boolean;
  readonly runs: readonly RunRow[];
  readonly offsetMinutes: number;
  readonly actions: AppActions;
}

/** Props for the prep screen. */
export interface PrepProps {
  readonly def: ClassDefinition;
  readonly runStartedPreviewEpochMs: number;
  readonly offsetMinutes: number;
  readonly prefs: Preferences;
  readonly actions: AppActions;
}

/** Props for the live surface. */
export interface LiveProps {
  readonly def: ClassDefinition;
  readonly snapshot: RunSnapshot;
  readonly events: readonly RunEvent[];
  readonly runStartedAtEpochMs: number;
  readonly hardCloseAtEpochMs: number;
  readonly hardCloseLocal: string;
  readonly offsetMinutes: number;
  readonly now: EventSample;
  readonly referenceOpen: boolean;
  readonly finishArmed: boolean;
  readonly wakeFade: boolean;
  readonly prefs: Preferences;
  readonly wakeLock: { readonly available: boolean; readonly held: boolean };
  readonly actions: AppActions;
}

/** Props for run recovery. */
export interface RecoveryProps {
  readonly snapshot: RecoverySnapshot;
  readonly offsetMinutes: number;
  readonly actions: AppActions;
}

/** Props for the post-class reflection (screen-states § 12). */
export interface PostClassProps {
  readonly def: ClassDefinition;
  readonly events: readonly RunEvent[];
  readonly draftNote: string;
  /** For rendering the run's actual start and finish as local wall times. */
  readonly offsetMinutes: number;
  readonly actions: AppActions;
}

/** Library rows the boot pass loads (M4a uses only the upcoming pick). */
export interface Library {
  readonly revisions: readonly StoredClassRevision[];
  readonly upcoming: ClassDefinition | null;
}

/** The run's durable status, surfaced for route decisions. */
export type { RunStateKind };
