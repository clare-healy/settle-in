// The injectable clock.
//
// Time always enters the model as an argument. Production reads the wall clock
// and the monotonic clock; tests drive a TestClock that can move each of the two
// independently — so a wall-clock jump against steady monotonic time is testable
// (docs/build-plan.md § Clock; docs/implementation-treaty.md § Clock discontinuities).

import type { EventSample } from '../schema/run.js';

/**
 * The two clocks the model reads. `now()` is the wall clock (durable truth);
 * `monotonicNow()` is a steady millisecond counter (performance.now-like) used
 * for display stability within one execution.
 */
export interface Clock {
  now(): Date;
  /** Milliseconds, monotonically non-decreasing within one execution. */
  monotonicNow(): number;
}

/** ISO-8601 offset (minutes EAST of UTC) currently in effect for a wall Date. */
export function isoOffsetMinutes(date: Date): number {
  // getTimezoneOffset() is minutes to add to local to reach UTC (west-positive),
  // so the ISO offset is its negation.
  return -date.getTimezoneOffset();
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** Format an instant as ISO 8601 with an explicit offset (minutes east of UTC). */
export function formatIsoWithOffset(epochMs: number, offsetMinutes: number): string {
  const localWall = new Date(epochMs + offsetMinutes * 60_000);
  const y = localWall.getUTCFullYear();
  const mo = pad2(localWall.getUTCMonth() + 1);
  const d = pad2(localWall.getUTCDate());
  const h = pad2(localWall.getUTCHours());
  const mi = pad2(localWall.getUTCMinutes());
  const s = pad2(localWall.getUTCSeconds());
  const sign = offsetMinutes < 0 ? '-' : '+';
  const abs = Math.abs(offsetMinutes);
  const oh = pad2(Math.floor(abs / 60));
  const om = pad2(abs % 60);
  return `${y}-${mo}-${d}T${h}:${mi}:${s}${sign}${oh}:${om}`;
}

/** Local calendar date (YYYY-MM-DD) of an instant at a given offset. */
export function localDateAt(epochMs: number, offsetMinutes: number): string {
  const localWall = new Date(epochMs + offsetMinutes * 60_000);
  const y = localWall.getUTCFullYear();
  const mo = pad2(localWall.getUTCMonth() + 1);
  const d = pad2(localWall.getUTCDate());
  return `${y}-${mo}-${d}`;
}

/**
 * Build an EventSample from a clock reading plus the ambient offset and the
 * current execution identity. This is the one place wall + monotonic + identity
 * are captured together for an appended event.
 */
export function sampleFrom(clock: Clock, offsetMinutes: number, executionId: string): EventSample {
  const wallDate = clock.now();
  const epochMs = wallDate.getTime();
  return {
    wall: formatIsoWithOffset(epochMs, offsetMinutes),
    wallEpochMs: epochMs,
    monotonic: clock.monotonicNow(),
    executionId,
  };
}

/**
 * A stable identity for the current JS execution. Generated once at module load;
 * a reload or process death yields a new module load and therefore a new id.
 */
export const EXECUTION_ID: string =
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `exec-${Math.random().toString(36).slice(2)}-${Date.now()}`;

/** Production clock: the real wall clock and performance.now (or Date.now fallback). */
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
  monotonicNow(): number {
    return typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now();
  }
}

/**
 * A controllable clock for tests. Wall and monotonic advance independently, so a
 * wall-clock jump against steady monotonic time — and vice versa — can be
 * simulated. `executionId` can be replaced to simulate a reload / process death.
 */
export class TestClock implements Clock {
  private wallMs: number;
  private monoMs: number;
  private offsetMin: number;
  private execId: string;

  constructor(opts?: {
    wallEpochMs?: number;
    monotonic?: number;
    offsetMinutes?: number;
    executionId?: string;
  }) {
    this.wallMs = opts?.wallEpochMs ?? 0;
    this.monoMs = opts?.monotonic ?? 0;
    this.offsetMin = opts?.offsetMinutes ?? 0;
    this.execId = opts?.executionId ?? 'exec-test-1';
  }

  now(): Date {
    return new Date(this.wallMs);
  }
  monotonicNow(): number {
    return this.monoMs;
  }

  get offsetMinutes(): number {
    return this.offsetMin;
  }
  get executionId(): string {
    return this.execId;
  }

  /** Set the wall clock to an absolute epoch-ms instant (monotonic untouched). */
  setWall(epochMs: number): this {
    this.wallMs = epochMs;
    return this;
  }
  /** Set the monotonic counter absolutely (wall untouched). */
  setMonotonic(ms: number): this {
    this.monoMs = ms;
    return this;
  }
  /** Move the wall clock by a signed delta (can be negative to simulate a backward jump). */
  advanceWall(ms: number): this {
    this.wallMs += ms;
    return this;
  }
  /** Move the monotonic counter by a delta (normally non-negative). */
  advanceMonotonic(ms: number): this {
    this.monoMs += ms;
    return this;
  }
  /** Advance both clocks together by the same delta — the normal passage of time. */
  advance(ms: number): this {
    this.wallMs += ms;
    this.monoMs += ms;
    return this;
  }
  setOffsetMinutes(offsetMinutes: number): this {
    this.offsetMin = offsetMinutes;
    return this;
  }
  /** Replace the execution identity, simulating a reload or process death. */
  setExecutionId(executionId: string): this {
    this.execId = executionId;
    return this;
  }

  /** Capture an EventSample from the current readings using this clock's offset + identity. */
  sample(): EventSample {
    return sampleFrom(this, this.offsetMin, this.execId);
  }
}
