/**
 * src/image/index.js — Image Generation Pipeline
 *
 * Module entry point. Exports createImageService() which returns a
 * provider-abstracted image generation service for The Binding.
 *
 * Usage:
 *   const { createImageService } = require('./src/image');
 *   const images = createImageService();
 *
 *   // Scene illustration (returns metadata object)
 *   const result = await images.generateScene({
 *     description: 'A vast crypt beneath the castle, stone coffins lining the walls.',
 *     location: 'Beneath Castle Dracula',
 *     mood: 'dread',
 *   });
 *   // result = { url, cached, provider, timestamp } or null
 *
 *   // Simple URL-only generation (backward-compatible)
 *   const url = await images.generateSimple('A dark castle at night');
 *
 *   // Character portrait
 *   const portrait = await images.generateCharacter({
 *     name: 'Van Helsing',
 *     classType: 'vampire hunter',
 *     appearance: 'Weathered face, silver hair, piercing grey eyes.',
 *     mood: 'tense',
 *   });
 *
 *   // Combat art
 *   const combat = await images.generateCombat({
 *     attacker: 'A cloaked figure with a silver-tipped stake',
 *     defender: 'A hissing vampire lord',
 *     weapon: 'Silver stake',
 *     location: 'A moonlit graveyard',
 *     outcome: 'critical',
 *   });
 *
 *   // Cache stats
 *   const stats = images.cacheStats;
 *   // { size, max, diskSize, cacheDir }
 *
 * Environment variables (auto-detects provider):
 *   XAI_API_KEY       — Enables Grok Imagine (xAI)
 *   OPENAI_API_KEY    — Enables DALL-E (OpenAI)
 *
 * Options:
 *   cacheDir   — Directory for disk-persistent image cache
 *   rateLimit  — Max requests per rate window (default 5)
 *   rateWindow — Rate window in ms (default 10000)
 *
 * When no key is set, all generate* methods return null gracefully —
 * the game continues without images.
 */

'use strict';

const {
  createImageService,
  ImageCache,
  RateLimiter,
  withRetry,
  hashPrompt,
} = require('./image-service');

module.exports = {
  createImageService,
  ImageCache,
  RateLimiter,
  withRetry,
  hashPrompt,
};
