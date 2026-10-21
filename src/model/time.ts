// Hard close, scheduled plan, elapsed, and display formatting.
//
// Pure functions of durable timestamps. The authored scheduled hour anchors the
// plan, so beginning late creates honest informational drift. The hard close never
// shifts and is constructed exactly once (docs/implementation-treaty.md § Scheduled-hour plan, § Elapsed time,
// § Hard close and savasana signal).

import { CLASS_DURATION_SEC, type EventSample, type ExpandedSegment } from '../schema/index.js';
import { formatIsoWithOffset, localDateAt } from './clock.js';

// --- Hard close --------------------------------------------------------------

/** The fixed hard close, constructed once at Begin and thereafter immutable. */
export interface HardClose {
  /** Epoch ms of the hard close instant. */
  readonly epochMs: number;
  /** ISO 8601 with offset — the same instant Begin Class showed and the export shows. */
  readonly iso: string;
  /** Local calendar date of the hard-close instant, YYYY-MM-DD. */
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
  scheduledStartLocal?: string,
): HardClose {
  const runLocalDate = localDateAt(beginInstantEpochMs, offsetMinutes);
  const [y, mo, d] = runLocalDate.split('-').map((x) => Number.parseInt(x, 10));
  const [hh, mm] = hardCloseLocal.split(':').map((x) => Number.parseInt(x, 10));
  // Wall values at a fixed offset → epoch: realEpoch = UTC(walls) - offset.
  let epochMs =
    Date.UTC(y ?? 1970, (mo ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0) - offsetMinutes * 60_000;
  // A scheduled hour may cross midnight (for example 23:30–00:30). Two schedule
  // occurrences then touch the Begin date: the one that began the prior evening
  // and the one beginning that evening. Choose the occurrence whose scheduled
  // start is closest to the Begin tap. This makes both a 23:00 early tap and a
  // 00:01 late tap resolve to the humanly expected hour without a rehearsal mode.
  if (scheduledStartLocal) {
    const startMinute = timeOfDayMinutes(scheduledStartLocal);
    const closeMinute = timeOfDayMinutes(hardCloseLocal);
    if (closeMinute <= startMinute) {
      const nextClose = epochMs + 24 * 60 * 60_000;
      const priorStart = epochMs - CLASS_DURATION_SEC * 1000;
      const nextStart = nextClose - CLASS_DURATION_SEC * 1000;
      if (Math.abs(nextStart - beginInstantEpochMs) < Math.abs(beginInstantEpochMs - priorStart)) {
        epochMs = nextClose;
      }
    }
  }
  return {
    epochMs,
    iso: formatIsoWithOffset(epochMs, offsetMinutes),
    localDate: localDateAt(epochMs, offsetMinutes),
    hardCloseLocal,
    offsetMinutes,
  };
}

function timeOfDayMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map((x) => Number.parseInt(x, 10));
  return (h ?? 0) * 60 + (m ?? 0);
}

/**
 * Return the local clock time exactly one hour after a valid `HH:MM` start.
 * Wraps across midnight; invalid input returns null so the schedule editor can
 * keep its primary action unavailable until the native time field is complete.
 */
export function hardCloseForScheduledStart(hhmm: string): string | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
  if (!match) return null;
  const hour = (Number.parseInt(match[1] ?? '0', 10) + 1) % 24;
  const minute = match[2] ?? '00';
  return `${hour < 10 ? '0' : ''}${hour}:${minute}`;
}

// --- Scheduled plan ----------------------------------------------------------

/** A single segment's scheduled planned window, in epoch ms. */
export interface PlannedWindow {
  readonly segmentId: string;
  readonly plannedStartEpochMs: number;
  readonly plannedEndEpochMs: number;
}

/**
 * Anchor the expanded plan to the scheduled-hour start:
 *   planned_start = scheduled_start_at + planned_offset
 *   planned_end   = planned_start + planned_duration
 * Returned in canonical expanded-plan order.
 */
export function scheduledPlan(
  expandedSegments: readonly ExpandedSegment[],
  plannedAnchorEpochMs: number,
): PlannedWindow[] {
  return expandedSegments.map((seg) => {
    const plannedStartEpochMs = plannedAnchorEpochMs + seg.plannedOffsetSec * 1000;
    return {
      segmentId: seg.id,
      plannedStartEpochMs,
      plannedEndEpochMs: plannedStartEpochMs + seg.plannedDurationSec * 1000,
    };
  });
}

/** The scheduled planned window for one segment, or null if it is not in the plan. */
export function plannedWindowFor(
  expandedSegments: readonly ExpandedSegment[],
  segmentId: string,
  plannedAnchorEpochMs: number,
): PlannedWindow | null {
  const seg = expandedSegments.find((s) => s.id === segmentId);
  if (!seg) return null;
  const plannedStartEpochMs = plannedAnchorEpochMs + seg.plannedOffsetSec * 1000;
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
