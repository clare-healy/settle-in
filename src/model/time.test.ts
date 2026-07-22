import { describe, expect, it } from 'vitest';
import { importClass } from '../parser/index.js';
import { expectOk, readFixture } from '../parser/test-helpers.js';
import type { ClassDefinition } from '../schema/index.js';
import {
  constructHardClose,
  elapsedMs,
  elapsedSec,
  format12hLabel,
  formatElapsed,
  plannedWindowFor,
  reanchorPlan,
} from './time.js';
import { CDT_OFFSET_MIN, jul28, localEpoch, sampleAt } from './test-support.js';

async function desirePaths(): Promise<ClassDefinition> {
  return expectOk(await importClass(readFixture('valid-desire-paths.md'))).classDefinition;
}

describe('D1 — bilateral expansion contributes eight planned minutes', () => {
  it('Sleeping Swan expands to right (4 min) then left (4 min)', async () => {
    const def = await desirePaths();
    const right = def.expandedRuntimeSegments.find((s) => s.id === 'sleeping-swan--right')!;
    const left = def.expandedRuntimeSegments.find((s) => s.id === 'sleeping-swan--left')!;
    expect(right.plannedDurationSec).toBe(240);
    expect(left.plannedDurationSec).toBe(240);
    expect(right.side).toBe('right');
    expect(left.side).toBe('left');
    // Right's window ends exactly where Left's begins, contributing 8 minutes.
    const start = jul28(19, 0);
    const rw = plannedWindowFor(def.expandedRuntimeSegments, 'sleeping-swan--right', start)!;
    const lw = plannedWindowFor(def.expandedRuntimeSegments, 'sleeping-swan--left', start)!;
    expect(lw.plannedStartEpochMs).toBe(rw.plannedEndEpochMs);
    expect(lw.plannedEndEpochMs - rw.plannedStartEpochMs).toBe(8 * 60_000);
  });
});

describe('D2 — canonical planned windows for a 7:00 PM start', () => {
  it('Grounding 7:00–7:10, Supported Caterpillar 7:24–7:30, Savasana 7:45–8:00', async () => {
    const def = await desirePaths();
    const start = jul28(19, 0);
    const plan = reanchorPlan(def.expandedRuntimeSegments, start);
    const by = new Map(plan.map((w) => [w.segmentId, w]));

    expect(by.get('grounding')!.plannedStartEpochMs).toBe(jul28(19, 0));
    expect(by.get('grounding')!.plannedEndEpochMs).toBe(jul28(19, 10));

    expect(by.get('supported-caterpillar')!.plannedStartEpochMs).toBe(jul28(19, 24));
    expect(by.get('supported-caterpillar')!.plannedEndEpochMs).toBe(jul28(19, 30));

    expect(by.get('savasana')!.plannedStartEpochMs).toBe(jul28(19, 45));
    expect(by.get('savasana')!.plannedEndEpochMs).toBe(jul28(20, 0));
  });
});

describe('D3 — late begin re-anchors the plan; hard close does not move', () => {
  it('begun at 7:03: Grounding 7:03–7:13, hard close still 8:00, wake at 7:58', async () => {
    const def = await desirePaths();
    const start = jul28(19, 3);
    const grounding = plannedWindowFor(def.expandedRuntimeSegments, 'grounding', start)!;
    expect(grounding.plannedStartEpochMs).toBe(jul28(19, 3));
    expect(grounding.plannedEndEpochMs).toBe(jul28(19, 13));

    const hc = constructHardClose(start, CDT_OFFSET_MIN, def.hardCloseLocal);
    expect(hc.epochMs).toBe(jul28(20, 0));
    expect(hc.iso).toBe('2026-07-28T20:00:00-05:00');
    // Wake message eligible two minutes before, i.e. 7:58.
    expect(hc.epochMs - 120_000).toBe(jul28(19, 58));
  });
});

