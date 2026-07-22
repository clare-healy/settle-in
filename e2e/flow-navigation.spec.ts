// F1/F2/F3/F8 — manual navigation, bilateral order, revisited display; F4 —
// reference separation. Real Chromium, Pixel 5 profile. Regression/smoke only.

import { test, expect } from '@playwright/test';
import { openHome, begin, next, prev, reference, advanceWall, jul28 } from './helpers.js';

test('F1/F2/F3/F8: forward through the bilateral sequence, Previous revisits Side 1', async ({ page }) => {
  await openHome(page, jul28(19, 0));
  await begin(page);

  // Grounding is the opening segment (F1).
  await expect(page.locator('.live')).toHaveAttribute('data-segment-type', 'grounding');
  await expect(page.locator('.segment-label')).toHaveText('Grounding');

  // Next → Supported Butterfly (one segment, never two).
  await next(page);
  await expect(page.locator('.live')).toHaveAttribute('data-segment-type', 'pose');
  await expect(page.locator('.pose-name')).toHaveText('Supported Butterfly');

  // Next → Transition to Sleeping Swan.
  await next(page);
  await expect(page.locator('.live')).toHaveAttribute('data-segment-type', 'transition');
  await expect(page.getByTestId('destination-preview')).toContainText('Sleeping Swan');

  // Next → Sleeping Swan, Side 1 (Right).
  await next(page);
  await expect(page.locator('.pose-name')).toHaveText('Sleeping Swan');
  await expect(page.locator('.pose-side')).toHaveText('Right');

  // Next → Side 2 (Left) — it does NOT jump to the following transition (F3).
  await next(page);
  await expect(page.locator('.pose-name')).toHaveText('Sleeping Swan');
  await expect(page.locator('.pose-side')).toHaveText('Left');

  // Previous → back to Side 1 (Right), preserving the earlier visit (F2), and the
  // revisit shows `revisited` in place of a drift value (F8).
  await prev(page);
  await expect(page.locator('.pose-name')).toHaveText('Sleeping Swan');
  await expect(page.locator('.pose-side')).toHaveText('Right');
  const drift = page.getByTestId('drift');
  await expect(drift).toHaveText('revisited');
  await expect(drift).toHaveAttribute('data-revisited', 'true');
});

test('F4: opening, scrolling, and closing reference keeps the segment and elapsed continuous', async ({ page }) => {
  await openHome(page, jul28(19, 0));
  await begin(page);
  await next(page); // Supported Butterfly (a pose with a reference layer)

  // Let 90s of elapsed accrue in this visit.
  await advanceWall(page, 90_000);
  const elapsedBefore = await page.getByTestId('elapsed').textContent();
  expect(elapsedBefore).toBe('1:30');
  const driftBefore = await page.getByTestId('drift').textContent();

  // Open the expanded reference, scroll its body, then close it.
  await reference(page);
  const ref = page.getByTestId('reference');
  await expect(ref).toBeVisible();
  await page.getByTestId('reference-body').evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await page.getByTestId('close-reference').click();
  await expect(page.getByTestId('reference')).toHaveCount(0);

  // Same segment, elapsed did NOT reset (no new segment_entered), drift unchanged.
  await expect(page.locator('.pose-name')).toHaveText('Supported Butterfly');
  await expect(page.getByTestId('elapsed')).toHaveText('1:30');
  await expect(page.getByTestId('drift')).toHaveText(driftBefore ?? '');
});
