import { describe, expect, it } from 'vitest';
import { deriveStatus, timingStatus, timingThresholdSec } from './status.js';

describe('timing threshold — greater of 30s and 15% of planned', () => {
  it('uses 30s floor for short segments', () => {
    expect(timingThresholdSec(60)).toBe(30); // 15% of 60 = 9 < 30
    expect(timingThresholdSec(240)).toBe(36); // 15% of 240 = 36 > 30
  });
  it('uses 15% for a 15-minute savasana', () => {
    expect(timingThresholdSec(900)).toBe(135);
  });
});

describe('timing status boundary — "exceeds the greater of"', () => {
  it('short segment (threshold 30s): exactly 30s over is on-plan, 31s is long', () => {
    // Planned 240s, threshold = 36. Use a planned where threshold is 30: planned 60s.
    expect(timingStatus(60 + 30, 60)).toBe('on-plan');
    expect(timingStatus(60 + 31, 60)).toBe('long');
    expect(timingStatus(60 - 30, 60)).toBe('on-plan');
    expect(timingStatus(60 - 31, 60)).toBe('short');
  });

  it('a 240s segment uses the 36s threshold, not 30s', () => {
    expect(timingStatus(240 + 36, 240)).toBe('on-plan');
    expect(timingStatus(240 + 37, 240)).toBe('long');
  });

  it('15-min savasana: 135s over is inside (on-plan), 136s is outside (long)', () => {
    expect(timingStatus(900 + 135, 900)).toBe('on-plan');
    expect(timingStatus(900 + 136, 900)).toBe('long');
    expect(timingStatus(900 - 135, 900)).toBe('on-plan');
    expect(timingStatus(900 - 136, 900)).toBe('short');
  });
});

describe('status precedence — skipped > substituted > revisited > timing', () => {
  const planned = 240;
  const base = { plannedSec: planned, skipped: false, substituted: false, runCompleted: true };

  it('skipped wins over everything', () => {
    expect(
      deriveStatus({ ...base, actualSec: 999, visits: 3, skipped: true, substituted: true }),
    ).toBe('skipped');
  });
  it('substituted beats revisited and timing', () => {
    expect(deriveStatus({ ...base, actualSec: 999, visits: 3, substituted: true })).toBe('substituted');
  });
  it('revisited beats timing', () => {
    expect(deriveStatus({ ...base, actualSec: 999, visits: 2 })).toBe('revisited');
  });
  it('timing applies when nothing else does', () => {
    expect(deriveStatus({ ...base, actualSec: planned + 100, visits: 1 })).toBe('long');
    expect(deriveStatus({ ...base, actualSec: planned, visits: 1 })).toBe('on-plan');
  });
});

describe('Q5c — automatic skip on a completed run (no manual correction)', () => {
  const planned = 240;
  const base = { plannedSec: planned, skipped: false, substituted: false };

  it('zero visits on a COMPLETED run derives skipped, not short', () => {
    expect(deriveStatus({ ...base, actualSec: 0, visits: 0, runCompleted: true })).toBe('skipped');
  });

  it('zero visits while the run is still ACTIVE infers nothing — the segment is simply not yet taught', () => {
    // Mid-run, "never entered" only means "has not come up yet".
    expect(deriveStatus({ ...base, actualSec: 0, visits: 0, runCompleted: false })).toBe('short');
  });

  it('entered but brief still derives short — one visit is not a skip', () => {
    expect(deriveStatus({ ...base, actualSec: 5, visits: 1, runCompleted: true })).toBe('short');
  });

  it('a historic substitution still wins over the automatic skip', () => {
    // Runs recorded before the correction UI was retired carry `substitution_noted`
    // on a segment that was never itself visited: it must still export `substituted`.
    expect(
      deriveStatus({ ...base, actualSec: 0, visits: 0, substituted: true, runCompleted: true }),
    ).toBe('substituted');
  });

  it('an explicit historic skip still wins over everything', () => {
    expect(
      deriveStatus({ ...base, actualSec: 0, visits: 1, skipped: true, runCompleted: true }),
    ).toBe('skipped');
  });
});
