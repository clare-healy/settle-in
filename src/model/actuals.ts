// Event-log derivations: visits, actual durations, per-segment status, the
// current segment and its drift, and the savasana step position.
//
// The ordered event log is the single source of truth. A visit is the interval a
// segment is current — from its `segment_entered` to the next event that changes
// the current segment (another `segment_entered`, `run_finished`, or
// `run_abandoned`). A segment's actual duration is the sum of its completed
// visits. Savasana step movement and reference/wake/discontinuity events do not
// bound a segment visit (docs/implementation-treaty.md § Back navigation, § Run
// events; docs/class-format.md § As-taught rules).

import type { ClassDefinition, ExpandedSegment, RunEvent, SegmentType } from '../schema/index.js';
import { isPresentationEvent } from '../schema/index.js';
import { driftDisplayFor, type DriftDisplay } from './drift.js';
import { deriveStatus, type SegmentStatus } from './status.js';
import { plannedWindowFor } from './time.js';

// --- Visits ------------------------------------------------------------------

export interface Visit {
  readonly segmentId: string;
  readonly startEpochMs: number;
  readonly endEpochMs: number;
  readonly durationSec: number;
}

function sortedBySeq(events: readonly RunEvent[]): RunEvent[] {
  return [...events].sort((a, b) => a.seq - b.seq);
}

/**
 * All COMPLETED visits, in order. A trailing open visit (the run is still active
 * with no finish/abandon) is not completed and is excluded.
 */
export function deriveVisits(events: readonly RunEvent[]): Visit[] {
  const ordered = sortedBySeq(events);
  const visits: Visit[] = [];
  let open: { segmentId: string; startEpochMs: number } | null = null;

  const close = (endEpochMs: number): void => {
    if (open) {
      const durationSec = Math.max(0, Math.round((endEpochMs - open.startEpochMs) / 1000));
      visits.push({ segmentId: open.segmentId, startEpochMs: open.startEpochMs, endEpochMs, durationSec });
      open = null;
    }
  };

  for (const e of ordered) {
    if (e.type === 'segment_entered') {
      close(e.wallEpochMs);
      open = { segmentId: e.segmentId, startEpochMs: e.wallEpochMs };
    } else if (e.type === 'run_finished' || e.type === 'run_abandoned') {
      close(e.wallEpochMs);
    }
  }
  return visits;
}

// --- Per-segment actuals and status ------------------------------------------

export interface SegmentActual {
  readonly id: string;
  readonly parentId: string;
  readonly type: SegmentType;
  readonly name: string;
  readonly side: ExpandedSegment['side'];
  readonly plannedSec: number;
  readonly actualSec: number;
  readonly status: SegmentStatus;
  /** Number of completed visits (0 for a skipped or never-entered segment). */
  readonly visits: number;
  /** Replacement name when substituted, else null. */
  readonly substitutedWith: string | null;
}

/**
 * Derive one summary per expanded runtime segment, in canonical expanded-plan
 * order — the input to the as-taught export. A skipped segment reports
 * `actual_sec: 0`; status precedence is skipped > substituted > revisited > timing.
 *
 * On a COMPLETED run (one carrying a `run_finished` event), a segment that was
 * never entered derives `skipped` with `actual_sec: 0` without anyone saying so —
 * Post-Class no longer asks (Q5c). While a run is still active nothing is inferred:
 * a segment that has not come up yet is simply not yet taught.
 */
