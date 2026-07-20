/**
 * The Binding — Service Worker (PWA) v3
 * 
 * Strategies:
 * - Cache-first for static shell (HTML, manifest)
 * - Cache-first for static assets (CSS, JS, images) with runtime population
 * - Stale-while-revalidate for docs assets (JS, CSS, images)
 * - Cache-first with runtime caching for dice sounds (mp3)
 * - Network-first for API calls (fall back to cache)
 * - Offline fallback: serve offline.html when navigation fails
 * - Cache versioning and cleanup of old caches on activate
 */

const CACHE_VERSION = 'v3';
const CACHE_NAME = `the-binding-${CACHE_VERSION}`;
const STATIC_CACHE = `the-binding-static-${CACHE_VERSION}`;
const DOCS_CACHE = `the-binding-docs-${CACHE_VERSION}`;
const SOUNDS_CACHE = `the-binding-sounds-${CACHE_VERSION}`;
const OFFLINE_CACHE = `the-binding-offline-${CACHE_VERSION}`;

// All versioned cache names — only these survive activation
const ALL_CACHES = [CACHE_NAME, STATIC_CACHE, DOCS_CACHE, SOUNDS_CACHE, OFFLINE_CACHE];

// Shell assets pre-cached on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/create.html',
  '/manifest.json',
  '/offline.html'
];

// Static asset extensions — cache-first with runtime population
const STATIC_EXTENSIONS = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.webp', '.avif'];

/**
 * Check if a URL path has a static asset extension.
 */
function isStaticAsset(pathname) {
  const ext = pathname.substring(pathname.lastIndexOf('.')).toLowerCase();
  return STATIC_EXTENSIONS.includes(ext);
}

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
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => !ALL_CACHES.includes(key))
          .map((key) => {
            console.log(`[SW] Deleting old cache: ${key}`);
            return caches.delete(key);
          })
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
      fetch(event.request)
        .then((response) => {
          // Cache successful API GET responses for offline fallback
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(() => caches.match(event.request))
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

  // 4) Static assets (CSS, JS, images, fonts): cache-first, populate on miss
  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (response.ok) {
              cache.put(event.request, response.clone());
            }
            return response;
          }).catch(() => {
            return new Response('', { status: 503, statusText: 'Offline' });
          });
        });
      })
    );
    return;
  }

  // 5) Navigation requests: network-first, offline.html fallback
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

  // 6) Everything else: cache-first, populate on miss
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
        return new Response('', { status: 503, statusText: 'Offline' });
      });
    })
  );
});
