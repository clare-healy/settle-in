// Whole-library backup round trip (I5) and filename shaping.
//
// Exercises the real store read (exportLibrary) → JSON serialize → parse+validate
// → restore-merge into a cleared store → deep-equal. A merge into an empty library
// must reproduce classes, revisions, runs, events, and notes without duplication.

import { describe, it, expect } from 'vitest';
import { RunController } from '../run/index.js';
import { classFromSource, freshStore, makeEnv, revisionOf, jul28 } from '../store/test-support.js';
import { MINIMAL_VALID } from '../parser/test-helpers.js';
import { buildBackup, serializeBackup, backupFilename, backupFilenameFor } from './backup.js';
import { parseBackupText, validateBackup } from './restore.js';
import { APP_VERSION } from '../version.js';
import type { Store } from '../store/index.js';

/** Seed one class, teach one full run with a note, and set a preference. */
async function seedLibrary(store: Store): Promise<void> {
  const def = await classFromSource(MINIMAL_VALID);
  await store.putClassRevision(revisionOf(def));
  const { clock, env } = makeEnv({ wallEpochMs: jul28(19, 0) });
  const begun = await RunController.begin(store, env, def, { runId: 'run-1' });
  const c = begun.ok ? begun.controller : null;
  if (!c) throw new Error('begin failed');
  clock.advance(600_000); await c.nextSegment();
  clock.advance(2_040_000); await c.nextSegment();
  clock.advance(60_000); await c.nextSegment();
  clock.advance(900_000); await c.finish();
  await c.finalizeNotes('A calm room.');
  await store.setPreference('pref.nextPosePreview', false);
}

describe('backup filename', () => {
  it('is settle-in-backup-YYYY-MM-DD.json', () => {
    expect(backupFilename('2026-07-28')).toBe('settle-in-backup-2026-07-28.json');
    expect(backupFilenameFor(jul28(19, 0), -300)).toBe('settle-in-backup-2026-07-28.json');
  });
});

describe('whole-library round trip (I5)', () => {
  it('export → clear → restore-merge reproduces the library without duplication', async () => {
    const source = await freshStore();
    await seedLibrary(source);
    const snapshot = await source.exportLibrary();

    // Serialize and re-read exactly as a file would.
    const text = serializeBackup(buildBackup(snapshot, '2026-07-28T21:00:00-05:00', APP_VERSION));
    const parsed = parseBackupText(text);
    expect(parsed.ok).toBe(true);
    const validation = validateBackup(parsed.ok ? parsed.value : null);
    expect(validation.ok).toBe(true);
    if (!validation.ok) throw new Error(validation.reason);

    // Restore into a cleared (fresh) profile.
    const target = await freshStore();
    await target.restore(validation.payload, 'merge');
    const restored = await target.exportLibrary();

    expect(restored).toEqual(snapshot);
    source.close();
    target.close();
  });

  it('a second merge of the same backup adds nothing (idempotent union)', async () => {
    const source = await freshStore();
    await seedLibrary(source);
    const snapshot = await source.exportLibrary();

    const target = await freshStore();
    await target.restore(snapshot, 'merge');
    await target.restore(snapshot, 'merge'); // again
    const restored = await target.exportLibrary();

    expect(restored.revisions).toHaveLength(snapshot.revisions.length);
    expect(restored.runs).toHaveLength(snapshot.runs.length);
    expect(restored.events).toHaveLength(snapshot.events.length);
    expect(restored.notes).toHaveLength(snapshot.notes.length);
    source.close();
    target.close();
  });
});
