/**
 * persistent-store-new.test.js — Tests for listEntries, cleanupOldEntries, get
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createPersistentStore, makeKey } from '../src/image/persistent-store.js';

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ps-test-'));
}

function fakeDataUri() {
  const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
  return 'data:image/png;base64,' + b64;
}

async function seedStore(store, count, opts = {}) {
  const uri = fakeDataUri();
  const prov = opts.provider || 'test-prov';
  const results = [];
  for (let i = 0; i < count; i++) {
    const key = makeKey('prompt-' + i, prov, 'style-' + i);
    const meta = { prompt: 'Test prompt ' + i, provider: prov, style: 'style-' + i };
    if (opts.generatedAt) meta.generatedAt = opts.generatedAt(i);
    const entry = await store.store(key, uri, meta);
    results.push({ key, entry });
  }
  return results;
}

describe('PersistentStore — listEntries', () => {
  let dir, store;
  beforeEach(() => { dir = tmpDir(); store = createPersistentStore({ dir, max: 50 }); });
  afterEach(() => { store.clear(); fs.rmSync(dir, { recursive: true, force: true }); });

  it('returns empty list when store is empty', () => {
    const r = store.listEntries();
    expect(r.items).toEqual([]);
    expect(r.total).toBe(0);
    expect(r.limit).toBe(20);
    expect(r.offset).toBe(0);
  });

  it('lists all entries with default pagination', async () => {
    await seedStore(store, 5);
    const r = store.listEntries();
    expect(r.total).toBe(5);
    expect(r.items.length).toBe(5);
  });

  it('respects limit parameter', async () => {
    await seedStore(store, 10);
    const r = store.listEntries({ limit: 3 });
    expect(r.items.length).toBe(3);
    expect(r.total).toBe(10);
    expect(r.limit).toBe(3);
  });

  it('respects offset parameter', async () => {
    await seedStore(store, 10);
    const r = store.listEntries({ limit: 5, offset: 5 });
    expect(r.items.length).toBe(5);
    expect(r.total).toBe(10);
    expect(r.offset).toBe(5);
  });

  it('offset beyond total returns empty items', async () => {
    await seedStore(store, 3);
    const r = store.listEntries({ offset: 100 });
    expect(r.items).toEqual([]);
    expect(r.total).toBe(3);
  });

  it('each item includes key, filePath, and metadata', async () => {
    await seedStore(store, 1);
    const r = store.listEntries();
    const item = r.items[0];
    expect(item).toHaveProperty('key');
    expect(item).toHaveProperty('filePath');
    expect(item).toHaveProperty('prompt');
    expect(item).toHaveProperty('provider', 'test-prov');
    expect(item).toHaveProperty('generatedAt');
    expect(fs.existsSync(item.filePath)).toBe(true);
  });
});

describe('PersistentStore — cleanupOldEntries', () => {
  let dir, store;
  beforeEach(() => { dir = tmpDir(); store = createPersistentStore({ dir, max: 50 }); });
  afterEach(() => { store.clear(); fs.rmSync(dir, { recursive: true, force: true }); });

  it('returns 0 when no entries exist', () => {
    expect(store.cleanupOldEntries(30)).toBe(0);
  });

  it('returns 0 when all entries are recent', async () => {
    await seedStore(store, 5);
    expect(store.cleanupOldEntries(30)).toBe(0);
    expect(store.size).toBe(5);
  });

  it('removes entries older than cutoff', async () => {
    const old = new Date(Date.now() - 60 * 86400000).toISOString();
    await seedStore(store, 3, { generatedAt: () => old });
    await seedStore(store, 2, { provider: 'recent-prov' });
    const removed = store.cleanupOldEntries(30);
    expect(removed).toBe(3);
    expect(store.size).toBe(2);
  });

  it('uses default 30 days when no argument', async () => {
    const old = new Date(Date.now() - 31 * 86400000).toISOString();
    await seedStore(store, 2, { generatedAt: () => old });
    const removed = store.cleanupOldEntries();
    expect(removed).toBe(2);
    expect(store.size).toBe(0);
  });

  it('custom maxAgeDays works', async () => {
    const seven = new Date(Date.now() - 7 * 86400000).toISOString();
    await seedStore(store, 2, { generatedAt: () => seven });
    expect(store.cleanupOldEntries(10)).toBe(0);
    expect(store.size).toBe(2);
    expect(store.cleanupOldEntries(5)).toBe(2);
    expect(store.size).toBe(0);
  });

  it('deleted files are actually removed from disk', async () => {
    const old = new Date(Date.now() - 60 * 86400000).toISOString();
    const seeded = await seedStore(store, 1, { generatedAt: () => old });
    const fp = seeded[0].entry.filePath;
    expect(fs.existsSync(fp)).toBe(true);
    store.cleanupOldEntries(30);
    expect(fs.existsSync(fp)).toBe(false);
  });
});

describe('PersistentStore — get / has / remove', () => {
  let dir, store;
  beforeEach(() => { dir = tmpDir(); store = createPersistentStore({ dir, max: 50 }); });
  afterEach(() => { store.clear(); fs.rmSync(dir, { recursive: true, force: true }); });

  it('get() returns full entry with filePath', async () => {
    const seeded = await seedStore(store, 1);
    const entry = store.get(seeded[0].key);
    expect(entry).not.toBeNull();
    expect(entry.filePath).toBeDefined();
    expect(entry.prompt).toBe('Test prompt 0');
    expect(fs.existsSync(entry.filePath)).toBe(true);
  });

  it('get() returns null for non-existent key', () => {
    expect(store.get('nonexistent')).toBeNull();
  });

  it('get() returns null after remove', async () => {
    const seeded = await seedStore(store, 1);
    store.remove(seeded[0].key);
    expect(store.get(seeded[0].key)).toBeNull();
  });

  it('has() returns false for non-existent key', () => {
    expect(store.has('nonexistent')).toBe(false);
  });

  it('has() returns true for stored key', async () => {
    const seeded = await seedStore(store, 1);
    expect(store.has(seeded[0].key)).toBe(true);
  });
});
