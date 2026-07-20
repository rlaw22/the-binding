/**
 * Image Cache Tests — LRU + TTL + generateAndCache
 *
 * Tests the standalone image cache layer added to image-service.js.
 * Uses a mock image service to avoid real API calls.
 */

'use strict';

const assert = require('assert');

let passed = 0, failed = 0, total = 0;

function check(cond, label) {
  total++;
  if (cond) { passed++; console.log('  ✓ ' + label); }
  else { failed++; console.error('  ✗ FAILED: ' + label); }
}

function checkEq(a, b, label) {
  total++;
  const av = JSON.stringify(a), bv = JSON.stringify(b);
  if (av === bv) { passed++; console.log('  ✓ ' + label); }
  else { failed++; console.error('  ✗ FAILED: ' + label + ' — expected ' + bv + ', got ' + av); }
}

function section(name) { console.log('\n═══ ' + name + ' ═══'); }

// ---------------------------------------------------------------------------
// Mock image service (simulates createImageService output)
// ---------------------------------------------------------------------------
function createMockService(providerName = 'MockAI') {
  let callCount = 0;
  return {
    get isEnabled() { return true; },
    get providerName() { return providerName; },
    async generateRaw(prompt) {
      callCount++;
      return `https://mock.ai/image/${encodeURIComponent(prompt.slice(0, 30))}.png`;
    },
    getCallCount() { return callCount; },
  };
}

function createNullService() {
  return null;
}

