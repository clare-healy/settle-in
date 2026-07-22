// Run events and run-state types.
//
// This extends the M1 schema with the full run-event vocabulary and durable run
// states from docs/implementation-treaty.md (§ Run state model, § Run events,
// § Clock discontinuities). The ordered event log is the single source of truth
// for a run; durations, statuses, savasana step, and recovery state are DERIVED
// from it (see src/model), never stored redundantly.
//
// Every event carries the durable wall-clock timestamp (ISO 8601 with offset),
// a monotonic sample, and an execution identity, per the treaty's Clock
// discontinuities section. `wallEpochMs` is the epoch-milliseconds reading of the
// same instant `wall` encodes; `wall` (with its offset) is canonical and
// `wallEpochMs` is a derived convenience so the model never re-parses ISO on a
// 1 Hz render tick. They must always describe the same instant.

// --- Durable run states (docs/implementation-treaty.md § Durable states) -----

export type RunStateKind =
  | 'no_active_run'
  | 'active_run'
  | 'finished_run_pending_notes'
  | 'completed_run'
  | 'abandoned_run';

export const RUN_STATE_KINDS: readonly RunStateKind[] = [
  'no_active_run',
  'active_run',
  'finished_run_pending_notes',
  'completed_run',
  'abandoned_run',
];

// --- Event samples -----------------------------------------------------------

/**
 * A single reading of the two clocks plus the execution identity. Teaching-state
 * events persist one of these before rendering; elapsed and discontinuity
 * detection consume them.
 */
export interface EventSample {
  /** Durable truth: ISO 8601 wall-clock timestamp with offset. */
  readonly wall: string;
  /** Epoch-ms reading of the same instant `wall` encodes. Derived, not independent. */
  readonly wallEpochMs: number;
  /** Monotonic sample in milliseconds (performance.now-like). Steady within one execution. */
  readonly monotonic: number;
  /** Identifies the JS execution/process. Changes across reload and process death. */
  readonly executionId: string;
}

// --- Run event vocabulary ----------------------------------------------------

export type RunEventType =
  | 'run_started'
  | 'segment_entered'
  | 'reference_expanded'
  | 'reference_collapsed'
  | 'savasana_step_advanced'
  | 'savasana_step_back'
  | 'segment_back'
  | 'segment_skipped'
  | 'substitution_noted'
  | 'wake_message_shown'
  | 'run_finished'
  | 'run_abandoned'
  | 'run_resumed'
  | 'clock_discontinuity_noted';

/** Fields shared by every appended run event. */
export interface RunEventBase {
  /** Append order, 0-based. The event log's ordering is authoritative. */
  readonly seq: number;
  readonly type: RunEventType;
  /** Durable wall-clock timestamp, ISO 8601 with offset. */
  readonly wall: string;
  /** Epoch-ms reading of `wall`. Derived convenience; same instant as `wall`. */
  readonly wallEpochMs: number;
  readonly monotonic: number;
  readonly executionId: string;
}

/**
 * Begin Class. Captures the re-anchor origin and the once-and-only-once hard
 * close, both persisted with the run and never recomputed
 * (docs/implementation-treaty.md § Re-anchored plan).
 */
export interface RunStartedEvent extends RunEventBase {
  readonly type: 'run_started';
  readonly runId: string;
  readonly classId: string;
  /** The exact class revision taught. */
  readonly revisionSourceHash: string;
  /** ISO 8601; equals `wall`. */
  readonly runStartedAt: string;
  /** Epoch ms; equals `wallEpochMs`. The re-anchor origin. */
  readonly runStartedAtEpochMs: number;
  /** Local date at Begin, YYYY-MM-DD. */
  readonly runLocalDate: string;
  /** Zone offset in effect at Begin, minutes east of UTC (ISO sign; e.g. -300 for -05:00). */
  readonly offsetMinutesAtBegin: number;
  /** Fixed hard close, ISO 8601 with offset. Constructed once, never recomputed. */
  readonly hardCloseAt: string;
  /** Epoch ms of the fixed hard close. */
  readonly hardCloseAtEpochMs: number;
}

export interface SegmentEnteredEvent extends RunEventBase {
  readonly type: 'segment_entered';
  readonly segmentId: string;
}

export interface SegmentBackEvent extends RunEventBase {
  readonly type: 'segment_back';
  /** The segment being returned to; a `segment_entered` for it follows immediately. */
  readonly toSegmentId: string;
}

export interface SegmentSkippedEvent extends RunEventBase {
  readonly type: 'segment_skipped';
  readonly segmentId: string;
}

export interface SubstitutionNotedEvent extends RunEventBase {
  readonly type: 'substitution_noted';
  readonly segmentId: string;
  /** Short replacement name Clare entered. */
  readonly substitutedWith: string;
}

export interface SavasanaStepAdvancedEvent extends RunEventBase {
  readonly type: 'savasana_step_advanced';
}

export interface SavasanaStepBackEvent extends RunEventBase {
  readonly type: 'savasana_step_back';
}

export interface ReferenceExpandedEvent extends RunEventBase {
  readonly type: 'reference_expanded';
  readonly segmentId: string;
}

export interface ReferenceCollapsedEvent extends RunEventBase {
  readonly type: 'reference_collapsed';
  readonly segmentId: string;
}

export interface WakeMessageShownEvent extends RunEventBase {
  readonly type: 'wake_message_shown';
}

export interface RunFinishedEvent extends RunEventBase {
  readonly type: 'run_finished';
}

export interface RunAbandonedEvent extends RunEventBase {
  readonly type: 'run_abandoned';
}

export interface RunResumedEvent extends RunEventBase {
  readonly type: 'run_resumed';
}

/** A presentation-class note that the two clocks disagreed. Detection only, never alarming. */
export interface ClockDiscontinuityNotedEvent extends RunEventBase {
  readonly type: 'clock_discontinuity_noted';
  readonly reason: 'wall-backward' | 'disagreement';
  readonly wallDeltaMs: number;
  readonly monotonicDeltaMs: number;
}

export type RunEvent =
  | RunStartedEvent
  | SegmentEnteredEvent
  | SegmentBackEvent
  | SegmentSkippedEvent
  | SubstitutionNotedEvent
  | SavasanaStepAdvancedEvent
  | SavasanaStepBackEvent
  | ReferenceExpandedEvent
  | ReferenceCollapsedEvent
  | WakeMessageShownEvent
  | RunFinishedEvent
  | RunAbandonedEvent
  | RunResumedEvent
  | ClockDiscontinuityNotedEvent;

// --- Event classification ----------------------------------------------------
//
// "Only teaching-state events affect derived durations. Presentation events are
// retained only if useful for recovery and may be excluded from exports."
// (docs/implementation-treaty.md § Run events)

export const PRESENTATION_EVENT_TYPES: ReadonlySet<RunEventType> = new Set([
  'reference_expanded',
  'reference_collapsed',
  'wake_message_shown',
  'clock_discontinuity_noted',
]);

/** Events that end the current segment's active interval when deriving actuals. */
export const VISIT_BOUNDARY_EVENT_TYPES: ReadonlySet<RunEventType> = new Set([
  'segment_entered',
  'run_finished',
  'run_abandoned',
]);

export function isPresentationEvent(type: RunEventType): boolean {
  return PRESENTATION_EVENT_TYPES.has(type);
}

export function isTeachingStateEvent(type: RunEventType): boolean {
  return !PRESENTATION_EVENT_TYPES.has(type);
}
