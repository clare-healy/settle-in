import { defineConfig, devices } from '@playwright/test';

// Settle In — STRICT-PRODUCTION layout suite (July 25, 2026 verification repair gate).
//
// WHY THIS EXISTS. Every layout-dependent result recorded before July 25, 2026 is
// void. The Playwright suites — the only tests with a real layout engine — ran
// against `npm run dev`, where the production CSP blocked Vite's injected <style>
// elements. They were therefore asserting geometry against an UNSTYLED document,
// which is how a fatal Prep blocker shipped past 250 green tests. The dev CSP
// relaxation in vite.config.ts fixes the dev flow, but a relaxed policy is wiring,
// never evidence.
//
// SCOPE: this project runs against the ACTUAL BUILT ARTIFACT served by `vite preview`
// under the REAL production CSP — the hashed `style-src 'self' 'sha256-…'`, no
// 'unsafe-inline'. Every spec's FIRST assertion is that the app stylesheet is
// present AND APPLIED (a real computed style, not merely a <link> in the DOM). That
// guard is precisely what the historic suites lacked. It covers Prep and expanded
// reference reachability, touch-target sizes, the live 20/60/20 zone ratios and
// gesture insets, wake-lock indicator non-overlap, the long boundary fixture, J9's
// tap-highlight cascade, and J10's live-surface clipping check.
//
// It is still CI evidence, not acceptance evidence: per acceptance-tests § J, a CI
// result never satisfies a J-series criterion on its own. The physical Pixel 6
// (docs/device-checklist.md) remains the acceptance authority for font scaling, safe
// areas, gestures, keyboard-open Import, dialogs, browser versus installed mode, the
// actual tap flash, wake lock, and dim-room use.
//
// The dev-only clock seam and library seed do NOT exist in this bundle by design, so
// specs import the fixture through the real Import UI and never pin the clock.

const PORT = 4174; // distinct from the PWA suite's 4173 so both can run
const BASE = `http://localhost:${PORT}/settle-in/`;

export default defineConfig({
  testDir: './e2e-strict',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list']],
  timeout: 90_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE,
    ...devices['Pixel 5'],
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'strict-chromium-pixel5', use: {} }],
  webServer: {
    // Build the production bundle (this runs the SW precache audit and the CSP hash
    // verification), then serve exactly what would be deployed.
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: BASE,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
