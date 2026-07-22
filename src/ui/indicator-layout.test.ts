// @vitest-environment happy-dom
//
// Wake-lock indicator layout (M4b Fix 1; screen-states § 14; wake-lock treaty).
//
// The M4a defect: the quiet `Screen may sleep · tap to retry` indicator overlapped
// the segment eyebrow on Grounding. The fix places the indicator in a reserved top
// band ABOVE the teaching stage (`.live__stage`), so it can never cover the segment
// label, wall clock, pose, or navigation affordances on any live screen.
//
// happy-dom has no layout engine (getBoundingClientRect is zero-sized), so this
// suite pins the STRUCTURAL invariant that makes overlap impossible by construction:
// the indicator is a sibling that precedes the stage and lives outside it, while the
// segment label and clock live inside it. The true bounding-box geometry assertion
// runs in the Playwright harness (e2e/indicator-overlap.spec.ts) under real layout.

import { describe, it, expect } from 'vitest';
import { bootApp, beginRun, advanceSegments, byId, type Harness } from './test-support.js';

// happy-dom exposes no navigator.wakeLock, so the app treats wake lock as
// unavailable and the indicator renders on every live screen — exactly the state
// this suite needs.

function assertReservedBand(h: Harness, screen: string): void {
  const indicator = byId(h.root, 'wake-lock-retry');
  const stage = byId(h.root, 'live-stage');

  // The indicator is a direct child of `.live`, not inside the teaching stage.
  const live = h.root.querySelector('.live');
  expect(live, `${screen}: .live present`).not.toBeNull();
  expect(indicator.parentElement, `${screen}: indicator is a direct child of .live`).toBe(live);
  expect(stage.contains(indicator), `${screen}: indicator is NOT inside the stage`).toBe(false);

  // It precedes the stage in DOM order — the reserved band sits above the content.
  const stageFollowsIndicator =
    (indicator.compareDocumentPosition(stage) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
  expect(stageFollowsIndicator, `${screen}: stage follows the indicator (band is on top)`).toBe(true);

  // The teaching content — segment label / pose name and the wall clock — lives
  // inside the stage, i.e. the band the indicator occupies holds no teaching content.
  const label = h.root.querySelector('.segment-label, .pose-name');
  const clock = byId(h.root, 'wall-clock');
  expect(label, `${screen}: a segment label / pose name is present`).not.toBeNull();
  expect(stage.contains(label as Node), `${screen}: label is inside the stage`).toBe(true);
  expect(stage.contains(clock), `${screen}: wall clock is inside the stage`).toBe(true);
  expect(indicator.contains(clock), `${screen}: indicator does not contain the clock`).toBe(false);
}

describe('wake-lock indicator reserved band (Fix 1)', () => {
  it('Grounding: indicator sits above the teaching stage, not over the segment label', async () => {
    const h = await bootApp();
    await beginRun(h);
    assertReservedBand(h, 'Grounding');
  });

  it('Pose: indicator sits above the pose name and clock', async () => {
    const h = await bootApp();
    await beginRun(h);
    await advanceSegments(h, 1); // Supported Butterfly
    assertReservedBand(h, 'Pose');
  });

  it('Transition: indicator sits above the transition label', async () => {
    const h = await bootApp();
    await beginRun(h);
    await advanceSegments(h, 2); // Transition: To Sleeping Swan
    assertReservedBand(h, 'Transition');
  });

  it('Savasana: indicator sits above the savasana content', async () => {
    const h = await bootApp();
    await beginRun(h);
    await advanceSegments(h, 14); // Savasana
    assertReservedBand(h, 'Savasana');
  });

  it('Savasana with the two-minute callout present: callout is inside the stage, indicator stays banded', async () => {
    const { jul28 } = await import('./test-support.js');
    const h = await bootApp({ wallEpochMs: jul28(19, 0) });
    await beginRun(h);
    await advanceSegments(h, 14); // Savasana
    h.clock.advance(jul28(19, 58) - h.clock.now().getTime());
    h.app.tick();

    const callout = byId(h.root, 'wake-callout');
    const stage = byId(h.root, 'live-stage');
    expect(stage.contains(callout)).toBe(true); // callout is teaching content, inside the stage
    assertReservedBand(h, 'Savasana + callout');
  });
});
