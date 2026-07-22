// Helpers for the production-build PWA suite (M6).
//
// These specs run against `vite preview` serving the real production bundle — the
// service worker is live, fonts and icons are bundled, and the CSP is enforced. This
// is the desktop-Chromium evidence tier: real IndexedDB persistence across a genuine
// browser-process kill, an offline-shell smoke check, and the A5 update-deferral
// close/reopen path. It is NOT acceptance evidence for the A-series or G-series —
// those pass only on the scripted physical Pixel 6 checklist (M7).
//
// Each profile is a real on-disk Chromium user-data dir (launchPersistentContext), so
// IndexedDB and the SW registration survive a relaunch. `kill()` SIGKILLs the browser
// process tree — a true crash, not a graceful close, so recovery is proven to read
// only durably-committed state (H3).

import { chromium, expect, type BrowserContext, type Page } from '@playwright/test';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

export const PWA_URL = process.env.SI_PWA_URL ?? 'http://localhost:4173/settle-in/';

/** Every descendant PID of `pid` (browser process tree lives under the test worker). */
function descendants(pid: number, acc = new Set<number>()): Set<number> {
  let kids: number[] = [];
  try {
    kids = execSync(`pgrep -P ${pid}`, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(Number);
  } catch {
    kids = [];
  }
  for (const k of kids) {
    if (!acc.has(k)) {
      acc.add(k);
      descendants(k, acc);
    }
  }
  return acc;
}

export interface Profile {
  ctx: BrowserContext;
  page: Page;
  /** SIGKILL the browser process tree spawned by this launch (a hard crash). */
  kill: () => void;
}

/** Launch a persistent Chromium on `userDataDir`, tracking its process tree for kill(). */
export async function launchProfile(userDataDir: string): Promise<Profile> {
  const before = descendants(process.pid);
  const ctx = await chromium.launchPersistentContext(userDataDir, { headless: true });
  const spawned = [...descendants(process.pid)].filter((p) => !before.has(p));
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  const kill = (): void => {
    for (const p of spawned) {
      try {
        process.kill(p, 'SIGKILL');
      } catch {
        /* already gone */
      }
    }
  };
  return { ctx, page, kill };
}

/** A stable signature of the live surface's current segment (type · name · side). */
export async function segmentSignature(page: Page): Promise<string> {
  return page.evaluate(() => {
    const live = document.querySelector('.live');
    const type = live?.getAttribute('data-segment-type') ?? '';
    const name = document.querySelector('.pose-name')?.textContent?.trim() ?? '';
    const side = document.querySelector('.pose-side')?.textContent?.trim() ?? '';
    return `${type}|${name}|${side}`;
  });
}

/** Import the valid fixture through the real Import UI (prod build has no dev seed). */
export async function importFixture(page: Page): Promise<void> {
  const source = readFileSync('fixtures/valid-desire-paths.md', 'utf8');
  await page.getByTestId('import-class').click(); // first-launch empty screen
  await page.getByTestId('import-source').fill(source);
  await page.getByTestId('import-validate').click();
  await page.getByTestId('import-confirm').click();
  await expect(page.getByTestId('upcoming-card')).toBeVisible();
}

/** Open Prep and Begin the class; land on the live surface. */
export async function begin(page: Page): Promise<void> {
  await page.getByTestId('open-prep').click();
  await page.getByTestId('begin-class').click();
  await expect(page.locator('.live')).toBeVisible();
}

/**
 * Advance the run (Next zone) until the current pose is `targetName`. Waits for the
 * segment signature to change after each tap so a too-fast tap is never dropped by
 * the single-flight guard; re-taps if a tap did not land.
 */
export async function advanceToPose(page: Page, targetName: string, maxTaps = 24): Promise<void> {
  // Read the pose name via evaluate (not a waiting locator): segments like Grounding
  // and Transition have no .pose-name element, and locator.textContent() would block.
  const currentName = (): Promise<string> =>
    page.evaluate(() => document.querySelector('.pose-name')?.textContent?.trim() ?? '');
  for (let i = 0; i < maxTaps; i++) {
    if ((await currentName()) === targetName) return;
    const before = await segmentSignature(page);
    await page.locator('[data-zone="next"]').click({ force: true });
    await page
      .waitForFunction(
        (b) => {
          const live = document.querySelector('.live');
          const type = live?.getAttribute('data-segment-type') ?? '';
          const name = document.querySelector('.pose-name')?.textContent?.trim() ?? '';
          const side = document.querySelector('.pose-side')?.textContent?.trim() ?? '';
          return `${type}|${name}|${side}` !== b;
        },
        before,
        { timeout: 5000 },
      )
      .catch(() => undefined);
  }
  throw new Error(`advanceToPose: did not reach "${targetName}" within ${maxTaps} taps`);
}

/** Wait until the service worker controls the page (activate + clients.claim). */
export async function waitForController(page: Page): Promise<void> {
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, {
    timeout: 15000,
  });
}
