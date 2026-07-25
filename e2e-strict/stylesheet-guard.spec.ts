// The guard itself, under test.
//
// Every other strict spec opens by asserting the stylesheet applied. This spec
// proves the guard is real: it checks the production CSP is the strict one (hashed,
// no 'unsafe-inline'), that the page reports no style-blocking CSP violation, and
// that the guard's computed-style readings genuinely distinguish a styled document
// from an unstyled one.

import { test, expect } from '@playwright/test';
import { assertStylesheetApplied, watchForStyleViolations } from './strict-helpers.js';

test('the served document carries the strict production CSP', async ({ page }) => {
  await page.goto('./');
  const csp = await page.evaluate(
    () =>
      document
        .querySelector('meta[http-equiv="Content-Security-Policy"]')
        ?.getAttribute('content') ?? '',
  );
  expect(csp, 'no CSP meta tag in the built artifact').not.toBe('');
  expect(csp).toContain("style-src 'self' 'sha256-");
  expect(csp, 'the built artifact must NOT relax style-src').not.toContain('unsafe-inline');
  expect(csp).toContain("script-src 'self'");
});

test('the app stylesheet is present AND applied, with no CSP style refusals', async ({ page }) => {
  const violations = watchForStyleViolations(page);
  await page.goto('./');
  await assertStylesheetApplied(page);
  expect(violations, `CSP refused a stylesheet: ${violations.join(' | ')}`).toHaveLength(0);

  // A same-origin bundled sheet with readable rules — the real thing, not an
  // inline fragment. The critical inline background style is admitted by hash and
  // is not what any geometry assertion depends on.
  const linked = await page.evaluate(() =>
    [...document.styleSheets].filter((s) => s.href !== null).map((s) => s.href),
  );
  expect(linked.length, 'no linked stylesheet in the built artifact').toBeGreaterThan(0);
});

test('the guard would actually catch an unstyled document', async ({ page }) => {
  await page.goto('./');
  await assertStylesheetApplied(page);

  // Disable every linked sheet and confirm the guard's readings collapse — proof
  // the assertions are load-bearing and not trivially true.
  const unstyled = await page.evaluate(() => {
    for (const sheet of [...document.styleSheets]) {
      if (sheet.href !== null) sheet.disabled = true;
    }
    const app = document.getElementById('app')!;
    return {
      appDisplay: getComputedStyle(app).display,
      pondCharcoal: getComputedStyle(document.documentElement).getPropertyValue('--pond-charcoal').trim(),
    };
  });
  expect(unstyled.appDisplay).not.toBe('flex');
  expect(unstyled.pondCharcoal).toBe('');
});
