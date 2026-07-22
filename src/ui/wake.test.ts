// @vitest-environment happy-dom
//
// Two-minute wake message (screen-states § 8): authored text verbatim (E7), one
// fade the first time it appears, and — from the durable `wake_message_shown`
// latch — no replayed fade on recovery (E6). Essential info is never obscured.

import { describe, it, expect } from 'vitest';
import {
  bootApp,
  beginRun,
  advanceSegments,
  zone,
  byId,
  maybeId,
  jul28,
  type Harness,
} from './test-support.js';
import { loadValidClass } from '../store/test-support.js';

async function toSavasana(h: Harness): Promise<void> {
  await beginRun(h);
  await advanceSegments(h, 14);
}

describe('two-minute wake message', () => {
  it('shows the authored wake_message verbatim and fades once (E7)', async () => {
    const def = await loadValidClass();
    const authored = def.authoredSegments.find((s) => s.type === 'savasana');
    const wakeText = authored && authored.type === 'savasana' ? authored.wakeMessage : '';

    const h = await bootApp({ wallEpochMs: jul28(19, 0) });
    await toSavasana(h);
    expect(maybeId(h.root, 'wake-callout')).toBeNull(); // before 7:58

    // Cross 7:58: the callout appears with the one-shot fade class.
    h.clock.advance(jul28(19, 58) - h.clock.now().getTime());
    h.app.tick();

    const callout = byId(h.root, 'wake-callout');
    expect(callout.textContent).toBe(wakeText); // verbatim, character-for-character
    expect(callout.className).toContain('wake-callout--fade');

    // Essential info is not obscured: clock, steps, and zones remain present.
    expect(maybeId(h.root, 'savasana-close')).not.toBeNull();
    expect(h.root.querySelectorAll('.savasana__step')).toHaveLength(6);
    expect(h.root.querySelector('[data-zone="next"]')).toBeTruthy();
  });

  it('does not re-animate on a later structural render (fade plays once)', async () => {
    const h = await bootApp({ wallEpochMs: jul28(19, 0) });
    await toSavasana(h);
    h.clock.advance(jul28(19, 58) - h.clock.now().getTime());
    h.app.tick();
    expect(byId(h.root, 'wake-callout').className).toContain('wake-callout--fade');

    // A subsequent structural render (step advance) keeps the message but no fade.
    await zone(h.app, h.root, 'next');
    const callout = byId(h.root, 'wake-callout');
    expect(callout.textContent).toBeTruthy();
    expect(callout.className).not.toContain('wake-callout--fade');
  });

  it('recovers after 7:58 with the message present and no replayed fade (E6)', async () => {
    // First execution: reach savasana, cross 7:58, persist wake_message_shown.
    const first = await bootApp({ wallEpochMs: jul28(19, 0), executionId: 'exec-A' });
    await toSavasana(first);
    first.clock.advance(jul28(19, 58) - first.clock.now().getTime());
    first.app.tick();
    await first.app.idle(); // let markWakeShown persist
    expect(byId(first.root, 'wake-callout').className).toContain('wake-callout--fade');

    // Reload: a fresh execution over the SAME durable store, still after 7:58.
    const second = await bootApp({
      store: first.store,
      wallEpochMs: jul28(19, 59),
      executionId: 'exec-B',
    });
    // Active run recovers; resume into savasana.
    expect(second.app.routeKind).toBe('recovery');
    byId(second.root, 'resume').click();
    await second.app.idle();

    const callout = byId(second.root, 'wake-callout');
    expect(callout.textContent).toBeTruthy();
    // The durable latch means the message is simply present — no replayed fade.
    expect(callout.className).not.toContain('wake-callout--fade');
  });
});
