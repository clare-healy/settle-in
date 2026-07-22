// @vitest-environment happy-dom
//
// §14 "Application update ready" surface and the A5 apply guard, driven through the
// real controller. The service-worker registration reports a waiting worker via
// setUpdateReady; the quiet pill must appear only OUTSIDE a run (Home / Library) and
// applying must be refused while a run (or recovery) is live.

import { describe, it, expect } from 'vitest';
import { bootApp, byId, maybeId, tap, beginRun, jul28 } from './test-support.js';

describe('§14 update-ready surface (A5)', () => {
  it('shows the quiet pill on Home when a worker is waiting, and applies on tap', async () => {
    const h = await bootApp({ seed: true, wallEpochMs: jul28(19, 0) }); // → Home
    expect(maybeId(h.root, 'update-ready')).toBeNull();

    let applied = 0;
    h.app.setUpdateReady(true, () => {
      applied += 1;
    });

    const pill = byId(h.root, 'update-ready');
    expect(pill.textContent).toBe('Update ready · apply now');

    pill.click();
    expect(applied).toBe(1);
  });

  it('also surfaces the pill on the Library screen', async () => {
    const h = await bootApp({ seed: true, wallEpochMs: jul28(19, 0) });
    h.app.setUpdateReady(true, () => undefined);
    h.app.actionsForTest.openLibrary();
    await h.app.idle();
    expect(maybeId(h.root, 'update-ready')).not.toBeNull();
  });

  it('never shows the pill during a run and refuses to apply mid-run', async () => {
    const h = await bootApp({ seed: true, wallEpochMs: jul28(19, 0) });
    await beginRun(h);
    expect(h.app.routeKind).toBe('run');

    let applied = 0;
    h.app.setUpdateReady(true, () => {
      applied += 1;
    });

    // No pill on the live surface, and the guarded action does not apply mid-run.
    expect(maybeId(h.root, 'update-ready')).toBeNull();
    h.app.actionsForTest.applyUpdate();
    expect(applied).toBe(0);
  });

  it('applies once the run has ended and the app is idle again', async () => {
    const h = await bootApp({ seed: true, wallEpochMs: jul28(19, 0) });
    await beginRun(h);

    let applied = 0;
    h.app.setUpdateReady(true, () => {
      applied += 1;
    });

    // End the run: leave guard → End this run → confirm → Home.
    h.app.actionsForTest.openLeaveGuard();
    await tap(h.app, h.root, 'end-this-run');
    await tap(h.app, h.root, 'confirm-end-run');
    expect(h.app.routeKind).toBe('home');

    // The pill now surfaces and applies.
    byId(h.root, 'update-ready').click();
    expect(applied).toBe(1);
  });
});
