/**
 * image-service.js — Image Generation Service
 *
 * Provider-abstracted image generation for The Binding.
 * Supports:
 *   - Grok Imagine via xAI API  (XAI_API_KEY)
 *   - OpenAI DALL-E 2/3         (OPENAI_API_KEY)
 *
 * Auto-detects provider from env vars. Returns null (never throws) when no
 * API key is configured or when generation fails — the game continues without
 * images rather than crashing.
 */

'use strict';

const https = require('https');
const http  = require('http');
const { URL } = require('url');
const crypto = require('crypto');

const {
  buildScenePrompt,
  buildCharacterPrompt,
  buildCombatPrompt,
} = require('./prompt-builder');
const { createPersistentStore, makeKey: persistentMakeKey } = require('./persistent-store');

// ---------------------------------------------------------------------------
// Provider implementations
// ---------------------------------------------------------------------------

/**
 * POST JSON to a URL, return parsed response body.
 * Minimal HTTP client — no external deps.
 */
function postJSON(urlStr, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const payload = JSON.stringify(body);
    const transport = url.protocol === 'https:' ? https : http;

    const req = transport.request(
      {
        method: 'POST',
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          ...headers,
        },
        timeout: 60_000,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          try {
            resolve({ status: res.statusCode, body: JSON.parse(raw) });
          } catch {
            resolve({ status: res.statusCode, body: raw });
          }
        });
      },
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Image generation request timed out (60s)'));
    });
    req.write(payload);
    req.end();
  });
}


/**
 * Mock provider — returns a placeholder image without any external API.
 * Uses a tiny valid 1x1 red PNG as a data URI.
 */
