/**
 * TTS Service — Provider-agnostic text-to-speech for The Binding.
 *
 * Supports: Mock (no key), Novita AI (async), OpenAI TTS (sync), ElevenLabs (sync).
 * Falls back gracefully if no provider is configured.
 *
 * Mock provider returns a tiny valid WAV buffer for full end-to-end testing
 * without any API key. Set TTS_PROVIDER=mock or leave all API keys unset.
 *
 * SSML support: wrapText() converts plain text to SSML with prosody control
 * for providers that support it (mock, openai).
 */

const https = require('https');
const http = require('http');

// In-memory audio cache: taskId -> { audioUrl, audioBase64, audioType, expiresAt }
const audioCache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// ─── Circuit Breaker ────────────────────────────────────────────────────────

/**
 * Circuit breaker pattern for TTS providers.
 * If a provider fails `threshold` times within `windowMs`, the circuit opens
 * and all requests auto-failover to mock for the remainder of the window.
 * After the window expires, the circuit resets (half-open → closed).
 *
 * States:
 *   closed  — normal operation, requests go to the real provider
 *   open    — provider is down, all requests go to mock immediately
 *   half-open — window expired, one probe request allowed through
 */
class CircuitBreaker {
  /**
   * @param {Object} opts
   * @param {number} [opts.threshold=3] — failures before opening
   * @param {number} [opts.windowMs=60000] — rolling window in ms
   */
  constructor(opts = {}) {
    this._threshold = opts.threshold || 3;
    this._windowMs = opts.windowMs || 60_000;
    this._failures = [];       // timestamps of recent failures
    this._state = 'closed';    // 'closed' | 'open' | 'half-open'
    this._openedAt = 0;        // when the circuit opened
  }

  /** Current state string. */
  get state() { return this._state; }

  /** Number of failures in the current window. */
  get failureCount() { return this._pruneFailures(); }

  /** Is the circuit allowing requests through to the real provider? */
  get isClosed() { return this._state === 'closed' || this._state === 'half-open'; }

  /**
   * Record a successful call. Resets failure count and closes the circuit.
   */
  recordSuccess() {
    this._failures = [];
    this._state = 'closed';
    this._openedAt = 0;
  }

  /**
   * Record a failed call. If threshold is reached within the window, opens the circuit.
   */
  recordFailure() {
    const now = Date.now();
    this._failures.push(now);
    this._pruneFailures();

    if (this._failures.length >= this._threshold) {
      this._state = 'open';
      this._openedAt = now;
    }
  }

  /**
   * Check whether a request should be allowed through.
   * Returns true if the request should go to the real provider.
   */
  allowRequest() {
    if (this._state === 'closed') return true;

    if (this._state === 'open') {
      // Check if the window has expired
      if (Date.now() - this._openedAt >= this._windowMs) {
        this._state = 'half-open';
        return true; // Allow one probe request
      }
      return false;
    }

    // half-open — allow the probe
    return true;
  }

  /**
   * Force-reset the breaker to closed state (e.g. for testing).
   */
  reset() {
    this._failures = [];
    this._state = 'closed';
    this._openedAt = 0;
  }

  /**
   * Prune failures outside the rolling window. Returns current count.
   * @private
   */
  _pruneFailures() {
    const cutoff = Date.now() - this._windowMs;
    this._failures = this._failures.filter(t => t > cutoff);
    return this._failures.length;
  }
}

// ─── Voice Profile System ───────────────────────────────────────────────────

/**
 * Character type voice presets for TTS.
 * Maps character archetypes to voice settings with numeric pitch/rate values.
 * These provide quick voice selection for common character types.
 *
 * Each profile: { voice, pitch, rate }
 *   voice: OpenAI voice name (mapped to Novita via OPENAI_TO_NOVITA_VOICE_MAP)
 *   pitch: Pitch multiplier (1.0 = normal, <1.0 = lower, >1.0 = higher)
 *   rate: Speed multiplier (1.0 = normal, <1.0 = slower, >1.0 = faster)
 */
