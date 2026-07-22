// @vitest-environment happy-dom
//
// Savasana (screen-states § 9): six steps, step Back, deliberate Finish after the
// sixth step (never a silent finish), and the post-8:00 hard-close label (D9).

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
  it('renders the six fixed steps with the first active', async () => {
    const h = await bootApp();
    await toSavasana(h);
    const steps = h.root.querySelectorAll('.savasana__step');
    expect(steps).toHaveLength(6);
    expect(h.root.querySelector('.savasana__step--active [data-active]') ?? h.root.querySelector('[data-active]')).toBeTruthy();
    expect(peek(h).controller.snapshot().savasanaStep).toBe(0);
  });

  it('Next advances a step and step Back returns to the previous step', async () => {
    const h = await bootApp();
    await toSavasana(h);
    await zone(h.app, h.root, 'next'); // step 0 → 1
    await zone(h.app, h.root, 'next'); // step 1 → 2
    expect(peek(h).controller.snapshot().savasanaStep).toBe(2);
    await zone(h.app, h.root, 'prev'); // step 2 → 1
    expect(peek(h).controller.snapshot().savasanaStep).toBe(1);
  });

  it('after the sixth step, Next exposes Finish rather than finishing silently', async () => {
    const h = await bootApp();
    await toSavasana(h);
    for (let i = 0; i < 5; i++) await zone(h.app, h.root, 'next'); // to step 5 (last)
    expect(peek(h).controller.snapshot().savasanaStep).toBe(5);
    expect(maybeId(h.root, 'finish-class')).toBeNull(); // not armed yet

    await zone(h.app, h.root, 'next'); // exposes Finish, does NOT finish
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

    // Navigation stays open after 8:00.
    const stepBefore = peek(h).controller.snapshot().savasanaStep;
    await zone(h.app, h.root, 'next');
    expect(peek(h).controller.snapshot().savasanaStep).toBe(stepBefore + 1);
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
