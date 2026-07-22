// F6 — no accidental finish or abandon. Finish is a deliberate two-step from the
// last savasana step; abandoning from the Leave guard needs a second confirmation.
// Regression/smoke only.

import { test, expect } from '@playwright/test';
import { openHome, begin, next, advanceSegments, jul28 } from './helpers.js';

test('F6: Finish requires the last savasana step, a reveal, and a confirmation', async ({ page }) => {
  await openHome(page, jul28(19, 0));
  await begin(page);
  await advanceSegments(page, 14); // through to Savasana (step 0)
  await expect(page.locator('.live')).toHaveAttribute('data-segment-type', 'savasana');

  // Finish is not offered until the sixth step is reached AND Next reveals it.
  for (let i = 0; i < 5; i++) await next(page); // to the last step (index 5)
  await expect(page.getByTestId('finish-class')).toHaveCount(0);

  await next(page); // reveals Finish; does NOT finish
  await expect(page.getByTestId('finish-class')).toBeVisible();

  // Deliberate two-step: reveal → confirm.
  await page.getByTestId('finish-class').click();
  await expect(page.locator('[data-dialog="finish-confirm"]')).toBeVisible();
  await page.getByTestId('confirm-finish').click();

  // Lands on Post-Class Notes.
  await expect(page.locator('[data-screen="post-class"]')).toBeVisible();
});

test('F6: abandoning from the Leave guard needs the second confirmation', async ({ page }) => {
  await openHome(page, jul28(19, 0));
  await begin(page);

  await page.goBack();
  await expect(page.locator('[data-dialog="leave-guard"]')).toBeVisible();

  // First step: choose to end. Second step: confirm.
  await page.getByTestId('end-this-run').click();
  await expect(page.locator('[data-dialog="end-run-confirm"]')).toBeVisible();
  await page.getByTestId('confirm-end-run').click();

  // Back at Home; the run is resolved.
  await expect(page.getByTestId('upcoming-card')).toBeVisible();
});
