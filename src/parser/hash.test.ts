import { describe, expect, it } from 'vitest';
import { importClass } from './index.js';
import { MINIMAL_VALID, hashOf } from './test-helpers.js';

// C5 — source identity. The hash is taken after newline normalization and one
// optional BOM removal; every other byte, including trailing whitespace and the
// final newline, is significant.

describe('source_hash groundwork', () => {
  it('produces an identical hash for identical normalized input', async () => {
    const a = hashOf(await importClass(MINIMAL_VALID));
    const b = hashOf(await importClass(MINIMAL_VALID));
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).toBe(b);
  });

  it('treats CRLF and LF as the same source', async () => {
    const lf = MINIMAL_VALID;
    const crlf = MINIMAL_VALID.replace(/\n/g, '\r\n');
    expect(hashOf(await importClass(crlf))).toBe(hashOf(await importClass(lf)));
  });

  it('treats a leading BOM and no BOM as the same source', async () => {
    const withBom = `\uFEFF${MINIMAL_VALID}`;
    expect(hashOf(await importClass(withBom))).toBe(hashOf(await importClass(MINIMAL_VALID)));
  });

  it('treats differing trailing whitespace as different sources', async () => {
    const base = hashOf(await importClass(MINIMAL_VALID));
    const trailingSpaces = hashOf(await importClass(`${MINIMAL_VALID}   `));
    const trailingNewline = hashOf(await importClass(`${MINIMAL_VALID}\n`));
    expect(trailingSpaces).not.toBe(base);
    expect(trailingNewline).not.toBe(base);
  });
});