const CHARACTER_VOICE_PRESETS = {
  narrator: { voice: 'nova', pitch: 1.0, rate: 0.9 },
  villain: { voice: 'onyx', pitch: 0.8, rate: 0.85 },
  ally: { voice: 'shimmer', pitch: 1.1, rate: 1.0 },
  merchant: { voice: 'alloy', pitch: 0.95, rate: 1.1 },
  monster: { voice: 'onyx', pitch: 0.7, rate: 0.8 }
};

/**
 * Default voice settings used when a character type is not found.
 */
const DEFAULT_VOICE_SETTINGS = { voice: 'nova', pitch: 1.0, rate: 1.0 };

/**
 * Get voice settings for a character type.
 * Returns the preset for the given type, or the default if not found.
 *
 * @param {string} characterType — e.g. 'narrator', 'villain', 'merchant'
 * @returns {{ voice: string, pitch: number, rate: number }} Voice settings
 */
function getVoiceForCharacter(characterType) {
  if (!characterType) return { ...DEFAULT_VOICE_SETTINGS };
  const key = characterType.toLowerCase().trim();
  return CHARACTER_VOICE_PRESETS[key] || { ...DEFAULT_VOICE_SETTINGS };
}

/**
 * Generic NPC voice archetypes for game characters.
 * These are adventure-agnostic profiles that map character *types*
 * (villain, merchant, guard, etc.) to voice settings.
 * Adventure-specific presets in voice-presets.js take priority;
 * these are the fallback when no adventure preset exists.
 *
 * Each profile: { voiceId, pitch, rate, volume, description }
 */
const VOICE_PROFILES = {
  narrator: {
    voiceId: 'onyx',
    pitch: '-10%',
    rate: '90%',
    volume: 'medium',
    description: 'Deep, omniscient narrator — measured and atmospheric'
  },
  villain: {
    voiceId: 'nova',
    pitch: '-20%',
    rate: '85%',
    volume: 'soft',
    description: 'Smooth, menacing antagonist — low and deliberate'
  },
  merchant: {
    voiceId: 'alloy',
    pitch: '+5%',
    rate: '105%',
    volume: 'medium',
    description: 'Friendly, slightly fast-talking shopkeeper — eager to sell'
  },
  innkeeper: {
    voiceId: 'echo',
    pitch: '+0%',
    rate: '90%',
    volume: 'soft',
    description: 'Warm, hospitable, slightly worried — knows local gossip'
  },
  guard: {
    voiceId: 'onyx',
    pitch: '-5%',
    rate: '100%',
    volume: 'loud',
    description: 'Authoritative, clipped, no-nonsense — speaks in short commands'
  },
  mysterious_figure: {
    voiceId: 'fable',
    pitch: '-15%',
    rate: '80%',
    volume: 'soft',
    description: 'Ethereal, whispering, otherworldly — pauses between phrases'
  },
  elder: {
    voiceId: 'echo',
    pitch: '-10%',
    rate: '80%',
    volume: 'soft',
    description: 'Wise, slow, deliberate — speaks with ancient authority'
  },
  child: {
    voiceId: 'shimmer',
    pitch: '+20%',
    rate: '115%',
    volume: 'medium',
    description: 'High-pitched, quick, innocent — curious and excitable'
  },
  scholar: {
    voiceId: 'nova',
    pitch: '+0%',
    rate: '95%',
    volume: 'medium',
    description: 'Precise, articulate, slightly pedantic — loves big words'
  },
  ghost: {
    voiceId: 'fable',
    pitch: '-20%',
    rate: '70%',
    volume: 'x-soft',
    description: 'Fading, spectral, barely-there — words dissolve into silence'
  }
};

