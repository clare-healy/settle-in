import { describe, expect, it } from 'vitest';
import { RunController, QUEUE_POLICY } from './machine.js';
import { loadValidClass, makeEnv, newDbName, openStore, revisionOf } from '../store/test-support.js';
import { deriveActuals } from '../model/index.js';

async function beginFreshRun(name = newDbName()) {
  const store = await openStore(name);
  const def = await loadValidClass();
  await store.putClassRevision(revisionOf(def));
  const { clock, env } = makeEnv();
  const begun = await RunController.begin(store, env, def, { runId: 'run-1' });
  if (!begun.ok) throw new Error(`begin failed: ${begun.reason}`);
  return { store, def, clock, env, controller: begun.controller, name };
}

describe('begin (F7 via store guard)', () => {
  it('opens the run in the first expanded segment (grounding) with run_started persisted', async () => {
    const { controller, store } = await beginFreshRun();
    const snap = controller.snapshot();
    expect(snap.status).toBe('active_run');
    expect(snap.currentSegment?.type).toBe('grounding');
    const events = await store.getEvents('run-1');
    expect(events[0]!.type).toBe('run_started');
    expect(events[1]!.type).toBe('segment_entered');
    store.close();
  });

  it('rejects a second begin while a run is active', async () => {
    const { store, def, env } = await beginFreshRun();
    const second = await RunController.begin(store, env, def, { runId: 'run-2' });
    expect(second).toEqual({ ok: false, reason: 'active-run-exists' });
    store.close();
  });
});

describe('H1 — persist-before-acknowledge', () => {
  it('an action resolves only after its event is durably readable in a fresh transaction', async () => {
    const name = newDbName();
    const { controller, clock, store } = await beginFreshRun(name);
    clock.advance(10 * 60_000);
    const result = await controller.nextSegment();
    expect(result.ok).toBe(true);

    // A SECOND connection (a fresh transaction path) sees the event already.
    const other = await openStore(name);
    const events = await other.getEvents('run-1');
    const last = events[events.length - 1]!;
    expect(last.type).toBe('segment_entered');
    // The run's projection was updated in the same durable transaction.
    const run = await other.getRun('run-1');
    expect(run!.projection.currentSegmentId).toBe(result.ok ? result.snapshot.currentSegmentId : null);
    other.close();
    store.close();
  });
});

describe('F9 — single-flight action queue (reject-while-pending)', () => {
  it('documents the reject policy', () => {
    expect(QUEUE_POLICY).toBe('reject-while-pending');
  });

  it('rapid double-next produces exactly one committed segment_entered, no interleave', async () => {
    const { controller, store } = await beginFreshRun();
    const before = (await store.getEvents('run-1')).length;

    // Fire two without awaiting the first: the second arrives while the first is pending.
    const p1 = controller.nextSegment();
    const p2 = controller.nextSegment();
    const [r1, r2] = await Promise.all([p1, p2]);

    const committed = [r1, r2].filter((r) => r.ok).length;
    const rejected = [r1, r2].filter((r) => !r.ok && r.rejected === 'busy').length;
    expect(committed).toBe(1);
    expect(rejected).toBe(1);

    const after = await store.getEvents('run-1');
    expect(after.length).toBe(before + 1);
    expect(after[after.length - 1]!.type).toBe('segment_entered');

    // A rejected action left state consistent and retryable: a later next works.
    const retry = await controller.nextSegment();
    expect(retry.ok).toBe(true);
    expect((await store.getEvents('run-1')).length).toBe(before + 2);
    store.close();
  });
});

