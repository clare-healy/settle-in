// Hard close, re-anchored plan, elapsed, and display formatting.
//
// Pure functions of durable timestamps. Beginning late shifts the plan with the
// room; it does not create drift. The hard close never shifts and is constructed
// exactly once (docs/implementation-treaty.md § Re-anchored plan, § Elapsed time,
// § Hard close and savasana signal).

import type { EventSample, ExpandedSegment } from '../schema/index.js';
import { formatIsoWithOffset, localDateAt } from './clock.js';

// --- Hard close --------------------------------------------------------------

/** The fixed hard close, constructed once at Begin and thereafter immutable. */
export interface HardClose {
  /** Epoch ms of the hard close instant. */
  readonly epochMs: number;
  /** ISO 8601 with offset — the same instant Begin Class showed and the export shows. */
  readonly iso: string;
  /** Local date the hard close belongs to (the run's local date), YYYY-MM-DD. */
  readonly localDate: string;
  /** The `HH:MM` local hard-close time it was built from. */
  readonly hardCloseLocal: string;
  /** The offset in effect at Begin, minutes east of UTC. */
  readonly offsetMinutes: number;
}

/**
 * Construct `hard_close_at` EXACTLY ONCE, from the run's local date (read from the
 * Begin instant at the Begin offset) and the class's `hard_close_local`, using the
 * zone offset in effect at Begin. The result is persisted with the run and never
 * recomputed: a later zone change, DST oddity, or clock adjustment does not move
 * it.
 *
 * @param beginInstantEpochMs the wall instant Begin Class was activated
 * @param offsetMinutes       zone offset in effect at Begin (minutes east of UTC)
 * @param hardCloseLocal      class `hard_close_local`, e.g. "20:00"
 */
export function constructHardClose(
  beginInstantEpochMs: number,
  offsetMinutes: number,
  hardCloseLocal: string,
): HardClose {
  const localDate = localDateAt(beginInstantEpochMs, offsetMinutes);
  const [y, mo, d] = localDate.split('-').map((x) => Number.parseInt(x, 10));
  const [hh, mm] = hardCloseLocal.split(':').map((x) => Number.parseInt(x, 10));
  // Wall values at a fixed offset → epoch: realEpoch = UTC(walls) - offset.
  const epochMs =
    Date.UTC(y ?? 1970, (mo ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0) - offsetMinutes * 60_000;
  return {
    epochMs,
    iso: formatIsoWithOffset(epochMs, offsetMinutes),
    localDate,
    hardCloseLocal,
    offsetMinutes,
  };
}

// --- Re-anchored plan --------------------------------------------------------

/** A single segment's re-anchored planned window, in epoch ms. */
export interface PlannedWindow {
  readonly segmentId: string;
  readonly plannedStartEpochMs: number;
  readonly plannedEndEpochMs: number;
}

/**
 * Re-anchor the expanded plan to the actual Begin instant:
 *   planned_start = run_started_at + planned_offset
 *   planned_end   = planned_start + planned_duration
 * Returned in canonical expanded-plan order.
 */
export function reanchorPlan(
  expandedSegments: readonly ExpandedSegment[],
  runStartedAtEpochMs: number,
): PlannedWindow[] {
  return expandedSegments.map((seg) => {
    const plannedStartEpochMs = runStartedAtEpochMs + seg.plannedOffsetSec * 1000;
    return {
      segmentId: seg.id,
      plannedStartEpochMs,
      plannedEndEpochMs: plannedStartEpochMs + seg.plannedDurationSec * 1000,
    };
  });
}

/** The re-anchored planned window for one segment, or null if it is not in the plan. */
export function plannedWindowFor(
  expandedSegments: readonly ExpandedSegment[],
  segmentId: string,
  runStartedAtEpochMs: number,
): PlannedWindow | null {
  const seg = expandedSegments.find((s) => s.id === segmentId);
  if (!seg) return null;
  const plannedStartEpochMs = runStartedAtEpochMs + seg.plannedOffsetSec * 1000;
  return {
    segmentId: seg.id,
    plannedStartEpochMs,
    plannedEndEpochMs: plannedStartEpochMs + seg.plannedDurationSec * 1000,
  };
}

// --- Elapsed -----------------------------------------------------------------

/**
 * Elapsed milliseconds for a visit, from its durable entry sample to `now`.
 *
 * Within one execution (same executionId) elapsed uses steady monotonic deltas,
 * so a wall-clock adjustment cannot make it jump or go negative. Across executions
 * (recovery) durable wall timestamps are the only truth. Never negative — clamped
 * at zero (docs/implementation-treaty.md § Clock discontinuities).
 */
export function elapsedMs(entry: EventSample, now: EventSample): number {
  const raw =
    now.executionId === entry.executionId
      ? now.monotonic - entry.monotonic
      : now.wallEpochMs - entry.wallEpochMs;
  return raw > 0 ? raw : 0;
}

/** Elapsed whole seconds (floored), never negative. */
export function elapsedSec(entry: EventSample, now: EventSample): number {
  return Math.floor(elapsedMs(entry, now) / 1000);
}

// --- Display formatting ------------------------------------------------------

/** Format a non-negative second count as `m:ss` (minutes not zero-padded). */
export function formatElapsed(totalSec: number): string {
  const clamped = totalSec > 0 ? Math.floor(totalSec) : 0;
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

/** Format an `HH:MM` 24-hour local time as a 12-hour label like `8:00` (no am/pm, no seconds). */
export function format12hLabel(hhmm: string): string {
  const [hRaw, mRaw] = hhmm.split(':').map((x) => Number.parseInt(x, 10));
  const h = hRaw ?? 0;
  const m = mRaw ?? 0;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m < 10 ? '0' : ''}${m}`;
}
