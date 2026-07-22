import { defineConfig } from 'vite';
import { serviceWorkerPlugin } from './vite-plugin-sw';

// Settle In deploys to GitHub Pages under /settle-in/.
// The deployed result must remain a small static bundle (implementation treaty).
//
// The service-worker plugin compiles src/sw.ts to dist/sw.js after the bundle is
// written, injects a build-time precache manifest of the complete shell, and fails
// the build if any emitted asset is missing from it (precache audit).
export default defineConfig({
  base: '/settle-in/',
  plugins: [serviceWorkerPlugin()],
});
