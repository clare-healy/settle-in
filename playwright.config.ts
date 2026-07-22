import { defineConfig, devices } from '@playwright/test';

// Settle In — Playwright flow harness (M4b).
//
// SCOPE: regression / smoke coverage ONLY, per the build-plan amendment
// "Test-gate honesty (node 4, NO)" (docs/build-plan.md) and the July 22 decision
// log. These specs prove flow wiring, recovery, guarded exits, the two-minute
// callout, the indicator layout, and the wake-lock REQUEST ordering under real
// Chromium layout. They are NEVER acceptance evidence for the A-series
// (install / offline) or the G-series (REAL wake-lock acquisition) — those pass
// only on the scripted physical Pixel 6 checklist (M7).
//
// Chromium only, Pixel 5 device profile (393×851 portrait, touch, DPR). The
// webServer runs `npm run dev`; its dev-only bootstrap seeds the fixture class into
// IndexedDB. Each test gets a fresh browser context, so IndexedDB starts empty and
// the class re-seeds on first load.

const BASE = 'http://localhost:5173/settle-in/';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list']],
  timeout: 30_000,
  expect: { timeout: 7_000 },
  use: {
    baseURL: BASE,
    ...devices['Pixel 5'],
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium-pixel5', use: {} }],
  webServer: {
    command: 'npm run dev',
    url: BASE,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
