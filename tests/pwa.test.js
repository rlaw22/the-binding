/**
 * The Binding — PWA Test Suite
 *
 * Verifies service worker, offline fallback, manifest integrity,
 * and caching strategy correctness.
 * Run with: node tests/pwa.test.js
 */

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
let total = 0;

function assert(condition, label) {
  total++;
  if (condition) {
    passed++;
    console.log('  ✓ ' + label);
  } else {
    failed++;
    console.error('  ✗ ' + label);
  }
}

function assertEq(actual, expected, label) {
  total++;
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed++;
    console.log('  ✓ ' + label);
  } else {
    failed++;
    console.error('  ✗ ' + label + ' — expected ' + e + ', got ' + a);
  }
}

function section(name) {
  console.log('\n═══ ' + name + ' ═══');
}

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// ─── Service Worker File ──────────────────────────────────────────────
section('Service Worker');

const swPath = path.join(PUBLIC_DIR, 'sw.js');
assert(fs.existsSync(swPath), 'sw.js exists');

const swContent = fs.readFileSync(swPath, 'utf8');

// Version-based cache busting
assert(swContent.includes("CACHE_VERSION = 'v2'"), 'SW uses cache version v2');
assert(swContent.includes('the-binding-${CACHE_VERSION}'), 'SW uses versioned cache names');

// Pre-cached static assets include key pages
assert(swContent.includes("'/index.html'"), 'SW pre-caches index.html');
assert(swContent.includes("'/create.html'"), 'SW pre-caches create.html');
assert(swContent.includes("'/manifest.json'"), 'SW pre-caches manifest.json');
assert(swContent.includes("'/offline.html'"), 'SW pre-caches offline.html');

// Dice sounds caching strategy
assert(swContent.includes('/docs/assets/dice-box/sounds/'), 'SW has dice sounds route');
assert(swContent.includes('SOUNDS_CACHE'), 'SW has dedicated sounds cache');

// Stale-while-revalidate for docs assets
assert(swContent.includes('/docs/'), 'SW has docs route');
assert(swContent.includes('DOCS_CACHE'), 'SW has dedicated docs cache');

// Offline fallback for navigation requests
assert(swContent.includes("event.request.mode === 'navigate'"), 'SW handles navigation requests');
assert(swContent.includes('/offline.html'), 'SW serves offline.html as fallback');

// Cache cleanup on activate
assert(swContent.includes('keepCaches'), 'SW keeps only current caches on activate');
assert(swContent.includes('clients.claim()'), 'SW claims clients immediately');

// ─── Offline Fallback Page ────────────────────────────────────────────
section('Offline Fallback');

const offlinePath = path.join(PUBLIC_DIR, 'offline.html');
assert(fs.existsSync(offlinePath), 'offline.html exists');

const offlineContent = fs.readFileSync(offlinePath, 'utf8');

// Theme colors
assert(offlineContent.includes('#1A1A2E'), 'offline.html uses dark theme background');
assert(offlineContent.includes('#C9A84C'), 'offline.html uses gold accent color');

// Content
assert(
  offlineContent.includes("You're Offline") || offlineContent.includes("You're offline"),
  'offline.html shows offline message'
);
assert(
  offlineContent.toLowerCase().includes('reconnect'),
  'offline.html mentions reconnection'
);

// Retry button
assert(offlineContent.includes('retry') || offlineContent.includes('Retry'), 'offline.html has retry button');

// Auto-retry on reconnect
assert(offlineContent.includes("'online'"), 'offline.html listens for online event');

// ─── Manifest ─────────────────────────────────────────────────────────
section('Manifest');

const manifestPath = path.join(PUBLIC_DIR, 'manifest.json');
assert(fs.existsSync(manifestPath), 'manifest.json exists');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// Required fields
assertEq(manifest.name, 'The Binding', 'manifest name is "The Binding"');
assertEq(manifest.short_name, 'The Binding', 'manifest short_name is "The Binding"');
assert(manifest.description, 'manifest has description');
assertEq(manifest.start_url, '/', 'manifest start_url is /');
assertEq(manifest.display, 'standalone', 'manifest display is standalone');
assertEq(manifest.background_color, '#1A1A2E', 'manifest background_color matches dark theme');
assertEq(manifest.theme_color, '#C9A84C', 'manifest theme_color matches gold accent');

// Icons
assert(Array.isArray(manifest.icons), 'manifest has icons array');
assert(manifest.icons.length >= 2, 'manifest has at least 2 icons');

const has192 = manifest.icons.some(i => i.sizes === '192x192');
const has512 = manifest.icons.some(i => i.sizes === '512x512');
assert(has192, 'manifest has 192x192 icon');
assert(has512, 'manifest has 512x512 icon');

// Categories
assert(Array.isArray(manifest.categories), 'manifest has categories');
assert(manifest.categories.includes('games'), 'manifest includes "games" category');

// ─── Caching Strategy Correctness ─────────────────────────────────────
section('Caching Strategy');

// Verify multiple cache buckets exist
assert(swContent.includes('CACHE_NAME'), 'SW defines main cache name');
assert(swContent.includes('DOCS_CACHE'), 'SW defines docs cache name');
assert(swContent.includes('SOUNDS_CACHE'), 'SW defines sounds cache name');
assert(swContent.includes('OFFLINE_CACHE'), 'SW defines offline cache name');

// Verify API calls use network-first
assert(swContent.includes("/api/'"), 'SW has API route pattern');
assert(swContent.includes('fetch(event.request).catch'), 'SW uses network-first for API');

// Verify stale-while-revalidate pattern for docs
const swrPattern = swContent.includes('return cached || networkFetch');
assert(swrPattern, 'SW uses stale-while-revalidate for docs (returns cached, updates in background)');

// Verify sounds use cache-first with runtime population
assert(
  swContent.includes('cache.match(event.request).then((cached)'),
  'SW checks cache first for sounds'
);

// ─── Session Rejoin in Frontend ───────────────────────────────────────
section('Session Rejoin (localStorage)');

const indexPath = path.join(PUBLIC_DIR, 'index.html');
const indexContent = fs.readFileSync(indexPath, 'utf8');

// localStorage key for session storage
assert(indexContent.includes('binding_session'), 'index.html uses binding_session localStorage key');

// Save function
assert(indexContent.includes('saveSessionToStorage'), 'index.html has saveSessionToStorage function');

// Load function
assert(indexContent.includes('getStoredSession'), 'index.html has getStoredSession function');

// Clear function
assert(indexContent.includes('clearSessionFromStorage'), 'index.html has clearSessionFromStorage function');

// Rejoin banner on page load
assert(indexContent.includes('showRejoinBanner'), 'index.html shows rejoin banner for stored sessions');

// 24-hour expiry
assert(indexContent.includes('24 * 60 * 60 * 1000'), 'index.html expires stored sessions after 24 hours');

// Service worker registration
assert(indexContent.includes("navigator.serviceWorker.register('/sw.js')"), 'index.html registers the service worker');

// ─── Summary ──────────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════');
console.log('  PWA Tests: ' + passed + '/' + total + ' passed');
if (failed > 0) {
  console.error('  ✗ ' + failed + ' FAILED');
  process.exit(1);
} else {
  console.log('  ✓ All PWA tests passed');
  process.exit(0);
}
