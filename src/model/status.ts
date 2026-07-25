// Timing-status derivation and the status vocabulary.
//
// A segment is `long` or `short` when |actual − planned| EXCEEDS the greater of
// 30 seconds and 15% of planned; otherwise `on-plan`. Full status precedence is
// skipped > substituted > revisited > timing (docs/class-format.md § As-taught
// rules; decision log July 21, 2026). These thresholds are the v1 default, tunable
// under the field-learning rule.
//
// On a COMPLETED run, a segment with ZERO visits derives `skipped` automatically:
// the app knows it was never taught and never asks Clare to say so (decision log
// July 25, 2026 — Q5c, which retired the manual correction that the July 22 ruling
// depended on). Automatic skip ranks BELOW an explicit `substitution_noted`, so a
// historic run recorded before the correction UI was retired still exports
// `substituted` with its replacement name. An entered-but-brief segment has one
// visit and therefore still derives `short`, never `skipped`.

/** Every status the as-taught export can carry, in precedence order. */
export type SegmentStatus =
  | 'skipped'
  | 'substituted'
  | 'revisited'
  | 'long'
  | 'short'
  | 'on-plan';

/** Timing-status thresholds. */
export const TIMING_MIN_THRESHOLD_SEC = 30;
export const TIMING_FRACTION = 0.15;

/** The timing threshold for a planned duration: the greater of 30 s and 15% of planned. */
export function timingThresholdSec(plannedSec: number): number {
  return Math.max(TIMING_MIN_THRESHOLD_SEC, TIMING_FRACTION * plannedSec);
}

/**
 * Timing status alone (no skip/substitution/revisit precedence). `long` or `short`
 * only when the difference strictly EXCEEDS the threshold; on the boundary it is
 * `on-plan`.
 */
export function timingStatus(actualSec: number, plannedSec: number): 'long' | 'short' | 'on-plan' {
  const threshold = timingThresholdSec(plannedSec);
  const diff = actualSec - plannedSec;
  if (diff > threshold) return 'long';
  if (-diff > threshold) return 'short';
  return 'on-plan';
}

/** Inputs for full status derivation, after visit summarization. */
export interface StatusInputs {
  readonly plannedSec: number;
  readonly actualSec: number;
  /** Number of completed visits to the segment. */
  readonly visits: number;
  /** An explicit `segment_skipped` event (historic; nothing in the app writes one now). */
  readonly skipped: boolean;
  /** An explicit `substitution_noted` event (historic; see the module note). */
  readonly substituted: boolean;
  /**
   * Whether the run reached its end (a `run_finished` event exists). Only then can
   * "never entered" mean "not taught": mid-run, a segment simply has not come up yet.
   */
  readonly runCompleted: boolean;
}

/**
 * Full status with precedence skipped > substituted > revisited > timing.
 * `revisited` applies when a segment has more than one completed visit.
 *
 * Automatic skip (completed run, zero visits) sits directly below `substituted`:
 * an explicit skip still wins, an explicit substitution still describes a segment
 * that was never itself visited, and everything else is timing.
 */
export function deriveStatus(inputs: StatusInputs): SegmentStatus {
  if (inputs.skipped) return 'skipped';
  if (inputs.substituted) return 'substituted';
  if (inputs.runCompleted && inputs.visits === 0) return 'skipped';
  if (inputs.visits > 1) return 'revisited';
  return timingStatus(inputs.actualSec, inputs.plannedSec);
}
