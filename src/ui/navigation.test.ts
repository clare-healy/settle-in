// @vitest-environment happy-dom
//
// Live-run navigation through the real controller + store (F1/F2/F3/F9, DOM-level).

import { describe, it, expect } from 'vitest';
import { bootApp, beginRun, zone, byId, maybeId, type Harness } from './test-support.js';

function currentSegment(h: Harness): { type: string; text: string } {
  const live = byId(h.root, 'wall-clock').closest('.live') as HTMLElement;
  return {
    type: live.getAttribute('data-segment-type') ?? '',
    text: live.textContent ?? '',
  };
}

describe('live navigation', () => {
  it('Begin enters Grounding, and Next advances exactly one segment (F1)', async () => {
    const h = await bootApp();
    await beginRun(h);
    expect(h.app.routeKind).toBe('run');
    expect(currentSegment(h).type).toBe('grounding');

    await zone(h.app, h.root, 'next');
    // Grounding → first pose (Supported Butterfly), one segment only.
    expect(currentSegment(h).text).toContain('Supported Butterfly');
    expect(currentSegment(h).type).toBe('pose');
  });

  it('Previous revisits the prior segment and preserves the earlier visit (F2)', async () => {
    const h = await bootApp();
    await beginRun(h);
    await zone(h.app, h.root, 'next'); // → butterfly
    await zone(h.app, h.root, 'prev'); // ← grounding (revisit)
    expect(currentSegment(h).type).toBe('grounding');

    // The earlier grounding visit is preserved: segment_back + a new entry appended.
    const events = (h.app as unknown as { controller: { eventLog(): { type: string }[] } }).controller.eventLog();
    expect(events.filter((e) => e.type === 'segment_back')).toHaveLength(1);
    expect(events.filter((e) => e.type === 'segment_entered').length).toBeGreaterThanOrEqual(3);
  });

  it('bilateral order is Right then Left; Next from Right does not skip Left (F3)', async () => {
    const h = await bootApp();
    await beginRun(h);
    // grounding → butterfly → transition → sleeping-swan Right
    await zone(h.app, h.root, 'next');
    await zone(h.app, h.root, 'next');
    await zone(h.app, h.root, 'next');
    expect(currentSegment(h).text).toContain('Sleeping Swan');
    expect(currentSegment(h).text).toContain('Right');

    await zone(h.app, h.root, 'next');
    // Next enters the SAME pose's Left side, not the following transition/pose.
    const after = currentSegment(h);
    expect(after.text).toContain('Sleeping Swan');
    expect(after.text).toContain('Left');
  });

  it('a second synthetic tap during a pending action does not double-advance (F9)', async () => {
    const h = await bootApp();
    await beginRun(h);
    // Two synchronous Next clicks before the first persistence settles.
    const nextZone = () => h.root.querySelector<HTMLButtonElement>('[data-zone="next"]')!;
    nextZone().click();
    nextZone().click();
    await h.app.idle();

    // Exactly one advance: grounding → butterfly (index 1), not index 2.
    expect(currentSegment(h).text).toContain('Supported Butterfly');
    const controller = (h.app as unknown as { controller: { eventLog(): { type: string }[] } }).controller;
    const entered = controller.eventLog().filter((e) => e.type === 'segment_entered');
    // run_started's initial grounding entry + exactly one manual advance = 2.
    expect(entered).toHaveLength(2);
  });

  it('the wake callout is absent well before 7:58 on a live pose', async () => {
    const h = await bootApp();
    await beginRun(h);
    expect(maybeId(h.root, 'wake-callout')).toBeNull();
  });
});
