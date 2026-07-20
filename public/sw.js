/**
 * The Binding — Service Worker (PWA) v2
 * 
 * Strategies:
 * - Cache-first for static shell (HTML, manifest)
 * - Stale-while-revalidate for docs assets (JS, CSS, images)
 * - Cache-first with runtime caching for dice sounds (mp3)
 * - Network-first for API calls (fall back to cache)
 * - Offline fallback: serve offline.html when navigation fails
 */

const CACHE_VERSION = 'v2';
const CACHE_NAME = `the-binding-${CACHE_VERSION}`;
const DOCS_CACHE = `the-binding-docs-${CACHE_VERSION}`;
const SOUNDS_CACHE = `the-binding-sounds-${CACHE_VERSION}`;
const OFFLINE_CACHE = `the-binding-offline-${CACHE_VERSION}`;

// Shell assets pre-cached on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/create.html',
  '/manifest.json',
  '/offline.html'
];

// ── Install: pre-cache the shell ────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// ── Activate: clean old versioned caches ────────────────────────────────
self.addEventListener('activate', (event) => {
  const keepCaches = [CACHE_NAME, DOCS_CACHE, SOUNDS_CACHE, OFFLINE_CACHE];
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => !keepCaches.includes(key))
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// ── Fetch handler ───────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin GET requests
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // 1) API calls: network-first, fall back to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // 2) Dice sounds: cache-first with runtime population
  if (url.pathname.startsWith('/docs/assets/dice-box/sounds/')) {
    event.respondWith(
      caches.open(SOUNDS_CACHE).then((cache) => {
        return cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (response.ok) {
              cache.put(event.request, response.clone());
            }
            return response;
          });
        });
      })
    );
    return;
  }

  // 3) Docs assets (JS, CSS, images, HTML): stale-while-revalidate
  if (url.pathname.startsWith('/docs/')) {
    event.respondWith(
      caches.open(DOCS_CACHE).then((cache) => {
        return cache.match(event.request).then((cached) => {
          const networkFetch = fetch(event.request).then((response) => {
            if (response.ok) {
              cache.put(event.request, response.clone());
            }
            return response;
          }).catch(() => cached);

          // Return cached immediately if available, update in background
          return cached || networkFetch;
        });
      })
    );
    return;
  }

  // 4) Navigation requests: network-first, offline.html fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful navigation responses
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          // Try cache first, then offline fallback
          return caches.match(event.request).then((cached) => {
            return cached || caches.match('/offline.html');
          });
        })
    );
    return;
  }

  // 5) Static assets: cache-first, populate on miss
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(() => {
        // For non-navigation requests that fail with no cache, return nothing
        return new Response('', { status: 503, statusText: 'Offline' });
      });
    })
  );
});
