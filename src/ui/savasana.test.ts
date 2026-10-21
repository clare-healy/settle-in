// @vitest-environment happy-dom
//
// Savasana (screen-states § 9): six static cue reminders, direct Back, deliberate
// Finish reveal (never a silent finish), and the post-hard-close label (D9).

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

interface CtrlPeek {
  controller: {
    snapshot(): { currentSegment: { type: string } | null; savasanaStep: number };
    eventLog(): { type: string }[];
  };
}
function peek(h: Harness): CtrlPeek {
  return h.app as unknown as CtrlPeek;
}

async function toSavasana(h: Harness): Promise<void> {
  await beginRun(h);
  await advanceSegments(h, 14); // grounding(0) … savasana(14)
  expect(peek(h).controller.snapshot().currentSegment?.type).toBe('savasana');
}

describe('Savasana', () => {
  it('renders all six authored cues together as a non-interactive reminder list', async () => {
    const h = await bootApp();
    await toSavasana(h);
    const steps = h.root.querySelectorAll('.savasana__prompt');
    expect(steps).toHaveLength(6);
    expect(h.root.querySelector('[data-active]')).toBeNull();
    expect(peek(h).controller.snapshot().savasanaStep).toBe(0);
  });

  it('Previous returns directly to the prior runtime segment without cue-step navigation', async () => {
    const h = await bootApp();
    await toSavasana(h);
    await zone(h.app, h.root, 'prev');
    expect(peek(h).controller.snapshot().currentSegment?.type).toBe('transition');
  });

  it('one Next exposes Finish rather than finishing silently', async () => {
    const h = await bootApp();
    await toSavasana(h);
    expect(maybeId(h.root, 'finish-class')).toBeNull();

    await zone(h.app, h.root, 'next');
    expect(maybeId(h.root, 'finish-class')).not.toBeNull();
    // No run_finished appended by a mere Next — finishing is deliberate.
    expect(peek(h).controller.eventLog().some((e) => e.type === 'run_finished')).toBe(false);

    // Finish requires the deliberate two-step confirmation (F6).
    await tapFinish(h);
    expect(h.app.dialogKind).toBe('finish-confirm');
    await confirmFinish(h);
    expect(h.app.routeKind).toBe('post-class');
    expect(peek(h).controller?.eventLog?.() ?? []).toBeTruthy();
  });

  it('at 8:00 the label reads `8:00 · hard close`, never negative, and Next still works (D9)', async () => {
    const h = await bootApp({ wallEpochMs: jul28(19, 0) });
    await toSavasana(h);

    // Before 8:00: a positive time-to-close, never negative.
    h.clock.advance(jul28(19, 59) - h.clock.now().getTime());
    h.app.render();
    expect(byId(h.root, 'savasana-close').textContent).toContain('to hard close');
    expect(byId(h.root, 'savasana-close').textContent).not.toContain('-');

    // At 8:00 the countdown language is replaced; nothing locks.
    h.clock.advance(jul28(20, 0) - h.clock.now().getTime());
    h.app.render();
    const label = byId(h.root, 'savasana-close').textContent ?? '';
    expect(label).toContain('8:00');
    expect(label).toContain('hard close');

    // Rendering in Savasana past the wake-eligibility time issues the durable
    // `wake_message_shown` write (Q5a: persisted immediately before the first
    // Savasana render). Settle it before tapping, or the single-flight guard would
    // reject the tap as `busy` — the F9 behavior, not a navigation failure.
    await h.app.idle();

    // Finish remains reachable after the hard close.
    await zone(h.app, h.root, 'next');
    expect(maybeId(h.root, 'finish-class')).not.toBeNull();
  });
});

async function tapFinish(h: Harness): Promise<void> {
  byId(h.root, 'finish-class').click();
  await h.app.idle();
}
async function confirmFinish(h: Harness): Promise<void> {
  byId(h.root, 'confirm-finish').click();
  await h.app.idle();
}
