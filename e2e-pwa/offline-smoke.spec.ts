// A2 — offline application-shell cache (SMOKE ONLY).
//
// After a production load with the service worker active, going offline and reloading
// must render the real app shell from cache, never the browser's offline page. This is
// CI smoke coverage of A2's mechanism; the device (airplane mode on the Pixel 6) remains
// the acceptance evidence, per the build-plan test-gate-honesty amendment.

import { test, expect } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { launchProfile, waitForController, PWA_URL } from './pwa-helpers.js';

test('A2 SMOKE: the app shell serves from cache when offline', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'settle-in-offline-'));
  const { ctx, page } = await launchProfile(dir);
  try {
    await page.goto(PWA_URL);
    await expect(page.locator('[data-screen]')).toBeVisible();

    // The service worker must install, activate, and take control (clients.claim).
    await waitForController(page);

    // Go offline at the network layer and cold-reload: the SW must serve the shell.
    await ctx.setOffline(true);
    await page.reload();

    await expect(page.locator('[data-screen]')).toBeVisible();
    // The real app renders its name — proof this is the shell, not a browser error page.
    await expect(page.getByText('Settle In').first()).toBeVisible();

    // The precached, fingerprinted stylesheet also served offline (no network).
    const cssOk = await page.evaluate(() => {
      const link = document.querySelector('link[rel="stylesheet"]') as HTMLLinkElement | null;
      return !!link && (link.sheet?.cssRules?.length ?? 0) > 0;
    });
    expect(cssOk).toBe(true);

    await ctx.setOffline(false);
  } finally {
    await ctx.close();
    await rm(dir, { recursive: true, force: true });
  }
});
