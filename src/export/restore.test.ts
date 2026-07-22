// Restore validation (pure) + store restore atomicity, merge, and replace.
//
// Validation rejects corrupt/truncated JSON, a future backup version, identity
// collisions, and dangling runs/events BEFORE any write. The store apply is atomic:
// a mid-apply fault leaves the library byte-identical (fault injection). Merge skips
// existing identities (never overwrites); replace wipes then writes (I6 is enforced
// at the UI confirmation, exercised in the library UI test).

import { describe, it, expect } from 'vitest';
import { RunController } from '../run/index.js';
import { classFromSource, freshStore, makeEnv, revisionOf, jul28 } from '../store/test-support.js';
import { MINIMAL_VALID } from '../parser/test-helpers.js';
import { buildBackup, serializeBackup } from './backup.js';
import { parseBackupText, validateBackup } from './restore.js';
import { APP_VERSION } from '../version.js';
import type { Store, LibrarySnapshot } from '../store/index.js';

async function seededSnapshot(runId = 'run-1'): Promise<{ store: Store; snapshot: LibrarySnapshot }> {
  const store = await freshStore();
  const def = await classFromSource(MINIMAL_VALID);
  await store.putClassRevision(revisionOf(def));
  const { clock, env } = makeEnv({ wallEpochMs: jul28(19, 0) });
  const begun = await RunController.begin(store, env, def, { runId });
  const c = begun.ok ? begun.controller : null;
  if (!c) throw new Error('begin failed');
  clock.advance(600_000); await c.nextSegment();
  clock.advance(2_100_000); await c.finish();
  await c.finalizeNotes('note');
  return { store, snapshot: await store.exportLibrary() };
}

function backupText(snapshot: LibrarySnapshot): string {
  return serializeBackup(buildBackup(snapshot, '2026-07-28T21:00:00-05:00', APP_VERSION));
}

describe('restore validation — rejects before any write', () => {
  it('rejects corrupt JSON', () => {
    const parsed = parseBackupText('{ not valid json');
    expect(parsed.ok).toBe(false);
  });

  it('rejects a truncated file', () => {
    const parsed = parseBackupText('{"backup_schema_version":1,"payload":{"revisions":[');
    expect(parsed.ok).toBe(false);
  });

  it('rejects a future backup version intact with an update-required message', async () => {
    const { store, snapshot } = await seededSnapshot();
    const raw = { ...JSON.parse(backupText(snapshot)), backup_schema_version: 2 };
    const v = validateBackup(raw);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason.toLowerCase()).toContain('update');
    store.close();
  });

  it('rejects a class entry with an inconsistent identity', async () => {
    const { store, snapshot } = await seededSnapshot();
    const raw = JSON.parse(backupText(snapshot));
    raw.payload.revisions[0].sourceHash = 'tampered-hash';
    const v = validateBackup(raw);
    expect(v.ok).toBe(false);
    store.close();
  });

  it('rejects duplicate revision identities', async () => {
    const { store, snapshot } = await seededSnapshot();
    const raw = JSON.parse(backupText(snapshot));
    raw.payload.revisions.push(JSON.parse(JSON.stringify(raw.payload.revisions[0])));
    const v = validateBackup(raw);
    expect(v.ok).toBe(false);
    store.close();
  });

  it('rejects a dangling run (its class revision is missing)', async () => {
    const { store, snapshot } = await seededSnapshot();
    const raw = JSON.parse(backupText(snapshot));
    raw.payload.revisions = []; // remove the class the run points at
    const v = validateBackup(raw);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason.toLowerCase()).toContain('dangling');
    store.close();
  });

  it('rejects a dangling event (its run is missing)', async () => {
    const { store, snapshot } = await seededSnapshot();
    const raw = JSON.parse(backupText(snapshot));
    raw.payload.runs = [];
    const v = validateBackup(raw);
    expect(v.ok).toBe(false);
    store.close();
  });

  it('accepts a well-formed backup', async () => {
    const { store, snapshot } = await seededSnapshot();
    const v = validateBackup(JSON.parse(backupText(snapshot)));
    expect(v.ok).toBe(true);
    store.close();
  });
});

describe('store.restore — merge semantics', () => {
  it('skips an existing identity and never overwrites local data', async () => {
    const { store: source, snapshot } = await seededSnapshot('run-1');

    // Local target already holds the same class + run, but with a DIFFERENT note.
    const target = await freshStore();
    await target.restore(snapshot, 'merge');
    // Overwrite the local note directly through the notes path.
    await target.saveDraftNote('run-1', 'local note', '2026-07-28T21:00:00-05:00');
    const localNoteBefore = (await target.getNotes('run-1'))?.draft;

    // Merging the same backup again must not overwrite the local note.
    await target.restore(snapshot, 'merge');
    const localNoteAfter = (await target.getNotes('run-1'))?.draft;
    expect(localNoteAfter).toBe(localNoteBefore);

    source.close();
    target.close();
  });

  it('adds a genuinely new run and its events', async () => {
    const { store: a, snapshot: snapA } = await seededSnapshot('run-A');
    const { store: b, snapshot: snapB } = await seededSnapshot('run-B');

    const target = await freshStore();
    await target.restore(snapA, 'merge');
    await target.restore(snapB, 'merge'); // same class, different run id → run added
    const runs = await target.getAllRuns();
    expect(runs.map((r) => r.runId).sort()).toEqual(['run-A', 'run-B']);

    a.close();
    b.close();
    target.close();
  });
});

describe('store.restore — replace and atomicity', () => {
  it('replace wipes then writes the backup', async () => {
    const { store: source, snapshot } = await seededSnapshot('run-keep');
    const { store: local } = await seededSnapshot('run-local');

    // Replace local with the source snapshot: only source's run survives.
    await local.restore(snapshot, 'replace');
    const runs = await local.getAllRuns();
    expect(runs.map((r) => r.runId)).toEqual(['run-keep']);

    source.close();
    local.close();
  });

  it('a mid-apply fault leaves the library byte-identical (atomicity)', async () => {
    const { store: source, snapshot } = await seededSnapshot('run-new');
    const { store: local } = await seededSnapshot('run-local');
    const before = await local.exportLibrary();

    await expect(
      local.restore(snapshot, 'replace', {
        midApply: () => {
          throw new Error('injected fault');
        },
      }),
    ).rejects.toThrow('injected fault');

    const after = await local.exportLibrary();
    expect(after).toEqual(before); // nothing was written
    source.close();
    local.close();
  });
});
