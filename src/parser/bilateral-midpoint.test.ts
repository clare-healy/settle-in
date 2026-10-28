import { describe, expect, it } from 'vitest';
import { importClass } from './index.js';
import { expectFail, expectOk, MINIMAL_VALID, replaceOnce } from './test-helpers.js';

function bilateralSource(midpointYaml: string): string {
  let source = replaceOnce(MINIMAL_VALID, 'bilateral: false', 'bilateral: true');
  source = replaceOnce(source, 'duration_min: 34', [
    'duration_per_side_min: 17',
    'side_order:',
    '  - left',
    '  - right',
  ].join('\n'));
  return replaceOnce(source, 'midpoint: Notice the breath.', midpointYaml);
}

describe('bilateral midpoint cues', () => {
  it('maps right and left cues by side even when side_order begins with left', async () => {
    const source = bilateralSource([
      'midpoint:',
      '  right: Right-side cue.',
      '  left: Left-side cue.',
    ].join('\n'));
    const result = expectOk(await importClass(source));
    const poses = result.classDefinition.expandedRuntimeSegments.filter((segment) => segment.type === 'pose');

    expect(poses.map((segment) => segment.id)).toEqual(['test-pose--left', 'test-pose--right']);
    expect(poses.map((segment) => segment.cues['midpoint'])).toEqual(['Left-side cue.', 'Right-side cue.']);
  });

  it('keeps a single midpoint valid and shared across both sides', async () => {
    const result = expectOk(await importClass(bilateralSource('midpoint: Shared cue.')));
    const poses = result.classDefinition.expandedRuntimeSegments.filter((segment) => segment.type === 'pose');
    expect(poses.map((segment) => segment.cues['midpoint'])).toEqual(['Shared cue.', 'Shared cue.']);
  });

  it('blocks a per-side map that omits either supported side', async () => {
    const result = expectFail(await importClass(bilateralSource([
      'midpoint:',
      '  right: Right-side cue.',
    ].join('\n'))));
    expect(result.errors.some((error) => (
      error.field === 'midpoint'
      && error.message.includes('exactly one non-empty right cue and one non-empty left cue')
    ))).toBe(true);
  });

  it('blocks a per-side map on a non-bilateral pose', async () => {
    const source = replaceOnce(MINIMAL_VALID, 'midpoint: Notice the breath.', [
      'midpoint:',
      '  right: Right-side cue.',
      '  left: Left-side cue.',
    ].join('\n'));
    const result = expectFail(await importClass(source));
    expect(result.errors.some((error) => (
      error.field === 'midpoint'
      && error.message.includes('one non-empty text cue for a non-bilateral pose')
    ))).toBe(true);
  });

  it('applies the 150-character glance warning to each side independently', async () => {
    const longCue = 'R'.repeat(151);
    const result = expectOk(await importClass(bilateralSource([
      'midpoint:',
      `  right: ${longCue}`,
      '  left: Left-side cue.',
    ].join('\n'))));
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]?.field).toBe('midpoint.right');
    expect(result.warnings[0]?.message).toContain('right midpoint cue');
  });
});
