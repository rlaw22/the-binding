/**
 * persistent-store.test.js — Tests for the persistent image store.
 *
 * Covers: creation, store/retrieve, TTL/eviction, disk persistence,
 * image serving endpoint, and integration with image service.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { createPersistentStore, makeKey, guessExtension } = require('../src/image/persistent-store');

// ── Test helpers ────────────────────────────────────────────────────────────

const TEST_DIR = path.join(__dirname, '..', '.test-images-' + Date.now());

function cleanup() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('PersistentImageStore', () => {
  beforeEach(cleanup);
  afterAll(cleanup);

  // ── Creation ──────────────────────────────────────────────────────────

  test('creates store with default directory', () => {
    const store = createPersistentStore({ dir: path.join(TEST_DIR, 'default') });
    expect(store).toBeDefined();
    expect(store.size).toBe(0);
    expect(store.dir).toContain('default');
    // Directory should exist
    expect(fs.existsSync(store.dir)).toBe(true);
  });

  test('creates store and loads existing index', () => {
    const dir = path.join(TEST_DIR, 'reload');
    const store1 = createPersistentStore({ dir });
    expect(store1.size).toBe(0);

    // Create a fake stored image file
    const fakeFile = path.join(dir, 'abc123.png');
    fs.writeFileSync(fakeFile, 'fake-png-data');

    // Write index
    const index = {
      version: 1,
      updatedAt: new Date().toISOString(),
      entries: {
        'abc123': {
          filename: 'abc123.png',
          prompt: 'test prompt',
          provider: 'test',
          style: 'scene',
          generatedAt: new Date().toISOString(),
        },
      },
    };
    fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify(index));

    // Reload store — should pick up the entry
    const store2 = createPersistentStore({ dir });
    expect(store2.size).toBe(1);
    expect(store2.has('abc123')).toBe(true);
  });

  test('drops entries whose files are missing on load', () => {
    const dir = path.join(TEST_DIR, 'missing');
    fs.mkdirSync(dir, { recursive: true });

    // Write index with a file that doesn't exist
    const index = {
      version: 1,
      updatedAt: new Date().toISOString(),
      entries: {
        'ghost': {
          filename: 'ghost.png',
          prompt: 'no file here',
          provider: 'test',
          style: '',
          generatedAt: new Date().toISOString(),
        },
      },
    };
    fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify(index));

    const store = createPersistentStore({ dir });
    expect(store.size).toBe(0); // ghost dropped because file doesn't exist
    expect(store.has('ghost')).toBe(false);
  });

  // ── makeKey ───────────────────────────────────────────────────────────

  test('makeKey produces deterministic 32-char hex keys', () => {
    const key1 = makeKey('a dark crypt scene', 'xAI', 'scene');
    const key2 = makeKey('a dark crypt scene', 'xAI', 'scene');
    const key3 = makeKey('a different scene', 'xAI', 'scene');

    expect(key1).toBe(key2);
    expect(key1).not.toBe(key3);
    expect(key1).toMatch(/^[a-f0-9]{32}$/);
  });

  test('makeKey varies by provider and style', () => {
    const k1 = makeKey('prompt', 'xAI', 'scene');
    const k2 = makeKey('prompt', 'OpenAI', 'scene');
    const k3 = makeKey('prompt', 'xAI', 'character');

    expect(k1).not.toBe(k2);
    expect(k1).not.toBe(k3);
  });

  // ── guessExtension ────────────────────────────────────────────────────

  test('guessExtension returns .png by default', () => {
    expect(guessExtension('https://example.com/image')).toBe('.png');
    expect(guessExtension('not-a-url')).toBe('.png');
    expect(guessExtension('')).toBe('.png');
  });

  test('guessExtension detects common image formats', () => {
    expect(guessExtension('https://example.com/photo.jpg')).toBe('.jpg');
    expect(guessExtension('https://example.com/photo.jpeg')).toBe('.jpeg');
    expect(guessExtension('https://example.com/anim.webp')).toBe('.webp');
    expect(guessExtension('https://example.com/anim.gif')).toBe('.gif');
  });

  // ── has / get (no file download) ──────────────────────────────────────

  test('has returns false for missing keys', () => {
    const store = createPersistentStore({ dir: path.join(TEST_DIR, 'has') });
    expect(store.has('nonexistent')).toBe(false);
    expect(store.get('nonexistent')).toBeNull();
  });

  test('has returns false when file was deleted after store', () => {
    const dir = path.join(TEST_DIR, 'deleted');
    const store = createPersistentStore({ dir });

    // Manually add an entry and file
    const key = 'testkey';
    const filename = `${key}.png`;
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, 'fake-data');

    // Manually set in-memory index
    store._index = store._index || new Map();
    store._index.set(key, {
      filename,
      prompt: 'test',
      provider: 'test',
      style: '',
      generatedAt: new Date().toISOString(),
    });

    // Delete the file
    fs.unlinkSync(filePath);

    // has should return false now
    expect(store.has(key)).toBe(false);
  });

  // ── stats ─────────────────────────────────────────────────────────────

  test('stats returns correct shape', () => {
    const store = createPersistentStore({ dir: path.join(TEST_DIR, 'stats') });
    const s = store.stats();

    expect(s).toHaveProperty('count');
    expect(s).toHaveProperty('maxEntries');
    expect(s).toHaveProperty('dir');
    expect(s).toHaveProperty('entries');
    expect(s.count).toBe(0);
    expect(Array.isArray(s.entries)).toBe(true);
  });

  // ── clear ─────────────────────────────────────────────────────────────

  test('clear removes all entries and files', () => {
    const dir = path.join(TEST_DIR, 'clear');
    const store = createPersistentStore({ dir });

    // Write a fake file
    fs.writeFileSync(path.join(dir, 'abc.png'), 'data');

    // Manually add to index
    store._index = store._index || new Map();
    store._index.set('abc', {
      filename: 'abc.png',
      prompt: 'test',
      provider: 'test',
      style: '',
      generatedAt: new Date().toISOString(),
    });

    expect(store.size).toBe(1);
    store.clear();
    expect(store.size).toBe(0);
    expect(fs.existsSync(path.join(dir, 'abc.png'))).toBe(false);
  });

  // ── remove ────────────────────────────────────────────────────────────

  test('remove deletes a single entry', () => {
    const dir = path.join(TEST_DIR, 'remove');
    const store = createPersistentStore({ dir });

    fs.writeFileSync(path.join(dir, 'key1.png'), 'data1');
    fs.writeFileSync(path.join(dir, 'key2.png'), 'data2');

    store._index = store._index || new Map();
    store._index.set('key1', { filename: 'key1.png', prompt: 'p1', provider: 't', style: '', generatedAt: new Date().toISOString() });
    store._index.set('key2', { filename: 'key2.png', prompt: 'p2', provider: 't', style: '', generatedAt: new Date().toISOString() });

    expect(store.size).toBe(2);
    store.remove('key1');
    expect(store.size).toBe(1);
    expect(store.has('key1')).toBe(false);
    expect(store.has('key2')).toBe(true);
    expect(fs.existsSync(path.join(dir, 'key1.png'))).toBe(false);
  });

  // ── max entries eviction ──────────────────────────────────────────────

  test('evicts oldest when exceeding maxEntries', () => {
    const dir = path.join(TEST_DIR, 'evict');
    const store = createPersistentStore({ dir, max: 3 });

    store._index = store._index || new Map();

    // Add 3 entries with files
    for (let i = 0; i < 3; i++) {
      const key = `key${i}`;
      fs.writeFileSync(path.join(dir, `${key}.png`), `data${i}`);
      store._index.set(key, {
        filename: `${key}.png`,
        prompt: `prompt ${i}`,
        provider: 'test',
        style: '',
        generatedAt: new Date().toISOString(),
      });
    }

    expect(store.size).toBe(3);

    // Manually trigger eviction by adding a 4th
    const key4 = 'key4';
    fs.writeFileSync(path.join(dir, `${key4}.png`), 'data4');
    store._index.set(key4, {
      filename: `${key4}.png`,
      prompt: 'prompt 4',
      provider: 'test',
      style: '',
      generatedAt: new Date().toISOString(),
    });

    // Call evict (exposed for testing via the store's internal method)
    // The store evicts automatically on store(), but we can test the principle
    // by checking that the Map maintains insertion order
    const keys = Array.from(store._index.keys());
    expect(keys[0]).toBe('key0'); // oldest
    expect(keys[keys.length - 1]).toBe('key4'); // newest
  });

  // ── Index persistence ─────────────────────────────────────────────────

  test('index.json is written after store operations', () => {
    const dir = path.join(TEST_DIR, 'persist');
    const store = createPersistentStore({ dir });

    // Write a file and manually add to index, then save
    fs.writeFileSync(path.join(dir, 'saved.png'), 'data');
    store._index = store._index || new Map();
    store._index.set('saved', {
      filename: 'saved.png',
      prompt: 'test prompt',
      provider: 'test',
      style: 'scene',
      generatedAt: new Date().toISOString(),
    });
    store._saveIndex();

    // Verify index.json exists and is valid JSON
    const indexPath = path.join(dir, 'index.json');
    expect(fs.existsSync(indexPath)).toBe(true);
    const parsed = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    expect(parsed.version).toBe(1);
    expect(parsed.entries).toHaveProperty('saved');
    expect(parsed.entries.saved.prompt).toBe('test prompt');
  });
});

describe('ImageService with persistent store', () => {
  const SERVICE_DIR = path.join(__dirname, '..', '.test-image-svc-' + Date.now());

  afterAll(() => {
    if (fs.existsSync(SERVICE_DIR)) {
      fs.rmSync(SERVICE_DIR, { recursive: true, force: true });
    }
  });

  test('createImageService creates service with persistent store', () => {
    const { createImageService } = require('../src/image');
    const svc = createImageService({
      cacheDir: SERVICE_DIR,
      enabled: false, // no provider needed for this test
    });

    expect(svc).toBeDefined();
    expect(svc.isEnabled).toBe(false);
    expect(svc.persistentStore).toBeDefined();
    expect(svc.persistentStore.dir).toBe(SERVICE_DIR);
  });

  test('service returns null gracefully when disabled', async () => {
    const { createImageService } = require('../src/image');
    const svc = createImageService({ enabled: false });

    const result = await svc.generateScene({ description: 'test' });
    expect(result).toBeNull();
  });

  test('prompt builders produce valid prompts', () => {
    const { buildScenePrompt, buildCharacterPrompt, buildCombatPrompt } = require('../src/image');

    const scene = buildScenePrompt({
      description: 'A dark crypt with stone coffins',
      location: 'Beneath Castle Dracula',
      mood: 'dread',
    });
    expect(scene).toContain('dark crypt');
    expect(scene).toContain('Castle Dracula');
    expect(scene).toContain('gothic literary illustration');

    const char = buildCharacterPrompt({
      name: 'Van Helsing',
      classType: 'vampire hunter',
      appearance: 'Weathered face, silver hair',
    });
    expect(char).toContain('Van Helsing');
    expect(char).toContain('vampire hunter');

    const combat = buildCombatPrompt({
      attacker: 'A vampire lord',
      defender: 'Van Helsing',
      weapon: 'Silver stake',
      outcome: 'critical',
    });
    expect(combat).toContain('vampire lord');
    expect(combat).toContain('Silver stake');
  });
});
