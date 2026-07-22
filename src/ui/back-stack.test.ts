// Android system-back ordering (screen-states § Android system back; F5).
//
// jsdom/happy-dom model window.history weakly, so the ordering is unit-tested
// directly against the pure resolver here. The physical back-gesture / history
// sentinel behavior is verified on device and with Playwright (see the M4a report).

import { describe, it, expect } from 'vitest';
import { resolveBack, backIsIntercepted } from './back-stack.js';

describe('resolveBack — treaty order: dialog → reference → guard → history', () => {
  it('closes an open dialog first, above everything else', () => {
    expect(
      resolveBack({ dialogOpen: true, referenceExpanded: true, runActive: true }),
    ).toBe('close-dialog');
  });

  it('collapses an expanded reference before the leave guard', () => {
    expect(
      resolveBack({ dialogOpen: false, referenceExpanded: true, runActive: true }),
    ).toBe('collapse-reference');
  });

  it('opens the Leave Class guard during an active run', () => {
    expect(
      resolveBack({ dialogOpen: false, referenceExpanded: false, runActive: true }),
    ).toBe('open-leave-guard');
  });

  it('allows normal history outside a run', () => {
    expect(
      resolveBack({ dialogOpen: false, referenceExpanded: false, runActive: false }),
    ).toBe('allow-history');
  });

  it('never returns previous-pose and never silently exits a run', () => {
    // Every in-run state resolves to an in-app action, never allow-history.
    const inRun = { dialogOpen: false, referenceExpanded: false, runActive: true };
    expect(resolveBack(inRun)).not.toBe('allow-history');
    expect(backIsIntercepted(inRun)).toBe(true);
  });

  it('only a run-less, dialog-less, minimal state falls through to history', () => {
    expect(backIsIntercepted({ dialogOpen: false, referenceExpanded: false, runActive: false })).toBe(false);
  });
});
