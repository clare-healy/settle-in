// Transactional projections, rebuilt from the event log.
//
// The run record caches four event-derived fields for fast recovery
// (docs/implementation-treaty.md § Run state model): the current segment, the
// savasana step, the presentation (expanded reference) state, and the
// wake-acknowledgment. Each is written in the SAME transaction as the event it
// reflects. This module derives those same four fields purely from the log, so
// the store can (a) compute the projection to persist alongside an event and
// (b) assert rebuild-equivalence against the persisted projection during
// recovery — if they disagree, the log wins and the projection is repaired.

import type { RunEvent } from '../schema/index.js';
import { currentSegmentId, deriveSavasanaStep } from '../model/index.js';
import { wakeMessageAlreadyShown } from '../model/index.js';
import type { RunProjection } from './types.js';

/**
 * The presentation (reference) state: the segment whose reference is currently
 * expanded, or null. `reference_expanded` sets it; `reference_collapsed` clears
 * it when it matches; entering a new segment implicitly collapses. Last relevant
 * event wins.
 */
export function deriveExpandedReference(events: readonly RunEvent[]): string | null {
  const ordered = [...events].sort((a, b) => a.seq - b.seq);
  let expanded: string | null = null;
  for (const e of ordered) {
    if (e.type === 'reference_expanded') {
      expanded = e.segmentId;
    } else if (e.type === 'reference_collapsed') {
      if (expanded === e.segmentId) expanded = null;
    } else if (e.type === 'segment_entered' || e.type === 'segment_back') {
      // Moving segments closes any open reference — presentation resets per screen.
      expanded = null;
    }
  }
  return expanded;
}

/**
 * Rebuild the full event-derived projection from the log. `savasanaStepCount` is
 * the class's savasana step count (used to clamp the folded step index). This is
 * the authority the store both persists and checks against.
 */
export function rebuildProjections(
  events: readonly RunEvent[],
  savasanaStepCount: number,
): RunProjection {
  return {
    currentSegmentId: currentSegmentId(events),
    savasanaStep: deriveSavasanaStep(events, savasanaStepCount),
    expandedReferenceSegmentId: deriveExpandedReference(events),
    wakeMessageShown: wakeMessageAlreadyShown(events),
  };
}

/** Structural equality of two projections (all four event-derived fields). */
export function projectionsEqual(a: RunProjection, b: RunProjection): boolean {
  return (
    a.currentSegmentId === b.currentSegmentId &&
    a.savasanaStep === b.savasanaStep &&
    a.expandedReferenceSegmentId === b.expandedReferenceSegmentId &&
    a.wakeMessageShown === b.wakeMessageShown
  );
}
