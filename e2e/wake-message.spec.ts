// E4/E6/E7 — the two-minute hard-close message. Fades in once with the authored
// text; a reload after it has shown recovers with it present and NO replayed fade
// (the durable wake_message_shown latch). Regression/smoke only.

import { test, expect } from '@playwright/test';
import { openHome, begin, next, advanceSegments, setWall, idle, jul28 } from './helpers.js';

const WAKE_TEXT = 'Two minutes. Time to begin the gentle awakening.';

test('E4/E7: the callout fades in once with the authored text, then does not re-fade', async ({ page }) => {
  await openHome(page, jul28(19, 0));
  await begin(page);
  await advanceSegments(page, 14); // to Savasana, before 7:58
  await expect(page.getByTestId('wake-callout')).toHaveCount(0);

  // Cross 7:58 — the callout appears once, verbatim, with the one-shot fade class.
  await setWall(page, jul28(19, 58));
  await idle(page);
  const callout = page.getByTestId('wake-callout');
  await expect(callout).toBeVisible();
  await expect(callout).toHaveText(WAKE_TEXT); // E7 authored text, verbatim
  await expect(callout).toHaveClass(/wake-callout--fade/);

  // A later structural render (advancing a savasana step) keeps it, no re-fade (E4).
  await next(page);
  const after = page.getByTestId('wake-callout');
  await expect(after).toHaveText(WAKE_TEXT);
  await expect(after).not.toHaveClass(/wake-callout--fade/);
});

test('E6: reload after the message has shown recovers it present, with no replayed fade', async ({ page }) => {
  await openHome(page, jul28(19, 0));
  await begin(page);
  await advanceSegments(page, 14);
  await setWall(page, jul28(19, 58));
  await idle(page); // persist wake_message_shown before reload
  await expect(page.getByTestId('wake-callout')).toHaveClass(/wake-callout--fade/);

  await page.reload(); // fresh execution over the same durable run, still after 7:58
  await expect(page.locator('[data-screen="recovery"]')).toBeVisible();
  await page.getByTestId('resume').click();
  await idle(page);

  const callout = page.getByTestId('wake-callout');
  await expect(callout).toBeVisible();
  await expect(callout).toHaveText(WAKE_TEXT);
  // The durable latch means the message is simply present — the fade never replays.
  await expect(callout).not.toHaveClass(/wake-callout--fade/);
});
