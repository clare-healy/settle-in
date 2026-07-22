// @vitest-environment happy-dom
//
// Pose minimal screen: the §6 hierarchy, drift matching the model, and the
// revisited display (F8, DOM-level).

import { describe, it, expect } from 'vitest';
import { bootApp, beginRun, zone, byId, jul28, type Harness } from './test-support.js';

async function toButterflyAt(h: Harness, wallEpochMs: number): Promise<void> {
  await beginRun(h); // grounding entered at 7:00
  h.clock.advance(wallEpochMs - h.clock.now().getTime());
  await zone(h.app, h.root, 'next'); // grounding → Supported Butterfly, entered now
}

describe('Pose minimal — §6 hierarchy', () => {
  it('shows pose name+side, wall clock, planned window+elapsed, drift, midpoint, next preview, three zones', async () => {
    const h = await bootApp({ wallEpochMs: jul28(19, 0) });
    await toButterflyAt(h, jul28(19, 13)); // enter at 7:13

    const live = h.root.querySelector('.live') as HTMLElement;
    expect(live.getAttribute('data-segment-type')).toBe('pose');
    expect((h.root.querySelector('.pose-name') as HTMLElement).textContent).toContain('Supported Butterfly');

    // Large wall clock reads the current time (12-hour, no seconds).
    expect(byId(h.root, 'wall-clock').textContent).toBe('7:13');
    // Planned window, elapsed, drift, midpoint, next preview all present.
    expect(byId(h.root, 'elapsed').textContent).toBe('0:00');
    expect(byId(h.root, 'midpoint').textContent).toBeTruthy();
    expect(byId(h.root, 'next-preview').textContent).toContain('Sleeping Swan');

    // The three deliberate tap zones exist and are labelled.
    expect(h.root.querySelector('[data-zone="prev"]')).toBeTruthy();
    expect(h.root.querySelector('[data-zone="ref"]')).toBeTruthy();
    expect(h.root.querySelector('[data-zone="next"]')).toBeTruthy();
  });

  it('drift text matches the model: butterfly planned 7:10, entered 7:13 → +3 min', async () => {
    const h = await bootApp({ wallEpochMs: jul28(19, 0) });
    await toButterflyAt(h, jul28(19, 13));
    expect(byId(h.root, 'drift').textContent).toBe('+3 min');
  });

  it('an on-time entry reads `on plan`', async () => {
    const h = await bootApp({ wallEpochMs: jul28(19, 0) });
    await toButterflyAt(h, jul28(19, 10)); // exactly planned start
    expect(byId(h.root, 'drift').textContent).toBe('on plan');
  });

  it('a Previous-entered visit shows `revisited` in place of the drift value (F8)', async () => {
    const h = await bootApp({ wallEpochMs: jul28(19, 0) });
    await beginRun(h);
    await zone(h.app, h.root, 'next'); // → butterfly
    await zone(h.app, h.root, 'next'); // → transition
    await zone(h.app, h.root, 'prev'); // ← butterfly, via segment_back
    const drift = byId(h.root, 'drift');
    expect(drift.textContent).toBe('revisited');
    expect(drift.getAttribute('data-revisited')).toBe('true');
  });
});
