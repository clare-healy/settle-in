import { defineConfig } from '@playwright/test';

// Settle In — production-build PWA suite (M6).
//
// SCOPE: real-Chromium evidence against the PRODUCTION bundle served by `vite preview`
// (service worker live, fonts/icons bundled, CSP enforced): persistence across a
// genuine browser-process kill (H3), an offline-shell smoke check (A2 SMOKE), and the
// A5 update-deferral close/reopen path. Per the build-plan test-gate-honesty amendment,
// these are NOT acceptance evidence for the A-series or G-series — the Pixel 6 checklist
// (M7) is. The flow harness (playwright.config.ts, dev server) is separate and unchanged.
//
// These specs manage their own persistent Chromium via launchPersistentContext (see
// pwa-helpers.ts), so there is no shared browser fixture — just a single serial worker.

const PORT = 4173;
const BASE = `http://localhost:${PORT}/settle-in/`;

export default defineConfig({
  testDir: './e2e-pwa',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list']],
  timeout: 90_000,
  expect: { timeout: 15_000 },
  projects: [{ name: 'pwa-chromium' }],
  webServer: {
    // Build the production bundle (runs the SW precache audit), then serve it.
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: BASE,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
