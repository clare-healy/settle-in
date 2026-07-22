// As-taught export golden files (Export Schema v1, docs/class-format.md).
//
// Two golden runs on the minimal valid class: (a) a clean straight-through run,
// on-plan throughout; (b) a run exhibiting a revisit, a skip, a substitution, and
// a room note — covering the status precedence skipped > substituted > revisited >
// timing. Runs are driven through the REAL store + run machine with a controllable
// clock, so the planned/actual seconds and finishing instant are exact. The source
// hash is deterministic (SHA of normalized source) and the run id is pinned, so the
// whole document is byte-exact. A determinism check re-exports the same run.

import { describe, it, expect } from 'vitest';
import { RunController } from '../run/index.js';
import { classFromSource, freshStore, makeEnv, revisionOf, jul28 } from '../store/test-support.js';
import { MINIMAL_VALID } from '../parser/test-helpers.js';
import { parse as parseYaml } from 'yaml';
import { exportAsTaught, finishInstant } from './as-taught.js';
import { APP_VERSION } from '../version.js';
import type { ClassDefinition } from '../schema/index.js';

async function setup(): Promise<{ store: Awaited<ReturnType<typeof freshStore>>; def: ClassDefinition }> {
  const store = await freshStore();
  const def = await classFromSource(MINIMAL_VALID);
  await store.putClassRevision(revisionOf(def));
  return { store, def };
}

async function exportRun(store: Awaited<ReturnType<typeof freshStore>>, def: ClassDefinition, runId: string): Promise<string> {
  const run = (await store.getRun(runId))!;
  const events = await store.getEvents(runId);
  const notes = await store.getNotes(runId);
  return exportAsTaught({
    definition: def,
    revisionSourceHash: run.revisionSourceHash,
    runId: run.runId,
    runLocalDate: run.runLocalDate,
    runStartedAt: run.runStartedAt,
    runFinishedAt: finishInstant(events),
    hardCloseAt: run.hardCloseAt,
    appVersion: APP_VERSION,
    events,
    roomNote: notes?.final ?? null,
  });
}

describe('as-taught export — golden (a) clean straight-through run', () => {
  it('produces the exact document for an on-plan run', async () => {
    const { store, def } = await setup();
    const { clock, env } = makeEnv({ wallEpochMs: jul28(19, 0) });
    const begun = await RunController.begin(store, env, def, { runId: 'run-a' });
    expect(begun.ok).toBe(true);
    const c = begun.ok ? begun.controller : null;
    if (!c) throw new Error('begin failed');

    clock.advance(600_000); await c.nextSegment(); // test-pose @19:10
    clock.advance(2_040_000); await c.nextSegment(); // transition @19:44
    clock.advance(60_000); await c.nextSegment(); // savasana @19:45
    clock.advance(900_000); await c.finish(); // finish @20:00

    const md = await exportRun(store, def, 'run-a');
    const expected = [
      '---',
      'export_schema_version: 1',
      'kind: as-taught-run',
      'class_id: safety-test',
      'class_title: Safety Test',
      'class_date: 2026-07-28',
      `revision_source_hash: "${def.sourceHash}"`,
      'run_id: "run-a"',
      'run_local_date: 2026-07-28',
      'run_started_at: "2026-07-28T19:00:00-05:00"',
      'run_finished_at: "2026-07-28T20:00:00-05:00"',
      'hard_close_at: "2026-07-28T20:00:00-05:00"',
      `app_version: "${APP_VERSION}"`,
      '---',
      '',
      '# As Taught — Safety Test — 2026-07-28',
      '',
      '## Segments',
      '',
      '```yaml',
      '- id: grounding',
      '  parent_id: grounding',
      '  type: grounding',
      '  name: Grounding',
      '  planned_sec: 600',
      '  actual_sec: 600',
      '  status: on-plan',
      '  visits: 1',
      '  substituted_with: null',
      '- id: test-pose',
      '  parent_id: test-pose',
      '  type: pose',
      '  name: Test Pose',
      '  planned_sec: 2040',
      '  actual_sec: 2040',
      '  status: on-plan',
      '  visits: 1',
      '  substituted_with: null',
      '- id: transition-to-savasana',
      '  parent_id: transition-to-savasana',
      '  type: transition',
      '  name: "Transition: To Savasana"',
      '  planned_sec: 60',
      '  actual_sec: 60',
      '  status: on-plan',
      '  visits: 1',
      '  substituted_with: null',
      '- id: savasana',
      '  parent_id: savasana',
      '  type: savasana',
      '  name: Savasana',
      '  planned_sec: 900',
      '  actual_sec: 900',
      '  status: on-plan',
      '  visits: 1',
      '  substituted_with: null',
      '```',
      '',
      '## Room note',
      '',
      'None recorded.',
      '',
    ].join('\n');
    expect(md).toBe(expected);

    // Deterministic: re-exporting the same completed run yields identical bytes.
    expect(await exportRun(store, def, 'run-a')).toBe(md);
    store.close();
  });
});

