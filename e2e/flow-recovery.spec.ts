// F7 — one active run (reload shows Recovery, not Home; no second begin offered).
// H2 — reload mid-pose recovers class, start, last segment/side, and exact elapsed.
// Real reload of a real IndexedDB-backed run. Regression/smoke only (H3 process
// death and the A-series remain device-only, M7).

import { test, expect } from '@playwright/test';
import { openHome, begin, next, setWall, idle, jul28 } from './helpers.js';

test('F7: reloading with an active run shows Run Recovery, not Home, and offers no new begin', async ({ page }) => {
  await openHome(page, jul28(19, 0));
  await begin(page);

  await page.reload();

  await expect(page.locator('[data-screen="recovery"]')).toBeVisible();
  await expect(page.getByTestId('resume')).toBeVisible();
  // Beginning another class is not offered while a run is active.
  await expect(page.getByTestId('upcoming-card')).toHaveCount(0);
  await expect(page.getByTestId('open-prep')).toHaveCount(0);
  await expect(page.getByTestId('begin-class')).toHaveCount(0);
});

test('H2: reload mid-pose recovers class, start time, last segment, and exact elapsed', async ({ page }) => {
  await openHome(page, jul28(19, 0));
  await begin(page); // Grounding entered at 7:00

  await setWall(page, jul28(19, 2));
  await next(page); // Supported Butterfly entered at 7:02
  await setWall(page, jul28(19, 5)); // 3:00 elapsed in the pose
  await expect(page.getByTestId('elapsed')).toHaveText('3:00');

  await page.reload();

  // Recovery shows the durable facts.
  await expect(page.locator('[data-screen="recovery"]')).toBeVisible();
  const rows = page.locator('.recovery__rows');
  await expect(rows).toContainText('Desire Paths'); // class title
  await expect(rows).toContainText('7:00'); // actual start
  await expect(rows).toContainText('Supported Butterfly'); // last active segment

  // Resume returns to the exact segment with elapsed recomputed from durable
  // timestamps (deterministic clock → exactly 3:00; tolerance ±1s allowed).
  await page.getByTestId('resume').click();
  await idle(page);
  await expect(page.locator('.pose-name')).toHaveText('Supported Butterfly');
  await expect(page.getByTestId('elapsed')).toHaveText(/^2:59$|^3:00$|^3:01$/);
});