/**
 * Get a voice profile by archetype name.
 * @param {string} profileName — e.g. 'villain', 'merchant', 'narrator'
 * @returns {Object|null} Voice profile or null if not found
 */
function getVoiceProfile(profileName) {
  if (!profileName) return null;
  return VOICE_PROFILES[profileName.toLowerCase()] || null;
}

/**
 * List all available voice profile names.
 * @returns {string[]}
 */
function listVoiceProfiles() {
  return Object.keys(VOICE_PROFILES);
}

/**
 * Resolve voice settings for a character, checking (in order):
 *   1. Explicit overrides passed in options
n *   2. Adventure-specific preset (from voice-presets.js)
 *   3. Generic voice profile (VOICE_PROFILES)
 *   4. Defaults
 *
 * @param {Object} opts
n * @param {string} [opts.adventureId] — Adventure ID for preset lookup
 * @param {string} [opts.characterId] — Character ID for preset lookup
 * @param {string} [opts.profile] — Generic profile name (e.g. 'villain')
 * @param {Object} [opts.overrides] — Explicit overrides { voiceId, pitch, rate, volume }
 * @returns {Object} Resolved voice settings { voiceId, pitch, rate, volume }
 */
function resolveVoiceSettings(opts = {}) {
  const { adventureId, characterId, profile, overrides = {} } = opts;

  // Start with defaults
  let settings = {
    voiceId: 'nova',
    pitch: '+0%',
    rate: '100%',
    volume: 'medium'
  };

  // Layer 1: Generic voice profile
  if (profile) {
    const prof = getVoiceProfile(profile);
    if (prof) settings = { ...settings, ...prof };
  }

  // Layer 2: Adventure-specific preset (takes priority over profile)
  if (adventureId) {
    try {
      const { getVoicePreset } = require('./voice-presets');
      const preset = getVoicePreset(adventureId, characterId);
      if (preset) settings = { ...settings, ...preset };
    } catch (e) { /* voice-presets not available */ }
  }

  // Layer 3: Explicit overrides (highest priority)
  if (overrides.voiceId) settings.voiceId = overrides.voiceId;
  if (overrides.pitch) settings.pitch = overrides.pitch;
  if (overrides.rate) settings.rate = overrides.rate;
  if (overrides.volume) settings.volume = overrides.volume;

  return settings;
}

// ─── SSML Dramatic Helpers ──────────────────────────────────────────────────

/**
 * SSML helper functions for dramatic text effects.
 * These produce SSML fragments that can be embedded in text.
 * All functions return plain text if the input is empty.
 */
