// Re-proof of the live surface's geometry, voided on July 25, 2026: the 20/60/20
// tap map, the ≥12px gesture-edge insets, and the quiet wake-lock indicator's
// reserved band (screen-states § Live-run tap map and § 14; J3/J4).
//
// The old evidence measured an unstyled document, where the zones had no widths at
// all. Here the stylesheet is asserted applied before a single box is read.

import { test, expect } from '@playwright/test';
import {
  assertStylesheetApplied,
  advanceTo,
  begin,
  boxOf,
  forceWakeLockUnavailable,
  next,
  openWith,
  rectsOverlap,
  type Box,
} from './strict-helpers.js';

/** The gesture inset the treaty requires on every edge of the tap layer. */
const MIN_INSET = 12;

test('the tap zones are 20 / 60 / 20 and inset from every gesture edge', async ({ page }) => {
  await openWith(page, 'valid-desire-paths.md');
  await begin(page);
  await assertStylesheetApplied(page);

  const stage = await boxOf(page.locator('.live__stage'), 'live stage');
  const prev = await boxOf(page.locator('[data-zone="prev"]'), 'Previous zone');
  const ref = await boxOf(page.locator('[data-zone="ref"]'), 'Reference zone');
  const nextZone = await boxOf(page.locator('[data-zone="next"]'), 'Next zone');

  // Insets: the tappable layer never reaches the physical edge, where Android's
  // system gestures live.
  expect(prev.x - stage.x, 'left inset').toBeGreaterThanOrEqual(MIN_INSET - 0.5);
  expect(
    stage.x + stage.width - (nextZone.x + nextZone.width),
    'right inset',
  ).toBeGreaterThanOrEqual(MIN_INSET - 0.5);
  expect(prev.y - stage.y, 'top inset').toBeGreaterThanOrEqual(MIN_INSET - 0.5);
  expect(
    stage.y + stage.height - (prev.y + prev.height),
    'bottom inset',
  ).toBeGreaterThanOrEqual(MIN_INSET - 0.5);

  // Ratios, measured against the padded content width the three zones share.
  const content = prev.width + ref.width + nextZone.width;
  expect(content, 'the zones share no width').toBeGreaterThan(100);
  expect(prev.width / content, 'Previous share').toBeCloseTo(0.2, 2);
  expect(ref.width / content, 'Reference share').toBeCloseTo(0.6, 2);
  expect(nextZone.width / content, 'Next share').toBeCloseTo(0.2, 2);

  // Contiguous and non-overlapping: no dead strip between the zones.
  expect(Math.abs(prev.x + prev.width - ref.x), 'gap between Previous and Reference').toBeLessThan(1);
  expect(Math.abs(ref.x + ref.width - nextZone.x), 'gap between Reference and Next').toBeLessThan(1);
});

test('the wake-lock indicator sits in its own band and never overlaps teaching content', async ({
  page,
}) => {
  await forceWakeLockUnavailable(page);
  await openWith(page, 'valid-desire-paths.md');
  await begin(page);
  await assertStylesheetApplied(page);
  await expect(page.getByTestId('wake-lock-retry')).toBeVisible();

  const assertBanded = async (screen: string): Promise<void> => {
    const indicator = await boxOf(page.getByTestId('wake-lock-retry'), `${screen} indicator`);
    const label = await boxOf(
      page.locator('.segment-label, .pose-name').first(),
      `${screen} label`,
    );
    const clock = await boxOf(page.getByTestId('wall-clock'), `${screen} clock`);
    const zones: Box = await boxOf(page.locator('[data-zone="next"]'), `${screen} Next zone`);

    expect(rectsOverlap(indicator, label), `${screen}: indicator overlaps the label`).toBe(false);
    expect(rectsOverlap(indicator, clock), `${screen}: indicator overlaps the clock`).toBe(false);
    expect(rectsOverlap(indicator, zones), `${screen}: indicator overlaps a tap zone`).toBe(false);
    expect(indicator.y + indicator.height, `${screen}: indicator above label`).toBeLessThanOrEqual(
      label.y + 0.5,
    );
    expect(indicator.y + indicator.height, `${screen}: indicator above clock`).toBeLessThanOrEqual(
      clock.y + 0.5,
    );
  };

  await assertBanded('Grounding');
  await next(page);
  await assertBanded('Pose');
  await advanceTo(page, 'transition');
  await assertBanded('Transition');
  await advanceTo(page, 'savasana');
  await assertBanded('Savasana');
});