export function deriveActuals(definition: ClassDefinition, events: readonly RunEvent[]): SegmentActual[] {
  const visits = deriveVisits(events);
  const ordered = sortedBySeq(events);

  const skippedIds = new Set<string>();
  const substitutedWithById = new Map<string, string>();
  let runCompleted = false;
  for (const e of ordered) {
    if (e.type === 'segment_skipped') skippedIds.add(e.segmentId);
    else if (e.type === 'substitution_noted') substitutedWithById.set(e.segmentId, e.substitutedWith);
    else if (e.type === 'run_finished') runCompleted = true;
  }

  return definition.expandedRuntimeSegments.map((seg) => {
    const segVisits = visits.filter((v) => v.segmentId === seg.id);
    const skipped = skippedIds.has(seg.id);
    const substituted = substitutedWithById.has(seg.id);
    const summedSec = segVisits.reduce((sum, v) => sum + v.durationSec, 0);
    const actualSec = skipped ? 0 : summedSec;

    const status = deriveStatus({
      plannedSec: seg.plannedDurationSec,
      actualSec,
      visits: segVisits.length,
      skipped,
      substituted,
      runCompleted,
    });

    return {
      id: seg.id,
      parentId: seg.parentId,
      type: seg.type,
      name: seg.name,
      side: seg.side,
      plannedSec: seg.plannedDurationSec,
      actualSec,
      status,
      visits: segVisits.length,
      substitutedWith: substituted ? (substitutedWithById.get(seg.id) ?? null) : null,
    };
  });
}

// --- Current segment and drift -----------------------------------------------

/** The current segment id: the target of the last `segment_entered`, or null. */
export function currentSegmentId(events: readonly RunEvent[]): string | null {
  const ordered = sortedBySeq(events);
  for (let i = ordered.length - 1; i >= 0; i--) {
    const e = ordered[i];
    if (e && e.type === 'segment_entered') return e.segmentId;
  }
  return null;
}

/** True when the `segment_entered` at ordered-index `i` was reached via Previous. */
function entryIsRevisited(ordered: readonly RunEvent[], i: number): boolean {
  for (let j = i - 1; j >= 0; j--) {
    const e = ordered[j];
    if (!e) continue;
    // Skip presentation events and resume, which don't represent a teaching move.
    if (isPresentationEvent(e.type) || e.type === 'run_resumed') continue;
    return e.type === 'segment_back';
  }
  return false;
}

/** Per-entry drift display, one for every `segment_entered`, in order. */
export interface VisitDrift {
  readonly segmentId: string;
  readonly entryEpochMs: number;
  readonly revisited: boolean;
  /** Null when the entered segment is not in the expanded plan. */
  readonly drift: DriftDisplay | null;
}

/**
 * Drift display for every entry in the log. Each entry entered via Previous shows
 * `revisited`; the first (in-order) entry to a segment carries its true drift.
 */
export function deriveVisitDrifts(
  definition: ClassDefinition,
  events: readonly RunEvent[],
  runStartedAtEpochMs: number,
): VisitDrift[] {
  const ordered = sortedBySeq(events);
  const out: VisitDrift[] = [];
  for (let i = 0; i < ordered.length; i++) {
    const e = ordered[i];
    if (!e || e.type !== 'segment_entered') continue;
    const revisited = entryIsRevisited(ordered, i);
    const window = plannedWindowFor(definition.expandedRuntimeSegments, e.segmentId, runStartedAtEpochMs);
    out.push({
      segmentId: e.segmentId,
      entryEpochMs: e.wallEpochMs,
      revisited,
      drift: window ? driftDisplayFor(e.wallEpochMs, window.plannedStartEpochMs, revisited) : null,
    });
  }
  return out;
}

/** Drift display for the current segment's most recent entry, or null if none. */
export function currentDriftDisplay(
  definition: ClassDefinition,
  events: readonly RunEvent[],
  runStartedAtEpochMs: number,
): DriftDisplay | null {
  const drifts = deriveVisitDrifts(definition, events, runStartedAtEpochMs);
  const last = drifts[drifts.length - 1];
  return last ? last.drift : null;
}

// --- Savasana step -----------------------------------------------------------

/**
 * Rebuild the exact savasana step index from the log by folding
 * `savasana_step_advanced` (+1) and `savasana_step_back` (−1) from 0, clamped to
 * [0, stepCount − 1]. Step events only occur within savasana, so folding the whole
 * log is correct for recovery.
 */
export function deriveSavasanaStep(events: readonly RunEvent[], stepCount: number): number {
  const maxIndex = Math.max(0, stepCount - 1);
  let step = 0;
  for (const e of sortedBySeq(events)) {
    if (e.type === 'savasana_step_advanced') step = Math.min(maxIndex, step + 1);
    else if (e.type === 'savasana_step_back') step = Math.max(0, step - 1);
  }
  return step;
}