const ssml = {
  /**
   * Insert a dramatic pause.
   * @param {number} [ms=800] — Pause duration in milliseconds
   * @returns {string} SSML break tag
   */
  pause(ms = 800) {
    return `<break time="${ms}ms"/>`;
  },

  /**
   * Add emphasis to a word or phrase.
   * @param {string} text — Text to emphasize
   * @param {string} [level='strong'] — 'strong' | 'moderate' | 'reduced'
   * @returns {string} SSML emphasis-wrapped text
   */
  emphasize(text, level = 'strong') {
    if (!text) return '';
    return `<emphasis level="${level}">${text}</emphasis>`;
  },

  /**
   * Whisper text — very soft, slow, low volume.
   * Perfect for spooky moments, secrets, ghosts.
   * @param {string} text — Text to whisper
   * @returns {string} SSML prosody-wrapped whisper
   */
  whisper(text) {
    if (!text) return '';
    return `<prosody rate="slow" volume="x-soft" pitch="low">${text}</prosody>`;
  },

  /**
   * Shout or exclaim text — loud, fast, high pitch.
   * @param {string} text — Text to shout
   * @returns {string} SSML prosody-wrapped shout
   */
  shout(text) {
    if (!text) return '';
    return `<prosody rate="fast" volume="x-loud" pitch="high">${text}</prosody>`;
  },

  /**
   * Slow, ominous delivery — for dread and tension.
   * @param {string} text — Text to deliver ominously
   * @returns {string} SSML prosody-wrapped ominous text
   */
  ominous(text) {
    if (!text) return '';
    return `<prosody rate="x-slow" volume="soft" pitch="x-low">${text}</prosody>`;
  },

  /**
   * Say text as a specific character voice (using prosody).
   * @param {string} text — Text to speak
   * @param {Object} voice — Voice settings { pitch, rate, volume }
   * @returns {string} SSML prosody-wrapped text
   */
  asCharacter(text, voice = {}) {
    if (!text) return '';
    const attrs = [];
    if (voice.pitch) attrs.push(`pitch="${voice.pitch}"`);
    if (voice.rate) attrs.push(`rate="${voice.rate}"`);
    if (voice.volume) attrs.push(`volume="${voice.volume}"`);
    if (attrs.length === 0) return text;
    return `<prosody ${attrs.join(' ')}>${text}</prosody>`;
  },

  /**
   * Build a dramatic sequence: text with pauses between sentences.
   * Splits on sentence boundaries and inserts pauses.
   * @param {string} text — Full text with sentences
   * @param {number} [pauseMs=600] — Pause between sentences in ms
   * @returns {string} SSML with breaks between sentences
   */
  dramaticSequence(text, pauseMs = 600) {
    if (!text) return '';
    const sentences = text.split(/(?<=[.!?])\s+/);
    const breakTag = `<break time="${pauseMs}ms"/>`;
    return sentences.map(s => s.trim()).filter(Boolean).join(` ${breakTag} `);
  },

  /**
   * Wrap text in SSML speak tags (convenience).
   * @param {string} inner — SSML content
   * @param {string} [lang='en-US'] — Language code
   * @returns {string} Full SSML document
   */
  wrap(inner, lang = 'en-US') {
    if (!inner) return '';
    return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${lang}">${inner}</speak>`;
  }
};

/**
 * Detect which TTS provider is available based on env vars.
 * Priority: explicit TTS_PROVIDER > Novita > OpenAI > ElevenLabs > mock
 */
function detectProvider() {
  // Explicit override takes highest priority
  const explicit = (process.env.TTS_PROVIDER || '').toLowerCase();
  if (explicit === 'mock') return 'mock';
  if (explicit === 'novita') return 'novita';
  if (explicit === 'openai') return 'openai';
  if (explicit === 'elevenlabs') return 'elevenlabs';

  if (process.env.NOVITA_API_KEY) return 'novita';
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.ELEVENLABS_API_KEY) return 'elevenlabs';
  return 'mock'; // Default to mock — always works
}

/**
 * Create a TTS service instance.
 *
 * @param {Object} config
 * @param {string} [config.provider] - 'novita' | 'openai' | 'elevenlabs' (auto-detected if omitted)
 * @param {string} [config.voice] - Voice name/id (provider-specific default if omitted)
 * @param {number} [config.speed] - Speech speed, 0.8-3.0 (default 1.0)
 * @param {string} [config.language] - Language code (default 'en-US')
 * @returns {Object} TTS service with generate() and getAudio() methods
 */
