/// <reference lib="webworker" />
//
// Settle In service worker (M6). Hand-written, per the build plan: a versioned
// precache of the COMPLETE application shell, cache-first serving, same-origin
// navigation fallback to the app shell, and update deferral that never interrupts
// a live class (acceptance A5, implementation-treaty § Updates and migrations).
//
// This file is a CLASSIC worker script (no import/export) so it compiles to a
// plain same-origin sw.js. It is transformed by esbuild in the build plugin
// (vite-plugin-sw.ts) and type-checked separately under tsconfig.sw.json (the
// WebWorker lib), because the WebWorker and DOM libs cannot share the main
// tsconfig cleanly.
//
// The two build-injected tokens below are replaced by the plugin at build time:
//   '__CACHE_VERSION__'      → a content hash of the precache manifest
//   [/* __PRECACHE__ */]     → the scope-relative list of every emitted dist asset
// The plugin also AUDITS that every emitted asset appears in that list and fails
// the build otherwise, so the precache can never silently drift from the shell.

// The service-worker global. WebWorker lib types `self` as WorkerGlobalScope;
// narrow it here to the ServiceWorker scope without redeclaring the binding.
const scope = self as unknown as ServiceWorkerGlobalScope;

// --- Build-injected constants (see plugin) -----------------------------------
const CACHE_VERSION = '__CACHE_VERSION__';
const PRECACHE_PATHS: readonly string[] = [/* __PRECACHE__ */];

const CACHE_NAME = `settle-in-${CACHE_VERSION}`;

/** Absolute URL of the app shell (index.html) used as the navigation fallback. */
function shellUrl(): string {
  return new URL('index.html', scope.registration.scope).href;
}

/** Absolute URLs of every precache entry, resolved against the registration scope. */
function precacheUrls(): string[] {
  return PRECACHE_PATHS.map((p) => new URL(p, scope.registration.scope).href);
}

// --- Install: atomic precache of the complete shell --------------------------
// cache.addAll rejects if ANY request fails or returns a non-2xx response, so a
// partial shell can never be committed — installation fails atomically and the
// old worker keeps serving (build-plan amendment: SW lifecycle).
//
// No skipWaiting() here. On a FIRST install there is no controller, so this worker
// activates naturally and offline works immediately. On an UPDATE it enters the
// waiting state and stays there until the page explicitly asks (SKIP_WAITING),
// which the app only sends outside an active run (A5).
scope.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // cache: 'reload' bypasses the HTTP cache so a precache always fetches fresh
      // bytes for this version rather than a stale intermediary copy.
      const requests = precacheUrls().map((url) => new Request(url, { cache: 'reload' }));
      await cache.addAll(requests);
    })(),
  );
});

// --- Activate: drop superseded cache versions, then take control -------------
scope.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith('settle-in-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      );
      await scope.clients.claim();
    })(),
  );
});

// --- Fetch: cache-first within scope, shell fallback for navigations ---------
scope.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return; // never intercept writes/uploads

  const url = new URL(request.url);
  const inScope = url.href.startsWith(scope.registration.scope);
  if (!inScope) return; // cross-origin: pass through (CSP forbids these anyway)

  // Navigations (address bar, launcher launch, reload) resolve to the cached app
  // shell so a cold offline launch renders the app, never a browser offline page.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const shell = await cache.match(shellUrl(), { ignoreVary: true });
        if (shell) return shell;
        try {
          return await fetch(request);
        } catch {
          // Last resort if the shell somehow is not cached: an opaque 503 rather
          // than a thrown fetch (which the browser renders as its offline page).
          return new Response('', { status: 503, statusText: 'Offline' });
        }
      })(),
    );
    return;
  }

  // Everything else in scope (JS, CSS, fonts, icons, manifest): cache-first. The
  // whole shell is precached, so this is a cache hit offline; a miss falls back to
  // the network (and is cached for next time) for anything added post-install.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // ignoreVary: precached assets are fetched no-cors (no Origin header) but the
      // page requests module scripts / stylesheets in cors mode (with Origin), so a
      // Vary-sensitive match would miss the very assets we precached. The URL alone
      // identifies these fingerprinted, immutable files.
      const cached = await cache.match(request, { ignoreVary: true });
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok && response.type === 'basic') {
        cache.put(request, response.clone()).catch(() => undefined);
      }
      return response;
    })(),
  );
});

// --- Update handshake --------------------------------------------------------
// The page posts SKIP_WAITING only when it is safe to swap versions (outside a
// run, per A5). The worker then activates and the page reloads on controllerchange.
scope.addEventListener('message', (event) => {
  const data = event.data as { type?: string } | null;
  if (data && data.type === 'SKIP_WAITING') {
    void scope.skipWaiting();
  }
});
