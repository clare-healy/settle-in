// Application entry point.
//
// Boots the AppController over the durable store and starts the 1 Hz tick and
// platform listeners. In development only, a guarded bootstrap seeds the library
// from the valid fixture so `npm run dev` shows something real; that import lives
// behind `import.meta.env.DEV` and a dynamic import, so no fixture content ships
// in the production bundle (verified by the build).

import { Store } from './store/index.js';
import { AppController } from './ui/app.js';

async function main(): Promise<void> {
  const root = document.getElementById('app');
  if (!root) throw new Error('missing #app root');

  const store = await Store.open();

  if (import.meta.env.DEV) {
    const { seedDevLibrary } = await import('./dev/bootstrap.js');
    await seedDevLibrary(store);
  }

  const app = await AppController.boot({ store, root });
  app.start();
}

void main();
