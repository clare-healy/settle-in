// Helpers for the strict-production layout suite.
//
// Everything here must work under the REAL production CSP: `style-src 'self'` plus
// one hash, no 'unsafe-inline'. That rules out `page.addStyleTag`, which injects a
// <style> element the policy refuses. Style manipulation therefore goes through
// CSSOM (`element.style` / `setProperty`), which CSP does not govern — the same
// mechanism the app itself uses at runtime. Playwright's `addInitScript` and
// `evaluate` run outside the page's script-src and are unaffected.

import { expect, type Page, type Locator } from '@playwright/test';
import { readFileSync } from 'node:fs';

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function rectsOverlap(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/**
 * THE GUARD. Every spec calls this first.
 *
 * Asserts the app's stylesheet is not merely present but APPLIED, by reading real
 * computed values that can only come from the bundled CSS:
 *   - `#app { display: flex }` (app.css) — an unstyled div computes `block`
 *   - `--pond-charcoal` resolves (tokens.css) — empty when the sheet is blocked
 *   - `.screen` has real padding (app.css)
 * It also fails on any CSP style violation reported by the page, which is the exact
 * failure that voided every pre-July-25 layout result.
 */
export async function assertStylesheetApplied(page: Page): Promise<void> {
  const state = await page.evaluate(() => {
    const app = document.getElementById('app');
    const screen = document.querySelector('.screen');
    const root = getComputedStyle(document.documentElement);
    return {
      sheets: document.styleSheets.length,
      appDisplay: app ? getComputedStyle(app).display : null,
      appHeight: app ? Math.round(app.getBoundingClientRect().height) : 0,
      pondCharcoal: root.getPropertyValue('--pond-charcoal').trim(),
      screenPadding: screen ? getComputedStyle(screen).paddingTop : null,
    };
  });

  expect(state.sheets, 'no stylesheet reached the document').toBeGreaterThan(0);
  expect(state.appDisplay, '#app is not flex — app.css did not apply').toBe('flex');
  expect(state.appHeight, '#app has no bounded height — app.css did not apply').toBeGreaterThan(100);
  expect(state.pondCharcoal, 'design tokens did not resolve — tokens.css did not apply').not.toBe('');
  expect(state.screenPadding, '.screen has no padding — app.css did not apply').not.toBe('0px');
}

/** Collect page console errors so a CSP refusal can never pass silently. */
export function watchForStyleViolations(page: Page): string[] {
  const violations: string[] = [];
  page.on('console', (msg) => {
    const text = msg.text();
    if (/Refused to (apply|load) .*style/i.test(text) || /Content Security Policy.*style/i.test(text)) {
      violations.push(text);
    }
  });
  return violations;
}

/** Import a fixture through the REAL Import UI — the prod bundle has no dev seed. */
export async function importFixture(page: Page, file: string): Promise<void> {
  const source = readFileSync(`fixtures/${file}`, 'utf8');
  await page.getByTestId('import-class').click();
  await page.getByTestId('import-source').fill(source);
  await page.getByTestId('import-validate').click();
  await page.getByTestId('import-confirm').click();
  await expect(page.getByTestId('upcoming-card')).toBeVisible();
}

/** Open the app, import a fixture, and assert the stylesheet actually applied. */
export async function openWith(page: Page, file: string): Promise<void> {
  await page.goto('./');
  await importFixture(page, file);
  await assertStylesheetApplied(page);
}

/** Open Prep and Begin; land on the live surface. */
export async function begin(page: Page): Promise<void> {
  await page.getByTestId('open-prep').click();
  await page.getByTestId('begin-class').click();
  await expect(page.locator('.live')).toBeVisible();
}

export function zone(page: Page, which: 'prev' | 'ref' | 'next'): Locator {
  return page.locator(`[data-zone="${which}"]`);
}

/** Tap Next and wait for the segment signature to change (no clock seam here). */
export async function next(page: Page): Promise<void> {
  const before = await segmentSignature(page);
  await zone(page, 'next').click({ force: true });
  await page
    .waitForFunction(
      (b) => {
        const live = document.querySelector('.live');
        const type = live?.getAttribute('data-segment-type') ?? '';
        const name = document.querySelector('.pose-name')?.textContent?.trim() ?? '';
        const side = document.querySelector('.pose-side')?.textContent?.trim() ?? '';
        const step = document.querySelector('.savasana__step--active')?.textContent?.trim() ?? '';
        return `${type}|${name}|${side}|${step}` !== b;
      },
      before,
      { timeout: 10_000 },
    )
    .catch(() => undefined);
}

export async function segmentSignature(page: Page): Promise<string> {
  return page.evaluate(() => {
    const live = document.querySelector('.live');
    const type = live?.getAttribute('data-segment-type') ?? '';
    const name = document.querySelector('.pose-name')?.textContent?.trim() ?? '';
    const side = document.querySelector('.pose-side')?.textContent?.trim() ?? '';
    const step = document.querySelector('.savasana__step--active')?.textContent?.trim() ?? '';
    return `${type}|${name}|${side}|${step}`;
  });
}

/** Advance until the live surface reports `type`, or throw. */
export async function advanceTo(page: Page, type: string, maxTaps = 30): Promise<void> {
  for (let i = 0; i < maxTaps; i++) {
    const current = await page.locator('.live').getAttribute('data-segment-type');
    if (current === type) return;
    await next(page);
  }
  throw new Error(`advanceTo: never reached "${type}" within ${maxTaps} taps`);
}

/** Advance until the named pose is current, or throw. */
export async function advanceToPose(page: Page, name: string, maxTaps = 30): Promise<void> {
  for (let i = 0; i < maxTaps; i++) {
    const current = await page.evaluate(
      () => document.querySelector('.pose-name')?.textContent?.trim() ?? '',
    );
    if (current === name) return;
    await next(page);
  }
  throw new Error(`advanceToPose: never reached "${name}" within ${maxTaps} taps`);
}

/**
 * Emulate an Android font-scale setting.
 *
 * The design system specifies type in px through the `--size-*` tokens, so raising
 * the root font size alone would barely move this layout. What Android's font-scale
 * setting actually does to the reader is make ALL text proportionally larger, so
 * that is what this reproduces: every type token is multiplied on :root through
 * CSSOM (CSP-safe), and the root font size is raised too for the `rem`/`ch`-derived
 * boxes. The Pixel 6 remains the acceptance authority for real Android font scaling.
 */
export async function setFontScale(page: Page, scale: number): Promise<void> {
  await page.evaluate((s) => {
    const root = document.documentElement;
    const tokens = [
      '--size-wall-clock',
      '--size-savasana-clock',
      '--size-pose-name',
      '--size-midpoint',
      '--size-body-cue',
      '--size-body',
      '--size-secondary',
      '--size-eyebrow',
    ];
    // ABSOLUTE, not relative: clear any previous override and re-read the stylesheet's
    // own values first, so calling this twice in one page never compounds the scale.
    root.style.removeProperty('font-size');
    for (const token of tokens) root.style.removeProperty(token);
    if (s === 1) return;

    const computed = getComputedStyle(root);
    const base: Record<string, number> = {};
    for (const token of tokens) base[token] = Number.parseFloat(computed.getPropertyValue(token));
    root.style.fontSize = `${16 * s}px`;
    for (const token of tokens) {
      const px = base[token];
      if (px !== undefined && Number.isFinite(px) && px > 0) {
        root.style.setProperty(token, `${px * s}px`);
      }
    }
  }, scale);
  // Let the browser settle the reflow before anything is measured.
  await page.waitForTimeout(50);
}

/** Force the platform to report no wake lock, so the quiet indicator renders. */
export async function forceWakeLockUnavailable(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: undefined });
  });
}

/** A bounding box that must exist. */
export async function boxOf(locator: Locator, label: string): Promise<Box> {
  const box = await locator.boundingBox();
  expect(box, `${label} has no layout box`).not.toBeNull();
  return box as Box;
}
