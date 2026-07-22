// A5 — safe update timing (the close/reopen amendment test).
//
// With a run active, a newer service worker is made available (a bumped sw.js served
// from disk). It must INSTALL and WAIT but never activate while the run client lives —
// no reload, no version swap, no update prompt mid-class. Then, after the client closes
// and reopens, the new worker activates and Run Recovery still lands on the exact
// segment (recovery is version-crossing).

import { test, expect } from '@playwright/test';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  launchProfile,
  importFixture,
  begin,
  advanceToPose,
  segmentSignature,
  waitForController,
  PWA_URL,
} from './pwa-helpers.js';

const SW_PATH = 'dist/sw.js';
const TARGET = 'Sleeping Swan';
const BUMPED = 'v-testbump';

test('A5: a waiting worker is deferred through the run and applies safely once it ends', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'settle-in-update-'));
  const original = await readFile(SW_PATH, 'utf8');
  const origVersion = original.match(/CACHE_VERSION = "([^"]*)"/)?.[1] ?? '';
  expect(origVersion).not.toBe('');

  try {
    // First life: import, begin, advance, and take control by the current SW.
    const first = await launchProfile(dir);
    await first.page.goto(PWA_URL);
    await importFixture(first.page);
    await begin(first.page);
    await advanceToPose(first.page, TARGET);
    await waitForController(first.page);
    const before = await segmentSignature(first.page);
    expect(before).toContain(TARGET);

    // Publish a newer worker: bump the cache version so sw.js bytes differ.
    const bumped = original.replace(/CACHE_VERSION = "[^"]*"/, `CACHE_VERSION = "${BUMPED}"`);
    expect(bumped).not.toBe(original);
    await writeFile(SW_PATH, bumped, 'utf8');

    // Mark the page so a reload would be detectable, then trigger an update check.
    await first.page.evaluate(() => {
      (window as unknown as { __noReload: boolean }).__noReload = true;
    });
    await first.page.evaluate(async () => {
      const r = await navigator.serviceWorker.getRegistration();
      await r?.update();
    });

    // The new worker installs and WAITS.
    await first.page.waitForFunction(
      async () => {
        const r = await navigator.serviceWorker.getRegistration();
        return !!r?.waiting;
      },
      null,
      { timeout: 15000 },
    );

    // A5 assertions while the run is live:
    //  - the run surface is untouched (no reload, still on the live screen)
    //  - the new worker has NOT activated: it installed and precached (its cache may
    //    exist) but the OLD version's cache is still present — activation would have
    //    deleted it — so no version swap happened
    //  - §14's update pill is NOT shown during a run
    expect(await first.page.evaluate(() => (window as unknown as { __noReload: boolean }).__noReload)).toBe(true);
    await expect(first.page.locator('.live')).toBeVisible();
    await expect(first.page.getByTestId('update-ready')).toHaveCount(0);
    const midRunCaches = await first.page.evaluate(() => caches.keys());
    expect(midRunCaches).toContain(`settle-in-${origVersion}`); // old cache intact → not activated

    // Close the client (the whole browser), then reopen on the same profile.
    await Promise.race([
      first.ctx.close().catch(() => undefined),
      new Promise((r) => setTimeout(r, 1500)),
    ]);

    const second = await launchProfile(dir);
    await second.page.goto(PWA_URL);

    // Reopened with the run still active → Run Recovery, and the update stays
    // deferred: the new worker is installed and waiting, but the old version is
    // still in control (its cache intact) and no pill shows during recovery. Per
    // the treaty a waiting worker MAY activate on process death but is not required
    // to, so the app never forces it while a run is live.
    await expect(second.page.getByTestId('resume')).toBeVisible();
    await waitForController(second.page);
    await expect(second.page.getByText(TARGET).first()).toBeVisible(); // recovered the exact segment across the version boundary
    await expect(second.page.getByTestId('update-ready')).toHaveCount(0);
    const reopenCaches = await second.page.evaluate(() => caches.keys());
    expect(reopenCaches).toContain(`settle-in-${origVersion}`); // still not activated

    // Resume proves recovery lands on the EXACT segment, version-crossing.
    await second.page.getByTestId('resume').click();
    await expect(second.page.locator('.live')).toBeVisible();
    expect(await segmentSignature(second.page)).toBe(before);

    // End the run → an idle screen. Now §14's update pill appears and applying it
    // activates the new version safely (A5's supported activation path): skipWaiting,
    // the old cache is cleaned on activate, and the page reloads onto the new version.
    await second.page.evaluate(() => history.back());
    await second.page.getByTestId('end-this-run').click();
    await second.page.getByTestId('confirm-end-run').click();

    await expect(second.page.getByTestId('update-ready')).toBeVisible();
    await second.page.getByTestId('update-ready').click();

    // controllerchange → reload onto the bumped version; the old cache is gone.
    await second.page.waitForFunction(
      async ({ bumped, old }) => {
        const keys = await caches.keys();
        return keys.includes(`settle-in-${bumped}`) && !keys.includes(`settle-in-${old}`);
      },
      { bumped: BUMPED, old: origVersion },
      { timeout: 20000 },
    );

    await second.ctx.close();
  } finally {
    await writeFile(SW_PATH, original, 'utf8'); // never leave the bumped worker behind
    await rm(dir, { recursive: true, force: true });
  }
});