function createTTSService(config = {}) {
  const provider = config.provider || detectProvider();
  const voice = config.voice || getDefaultVoice(provider);
  const speed = config.speed || 1.0;
  const language = config.language || 'en-US';

  if (!provider || provider === 'null') {
    console.warn('[TTS] TTS explicitly disabled. Voice disabled.');
    return createNullTTSService({ speed, language, voice });
  }

  console.log(`[TTS] Provider: ${provider}, Voice: ${voice}, Speed: ${speed}`);

  return {
    provider,
    voice,
    speed,
    language,

    /**
     * Generate TTS audio for the given text.
     * Returns { taskId, status, audioUrl?, audioBase64?, audioType? }
     * For async providers (Novita), taskId is returned immediately and audio is fetched later.
     * For sync providers (OpenAI, ElevenLabs), audio is returned immediately.
     */
    async generate(text, options = {}) {
      if (!text || text.trim().length === 0) {
        return { taskId: null, status: 'skipped', reason: 'empty text' };
      }

      // Truncate very long text — TTS APIs have limits
      const truncated = truncateForTTS(text, 500);

      // Apply SSML wrapping if requested and provider supports it
      const ssmlEnabled = options.ssml !== false; // default on
      const inputText = ssmlEnabled ? wrapSSML(truncated, options, provider) : truncated;

      try {
        switch (provider) {
          case 'mock':
            return generateMock(inputText, voice, speed, {
              characterName: options.characterName,
              adventureId: options.adventureId,
              pitch: options.pitch,
              rate: options.rate,
              volume: options.volume
            });
          case 'novita':
            return await generateNovita(truncated, voice, speed, language); // Novita doesn't support SSML
          case 'openai':
            return await generateOpenAI(inputText, voice, speed);
          case 'elevenlabs':
            return await generateElevenLabs(truncated, voice); // ElevenLabs doesn't support SSML
          default:
            return { taskId: null, status: 'error', reason: `Unknown provider: ${provider}` };
        }
      } catch (err) {
        console.error(`[TTS] Generation failed (${provider}):`, err.message);
        return { taskId: null, status: 'error', reason: err.message };
      }
    },

    /**
     * Get audio data for a completed TTS task.
     * For async providers, this polls for the result.
     * Returns { audioUrl, audioBase64?, audioType, ready }
     */
    async getAudio(taskId) {
      if (!taskId) return { ready: false, reason: 'no taskId' };

      // Check cache first
      const cached = audioCache.get(taskId);
      if (cached && cached.expiresAt > Date.now()) {
        return { ...cached, ready: true };
      }

      try {
        switch (provider) {
          case 'novita':
            return await pollNovitaTask(taskId);
          default:
            return { ready: false, reason: 'getAudio not needed for sync provider' };
        }
      } catch (err) {
        console.error(`[TTS] getAudio failed:`, err.message);
        return { ready: false, reason: err.message };
      }
    },

    /**
     * Check if the service is configured and ready.
     */
    isReady() {
      return provider !== 'null';
    }
  };
}

/**
 * Null TTS service — used when no provider is configured.
 * All methods are no-ops that return gracefully.
 */
function createNullTTSService(config = {}) {
  const speed = config.speed || 1.0;
  const language = config.language || 'en-US';
  const voice = config.voice || null;
  return {
    provider: null,
    voice,
    speed,
    language,
    async generate(text) {
      if (!text || (typeof text === 'string' && text.trim().length === 0)) {
        return { taskId: null, status: 'skipped', reason: 'empty text' };
      }
      return { taskId: null, status: 'disabled', reason: 'No TTS provider configured' };
    },
    async getAudio(taskId) {
      if (!taskId) return { ready: false, reason: 'no taskId' };
      return { ready: false, reason: 'TTS disabled' };
    },
    isReady() { return false; }
  };
}

// ─── Provider: Mock (no API key needed) ──────────────────────────────────────

/**
 * Generate a tiny valid WAV file containing 0.5 seconds of silence.
 * This allows full end-to-end testing without any API key.
 */
function generateSilenceWav(durationMs = 500) {
  const sampleRate = 16000;
  const numSamples = Math.floor(sampleRate * durationMs / 1000);
  const bitsPerSample = 16;
  const numChannels = 1;
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const dataSize = numSamples * blockAlign;
  const headerSize = 44;
  const buf = Buffer.alloc(headerSize + dataSize);

  // RIFF header
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);

  // fmt sub-chunk
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);        // sub-chunk size
  buf.writeUInt16LE(1, 20);         // PCM format
  buf.writeUInt16LE(numChannels, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(byteRate, 28);
  buf.writeUInt16LE(blockAlign, 32);
  buf.writeUInt16LE(bitsPerSample, 34);

  // data sub-chunk (silence = all zeros, already allocated)
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  // samples 44..end are already 0x00 (silence)

  return buf;
}

