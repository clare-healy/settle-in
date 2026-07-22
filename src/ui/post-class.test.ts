// @vitest-environment happy-dom
//
// Post-Class Notes (screen-states § 12): rows derived from the event log (I1), and
// Skipped/Substituted corrections that update the run record but never the
// immutable class definition (H5 guard).

import { describe, it, expect } from 'vitest';
import {
  bootApp,
  beginRun,
  advanceSegments,
  zone,
  byId,
  jul28,
  type Harness,
} from './test-support.js';
import { loadValidClass } from '../store/test-support.js';

async function finishToPostClass(h: Harness): Promise<void> {
  await beginRun(h);
  await advanceSegments(h, 14); // to savasana
  for (let i = 0; i < 5; i++) await zone(h.app, h.root, 'next'); // to last step
  await zone(h.app, h.root, 'next'); // arm Finish
  byId(h.root, 'finish-class').click();
  await h.app.idle();
  byId(h.root, 'confirm-finish').click();
  await h.app.idle();
  expect(h.app.routeKind).toBe('post-class');
}

describe('Post-Class Notes', () => {
  it('derives plan-vs-actual rows from events, without asking Clare to classify (I1)', async () => {
    const h = await bootApp({ wallEpochMs: jul28(19, 0) });
    await finishToPostClass(h);

    // A derived row for grounding with its planned 10:00 and a derived status.
    const row = byId(h.root, 'actual-grounding');
    expect(row.textContent).toContain('10:00'); // planned duration, derived
    const status = byId(h.root, 'status-grounding');
    expect(status.textContent).toBeTruthy(); // derived status text, not a manual picker
    // No long/short input control exists — status is text, derived from timing.
    expect(h.root.querySelector('select')).toBeNull();
  });

  it('a Skipped correction updates the run record but never the class definition (H5)', async () => {
    const def = await loadValidClass();
    const h = await bootApp({ wallEpochMs: jul28(19, 0) });
    // Capture the immutable class markdown before any correction.
    const before = (await h.store.getClassRevision(def.sourceHash))!.definition.originalMarkdown;

    await finishToPostClass(h);
    byId(h.root, 'skip-grounding').click();
    await h.app.idle();

    // Run record reflects the correction…
    expect(byId(h.root, 'status-grounding').textContent).toBe('skipped');
    // …but the authored class definition is byte-for-byte unchanged.
    const after = (await h.store.getClassRevision(def.sourceHash))!.definition.originalMarkdown;
    expect(after).toBe(before);
  });

  it('a Substituted correction records a short name against the run only (H5)', async () => {
    const def = await loadValidClass();
    const h = await bootApp({ wallEpochMs: jul28(19, 0) });
    await finishToPostClass(h);

    const input = h.root.querySelector<HTMLInputElement>('[data-testid="actual-supported-butterfly"] input');
    expect(input).not.toBeNull();
    input!.value = 'Reclined Butterfly';
    byId(h.root, 'substitute-supported-butterfly').click();
    await h.app.idle();

    expect(byId(h.root, 'status-supported-butterfly').textContent).toContain('Reclined Butterfly');
    // Class definition still immutable.
    const stored = (await h.store.getClassRevision(def.sourceHash))!.definition;
    expect(stored.expandedRuntimeSegments.some((s) => s.name === 'Reclined Butterfly')).toBe(false);
  });

  it('completes with a saved note (Save) and completes with no note (Skip)', async () => {
    const h1 = await bootApp({ wallEpochMs: jul28(19, 0) });
    await finishToPostClass(h1);
    const note = byId<HTMLTextAreaElement>(h1.root, 'room-note');
    note.value = 'Warm room; caterpillar ran long.';
    note.dispatchEvent(new Event('change'));
    await h1.app.idle();
    byId(h1.root, 'save-notes').click();
    await h1.app.idle();
    expect(h1.app.routeKind === 'home' || h1.app.routeKind === 'empty').toBe(true);

    const h2 = await bootApp({ wallEpochMs: jul28(19, 0) });
    await finishToPostClass(h2);
    byId(h2.root, 'skip-notes').click();
    await h2.app.idle();
    expect(h2.app.routeKind === 'home' || h2.app.routeKind === 'empty').toBe(true);
  });
});
