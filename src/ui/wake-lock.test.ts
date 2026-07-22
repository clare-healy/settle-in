// @vitest-environment happy-dom
//
// Wake-lock ordering and reconciliation (wake-lock treaty; acceptance G1–G4).
//
// The M4b risk fix: the wake-lock request must be initiated synchronously inside
// the Begin / Resume user-gesture task, in parallel with the IndexedDB write —
// NOT after it. Some browsers only grant `navigator.wakeLock.request` from within
// the originating gesture task, so a request that waits for persistence is lost.
// These tests pin the ordering with a fake `navigator.wakeLock` whose `request`
// increments a counter synchronously when called; the counter is read in the same
// synchronous tick as the click. They also pin that a denial never blocks the run
// (G1/G3) and that the held lock is released on finish (G4).
//
// Real wake-lock ACQUISITION remains device-only (G-series, M7); this proves the
// call timing and reconciliation, not the platform grant.

import { describe, it, expect, afterEach } from 'vitest';
import {
  bootApp,
  beginRun,
  advanceSegments,
  zone,
  tap,
  byId,
  maybeId,
  jul28,
  type Harness,
} from './test-support.js';

interface FakeWake {
  requestCalls: number;
  releaseCalls: number;
  held: boolean;
}

function installFakeWakeLock(opts: { deny?: boolean } = {}): FakeWake {
  const state: FakeWake = { requestCalls: 0, releaseCalls: 0, held: false };
  const wakeLock = {
    request(_type: 'screen') {
      // Incremented synchronously, before the promise is returned — this is the
      // moment the gesture-window test observes.
      state.requestCalls += 1;
      if (opts.deny) return Promise.reject(new Error('wake lock denied'));
      state.held = true;
      const sentinel = {
        release() {
          state.held = false;
          state.releaseCalls += 1;
          return Promise.resolve();
        },
        addEventListener(_t: 'release', _cb: () => void) {
          /* no platform-initiated release in these tests */
        },
      };
      return Promise.resolve(sentinel);
    },
  };
  Object.defineProperty(navigator, 'wakeLock', { value: wakeLock, configurable: true, writable: true });
  return state;
}

function removeFakeWakeLock(): void {
  Object.defineProperty(navigator, 'wakeLock', { value: undefined, configurable: true, writable: true });
}

afterEach(() => removeFakeWakeLock());

async function toArmedFinish(h: Harness): Promise<void> {
  await advanceSegments(h, 14); // grounding(0) … savasana(14)
  for (let i = 0; i < 5; i++) await zone(h.app, h.root, 'next'); // to the last step
  await zone(h.app, h.root, 'next'); // exposes Finish
}

describe('wake-lock ordering (M4b Fix 2)', () => {
  it('requests the lock synchronously within the Begin gesture, before persistence resolves (G1)', async () => {
    const fake = installFakeWakeLock();
    const h = await bootApp({ wallEpochMs: jul28(19, 0) });
    await tap(h.app, h.root, 'open-prep');

    // Click Begin but do NOT await: the request must already have fired in the same
    // synchronous task as the click, before the IndexedDB begin transaction resolves.
    byId(h.root, 'begin-class').click();
    expect(fake.requestCalls).toBe(1); // fired in the gesture — the fix

    await h.app.idle();
    expect(h.app.routeKind).toBe('run');
    expect(fake.requestCalls).toBe(1); // the async reconcile did not re-request
    expect(fake.held).toBe(true);
  });

  it('requests the lock synchronously within the Resume gesture (recovery treaty)', async () => {
    const fake = installFakeWakeLock();
    const first = await bootApp({ wallEpochMs: jul28(19, 0), executionId: 'exec-A' });
    await beginRun(first);

    // Reload into recovery over the same durable store, a fresh execution identity.
    const second = await bootApp({
      store: first.store,
      wallEpochMs: jul28(19, 5),
      executionId: 'exec-B',
    });
    expect(second.app.routeKind).toBe('recovery');

    fake.requestCalls = 0;
    byId(second.root, 'resume').click();
    expect(fake.requestCalls).toBe(1); // fired in the Resume gesture, before resume persists

    await second.app.idle();
    expect(second.app.routeKind).toBe('run');
    expect(fake.held).toBe(true);
  });

  it('a denied wake lock never blocks the run and shows the quiet indicator (G1, G3)', async () => {
    const fake = installFakeWakeLock({ deny: true });
    const h = await bootApp({ wallEpochMs: jul28(19, 0) });
    await beginRun(h);

    expect(h.app.routeKind).toBe('run'); // the run started despite the denial
    expect(fake.requestCalls).toBeGreaterThanOrEqual(1);
    expect(maybeId(h.root, 'wake-lock-retry')).not.toBeNull(); // quiet indicator present
  });

  it('holds the lock through the run and releases it on finish (G4)', async () => {
    const fake = installFakeWakeLock();
    const h = await bootApp({ wallEpochMs: jul28(19, 0) });
    await beginRun(h);
    expect(fake.held).toBe(true);
    expect(maybeId(h.root, 'wake-lock-retry')).toBeNull(); // available → no indicator

    await toArmedFinish(h);
    await tap(h.app, h.root, 'finish-class');
    await tap(h.app, h.root, 'confirm-finish');

    expect(h.app.routeKind).toBe('post-class');
    expect(fake.held).toBe(false);
    expect(fake.releaseCalls).toBeGreaterThanOrEqual(1);
  });

  it('releases the held lock on abandon from the Leave guard (G4)', async () => {
    const fake = installFakeWakeLock();
    const h = await bootApp({ wallEpochMs: jul28(19, 0) });
    await beginRun(h);
    expect(fake.held).toBe(true);

    // The live surface has no visible Leave affordance (system Back opens the guard,
    // wired in start()); tests reach the guard through the same private-actions cast
    // the other UI suites use for the controller.
    (h.app as unknown as { actions: { openLeaveGuard(): void } }).actions.openLeaveGuard();
    await tap(h.app, h.root, 'end-this-run');
    await tap(h.app, h.root, 'confirm-end-run');

    expect(fake.held).toBe(false);
    expect(fake.releaseCalls).toBeGreaterThanOrEqual(1);
  });
});
