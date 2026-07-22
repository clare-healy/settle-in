// Clock-discontinuity detection.
//
// Durable truth is the wall clock; display stability comes from the monotonic
// clock. When the two disagree beyond tolerance, or wall time moves backward, the
// app appends a `clock_discontinuity_noted` presentation event and continues
// calmly — no negative values, no alarm, no correction prompt. This module only
// DETECTS; appending and any I/O are the caller's job
// (docs/implementation-treaty.md § Clock discontinuities).

import type { EventSample } from '../schema/index.js';

/**
 * Tolerance (ms) for disagreement between the wall delta and the monotonic delta
 * across two consecutive samples.
 *
 * Chosen as 2000 ms. Rationale: normal 1 Hz render ticks — even when delayed or
 * coalesced by a throttled/backgrounded tab — move BOTH clocks together, so the
 * disagreement (|wallΔ − monoΔ|) stays near zero regardless of the gap's size.
 * The residual disagreement we must tolerate comes from monotonic-clock coarsening
 * (browsers clamp performance.now for privacy) and small accepted NTP slews, which
 * the treaty explicitly accepts as "small adjustment error". Real discontinuities
 * that matter — a DST change, a manual clock set, an NTP step — are tens of
 * seconds to an hour, comfortably above 2 s. Two seconds cleanly separates
 * accepted jitter/slew from a genuine jump without false-alarming on ordinary
 * scheduling delay.
 */
export const DISCONTINUITY_TOLERANCE_MS = 2_000;

export interface DiscontinuityResult {
  /** True when a `clock_discontinuity_noted` event should be appended. */
  readonly discontinuity: boolean;
  readonly reason: 'wall-backward' | 'disagreement' | null;
  readonly wallDeltaMs: number;
  readonly monotonicDeltaMs: number;
}

/**
 * Compare two consecutive samples and decide whether a discontinuity should be
 * noted. Detection only.
 *
 * @param prev the earlier sample
 * @param curr the later sample
 * @param toleranceMs disagreement tolerance (default {@link DISCONTINUITY_TOLERANCE_MS})
 */
export function detectDiscontinuity(
  prev: EventSample,
  curr: EventSample,
  toleranceMs: number = DISCONTINUITY_TOLERANCE_MS,
): DiscontinuityResult {
  const wallDeltaMs = curr.wallEpochMs - prev.wallEpochMs;
  const monotonicDeltaMs = curr.monotonic - prev.monotonic;

  if (wallDeltaMs < 0) {
    return { discontinuity: true, reason: 'wall-backward', wallDeltaMs, monotonicDeltaMs };
  }
  if (Math.abs(wallDeltaMs - monotonicDeltaMs) > toleranceMs) {
    return { discontinuity: true, reason: 'disagreement', wallDeltaMs, monotonicDeltaMs };
  }
  return { discontinuity: false, reason: null, wallDeltaMs, monotonicDeltaMs };
}
