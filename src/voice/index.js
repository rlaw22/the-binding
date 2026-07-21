/**
 * Voice Module — TTS integration for The Binding.
 *
 * Entry point for the voice subsystem.
 * Provides text-to-speech for DM narration with per-adventure voice mapping.
 *
 * Usage:
 *   const { createVoiceService } = require('./voice');
 *   const voice = createVoiceService({ speed: 0.9 });
 *   const result = await voice.generate("The innkeeper looks at you with alarm...");
 *
 * Voice mapping per adventure:
 *   const voice = createVoiceService({ adventureId: 'dracula' });
 *   // DM voice = 'onyx', Dracula NPC = 'nova', Van Helsing = 'echo', etc.
 */

const { createTTSService, getCachedAudio, cleanupCache, detectProvider, wrapSSML } = require('./tts-service');
const { createSTTService, detectProvider: detectSTTProvider } = require('./stt-service');

/**
 * Per-adventure voice mappings.
 * Each adventure has a DM (narrator) voice and NPC character voices.
 * Voice names are provider-specific (OpenAI voices shown as defaults).
 * Override any voice via config.voiceMap or environment variables.
 */
const ADVENTURE_VOICE_MAPS = {
  dracula: {
    dm: 'onyx',           // Deep, dramatic narrator
    dracula: 'nova',      // Smooth, seductive — the Count
    van_helsing: 'echo',  // Authoritative, accented
    mina: 'shimmer',      // Warm, intelligent
    lucy: 'alloy',        // Light, vivacious
    renfield: 'fable',    // Unsettling, manic
    jonathan: 'nova',     // Young, earnest
    seward: 'onyx',       // Clinical, steady
    innkeeper: 'echo',    // Worried, accented
    driver: 'fable'       // Mysterious, low
  },
  frankenstein: {
    dm: 'onyx',           // Philosophical, weighty narrator
    victor: 'nova',       // Passionate, driven
    creature: 'echo',     // Deep, eloquent, tragic
    elizabeth: 'shimmer', // Gentle, poetic
    clerval: 'alloy',     // Warm, adventurous
    waldman: 'onyx',      // Commanding, professorial
    alphonse: 'fable'     // Dignified, loving
  },
  holmes: {
    dm: 'onyx',           // Victorian, atmospheric narrator
    holmes: 'echo',       // Sharp, analytical, dry
    watson: 'nova',       // Warm, loyal, observant
    stapleton: 'alloy',   // Charming, deceptive
    beryl: 'shimmer',     // Frightened, brave
    sir_henry: 'nova',    // Direct, courageous
    barrymore: 'fable',   // Rigid, secretive
    mortimer: 'echo',     // Thoughtful, troubled
    selden: 'fable',      // Rough, terrified
    laura_lyons: 'shimmer', // Vulnerable, manipulated
    lestrade: 'onyx'      // Dogged, official
  }
};

/**
 * Resolve the voice for a specific character in an adventure.
 *
 * @param {string} adventureId - 'dracula' | 'frankenstein' | 'holmes'
 * @param {string} [characterId] - NPC id (e.g. 'dracula', 'holmes'). Omit for DM voice.
 * @param {Object} [overrides] - Custom voice overrides merged on top
 * @returns {string} Voice name
 */
function resolveVoice(adventureId, characterId, overrides = {}) {
  const adventureMap = ADVENTURE_VOICE_MAPS[adventureId] || {};
  // Check overrides first, then adventure map, then fallback
  if (characterId && overrides[characterId]) return overrides[characterId];
  if (characterId && adventureMap[characterId]) return adventureMap[characterId];
  if (overrides.dm) return overrides.dm;
  if (adventureMap.dm) return adventureMap.dm;
  return 'nova'; // ultimate fallback
}

/**
 * Create a voice service with sensible defaults for DM narration.
 *
 * @param {Object} [config]
 * @param {string} [config.provider] - Force a specific provider
 * @param {string} [config.voice] - Voice name (default: provider-specific)
 * @param {number} [config.speed] - Speech speed (default: 0.95 — slightly slower for dramatic narration)
 * @param {string} [config.language] - Language (default: 'en-US')
 * @param {string} [config.adventureId] - Adventure ID for voice mapping ('dracula', 'frankenstein', 'holmes')
 * @param {Object} [config.voiceMap] - Custom voice overrides per character
 * @returns {Object} Voice service with generate(), generateForCharacter(), getVoiceMap()
 */
function createVoiceService(config = {}) {
  const ttsService = createTTSService({
    speed: config.speed || 0.95,
    language: config.language || 'en-US',
    voice: config.voice || resolveVoice(config.adventureId, null, config.voiceMap),
    provider: config.provider
  });

  const adventureId = config.adventureId || null;
  const voiceMap = config.voiceMap || {};

  return {
    ...ttsService,

    /**
     * Generate TTS for a specific NPC character in the adventure.
     * Uses the adventure's voice map to select the right voice.
     *
     * @param {string} text - Text to speak
     * @param {string} characterId - NPC id (e.g. 'dracula', 'holmes')
     * @param {Object} [options] - Additional options (rate, pitch, etc.)
     */
    async generateForCharacter(text, characterId, options = {}) {
      const voice = resolveVoice(adventureId, characterId, voiceMap);
      // Create a one-off service with the character's voice
      const charService = createTTSService({
        provider: ttsService.provider,
        voice,
        speed: options.speed || ttsService.speed,
        language: ttsService.language
      });
      return charService.generate(text, options);
    },

    /**
     * Get the full voice map for the current adventure.
     */
    getVoiceMap() {
      const base = ADVENTURE_VOICE_MAPS[adventureId] || {};
      return { ...base, ...voiceMap };
    },

    adventureId
  };
}

module.exports = {
  createVoiceService,
  createTTSService,
  createSTTService,
  getCachedAudio,
  cleanupCache,
  detectProvider,
  detectSTTProvider,
  resolveVoice,
  ADVENTURE_VOICE_MAPS,
  wrapSSML
};
