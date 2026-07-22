// Shared helpers for the M2 model tests. Not a *.test.ts file, so Vitest does not
// collect it as a suite; it only provides construction helpers.

import type { EventSample, RunEvent } from '../schema/index.js';
import { formatIsoWithOffset } from './clock.js';

/** America/Chicago CDT offset used throughout the timing tests: −05:00. */
export const CDT_OFFSET_MIN = -300;

/**
 * Epoch ms for a local wall time at a fixed offset (minutes east of UTC).
 * realEpoch = UTC(wallValues) − offset.
 */
export function localEpoch(
  y: number,
  mo: number,
  d: number,
  h: number,
  mi: number,
  s = 0,
  offsetMinutes = CDT_OFFSET_MIN,
): number {
  return Date.UTC(y, mo - 1, d, h, mi, s) - offsetMinutes * 60_000;
}

/** A convenience: 2026-07-28 (a Tuesday) local wall time in CDT as epoch ms. */
export function jul28(h: number, mi: number, s = 0): number {
  return localEpoch(2026, 7, 28, h, mi, s, CDT_OFFSET_MIN);
}

/** Build an EventSample directly from epoch/monotonic/execution values. */
export function sampleAt(
  wallEpochMs: number,
  monotonic: number,
  executionId = 'exec-1',
  offsetMinutes = CDT_OFFSET_MIN,
): EventSample {
  return {
    wall: formatIsoWithOffset(wallEpochMs, offsetMinutes),
    wallEpochMs,
    monotonic,
    executionId,
  };
}

/**
 * A tiny event-log builder that assigns seq numbers in order and stamps each event
 * with wall/monotonic/execution samples. Monotonic tracks wall unless overridden.
 */
export class EventLog {
  private events: RunEvent[] = [];
  private seq = 0;
  private offsetMinutes: number;
  private executionId: string;

  constructor(opts?: { offsetMinutes?: number; executionId?: string }) {
    this.offsetMinutes = opts?.offsetMinutes ?? CDT_OFFSET_MIN;
    this.executionId = opts?.executionId ?? 'exec-1';
  }

  setExecutionId(id: string): this {
    this.executionId = id;
    return this;
  }

  private base(wallEpochMs: number, monotonic: number | undefined) {
    return {
      seq: this.seq++,
      wall: formatIsoWithOffset(wallEpochMs, this.offsetMinutes),
      wallEpochMs,
      monotonic: monotonic ?? wallEpochMs,
      executionId: this.executionId,
    };
  }

  push(event: RunEvent): this {
    this.events.push(event);
    return this;
  }

  runStarted(
    wallEpochMs: number,
    fields: {
      runId?: string;
      classId?: string;
      revisionSourceHash?: string;
      runLocalDate: string;
      offsetMinutesAtBegin?: number;
      hardCloseAtEpochMs: number;
    },
    monotonic?: number,
  ): this {
    const b = this.base(wallEpochMs, monotonic);
    this.events.push({
      ...b,
      type: 'run_started',
      runId: fields.runId ?? 'run-1',
      classId: fields.classId ?? 'class-1',
      revisionSourceHash: fields.revisionSourceHash ?? 'hash-1',
      runStartedAt: b.wall,
      runStartedAtEpochMs: wallEpochMs,
      runLocalDate: fields.runLocalDate,
      offsetMinutesAtBegin: fields.offsetMinutesAtBegin ?? this.offsetMinutes,
      hardCloseAt: formatIsoWithOffset(fields.hardCloseAtEpochMs, this.offsetMinutes),
      hardCloseAtEpochMs: fields.hardCloseAtEpochMs,
    });
    return this;
  }

  entered(segmentId: string, wallEpochMs: number, monotonic?: number): this {
    this.events.push({ ...this.base(wallEpochMs, monotonic), type: 'segment_entered', segmentId });
    return this;
  }
  back(toSegmentId: string, wallEpochMs: number, monotonic?: number): this {
    this.events.push({ ...this.base(wallEpochMs, monotonic), type: 'segment_back', toSegmentId });
    return this;
  }
  skipped(segmentId: string, wallEpochMs: number, monotonic?: number): this {
    this.events.push({ ...this.base(wallEpochMs, monotonic), type: 'segment_skipped', segmentId });
    return this;
  }
  substituted(segmentId: string, substitutedWith: string, wallEpochMs: number, monotonic?: number): this {
    this.events.push({ ...this.base(wallEpochMs, monotonic), type: 'substitution_noted', segmentId, substitutedWith });
    return this;
  }
  savasanaAdvanced(wallEpochMs: number, monotonic?: number): this {
    this.events.push({ ...this.base(wallEpochMs, monotonic), type: 'savasana_step_advanced' });
    return this;
  }
  savasanaBack(wallEpochMs: number, monotonic?: number): this {
    this.events.push({ ...this.base(wallEpochMs, monotonic), type: 'savasana_step_back' });
    return this;
  }
  wakeShown(wallEpochMs: number, monotonic?: number): this {
    this.events.push({ ...this.base(wallEpochMs, monotonic), type: 'wake_message_shown' });
    return this;
  }
  referenceExpanded(segmentId: string, wallEpochMs: number, monotonic?: number): this {
    this.events.push({ ...this.base(wallEpochMs, monotonic), type: 'reference_expanded', segmentId });
    return this;
  }
  resumed(wallEpochMs: number, monotonic?: number): this {
    this.events.push({ ...this.base(wallEpochMs, monotonic), type: 'run_resumed' });
    return this;
  }
  finished(wallEpochMs: number, monotonic?: number): this {
    this.events.push({ ...this.base(wallEpochMs, monotonic), type: 'run_finished' });
    return this;
  }
  abandoned(wallEpochMs: number, monotonic?: number): this {
    this.events.push({ ...this.base(wallEpochMs, monotonic), type: 'run_abandoned' });
    return this;
  }

  all(): RunEvent[] {
    return [...this.events];
  }
}
