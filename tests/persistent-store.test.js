/**
 * persistent-store.test.js — Tests for the persistent image store.
 *
 * Uses ONLY the public API (has/get/store/remove/clear/stats/size/dir).
 * Uses data: URIs so no network is needed.
 *
 * Run with: node tests/persistent-store.test.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

let passed = 0, failed = 0, total = 0;

function assert(cond, label) {
  total++;
  if (cond) { passed++; console.log('  ✓ ' + label); }
  else { failed++; console.error('  ✗ ' + label); }
}

function section(name) { console.log('\n═══ ' + name + ' ═══'); }

// Minimal 1x1 red PNG (67 bytes)
const TINY_PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==';
const TINY_PNG_URI = 'data:image/png;base64,' + TINY_PNG_B64;

const TEST_DIR = path.join(os.tmpdir(), 'binding-pstore-test-' + Date.now());

function cleanup() {
  try { fs.rmSync(TEST_DIR, { recursive: true, force: true }); } catch (_) {}
}

const { createPersistentStore, makeKey, guessExtension } = require('../src/image/persistent-store');

cleanup();

// ── Creation ──────────────────────────────────────────────────────────

section('Creation');

{
  const store = createPersistentStore({ dir: path.join(TEST_DIR, 'create') });
  assert(store !== undefined, 'creates store');
  assert(store.size === 0, 'new store is empty');
  assert(store.dir.includes('create'), 'dir property works');
  assert(fs.existsSync(store.dir), 'directory created on disk');
}

// ── makeKey ───────────────────────────────────────────────────────────

section('makeKey');

{
  const k1 = makeKey('a dark crypt', 'xAI', 'scene');
  const k2 = makeKey('a dark crypt', 'xAI', 'scene');
  const k3 = makeKey('a different scene', 'xAI', 'scene');
  assert(k1 === k2, 'deterministic');
  assert(k1 !== k3, 'differs for different input');
  assert(/^[a-f0-9]{32}$/.test(k1), '32-char hex');
  assert(makeKey('p', 'xAI', 'scene') !== makeKey('p', 'OpenAI', 'scene'), 'varies by provider');
  assert(makeKey('p', 'xAI', 'scene') !== makeKey('p', 'xAI', 'char'), 'varies by style');
}

// ── guessExtension ────────────────────────────────────────────────────

section('guessExtension');

{
  assert(guessExtension('') === '.png', 'empty → .png');
  assert(guessExtension('not-a-url') === '.png', 'non-URL → .png');
  assert(guessExtension('https://x.com/a.jpg') === '.jpg', '.jpg');
  assert(guessExtension('https://x.com/a.jpeg') === '.jpg', '.jpeg → .jpg');
  assert(guessExtension('https://x.com/a.webp') === '.webp', '.webp');
  assert(guessExtension('https://x.com/a.gif') === '.gif', '.gif');
}

// ── has / get ─────────────────────────────────────────────────────────

section('has / get');

{
  const store = createPersistentStore({ dir: path.join(TEST_DIR, 'has') });
  assert(store.has('nope') === false, 'has returns false for missing');
  assert(store.get('nope') === null, 'get returns null for missing');
}

// ── store + has + get (async via data: URI) ──────────────────────────

section('store (async)');

(async () => {
  const dir = path.join(TEST_DIR, 'store');
  const store = createPersistentStore({ dir });

  const key = makeKey('test prompt', 'mock', 'scene');
  const result = await store.store(key, TINY_PNG_URI, {
    prompt: 'test prompt',
    provider: 'mock',
    style: 'scene',
  });

  assert(result !== null, 'store returns entry');
  assert(store.has(key), 'has returns true after store');
  assert(store.size === 1, 'size is 1 after store');

  const entry = store.get(key);
  assert(entry !== null, 'get returns entry');
  assert(entry.prompt === 'test prompt', 'entry has correct prompt');
  assert(entry.provider === 'mock', 'entry has correct provider');
  assert(fs.existsSync(entry.filePath), 'file exists on disk');

  // Store same key again — should return cached (idempotent)
  const result2 = await store.store(key, TINY_PNG_URI, { prompt: 'duplicate', provider: 'x' });
  assert(store.size === 1, 'duplicate store does not create new entry');
  assert(result2.prompt === 'test prompt', 'duplicate returns original entry');

  // ── remove ──────────────────────────────────────────────────────

  section('remove');

  const key2 = makeKey('second', 'mock', 'scene');
  await store.store(key2, TINY_PNG_URI, { prompt: 'second', provider: 'mock' });
  assert(store.size === 2, 'size is 2 before remove');

  store.remove(key);
  assert(store.size === 1, 'size is 1 after remove');
  assert(!store.has(key), 'removed key gone');
  assert(store.has(key2), 'other key still present');

  // ── stats ───────────────────────────────────────────────────────

  section('stats');

  const s = store.stats();
  assert(s.count === 1, 'stats count correct');
  assert(typeof s.maxEntries === 'number', 'stats has maxEntries');
  assert(Array.isArray(s.entries), 'stats.entries is array');
  assert(s.entries.length === 1, 'stats.entries matches count');

  // ── clear ───────────────────────────────────────────────────────

  section('clear');

  store.clear();
  assert(store.size === 0, 'size is 0 after clear');

  // ── max entries eviction ────────────────────────────────────────

  section('eviction');

  const dir2 = path.join(TEST_DIR, 'evict');
  const store2 = createPersistentStore({ dir: dir2, max: 3 });

  for (let i = 0; i < 3; i++) {
    await store2.store('key' + i, TINY_PNG_URI, { prompt: 'p' + i, provider: 'test' });
  }
  assert(store2.size === 3, 'size is 3 (at max)');

  // Adding 4th should trigger eviction
  await store2.store('key3', TINY_PNG_URI, { prompt: 'p3', provider: 'test' });
  assert(store2.size === 3, 'size still 3 after eviction');
  assert(!store2.has('key0'), 'oldest evicted');
  assert(store2.has('key3'), 'newest kept');

  // ── Index persistence (reload) ──────────────────────────────────

  section('reload');

  const dir3 = path.join(TEST_DIR, 'reload');
  const store3a = createPersistentStore({ dir: dir3 });
  const rkey = makeKey('persist', 'test', 'scene');
  await store3a.store(rkey, TINY_PNG_URI, { prompt: 'persist', provider: 'test' });
  assert(store3a.size === 1, 'original store has 1 entry');

  // Create new store instance from same dir — should reload
  const store3b = createPersistentStore({ dir: dir3 });
  assert(store3b.size === 1, 'reloaded store has 1 entry');
  assert(store3b.has(rkey), 'reloaded store has the key');

  // ── Ghost entry cleanup on reload ───────────────────────────────

  section('ghost cleanup');

  const dir4 = path.join(TEST_DIR, 'ghost');
  const store4a = createPersistentStore({ dir: dir4 });
  const gkey = makeKey('ghost', 'test', 'scene');
  await store4a.store(gkey, TINY_PNG_URI, { prompt: 'ghost', provider: 'test' });
  assert(store4a.size === 1, 'ghost store has 1 entry');

  // Delete the image file manually
  const gentry = store4a.get(gkey);
  if (gentry && gentry.filePath) {
    fs.unlinkSync(gentry.filePath);
  }

  // Reload — ghost entry should be dropped
  const store4b = createPersistentStore({ dir: dir4 });
  assert(store4b.size === 0, 'ghost entry dropped on reload');

  // ── ImageService integration ────────────────────────────────────

  section('ImageService integration');

  const { createImageService, buildScenePrompt, buildCharacterPrompt, buildCombatPrompt } = require('../src/image');
  const svcDir = path.join(TEST_DIR, 'svc');
  const svc = createImageService({ cacheDir: svcDir, enabled: false });
  assert(svc !== undefined, 'createImageService returns object');
  assert(svc.isEnabled === false, 'service disabled');
  assert(svc.persistentStore !== undefined, 'service has persistentStore');

  const nullResult = await svc.generateScene({ description: 'test' });
  assert(nullResult === null, 'generateScene returns null when disabled');

  // Prompt builders
  const scene = buildScenePrompt({ description: 'A dark crypt', location: 'Castle Dracula', mood: 'dread' });
  assert(scene.includes('dark crypt'), 'scene prompt has description');
  assert(scene.includes('gothic literary illustration'), 'scene prompt has style');

  const char = buildCharacterPrompt({ name: 'Van Helsing', classType: 'vampire hunter', appearance: 'Silver hair' });
  assert(char.includes('Van Helsing'), 'char prompt has name');

  const combat = buildCombatPrompt({ attacker: 'A vampire lord', defender: 'Van Helsing', weapon: 'Silver stake', outcome: 'critical' });
  assert(combat.includes('vampire lord'), 'combat prompt has attacker');

  // ── Cleanup & Summary ───────────────────────────────────────────

  cleanup();

  console.log('\n════════════════════════════════════════════');
  console.log('  RESULTS: ' + passed + '/' + total + ' passed, ' + failed + ' failed');
  console.log('════════════════════════════════════════════');

  if (failed > 0) process.exit(1);
})();
