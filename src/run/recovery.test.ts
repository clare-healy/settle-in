import { describe, expect, it } from 'vitest';
import { RunController } from './machine.js';
import { buildRecoverySnapshot } from './recovery.js';
import { rebuildProjections } from '../store/index.js';
import {
  loadValidClass,
  makeEnv,
  newDbName,
  openStore,
  revisionOf,
} from '../store/test-support.js';

// Recovery is derived from durable state alone with a FRESH execution identity
// and a FRESH database connection — the process-death shape (H2/H3). We drive a
// run partway, drop the controller, and reconstruct from the store.

async function driveRunPartway() {
  const name = newDbName();
  const store = await openStore(name);
  const def = await loadValidClass();
  await store.putClassRevision(revisionOf(def));
  const { clock, env } = makeEnv({ executionId: 'exec-1' });
  const begun = await RunController.begin(store, env, def, { runId: 'run-1' });
  if (!begun.ok) throw new Error('begin failed');
  const controller = begun.controller;

  // Enter a few segments, opening a reference along the way.
  clock.advance(10 * 60_000);
  await controller.nextSegment();
  await controller.expandReference(controller.snapshot().currentSegmentId!);
  clock.advance(4 * 60_000);
  const afterSecond = await controller.nextSegment();
  return { name, store, def, clock, expected: afterSecond, controller };
}

describe('process-death recovery (H2/H3)', () => {
  it('reconstructs the exact segment, side, and savasana step from durable state', async () => {
    const { name, store, expected } = await driveRunPartway();
    store.close();

    // New process: fresh connection, fresh execution identity.
    const store2 = await openStore(name);
    const { clock: clock2, env: env2 } = makeEnv({ executionId: 'exec-2', wallEpochMs: 0 });
    const recovered = await RunController.loadActive(store2, env2);
    expect(recovered).not.toBeNull();

    const snapshot = buildRecoverySnapshot(recovered!, clock2);
    const expectedSnap = expected.ok ? expected.snapshot : null;
    expect(snapshot.lastSegmentId).toBe(expectedSnap!.currentSegmentId);
    expect(snapshot.side).toBe(expectedSnap!.side);
    expect(snapshot.savasanaStep).toBe(expectedSnap!.savasanaStep);
    expect(snapshot.classTitle).toBe((await store2.getClassRevision(recovered!.definition.sourceHash))!.definition.title);
    store2.close();
  });

  it('resume appends run_resumed carrying the new execution identity', async () => {
    const { name, store } = await driveRunPartway();
    store.close();

    const store2 = await openStore(name);
    const { env: env2 } = makeEnv({ executionId: 'exec-2' });
    const recovered = await RunController.loadActive(store2, env2);
    const before = (await store2.getEvents('run-1')).length;
    const resumed = await recovered!.resume();
    expect(resumed.ok).toBe(true);

    const events = await store2.getEvents('run-1');
    expect(events.length).toBe(before + 1);
    const last = events[events.length - 1]!;
    expect(last.type).toBe('run_resumed');
    expect(last.executionId).toBe('exec-2');
    expect(recovered!.status).toBe('active_run');
    store2.close();
  });
});

describe('projection repair on recovery', () => {
  it('a corrupted projection is quietly repaired from the event log (log wins)', async () => {
    const { name, store, def } = await driveRunPartway();
    // Corrupt the persisted projection to a value the log does not support.
    await store.repairProjection('run-1', {
      currentSegmentId: 'not-a-real-segment',
      savasanaStep: 4,
      expandedReferenceSegmentId: 'also-wrong',
      wakeMessageShown: true,
    });
    store.close();

    const store2 = await openStore(name);
    const { env: env2 } = makeEnv({ executionId: 'exec-2' });
    const recovered = await RunController.loadActive(store2, env2);
    expect(recovered).not.toBeNull();

    const events = await store2.getEvents('run-1');
    const truth = rebuildProjections(events, 6);
    // The controller trusts the log...
    expect(recovered!.snapshot().currentSegmentId).toBe(truth.currentSegmentId);
    expect(recovered!.snapshot().currentSegmentId).not.toBe('not-a-real-segment');
    // ...and repaired the durable projection so the next launch is already correct.
    const repaired = await store2.getRun('run-1');
    expect(repaired!.projection).toEqual(truth);
    // The event log itself was never rewritten.
    expect(events).toEqual(await store2.getEvents('run-1'));
    expect(def.expandedRuntimeSegments.some((s) => s.id === truth.currentSegmentId)).toBe(true);
    store2.close();
  });
});
