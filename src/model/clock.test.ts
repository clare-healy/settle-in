import { describe, expect, it } from 'vitest';
import {
  TestClock,
  formatIsoWithOffset,
  isoOffsetMinutes,
  localDateAt,
  sampleFrom,
} from './clock.js';
import { CDT_OFFSET_MIN, jul28 } from './test-support.js';

describe('TestClock (independent wall + monotonic control)', () => {
  it('advances wall and monotonic together with advance()', () => {
    const clock = new TestClock({ wallEpochMs: 1000, monotonic: 50 });
    clock.advance(2000);
    expect(clock.now().getTime()).toBe(3000);
    expect(clock.monotonicNow()).toBe(2050);
  });

  it('can move wall backward while monotonic stays steady', () => {
    const clock = new TestClock({ wallEpochMs: 10_000, monotonic: 500 });
    clock.advanceMonotonic(1000);
    clock.advanceWall(-4000);
    expect(clock.now().getTime()).toBe(6000);
    expect(clock.monotonicNow()).toBe(1500);
  });

  it('can jump wall forward independently of monotonic', () => {
    const clock = new TestClock({ wallEpochMs: 0, monotonic: 0 });
    clock.advanceMonotonic(1000);
    clock.advanceWall(3_600_000); // wall jumps an hour, monotonic advanced only 1s
    expect(clock.now().getTime()).toBe(3_600_000);
    expect(clock.monotonicNow()).toBe(1000);
  });

  it('new executionId simulates a reload / process death', () => {
    const clock = new TestClock({ executionId: 'a' });
    expect(clock.executionId).toBe('a');
    clock.setExecutionId('b');
    expect(clock.executionId).toBe('b');
  });
});

describe('offset and ISO formatting', () => {
  it('isoOffsetMinutes negates getTimezoneOffset', () => {
    const date = { getTimezoneOffset: () => 300 } as Date;
    expect(isoOffsetMinutes(date)).toBe(-300);
  });

  it('formats an instant with a negative offset', () => {
    // 2026-07-28 19:00 local at -05:00.
    const epoch = jul28(19, 0, 0);
    expect(formatIsoWithOffset(epoch, CDT_OFFSET_MIN)).toBe('2026-07-28T19:00:00-05:00');
  });

  it('formats an instant with a positive offset', () => {
    // 2026-07-28 19:00 at +05:30.
    const offset = 330;
    const epoch = Date.UTC(2026, 6, 28, 19, 0, 0) - offset * 60_000;
    expect(formatIsoWithOffset(epoch, offset)).toBe('2026-07-28T19:00:00+05:30');
  });

  it('localDateAt reads the local calendar date at an offset across the UTC boundary', () => {
    // 2026-07-28 23:30 local at -05:00 is 2026-07-29 04:30 UTC, but the local date is the 28th.
    const epoch = jul28(23, 30, 0);
    expect(localDateAt(epoch, CDT_OFFSET_MIN)).toBe('2026-07-28');
  });
});

describe('sampleFrom', () => {
  it('captures wall, epoch, monotonic, and execution together', () => {
    const clock = new TestClock({ wallEpochMs: jul28(19, 0), monotonic: 123, offsetMinutes: CDT_OFFSET_MIN });
    const s = sampleFrom(clock, CDT_OFFSET_MIN, 'exec-x');
    expect(s.wall).toBe('2026-07-28T19:00:00-05:00');
    expect(s.wallEpochMs).toBe(jul28(19, 0));
    expect(s.monotonic).toBe(123);
    expect(s.executionId).toBe('exec-x');
  });
});
