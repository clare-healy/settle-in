// @vitest-environment happy-dom
//
// Post-Class Reflection (screen-states § 12; acceptance I1). One multiline
// reflection box and nothing to curate: no per-segment rows, no manual status
// controls. The draft persists on every `input` event — not merely `change` — so a
// Gboard dictation survives backgrounding, a lock, or process death mid-sentence.

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

/** The persisted draft for the run, straight from the store. */
async function storedDraft(h: Harness): Promise<string | null> {
  const runs = await h.store.getAllRuns();
  const run = runs[0];
  if (!run) return null;
  const notes = await h.store.getNotes(run.runId);
  return notes ? notes.draft : null;
}

describe('Post-Class Reflection', () => {
  it('renders exactly one reflection textarea and nothing to curate (I1)', async () => {
    const def = await loadValidClass();
    const h = await bootApp({ wallEpochMs: jul28(19, 0) });
    await finishToPostClass(h);

    const textareas = h.root.querySelectorAll('textarea');
    expect(textareas).toHaveLength(1);
    expect(textareas[0]!.getAttribute('data-testid')).toBe('room-note');

    // The class identity and the ACTUAL start/finish times are shown.
    const meta = byId(h.root, 'post-meta').textContent ?? '';
    expect(h.root.querySelector('h1')!.textContent).toBe(def.title);
    expect(meta).toContain(def.date);
    expect(meta).toContain('7:00'); // the run began at 7:00 PM

    // No per-segment rows, no status text, no manual controls of any kind.
    expect(h.root.querySelectorAll('.post__row')).toHaveLength(0);
    expect(maybeId(h.root, 'actual-grounding')).toBeNull();
    expect(maybeId(h.root, 'status-grounding')).toBeNull();
    expect(maybeId(h.root, 'skip-grounding')).toBeNull();
    expect(maybeId(h.root, 'substitute-supported-butterfly')).toBeNull();
    expect(h.root.querySelector('select')).toBeNull();
    expect(h.root.querySelector('input')).toBeNull();

    // Only the two completing actions.
    expect(byId(h.root, 'save-notes').textContent).toBe('Save and complete');
    expect(byId(h.root, 'skip-notes').textContent).toBe('Skip and complete');
  });

  it('persists the draft on every input event, not only on change (I1)', async () => {
    const h = await bootApp({ wallEpochMs: jul28(19, 0) });
    await finishToPostClass(h);
    const field = byId<HTMLTextAreaElement>(h.root, 'room-note');

    // A dictation arriving phrase by phrase — no blur, no change event anywhere.
    field.value = 'Warm room.';
    field.dispatchEvent(new Event('input'));
    await h.app.idle();
    expect(await storedDraft(h)).toBe('Warm room.');

    field.value = 'Warm room. Caterpillar ran long.';
    field.dispatchEvent(new Event('input'));
    await h.app.idle();
    expect(await storedDraft(h)).toBe('Warm room. Caterpillar ran long.');
  });

  it('an interrupted dictation is recovered intact into the box', async () => {
    const h = await bootApp({ wallEpochMs: jul28(19, 0) });
    await finishToPostClass(h);
    const field = byId<HTMLTextAreaElement>(h.root, 'room-note');
    field.value = 'Half a sentence about the';
    field.dispatchEvent(new Event('input'));
    await h.app.idle();

    // Re-render the screen (as backgrounding and returning would).
    h.app.render();
    expect(byId<HTMLTextAreaElement>(h.root, 'room-note').value).toBe('Half a sentence about the');
  });

  it('imposes no character limit and does not intercept keystrokes', async () => {
    const h = await bootApp({ wallEpochMs: jul28(19, 0) });
    await finishToPostClass(h);
    const field = byId<HTMLTextAreaElement>(h.root, 'room-note');
    expect(field.getAttribute('maxlength')).toBeNull();
    const long = 'a'.repeat(4000);
    field.value = long;
    field.dispatchEvent(new Event('input'));
    await h.app.idle();
    expect(await storedDraft(h)).toBe(long);
  });

  it('completes with a saved reflection (Save) and completes with none (Skip)', async () => {
    const h1 = await bootApp({ wallEpochMs: jul28(19, 0) });
    await finishToPostClass(h1);
    const note = byId<HTMLTextAreaElement>(h1.root, 'room-note');
    note.value = 'Warm room; caterpillar ran long.';
    note.dispatchEvent(new Event('input'));
    await h1.app.idle();
    byId(h1.root, 'save-notes').click();
    await h1.app.idle();
    expect(h1.app.routeKind === 'home' || h1.app.routeKind === 'empty').toBe(true);
    const runs1 = await h1.store.getAllRuns();
    expect((await h1.store.getNotes(runs1[0]!.runId))?.final).toBe('Warm room; caterpillar ran long.');

    const h2 = await bootApp({ wallEpochMs: jul28(19, 0) });
    await finishToPostClass(h2);
    byId(h2.root, 'skip-notes').click();
    await h2.app.idle();
    expect(h2.app.routeKind === 'home' || h2.app.routeKind === 'empty').toBe(true);
  });

  it('never mutates the immutable class definition (H5)', async () => {
    const def = await loadValidClass();
    const h = await bootApp({ wallEpochMs: jul28(19, 0) });
    const before = (await h.store.getClassRevision(def.sourceHash))!.definition.originalMarkdown;

    await finishToPostClass(h);
    const field = byId<HTMLTextAreaElement>(h.root, 'room-note');
    field.value = 'Swapped the saddle for a reclined figure four.';
    field.dispatchEvent(new Event('input'));
    await h.app.idle();
    byId(h.root, 'save-notes').click();
    await h.app.idle();

    const after = (await h.store.getClassRevision(def.sourceHash))!.definition.originalMarkdown;
    expect(after).toBe(before);
  });
});
