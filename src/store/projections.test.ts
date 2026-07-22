import { describe, expect, it } from 'vitest';
import { EventLog, jul28 } from '../model/test-support.js';
import { deriveExpandedReference, projectionsEqual, rebuildProjections } from './projections.js';

// The projection is a pure fold of the event log. These pin each field so the
// store's transactional projection can be checked against a rebuild (M3
// equivalence requirement).

const STEP_COUNT = 6;

function log() {
  return new EventLog().runStarted(jul28(19, 0), { runLocalDate: '2026-07-28', hardCloseAtEpochMs: jul28(20, 0) });
}

describe('rebuildProjections', () => {
  it('tracks the current segment as the last segment_entered', () => {
    const events = log().entered('grounding', jul28(19, 0)).entered('pose-a', jul28(19, 10)).all();
    expect(rebuildProjections(events, STEP_COUNT).currentSegmentId).toBe('pose-a');
  });

  it('folds savasana steps, clamped to [0, stepCount-1]', () => {
    const events = log()
      .entered('savasana', jul28(19, 45))
      .savasanaAdvanced(jul28(19, 46))
      .savasanaAdvanced(jul28(19, 47))
      .savasanaBack(jul28(19, 48))
      .all();
    expect(rebuildProjections(events, STEP_COUNT).savasanaStep).toBe(1);
  });

  it('does not let savasana step exceed the last index', () => {
    const b = log().entered('savasana', jul28(19, 45));
    for (let i = 0; i < 20; i++) b.savasanaAdvanced(jul28(19, 46) + i * 1000);
    expect(rebuildProjections(b.all(), STEP_COUNT).savasanaStep).toBe(STEP_COUNT - 1);
  });

  it('reflects wake acknowledgment once wake_message_shown is present', () => {
    const before = log().entered('savasana', jul28(19, 45)).all();
    const after = log().entered('savasana', jul28(19, 45)).wakeShown(jul28(19, 58)).all();
    expect(rebuildProjections(before, STEP_COUNT).wakeMessageShown).toBe(false);
    expect(rebuildProjections(after, STEP_COUNT).wakeMessageShown).toBe(true);
  });
});

describe('deriveExpandedReference', () => {
  it('opens on expand and clears on matching collapse', () => {
    const opened = log().entered('pose-a', jul28(19, 10)).referenceExpanded('pose-a', jul28(19, 11)).all();
    expect(deriveExpandedReference(opened)).toBe('pose-a');
    const closed = new EventLog()
      .runStarted(jul28(19, 0), { runLocalDate: '2026-07-28', hardCloseAtEpochMs: jul28(20, 0) })
      .entered('pose-a', jul28(19, 10))
      .referenceExpanded('pose-a', jul28(19, 11))
      .push({
        seq: 99,
        type: 'reference_collapsed',
        wall: '',
        wallEpochMs: jul28(19, 12),
        monotonic: jul28(19, 12),
        executionId: 'exec-1',
        segmentId: 'pose-a',
      })
      .all();
    expect(deriveExpandedReference(closed)).toBeNull();
  });

  it('closes an open reference when the segment changes', () => {
    const events = log()
      .entered('pose-a', jul28(19, 10))
      .referenceExpanded('pose-a', jul28(19, 11))
      .entered('pose-b', jul28(19, 20))
      .all();
    expect(deriveExpandedReference(events)).toBeNull();
  });
});

describe('projectionsEqual', () => {
  it('compares all four event-derived fields', () => {
    const base = {
      currentSegmentId: 'pose-a',
      savasanaStep: 0,
      expandedReferenceSegmentId: null,
      wakeMessageShown: false,
    };
    expect(projectionsEqual(base, { ...base })).toBe(true);
    expect(projectionsEqual(base, { ...base, savasanaStep: 1 })).toBe(false);
    expect(projectionsEqual(base, { ...base, currentSegmentId: 'pose-b' })).toBe(false);
  });
});