function generateMock(text, voice, speed, options = {}) {
  console.log(`[TTS:mock] Generating mock audio for voice="${voice}" speed=${speed}: "${text.substring(0, 80)}${text.length > 80 ? '...' : ''}"`);

  // Estimate duration from text length (~150 words/min, ~5 chars/word)
  const plainText = text.replace(/<[^>]+>/g, ''); // strip SSML tags
  const charCount = plainText.length;
  const estimatedDurationMs = Math.max(500, Math.round((charCount / (5 * 150)) * 60 * 1000 / (speed || 1)));

  const wavBuffer = generateSilenceWav(estimatedDurationMs);
  const taskId = 'mock_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
  const base64 = wavBuffer.toString('base64');
  const entry = {
    audioBase64: base64,
    audioType: 'wav',
    expiresAt: Date.now() + CACHE_TTL_MS
  };
  audioCache.set(taskId, entry);

  return {
    taskId,
    status: 'complete',
    audioBase64: base64,
    audioType: 'wav',
    // Structured metadata for pipeline testing
    metadata: {
      provider: 'mock',
      voice,
      speed: speed || 1.0,
      characterName: options.characterName || null,
      adventureId: options.adventureId || null,
      pitch: options.pitch || null,
      rate: options.rate || null,
      volume: options.volume || null,
      characterCount: charCount,
      estimatedDurationMs,
      ssmlUsed: text.includes('<speak')
    }
  };
}

// ─── SSML Support ────────────────────────────────────────────────────────────

/**
 * Wrap plain text in SSML tags for prosody control.
 * Supported by: mock, openai providers.
 *
 * @param {string} text - Plain text to wrap
 * @param {Object} options - Prosody options
 * @param {string} [options.rate] - Speech rate: 'x-slow','slow','medium','fast','x-fast' or percentage like '90%'
 * @param {string} [options.pitch] - Pitch: 'x-low','low','medium','high','x-high' or relative like '+10%'
 * @param {string} [options.volume] - Volume: 'silent','x-soft','soft','medium','loud','x-loud' or dB like '+6dB'
 * @param {string} [options.emphasis] - Emphasis level: 'strong','moderate','reduced','none'
 * @param {string} provider - Current provider name
 * @returns {string} SSML-wrapped text, or plain text if provider doesn't support SSML
 */
function wrapSSML(text, options = {}, provider) {
  // Only wrap for providers that support SSML
  const ssmlProviders = ['mock', 'openai'];
  if (!ssmlProviders.includes(provider)) return text;

  const { rate, pitch, volume, emphasis } = options;

  // If no prosody options, still wrap in speak tags for consistency
  const prosodyAttrs = [];
  if (rate) prosodyAttrs.push(`rate="${rate}"`);
  if (pitch) prosodyAttrs.push(`pitch="${pitch}"`);
  if (volume) prosodyAttrs.push(`volume="${volume}"`);

  let inner = text;
  if (emphasis) {
    inner = `<emphasis level="${emphasis}">${text}</emphasis>`;
  }

  if (prosodyAttrs.length > 0) {
    inner = `<prosody ${prosodyAttrs.join(' ')}>${inner}</prosody>`;
  }

  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">${inner}</speak>`;
}

// ─── Provider: Novita AI (async) ────────────────────────────────────────────

// OpenAI voice names → Novita voice IDs
// Novita uses its own voice identifiers, not OpenAI names
const OPENAI_TO_NOVITA_VOICE_MAP = {
  'nova': 'Emily',
  'onyx': 'Adam',
  'echo': 'Antoni',
  'shimmer': 'Bella',
  'alloy': 'Elli',
  'fable': 'Josh',
};

