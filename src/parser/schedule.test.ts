import { describe, expect, it } from 'vitest';
import { importClass } from './index.js';
import { MINIMAL_VALID, expectOk, messageMentions, replaceOnce } from './test-helpers.js';

// C10 — a non-Tuesday date or a non-19:00 start warns, never blocks.

describe('schedule warning', () => {
  it('warns (without blocking) for a non-Tuesday date', async () => {
    // 2026-07-29 is a Wednesday; the plan stays 60 minutes so only the schedule warning fires.
    const source = replaceOnce(MINIMAL_VALID, 'date: 2026-07-28', 'date: 2026-07-29');
    const result = expectOk(await importClass(source));
    expect(result.warnings).toHaveLength(1);
    expect(messageMentions(result.warnings[0]!.message, 'tuesday')).toBe(true);
  });

  it('warns (without blocking) for a start other than 19:00', async () => {
    // Keep the hard close at 20:00 so the interval and 60-minute plan both hold;
    // an 18:00 start lengthens the interval, so expect the schedule + short-plan warnings.
    const source = replaceOnce(MINIMAL_VALID, 'scheduled_start_local: "19:00"', 'scheduled_start_local: "18:00"');
    const result = expectOk(await importClass(source));
    expect(result.warnings.some((w) => messageMentions(w.message, 'tuesday'))).toBe(true);
  });
});
