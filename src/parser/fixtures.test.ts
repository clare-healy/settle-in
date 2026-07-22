import { describe, expect, it } from 'vitest';
import { importClass } from './index.js';
import { expectFail, expectOk, messageMentions, readFixture } from './test-helpers.js';

// Every expectation in fixtures/expected-validation-errors.md, matched on
// meaning (segment / field / cause) rather than punctuation.

describe('valid-desire-paths.md (C1, C8, D1, D2)', () => {
  it('imports with no errors, no warnings, and the expected summary', async () => {
    const result = expectOk(await importClass(readFixture('valid-desire-paths.md')));

    expect(result.warnings).toHaveLength(0);
    expect(result.classDefinition.plannedDurationSec).toBe(3600);

    const s = result.summary;
    expect(s.plannedDurationMin).toBe(60);
    expect(s.authoredPoseCount).toBe(5);
    expect(s.teachingSideCount).toBe(8);
    expect(s.transitionCount).toBe(5);
    expect(s.peakPoseName).toBe('Supported Caterpillar');
    expect(s.savasanaDurationSec).toBe(900);
    expect(s.scheduledStartLocal).toBe('19:00');
    expect(s.hardCloseLocal).toBe('20:00');
  });

  it('expands bilateral poses into per-side segments with cumulative offsets', async () => {
    const result = expectOk(await importClass(readFixture('valid-desire-paths.md')));
    const expanded = result.classDefinition.expandedRuntimeSegments;
    const byId = new Map(expanded.map((seg) => [seg.id, seg]));

    // D1: Sleeping Swan (4 min per side) becomes right then left, 8 planned minutes.
    const right = byId.get('sleeping-swan--right');
    const left = byId.get('sleeping-swan--left');
    expect(right?.side).toBe('right');
    expect(left?.side).toBe('left');
    expect(right?.plannedDurationSec).toBe(240);
    expect(left?.plannedDurationSec).toBe(240);
    // Right precedes left in expanded order.
    expect(expanded.indexOf(right!)).toBeLessThan(expanded.indexOf(left!));

    // D2: canonical planned windows for a 7:00 start (offsets in seconds).
    expect(byId.get('grounding')?.plannedOffsetSec).toBe(0);
    expect(byId.get('grounding')?.plannedDurationSec).toBe(600);
    expect(byId.get('supported-caterpillar')?.plannedOffsetSec).toBe(24 * 60);
    expect(byId.get('supported-caterpillar')?.plannedDurationSec).toBe(6 * 60);
    expect(byId.get('savasana')?.plannedOffsetSec).toBe(45 * 60);
    expect(byId.get('savasana')?.plannedDurationSec).toBe(15 * 60);
  });
});

describe('valid-boundary-content.md (C1, J2)', () => {
  it('imports with no warnings and the expected counts', async () => {
    const result = expectOk(await importClass(readFixture('valid-boundary-content.md')));
    expect(result.warnings).toHaveLength(0);
    expect(result.classDefinition.plannedDurationSec).toBe(3600);
    expect(result.summary.authoredPoseCount).toBe(4);
    expect(result.summary.teachingSideCount).toBe(6);
    expect(result.summary.transitionCount).toBe(4);
    expect(result.summary.peakPoseName).toBe('Supported Caterpillar');
  });

  it('reads the 36 / 150 / 280 boundary lengths intact without firing a warning', async () => {
    const result = expectOk(await importClass(readFixture('valid-boundary-content.md')));
    const pose = result.classDefinition.authoredSegments.find(
      (seg) => seg.type === 'pose' && seg.id === 'deeply-supported-reclining-butterfly',
    );
    expect(pose?.type).toBe('pose');
    if (pose?.type !== 'pose') throw new Error('boundary pose missing');
    expect(pose.name.length).toBe(36);
    expect(pose.midpoint.length).toBe(150);
    expect(pose.entry.length).toBe(280);
    expect(result.warnings).toHaveLength(0);
  });
});

describe('warning-short-plan.md (C9)', () => {
  it('imports with exactly the short-plan warning and no blocking error', async () => {
    const result = expectOk(await importClass(readFixture('warning-short-plan.md')));
    expect(result.classDefinition.plannedDurationSec).toBe(2400);
    expect(result.warnings).toHaveLength(1);
    const w = result.warnings[0]!;
    expect(messageMentions(w.message, '40 minutes', 'shorter', '60-minute')).toBe(true);
  });
});

describe('invalid-missing-duration.md (C2)', () => {
  it('blocks with a Test Pose duration_min correction that names a source line', async () => {
    const result = expectFail(await importClass(readFixture('invalid-missing-duration.md')));
    const match = result.errors.find(
      (e) => e.segment === 'Test Pose' && e.field === 'duration_min',
    );
    expect(match).toBeDefined();
    expect(messageMentions(match!.message, 'duration_min', 'required', 'bilateral is false')).toBe(true);
    expect(typeof match!.sourceLine).toBe('number');
    // The original source is retained for editing or copying.
    expect(result.originalMarkdown).toContain('Test Pose');
  });
});

describe('invalid-bilateral-duration.md (C3)', () => {
  it('blocks with both bilateral-duration corrections on Bilateral Test', async () => {
    const result = expectFail(await importClass(readFixture('invalid-bilateral-duration.md')));

    const requiresPerSide = result.errors.find(
      (e) => e.segment === 'Bilateral Test' && e.field === 'duration_per_side_min',
    );
    expect(requiresPerSide).toBeDefined();
    expect(messageMentions(requiresPerSide!.message, 'duration_per_side_min', 'required', 'bilateral is true')).toBe(true);

    const notAllowed = result.errors.find(
      (e) => e.segment === 'Bilateral Test' && e.field === 'duration_min',
    );
    expect(notAllowed).toBeDefined();
    expect(messageMentions(notAllowed!.message, 'duration_min', 'not allowed', 'bilateral')).toBe(true);
    expect(messageMentions(notAllowed!.message, 'each side')).toBe(true);
  });
});
