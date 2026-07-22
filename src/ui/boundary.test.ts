// @vitest-environment happy-dom
//
// Long-content boundary fixture (J2 groundwork). fixtures/valid-boundary-content.md
// pins a 36-char pose title, a 150-char midpoint, and a 280-char expanded cue on a
// single pose. Everything must render in full — no truncating CSS. The physical
// no-collision check at 100%/125% font scaling belongs to the device pass (M7).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { importClass } from '../parser/index.js';
import { Store } from '../store/index.js';
import { newDbName } from '../store/test-support.js';
import { AppController } from './app.js';
import { TestClock } from '../model/index.js';
import { CDT_OFFSET_MIN, jul28, byId, zone, type Harness } from './test-support.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(here, '..', '..', 'fixtures');

async function bootBoundary(): Promise<{ h: Harness; entry: string; midpoint: string; name: string }> {
  const source = readFileSync(join(fixturesDir, 'valid-boundary-content.md'), 'utf8');
  const result = await importClass(source);
  if (!result.ok) throw new Error('boundary fixture failed to import');
  const def = result.classDefinition;

  const store = await Store.open({ name: newDbName() });
  await store.putClassRevision({
    sourceHash: def.sourceHash,
    classId: def.classId,
    schemaVersion: def.schemaVersion,
    warnings: result.warnings,
    importedAt: '2026-07-28T18:55:00-05:00',
    definition: def,
  });

  const clock = new TestClock({
    wallEpochMs: jul28(19, 0),
    monotonic: 0,
    offsetMinutes: CDT_OFFSET_MIN,
    executionId: 'exec-boundary',
  });
  const root = document.createElement('div');
  document.body.appendChild(root);
  const app = await AppController.boot({ store, root, clock, offsetMinutes: CDT_OFFSET_MIN, executionId: clock.executionId });

  const pose = def.authoredSegments.find((s) => s.id === 'deeply-supported-reclining-butterfly');
  if (!pose || pose.type !== 'pose') throw new Error('boundary pose missing');
  return { h: { app, clock, store, root }, entry: pose.entry, midpoint: pose.midpoint, name: pose.name };
}

describe('boundary content renders without truncation (J2)', () => {
  it('shows the full 36-char title and 150-char midpoint on the minimal pose', async () => {
    const { h, midpoint, name } = await bootBoundary();
    await byId(h.root, 'open-prep').click();
    await h.app.idle();
    await byId(h.root, 'begin-class').click();
    await h.app.idle();
    await zone(h.app, h.root, 'next'); // grounding → the boundary pose

    expect(name.length).toBe(36);
    expect((h.root.querySelector('.pose-name') as HTMLElement).textContent).toBe(name);
    expect(byId(h.root, 'midpoint').textContent).toBe(midpoint); // full 150 chars
  });

  it('shows the full 280-char entry cue in the expanded reference', async () => {
    const { h, entry } = await bootBoundary();
    await byId(h.root, 'open-prep').click();
    await h.app.idle();
    await byId(h.root, 'begin-class').click();
    await h.app.idle();
    await zone(h.app, h.root, 'next'); // to the boundary pose
    await zone(h.app, h.root, 'ref'); // open reference

    expect(entry.length).toBe(280);
    expect(byId(h.root, 'reference-body').textContent).toContain(entry);
  });

  it('uses no truncating CSS on pose or cue text', () => {
    const css = readFileSync(join(here, 'styles', 'app.css'), 'utf8');
    expect(css).not.toContain('text-overflow: ellipsis');
    expect(css).not.toContain('line-clamp');
  });
});