function createDisabledService() {
  return {
    get isEnabled() { return false; },
    get providerName() { return null; },
    async generateRaw() { return 'should-not-reach'; },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

async function run() {
  const {
    ImageCacheStore,
    generateAndCache,
    getImageCacheStats,
    clearImageCache,
    IMAGE_CACHE_TTL_MS,
    IMAGE_CACHE_MAX,
  } = require('../src/image/image-service');

  // ── ImageCacheStore unit tests ────────────────────────────────────────

  section('ImageCacheStore — Basic Operations');
  {
    const store = new ImageCacheStore(10, 60_000);
    const key = ImageCacheStore.makeKey('test prompt', 'MockAI', '');
    check(typeof key === 'string' && key.length === 32, 'makeKey returns 32-char hex hash');

    store.set(key, { imageUrl: 'https://example.com/1.png', prompt: 'test prompt', generatedAt: Date.now(), expiresAt: Date.now() + 60_000 });
    checkEq(store.size, 1, 'Store has 1 entry after set');
    check(store.has(key), 'has() returns true for stored key');

    const entry = store.get(key);
    check(entry !== undefined, 'get() returns entry');
    checkEq(entry.imageUrl, 'https://example.com/1.png', 'Entry imageUrl matches');

    const missing = store.get('nonexistent');
    checkEq(missing, undefined, 'get() returns undefined for missing key');
  }

  section('ImageCacheStore — LRU Eviction');
  {
    const store = new ImageCacheStore(3, 60_000); // max 3 entries
    const keys = [];
    for (let i = 0; i < 5; i++) {
      const k = ImageCacheStore.makeKey(`prompt-${i}`, 'MockAI', '');
      keys.push(k);
      store.set(k, { imageUrl: `https://example.com/${i}.png`, prompt: `prompt-${i}`, generatedAt: Date.now(), expiresAt: Date.now() + 60_000 });
    }
    checkEq(store.size, 3, 'Store capped at 3 entries after inserting 5');
    check(!store.has(keys[0]), 'Oldest entry (key 0) evicted');
    check(!store.has(keys[1]), 'Second oldest (key 1) evicted');
    check(store.has(keys[2]), 'Key 2 still present');
    check(store.has(keys[3]), 'Key 3 still present');
    check(store.has(keys[4]), 'Key 4 (newest) still present');
  }

  section('ImageCacheStore — LRU Access Refresh');
  {
    const store = new ImageCacheStore(3, 60_000);
    const k0 = ImageCacheStore.makeKey('p0', 'MockAI', '');
    const k1 = ImageCacheStore.makeKey('p1', 'MockAI', '');
    const k2 = ImageCacheStore.makeKey('p2', 'MockAI', '');

    store.set(k0, { imageUrl: 'u0', prompt: 'p0', generatedAt: Date.now(), expiresAt: Date.now() + 60_000 });
    store.set(k1, { imageUrl: 'u1', prompt: 'p1', generatedAt: Date.now(), expiresAt: Date.now() + 60_000 });
    store.set(k2, { imageUrl: 'u2', prompt: 'p2', generatedAt: Date.now(), expiresAt: Date.now() + 60_000 });

    // Access k0 to refresh it (moves to end)
    store.get(k0);

    // Insert k3 — should evict k1 (now the oldest)
    const k3 = ImageCacheStore.makeKey('p3', 'MockAI', '');
    store.set(k3, { imageUrl: 'u3', prompt: 'p3', generatedAt: Date.now(), expiresAt: Date.now() + 60_000 });

    check(store.has(k0), 'Accessed entry (k0) survives eviction');
    check(!store.has(k1), 'Least-recently-used (k1) evicted');
    check(store.has(k2), 'k2 still present');
    check(store.has(k3), 'New entry (k3) present');
  }

  section('ImageCacheStore — TTL Expiration');
  {
    const store = new ImageCacheStore(10, 50); // 50ms TTL
    const k = ImageCacheStore.makeKey('ttl-test', 'MockAI', '');
    store.set(k, { imageUrl: 'https://example.com/ttl.png', prompt: 'ttl-test', generatedAt: Date.now(), expiresAt: Date.now() + 50 });

    check(store.has(k), 'Entry exists before TTL');
    check(store.get(k) !== undefined, 'get() returns entry before TTL');

    // Wait for TTL to expire
    await new Promise(r => setTimeout(r, 80));

    check(!store.has(k), 'has() returns false after TTL expired');
    check(store.get(k) === undefined, 'get() returns undefined after TTL expired');
    checkEq(store.size, 0, 'Store is empty after TTL expiration');
  }

  section('ImageCacheStore — Hit/Miss Tracking');
  {
    const store = new ImageCacheStore(10, 60_000);
    const k = ImageCacheStore.makeKey('stats-test', 'MockAI', '');
    store.set(k, { imageUrl: 'u', prompt: 'stats-test', generatedAt: Date.now(), expiresAt: Date.now() + 60_000 });

    store.get(k); // hit
    store.get(k); // hit
    store.get('missing1'); // miss
    store.get('missing2'); // miss

    const stats = store.stats();
    checkEq(stats.hits, 2, 'Stats tracks 2 hits');
    checkEq(stats.misses, 2, 'Stats tracks 2 misses');
    checkEq(stats.hitRate, 50, 'Hit rate is 50%');
  }

  section('ImageCacheStore — Stats Entries');
  {
    const store = new ImageCacheStore(10, 60_000);
    const k = ImageCacheStore.makeKey('entries-test', 'MockAI', 'dark');
    store.set(k, { imageUrl: 'u', prompt: 'entries-test', generatedAt: 1000, expiresAt: 2000 });

    const stats = store.stats();
    checkEq(stats.size, 1, 'Stats size is 1');
    checkEq(stats.maxSize, 10, 'Stats maxSize is 10');
    checkEq(stats.ttlMs, 60_000, 'Stats ttlMs is 60000');
    check(stats.entries.length === 1, 'Stats has 1 entry');
    checkEq(stats.entries[0].key, k, 'Entry key matches');
    checkEq(stats.entries[0].prompt, 'entries-test', 'Entry prompt matches');
    checkEq(stats.entries[0].generatedAt, 1000, 'Entry generatedAt matches');
    checkEq(stats.entries[0].expiresAt, 2000, 'Entry expiresAt matches');
  }

  section('ImageCacheStore — Clear');
  {
    const store = new ImageCacheStore(10, 60_000);
    store.set('a', { imageUrl: 'u', prompt: 'p', generatedAt: Date.now(), expiresAt: Date.now() + 60_000 });
    store.set('b', { imageUrl: 'u', prompt: 'p', generatedAt: Date.now(), expiresAt: Date.now() + 60_000 });
    checkEq(store.size, 2, 'Store has 2 entries');
    store.clear();
    checkEq(store.size, 0, 'Store is empty after clear');
    const stats = store.stats();
    checkEq(stats.hits, 0, 'Hits reset after clear');
    checkEq(stats.misses, 0, 'Misses reset after clear');
  }

  section('ImageCacheStore — makeKey Determinism');
  {
    const k1 = ImageCacheStore.makeKey('prompt', 'xAI', 'gothic');
    const k2 = ImageCacheStore.makeKey('prompt', 'xAI', 'gothic');
    checkEq(k1, k2, 'Same inputs produce same key');

    const k3 = ImageCacheStore.makeKey('prompt', 'OpenAI', 'gothic');
    check(k1 !== k3, 'Different provider produces different key');

    const k4 = ImageCacheStore.makeKey('prompt', 'xAI', 'watercolor');
    check(k1 !== k4, 'Different style produces different key');
  }

  // ── generateAndCache integration tests ────────────────────────────────

  section('generateAndCache — Cache Miss then Hit');
  {
    clearImageCache();
    const service = createMockService();

    const r1 = await generateAndCache(service, 'A dark castle at midnight');
    check(r1.imageUrl !== null, 'First call returns imageUrl');
    checkEq(r1.cached, false, 'First call is a cache miss');
    checkEq(r1.prompt, 'A dark castle at midnight', 'First call returns prompt');
    checkEq(service.getCallCount(), 1, 'Service called once on miss');

    const r2 = await generateAndCache(service, 'A dark castle at midnight');
    checkEq(r2.imageUrl, r1.imageUrl, 'Second call returns same imageUrl');
    checkEq(r2.cached, true, 'Second call is a cache hit');
    checkEq(service.getCallCount(), 1, 'Service NOT called again on hit');
  }

  section('generateAndCache — Different Prompts Cache Separately');
  {
    clearImageCache();
    const service = createMockService();

    const r1 = await generateAndCache(service, 'Scene A');
    const r2 = await generateAndCache(service, 'Scene B');
    check(r1.imageUrl !== r2.imageUrl, 'Different prompts get different URLs');
    checkEq(service.getCallCount(), 2, 'Service called twice for two different prompts');

    // Both should now be cached
    const r1b = await generateAndCache(service, 'Scene A');
    const r2b = await generateAndCache(service, 'Scene B');
    checkEq(r1b.cached, true, 'Scene A is cached on re-request');
    checkEq(r2b.cached, true, 'Scene B is cached on re-request');
    checkEq(service.getCallCount(), 2, 'No additional service calls');
  }

  section('generateAndCache — Provider/Style Affects Cache Key');
  {
    clearImageCache();
    const service = createMockService('xAI');

    await generateAndCache(service, 'same prompt', { provider: 'xAI' });
    await generateAndCache(service, 'same prompt', { provider: 'OpenAI' });
    checkEq(service.getCallCount(), 2, 'Same prompt with different providers = 2 calls');
  }

  section('generateAndCache — Null Service');
  {
    clearImageCache();
    const nullSvc = createNullService();
    const r = await generateAndCache(nullSvc, 'test');
    checkEq(r.imageUrl, null, 'Null service returns null imageUrl');
    checkEq(r.cached, false, 'Null service returns cached=false');
    checkEq(r.prompt, 'test', 'Null service returns prompt');
  }

  section('generateAndCache — Disabled Service');
  {
    clearImageCache();
    const disabledSvc = createDisabledService();
    const r = await generateAndCache(disabledSvc, 'test');
    checkEq(r.imageUrl, null, 'Disabled service returns null imageUrl');
    checkEq(r.cached, false, 'Disabled service returns cached=false');
  }

  section('generateAndCache — TTL Expiration');
  {
    // Use a short TTL by manipulating the store directly
    const { ImageCacheStore: ICS } = require('../src/image/image-service');
    clearImageCache();

    // We can't easily change the module-level TTL, so test via the public API
    // by checking that entries exist and are retrievable. The TTL unit test
    // above already validates expiration mechanics.
    const service = createMockService();
    const r1 = await generateAndCache(service, 'ttl-integration-test');
    check(r1.imageUrl !== null, 'Image generated for TTL test');
    checkEq(r1.cached, false, 'Not cached on first call');

    const r2 = await generateAndCache(service, 'ttl-integration-test');
    checkEq(r2.cached, true, 'Cached on second call');
  }

  // ── getImageCacheStats ────────────────────────────────────────────────

  section('getImageCacheStats');
  {
    clearImageCache();
    const service = createMockService();

    const stats0 = getImageCacheStats();
    checkEq(stats0.size, 0, 'Stats starts empty after clear');
    checkEq(stats0.hits, 0, 'No hits after clear');
    checkEq(stats0.misses, 0, 'No misses after clear');

    await generateAndCache(service, 'stats-prompt-1');
    await generateAndCache(service, 'stats-prompt-1'); // hit
    await generateAndCache(service, 'stats-prompt-2');

    const stats1 = getImageCacheStats();
    checkEq(stats1.size, 2, 'Stats shows 2 entries');
    check(stats1.hits >= 1, 'Stats shows at least 1 hit');
    check(stats1.misses >= 2, 'Stats shows at least 2 misses');
    check(Array.isArray(stats1.entries), 'Stats entries is array');
    checkEq(stats1.entries.length, 2, 'Stats has 2 entry details');
    checkEq(stats1.maxSize, IMAGE_CACHE_MAX, 'Stats maxSize matches constant');
    checkEq(stats1.ttlMs, IMAGE_CACHE_TTL_MS, 'Stats ttlMs matches constant');
  }

  // ── Constants ─────────────────────────────────────────────────────────

  section('Constants');
  checkEq(IMAGE_CACHE_TTL_MS, 60 * 60 * 1000, 'TTL is 60 minutes');
  checkEq(IMAGE_CACHE_MAX, 50, 'Max cache size is 50');

  // ── Results ───────────────────────────────────────────────────────────

  console.log('\n═══════════════════════════════════════════');
  console.log('  IMAGE CACHE RESULTS: ' + passed + '/' + total + ' passed, ' + failed + ' failed');
  console.log('═══════════════════════════════════════════');
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('Image cache test crashed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
