import { describe, expect, it } from 'vitest';
import { importClass } from './index.js';
import { MINIMAL_VALID, expectOk, replaceOnce } from './test-helpers.js';

describe('opening transition after Grounding', () => {
  it('accepts and expands an authored transition before the first pose', async () => {
    const opening = [
      '## Transition: Wake the Body',
      '',
      '```yaml',
      'id: transition-wake-the-body',
      'duration_min: 1',
      'next_segment_id: test-pose',
      'setup: Begin gentle movement that previews the practice.',
      'alternative_offer: Keep the movement small and supported.',
      '```',
      '',
    ].join('\n');
    let source = replaceOnce(MINIMAL_VALID, 'duration_min: 10', 'duration_min: 9');
    source = replaceOnce(source, '## Pose: Test Pose', `${opening}## Pose: Test Pose`);

    const result = expectOk(await importClass(source));
    expect(result.classDefinition.expandedRuntimeSegments[1]?.id).toBe('transition-wake-the-body');
    expect(result.summary.transitionCount).toBe(2);
    expect(result.summary.plannedDurationMin).toBe(60);
  });
});
