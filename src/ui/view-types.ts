// Shared view-layer types: the app route model, the action surface screens call,
// and the live-screen handle. Kept separate so screen modules and the controller
// agree on shapes without importing each other.

import type {
  ClassDefinition,
  EventSample,
  RunEvent,
  RunStateKind,
} from '../schema/index.js';
import type { RunSnapshot } from '../run/index.js';
import type { RecoverySnapshot } from '../run/index.js';
import type { StoredClassRevision } from '../store/index.js';
import type { Preferences } from './preferences.js';

/** The single top-level route. Dialogs are a separate overlay layer. */
export type Route =
  | { readonly kind: 'loading' }
  | { readonly kind: 'empty' }
  | { readonly kind: 'home' }
  | { readonly kind: 'prep' }
  | { readonly kind: 'recovery' }
  | { readonly kind: 'run' }
  | { readonly kind: 'post-class' };

/** Overlay dialogs, resolved above the route. */
export type Dialog =
  | { readonly kind: 'leave-guard' }
  | { readonly kind: 'end-run-confirm' }
  | { readonly kind: 'finish-confirm' }
  | { readonly kind: 'recovery-end-confirm' };

/** Every side-effecting thing a screen can ask the controller to do. */
export interface AppActions {
  openPrep(): void;
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

  correctSkip(segmentId: string): void;
  correctSubstitute(segmentId: string, name: string): void;
  saveNote(value: string): void;
  finalizeNotes(): void;
  skipNotes(): void;
}

/** A mounted live screen: its root plus a per-tick in-place time refresh. */
export interface LiveHandle {
  readonly root: HTMLElement;
  update(now: EventSample): void;
}

/** Props for the home screen. */
export interface HomeProps {
  readonly upcoming: ClassDefinition | null;
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

/** Props for post-class notes. */
export interface PostClassProps {
  readonly def: ClassDefinition;
  readonly events: readonly RunEvent[];
  readonly draftNote: string;
  readonly actions: AppActions;
}

/** Library rows the boot pass loads (M4a uses only the upcoming pick). */
export interface Library {
  readonly revisions: readonly StoredClassRevision[];
  readonly upcoming: ClassDefinition | null;
}

/** The run's durable status, surfaced for route decisions. */
export type { RunStateKind };
