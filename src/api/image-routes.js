/**
 * Image API Routes — REST endpoints for image generation.
 *
 * Provides image generation, cache stats, and cache management.
 * Mounts on /api/image.
 */

'use strict';

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
