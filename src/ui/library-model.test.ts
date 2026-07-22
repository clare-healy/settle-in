// Pure library derivations: upcoming-class selection and class grouping.
//
// screen-states.md § 3: the earliest FUTURE class is suggested; when more than one
// future class exists Clare explicitly chooses (the deferred M4a Q3). § 13: classes
// group by class_id with a taught-run count. No DOM, no clock — pure functions.

import { describe, it, expect } from 'vitest';
import {
  groupClasses,
  pickUpcomingClassId,
  upcomingChoiceIsAmbiguous,
  upcomingDefinition,
  peakPoseName,
} from './library-model.js';
import type { StoredClassRevision, StoredRun } from '../store/index.js';
import type { ClassDefinition } from '../schema/index.js';

function def(classId: string, date: string, peakPoseId = 'p1'): ClassDefinition {
  return {
    schemaVersion: 1,
    classId,
    revisionId: `${classId}-h`,
    sourceHash: `${classId}-h`,
    title: `Class ${classId}`,
    date,
    scheduledStartLocal: '19:00',
    hardCloseLocal: '20:00',
    themeLine: 'theme',
    feltSense: 'felt',
    peakPoseId,
    props: ['bolster'],
    roomSetup: [],
    arrival: 'a',
    breathwork: 'b',
    authoredSegments: [
      { type: 'pose', id: 'p1', name: 'Peak Pose', bilateral: false, durationMin: 6, durationPerSideMin: null, sideOrder: null, entry: '', target: '', settling: '', midpoint: '', props: '', alternative: '', exit: '', notes: '' },
    ],
    expandedRuntimeSegments: [],
    plannedDurationSec: 3600,
    originalMarkdown: '',
  };
}

function rev(classId: string, date: string, importedAt: string): StoredClassRevision {
  return {
    sourceHash: `${classId}-${importedAt}`,
    classId,
    schemaVersion: 1,
    warnings: [],
    importedAt,
    definition: { ...def(classId, date), sourceHash: `${classId}-${importedAt}`, revisionId: `${classId}-${importedAt}` },
  };
}

function run(classId: string, runId: string): StoredRun {
  return {
    runId,
    classId,
    revisionSourceHash: `${classId}-x`,
    status: 'completed_run',
    runStartedAt: '2026-07-28T19:00:00-05:00',
    runStartedAtEpochMs: 0,
    runLocalDate: '2026-07-28',
    hardCloseAt: '2026-07-28T20:00:00-05:00',
    hardCloseAtEpochMs: 0,
    projection: { currentSegmentId: null, savasanaStep: 0, expandedReferenceSegmentId: null, wakeMessageShown: false },
    updatedAt: '2026-07-28T20:00:00-05:00',
  };
}

describe('groupClasses', () => {
  it('groups revisions by class and counts taught runs, sorted by date', () => {
    const revisions = [rev('b', '2026-08-04', '2026-07-01'), rev('a', '2026-07-28', '2026-07-02'), rev('a', '2026-07-28', '2026-07-03')];
    const runs = [run('a', 'r1'), run('a', 'r2'), run('b', 'r3')];
    const groups = groupClasses(revisions, runs);
    expect(groups.map((g) => g.classId)).toEqual(['a', 'b']);
    expect(groups[0]!.runCount).toBe(2);
    expect(groups[0]!.revisions).toHaveLength(2);
    // latest = most-recently imported revision.
    expect(groups[0]!.latest.importedAt).toBe('2026-07-03');
  });
});

describe('pickUpcomingClassId', () => {
  const groups = groupClasses(
    [rev('past', '2026-07-01', '2026-06-01'), rev('soon', '2026-07-28', '2026-06-02'), rev('later', '2026-08-11', '2026-06-03')],
    [],
  );

  it('suggests the earliest class dated today or later', () => {
    expect(pickUpcomingClassId(groups, null, '2026-07-28')).toBe('soon');
    expect(pickUpcomingClassId(groups, null, '2026-07-29')).toBe('later');
  });

  it('falls back to the most recent class when none is in the future', () => {
    expect(pickUpcomingClassId(groups, null, '2026-09-01')).toBe('later');
  });

  it("honors Clare's explicit choice when it still resolves", () => {
    expect(pickUpcomingClassId(groups, 'past', '2026-07-28')).toBe('past');
  });

  it('ignores a stale explicit choice that no longer exists', () => {
    expect(pickUpcomingClassId(groups, 'deleted', '2026-07-28')).toBe('soon');
  });

  it('returns null for an empty library', () => {
    expect(pickUpcomingClassId([], null, '2026-07-28')).toBeNull();
  });
});

describe('upcomingChoiceIsAmbiguous', () => {
  it('is true only when more than one class is dated today or later', () => {
    const two = groupClasses([rev('a', '2026-07-28', '1'), rev('b', '2026-08-04', '2')], []);
    expect(upcomingChoiceIsAmbiguous(two, '2026-07-28')).toBe(true);
    expect(upcomingChoiceIsAmbiguous(two, '2026-08-01')).toBe(false); // only b remains future
  });
});

describe('upcomingDefinition / peakPoseName', () => {
  it('resolves the latest revision definition for a class id', () => {
    const groups = groupClasses([rev('a', '2026-07-28', '2026-06-01')], []);
    expect(upcomingDefinition(groups, 'a')?.classId).toBe('a');
    expect(upcomingDefinition(groups, 'missing')).toBeNull();
  });

  it('resolves the peak pose display name', () => {
    expect(peakPoseName(def('a', '2026-07-28', 'p1'))).toBe('Peak Pose');
    expect(peakPoseName(def('a', '2026-07-28', 'unknown'))).toBe('unknown');
  });
});
