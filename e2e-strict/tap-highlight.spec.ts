// J9 — no blue platform tap highlight, and a warm pressed state in its place.
//
// Clare's first practice run: "there's a blue flash when I tap." That is Android's
// default `-webkit-tap-highlight-color`, the platform's colour rather than ours, and
// in a dim studio it reads as a bright cool rectangle. It is suppressed globally
// (Q5b). Because `.zone` had no `:active` state at all, suppression alone would have
// left the full-height live zones with no feedback, so a static warm pressed state
// replaces it: a low-alpha Candlelight Amber inset edge plus a slight brightening of
// the zone's own affordance — never a full-zone fill and never an animation.
//
// This spec proves the CSS CASCADE under the real production CSP. The actual
// platform flash is a Pixel-only observation (docs/device-checklist.md).

import { test, expect } from '@playwright/test';
import { assertStylesheetApplied, begin, openWith } from './strict-helpers.js';

/** Chromium reports a fully transparent colour as `rgba(0, 0, 0, 0)`. */
const TRANSPARENT = 'rgba(0, 0, 0, 0)';

test('-webkit-tap-highlight-color computes to transparent everywhere', async ({ page }) => {
  await openWith(page, 'valid-desire-paths.md');
  await begin(page);
  await assertStylesheetApplied(page);

  const readings = await page.evaluate(() => {
    const selectors = ['html', 'body', '#app', '.live', '[data-zone="prev"]', '[data-zone="ref"]', '[data-zone="next"]'];
    const out: Record<string, string | null> = {};
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      out[sel] = el
        ? getComputedStyle(el).getPropertyValue('-webkit-tap-highlight-color').trim()
        : null;
    }
    return out;
  });

  for (const [selector, value] of Object.entries(readings)) {
    expect(value, `${selector} was not measured`).not.toBeNull();
    expect(value, `${selector} still carries a platform tap highlight`).toBe(TRANSPARENT);
  }
});

test('buttons outside the live surface are covered too', async ({ page }) => {
  await openWith(page, 'valid-desire-paths.md');
  await assertStylesheetApplied(page);
  const values = await page.evaluate(() =>
    [...document.querySelectorAll('button')].map((b) =>
      getComputedStyle(b).getPropertyValue('-webkit-tap-highlight-color').trim(),
    ),
  );
  expect(values.length, 'no buttons found on Home').toBeGreaterThan(0);
  for (const v of values) expect(v).toBe(TRANSPARENT);
});

test('the warm pressed state exists on .zone: a static amber inset edge, no fill, no animation', async ({
  page,
}) => {
  await openWith(page, 'valid-desire-paths.md');
  await begin(page);
  await assertStylesheetApplied(page);

  const pressed = await page.evaluate(() => {
    const found: { selector: string; boxShadow: string; background: string; animation: string; transition: string }[] = [];
    const walk = (rules: CSSRuleList): void => {
      for (const rule of [...rules]) {
        if (rule instanceof CSSMediaRule) {
          walk(rule.cssRules);
          continue;
        }
        if (!(rule instanceof CSSStyleRule)) continue;
        if (!/\.zone[^ ,]*:active/.test(rule.selectorText)) continue;
        found.push({
          selector: rule.selectorText,
          boxShadow: rule.style.boxShadow,
          background: `${rule.style.background} ${rule.style.backgroundColor}`.trim(),
          animation: rule.style.animation,
          transition: rule.style.transition,
        });
      }
    };
    for (const sheet of [...document.styleSheets]) {
      try {
        walk(sheet.cssRules);
      } catch {
        /* cross-origin sheets are not readable; none exist here */
      }
    }
    return found;
  });

  const edge = pressed.find((r) => r.boxShadow.includes('inset'));
  expect(edge, 'no .zone:active inset-edge rule found in the applied stylesheet').toBeTruthy();
  // Candlelight Amber (#D6A66A = 214, 166, 106) at low alpha.
  expect(edge!.boxShadow).toContain('214, 166, 106');

  // Never a full-zone fill: no pressed rule paints a background.
  for (const rule of pressed) {
    expect(rule.background.trim(), `${rule.selector} fills the zone`).toBe('');
    expect(rule.animation, `${rule.selector} animates`).toBe('');
  }

  // The affordance brightens as well, so the feedback is visible without the edge.
  const affordance = pressed.find((r) => /zone__chevron|zone__ref-hint/.test(r.selector));
  expect(affordance, 'the zone affordance does not brighten when pressed').toBeTruthy();
});

test('text selection stays enabled and the warm focus ring still works', async ({ page }) => {
  await openWith(page, 'valid-desire-paths.md');
  await assertStylesheetApplied(page);

  const selection = await page.evaluate(() => {
    const body = getComputedStyle(document.body);
    return {
      userSelect: body.userSelect || body.webkitUserSelect,
      cardSelect: (() => {
        const card = document.querySelector('[data-testid="upcoming-card"]');
        if (!card) return null;
        const s = getComputedStyle(card);
        return s.userSelect || s.webkitUserSelect;
      })(),
    };
  });
  expect(selection.userSelect, 'text selection was disabled on body').not.toBe('none');
  expect(selection.cardSelect, 'text selection was disabled on the class card').not.toBe('none');

  // Suppressing the tap highlight must not have suppressed the focus ring.
  const ring = await page.evaluate(() => {
    let outline = '';
    const walk = (rules: CSSRuleList): void => {
      for (const rule of [...rules]) {
        if (rule instanceof CSSMediaRule) {
          walk(rule.cssRules);
          continue;
        }
        if (rule instanceof CSSStyleRule && rule.selectorText.includes(':focus-visible')) {
          outline = rule.style.outline || outline;
        }
      }
    };
    for (const sheet of [...document.styleSheets]) {
      try {
        walk(sheet.cssRules);
      } catch {
        /* not readable */
      }
    }
    return outline;
  });
  expect(ring, 'no :focus-visible outline rule survives').not.toBe('');

  // And it actually renders. Keyboard focus (not programmatic .focus()) is what
  // makes :focus-visible match, so tab to the first focusable control.
  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return null;
    const s = getComputedStyle(el);
    return { tag: el.tagName, width: s.outlineWidth, style: s.outlineStyle };
  });
  expect(focused, 'Tab moved focus nowhere').not.toBeNull();
  expect(focused!.style, 'focus ring style').not.toBe('none');
  expect(Number.parseFloat(focused!.width), 'focus ring width').toBeGreaterThan(0);
});
