// Service-worker registration and the update handshake (M6).
//
// Registered ONLY in a production build, or in dev behind an explicit flag, so the
// Playwright flow harness (`npm run dev`) and local development never register a
// worker and never break. The A-series (install / offline) and the A5 update-timing
// behavior are verified against the production build in playwright.pwa.config.ts and,
// for real acceptance, on the Pixel 6 (M7).
//
// Update deferral (acceptance A5, implementation-treaty § Updates and migrations):
//   - A waiting worker is surfaced to the app, which shows §14's quiet
//     "Update ready · apply now" only OUTSIDE a run (Home / Library).
//   - Applying posts SKIP_WAITING and reloads once on controllerchange.
//   - The app NEVER asks to apply while a run is active; and this module never calls
//     skipWaiting on its own. After process death the browser may activate the
//     waiting worker naturally on the next launch — recovery is version-crossing and
//     is handled by the store's forward-only migrations before the recovery screen.

import type { AppController } from './app.js';

/** Whether to register at all: production always; dev only behind a local flag. */
function shouldRegister(): boolean {
  if (import.meta.env.PROD) return true;
  return (
    import.meta.env.DEV &&
    typeof localStorage !== 'undefined' &&
    localStorage.getItem('__settleInSW') === '1'
  );
}

export function registerServiceWorker(app: AppController): void {
  if (!shouldRegister()) return;
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  const base = import.meta.env.BASE_URL;
  const swUrl = `${base}sw.js`;

  // Reload only when WE accepted an update. The first install's clients.claim()
  // also fires controllerchange, and reloading on that would bounce the very first
  // page load — so the reload is gated on `applying`, set when apply() runs.
  let applying = false;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!applying || reloading) return;
    reloading = true;
    window.location.reload();
  });

  void navigator.serviceWorker
    .register(swUrl, { scope: base })
    .then((registration) => {
      const apply = (): void => {
        const waiting = registration.waiting;
        if (waiting) {
          applying = true;
          waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      };

      // A worker already waiting from a previous visit (this load did not create it).
      if (registration.waiting && navigator.serviceWorker.controller) {
        app.setUpdateReady(true, apply);
      }

      registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener('statechange', () => {
          // 'installed' with an existing controller means this is an UPDATE now
          // waiting — not the first install (which activates with no controller).
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            app.setUpdateReady(true, apply);
          }
        });
      });
    })
    .catch(() => {
      // Registration failure is non-fatal: the app still runs online. Quiet by
      // principle (never an alarm); the backup export remains the real safety net.
    });
}
