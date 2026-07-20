/**
 * The Binding — Service Worker (PWA) v5
 * 
 * Strategies:
 * - Cache-first for static shell (HTML, manifest)
 * - Cache-first for static assets (CSS, JS, images, fonts) with runtime population
 * - Stale-while-revalidate for docs assets (JS, CSS, images)
 * - Stale-while-revalidate for adventure manifests (manifests-*.js)
 * - Cache-first with runtime caching for dice sounds (mp3)
 * - Stale-while-revalidate for API reads (/api/adventures, /api/sessions/:id)
 * - Network-first for real-time endpoints (/api/sessions/:id/messages, /api/sessions/:id/actions)
 * - Network-first for session rejoin (/api/rejoin/*) with cache fallback
 * - Network-first with JSON fallback for unmatched API calls
 * - Offline fallback: serve offline.html when navigation fails
 * - IndexedDB session tracking for auto-rejoin on reconnect
 * - Cache versioning and cleanup of old caches on activate
 */

const CACHE_VERSION = 'v5';
const CACHE_NAME = `the-binding-${CACHE_VERSION}`;
const STATIC_CACHE = `the-binding-static-${CACHE_VERSION}`;
const DOCS_CACHE = `the-binding-docs-${CACHE_VERSION}`;
const SOUNDS_CACHE = `the-binding-sounds-${CACHE_VERSION}`;
const OFFLINE_CACHE = `the-binding-offline-${CACHE_VERSION}`;
const API_CACHE = `the-binding-api-${CACHE_VERSION}`;
const MANIFEST_CACHE = `the-binding-manifests-${CACHE_VERSION}`;

// All versioned cache names — only these survive activation
const ALL_CACHES = [CACHE_NAME, STATIC_CACHE, DOCS_CACHE, SOUNDS_CACHE, OFFLINE_CACHE, API_CACHE, MANIFEST_CACHE];

// Shell assets pre-cached on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/create.html',
  '/manifest.json',
  '/offline.html'
];

// Adventure manifest files to pre-cache for offline play
const MANIFEST_ASSETS = [
  '/manifests-act2.js',
  '/manifests-act3.js',
  '/manifests-act4.js',
  '/manifests-act5.js',
  '/manifests-frankenstein-act1.js',
  '/manifests-frankenstein-act2.js',
  '/manifests-frankenstein-act3.js',
  '/manifests-frankenstein-act4.js',
  '/manifests-frankenstein-act5.js',
  '/manifests-holmes-act1.js',
  '/manifests-holmes-act2.js',
  '/manifests-holmes-act3.js',
  '/manifests-holmes-act4.js',
  '/manifests-holmes-act5.js'
];

// Static asset extensions — cache-first with runtime population
const STATIC_EXTENSIONS = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.webp', '.avif'];

// API paths that benefit from stale-while-revalidate (read-heavy, not real-time)
const SWR_API_PATTERNS = [
  /^\/api\/adventures/,
  /^\/api\/sessions\/[^/]+$/,
  /^\/api\/sessions\/[^/]+\/state$/
];

// Real-time API paths — network-first, never serve stale
const REALTIME_API_PATTERNS = [
  /^\/api\/sessions\/[^/]+\/messages/,
  /^\/api\/sessions\/[^/]+\/actions/,
  /^\/api\/sessions\/[^/]+\/stream/
];

// Rejoin paths — network-first with cache fallback
const REJOIN_API_PATTERN = /^\/api\/rejoin\//;

// ── IndexedDB Session Tracker ──────────────────────────────────────────
const DB_NAME = 'the-binding-sw';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function dbPut(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ key, value, updatedAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function dbGet(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result ? req.result.value : null);
    req.onerror = () => reject(req.error);
  });
}

// ── Helpers ────────────────────────────────────────────────────────────

function isStaticAsset(pathname) {
  const ext = pathname.substring(pathname.lastIndexOf('.')).toLowerCase();
  return STATIC_EXTENSIONS.includes(ext);
}

function matchesAny(pathname, patterns) {
  return patterns.some(pattern => pattern.test(pathname));
}

// Track active session from API responses
function trackSession(url, response) {
  const sessionMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)/);
  if (sessionMatch && response.ok) {
    const sessionId = sessionMatch[1];
    dbPut('lastSessionId', sessionId).catch(() => {});
    dbPut('lastSessionUrl', url.pathname).catch(() => {});
  }
}

// ── Install: pre-cache shell + manifests ────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing v5...');
  
  event.waitUntil(
    Promise.all([
      // Cache shell assets
      caches.open(CACHE_NAME).then((cache) => {
        console.log('[SW] Pre-caching shell assets:', STATIC_ASSETS.length, 'files');
        return cache.addAll(STATIC_ASSETS);
      }),
      
      // Cache adventure manifests (best-effort — don't fail install if some 404)
      caches.open(MANIFEST_CACHE).then(async (cache) => {
        console.log('[SW] Pre-caching adventure manifests:', MANIFEST_ASSETS.length, 'files');
        const results = await Promise.allSettled(
          MANIFEST_ASSETS.map(async (url) => {
            try {
              const response = await fetch(url);
              if (response.ok) {
                await cache.put(url, response);
                console.log(`[SW] ✓ Cached manifest: ${url}`);
              } else {
                console.log(`[SW] ⚠ Manifest not found (${response.status}): ${url}`);
              }
            } catch (err) {
              console.log(`[SW] ⚠ Failed to fetch manifest: ${url}`, err.message);
            }
          })
        );
        const succeeded = results.filter(r => r.status === 'fulfilled').length;
        console.log(`[SW] Manifest pre-cache complete: ${succeeded}/${MANIFEST_ASSETS.length} attempted`);
      }),

      // Cache offline page in its own cache
      caches.open(OFFLINE_CACHE).then((cache) => {
        return cache.add('/offline.html');
      })
    ]).then(() => {
      console.log('[SW] Install complete — all caches populated');
    })
  );
  
  self.skipWaiting();
});

