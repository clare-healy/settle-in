// @vitest-environment happy-dom
//
// Two-minute wake message (screen-states § 8). It is gated on BOTH the clock and
// the segment: eligible at hard close − 2 min, displayed only while the current
// segment is Savasana (Q5a). Covers the authored text verbatim (E7), one fade the
// first time it appears, no callout or persisted event outside Savasana (E3), the
// post-hard-close rehearsal path (E8), and — from the durable `wake_message_shown`
// latch — no replayed fade on recovery (E6).

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

/** Does the durable event log carry `wake_message_shown` yet? */
async function shownEventPersisted(h: Harness): Promise<boolean> {
  const runs = await h.store.getAllRuns();
  const run = runs[0];
  if (!run) return false;
  const events = await h.store.getEvents(run.runId);
  return events.some((e) => e.type === 'wake_message_shown');
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

  it('E3: at 7:58 on a POSE there is no callout and no persisted event', async () => {
    const h = await bootApp({ wallEpochMs: jul28(19, 0) });
    await beginRun(h);
    await advanceSegments(h, 1); // Supported Butterfly — a pose, not Savasana

    h.clock.advance(jul28(19, 58) - h.clock.now().getTime());
    h.app.tick();
    await h.app.idle();

    expect(h.root.querySelector('.live')?.getAttribute('data-segment-type')).toBe('pose');
    expect(maybeId(h.root, 'wake-callout')).toBeNull();
    expect(await shownEventPersisted(h)).toBe(false);
  });

  it('E3: advancing into Savasana after 7:58 then shows it once, and only then writes the event', async () => {
    const h = await bootApp({ wallEpochMs: jul28(19, 0) });
    await beginRun(h);
    await advanceSegments(h, 1);
    h.clock.advance(jul28(19, 58) - h.clock.now().getTime());
    h.app.tick();
    await h.app.idle();
    expect(await shownEventPersisted(h)).toBe(false);

    await advanceSegments(h, 13); // on to Savasana
    await h.app.idle();

    expect(h.root.querySelector('.live')?.getAttribute('data-segment-type')).toBe('savasana');
    const callout = byId(h.root, 'wake-callout');
    expect(callout.textContent).toBeTruthy();
    expect(callout.className).toContain('wake-callout--fade');
    expect(await shownEventPersisted(h)).toBe(true);

    // Exactly one appearance: no second write on a later render.
    await zone(h.app, h.root, 'next');
    await h.app.idle();
    const runs = await h.store.getAllRuns();
    const events = await h.store.getEvents(runs[0]!.runId);
    expect(events.filter((e) => e.type === 'wake_message_shown')).toHaveLength(1);
  });

  it('E8: a run begun AFTER the hard close shows nothing until Savasana, then once', async () => {
    const h = await bootApp({ wallEpochMs: jul28(20, 15) });
    await beginRun(h);

    // Grounding, well past 8:00: nothing on screen, nothing written…
    expect(maybeId(h.root, 'wake-callout')).toBeNull();
    expect(await shownEventPersisted(h)).toBe(false);

    // …and nothing on the poses and transitions in between.
    for (let i = 0; i < 13; i++) {
      await zone(h.app, h.root, 'next');
      expect(maybeId(h.root, 'wake-callout')).toBeNull();
    }
    expect(await shownEventPersisted(h)).toBe(false);

    // Entering Savasana shows it immediately, once.
    await zone(h.app, h.root, 'next');
    await h.app.idle();
    expect(h.root.querySelector('.live')?.getAttribute('data-segment-type')).toBe('savasana');
    expect(byId(h.root, 'wake-callout').textContent).toBeTruthy();
    const runs = await h.store.getAllRuns();
    const events = await h.store.getEvents(runs[0]!.runId);
    expect(events.filter((e) => e.type === 'wake_message_shown')).toHaveLength(1);

    // The hard-close indicator is unchanged throughout: present from the start.
    expect(byId(h.root, 'savasana-close').textContent).toContain('hard close');
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