describe('Hard-close construction — built once from Begin, never recomputed', () => {
  it('uses the Begin offset and the run local date', () => {
    const begin = jul28(19, 2); // 7:02 PM CDT on the 28th
    const hc = constructHardClose(begin, CDT_OFFSET_MIN, '20:00');
    expect(hc.localDate).toBe('2026-07-28');
    expect(hc.epochMs).toBe(jul28(20, 0));
    expect(hc.offsetMinutes).toBe(CDT_OFFSET_MIN);
  });

  it('changing the ambient zone/offset afterward does not move the persisted instant', () => {
    const begin = jul28(19, 0);
    const hc = constructHardClose(begin, CDT_OFFSET_MIN, '20:00');
    const persisted = hc.epochMs;
    // A later recompute at a different offset would land elsewhere — but the treaty
    // forbids recomputing. The already-constructed instant is unchanged.
    const wrongRecompute = constructHardClose(begin, -240, '20:00');
    expect(wrongRecompute.epochMs).not.toBe(persisted);
    expect(hc.epochMs).toBe(persisted); // the real value is immutable
  });

  it('a rerun on a different date uses the run date', () => {
    // Same class rerun on 2026-08-04 (the following Tuesday).
    const begin = localEpoch(2026, 8, 4, 19, 30, 0, CDT_OFFSET_MIN);
    const hc = constructHardClose(begin, CDT_OFFSET_MIN, '20:00');
    expect(hc.localDate).toBe('2026-08-04');
    expect(hc.epochMs).toBe(localEpoch(2026, 8, 4, 20, 0, 0, CDT_OFFSET_MIN));
  });

  it('a run begun at/after hard close still constructs the same-day 8:00 instant', () => {
    const begin = jul28(20, 15); // rehearsal at 8:15 PM
    const hc = constructHardClose(begin, CDT_OFFSET_MIN, '20:00');
    expect(hc.epochMs).toBe(jul28(20, 0));
    expect(hc.epochMs).toBeLessThan(begin); // hard close is already in the past
  });
});

describe('D7 — elapsed from durable timestamps, never negative', () => {
  it('within one execution uses steady monotonic despite a wall jump', () => {
    const entry = sampleAt(jul28(19, 0), 1000, 'exec-1');
    // 90 seconds of real time pass (monotonic +90s) but the wall clock jumps +1h.
    const now = sampleAt(jul28(20, 0), 1000 + 90_000, 'exec-1');
    expect(elapsedMs(entry, now)).toBe(90_000);
    expect(elapsedSec(entry, now)).toBe(90);
  });

  it('within one execution never goes negative when the wall moves backward', () => {
    const entry = sampleAt(jul28(19, 0), 5000, 'exec-1');
    // Wall moved backward, monotonic advanced 30s.
    const now = sampleAt(jul28(18, 30), 5000 + 30_000, 'exec-1');
    expect(elapsedMs(entry, now)).toBe(30_000);
  });

  it('across executions (recovery) uses durable wall timestamps', () => {
    const entry = sampleAt(jul28(19, 0), 999_999, 'exec-1');
    // Different execution: monotonic is meaningless, wall is truth (+2 min).
    const now = sampleAt(jul28(19, 2), 12, 'exec-2');
    expect(elapsedMs(entry, now)).toBe(120_000);
  });

  it('across executions clamps at zero when the wall moved backward', () => {
    const entry = sampleAt(jul28(19, 5), 0, 'exec-1');
    const now = sampleAt(jul28(19, 0), 0, 'exec-2');
    expect(elapsedMs(entry, now)).toBe(0);
  });

  it('rendering pauses do not corrupt elapsed (recompute from timestamps)', () => {
    const entry = sampleAt(jul28(19, 0), 0, 'exec-1');
    // No matter when we sample, elapsed reflects the monotonic delta.
    expect(elapsedSec(entry, sampleAt(jul28(19, 0, 3), 3210, 'exec-1'))).toBe(3);
    expect(elapsedSec(entry, sampleAt(jul28(19, 0, 59), 65_400, 'exec-1'))).toBe(65);
  });
});

describe('display formatting', () => {
  it('formatElapsed renders m:ss and clamps negatives', () => {
    expect(formatElapsed(0)).toBe('0:00');
    expect(formatElapsed(5)).toBe('0:05');
    expect(formatElapsed(65)).toBe('1:05');
    expect(formatElapsed(605)).toBe('10:05');
    expect(formatElapsed(-10)).toBe('0:00');
  });

  it('format12hLabel renders a 12-hour label with no am/pm', () => {
    expect(format12hLabel('20:00')).toBe('8:00');
    expect(format12hLabel('19:00')).toBe('7:00');
    expect(format12hLabel('00:05')).toBe('12:05');
    expect(format12hLabel('12:30')).toBe('12:30');
  });
});
