import { describe, expect, it } from 'vitest';
import { importClass } from './index.js';
import { MINIMAL_VALID, expectFail, expectOk, messageMentions, replaceOnce } from './test-helpers.js';

const FENCE = '```';
const GUIDED = 'guided_silent_ratio: Brief guidance, then silence.';

// C4 — safe parsing. Nothing from the file is ever executed; unsupported YAML
// features are rejected, and HTML/script/link text is retained inertly as data.

describe('embedded HTML, script, and link content stays inert text', () => {
  it('imports and stores markup verbatim as a string value', async () => {
    const payload = '<script>alert(1)</script> visit http://example.com/path now';
    const source = replaceOnce(MINIMAL_VALID, 'entry: Enter the shape.', `entry: ${payload}`);
    const result = expectOk(await importClass(source));
    const pose = result.classDefinition.authoredSegments.find((s) => s.type === 'pose');
    if (pose?.type !== 'pose') throw new Error('pose missing');
    expect(pose.entry).toBe(payload);
    expect(typeof pose.entry).toBe('string');
  });
});

describe('unsupported YAML features are rejected', () => {
  const inject = (extra: string): string => replaceOnce(MINIMAL_VALID, GUIDED, `${GUIDED}\n${extra}`);

  it('rejects anchors', async () => {
    const result = expectFail(await importClass(inject('x_anchor: &a hello')));
    expect(result.errors.some((e) => messageMentions(e.message, 'anchor'))).toBe(true);
  });

  it('rejects aliases', async () => {
    const result = expectFail(await importClass(inject('x_anchor: &a hello\nx_alias: *a')));
    expect(result.errors.some((e) => messageMentions(e.message, 'alias') || messageMentions(e.message, 'anchor'))).toBe(true);
  });

  it('rejects explicit tags', async () => {
    const result = expectFail(await importClass(inject('x_tagged: !!str 5')));
    expect(result.errors.some((e) => messageMentions(e.message, 'tag'))).toBe(true);
  });

  it('rejects custom / unknown types via their tag', async () => {
    const result = expectFail(await importClass(inject('x_custom: !myType value')));
    expect(result.errors.some((e) => messageMentions(e.message, 'tag'))).toBe(true);
  });

  it('rejects multiple documents in one block', async () => {
    const result = expectFail(await importClass(inject('---\nid: second-doc')));
    expect(result.errors.some((e) => messageMentions(e.message, 'document'))).toBe(true);
  });

  it('rejects directives', async () => {
    // A directive must lead the block; rewrite the grounding block opener.
    const source = replaceOnce(MINIMAL_VALID, `${FENCE}yaml\nid: grounding`, `${FENCE}yaml\n%YAML 1.2\n---\nid: grounding`);
    const result = expectFail(await importClass(source));
    expect(result.errors.some((e) => messageMentions(e.message, 'directive'))).toBe(true);
  });

  it('rejects duplicate keys at the top level', async () => {
    const result = expectFail(await importClass(inject('duration_min: 11')));
    expect(result.errors.some((e) => messageMentions(e.message, 'yaml') || messageMentions(e.message, 'unique') || messageMentions(e.message, 'key'))).toBe(true);
  });

  it('rejects duplicate keys nested at depth', async () => {
    const nested = 'x_nested:\n  a: 1\n  a: 2';
    const result = expectFail(await importClass(inject(nested)));
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.ok).toBe(false);
  });

  it('rejects non-string keys', async () => {
    const result = expectFail(await importClass(inject('7: seven')));
    expect(result.errors.some((e) => messageMentions(e.message, 'key'))).toBe(true);
  });

  it('rejects non-finite numbers', async () => {
    const result = expectFail(await importClass(inject('x_number: .inf')));
    expect(result.errors.some((e) => messageMentions(e.message, 'finite'))).toBe(true);
  });
});
