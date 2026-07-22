// H3-class — run recovery across a genuine browser-process kill.
//
// Begin a run, advance to a known segment, SIGKILL the browser process tree (a true
// crash — no graceful unload, no beforeunload flush), then relaunch on the same profile.
// Run Recovery must appear and resume to the EXACT segment, proving the run was durably
// persisted before the UI acknowledged each step (persist-before-acknowledge, H1/H3).
//
// This is desktop-Chromium evidence. The Pixel 6 forced-termination pass (M7) remains
// the device truth.

import { test, expect } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  launchProfile,
  importFixture,
  begin,
  advanceToPose,
  segmentSignature,
  PWA_URL,
} from './pwa-helpers.js';

const TARGET = 'Sleeping Swan';

test('H3: a killed run recovers to the exact segment on relaunch', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'settle-in-recover-'));

  // First life: import, begin, advance to the target segment.
  const first = await launchProfile(dir);
  await first.page.goto(PWA_URL);
  await importFixture(first.page);
  await begin(first.page);
  await advanceToPose(first.page, TARGET);
  const before = await segmentSignature(first.page);
  expect(before).toContain(TARGET);

  // Persist-before-acknowledge means the rendered segment is already durable; a short
  // settle guards against a tap still in flight, then kill the process tree outright.
  await first.page.waitForTimeout(300);
  first.kill();
  await Promise.race([
    first.ctx.close().catch(() => undefined),
    new Promise((r) => setTimeout(r, 1500)),
  ]);

  // Second life on the same profile: Run Recovery to the exact segment.
  const second = await launchProfile(dir);
  try {
    await second.page.goto(PWA_URL);
    await expect(second.page.getByTestId('resume')).toBeVisible();
    await expect(second.page.getByText(TARGET).first()).toBeVisible();

    await second.page.getByTestId('resume').click();
    await expect(second.page.locator('.live')).toBeVisible();

    const after = await segmentSignature(second.page);
    expect(after).toBe(before);
  } finally {
    await second.ctx.close();
    await rm(dir, { recursive: true, force: true });
  }
});
