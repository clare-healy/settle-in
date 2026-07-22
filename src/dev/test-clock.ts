// Dev-only test-clock seam.
//
// Imported ONLY behind `import.meta.env.DEV` (see src/main.ts) via a dynamic
// import, so this module — and the `__settleInTestClock` / `__settleInTick`
// surface — is tree-shaken out of the production build (verified by the build:
// no `__settleInTestClock` string in dist). It exists solely so the Playwright
// flow harness can pin and advance wall + monotonic time by setting
// `window.__settleInTestClock` BEFORE the app boots (page.addInitScript).
//
// Production always uses the real SystemClock; nothing here can run unless the
// DEV bundle is being served. This is the narrow injection seam the M4b work
// order calls for — no timing math lives here; it only feeds the model's Clock.

import { isoOffsetMinutes, type Clock } from '../model/index.js';

interface TestClockState {
  wallEpochMs: number;
  monotonic?: number;
  offsetMinutes?: number;
  executionId?: string;
}

export interface TestClockSeam {
  readonly clock: Clock;
  readonly offsetMinutes: number;
  readonly executionId?: string;
}

/**
 * If the harness installed `window.__settleInTestClock`, return a Clock that reads
 * it LIVE (advancing the state and re-ticking moves displayed time) plus the pinned
 * offset and, when provided, execution identity. Returns null when the seam is not
 * present — then the app uses its normal SystemClock. Omitting `executionId` lets a
 * simulated reload regenerate a fresh identity, the honest process-death behavior.
 */
export function installTestClock(): TestClockSeam | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { __settleInTestClock?: TestClockState };
  const state = w.__settleInTestClock;
  if (!state || typeof state.wallEpochMs !== 'number') return null;

  const clock: Clock = {
    now: () => new Date(w.__settleInTestClock!.wallEpochMs),
    monotonicNow: () => {
      const s = w.__settleInTestClock!;
      return typeof s.monotonic === 'number' ? s.monotonic : s.wallEpochMs;
    },
  };

  return {
    clock,
    offsetMinutes:
      typeof state.offsetMinutes === 'number' ? state.offsetMinutes : isoOffsetMinutes(clock.now()),
    executionId: typeof state.executionId === 'string' ? state.executionId : undefined,
  };
}