// ── Activate: clean old versioned caches ────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating v5...');
  
  event.waitUntil(
    caches.keys().then((keys) => {
      const oldKeys = keys.filter((key) => !ALL_CACHES.includes(key));
      console.log(`[SW] Cleaning ${oldKeys.length} old cache(s):`, oldKeys);
      return Promise.all(
        oldKeys.map((key) => {
          console.log(`[SW] Deleting old cache: ${key}`);
          return caches.delete(key);
        })
      );
    }).then(() => {
      console.log('[SW] Activation complete — claimed all clients');
    })
  );
  
  self.clients.claim();
});

// ── Message handler: allow page to update session tracking ──────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'TRACK_SESSION') {
    const { sessionId } = event.data;
    if (sessionId) {
      dbPut('lastSessionId', sessionId).catch(() => {});
      console.log(`[SW] Tracked active session: ${sessionId}`);
    }
  }
  
  if (event.data && event.data.type === 'GET_LAST_SESSION') {
    dbGet('lastSessionId').then((sessionId) => {
      if (event.source) {
        event.source.postMessage({
          type: 'LAST_SESSION',
          sessionId
        });
      }
    }).catch(() => {});
  }
});

// ── Fetch handler ───────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin GET requests
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // 1) Real-time API: network-first, never serve stale
  if (matchesAny(url.pathname, REALTIME_API_PATTERNS)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(API_CACHE).then((cache) => {
              cache.put(event.request, clone);
            });
            trackSession(url, response);
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            return cached || new Response(
              JSON.stringify({ error: 'offline', message: 'No cached data available. Reconnect to continue.' }),
              { status: 503, headers: { 'Content-Type': 'application/json' } }
            );
          });
        })
    );
    return;
  }

  // 2) Rejoin API: network-first with cache fallback
  if (REJOIN_API_PATTERN.test(url.pathname)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(API_CACHE).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            if (cached) {
              console.log(`[SW] Serving rejoin from cache: ${url.pathname}`);
              return cached;
            }
            return new Response(
              JSON.stringify({ error: 'offline', message: 'Rejoin data not cached. Reconnect to continue.' }),
              { status: 503, headers: { 'Content-Type': 'application/json' } }
            );
          });
        })
    );
    return;
  }

  // 3) SWR API calls: stale-while-revalidate
  if (matchesAny(url.pathname, SWR_API_PATTERNS)) {
    event.respondWith(
      caches.open(API_CACHE).then((cache) => {
        return cache.match(event.request).then((cached) => {
          const networkFetch = fetch(event.request).then((response) => {
            if (response.ok) {
              cache.put(event.request, response.clone());
              trackSession(url, response);
            }
            return response;
          }).catch(() => {
            // Network failed — return cached if we have it
            return cached || new Response(
              JSON.stringify({ error: 'offline', message: 'No cached data available.' }),
              { status: 503, headers: { 'Content-Type': 'application/json' } }
            );
          });

          // Return cached immediately if available, update in background
          return cached || networkFetch;
        });
      })
    );
    return;
  }

  // 4) Dice sounds: cache-first with runtime population
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

  // 5) Stale-while-revalidate for adventure manifests (manifests-*.js)
  if (url.pathname.startsWith('/manifests-') && url.pathname.endsWith('.js')) {
    event.respondWith(
      caches.open(MANIFEST_CACHE).then((cache) => {
        return cache.match(event.request).then((cached) => {
          const networkFetch = fetch(event.request).then((response) => {
            if (response.ok) {
              cache.put(event.request, response.clone());
            }
            return response;
          }).catch(() => cached);

          return cached || networkFetch;
        });
      })
    );
    return;
  }

  // 6) Docs assets (JS, CSS, images, HTML): stale-while-revalidate
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

          return cached || networkFetch;
        });
      })
    );
    return;
  }

  // 7) Static assets (CSS, JS, images, fonts): cache-first, populate on miss
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

  // 8) Navigation requests: network-first, offline.html fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            return cached || caches.match('/offline.html');
          });
        })
    );
    return;
  }

  // 9) Unmatched API calls: network-first with JSON fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(API_CACHE).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return new Response(
              JSON.stringify({ error: 'offline', message: 'No cached data available. Reconnect to continue.' }),
              { status: 503, headers: { 'Content-Type': 'application/json' } }
            );
          });
        })
    );
    return;
  }

  // 10) Everything else: cache-first, populate on miss
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
