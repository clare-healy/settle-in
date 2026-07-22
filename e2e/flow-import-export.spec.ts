// M5 end-to-end: import → upcoming → run → as-taught export → backup round trip.
//
// Regression/smoke only (see playwright.config.ts scope note). This drives the REAL
// import UI from a true empty library (the dev seed is suppressed with the dev-only
// __settleInNoSeed flag), teaches a short run through the clock seam, exports the
// as-taught record and asserts its bytes via the Playwright download API, then
// exports a whole-library backup and restores it (merge) back through the UI.

import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { BASE, OFFSET_MIN, jul28, idle, next, advanceSegments } from './helpers.js';

const here = dirname(fileURLToPath(import.meta.url));
const VALID = readFileSync(join(here, '..', 'fixtures', 'valid-desire-paths.md'), 'utf8');

/** Boot with the clock pinned AND the dev seed suppressed (true empty library). */
async function openEmpty(page: Page): Promise<void> {
  await page.addInitScript(
    ({ offset, wall }) => {
      localStorage.setItem('__settleInNoSeed', '1');
      const KEY = '__settleInWall';
      const stored = Number(localStorage.getItem(KEY));
      const w = Number.isFinite(stored) && stored > 0 ? stored : wall;
      (window as unknown as { __settleInTestClock: unknown }).__settleInTestClock = {
        wallEpochMs: w,
        monotonic: w,
        offsetMinutes: offset,
      };
    },
    { offset: OFFSET_MIN, wall: jul28(19, 0) },
  );
  await page.goto(BASE);
  await expect(page.locator('[data-screen="empty"]')).toBeVisible();
}

test('import a class, run it, export as-taught, and round-trip a backup', async ({ page }) => {
  await openEmpty(page);

  // 1. Import the valid fixture through the real import UI.
  await page.getByTestId('import-class').click();
  await page.getByTestId('import-source').fill(VALID);
  await page.getByTestId('import-validate').click();
  await expect(page.getByTestId('import-summary')).toBeVisible();
  await expect(page.getByTestId('import-summary')).toContainText('Desire Paths');
  await page.getByTestId('import-confirm').click();

  // 2. It is now the upcoming class on Home.
  await expect(page.getByTestId('upcoming-card')).toContainText('Desire Paths');

  // 3. Teach a short run to completion via the clock seam.
  await page.getByTestId('open-prep').click();
  await page.getByTestId('begin-class').click();
  await expect(page.locator('.live')).toBeVisible();
  await idle(page);
  await advanceSegments(page, 14); // to Savasana
  await expect(page.locator('.live')).toHaveAttribute('data-segment-type', 'savasana');
  for (let i = 0; i < 5; i++) await next(page); // to the last savasana step
  await next(page); // reveal Finish
  await page.getByTestId('finish-class').click();
  await page.getByTestId('confirm-finish').click();
  await expect(page.locator('[data-screen="post-class"]')).toBeVisible();
  await page.getByTestId('save-notes').click();

  // 4. Open the class in the Library and export the as-taught run.
  await page.getByTestId('home-library').click();
  await page.getByTestId('class-desire-paths-2026-07-28').click();
  await expect(page.locator('[data-screen="class-detail"]')).toBeVisible();

  const exportRun = page.locator('[data-testid^="export-run-"]').first();
  await expect(exportRun).toBeVisible();
  const [runDownload] = await Promise.all([page.waitForEvent('download'), exportRun.click()]);
  const runText = readFileSync(await runDownload.path(), 'utf8');
  expect(runText).toContain('As Taught — Desire Paths');
  expect(runText).toContain('## Segments');
  expect(runText).toContain('export_schema_version: 1');

  // 5. Export a whole-library backup, then restore it (merge) back through the UI.
  await page.getByTestId('detail-back').click();
  await expect(page.locator('[data-screen="library"]')).toBeVisible();
  const [backupDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('export-backup').click(),
  ]);
  const backupPath = await backupDownload.path();
  expect(readFileSync(backupPath, 'utf8')).toContain('"backup_schema_version": 1');

  await page.getByTestId('restore-file').setInputFiles(backupPath);
  await expect(page.getByTestId('restore-confirm')).toBeVisible();
  await page.getByTestId('restore-merge').click();
  await idle(page);

  // Merge of the same library is idempotent: the one class is still present, once.
  await expect(page.getByTestId('class-desire-paths-2026-07-28')).toBeVisible();
  await expect(page.locator('.library__row')).toHaveCount(1);
});
