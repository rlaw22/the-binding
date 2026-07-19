/**
 * Voice Module — TTS integration for The Binding.
 *
 * Entry point for the voice subsystem.
 * Provides text-to-speech for DM narration.
 *
 * Usage:
 *   const { createVoiceService } = require('./voice');
 *   const voice = createVoiceService({ speed: 0.9 });
 *   const result = await voice.generate("The innkeeper looks at you with alarm...");
 */

const { createTTSService, getCachedAudio, cleanupCache, detectProvider } = require('./tts-service');
const { createSTTService, detectProvider: detectSTTProvider } = require('./stt-service');

/**
 * Create a voice service with sensible defaults for DM narration.
 *
 * @param {Object} [config]
 * @param {string} [config.provider] - Force a specific provider
 * @param {string} [config.voice] - Voice name (default: provider-specific)
 * @param {number} [config.speed] - Speech speed (default: 0.95 — slightly slower for dramatic narration)
 * @param {string} [config.language] - Language (default: 'en-US')
 * @returns {Object} Voice service
 */
function createVoiceService(config = {}) {
  return createTTSService({
    speed: config.speed || 0.95,
    language: config.language || 'en-US',
    voice: config.voice,
    provider: config.provider
  });
}

module.exports = {
  createVoiceService,
  createTTSService,
  createSTTService,
  getCachedAudio,
  cleanupCache,
  detectProvider,
  detectSTTProvider
};