describe('H4 — back-visit duration through the store path', () => {
  it('A → B → back A → forward B: actual A = sum of bounded visits, status revisited', async () => {
    const { controller, clock, store, def } = await beginFreshRun();
    const [a, b] = def.expandedRuntimeSegments; // grounding (A), first pose/side (B)
    // Enter B at +10m (A visit 1 = 10m).
    clock.advance(10 * 60_000);
    await controller.nextSegment();
    // Back to A at +12m (B visit 1 = 2m).
    clock.advance(2 * 60_000);
    await controller.previousSegment();
    // Forward to B at +15m (A visit 2 = 3m).
    clock.advance(3 * 60_000);
    await controller.nextSegment();
    // Finish at +20m (B visit 2 = 5m).
    clock.advance(5 * 60_000);
    await controller.finish();

    const events = await store.getEvents('run-1');
    const actuals = deriveActuals(def, events);
    const aActual = actuals.find((x) => x.id === a!.id)!;
    const bActual = actuals.find((x) => x.id === b!.id)!;
    expect(aActual.actualSec).toBe((10 + 3) * 60); // two bounded visits summed
    expect(aActual.status).toBe('revisited');
    expect(bActual.actualSec).toBe((2 + 5) * 60);
    expect(bActual.status).toBe('revisited');
    store.close();
  });
});

describe('savasana steps and wake message', () => {
  it('advances and steps back within savasana; next-past-last is invalid', async () => {
    const { controller, def } = await beginFreshRun();
    // Walk forward to savasana (last expanded segment).
    const savasanaId = def.expandedRuntimeSegments[def.expandedRuntimeSegments.length - 1]!.id;
    let guard = 0;
    while (controller.snapshot().currentSegmentId !== savasanaId && guard++ < 100) {
      const r = await controller.nextSegment();
      if (!r.ok) break;
    }
    expect(controller.snapshot().currentSegment?.type).toBe('savasana');

    // next segment past savasana is invalid.
    expect(await controller.nextSegment()).toMatchObject({ ok: false, rejected: 'invalid' });

    const stepCount = controller.snapshot().savasanaStepCount;
    for (let i = 1; i < stepCount; i++) {
      const r = await controller.savasanaStepForward();
      expect(r.ok).toBe(true);
    }
    expect(controller.snapshot().savasanaStep).toBe(stepCount - 1);
    // Past the last step is invalid.
    expect(await controller.savasanaStepForward()).toMatchObject({ ok: false, rejected: 'invalid' });
    const back = await controller.savasanaStepBack();
    expect(back.ok).toBe(true);
    expect(controller.snapshot().savasanaStep).toBe(stepCount - 2);
  });

  it('markWakeShown persists before rendering, once (E6 groundwork)', async () => {
    const { controller, store } = await beginFreshRun();
    const first = await controller.markWakeShown();
    expect(first.ok).toBe(true);
    if (first.ok) expect(first.snapshot.wakeMessageShown).toBe(true);
    // Durable before the caller renders.
    const events = await store.getEvents('run-1');
    expect(events.some((e) => e.type === 'wake_message_shown')).toBe(true);
    // Idempotent: a second call is a no-op (no replayed fade).
    expect(await controller.markWakeShown()).toMatchObject({ ok: false, rejected: 'invalid' });
    store.close();
  });
});

describe('lifecycle', () => {
  it('finish → finished_run_pending_notes; finalize → completed_run', async () => {
    const { controller, store } = await beginFreshRun();
    const fin = await controller.finish();
    expect(fin.ok && fin.snapshot.status).toBe('finished_run_pending_notes');
    await controller.saveDraftNote('calm room');
    const done = await controller.finalizeNotes('calm room; small group');
    expect(done.status).toBe('completed_run');
    expect((await store.getRun('run-1'))!.status).toBe('completed_run');
    expect((await store.getNotes('run-1'))!.final).toBe('calm room; small group');
    store.close();
  });

  it('abandon → abandoned_run, event history preserved', async () => {
    const { controller, store } = await beginFreshRun();
    await controller.abandon();
    expect(controller.status).toBe('abandoned_run');
    expect((await store.getRun('run-1'))!.status).toBe('abandoned_run');
    expect((await store.getEvents('run-1')).some((e) => e.type === 'run_abandoned')).toBe(true);
    store.close();
  });
});