describe('as-taught export — golden (b) revisit + skip + substitution + note', () => {
  it('produces the exact document with the derived statuses', async () => {
    const { store, def } = await setup();
    const { clock, env } = makeEnv({ wallEpochMs: jul28(19, 0) });
    const begun = await RunController.begin(store, env, def, { runId: 'run-b' });
    const c = begun.ok ? begun.controller : null;
    if (!c) throw new Error('begin failed');

    clock.advance(600_000); await c.nextSegment(); // test-pose @19:10 (grounding v1 = 600)
    clock.advance(60_000); await c.previousSegment(); // back to grounding @19:11 (test-pose v1 = 60)
    clock.advance(60_000); await c.nextSegment(); // test-pose v2 @19:12 (grounding v2 = 60 → total 660)
    clock.advance(60_000); await c.nextSegment(); // transition @19:13 (test-pose v2 = 60 → total 120)
    clock.advance(60_000); await c.nextSegment(); // savasana @19:14 (transition v1 = 60)
    clock.advance(900_000); await c.finish(); // finish @19:29 (savasana = 900)

    // Post-class corrections (as Post-Class Notes drives them).
    await c.skip('transition-to-savasana');
    await c.substitute('test-pose', 'Reclined Twist');
    await c.finalizeNotes('Warm room; ran long.');

    const md = await exportRun(store, def, 'run-b');
    const expected = [
      '---',
      'export_schema_version: 1',
      'kind: as-taught-run',
      'class_id: safety-test',
      'class_title: Safety Test',
      'class_date: 2026-07-28',
      `revision_source_hash: "${def.sourceHash}"`,
      'run_id: "run-b"',
      'run_local_date: 2026-07-28',
      'run_started_at: "2026-07-28T19:00:00-05:00"',
      'run_finished_at: "2026-07-28T19:29:00-05:00"',
      'hard_close_at: "2026-07-28T20:00:00-05:00"',
      `app_version: "${APP_VERSION}"`,
      '---',
      '',
      '# As Taught — Safety Test — 2026-07-28',
      '',
      '## Segments',
      '',
      '```yaml',
      '- id: grounding',
      '  parent_id: grounding',
      '  type: grounding',
      '  name: Grounding',
      '  planned_sec: 600',
      '  actual_sec: 660',
      '  status: revisited',
      '  visits: 2',
      '  substituted_with: null',
      '- id: test-pose',
      '  parent_id: test-pose',
      '  type: pose',
      '  name: Test Pose',
      '  planned_sec: 2040',
      '  actual_sec: 120',
      '  status: substituted',
      '  visits: 2',
      '  substituted_with: "Reclined Twist"',
      '- id: transition-to-savasana',
      '  parent_id: transition-to-savasana',
      '  type: transition',
      '  name: "Transition: To Savasana"',
      '  planned_sec: 60',
      '  actual_sec: 0',
      '  status: skipped',
      '  visits: 1',
      '  substituted_with: null',
      '- id: savasana',
      '  parent_id: savasana',
      '  type: savasana',
      '  name: Savasana',
      '  planned_sec: 900',
      '  actual_sec: 900',
      '  status: on-plan',
      '  visits: 1',
      '  substituted_with: null',
      '```',
      '',
      '## Room note',
      '',
      'Warm room; ran long.',
      '',
    ].join('\n');
    expect(md).toBe(expected);
    expect(await exportRun(store, def, 'run-b')).toBe(md);
    store.close();
  });

  it('the Segments block parses back as valid YAML', async () => {
    const { store, def } = await setup();
    const { clock, env } = makeEnv({ wallEpochMs: jul28(19, 0) });
    const begun = await RunController.begin(store, env, def, { runId: 'run-c' });
    const c = begun.ok ? begun.controller : null;
    if (!c) throw new Error('begin failed');
    clock.advance(600_000); await c.nextSegment();
    clock.advance(2_040_000); await c.nextSegment();
    clock.advance(60_000); await c.nextSegment();
    clock.advance(900_000); await c.finish();
    await c.finalizeNotes('A note with: a colon and "quotes".');

    const md = await exportRun(store, def, 'run-c');
    const yamlBody = md.split('```yaml\n')[1]!.split('\n```')[0]!;
    const parsed = parseYaml(yamlBody) as unknown[];
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(4);
    // The verbatim note (with a colon and quotes) survives into the document.
    expect(md).toContain('A note with: a colon and "quotes".');
    store.close();
  });
});
