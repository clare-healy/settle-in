// Application entry point.
//
// Boots the AppController over the durable store and starts the 1 Hz tick and
// platform listeners. In development only, a guarded bootstrap seeds the library
// from the valid fixture so `npm run dev` shows something real; that import lives
// behind `import.meta.env.DEV` and a dynamic import, so no fixture content ships
// in the production bundle (verified by the build).

import { Store } from './store/index.js';
import { AppController, type AppOptions } from './ui/app.js';
import { registerServiceWorker } from './ui/sw-registration.js';

async function main(): Promise<void> {
  const root = document.getElementById('app');
  if (!root) throw new Error('missing #app root');

  const store = await Store.open();
  let options: AppOptions = { store, root };
  let onBoot: ((app: AppController) => void) | null = null;

  if (import.meta.env.DEV) {
    const { seedDevLibrary } = await import('./dev/bootstrap.js');
    await seedDevLibrary(store);

    // Narrow, dev-only clock seam for the Playwright flow harness. The whole block
    // is behind import.meta.env.DEV (statically false in production), so the seam
    // and its window surface are tree-shaken from the production bundle.
    const { installTestClock } = await import('./dev/test-clock.js');
    const seam = installTestClock();
    if (seam) {
      options = {
        ...options,
        clock: seam.clock,
        offsetMinutes: seam.offsetMinutes,
        executionId: seam.executionId,
      };
      onBoot = (app) => {
        const hooks = window as unknown as {
          __settleInTick?: () => void;
          __settleInIdle?: () => Promise<void>;
        };
        // Force a re-tick after the harness advances window.__settleInTestClock.
        hooks.__settleInTick = () => app.tick();
        // Await the single-flight action chain so the harness advances deterministically
        // (a too-fast next tap is otherwise rejected 'busy' by the run machine's guard).
        hooks.__settleInIdle = () => app.idle();
      };
    }
  }

  const app = await AppController.boot(options);
  app.start();
  onBoot?.(app);

  // Register the service worker (production build, or dev behind __settleInSW).
  // Surfaces §14's "Update ready" outside a run; never interrupts a live class.
  registerServiceWorker(app);
}

void main();