async function generateWithMock(prompt, config) {
  // Generate an adventure-themed SVG placeholder based on prompt content
  const p = (prompt || '').toLowerCase();

  // Detect adventure type and mood from prompt
  let bg = '#1a1028'; let accent = '#8b0000'; let icon = '🕯️'; let border = '#3d2b5a';
  if (p.includes('dracula') || p.includes('vampire') || p.includes('castle') || p.includes('crypt')) {
    bg = '#0d0a1a'; accent = '#8b0000'; icon = '🦇'; border = '#4a1a2e';
  } else if (p.includes('frankenstein') || p.includes('laboratory') || p.includes('creature') || p.includes('alpine')) {
    bg = '#0f1a0f'; accent = '#2d5a2d'; icon = '⚡'; border = '#2a3d2a';
  } else if (p.includes('holmes') || p.includes('baker') || p.includes('moor') || p.includes('baskerville') || p.includes('hound')) {
    bg = '#1a1a1a'; accent = '#4a4a4a'; icon = '🔍'; border = '#3a3a3a';
  } else if (p.includes('combat') || p.includes('attack') || p.includes('weapon') || p.includes('fight')) {
    bg = '#1a0a0a'; accent = '#8b0000'; icon = '⚔️'; border = '#5a1a1a';
  } else if (p.includes('portrait') || p.includes('character')) {
    bg = '#1a1028'; accent = '#5a3d7a'; icon = '👤'; border = '#3d2b5a';
  }

  // Extract key text for display (sanitized, truncated)
  const displayText = (prompt || '')
    .replace(/A dark gothic literary illustration[^.]*\.\s*/i, '')
    .replace(/Dramatic chiaroscuro[^.]*\.\s*/i, '')
    .replace(/Inspired by[^.]*\.\s*/i, '')
    .replace(/Muted palette[^.]*\.\s*/i, '')
    .replace(/Heavy cross-hatching[^.]*\.\s*/i, '')
    .replace(/No modern elements[^.]*\.\s*/i, '')
    .replace(/The overall mood[^.]*\.\s*/i, '')
    .replace(/Painterly brush[^.]*\.\s*/i, '')
    .trim()
    .slice(0, 120);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="384" viewBox="0 0 512 384">
  <defs>
    <radialGradient id="glow" cx="50%" cy="50%" r="60%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="${bg}" stop-opacity="1"/>
    </radialGradient>
  </defs>
  <rect width="512" height="384" fill="${bg}"/>
  <rect x="2" y="2" width="508" height="380" fill="none" stroke="${border}" stroke-width="2" rx="4"/>
  <rect x="8" y="8" width="496" height="368" fill="url(#glow)"/>
  <text x="256" y="160" text-anchor="middle" font-size="64" fill="${accent}" opacity="0.3">${icon}</text>
  <text x="256" y="220" text-anchor="middle" font-family="Georgia, serif" font-size="14" fill="#a89cc8" opacity="0.7">${displayText.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}</text>
  <text x="256" y="250" text-anchor="middle" font-family="Georgia, serif" font-size="11" fill="#6a5f82" opacity="0.5">[Placeholder — awaiting API key]</text>
  <line x1="40" y1="340" x2="472" y2="340" stroke="${border}" stroke-width="1" opacity="0.3"/>
  <text x="256" y="365" text-anchor="middle" font-family="Georgia, serif" font-size="10" fill="#5a4f72" opacity="0.4">THE BINDING</text>
</svg>`;

  const placeholder = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
  console.log('  🖼️  [MOCK] Generated themed placeholder for: ' + (prompt || '').slice(0, 80) + '...');
  return placeholder;
}

/**
 * xAI / Grok Imagine provider.
 * Uses the images/generations endpoint.
 */
async function generateWithXAI(prompt, config) {
  const res = await postJSON(
    `${config.baseUrl || 'https://api.x.ai'}/v1/images/generations`,
    {
      model: config.model || 'grok-2-image',
      prompt,
      n: 1,
      response_format: 'url',
    },
    { Authorization: `Bearer ${config.apiKey}` },
  );

  if (res.status >= 400) {
    const msg = typeof res.body === 'object' ? JSON.stringify(res.body.error || res.body) : res.body;
    throw new Error(`xAI API error ${res.status}: ${msg}`);
  }

  const url = res.body?.data?.[0]?.url;
  if (!url) throw new Error('xAI returned no image URL');
  return url;
}

/**
 * OpenAI DALL-E provider.
 */
async function generateWithOpenAI(prompt, config) {
  const res = await postJSON(
    `${config.baseUrl || 'https://api.openai.com'}/v1/images/generations`,
    {
      model: config.model || 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      response_format: 'url',
    },
    { Authorization: `Bearer ${config.apiKey}` },
  );

  if (res.status >= 400) {
    const msg = typeof res.body === 'object' ? JSON.stringify(res.body.error || res.body) : res.body;
    throw new Error(`OpenAI API error ${res.status}: ${msg}`);
  }

  const url = res.body?.data?.[0]?.url;
  if (!url) throw new Error('OpenAI returned no image URL');
  return url;
}

// ---------------------------------------------------------------------------
// Provider detection
// ---------------------------------------------------------------------------

function detectProvider() {
  // Mock provider — works without any API key, for testing and development
  if (process.env.IMAGE_MOCK === 'true' || process.env.IMAGE_PROVIDER === 'mock') {
    return {
      name: 'Mock',
      apiKey: 'mock',
      baseUrl: '',
      model: 'mock-v1',
      generate: generateWithMock,
    };
  }

  if (process.env.XAI_API_KEY) {
    return {
      name: 'xAI',
      apiKey: process.env.XAI_API_KEY,
      baseUrl: process.env.XAI_BASE_URL || 'https://api.x.ai',
      model: process.env.XAI_IMAGE_MODEL || 'grok-2-image',
      generate: generateWithXAI,
    };
  }

  if (process.env.OPENAI_API_KEY) {
    return {
      name: 'OpenAI',
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com',
      model: process.env.OPENAI_IMAGE_MODEL || 'dall-e-3',
      generate: generateWithOpenAI,
    };
  }

  return null; // No provider available
}

// ---------------------------------------------------------------------------
// LRU-ish cache
// ---------------------------------------------------------------------------

class ImageCache {
  constructor(maxEntries = 100) {
    this._map = new Map();
    this._max = maxEntries;
  }

  get(key) {
    if (!this._map.has(key)) return undefined;
    // Move to end (most-recently used)
    const val = this._map.get(key);
    this._map.delete(key);
    this._map.set(key, val);
    return val;
  }

  set(key, value) {
    if (this._map.has(key)) this._map.delete(key);
    this._map.set(key, value);
    // Evict oldest
    if (this._map.size > this._max) {
      const oldest = this._map.keys().next().value;
      this._map.delete(oldest);
    }
  }

  has(key) {
    return this._map.has(key);
  }

  clear() {
    this._map.clear();
  }

  get size() {
    return this._map.size;
  }
}

// ---------------------------------------------------------------------------
// Session-level rate limiter
// ---------------------------------------------------------------------------

/**
 * Rate limiter for image generation per session.
 * Limits to maxImages per windowMs (default: 3 images per 5 minutes).
 */
class SessionRateLimiter {
  constructor(maxImages = 3, windowMs = 5 * 60 * 1000) {
    this._max = maxImages;
    this._window = windowMs;
    this._sessions = new Map(); // sessionId → { timestamps: [] }
  }

  /**
   * Check if a session can generate an image.
   * @param {string} sessionId
   * @returns {boolean} true if allowed, false if rate limited
   */
  canGenerate(sessionId) {
    if (!sessionId) return true; // No session = no rate limiting

    const now = Date.now();
    const session = this._sessions.get(sessionId);
    if (!session) return true;

    // Clean up old timestamps outside the window
    session.timestamps = session.timestamps.filter(t => now - t < this._window);
    this._sessions.set(sessionId, session);

    return session.timestamps.length < this._max;
  }

  /**
   * Record an image generation for a session.
   * @param {string} sessionId
   */
  recordGeneration(sessionId) {
    if (!sessionId) return;

    const now = Date.now();
    let session = this._sessions.get(sessionId);
    if (!session) {
      session = { timestamps: [] };
      this._sessions.set(sessionId, session);
    }

    // Clean up old timestamps
    session.timestamps = session.timestamps.filter(t => now - t < this._window);
    session.timestamps.push(now);
  }

  /**
   * Get remaining generations for a session.
   * @param {string} sessionId
   * @returns {number}
   */
  getRemaining(sessionId) {
    if (!sessionId) return this._max;

    const now = Date.now();
    const session = this._sessions.get(sessionId);
    if (!session) return this._max;

    session.timestamps = session.timestamps.filter(t => now - t < this._window);
    return Math.max(0, this._max - session.timestamps.length);
  }

  /**
   * Clear rate limit state for a session.
   * @param {string} sessionId
   */
  clearSession(sessionId) {
    this._sessions.delete(sessionId);
  }

  /**
   * Get stats for all sessions.
   */
  stats() {
    const now = Date.now();
    const sessions = {};
    for (const [sessionId, session] of this._sessions) {
      session.timestamps = session.timestamps.filter(t => now - t < this._window);
      sessions[sessionId] = {
        used: session.timestamps.length,
        remaining: Math.max(0, this._max - session.timestamps.length),
        windowMs: this._window,
      };
    }
    return { maxPerWindow: this._max, windowMs: this._window, sessions };
  }
}

// ---------------------------------------------------------------------------
// Image Service
// ---------------------------------------------------------------------------

/**
 * Create an image generation service instance.
 *
 * @param {object} [opts]
 * @param {object} [opts.provider]  - Override auto-detected provider
 * @param {number} [opts.cacheSize] - Max cached images (default 100)
 * @param {boolean} [opts.enabled]  - Force enable/disable (default: auto-detect)
 * @param {number} [opts.rateLimitMax] - Max images per session per window (default 3)
 * @param {number} [opts.rateLimitWindowMs] - Rate limit window in ms (default 5 min)
 * @returns {object} Image service API
 */
function createImageService(opts = {}) {
  const provider = opts.provider || detectProvider();
  const enabled = opts.enabled !== undefined ? opts.enabled : !!provider;
  const cache = new ImageCache(opts.cacheSize || 100);

  // Persistent disk store — survives restarts
  const persistentStore = opts.persistentStore || createPersistentStore({
    dir: opts.cacheDir || 'data/images',
    max: opts.maxStoredImages || 500,
  });

  // Session-level rate limiter
  const rateLimiter = new SessionRateLimiter(
    opts.rateLimitMax || 3,
    opts.rateLimitWindowMs || 5 * 60 * 1000
  );

  if (!enabled) {
    console.log('  🖼️  Image service: DISABLED (no XAI_API_KEY or OPENAI_API_KEY set)');
  } else {
    console.log(`  🖼️  Image service: ${provider.name} (${provider.model})`);
  }

  /**
   * Internal: generate a single image from a prompt, with caching.
   * Returns image URL string or null on failure.
   */
  async function generate(prompt, context = {}) {
    if (!enabled || !provider) return null;
    if (!prompt || typeof prompt !== 'string') return null;

    // Check rate limit if sessionId provided
    if (context.sessionId && !rateLimiter.canGenerate(context.sessionId)) {
      console.log(`  🖼️  Rate limited: session ${context.sessionId} exceeded ${rateLimiter._max} images per ${rateLimiter._window / 1000}s`);
      // Return cached version if available, otherwise null
      const cached = cache.get(prompt);
      return cached !== undefined ? cached : null;
    }

    // In-memory LRU cache (fast path)
    const cached = cache.get(prompt);
    if (cached !== undefined) return cached;

    // Persistent disk cache (survives restart)
    const persistKey = persistentMakeKey(prompt, provider ? provider.name : 'unknown', context.style || '');
    if (persistentStore.has(persistKey)) {
      const entry = persistentStore.get(persistKey);
      // Serve via the API endpoint
      const localUrl = `/api/image/stored/${persistKey}`;
      cache.set(prompt, localUrl);
      return localUrl;
    }

    try {
      const remoteUrl = await provider.generate(prompt, provider);
      if (!remoteUrl) return null;

      // Record generation for rate limiting
      if (context.sessionId) {
        rateLimiter.recordGeneration(context.sessionId);
      }

      // Data URIs (mock provider) are self-contained — cache in memory only
      if (remoteUrl.startsWith('data:')) {
        cache.set(prompt, remoteUrl);
        return remoteUrl;
      }

      // Download and persist to disk
      const stored = await persistentStore.store(persistKey, remoteUrl, {
        prompt,
        provider: provider.name,
        style: context.style || '',
      });

      if (stored) {
        const localUrl = `/api/image/stored/${persistKey}`;
        cache.set(prompt, localUrl);
        return localUrl;
      }

      // Fallback: use remote URL directly (may expire)
      cache.set(prompt, remoteUrl);
      return remoteUrl;
    } catch (err) {
      console.error(`  🖼️  Image generation failed (${provider.name}):`, err.message);
      return null;
    }
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  return {
    /**
     * Is the service able to generate images?
     */
    get isEnabled() {
      return enabled;
    },

    /**
     * Which provider is active (or null).
     */
    get providerName() {
      return provider ? provider.name : null;
    },

    /**
     * Generate an illustration for a narrative scene.
     * @param {object} sceneCtx - Scene context (see prompt-builder.buildScenePrompt)
     * @returns {Promise<string|null>} Image URL or null
     */
    async generateScene(sceneCtx) {
      const prompt = buildScenePrompt(sceneCtx);
      return generate(prompt, { style: 'scene' });
    },

    /**
     * Generate a character portrait.
     * @param {object} charCtx - Character context (see prompt-builder.buildCharacterPrompt)
     * @returns {Promise<string|null>} Image URL or null
     */
    async generateCharacter(charCtx) {
      const prompt = buildCharacterPrompt(charCtx);
      return generate(prompt, { style: 'character' });
    },

    /**
     * Generate combat scene art.
     * @param {object} combatCtx - Combat context (see prompt-builder.buildCombatPrompt)
     * @returns {Promise<string|null>} Image URL or null
     */
    async generateCombat(combatCtx) {
      const prompt = buildCombatPrompt(combatCtx);
      return generate(prompt, { style: 'combat' });
    },

    /**
     * Generate an image from an arbitrary prompt string.
     * Useful for custom or one-off illustrations.
     * @param {string} prompt
     * @returns {Promise<string|null>} Image URL or null
     */
    async generateRaw(prompt) {
      return generate(prompt, { style: 'raw' });
    },

    /**
     * Current cache stats.
     */
    get cacheStats() {
      return { size: cache.size, max: cache._max };
    },

    /**
     * Clear the image cache.
     */
    clearCache() {
      cache.clear();
    },

    /**
     * Get the persistent store (for serving stored images).
     */
    get persistentStore() {
      return persistentStore;
    },
  };
}

// ---------------------------------------------------------------------------
// Standalone Image Cache with TTL + LRU
//
// Used by generateAndCache() and getImageCacheStats().
// Separate from the per-service ImageCache above (which is prompt-keyed,
// no TTL).  This one is content-addressed by a hash of prompt + provider +
// style, stores structured entries, and expires them after 60 min.
// ---------------------------------------------------------------------------



const IMAGE_CACHE_TTL_MS = 60 * 60 * 1000; // 60 minutes
const IMAGE_CACHE_MAX = 50;

class ImageCacheStore {
  constructor(maxEntries = IMAGE_CACHE_MAX, ttlMs = IMAGE_CACHE_TTL_MS) {
    this._map = new Map();       // key → { imageUrl, prompt, generatedAt, expiresAt }
    this._max = maxEntries;
    this._ttl = ttlMs;
    this._hits = 0;
    this._misses = 0;
  }

  /**
   * Build a deterministic cache key from prompt + provider + style.
   */
  static makeKey(prompt, providerName, style) {
    const raw = `${providerName || 'unknown'}|${style || ''}|${prompt}`;
    return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32);
  }

  get(key) {
    const entry = this._map.get(key);
    if (!entry) { this._misses++; return undefined; }
    // Check TTL
    if (Date.now() > entry.expiresAt) {
      this._map.delete(key);
      this._misses++;
      return undefined;
    }
    // Move to end (most-recently used)
    this._map.delete(key);
    this._map.set(key, entry);
    this._hits++;
    return entry;
  }

  set(key, entry) {
    if (this._map.has(key)) this._map.delete(key);
    this._map.set(key, entry);
    // LRU eviction
    while (this._map.size > this._max) {
      const oldest = this._map.keys().next().value;
      this._map.delete(oldest);
    }
  }

  has(key) {
    const entry = this._map.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) { this._map.delete(key); return false; }
    return true;
  }

  clear() {
    this._map.clear();
    this._hits = 0;
    this._misses = 0;
  }

  get size() { return this._map.size; }

  stats() {
    const total = this._hits + this._misses;
    return {
      size: this._map.size,
      maxSize: this._max,
      ttlMs: this._ttl,
      hits: this._hits,
      misses: this._misses,
      hitRate: total > 0 ? Math.round((this._hits / total) * 10000) / 100 : 0,
      entries: Array.from(this._map.entries()).map(([key, val]) => ({
        key,
        prompt: val.prompt.slice(0, 120),
        generatedAt: val.generatedAt,
        expiresAt: val.expiresAt,
      })),
    };
  }
}

// Module-level singleton cache
const _imageCacheStore = new ImageCacheStore();

/**
 * Generate an image with caching.
 *
 * @param {object} service   - An image service instance (from createImageService)
 * @param {string} prompt    - The generation prompt
 * @param {object} [options] - { provider, style }
 * @returns {Promise<{ imageUrl: string|null, cached: boolean, prompt: string }>}
 */
async function generateAndCache(service, prompt, options = {}) {
  if (!service || !service.isEnabled) {
    return { imageUrl: null, cached: false, prompt };
  }

  const providerName = options.provider || service.providerName || 'unknown';
  const style = options.style || '';
  const key = ImageCacheStore.makeKey(prompt, providerName, style);

  // Check cache
  const cached = _imageCacheStore.get(key);
  if (cached) {
    return { imageUrl: cached.imageUrl, cached: true, prompt: cached.prompt };
  }

  // Generate
  const imageUrl = await service.generateRaw(prompt);
  if (!imageUrl) {
    return { imageUrl: null, cached: false, prompt };
  }

  // Store
  const now = Date.now();
  _imageCacheStore.set(key, {
    imageUrl,
    prompt,
    generatedAt: now,
    expiresAt: now + IMAGE_CACHE_TTL_MS,
  });

  return { imageUrl, cached: false, prompt };
}

/**
 * Return cache statistics.
 */
function getImageCacheStats() {
  return _imageCacheStore.stats();
}

/**
 * Clear the standalone image cache.
 */
function clearImageCache() {
  _imageCacheStore.clear();
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  createImageService,
  generateAndCache,
  getImageCacheStats,
  clearImageCache,
  // Expose for testing
  ImageCacheStore,
  IMAGE_CACHE_TTL_MS,
  IMAGE_CACHE_MAX,
  SessionRateLimiter,
};
