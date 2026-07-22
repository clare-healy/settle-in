// @vitest-environment happy-dom
//
// Library list + detail rendering, the upcoming-class chooser (deferred M4a Q3),
// the §14 storage-warning surface, and the backup export / restore-merge round trip
// and I6 replace confirmation driven through the real controller. File-picker flows
// are entered via the test action seam (a native picker can't be synthesized here).

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { bootApp, byId, maybeId, tap, jul28, type Harness } from './test-support.js';
import { classFromSource, revisionOf } from '../store/test-support.js';
import { readFixture } from '../parser/test-helpers.js';
import { buildBackup, serializeBackup } from '../export/index.js';

/** Seed a second, later-dated class so the upcoming choice is ambiguous. */
async function seedSecondClass(h: Harness): Promise<void> {
  const def = await classFromSource(readFixture('valid-boundary-content.md')); // 2026-08-25
  await h.store.putClassRevision(revisionOf(def, '2026-07-10T10:00:00-05:00'));
}

async function openLibrary(h: Harness): Promise<void> {
  h.app.actionsForTest.openLibrary();
  await h.app.idle();
}

describe('Library list (screen-states § 13)', () => {
  it('lists classes with theme, peak, planned duration, and run count', async () => {
    const h = await bootApp({ seed: true, wallEpochMs: jul28(19, 0) }); // desire-paths seeded
    await openLibrary(h);
    const list = byId(h.root, 'library-list');
    const row = byId(h.root, 'class-desire-paths-2026-07-28');
    expect(row.textContent).toContain('Desire Paths');
    expect(row.textContent).toContain('Supported Caterpillar'); // peak
    expect(row.textContent).toContain('60 min'); // planned
    expect(row.textContent).toContain('0 taught runs');
    expect(list.querySelectorAll('.library__row')).toHaveLength(1);
  });

  it('marks the upcoming class and lets Clare choose when ambiguous', async () => {
    const h = await bootApp({ seed: true, wallEpochMs: jul28(19, 0) });
    await seedSecondClass(h);
    await openLibrary(h);

    // Two future classes → the earliest (desire-paths, 07-28) is upcoming and a
    // Set-as-upcoming control is offered on the other (boundary, 08-25).
    expect(maybeId(h.root, 'upcoming-desire-paths-2026-07-28')).not.toBeNull();
    await tap(h.app, h.root, 'set-upcoming-valid-boundary-content');
    // The marker moved.
    expect(maybeId(h.root, 'upcoming-valid-boundary-content')).not.toBeNull();
    expect(maybeId(h.root, 'upcoming-desire-paths-2026-07-28')).toBeNull();
  });
});

describe('Class detail (screen-states § 13)', () => {
  it('shows the immutable plan, revision identity, and export handles', async () => {
    const h = await bootApp({ seed: true, wallEpochMs: jul28(19, 0) });
    await openLibrary(h);
    await tap(h.app, h.root, 'class-desire-paths-2026-07-28');
    expect(h.app.routeKind).toBe('class-detail');

    // Plan rows are present and read-only (no editable inputs on the plan).
    expect(byId(h.root, 'detail-plan').querySelectorAll('.prep__sequence-row').length).toBeGreaterThan(5);
    // Revision identity + original-markdown export handle.
    const revs = await h.store.getClassRevisionsByClassId('desire-paths-2026-07-28');
    expect(maybeId(h.root, `export-original-${revs[0]!.sourceHash}`)).not.toBeNull();
    // No taught runs yet.
    expect(maybeId(h.root, 'detail-no-runs')).not.toBeNull();

    // Run this class again → Prep for this class.
    await tap(h.app, h.root, 'run-again');
    expect(h.app.routeKind).toBe('prep');
  });
});

describe('Storage warning (§ 14)', () => {
  const original = (globalThis as { navigator?: unknown }).navigator;
  beforeEach(() => {
    Object.defineProperty(globalThis.navigator, 'storage', {
      configurable: true,
      value: { persisted: async () => false, persist: async () => true },
    });
  });
  afterEach(() => {
    void original;
    // @ts-expect-error cleanup of the injected property
    delete globalThis.navigator.storage;
  });

  it('surfaces the exact library-only warning when storage is not persisted', async () => {
    const h = await bootApp({ seed: true, wallEpochMs: jul28(19, 0) });
    await openLibrary(h);
    expect(byId(h.root, 'storage-warning').textContent).toBe(
      'This device may clear local data. Export a backup after class.',
    );
  });
});

describe('Backup restore through the controller (I5/I6)', () => {
  it('a valid backup shows a merge confirmation and merges', async () => {
    const h = await bootApp({ seed: true, wallEpochMs: jul28(19, 0) });
    const snapshot = await h.store.exportLibrary();
    const text = serializeBackup(buildBackup(snapshot, '2026-07-28T21:00:00-05:00', '0.1.0'));

    // Clear-ish: use a fresh app over an empty store, then restore the backup.
    const empty = await bootApp({ seed: false, wallEpochMs: jul28(19, 0) });
    empty.app.actionsForTest.restoreFileLoaded(text);
    await empty.app.idle();
    expect(empty.app.routeKind).toBe('library');
    expect(byId(empty.root, 'restore-confirm').textContent).toContain('1 class');

    byId(empty.root, 'restore-merge').click();
    await empty.app.idle();
    expect((await empty.store.getAllClassRevisions()).length).toBe(1);
  });

  it('a corrupt backup shows a plain error, no write', async () => {
    const h = await bootApp({ seed: false, wallEpochMs: jul28(19, 0) });
    h.app.actionsForTest.restoreFileLoaded('{ not json');
    await h.app.idle();
    expect(byId(h.root, 'restore-error').textContent?.length).toBeGreaterThan(0);
    expect((await h.store.getAllClassRevisions()).length).toBe(0);
  });

  it('Replace requires the explicit destructive confirmation (I6)', async () => {
    const source = await bootApp({ seed: true, wallEpochMs: jul28(19, 0) });
    const snapshot = await source.store.exportLibrary();
    const text = serializeBackup(buildBackup(snapshot, '2026-07-28T21:00:00-05:00', '0.1.0'));

    const local = await bootApp({ seed: true, wallEpochMs: jul28(19, 0) });
    local.app.actionsForTest.restoreFileLoaded(text);
    await local.app.idle();

    // Replace does not apply until the second confirmation.
    local.app.actionsForTest.requestRestoreReplace();
    await local.app.idle();
    expect(local.app.dialogKind).toBe('restore-replace-confirm');
    byId(local.root, 'confirm-restore-replace').click();
    await local.app.idle();
    expect(local.app.dialogKind).toBeNull();
    expect((await local.store.getAllClassRevisions()).length).toBe(1);
  });
});
