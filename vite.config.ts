import { defineConfig, type Plugin } from 'vite';
import { serviceWorkerPlugin } from './vite-plugin-sw';

/**
 * The shipped CSP pins style-src to 'self' plus the hash of the one inline critical
 * style. That is correct for production — but Vite's dev server delivers every CSS
 * module by injecting <style> elements, whose hashes are not in the policy, so the
 * browser blocked ALL of the app's CSS in dev.
 *
 * The consequence was not cosmetic: the Playwright suites run against the dev server,
 * so every flow test was exercising an unstyled app with no layout. That is how a
 * fatal Prep layout bug (Begin Class stranded ~880px below the fold, unreachable on
 * the Pixel) shipped past 250 green tests.
 *
 * In dev only, allow inline styles so the dev server and the e2e suites see the real
 * stylesheet. The production build is untouched: it keeps the strict hashed policy,
 * still verified by the CSP audit in the service-worker plugin.
 */
function devCspPlugin(): Plugin {
  return {
    name: 'settle-in-dev-csp',
    apply: 'serve',
    transformIndexHtml(html) {
      // The hash must be DROPPED, not appended to: per CSP, 'unsafe-inline' is
      // ignored in any directive that also carries a hash or nonce source. Leaving
      // the hash in place would silently keep every dev stylesheet blocked.
      // Anchored on "style-src 'self'" so it targets the real directive and not the
      // explanatory comment above the meta tag, which also contains "style-src".
      return html.replace(/style-src 'self'[^;"]*/, "style-src 'self' 'unsafe-inline'");
    },
  };
}

// Settle In deploys to GitHub Pages under /settle-in/.
// The deployed result must remain a small static bundle (implementation treaty).
//
// The service-worker plugin compiles src/sw.ts to dist/sw.js after the bundle is
// written, injects a build-time precache manifest of the complete shell, and fails
// the build if any emitted asset is missing from it (precache audit).
export default defineConfig({
  base: '/settle-in/',
  plugins: [devCspPlugin(), serviceWorkerPlugin()],
});
