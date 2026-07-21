/**
 * persistent-store.js — On-Disk Image Storage
 *
 * Downloads generated images from provider URLs and stores them locally
 * under data/images/. Maintains a JSON metadata index (index.json) mapping
 * cache keys → { filename, prompt, provider, generatedAt, width, height }.
 *
 * Survives server restarts. Images are served via GET /api/image/:key.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const DEFAULT_DIR = 'data/images';
const INDEX_FILE = 'index.json';
const MAX_STORED = 500;

/**
 * Download a URL to a local file. Returns the local filename on success.
 */
function downloadFile(urlStr, destPath) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const transport = url.protocol === 'https:' ? https : http;

    const req = transport.get(urlStr, { timeout: 30_000 }, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, destPath)
          .then(resolve)
          .catch(reject);
      }

      if (res.statusCode >= 400) {
        return reject(new Error(`Download failed: HTTP ${res.statusCode}`));
      }

      const ws = fs.createWriteStream(destPath);
      res.pipe(ws);
      ws.on('finish', () => ws.close(() => resolve(destPath)));
      ws.on('error', (err) => {
        fs.unlink(destPath, () => {}); // clean up partial file
        reject(err);
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Image download timed out (30s)'));
    });
  });
}

/**
 * Make a deterministic cache key from a prompt + provider + style.
 */
function makeKey(prompt, providerName, style) {
  const raw = `${providerName || 'unknown'}|${style || ''}|${prompt}`;
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32);
}

/**
 * Create a persistent image store.
 *
 * @param {object} opts
 * @param {string} [opts.dir]  — Storage directory (default: data/images)
 * @param {number} [opts.max]  — Max stored images (default: 500)
 * @returns {object} PersistentImageStore API
 */
function createPersistentStore(opts = {}) {
  const dir = opts.dir || DEFAULT_DIR;
  const maxEntries = opts.max || MAX_STORED;
  const indexPath = path.join(dir, INDEX_FILE);

  /** @type {Map<string, object>} */
  let index = new Map();

  // ── Ensure directory + load existing index ────────────────────────────

  function init() {
    fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(indexPath)) {
      try {
        const raw = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
        for (const [key, entry] of Object.entries(raw.entries || {})) {
          // Verify the image file still exists
          const filePath = path.join(dir, entry.filename);
          if (fs.existsSync(filePath)) {
            index.set(key, entry);
          }
        }
        console.log(`  🖼️  Persistent image store: loaded ${index.size} entries from ${dir}`);
      } catch (err) {
        console.warn(`  🖼️  Failed to load image index: ${err.message}`);
      }
    }
  }

  init();

  function saveIndex() {
    const obj = { version: 1, updatedAt: new Date().toISOString(), entries: {} };
    for (const [key, val] of index.entries()) {
      obj.entries[key] = val;
    }
    fs.writeFileSync(indexPath, JSON.stringify(obj, null, 2));
  }

  // ── Evict oldest entries when over max ────────────────────────────────

  function evict() {
    while (index.size > maxEntries) {
      const oldestKey = index.keys().next().value;
      const entry = index.get(oldestKey);
      if (entry) {
        const filePath = path.join(dir, entry.filename);
        try { fs.unlinkSync(filePath); } catch (_) { /* ignore */ }
      }
      index.delete(oldestKey);
    }
  }

  // ── Public API ────────────────────────────────────────────────────────

  return {
    /**
     * Get the storage directory path.
     */
    get dir() { return dir; },

    /**
     * Check if a cached image exists for a key.
     */
    has(key) {
      const entry = index.get(key);
      if (!entry) return false;
      // Verify file still exists
      const filePath = path.join(dir, entry.filename);
      if (!fs.existsSync(filePath)) {
        index.delete(key);
        return false;
      }
      return true;
    },

    /**
     * Get a cached entry by key. Returns { filename, filePath, prompt, ... } or null.
     */
    get(key) {
      if (!this.has(key)) return null;
      const entry = index.get(key);
      return { ...entry, filePath: path.join(dir, entry.filename) };
    },

    /**
     * Store an image: downloads from a URL and saves to disk.
     *
     * @param {string} key      — Cache key (from makeKey)
     * @param {string} imageUrl — Remote URL to download
     * @param {object} meta     — { prompt, provider, style, ... }
     * @returns {Promise<object>} The stored entry
     */
    async store(key, imageUrl, meta = {}) {
      // Already cached?
      if (this.has(key)) {
        return this.get(key);
      }

      // Determine filename from key + extension hint
      const ext = guessExtension(imageUrl);
      const filename = `${key}${ext}`;
      const filePath = path.join(dir, filename);

      try {
        await downloadFile(imageUrl, filePath);
      } catch (err) {
        console.error(`  🖼️  Failed to download image: ${err.message}`);
        return null;
      }

      const entry = {
        filename,
        prompt: (meta.prompt || '').slice(0, 500),
        provider: meta.provider || 'unknown',
        style: meta.style || '',
        generatedAt: new Date().toISOString(),
        sourceUrl: imageUrl,
      };

      index.set(key, entry);
      evict();
      saveIndex();

      return { ...entry, filePath };
    },

    /**
     * Remove a cached image.
     */
    remove(key) {
      const entry = index.get(key);
      if (entry) {
        const filePath = path.join(dir, entry.filename);
        try { fs.unlinkSync(filePath); } catch (_) { /* ignore */ }
        index.delete(key);
        saveIndex();
      }
    },

    /**
     * Clear all stored images.
     */
    clear() {
      for (const [, entry] of index.entries()) {
        const filePath = path.join(dir, entry.filename);
        try { fs.unlinkSync(filePath); } catch (_) { /* ignore */ }
      }
      index.clear();
      saveIndex();
    },

    /**
     * Return store statistics.
     */
    stats() {
      return {
        count: index.size,
        maxEntries,
        dir,
        entries: Array.from(index.entries()).map(([key, val]) => ({
          key,
          prompt: val.prompt.slice(0, 120),
          provider: val.provider,
          generatedAt: val.generatedAt,
        })),
      };
    },

    /**
     * Number of stored images.
     */
    get size() { return index.size; },
  };
}

/**
 * Guess file extension from a URL (defaults to .png).
 */
function guessExtension(urlStr) {
  try {
    const pathname = new URL(urlStr).pathname.toLowerCase();
    if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) return '.jpg';
    if (pathname.endsWith('.webp')) return '.webp';
    if (pathname.endsWith('.gif')) return '.gif';
  } catch (_) { /* not a valid URL */ }
  return '.png';
}

module.exports = {
  createPersistentStore,
  makeKey,
  downloadFile,
  guessExtension,
  DEFAULT_DIR,
  MAX_STORED,
};
