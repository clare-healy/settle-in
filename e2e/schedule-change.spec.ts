// C12 — one-screen scheduled-hour correction on the real Chromium UI.
// Regression/smoke only; the physical Pixel checklist remains the device gate.

import { test, expect } from '@playwright/test';
import { idle, jul28, openHome } from './helpers.js';

test('correct 6:00–7:00 to 6:30–7:30, then begin at 6:33 from the new revision', async ({ page }) => {
  await openHome(page, jul28(18, 33));
  await page.getByTestId('open-prep').click();
  await expect(page.getByTestId('prep-schedule')).toHaveText('Scheduled class · 7:00–8:00');

  await page.getByTestId('change-schedule').click();
  await expect(page.locator('[data-dialog="schedule-change"]')).toBeVisible();
  await expect(page.getByTestId('schedule-start')).toHaveValue('19:00');

  await page.getByTestId('schedule-start').fill('18:30');
  await expect(page.getByTestId('schedule-close')).toHaveText('7:30');
  await expect(page.locator('.sheet > [data-testid="confirm-schedule-change"]:last-child')).toBeVisible();
  await page.getByTestId('confirm-schedule-change').click();
  await idle(page);

  // One Change Schedule action returns directly to the revised Prep; there is no
  // second confirmation screen.
  await expect(page.locator('[data-dialog]')).toHaveCount(0);
  await expect(page.getByTestId('prep-schedule')).toHaveText('Scheduled class · 6:30–7:30');
  await expect(page.locator('.prep__sequence-window').first()).toHaveText('6:30–6:40');

  await page.getByTestId('begin-class').click();
  await idle(page);
  await expect(page.locator('.live')).toHaveAttribute('data-segment-type', 'grounding');
  await expect(page.locator('.planned-window')).toHaveText('6:30–6:40');
  await expect(page.getByTestId('drift')).toHaveText('+3 min');

  const persisted = await page.evaluate(
    () => new Promise<{ hardCloseAt: string; revisions: number }>((resolve, reject) => {
      const open = indexedDB.open('settle-in');
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const db = open.result;
        const tx = db.transaction(['runs', 'classes'], 'readonly');
        const runReq = tx.objectStore('runs').getAll();
        const classReq = tx.objectStore('classes').getAll();
        tx.oncomplete = () => {
          const runs = runReq.result as { hardCloseAt: string }[];
          resolve({ hardCloseAt: runs[0]?.hardCloseAt ?? '', revisions: classReq.result.length });
          db.close();
        };
        tx.onerror = () => reject(tx.error);
      };
    }),
  );
  expect(persisted).toEqual({ hardCloseAt: '2026-07-28T19:30:00-05:00', revisions: 2 });
});
