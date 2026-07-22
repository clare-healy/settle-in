// F5 — Android system back (browser back) during a run. This is the popstate
// history-sentinel path that happy-dom could not exercise: real Chromium history
// traversal, real popstate. Order: close dialog → collapse reference → Leave guard;
// outside a run, back is never a guard. Regression/smoke only.

import { test, expect } from '@playwright/test';
import { openHome, begin, next, reference, jul28 } from './helpers.js';

test('F5: back during a run opens the Leave guard; Return to class stays in place', async ({ page }) => {
  await openHome(page, jul28(19, 0));
  await begin(page);

  await page.goBack();
  await expect(page.locator('[data-dialog="leave-guard"]')).toBeVisible();

  // Return to class is the low-friction primary; it never leaves the run.
  await page.getByTestId('return-to-class').click();
  await expect(page.locator('[data-dialog="leave-guard"]')).toHaveCount(0);
  await expect(page.locator('.live')).toBeVisible();
});

test('F5: back with the expanded reference open collapses it first, no guard', async ({ page }) => {
  await openHome(page, jul28(19, 0));
  await begin(page);
  await next(page); // Supported Butterfly
  await reference(page);
  await expect(page.getByTestId('reference')).toBeVisible();

  await page.goBack();

  // The reference collapses; no Leave guard, still in the run.
  await expect(page.getByTestId('reference')).toHaveCount(0);
  await expect(page.locator('[data-dialog="leave-guard"]')).toHaveCount(0);
  await expect(page.locator('.pose-name')).toHaveText('Supported Butterfly');
});

test('F5: back outside a run never shows the Leave guard', async ({ page }) => {
  await openHome(page, jul28(19, 0));
  await expect(page.getByTestId('upcoming-card')).toBeVisible();

  await page.goBack().catch(() => {
    /* no earlier entry to traverse to — the point is only that no guard appears */
  });
  await expect(page.locator('[data-dialog="leave-guard"]')).toHaveCount(0);
});
