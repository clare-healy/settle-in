// Every screen's primary action must be REACHABLE — visible in the viewport, or
// reachable by scrolling the surface the finger actually lands on.
//
// This suite exists because a real blocker shipped: Prep's inner scroll region grew
// to fit its content (no bounded ancestor height), stopped being scrollable, and —
// still registered as a scroll container with overscroll-behavior: contain —
// swallowed the touch drag instead of chaining it to the document. Begin Class sat
// ~880px below the fold and the class could not be started on the Pixel.
//
// Nothing in the existing suites could see it: the DOM tests run in happy-dom, which
// has no layout engine (all geometry is zero), and no flow spec asserted that a
// primary action was actually on screen. These checks use real Chromium layout at
// both normal and 125% Android font scaling (acceptance J1/J3).

import { test, expect, type Page } from '@playwright/test';
import { openHome, begin, reference, jul28 } from './helpers.js';

/** Primary action is inside the viewport right now. */
async function expectActionOnScreen(page: Page, name: RegExp): Promise<void> {
  const action = page.getByRole('button', { name });
  await expect(action).toBeVisible();
  const box = await action.boundingBox();
  const viewport = page.viewportSize();
  expect(box, 'the action has no layout box').not.toBeNull();
  expect(viewport).not.toBeNull();
  const top = Math.round(box!.y);
  const bottom = Math.round(box!.y + box!.height);
  expect(
    top >= 0 && bottom <= viewport!.height,
    `action is outside the viewport (top ${top}, bottom ${bottom}, viewport ${viewport!.height})`,
  ).toBe(true);
}

/** A surface that traps the gesture must actually have something to scroll. */
async function expectNoDeadGestureTrap(page: Page, selector: string): Promise<void> {
  const state = await page.locator(selector).evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      overflows: el.scrollHeight > el.clientHeight,
      isScrollContainer: /auto|scroll/.test(style.overflowY),
      containsOverscroll: style.getPropertyValue('overscroll-behavior-y') === 'contain',
    };
  });
  // A container that contains the scroll chain but cannot scroll is the exact
  // failure mode that stranded Begin Class: the drag goes nowhere at all.
  if (state.isScrollContainer && state.containsOverscroll) {
    expect(
      state.overflows,
      `${selector} contains the scroll gesture but has nothing to scroll — ` +
        'a drag inside it will not move anything',
    ).toBe(true);
  }
}

for (const scale of [1, 1.25]) {
  const label = scale === 1 ? 'normal font scale' : '125% font scale';

  test(`Prep: Begin Class stays reachable and the sequence scrolls (${label})`, async ({
    page,
  }) => {
    await openHome(page, jul28(19, 0));
    if (scale !== 1) {
      // Android font scaling raises the effective root font size.
      await page.addStyleTag({ content: `html { font-size: ${16 * scale}px !important; }` });
    }
    await page.getByRole('button', { name: /Open Prep/ }).click();

    // The blocker: this sat ~880px below the fold and was unreachable.
    await expectActionOnScreen(page, /Begin Class/);
    await expectNoDeadGestureTrap(page, '.prep__scroll');

    const scroller = page.locator('.prep__scroll');
    const before = await scroller.evaluate((el) => el.scrollTop);
    await scroller.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    const after = await scroller.evaluate((el) => el.scrollTop);
    expect(after, 'the Prep sequence did not scroll').toBeGreaterThan(before);

    // Scrolling the sequence must never carry Begin Class off screen.
    await expectActionOnScreen(page, /Begin Class/);
  });
}

test('the expanded reference scrolls rather than trapping the gesture', async ({ page }) => {
  await openHome(page, jul28(19, 0));
  await begin(page);
  await reference(page);
  await expectNoDeadGestureTrap(page, '.reference__body');
});
