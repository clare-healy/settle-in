import { defineConfig } from 'vite';

// Settle In deploys to GitHub Pages under /settle-in/.
// The deployed result must remain a small static bundle (implementation treaty).
export default defineConfig({
  base: '/settle-in/',
});
