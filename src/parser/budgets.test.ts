import { describe, expect, it } from 'vitest';
import { importClass } from './index.js';
import { MINIMAL_VALID, expectFail, messageMentions, replaceOnce } from './test-helpers.js';

// Input budgets — each over-budget case is rejected before YAML parsing with a
// plain-language message. Canonical caps from the build-plan amendments.

describe('input budgets', () => {
  it('rejects an over-size file (> 512 KB)', async () => {
    const huge = 'x'.repeat(600 * 1024);
    const result = expectFail(await importClass(huge));
    expect(result.errors).toHaveLength(1);
    expect(messageMentions(result.errors[0]!.message, 'larger')).toBe(true);
  });

  it('rejects a file with too many lines (> 10,000)', async () => {
    const manyLines = '\n'.repeat(10_001);
    const result = expectFail(await importClass(manyLines));
    expect(result.errors).toHaveLength(1);
    expect(messageMentions(result.errors[0]!.message, 'lines')).toBe(true);
  });

  it('rejects an oversized scalar (a single line over 8 KB)', async () => {
    const longValue = 'x'.repeat(9000);
    const source = replaceOnce(MINIMAL_VALID, 'notes: Notes here.', `notes: ${longValue}`);
    const result = expectFail(await importClass(source));
    expect(result.errors).toHaveLength(1);
    expect(messageMentions(result.errors[0]!.message, 'too long')).toBe(true);
  });

  it('rejects nesting deeper than 8 levels before parsing', async () => {
    // Build a 10-level nested mapping under an ignorable x_ field.
    const levels = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];
    let nested = 'x_deep:';
    levels.forEach((key, i) => {
      nested += `\n${'  '.repeat(i + 1)}${key}:`;
    });
    nested += `\n${'  '.repeat(levels.length + 1)}bottom: deep`;
    const source = replaceOnce(
      MINIMAL_VALID,
      'guided_silent_ratio: Brief guidance, then silence.',
      `guided_silent_ratio: Brief guidance, then silence.\n${nested}`,
    );
    const result = expectFail(await importClass(source));
    expect(result.errors).toHaveLength(1);
    expect(messageMentions(result.errors[0]!.message, 'nested')).toBe(true);
  });
});
