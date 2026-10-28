// @vitest-environment happy-dom

import { describe, expect, it } from 'vitest';
import { localEpoch } from '../model/test-support.js';
import { Store } from '../store/index.js';
import { loadValidClass, newDbName, revisionOf } from '../store/test-support.js';
import { latestRevision } from './library-model.js';
import { bootApp, byId, CDT_OFFSET_MIN, tap, type Harness } from './test-support.js';

describe('Prep schedule correction', () => {
  it('uses one screen to calculate the close, persists a new revision, and begins from it', async () => {
    const beginAt = localEpoch(2026, 7, 28, 18, 33, 0, CDT_OFFSET_MIN);
    const store = await Store.open({ name: newDbName() });
    const seeded = await loadValidClass();
    await store.putClassRevision(revisionOf(seeded, '2026-07-28T18:00:00-05:00'));
    const h = await bootApp({ store, wallEpochMs: beginAt });
    const [original] = await h.store.getAllClassRevisions();
    expect(original).toBeDefined();

    await tap(h.app, h.root, 'open-prep');
    expect(byId(h.root, 'prep-schedule').textContent).toBe('Scheduled class · 7:00–8:00');
    await tap(h.app, h.root, 'change-schedule');

    expect(h.app.dialogKind).toBe('schedule-change');
    const input = byId<HTMLInputElement>(h.root, 'schedule-start');
    const change = byId<HTMLButtonElement>(h.root, 'confirm-schedule-change');
    expect(input.value).toBe('19:00');
    expect(byId(h.root, 'schedule-close').textContent).toBe('8:00');

    input.value = '18:30';
    input.dispatchEvent(new Event('input'));
    expect(byId(h.root, 'schedule-close').textContent).toBe('7:30');
    expect(change.disabled).toBe(false);

    await tap(h.app, h.root, 'confirm-schedule-change');
    expect(h.app.dialogKind).toBeNull();
    expect(byId(h.root, 'prep-schedule').textContent).toBe('Scheduled class · 6:30–7:30');
    expect(h.root.querySelector('.prep__sequence-window')?.textContent).toBe('6:30–6:40');

    const revisions = await h.store.getClassRevisionsByClassId(original!.classId);
    expect(revisions).toHaveLength(2);
    expect(original!.definition.originalMarkdown).toContain('scheduled_start_local: "19:00"');
    const corrected = revisions.find((revision) => revision.sourceHash !== original!.sourceHash);
    expect(corrected?.definition.scheduledStartLocal).toBe('18:30');
    expect(corrected?.definition.hardCloseLocal).toBe('19:30');
    expect(corrected?.definition.originalMarkdown).toContain('scheduled_start_local: "18:30"');
    expect(latestRevision(revisions)?.sourceHash).toBe(corrected?.sourceHash);

    await tap(h.app, h.root, 'begin-class');
    expect(h.root.querySelector('.planned-window')?.textContent).toBe('6:30–6:40');
    expect(byId(h.root, 'drift').textContent).toBe('+3 min');

    const runs = await h.store.getAllRuns();
    expect(runs).toHaveLength(1);
    expect(runs[0]?.revisionSourceHash).toBe(corrected?.sourceHash);
    expect(runs[0]?.hardCloseAt).toBe('2026-07-28T19:30:00-05:00');
  });

  it('keeps the time Clare chose after a correction is undone and Prep is reopened', async () => {
    const at = localEpoch(2026, 7, 28, 18, 33, 0, CDT_OFFSET_MIN);
    const store = await Store.open({ name: newDbName() });
    await store.putClassRevision(revisionOf(await loadValidClass(), '2026-07-28T18:00:00-05:00'));
    const h = await bootApp({ store, wallEpochMs: at });
    await tap(h.app, h.root, 'open-prep');

    // A mistaken correction to 6:30, then back to the authored 7:00. The second
    // change resolves to the original, already stored revision.
    await changeStart(h, '18:30');
    await changeStart(h, '19:00');
    expect(byId(h.root, 'prep-schedule').textContent).toBe('Scheduled class · 7:00–8:00');
    expect(await h.store.getAllClassRevisions()).toHaveLength(2);

    // Relaunch on the same store: Prep must still show 7:00, and Begin must use it.
    const relaunched = await bootApp({ store, wallEpochMs: at + 60_000 });
    await tap(relaunched.app, relaunched.root, 'open-prep');
    expect(byId(relaunched.root, 'prep-schedule').textContent).toBe('Scheduled class · 7:00–8:00');
    await tap(relaunched.app, relaunched.root, 'begin-class');
    const runs = await store.getAllRuns();
    expect(runs[0]?.hardCloseAt).toBe('2026-07-28T20:00:00-05:00');
  });
});

async function changeStart(h: Harness, scheduledStartLocal: string): Promise<void> {
  await tap(h.app, h.root, 'change-schedule');
  const input = byId<HTMLInputElement>(h.root, 'schedule-start');
  input.value = scheduledStartLocal;
  input.dispatchEvent(new Event('input'));
  await tap(h.app, h.root, 'confirm-schedule-change');
}
