/**
 * Image API Routes — REST endpoints for image generation.
 *
 * Provides image generation, cache stats, and cache management.
 * Mounts on /api/image.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { createImageService } = require('../image');

// Singleton image service — created once on first route registration
let imageService = null;

function getImageService() {
  if (!imageService) {
    imageService = createImageService({
      cacheDir: process.env.IMAGE_CACHE_DIR || 'data/images',
    });
  }
  return imageService;
}

/**
 * Register image routes on a Fastify instance.
 */
async function imageRoutes(fastify, options) {

  // ── Generate Image ───────────────────────────────────────────
  fastify.post('/api/image/generate', async (request, reply) => {
    const { prompt, type, context } = request.body || {};

    if (!prompt && !type) {
      return reply.code(400).send({ error: 'Either prompt or type is required' });
    }

    const svc = getImageService();

    if (!svc.isEnabled) {
      return reply.code(503).send({ error: 'Image generation not available (no API key configured)' });
    }

    let result;

    try {
      if (type === 'scene' && context) {
        result = await svc.generateScene(context);
      } else if (type === 'character' && context) {
        result = await svc.generateCharacter(context);
      } else if (type === 'combat' && context) {
        result = await svc.generateCombat(context);
      } else if (prompt) {
        result = await svc.generateRaw(prompt);
      } else {
        return reply.code(400).send({ error: 'prompt is required when type has no context' });
      }
    } catch (err) {
      return reply.code(500).send({ error: 'Image generation failed', details: err.message });
    }

    if (!result) {
      return reply.code(429).send({ error: 'Image generation rate-limited or failed' });
    }

    return result;
  });

  // ── Serve Stored Image ──────────────────────────────────────
  fastify.get('/api/image/stored/:key', async (request, reply) => {
    const { key } = request.params;
    if (!key || !/^[a-f0-9]{16,64}$/.test(key)) {
      return reply.code(400).send({ error: 'Invalid image key' });
    }

    const svc = getImageService();
    const store = svc.persistentStore;

    if (!store || !store.has(key)) {
      return reply.code(404).send({ error: 'Image not found' });
    }

    const entry = store.get(key);
    const filePath = entry.filePath;

    // Determine content type from extension
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    try {
      const data = fs.readFileSync(filePath);
      reply.header('Content-Type', contentType);
      reply.header('Cache-Control', 'public, max-age=86400'); // 24h browser cache
      return reply.send(data);
    } catch (err) {
      return reply.code(500).send({ error: 'Failed to read stored image' });
    }
  });

  // ── List Stored Images (paginated) ───────────────────────
  fastify.get('/api/images', async (request, reply) => {
    const { limit, offset } = request.query || {};
    const svc = getImageService();
    const store = svc.persistentStore;
    if (!store) {
      return { items: [], total: 0, limit: 20, offset: 0 };
    }
    return store.listEntries({
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  });

  // ── Get Single Stored Image Metadata ──────────────────────
  fastify.get('/api/images/:key', async (request, reply) => {
    const { key } = request.params;
    if (!key || !/^[a-f0-9]{16,64}$/.test(key)) {
      return reply.code(400).send({ error: 'Invalid image key' });
    }
    const svc = getImageService();
    const stored = svc.getStoredImage ? svc.getStoredImage(key) : null;
    if (!stored) {
      return reply.code(404).send({ error: 'Image not found' });
    }
    return stored;
  });

  // ── Cleanup Old Stored Images ─────────────────────────────
  fastify.post('/api/images/cleanup', async (request, reply) => {
    const { maxAgeDays } = request.body || {};
    const svc = getImageService();
    const store = svc.persistentStore;
    if (!store) {
      return { removed: 0, message: 'No persistent store configured' };
    }
    const removed = store.cleanupOldEntries(maxAgeDays || 30);
    return { success: true, removed, maxAgeDays: maxAgeDays || 30 };
  });

  // ── Persistent Store Stats ───────────────────────────────────
  fastify.get('/api/image/store/stats', async (request, reply) => {
    const svc = getImageService();
    const store = svc.persistentStore;
    return {
      store: store ? store.stats() : { count: 0, maxEntries: 0, dir: 'N/A', entries: [] },
      memoryCache: svc.cacheStats,
      provider: svc.providerName,
      enabled: svc.isEnabled,
    };
  });

  // ── Cache Stats ──────────────────────────────────────────────
  fastify.get('/api/image/cache/stats', async (request, reply) => {
    const svc = getImageService();
    return {
      cache: svc.cacheStats,
      rateLimiter: svc.rateLimiterStats,
      provider: svc.providerName,
      enabled: svc.isEnabled,
    };
  });

  // ── Clear Cache ──────────────────────────────────────────────
  fastify.post('/api/image/cache/clear', async (request, reply) => {
    const svc = getImageService();
    svc.clearCache();
    return { success: true, message: 'Image cache cleared' };
  });
}

module.exports = imageRoutes;
