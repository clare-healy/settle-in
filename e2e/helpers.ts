// Shared helpers for the Settle In Playwright flow harness.
//
// Time is controlled through the dev-only clock seam (src/dev/test-clock.ts): an
// addInitScript sets `window.__settleInTestClock` BEFORE the app boots, and the app
// reads it live. The wall instant is mirrored in localStorage so a reload recovers
// the same time. `__settleInTick` forces a re-render after the clock moves;
// `__settleInIdle` awaits the run machine's single-flight chain so a fast Next tap
// is never dropped as 'busy'. All three exist only in the DEV bundle.

import { type Page, expect } from '@playwright/test';

export const BASE = 'http://localhost:5173/settle-in/';
/** CDT — matches the fixture's 2026-07-28 Tuesday class so hard close lands at 8:00 PM. */
export const OFFSET_MIN = -300;

/** Epoch ms for a 2026-07-28 local wall time at the pinned offset. */
export function jul28(h: number, mi: number, s = 0): number {
  return Date.UTC(2026, 6, 28, h, mi, s) - OFFSET_MIN * 60_000;
}

/** Install the dev-only test-clock seam BEFORE any navigation. Call before goto. */
export async function pinClock(page: Page, wallEpochMs = jul28(19, 0)): Promise<void> {
  await page.addInitScript(
    ({ offset, wall }) => {
      const KEY = '__settleInWall';
      const stored = Number(localStorage.getItem(KEY));
      const w = Number.isFinite(stored) && stored > 0 ? stored : wall;
      (window as unknown as { __settleInTestClock: unknown }).__settleInTestClock = {
        wallEpochMs: w,
        monotonic: w,
        offsetMinutes: offset,
      };
    },
    { offset: OFFSET_MIN, wall: wallEpochMs },
  );
}

/** Open the app fresh on Home, with the fixture seeded by the dev bootstrap. */
export async function openHome(page: Page, wallEpochMs = jul28(19, 0)): Promise<void> {
  await pinClock(page, wallEpochMs);
  await page.goto(BASE);
  await expect(page.getByTestId('upcoming-card')).toBeVisible();
}

/** Await the app's in-flight single-flight action chain (deterministic advancing). */
export async function idle(page: Page): Promise<void> {
  await page.evaluate(() => (window as unknown as { __settleInIdle?: () => Promise<void> }).__settleInIdle?.());
}

/** Set the injected wall clock to an absolute instant and force a re-tick. */
export async function setWall(page: Page, wallEpochMs: number): Promise<void> {
  await page.evaluate((wall) => {
    localStorage.setItem('__settleInWall', String(wall));
    const s = (window as unknown as { __settleInTestClock?: { wallEpochMs: number; monotonic: number } })
      .__settleInTestClock;
    if (s) {
      s.wallEpochMs = wall;
      s.monotonic = wall;
    }
    (window as unknown as { __settleInTick?: () => void }).__settleInTick?.();
  }, wallEpochMs);
}

/** Advance the injected wall clock by a delta. `tick=false` skips the forced re-render
 *  (used to prove that a visibilitychange itself recomputes without a 1 Hz tick). */
export async function advanceWall(page: Page, ms: number, tick = true): Promise<void> {
  await page.evaluate(
    ({ delta, doTick }) => {
      const s = (window as unknown as { __settleInTestClock?: { wallEpochMs: number; monotonic: number } })
        .__settleInTestClock;
      const next = (s ? s.wallEpochMs : 0) + delta;
      localStorage.setItem('__settleInWall', String(next));
      if (s) {
        s.wallEpochMs = next;
        s.monotonic = next;
      }
      if (doTick) (window as unknown as { __settleInTick?: () => void }).__settleInTick?.();
    },
    { delta: ms, doTick: tick },
  );
}

/** Begin the class from Home: open Prep, tap Begin, land on the live surface. */
export async function begin(page: Page): Promise<void> {
  await page.getByTestId('open-prep').click();
  await page.getByTestId('begin-class').click();
  await expect(page.locator('.live')).toBeVisible();
  await idle(page);
}

export function zone(page: Page, which: 'prev' | 'ref' | 'next') {
  return page.locator(`[data-zone="${which}"]`);
}

/** Tap the Next zone and wait for the resulting teaching-state write to commit. */
export async function next(page: Page): Promise<void> {
  // The display layer floats over the zones with pointer-events:none, so the tap is
  // delivered to the zone beneath it (by design). force skips the overlay hit-test.
  await zone(page, 'next').click({ force: true });
  await idle(page);
}

/** Tap the Previous zone and wait for the write to commit. */
export async function prev(page: Page): Promise<void> {
  await zone(page, 'prev').click({ force: true });
  await idle(page);
}

/** Tap the Reference (center) zone and wait for the write to commit. */
export async function reference(page: Page): Promise<void> {
  await zone(page, 'ref').click({ force: true });
  await idle(page);
}

/** Advance n runtime segments via Next, committing each. */
export async function advanceSegments(page: Page, n: number): Promise<void> {
  for (let i = 0; i < n; i++) await next(page);
}

/** The live surface's current segment type (grounding | pose | transition | savasana). */
export function segmentType(page: Page) {
  return page.locator('.live').getAttribute('data-segment-type');
}
