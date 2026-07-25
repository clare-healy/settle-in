// E3/E4/E6/E7/E8 — the two-minute hard-close message, gated on BOTH the clock and
// the segment. It is displayed only while the current segment is Savasana; on
// Grounding, a pose, or a transition nothing renders AND nothing is persisted, at
// any time (Q5a). It fades in once with the authored text; a reload after it has
// shown recovers with it present and NO replayed fade (the durable
// `wake_message_shown` latch). Regression/smoke only.

import { test, expect } from '@playwright/test';
import {
  openHome,
  begin,
  next,
  advanceSegments,
  setWall,
  idle,
  jul28,
  persistedEventCount,
} from './helpers.js';

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

test('E3: at 7:58 on a pose there is no callout and no persisted event; Savasana then shows it once', async ({
  page,
}) => {
  await openHome(page, jul28(19, 0));
  await begin(page);
  await next(page); // Supported Butterfly — a pose
  await expect(page.locator('.live')).toHaveAttribute('data-segment-type', 'pose');

  // The clock passes the eligibility time while a pose is current.
  await setWall(page, jul28(19, 58));
  await idle(page);

  // Nothing on screen…
  await expect(page.getByTestId('wake-callout')).toHaveCount(0);
  // …and nothing written. A rendering-only gate would fail here.
  expect(await persistedEventCount(page, 'wake_message_shown')).toBe(0);

  // Still nothing across the remaining poses and transitions.
  await advanceSegments(page, 13);
  await expect(page.locator('.live')).toHaveAttribute('data-segment-type', 'savasana');

  // Entering Savasana shows it immediately — exactly one appearance, one event.
  const callout = page.getByTestId('wake-callout');
  await expect(callout).toBeVisible();
  await expect(callout).toHaveText(WAKE_TEXT);
  await idle(page);
  expect(await persistedEventCount(page, 'wake_message_shown')).toBe(1);

  // Advancing a savasana step does not write a second one, nor replay the fade.
  await next(page);
  expect(await persistedEventCount(page, 'wake_message_shown')).toBe(1);
  await expect(page.getByTestId('wake-callout')).not.toHaveClass(/wake-callout--fade/);
});

test('E8: a run begun after the hard close shows nothing until Savasana, then once', async ({ page }) => {
  // 8:15 PM — a rehearsal later in the evening. Defined behavior, not a mode.
  await openHome(page, jul28(20, 15));
  await begin(page);

  // Grounding, already past the hard close: no message, nothing persisted.
  await expect(page.locator('.live')).toHaveAttribute('data-segment-type', 'grounding');
  await expect(page.getByTestId('wake-callout')).toHaveCount(0);
  expect(await persistedEventCount(page, 'wake_message_shown')).toBe(0);

  // Nothing on any pose or transition either.
  for (let i = 0; i < 13; i++) {
    await next(page);
    await expect(page.getByTestId('wake-callout')).toHaveCount(0);
  }
  expect(await persistedEventCount(page, 'wake_message_shown')).toBe(0);

  // Savasana: present immediately, once.
  await next(page);
  await expect(page.locator('.live')).toHaveAttribute('data-segment-type', 'savasana');
  await expect(page.getByTestId('wake-callout')).toHaveText(WAKE_TEXT);
  await idle(page);
  expect(await persistedEventCount(page, 'wake_message_shown')).toBe(1);

  // The `8:00 · hard close` indicator behavior is unchanged throughout.
  await expect(page.getByTestId('savasana-close')).toContainText('8:00');
  await expect(page.getByTestId('savasana-close')).toContainText('hard close');
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