async function generateNovita(text, voice, speed, language) {
  const apiKey = process.env.NOVITA_API_KEY;
  // Map OpenAI voice names to Novita voice IDs if needed
  const novitaVoice = OPENAI_TO_NOVITA_VOICE_MAP[voice] || voice || 'Emily';
  const body = JSON.stringify({
    request: {
      voice_id: novitaVoice,
      language: language,
      texts: [text],
      volume: 1.0,
      speed: speed
    },
    extra: {
      response_audio_type: 'mp3'
    }
  });

  const result = await httpPost('https://api.novita.ai/v3/async/txt2speech', body, {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  });

  const json = JSON.parse(result);
  if (json.task_id) {
    return { taskId: json.task_id, status: 'pending' };
  }
  throw new Error(`Novita TTS error: ${result}`);
}

async function pollNovitaTask(taskId, maxAttempts = 25, intervalMs = 2500) {
  const apiKey = process.env.NOVITA_API_KEY;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await httpGet(
      `https://api.novita.ai/v3/async/task-result?task_id=${encodeURIComponent(taskId)}`,
      { 'Authorization': `Bearer ${apiKey}` }
    );

    const json = JSON.parse(result);
    const status = json.task?.status;

    if (status === 'TASK_STATUS_SUCCEED') {
      const audio = json.audios?.[0];
      if (audio) {
        const entry = {
          audioUrl: audio.audio_url,
          audioType: audio.audio_type || 'wav',
          expiresAt: Date.now() + CACHE_TTL_MS
        };
        audioCache.set(taskId, entry);
        return { ...entry, ready: true };
      }
      return { ready: false, reason: 'No audio in response' };
    }

    if (status === 'TASK_STATUS_FAILED') {
      return { ready: false, reason: json.task?.reason || 'Task failed' };
    }

    // Still processing — wait and retry
    await sleep(intervalMs);
  }

  return { ready: false, reason: 'Polling timed out' };
}

// ─── Provider: OpenAI TTS (sync) ────────────────────────────────────────────

async function generateOpenAI(text, voice, speed) {
  const apiKey = process.env.OPENAI_API_KEY;
  const body = JSON.stringify({
    model: 'tts-1',
    input: text,
    voice: voice || 'nova',
    speed: speed || 1.0,
    response_format: 'mp3'
  });

  const audioBuffer = await httpPostBinary('https://api.openai.com/v1/audio/speech', body, {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  });

  const taskId = 'openai_' + Date.now().toString(36);
  const base64 = audioBuffer.toString('base64');
  const entry = {
    audioBase64: base64,
    audioType: 'mp3',
    expiresAt: Date.now() + CACHE_TTL_MS
  };
  audioCache.set(taskId, entry);

  return { taskId, status: 'complete', audioBase64: base64, audioType: 'mp3' };
}

// ─── Provider: ElevenLabs (sync) ────────────────────────────────────────────

async function generateElevenLabs(text, voice) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = voice || '21m00Tcm4TlvDq8ikWAM'; // Rachel (default)

  const audioBuffer = await httpPostBinary(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    JSON.stringify({
      text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 }
    }),
    {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg'
    }
  );

  const taskId = 'eleven_' + Date.now().toString(36);
  const base64 = audioBuffer.toString('base64');
  const entry = {
    audioBase64: base64,
    audioType: 'mp3',
    expiresAt: Date.now() + CACHE_TTL_MS
  };
  audioCache.set(taskId, entry);

  return { taskId, status: 'complete', audioBase64: base64, audioType: 'mp3' };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getDefaultVoice(provider) {
  switch (provider) {
    case 'mock': return 'mock-default';
    case 'novita': return 'Emily';
    case 'openai': return 'nova';
    case 'elevenlabs': return '21m00Tcm4TlvDq8ikWAM';
    default: return 'default';
  }
}

/**
 * Truncate text for TTS, trying to end at a sentence boundary.
 */
