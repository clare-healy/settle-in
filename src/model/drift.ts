// Drift — how far a segment's actual entry ran from its re-anchored planned start.
//
// Drift is computed once when the segment is entered and stays stable during the
// visit. Display rounds to whole minutes; under 30 seconds absolute it reads
// `on plan`. A visit entered via Previous shows `revisited` instead of a value —
// comparing a late correction against the original planned start is mathematically
// true but operationally meaningless (docs/implementation-treaty.md § Drift;
// decision log July 22, 2026).

/** The U+2212 minus sign used for negative drift, per the treaty's display rule. */
export const MINUS_SIGN = '−';

/** Below this absolute drift, display reads `on plan`. */
export const ON_PLAN_THRESHOLD_MS = 30_000;

/**
 * A discriminated drift display. `driftMs`/`driftSec` carry the raw signed value
 * (positive = late, negative = early); `minutes` is the rounded magnitude; `text`
 * is the exact string to render.
 */
export type DriftDisplay =
  | { readonly kind: 'on-plan'; readonly driftMs: number; readonly driftSec: number; readonly text: 'on plan' }
  | {
      // Entered later than planned: `+N min`.
      readonly kind: 'behind';
      readonly driftMs: number;
      readonly driftSec: number;
      readonly minutes: number;
      readonly text: string;
    }
  | {
      // Entered earlier than planned: `−N min` (U+2212).
      readonly kind: 'ahead';
      readonly driftMs: number;
      readonly driftSec: number;
      readonly minutes: number;
      readonly text: string;
    }
  | { readonly kind: 'revisited'; readonly text: 'revisited' };

/** Raw signed drift in milliseconds: actual entry minus planned start. */
export function driftMsOf(actualEntryEpochMs: number, plannedStartEpochMs: number): number {
  return actualEntryEpochMs - plannedStartEpochMs;
}

/**
 * Build the drift display for a visit.
 *
 * @param driftMs   signed drift (actual entry − planned start)
 * @param revisited true when the visit began via Previous (`segment_back`)
 */
export function driftDisplay(driftMs: number, revisited = false): DriftDisplay {
  if (revisited) {
    return { kind: 'revisited', text: 'revisited' };
  }
  const driftSec = Math.round(driftMs / 1000);
  if (Math.abs(driftMs) < ON_PLAN_THRESHOLD_MS) {
    return { kind: 'on-plan', driftMs, driftSec, text: 'on plan' };
  }
  // Round the magnitude to whole minutes (half away from zero), keep the sign.
  const minutes = Math.round(Math.abs(driftMs) / 60_000);
  if (driftMs > 0) {
    return { kind: 'behind', driftMs, driftSec, minutes, text: `+${minutes} min` };
  }
  return { kind: 'ahead', driftMs, driftSec, minutes, text: `${MINUS_SIGN}${minutes} min` };
}

/** Convenience: drift display straight from the two instants. */
export function driftDisplayFor(
  actualEntryEpochMs: number,
  plannedStartEpochMs: number,
  revisited = false,
): DriftDisplay {
  return driftDisplay(driftMsOf(actualEntryEpochMs, plannedStartEpochMs), revisited);
}
