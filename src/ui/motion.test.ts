// @vitest-environment happy-dom
//
// Reduced motion (design-system § Motion; J6). With the media query stubbed to
// `reduce`, the segment/screen enter carries the reduced class contract — the
// positional settle is dropped in favor of a plain cross-fade.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { enterClass } from './motion.js';
import { bootApp, beginRun } from './test-support.js';

const here = dirname(fileURLToPath(import.meta.url));

type MatchMediaFn = (q: string) => MediaQueryList;
let original: MatchMediaFn | undefined;

function stubReducedMotion(reduce: boolean): void {
  (window as unknown as { matchMedia: MatchMediaFn }).matchMedia = ((query: string) =>
    ({
      matches: reduce && query.includes('reduce'),
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent() {
        return false;
      },
    }) as unknown as MediaQueryList) as MatchMediaFn;
}

describe('reduced motion', () => {
  beforeEach(() => {
    original = (window as unknown as { matchMedia?: MatchMediaFn }).matchMedia;
  });
  afterEach(() => {
    if (original) (window as unknown as { matchMedia: MatchMediaFn }).matchMedia = original;
  });

  it('enterClass drops the positional settle when reduce is requested', () => {
    stubReducedMotion(true);
    expect(enterClass()).toBe('screen-enter--reduced');
    stubReducedMotion(false);
    expect(enterClass()).toBe('screen-enter');
  });

  it('a segment render carries the reduced enter class under reduce', async () => {
    stubReducedMotion(true);
    const h = await bootApp();
    await beginRun(h);
    const live = h.root.querySelector('.live') as HTMLElement;
    expect(live.className).toContain('screen-enter--reduced');
    expect(live.className).not.toContain('screen-enter ');
  });

  it('the same render settles positionally when motion is allowed', async () => {
    stubReducedMotion(false);
    const h = await bootApp();
    await beginRun(h);
    const live = h.root.querySelector('.live') as HTMLElement;
    expect(live.classList.contains('screen-enter')).toBe(true);
    expect(live.classList.contains('screen-enter--reduced')).toBe(false);
  });

  it('the stylesheet also strips the settle under the reduced-motion media query', () => {
    // Belt-and-braces: even without the class contract, the media query itself
    // removes the positional transform (design-system § Motion).
    const css = readFileSync(join(here, 'styles', 'app.css'), 'utf8');
    const block = /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\n\}/.exec(css)?.[0] ?? '';
    expect(block).toContain('.screen-enter');
    expect(block).toContain('fade-enter'); // the non-positional fade replaces settle
    // fade-enter keyframes carry no transform (no positional settle).
    const fade = /@keyframes fade-enter\s*\{[^@]*?\}\s*\}/.exec(css)?.[0] ?? '';
    expect(fade).not.toContain('translateY');
  });
});
