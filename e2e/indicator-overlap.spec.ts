// M4b Fix 1 — the quiet wake-lock indicator must never overlap teaching content.
// This is the true bounding-box assertion (screen-states § 14) under REAL Chromium
// layout, which happy-dom cannot provide. Wake lock is forced unavailable so the
// indicator renders on every live screen; on each we assert the indicator's box
// does not intersect the segment label / pose name or the wall clock, and in fact
// sits entirely above them (the reserved top band). Regression/smoke only.

import { test, expect, type Page } from '@playwright/test';
import { openHome, begin, next, advanceSegments, setWall, idle, jul28 } from './helpers.js';

type Box = { x: number; y: number; width: number; height: number };

function rectsOverlap(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

async function forceWakeLockUnavailable(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: undefined });
  });
}

async function assertBanded(page: Page, screen: string): Promise<void> {
  const indicator = await page.getByTestId('wake-lock-retry').boundingBox();
  const label = await page.locator('.segment-label, .pose-name').first().boundingBox();
  const clock = await page.getByTestId('wall-clock').boundingBox();
  expect(indicator, `${screen}: indicator has a box`).not.toBeNull();
  expect(label, `${screen}: label has a box`).not.toBeNull();
  expect(clock, `${screen}: clock has a box`).not.toBeNull();

  expect(rectsOverlap(indicator!, label!), `${screen}: indicator overlaps the label`).toBe(false);
  expect(rectsOverlap(indicator!, clock!), `${screen}: indicator overlaps the clock`).toBe(false);
  // The reserved band sits entirely above the teaching content.
  expect(indicator!.y + indicator!.height, `${screen}: indicator above label`).toBeLessThanOrEqual(label!.y + 0.5);
  expect(indicator!.y + indicator!.height, `${screen}: indicator above clock`).toBeLessThanOrEqual(clock!.y + 0.5);
}

test.beforeEach(async ({ page }) => {
  await forceWakeLockUnavailable(page);
});

test('Grounding: indicator does not overlap the segment label or clock', async ({ page }) => {
  await openHome(page, jul28(19, 0));
  await begin(page);
  await expect(page.getByTestId('wake-lock-retry')).toBeVisible();
  await assertBanded(page, 'Grounding');
});

test('Pose: indicator does not overlap the pose name or clock', async ({ page }) => {
  await openHome(page, jul28(19, 0));
  await begin(page);
  await next(page); // Supported Butterfly
  await assertBanded(page, 'Pose');
});

test('Transition: indicator does not overlap the transition label or clock', async ({ page }) => {
  await openHome(page, jul28(19, 0));
  await begin(page);
  await advanceSegments(page, 2); // Transition: To Sleeping Swan
  await assertBanded(page, 'Transition');
});

test('Savasana (incl. the two-minute callout): indicator stays banded above content', async ({ page }) => {
  await openHome(page, jul28(19, 0));
  await begin(page);
  await advanceSegments(page, 14); // Savasana
  await assertBanded(page, 'Savasana');

  // With the two-minute callout present, the indicator still never covers content.
  await setWall(page, jul28(19, 58));
  await idle(page);
  await expect(page.getByTestId('wake-callout')).toBeVisible();
  await assertBanded(page, 'Savasana + callout');
});
