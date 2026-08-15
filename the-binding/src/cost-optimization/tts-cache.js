/**
 * TTS Cache — Text-Hashed Audio Caching
 *
 * Hash the narration text → store generated audio files.
 * Same text = same audio, never regenerate.
 *
 * This is a persistent disk cache that survives server restarts.
 * The existing in-memory audioCache in tts-service.js is good but ephemeral.
 *
 * Expected savings: Significant for repeated narration (death scenes,
 * common locations, standard NPC greetings).
 */

'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DEFAULT_CACHE_DIR = process.env.TTS_CACHE_DIR || 'data/tts-cache';
const DEFAULT_MAX_ENTRIES = parseInt(process.env.TTS_CACHE_MAX) || 500;
const DEFAULT_MAX_AGE_DAYS = parseInt(process.env.TTS_CACHE_AGE_DAYS) || 14;

/**
 * Create a TTS cache.
 *
 * @param {object} opts
 * @param {string} [opts.cacheDir] - Directory for cached audio files
 * @param {number} [opts.maxEntries] - Max cached entries (LRU eviction)
 * @param {number} [opts.maxAgeDays] - Max age before cleanup
 * @returns {object} TTS cache API
 */
function createTTSCache(opts = {}) {
  const cacheDir = opts.cacheDir || DEFAULT_CACHE_DIR;
  const maxEntries = opts.maxEntries || DEFAULT_MAX_ENTRIES;
  const maxAgeDays = opts.maxAgeDays || DEFAULT_MAX_AGE_DAYS;
  const indexPath = path.join(cacheDir, 'index.json');

  // In-memory index: hash → { audioType, charCount, createdAt, hitCount, filePath }
  let index = {};

  // Ensure cache directory exists
  try {
    fs.mkdirSync(cacheDir, { recursive: true });
  } catch (e) {
    // ignore if exists
  }

  // Load existing index
  try {
    if (fs.existsSync(indexPath)) {
      const data = fs.readFileSync(indexPath, 'utf8');
      index = JSON.parse(data);
      console.log(`[TTSCache] Loaded ${Object.keys(index).length} cached entries`);
    }
  } catch (err) {
    console.warn('[TTSCache] Failed to load index:', err.message);
    index = {};
  }

  /**
   * Generate a deterministic cache key from text + voice settings.
   * Same text + same voice = same key = cache hit.
   */
  function makeKey(text, voiceSettings = {}) {
    const normalized = (text || '')
      .trim()
      .replace(/\s+/g, ' ')  // normalize whitespace
      .toLowerCase();          // case-insensitive matching

    const voiceStr = [
      voiceSettings.voice || 'default',
      voiceSettings.speed || '1.0',
      voiceSettings.pitch || '+0%',
      voiceSettings.rate || '100%',
    ].join('|');

    const raw = `${voiceStr}::${normalized}`;
    return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32);
  }

  /**
   * Save the index to disk.
   */
  function saveIndex() {
    try {
      fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
    } catch (err) {
      console.warn('[TTSCache] Failed to save index:', err.message);
    }
  }

  return {
    /**
     * Check if a text has cached audio.
     * @param {string} text - The narration text
     * @param {object} voiceSettings - Voice settings
     * @returns {{ hit: boolean, audioBase64?: string, audioType?: string }}
     */
    get(text, voiceSettings = {}) {
      const key = makeKey(text, voiceSettings);
      const entry = index[key];

      if (!entry) return { hit: false };

      // Check if file exists
      const filePath = path.join(cacheDir, `${key}.${entry.audioType || 'mp3'}`);
      if (!fs.existsSync(filePath)) {
        delete index[key];
        return { hit: false };
      }

      // Read the cached audio
      try {
        const audioBuffer = fs.readFileSync(filePath);
        entry.hitCount = (entry.hitCount || 0) + 1;
        entry.lastHit = Date.now();
        // Async save (non-blocking)
        setImmediate(saveIndex);

        return {
          hit: true,
          audioBase64: audioBuffer.toString('base64'),
          audioType: entry.audioType || 'mp3',
          charCount: entry.charCount,
          hitCount: entry.hitCount,
        };
      } catch (err) {
        console.warn('[TTSCache] Failed to read cached audio:', err.message);
        return { hit: false };
      }
    },

    /**
     * Store audio in the cache.
     * @param {string} text - The narration text
     * @param {Buffer|string} audioData - Audio buffer or base64 string
     * @param {string} audioType - 'mp3' or 'wav'
     * @param {object} voiceSettings - Voice settings used
     * @returns {boolean} Whether it was stored
     */
    set(text, audioData, audioType = 'mp3', voiceSettings = {}) {
      const key = makeKey(text, voiceSettings);
      const filePath = path.join(cacheDir, `${key}.${audioType}`);

      try {
        const buffer = typeof audioData === 'string'
          ? Buffer.from(audioData, 'base64')
          : audioData;

        fs.writeFileSync(filePath, buffer);

        index[key] = {
          audioType,
          charCount: (text || '').length,
          createdAt: Date.now(),
          hitCount: 0,
          voice: voiceSettings.voice || 'default',
        };

        // Evict old entries if over limit
        this._evictIfNeeded();
        setImmediate(saveIndex);

        return true;
      } catch (err) {
        console.warn('[TTSCache] Failed to store audio:', err.message);
        return false;
      }
    },

    /**
     * Check if a text has cached audio without reading it.
     * @param {string} text
     * @param {object} voiceSettings
     * @returns {boolean}
     */
    has(text, voiceSettings = {}) {
      const key = makeKey(text, voiceSettings);
      const entry = index[key];
      if (!entry) return false;
      const filePath = path.join(cacheDir, `${key}.${entry.audioType || 'mp3'}`);
      return fs.existsSync(filePath);
    },

    /**
     * Get cache statistics.
     */
    getStats() {
      const entries = Object.values(index);
      const totalHits = entries.reduce((sum, e) => sum + (e.hitCount || 0), 0);
      const totalChars = entries.reduce((sum, e) => sum + (e.charCount || 0), 0);

      return {
        entries: entries.length,
        maxEntries,
        totalHits,
        totalCharsCached: totalChars,
        estimatedTTSSaved: totalChars,  // Chars we didn't have to synthesize
        cacheDir,
      };
    },

    /**
     * Clean up expired entries.
     */
    cleanup() {
      const cutoff = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
      let removed = 0;

      for (const [key, entry] of Object.entries(index)) {
        if (entry.createdAt < cutoff) {
          const filePath = path.join(cacheDir, `${key}.${entry.audioType || 'mp3'}`);
          try {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          } catch (e) { /* ignore */ }
          delete index[key];
          removed++;
        }
      }

      if (removed > 0) {
        console.log(`[TTSCache] Cleaned up ${removed} expired entries`);
        saveIndex();
      }
      return removed;
    },

    /**
     * Evict least-recently-used entries if over maxEntries.
     * @private
     */
    _evictIfNeeded() {
      const keys = Object.keys(index);
      if (keys.length <= maxEntries) return;

      // Sort by lastHit (oldest first), then createdAt
      const sorted = keys
        .map(k => ({ key: k, ...index[k] }))
        .sort((a, b) => {
          const aTime = a.lastHit || a.createdAt || 0;
          const bTime = b.lastHit || b.createdAt || 0;
          return aTime - bTime;
        });

      const toRemove = sorted.slice(0, sorted.length - maxEntries);
      for (const entry of toRemove) {
        const filePath = path.join(cacheDir, `${entry.key}.${entry.audioType || 'mp3'}`);
        try {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch (e) { /* ignore */ }
        delete index[entry.key];
      }
    },
  };
}

module.exports = { createTTSCache };
