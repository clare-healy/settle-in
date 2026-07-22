// Timing-status derivation and the status vocabulary.
//
// A segment is `long` or `short` when |actual − planned| EXCEEDS the greater of
// 30 seconds and 15% of planned; otherwise `on-plan`. Full status precedence is
// skipped > substituted > revisited > timing (docs/class-format.md § As-taught
// rules; decision log July 21, 2026). These thresholds are the v1 default, tunable
// under the field-learning rule.

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
  readonly skipped: boolean;
  readonly substituted: boolean;
}

/**
 * Full status with precedence skipped > substituted > revisited > timing.
 * `revisited` applies when a segment has more than one completed visit.
 */
export function deriveStatus(inputs: StatusInputs): SegmentStatus {
  if (inputs.skipped) return 'skipped';
  if (inputs.substituted) return 'substituted';
  if (inputs.visits > 1) return 'revisited';
  return timingStatus(inputs.actualSec, inputs.plannedSec);
}
