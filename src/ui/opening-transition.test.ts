// @vitest-environment happy-dom

import { describe, expect, it } from 'vitest';
import { importClass } from '../parser/index.js';
import { expectOk, MINIMAL_VALID, replaceOnce } from '../parser/test-helpers.js';
import { Store } from '../store/index.js';
import { newDbName, revisionOf } from '../store/test-support.js';
import { bootApp, beginRun, byId, zone } from './test-support.js';

describe('opening transition live navigation', () => {
  it('moves from Grounding into the authored opening movement before the first pose', async () => {
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
    const def = expectOk(await importClass(source)).classDefinition;
    const store = await Store.open({ name: newDbName() });
    await store.putClassRevision(revisionOf(def));
    const h = await bootApp({ store });

    await beginRun(h);
    expect(h.root.querySelector('.live')?.getAttribute('data-segment-type')).toBe('grounding');
    await zone(h.app, h.root, 'next');
    expect(h.root.querySelector('.live')?.getAttribute('data-segment-type')).toBe('transition');
    expect(byId(h.root, 'destination-preview').textContent).toBe('ToTest Pose');
    expect(h.root.textContent).toContain('Begin gentle movement that previews the practice.');
    expect(h.root.textContent).toContain('Keep the movement small and supported.');
  });
});
