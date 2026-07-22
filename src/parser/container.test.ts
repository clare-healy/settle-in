import { describe, expect, it } from 'vitest';
import { importClass } from './index.js';
import { MINIMAL_VALID, expectFail, messageMentions, replaceOnce } from './test-helpers.js';

const FENCE = '```';
const FRONT = ['---', 'schema_version: 1', 'title: T', '---', '', '# T', ''].join('\n');

// Malformed containers — the total grammar rejects each with a plain message.

describe('malformed containers', () => {
  it('rejects a missing front-matter block', async () => {
    const result = expectFail(await importClass('# T\n\n## Grounding\n'));
    expect(messageMentions(result.errors[0]!.message, 'front')).toBe(true);
  });

  it('rejects an H1 that does not match the front-matter title', async () => {
    const source = replaceOnce(MINIMAL_VALID, '# Safety Test', '# A Different Title');
    const result = expectFail(await importClass(source));
    expect(result.errors.some((e) => messageMentions(e.message, 'title', 'match'))).toBe(true);
  });

  it('rejects a segment heading with no yaml fence', async () => {
    const source = `${FRONT}\n## Grounding\n\n## Savasana\n`;
    const result = expectFail(await importClass(source));
    expect(messageMentions(result.errors[0]!.message, 'followed')).toBe(true);
  });

  it('rejects two fences under one heading', async () => {
    const source = `${FRONT}\n## Grounding\n\n${FENCE}yaml\nid: grounding\n${FENCE}\n\n${FENCE}yaml\nid: x\n${FENCE}\n`;
    const result = expectFail(await importClass(source));
    expect(messageMentions(result.errors[0]!.message, 'block')).toBe(true);
  });

  it('rejects an unclosed fence', async () => {
    const source = `${FRONT}\n## Grounding\n\n${FENCE}yaml\nid: grounding\n`;
    const result = expectFail(await importClass(source));
    expect(messageMentions(result.errors[0]!.message, 'closed')).toBe(true);
  });

  it('rejects trailing content after the last segment', async () => {
    const source = `${MINIMAL_VALID}\nLeftover prose after the class.\n`;
    const result = expectFail(await importClass(source));
    expect(messageMentions(result.errors[0]!.message, 'unexpected')).toBe(true);
  });

  it('rejects a file containing a NUL byte', async () => {
    const source = MINIMAL_VALID.slice(0, 10) + String.fromCharCode(0) + MINIMAL_VALID.slice(10);
    const result = expectFail(await importClass(source));
    expect(messageMentions(result.errors[0]!.message, 'nul')).toBe(true);
  });
});