function truncateForTTS(text, maxChars) {
  if (text.length <= maxChars) return text;
  const truncated = text.substring(0, maxChars);
  // Try to end at a sentence
  const lastPeriod = truncated.lastIndexOf('. ');
  if (lastPeriod > maxChars * 0.5) {
    return truncated.substring(0, lastPeriod + 1);
  }
  return truncated + '...';
}

function httpPost(url, body, headers) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const mod = parsed.protocol === 'https:' ? https : http;
    const req = mod.request({
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: { ...headers, 'Content-Length': Buffer.byteLength(body) }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Request timed out')); });
    req.write(body);
    req.end();
  });
}

function httpPostBinary(url, body, headers) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const mod = parsed.protocol === 'https:' ? https : http;
    const req = mod.request({
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: { ...headers, 'Content-Length': Buffer.byteLength(body) }
    }, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(buf);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${buf.toString().substring(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error('Request timed out')); });
    req.write(body);
    req.end();
  });
}

function httpGet(url, headers) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const mod = parsed.protocol === 'https:' ? https : http;
    const req = mod.request({
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Request timed out')); });
    req.end();
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get a cached audio entry directly (for serving from the API).
 */
function getCachedAudio(taskId) {
  const entry = audioCache.get(taskId);
  if (entry && entry.expiresAt > Date.now()) return entry;
  audioCache.delete(taskId);
  return null;
}

/**
 * Clean up expired cache entries.
 */
function cleanupCache() {
  const now = Date.now();
  for (const [key, entry] of audioCache) {
    if (entry.expiresAt <= now) audioCache.delete(key);
  }
}

// Run cache cleanup every 5 minutes
setInterval(cleanupCache, 5 * 60 * 1000).unref();

/**
 * Build SSML from text and prosody parameters.
 * Standalone utility — does not depend on a TTS service instance.
 *
 * @param {string} text - Plain text to wrap
 * @param {Object} params - Prosody parameters
 * @param {string} [params.pitch] - Pitch: 'x-low','low','medium','high','x-high' or relative like '-10%'
 * @param {string} [params.rate] - Rate: 'x-slow','slow','medium','fast','x-fast' or percentage like '90%'
 * @param {string} [params.volume] - Volume: 'silent','x-soft','soft','medium','loud','x-loud' or dB like '+6dB'
 * @param {string} [params.emphasis] - Emphasis level: 'strong','moderate','reduced','none'
 * @param {string} [params.language] - Language code (default 'en-US')
 * @returns {string} SSML string
 */
function buildSSML(text, params = {}) {
  if (!text) return '';

  const { pitch, rate, volume, emphasis, language = 'en-US' } = params;

  const prosodyAttrs = [];
  if (pitch) prosodyAttrs.push(`pitch="${pitch}"`);
  if (rate) prosodyAttrs.push(`rate="${rate}"`);
  if (volume) prosodyAttrs.push(`volume="${volume}"`);

  let inner = text;
  if (emphasis) {
    inner = `<emphasis level="${emphasis}">${text}</emphasis>`;
  }
  if (prosodyAttrs.length > 0) {
    inner = `<prosody ${prosodyAttrs.join(' ')}>${inner}</prosody>`;
  }

  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${language}">${inner}</speak>`;
}

module.exports = {
  // Core
  createTTSService,
  getCachedAudio,
  cleanupCache,
  detectProvider,
  generateSilenceWav,
  wrapSSML,
  buildSSML,
  // Circuit Breaker
  CircuitBreaker,
  // Voice Profiles
  VOICE_PROFILES,
  getVoiceProfile,
  listVoiceProfiles,
  resolveVoiceSettings,
  // Character Voice Presets
  CHARACTER_VOICE_PRESETS,
  DEFAULT_VOICE_SETTINGS,
  getVoiceForCharacter,
  // SSML Dramatic Helpers
  ssml
};
