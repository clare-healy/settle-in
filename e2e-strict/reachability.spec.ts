// Re-proof of the reachability and touch-target evidence voided on July 25, 2026,
// now measured against the real built artifact under the production CSP (J1, J3).
//
// The original blocker: Prep's inner scroll region grew to fit its content, stopped
// being scrollable, and — still a scroll container with overscroll-behavior:contain
// — swallowed the touch drag. Begin Class sat ~880px below the fold. The old
// evidence was worthless because the stylesheet never applied at all.

import { test, expect, type Page } from '@playwright/test';
import {
  assertStylesheetApplied,
  begin,
  boxOf,
  importFixture,
  openWith,
  setFontScale,
  watchForStyleViolations,
} from './strict-helpers.js';

/** The action is inside the viewport right now. */
async function expectActionOnScreen(page: Page, name: RegExp): Promise<void> {
  const action = page.getByRole('button', { name });
  await expect(action).toBeVisible();
  const box = await boxOf(action, `action ${name}`);
  const viewport = page.viewportSize()!;
  expect(
    Math.round(box.y) >= 0 && Math.round(box.y + box.height) <= viewport.height,
    `action is outside the viewport (top ${Math.round(box.y)}, bottom ${Math.round(
      box.y + box.height,
    )}, viewport ${viewport.height})`,
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
  if (state.isScrollContainer && state.containsOverscroll) {
    expect(
      state.overflows,
      `${selector} contains the scroll gesture but has nothing to scroll — ` +
        'a drag inside it will not move anything',
    ).toBe(true);
  }
}

for (const scale of [1, 1.25]) {
  const label = scale === 1 ? '100% font scale' : '125% font scale';

  test(`Prep: Begin Class is reachable and the sequence scrolls (${label})`, async ({ page }) => {
    const violations = watchForStyleViolations(page);
    await openWith(page, 'valid-desire-paths.md');
    expect(violations).toHaveLength(0);

    await page.getByTestId('open-prep').click();
    await setFontScale(page, scale);
    await assertStylesheetApplied(page); // still styled after the scale change

    await expectActionOnScreen(page, /Begin Class/);
    await expectNoDeadGestureTrap(page, '.prep__scroll');

    const scroller = page.locator('.prep__scroll');
    const before = await scroller.evaluate((el) => el.scrollTop);
    await scroller.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    expect(
      await scroller.evaluate((el) => el.scrollTop),
      'the Prep sequence did not scroll',
    ).toBeGreaterThan(before);

    // Scrolling the sequence must never carry Begin Class off screen.
    await expectActionOnScreen(page, /Begin Class/);
  });
}

test('the expanded reference scrolls rather than trapping the gesture, at both scales', async ({
  page,
}) => {
  await openWith(page, 'valid-desire-paths.md');
  await begin(page);
  // Grounding's reference carries four fields; a pose carries all eight, so the
  // pose is the denser and more honest case.
  await page.locator('[data-zone="next"]').click({ force: true });
  await expect(page.locator('.pose-name')).toBeVisible();

  for (const scale of [1, 1.25]) {
    await setFontScale(page, scale);
    await page.locator('[data-zone="ref"]').click({ force: true });
    await expect(page.getByTestId('reference')).toBeVisible();
    await assertStylesheetApplied(page);
    await expectNoDeadGestureTrap(page, '.reference__body');

    // Close reference is reachable, and every authored cue field rendered.
    await expectActionOnScreen(page, /Close reference/);
    expect(await page.locator('.reference-field').count()).toBe(8);
    await page.getByTestId('close-reference').click();
    await expect(page.getByTestId('reference')).toHaveCount(0);
  }
});

test('J3: every primary touch target is at least 48 × 48 CSS pixels', async ({ page }) => {
  await openWith(page, 'valid-desire-paths.md');

  const atLeast48 = async (locator: ReturnType<Page['locator']>, label: string): Promise<void> => {
    const box = await boxOf(locator, label);
    expect(Math.round(box.width), `${label} width`).toBeGreaterThanOrEqual(48);
    expect(Math.round(box.height), `${label} height`).toBeGreaterThanOrEqual(48);
  };

  await page.getByTestId('open-prep').click();
  await atLeast48(page.getByTestId('begin-class'), 'Begin Class');

  await page.getByTestId('begin-class').click();
  await expect(page.locator('.live')).toBeVisible();
  await atLeast48(page.locator('[data-zone="prev"]'), 'Previous zone');
  await atLeast48(page.locator('[data-zone="ref"]'), 'Reference zone');
  await atLeast48(page.locator('[data-zone="next"]'), 'Next zone');

  // Dialog actions (the Leave guard, reached by the Android back gesture).
  await page.goBack();
  await expect(page.locator('[data-dialog="leave-guard"]')).toBeVisible();
  for (const btn of await page.locator('.sheet .btn').all()) {
    await atLeast48(btn, 'dialog action');
  }
  await page.getByTestId('return-to-class').click();

  // Finish, from the last savasana step.
  for (let i = 0; i < 30; i++) {
    if ((await page.locator('.live').getAttribute('data-segment-type')) === 'savasana') break;
    await page.locator('[data-zone="next"]').click({ force: true });
    await page.waitForTimeout(60);
  }
  for (let i = 0; i < 8; i++) {
    if (await page.getByTestId('finish-class').isVisible().catch(() => false)) break;
    await page.locator('[data-zone="next"]').click({ force: true });
    await page.waitForTimeout(60);
  }
  await atLeast48(page.getByTestId('finish-class'), 'Finish Class');

  // Resume, on the Run Recovery screen after a reload with an active run.
  await page.reload();
  await expect(page.locator('[data-screen="recovery"]')).toBeVisible();
  await assertStylesheetApplied(page);
  await atLeast48(page.getByTestId('resume'), 'Resume');
});

test('the long boundary fixture renders without clipping or truncation (J2)', async ({ page }) => {
  await page.goto('./');
  await importFixture(page, 'valid-boundary-content.md');
  await assertStylesheetApplied(page);
  await begin(page);

  // Grounding → the 36-character pose title.
  await page.locator('[data-zone="next"]').click({ force: true });
  await expect(page.locator('.pose-name')).toHaveText('Deeply Supported Reclining Butterfly');

  const stage = await boxOf(page.locator('.live__stage'), 'live stage');
  const title = await boxOf(page.locator('.pose-name'), 'pose name');
  const midpoint = await boxOf(page.getByTestId('midpoint'), 'midpoint cue');

  // Nothing runs past the clipping container in either direction.
  for (const [label, box] of [
    ['pose name', title],
    ['midpoint cue', midpoint],
  ] as const) {
    expect(box.y, `${label} above the stage`).toBeGreaterThanOrEqual(stage.y - 0.5);
    expect(box.y + box.height, `${label} below the stage`).toBeLessThanOrEqual(
      stage.y + stage.height + 0.5,
    );
    expect(box.x, `${label} left of the stage`).toBeGreaterThanOrEqual(stage.x - 0.5);
    expect(box.x + box.width, `${label} right of the stage`).toBeLessThanOrEqual(
      stage.x + stage.width + 0.5,
    );
  }

  // Text WRAPS, never truncates. Measuring scrollHeight here would be the wrong
  // instrument: these elements are `overflow: visible`, so a tall glyph box (the
  // 90px wall clock at line-height 1) legitimately reports scrollHeight > client
  // height while nothing is hidden. What matters is that no truncating CSS is in
  // force and that the authored copy is rendered in full.
  const copy = await page.evaluate(() =>
    ['.pose-name', '.midpoint'].map((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const s = getComputedStyle(el);
      return {
        sel,
        textOverflow: s.textOverflow,
        whiteSpace: s.whiteSpace,
        lineClamp: s.getPropertyValue('-webkit-line-clamp'),
        overflow: s.overflow,
        length: (el.textContent ?? '').length,
      };
    }),
  );
  for (const c of copy) {
    expect(c, 'boundary copy element missing').not.toBeNull();
    expect(c!.textOverflow, `${c!.sel} truncates with an ellipsis`).toBe('clip');
    expect(c!.whiteSpace, `${c!.sel} refuses to wrap`).not.toBe('nowrap');
    expect(['none', ''], `${c!.sel} clamps its lines`).toContain(c!.lineClamp);
    expect(c!.overflow, `${c!.sel} hides its own overflow`).toBe('visible');
  }
  expect(copy[0]!.length, 'the 36-character title is not rendered in full').toBe(36);
  expect(copy[1]!.length, 'the 150-character midpoint cue is not rendered in full').toBe(150);

  // The 280-character expanded cue is present in full in the reference.
  await page.locator('[data-zone="ref"]').click({ force: true });
  await expect(page.getByTestId('reference')).toBeVisible();
  const entry = await page.getByTestId('field-entry').locator('.reference-field__value').textContent();
  expect((entry ?? '').length).toBeGreaterThanOrEqual(280);
  await expectNoDeadGestureTrap(page, '.reference__body');
});
