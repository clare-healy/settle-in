// Wake-lock REQUEST ordering (M4b Fix 2) and visibility re-request, verified under
// real Chromium with a stubbed navigator.wakeLock that records call timing.
//
// IMPORTANT: this proves the app CALLS navigator.wakeLock.request inside the Begin
// user-gesture task (the fix), and re-attempts on visibility — NOT that the platform
// GRANTS a lock. REAL wake-lock acquisition, release-while-visible, and denial are
// device-only (acceptance G1–G4, M7 device matrix). Headless Chromium cannot grant
// a screen wake lock, which is exactly why the request is stubbed here.

import { test, expect, type Page } from '@playwright/test';
import { openHome, begin, next, setWall, idle, jul28 } from './helpers.js';

/** Stub that GRANTS: records calls, returns a working sentinel. */
async function stubWakeLockGrant(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const rec = { requested: false, calls: 0, held: false };
    (window as unknown as { __wake: typeof rec }).__wake = rec;
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: {
        request(_type: string) {
          rec.requested = true;
          rec.calls += 1;
          rec.held = true;
          return Promise.resolve({
            release() {
              rec.held = false;
              return Promise.resolve();
            },
            addEventListener() {
              /* no platform-initiated release in this stub */
            },
          });
        },
      },
    });
  });
}

/** Stub that DENIES: records calls, rejects — so `wanted` stays true and the app
 *  re-attempts on visibility (and shows the quiet indicator). */
async function stubWakeLockDeny(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const rec = { calls: 0 };
    (window as unknown as { __wake: typeof rec }).__wake = rec;
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: {
        request(_type: string) {
          rec.calls += 1;
          return Promise.reject(new Error('denied (headless)'));
        },
      },
    });
  });
}

test('Fix 2: the wake lock is requested synchronously within the Begin gesture task', async ({ page }) => {
  await stubWakeLockGrant(page);
  await openHome(page, jul28(19, 0));
  await page.getByTestId('open-prep').click();

  // Click Begin and, in the SAME synchronous task, observe whether the request has
  // already fired. The fix moves the request ahead of the IndexedDB write, so it is
  // called before the click handler yields. (Pre-fix, this reads false.)
  const requestedInGesture = await page.evaluate(() => {
    const rec = (window as unknown as { __wake: { requested: boolean } }).__wake;
    rec.requested = false;
    (document.querySelector('[data-testid="begin-class"]') as HTMLButtonElement).click();
    return rec.requested;
  });
  expect(requestedInGesture).toBe(true);

  await idle(page);
  await expect(page.locator('.live')).toBeVisible();
  const held = await page.evaluate(() => (window as unknown as { __wake: { held: boolean } }).__wake.held);
  expect(held).toBe(true);
});

test('Visibility: becoming visible recomputes elapsed immediately and re-attempts the lock', async ({ page }) => {
  await stubWakeLockDeny(page);
  await openHome(page, jul28(19, 0));
  await begin(page); // request #1 (denied) → quiet indicator shows
  await expect(page.getByTestId('wake-lock-retry')).toBeVisible();

  await setWall(page, jul28(19, 1));
  await next(page); // Supported Butterfly entered at 7:01, elapsed 0:00
  await expect(page.getByTestId('elapsed')).toHaveText('0:00');

  // In one synchronous step: advance the wall +5s WITHOUT a forced tick, then fire
  // visibilitychange. Elapsed must be recomputed by the visibility handler itself
  // (no waiting for the 1 Hz interval), and the wake lock re-requested.
  const res = await page.evaluate((wall) => {
    const s = (window as unknown as { __settleInTestClock: { wallEpochMs: number; monotonic: number } })
      .__settleInTestClock;
    s.wallEpochMs = wall;
    s.monotonic = wall;
    localStorage.setItem('__settleInWall', String(wall));
    const callsBefore = (window as unknown as { __wake: { calls: number } }).__wake.calls;
    document.dispatchEvent(new Event('visibilitychange'));
    return {
      elapsed: document.querySelector('[data-testid="elapsed"]')?.textContent,
      callsBefore,
      callsAfter: (window as unknown as { __wake: { calls: number } }).__wake.calls,
    };
  }, jul28(19, 1, 5));

  expect(res.elapsed).toBe('0:05'); // recomputed immediately, no stale 1s wait
  expect(res.callsAfter).toBeGreaterThan(res.callsBefore); // re-request attempted
});
