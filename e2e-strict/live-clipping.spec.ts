// J10 — the live surface must not clip.
//
// `.live` and `.live__stage` are both `overflow: hidden`, so `.screen`'s scroll
// safety net (`overflow-y: auto`) cannot rescue a live screen that overflows: a
// live screen that runs out of room simply loses content, silently, with no
// scrollbar and no gesture to recover it. That is the exact class of defect that
// stranded Begin Class on Prep, and the live surface has no net at all.
//
// The worst realistic combination is checked here: 100% and 125% font scale × the
// longest authored pose title (the boundary fixture's 36-character title, with its
// 150-character midpoint cue) × the wake-lock indicator present, eating a band off
// the top × Savasana, the densest live screen (six steps, the large clock, the close
// line, and the wake message).
//
// Any demonstrated clipping is fixed by REFLOWING the live hierarchy — never by
// making the live tap surface generically scrollable, which would put a scroll
// gesture on top of the Previous/Reference/Next tap map.

import { test, expect, type Page } from '@playwright/test';
import {
  advanceTo,
  assertStylesheetApplied,
  begin,
  boxOf,
  forceWakeLockUnavailable,
  next,
  openWith,
  setFontScale,
} from './strict-helpers.js';

interface Overflow {
  selector: string;
  scrollHeight: number;
  clientHeight: number;
  scrollWidth: number;
  clientWidth: number;
  overflowY: string;
}

/** Read the clipping state of the live containers and their content layer. */
async function overflowState(page: Page): Promise<Overflow[]> {
  return page.evaluate(() => {
    const selectors = ['.live', '.live__stage', '.live-content'];
    const out: Overflow[] = [];
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (!el) continue;
      const style = getComputedStyle(el);
      out.push({
        selector,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        overflowY: style.overflowY,
      });
    }
    return out;
  });
}

/** Nothing overflows a container that clips and cannot be scrolled. */
function expectNoClipping(state: Overflow[], context: string): void {
  expect(state.length, `${context}: no live containers found`).toBeGreaterThan(0);
  for (const s of state) {
    const clips = s.overflowY === 'hidden' || s.overflowY === 'clip';
    if (!clips) continue;
    expect(
      s.scrollHeight,
      `${context}: ${s.selector} clips ${s.scrollHeight - s.clientHeight}px of content vertically ` +
        'with no way to reach it',
    ).toBeLessThanOrEqual(s.clientHeight + 1);
    expect(
      s.scrollWidth,
      `${context}: ${s.selector} clips ${s.scrollWidth - s.clientWidth}px horizontally`,
    ).toBeLessThanOrEqual(s.clientWidth + 1);
  }
}

/** Every named critical element lies inside the clipping stage. */
async function expectInsideStage(page: Page, selectors: string[], context: string): Promise<void> {
  const stage = await boxOf(page.locator('.live__stage'), `${context} stage`);
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if ((await locator.count()) === 0) continue;
    const box = await boxOf(locator, `${context} ${selector}`);
    expect(box.y, `${context}: ${selector} is cut off at the top of the stage`).toBeGreaterThanOrEqual(
      stage.y - 0.5,
    );
    expect(
      box.y + box.height,
      `${context}: ${selector} runs past the bottom of the stage`,
    ).toBeLessThanOrEqual(stage.y + stage.height + 0.5);
    expect(box.x, `${context}: ${selector} is cut off on the left`).toBeGreaterThanOrEqual(stage.x - 0.5);
    expect(
      box.x + box.width,
      `${context}: ${selector} runs past the right of the stage`,
    ).toBeLessThanOrEqual(stage.x + stage.width + 0.5);
  }
}

for (const scale of [1, 1.25]) {
  const label = scale === 1 ? '100%' : '125%';

  test(`J10: the longest pose title does not clip the live surface (${label} font scale, indicator present)`, async ({
    page,
  }) => {
    await forceWakeLockUnavailable(page);
    await openWith(page, 'valid-boundary-content.md');
    await begin(page);
    await assertStylesheetApplied(page);
    await expect(page.getByTestId('wake-lock-retry')).toBeVisible();

    await next(page); // Grounding → the 36-character title
    await expect(page.locator('.pose-name')).toHaveText('Deeply Supported Reclining Butterfly');
    await setFontScale(page, scale);

    const context = `longest pose title @ ${label}`;
    expectNoClipping(await overflowState(page), context);
    await expectInsideStage(
      page,
      ['.pose-name', '[data-testid="wall-clock"]', '.timing-line', '[data-testid="drift"]', '[data-testid="midpoint"]'],
      context,
    );
  });

  test(`J10: Savasana does not clip the live surface (${label} font scale, indicator present)`, async ({
    page,
  }) => {
    await forceWakeLockUnavailable(page);
    await openWith(page, 'valid-boundary-content.md');
    await begin(page);
    await assertStylesheetApplied(page);
    await advanceTo(page, 'savasana');
    await setFontScale(page, scale);

    const context = `Savasana @ ${label}`;
    expectNoClipping(await overflowState(page), context);
    await expectInsideStage(
      page,
      ['.segment-label', '[data-testid="wall-clock"]', '.savasana__steps', '[data-testid="savasana-close"]'],
      context,
    );
    // All six steps are on screen, not just the ones that happened to fit.
    expect(await page.locator('.savasana__step').count()).toBe(6);
    for (const step of await page.locator('.savasana__step').all()) {
      await expect(step).toBeVisible();
    }
  });
}

test('J10: the live surface is never made generically scrollable', async ({ page }) => {
  // The forbidden fix, asserted against. A scrollable live layer would sit on top
  // of the Previous / Reference / Next tap map and turn every teaching tap into a
  // possible drag.
  await openWith(page, 'valid-desire-paths.md');
  await begin(page);
  await assertStylesheetApplied(page);
  const state = await overflowState(page);
  for (const s of state.filter((x) => x.selector !== '.live-content')) {
    expect(
      ['hidden', 'clip'],
      `${s.selector} became scrollable — the live tap surface must not scroll`,
    ).toContain(s.overflowY);
  }
});
