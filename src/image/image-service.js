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

const {
  buildScenePrompt,
  buildCharacterPrompt,
  buildCombatPrompt,
} = require('./prompt-builder');

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
// Image Service
// ---------------------------------------------------------------------------

/**
 * Create an image generation service instance.
 *
 * @param {object} [opts]
 * @param {object} [opts.provider]  - Override auto-detected provider
 * @param {number} [opts.cacheSize] - Max cached images (default 100)
 * @param {boolean} [opts.enabled]  - Force enable/disable (default: auto-detect)
 * @returns {object} Image service API
 */
function createImageService(opts = {}) {
  const provider = opts.provider || detectProvider();
  const enabled = opts.enabled !== undefined ? opts.enabled : !!provider;
  const cache = new ImageCache(opts.cacheSize || 100);

  if (!enabled) {
    console.log('  🖼️  Image service: DISABLED (no XAI_API_KEY or OPENAI_API_KEY set)');
  } else {
    console.log(`  🖼️  Image service: ${provider.name} (${provider.model})`);
  }

  /**
   * Internal: generate a single image from a prompt, with caching.
   * Returns image URL string or null on failure.
   */
  async function generate(prompt) {
    if (!enabled || !provider) return null;
    if (!prompt || typeof prompt !== 'string') return null;

    // Cache key is the prompt itself (deterministic enough for game art)
    const cached = cache.get(prompt);
    if (cached !== undefined) return cached;

    try {
      const url = await provider.generate(prompt, provider);
      cache.set(prompt, url);
      return url;
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
      return generate(prompt);
    },

    /**
     * Generate a character portrait.
     * @param {object} charCtx - Character context (see prompt-builder.buildCharacterPrompt)
     * @returns {Promise<string|null>} Image URL or null
     */
    async generateCharacter(charCtx) {
      const prompt = buildCharacterPrompt(charCtx);
      return generate(prompt);
    },

    /**
     * Generate combat scene art.
     * @param {object} combatCtx - Combat context (see prompt-builder.buildCombatPrompt)
     * @returns {Promise<string|null>} Image URL or null
     */
    async generateCombat(combatCtx) {
      const prompt = buildCombatPrompt(combatCtx);
      return generate(prompt);
    },

    /**
     * Generate an image from an arbitrary prompt string.
     * Useful for custom or one-off illustrations.
     * @param {string} prompt
     * @returns {Promise<string|null>} Image URL or null
     */
    async generateRaw(prompt) {
      return generate(prompt);
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
  };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = { createImageService };
