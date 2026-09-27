/*
  Service worker for "My Study Schedule".
  Strategy: cache-first for everything the app needs, with a network
  fallback and a same-origin-only rule so nothing tries to reach the
  internet. Bump CACHE_VERSION whenever you edit index.html so the
  new file gets installed instead of the old cached copy.
*/
const CACHE_VERSION = 'study-schedule-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

// Install: pre-cache the whole app shell so it's ready offline
// the moment the install finishes.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// Activate: drop any caches from older versions of the app.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_VERSION)
            .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first, falling back to network, falling back to the
// cached index.html for navigations (so deep links still open offline).
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET requests on our own origin — never proxy or cache
  // anything external, per the app's fully-offline requirement.
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
          }
          return response;
        })
        .catch(() => {
          if (req.mode === 'navigate') return caches.match('./index.html');
        });
    })
  );
});
