/**
 * Browser TTS — Web Speech API fallback for The Binding
 * Provides keyless voice narration using the browser's built-in speech synthesis.
 * Self-contained, no npm dependencies, vanilla JS.
 */
(function () {
  'use strict';

  /* ── Character voice profiles ── */
  var VOICE_PROFILES = {
    narrator:  { rate: 0.92, pitch: 0.85, volume: 0.9, keywords: ['daniel', 'google uk english male', 'microsoft david', 'male'] },
    villain:   { rate: 0.85, pitch: 0.65, volume: 0.7, keywords: ['daniel', 'google uk english male', 'microsoft mark', 'male'] },
    merchant:  { rate: 1.15, pitch: 1.10, volume: 1.0, keywords: ['google uk english female', 'samantha', 'microsoft zira', 'female'] },
    guard:     { rate: 1.00, pitch: 0.75, volume: 1.0, keywords: ['daniel', 'microsoft david', 'male'] },
    companion: { rate: 1.05, pitch: 1.05, volume: 0.95, keywords: ['samantha', 'google uk english female', 'female'] },
    elder:     { rate: 0.80, pitch: 0.90, volume: 0.8, keywords: ['daniel', 'microsoft david', 'male'] },
    child:     { rate: 1.20, pitch: 1.40, volume: 1.0, keywords: ['samantha', 'female'] },
    default:   { rate: 1.00, pitch: 1.00, volume: 1.0, keywords: [] }
  };

  /* ── Text chunking ── */
  var MAX_CHUNK = 200;

  function chunkText(text, maxLen) {
    maxLen = maxLen || MAX_CHUNK;
    if (text == null || text === '') return [];
    if (text.length <= maxLen) return [text];

    var chunks = [];
    var remaining = text;

    while (remaining.length > 0) {
      if (remaining.length <= maxLen) {
        chunks.push(remaining);
        break;
      }

      // Try to break at a sentence boundary
      var breakIdx = -1;
      var searchWindow = remaining.substring(0, maxLen);
      var sentenceEnders = ['. ', '! ', '? ', '.\n', '!\n', '?\n'];
      for (var e = 0; e < sentenceEnders.length; e++) {
        var idx = searchWindow.lastIndexOf(sentenceEnders[e]);
        if (idx > breakIdx && idx > maxLen * 0.3) {
          breakIdx = idx + sentenceEnders[e].length;
        }
      }

      // Fall back to comma or space
      if (breakIdx <= 0) {
        breakIdx = searchWindow.lastIndexOf(', ');
        if (breakIdx > 0) breakIdx += 2;
      }
      if (breakIdx <= 0) {
        breakIdx = searchWindow.lastIndexOf(' ');
        if (breakIdx > 0) breakIdx += 1;
      }
      if (breakIdx <= 0) breakIdx = maxLen;

      chunks.push(remaining.substring(0, breakIdx).trim());
      remaining = remaining.substring(breakIdx).trim();
    }

    return chunks.filter(Boolean);
  }

  /* ── Voice selection helpers ── */
  function pickVoice(synth, keywords) {
    if (!synth) return null;
    var voices = synth.getVoices();
    if (!voices.length) return null;

    var lower = keywords.map(function (k) { return k.toLowerCase(); });

    // Score each voice
    var best = null;
    var bestScore = -1;
    for (var i = 0; i < voices.length; i++) {
      var v = voices[i];
      var name = v.name.toLowerCase();
      var score = 0;
      for (var j = 0; j < lower.length; j++) {
        if (name.indexOf(lower[j]) !== -1) score += (lower.length - j) * 2;
      }
      if (v.lang && v.lang.indexOf('en') === 0) score += 1;
      if (score > bestScore) { bestScore = score; best = v; }
    }

    return best; // may be null — caller handles
  }

  function getProfile(characterType) {
    return VOICE_PROFILES[characterType] || VOICE_PROFILES['default'];
  }

  /* ── Public API ── */
  var BrowserTTS = {
    _enabled: false,
    _synth: null,
    _currentUtterance: null,
    _queue: [],
    _speaking: false,
    _voicesLoaded: false,
    _onVisual: null,   // optional callback(text) for visual-only fallback

    /** Initialise — call once on page load. */
    init: function (opts) {
      opts = opts || {};
      if (opts.onVisual) this._onVisual = opts.onVisual;

      if (typeof window === 'undefined' || !window.speechSynthesis) {
        this._enabled = false;
        return;
      }

      this._synth = window.speechSynthesis;
      this._enabled = true;

      // Some browsers load voices asynchronously
      var self = this;
      var loadVoices = function () {
        var v = self._synth.getVoices();
        if (v.length) self._voicesLoaded = true;
      };
      loadVoices();
      if (this._synth.addEventListener) {
        this._synth.addEventListener('voiceschanged', loadVoices);
      }
    },

    /** Whether the Web Speech API is available. */
    isAvailable: function () {
      return this._enabled === true;
    },

    /**
     * Speak text aloud.
     * @param {string} text
     * @param {object} [options]
     * @param {string} [options.character]  — character type key (narrator, villain, …)
     * @param {number} [options.rate]       — override rate (0.1–10)
     * @param {number} [options.pitch]      — override pitch (0–2)
     * @param {function} [options.onEnd]    — called when speech finishes
     * @param {function} [options.onError]  — called on speech error
     */
    speak: function (text, options) {
      options = options || {};
      if (!text) return;

      if (!this._enabled) {
        this._visualFallback(text, options);
        return;
      }

      var profile = getProfile(options.character);
      var rate  = options.rate  !== undefined ? options.rate  : profile.rate;
      var pitch = options.pitch !== undefined ? options.pitch : profile.pitch;
      var voice = pickVoice(this._synth, profile.keywords);

      var chunks = chunkText(text);
      this._enqueue(chunks, voice, rate, pitch, options);
    },

    /** Stop all current and queued speech. */
    stop: function () {
      if (this._synth) {
        this._synth.cancel();
      }
      this._queue = [];
      this._speaking = false;
      this._currentUtterance = null;
    },

    /* ── Internal ── */

    _enqueue: function (chunks, voice, rate, pitch, options) {
      for (var i = 0; i < chunks.length; i++) {
        this._queue.push({
          text: chunks[i],
          voice: voice,
          rate: rate,
          pitch: pitch,
          isLast: i === chunks.length - 1,
          onEnd: options.onEnd,
          onError: options.onError
        });
      }
      if (!this._speaking) this._processQueue();
    },

    _processQueue: function () {
      if (!this._queue.length) {
        this._speaking = false;
        return;
      }

      this._speaking = true;
      var item = this._queue.shift();
      var self = this;

      var utter = new SpeechSynthesisUtterance(item.text);
      if (item.voice) utter.voice = item.voice;
      utter.rate  = item.rate;
      utter.pitch = item.pitch;
      utter.volume = item.volume !== undefined ? item.volume : 1.0;

      utter.onend = function () {
        self._currentUtterance = null;
        if (item.isLast && item.onEnd) item.onEnd();
        self._processQueue();
      };

      utter.onerror = function (e) {
        self._currentUtterance = null;
        if (item.isLast && item.onError) item.onError(e);
        self._processQueue();
      };

      this._currentUtterance = utter;
      this._synth.speak(utter);
    },

    _visualFallback: function (text, options) {
      if (this._onVisual) this._onVisual(text);
      if (options && options.onEnd) options.onEnd();
    }
  };

  /* ── Export ── */
  if (typeof module !== 'undefined' && module.exports) {
    // Node / test environment — export internals too for unit testing
    module.exports = {
      BrowserTTS: BrowserTTS,
      _chunkText: chunkText,
      _pickVoice: pickVoice,
      _getProfile: getProfile,
      _VOICE_PROFILES: VOICE_PROFILES,
      _MAX_CHUNK: MAX_CHUNK
    
    /** Pause current speech. */
    pause: function () {
      if (this._synth && this._speaking) {
        this._synth.pause();
      }
    },

    /** Resume paused speech. */
    resume: function () {
      if (this._synth) {
        this._synth.resume();
      }
    },

    /** Whether speech is currently paused. */
    isPaused: function () {
      return this._synth ? this._synth.paused : false;
    },

    /** Whether speech is currently in progress. */
    isSpeaking: function () {
      return this._speaking;
    },

    /** List available browser voices. */
    getVoices: function () {
      if (!this._synth) return [];
      return this._synth.getVoices().map(function (v) {
        return { name: v.name, lang: v.lang, default: v.default };
      });
    },

    /** Returns a promise that resolves when voices are loaded. */
    ready: function () {
      if (!this._enabled) return Promise.resolve(false);
      if (this._voicesLoaded) return Promise.resolve(true);
      var self = this;
      return new Promise(function (resolve) {
        var check = function () {
          if (self._synth.getVoices().length) {
            self._voicesLoaded = true;
            resolve(true);
          }
        };
        self._synth.addEventListener('voiceschanged', function () {
          self._voicesLoaded = true;
          resolve(true);
        });
        check();
      });
    },
};
  } else {
    // Browser global
    window.BrowserTTS = BrowserTTS;
  }
})();
