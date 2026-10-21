import { describe, expect, it } from 'vitest';
import { importClass } from './index.js';
import { MINIMAL_VALID, expectFail, expectOk, messageMentions, replaceOnce } from './test-helpers.js';

describe('generalized one-hour schedule', () => {
  it('accepts a class at any local start when hard close is exactly one hour later', async () => {
    let source = replaceOnce(MINIMAL_VALID, 'date: 2026-07-28', 'date: 2026-07-29');
    source = replaceOnce(source, 'scheduled_start_local: "19:00"', 'scheduled_start_local: "17:30"');
    source = replaceOnce(source, 'hard_close_local: "20:00"', 'hard_close_local: "18:30"');
    const result = expectOk(await importClass(source));
    expect(result.warnings).toHaveLength(0);
    expect(result.classDefinition.scheduledStartLocal).toBe('17:30');
    expect(result.classDefinition.hardCloseLocal).toBe('18:30');
  });

  it('accepts a one-hour class that crosses midnight', async () => {
    let source = replaceOnce(MINIMAL_VALID, 'scheduled_start_local: "19:00"', 'scheduled_start_local: "23:30"');
    source = replaceOnce(source, 'hard_close_local: "20:00"', 'hard_close_local: "00:30"');
    expectOk(await importClass(source));
  });

  it('blocks a schedule whose hard close is not exactly one hour after start', async () => {
    const source = replaceOnce(MINIMAL_VALID, 'hard_close_local: "20:00"', 'hard_close_local: "20:15"');
    const result = expectFail(await importClass(source));
    expect(result.errors.some((e) => messageMentions(e.message, 'exactly one hour'))).toBe(true);
  });
});
