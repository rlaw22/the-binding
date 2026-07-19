/**
 * STT Service — Provider-agnostic speech-to-text for The Binding.
 *
 * Supports: OpenAI Whisper API (sync), with graceful fallback.
 * Used for voice input: player speaks → text → sent as action to DM.
 *
 * Phase 1: Single audio file transcription, no streaming.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

/**
 * Detect which STT provider is available based on env vars.
 * Priority: OpenAI (Whisper) > null
 */
function detectProvider() {
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.LLM_API_KEY && process.env.LLM_BASE_URL && process.env.LLM_BASE_URL.includes('openai')) return 'openai';
  return null;
}

/**
 * Create an STT service instance.
 *
 * @param {Object} config
 * @param {string} [config.provider] - 'openai' (auto-detected if omitted)
 * @param {string} [config.model] - Model name (default: 'whisper-1')
 * @param {string} [config.language] - Language code (default: 'en')
 * @param {string} [config.responseFormat] - Response format: 'json' | 'text' | 'srt' | 'verbose_json' (default: 'json')
 * @returns {Object} STT service with transcribe() method
 */
function createSTTService(config = {}) {
  const provider = config.provider || detectProvider();
  const model = config.model || 'whisper-1';
  const language = config.language || 'en';
  const responseFormat = config.responseFormat || 'json';

  if (!provider) {
    console.warn('[STT] No STT provider configured. Set OPENAI_API_KEY. Voice input disabled.');
    return createNullSTTService();
  }

  console.log(`[STT] Provider: ${provider}, Model: ${model}, Language: ${language}`);

  return {
    provider,
    model,
    language,
    responseFormat,

    /**
     * Transcribe audio file to text.
     *
     * @param {string|Buffer} audio - File path or Buffer containing audio data
     * @param {Object} [options] - Override options
     * @param {string} [options.language] - Override language
     * @param {string} [options.responseFormat] - Override response format
     * @param {string} [options.filename] - Original filename (for buffer input)
     * @returns {Promise<Object>} { text, language?, duration?, segments?, words? }
     */
    async transcribe(audio, options = {}) {
      if (!audio) {
        return { text: '', status: 'skipped', reason: 'no audio provided' };
      }

      const lang = options.language || language;
      const format = options.responseFormat || responseFormat;

      try {
        switch (provider) {
          case 'openai':
            return await transcribeOpenAI(audio, model, lang, format, options.filename);
          default:
            return { text: '', status: 'error', reason: `Unknown provider: ${provider}` };
        }
      } catch (err) {
        console.error(`[STT] Transcription failed (${provider}):`, err.message);
        return { text: '', status: 'error', reason: err.message };
      }
    },

    /**
     * Check if the service is configured and ready.
     */
    isReady() {
      return !!provider;
    }
  };
}

/**
 * Null STT service — used when no provider is configured.
 */
function createNullSTTService() {
  return {
    provider: null,
    model: null,
    language: 'en',
    responseFormat: 'json',
    async transcribe() {
      return { text: '', status: 'disabled', reason: 'No STT provider configured' };
    },
    isReady() {
      return false;
    }
  };
}

// ─── Provider: OpenAI Whisper ────────────────────────────────────────────────

async function transcribeOpenAI(audio, model, language, responseFormat, filename) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY;

  // Derive base URL: use OPENAI_API_URL, or build from LLM_BASE_URL (strip /chat/completions suffix)
  let baseUrl = 'https://api.openai.com';
  if (!process.env.OPENAI_API_KEY && process.env.LLM_BASE_URL) {
    baseUrl = process.env.LLM_BASE_URL.replace(/\/v1\/chat\/completions$/, '');
  } else if (process.env.OPENAI_API_URL) {
    baseUrl = process.env.OPENAI_API_URL;
  }
  const sttUrl = baseUrl + '/v1/audio/transcriptions';

  // Build multipart form data
  const boundary = '----FormBoundary' + Date.now().toString(36);
  const parts = [];

  // Model field
  parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\n${model}\r\n`);

  // Language field
  if (language) {
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\n${language}\r\n`);
  }

  // Response format field
  if (responseFormat) {
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="response_format"\r\n\r\n${responseFormat}\r\n`);
  }

  // File field
  let audioBuffer;
  let audioFilename;

  if (Buffer.isBuffer(audio)) {
    audioBuffer = audio;
    audioFilename = filename || 'audio.wav';
  } else if (typeof audio === 'string') {
    // File path
    audioBuffer = fs.readFileSync(audio);
    audioFilename = path.basename(audio);
  } else {
    throw new Error('Audio must be a file path string or Buffer');
  }

  const fileHeader = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${audioFilename}"\r\nContent-Type: audio/wav\r\n\r\n`;
  const fileFooter = `\r\n--${boundary}--\r\n`;

  // Combine all parts
  const headerBuffer = Buffer.from(parts.join('') + fileHeader, 'utf8');
  const footerBuffer = Buffer.from(fileFooter, 'utf8');
  const body = Buffer.concat([headerBuffer, audioBuffer, footerBuffer]);

  const result = await httpPostMultipart(
    sttUrl,
    body,
    boundary,
    { 'Authorization': `Bearer ${apiKey}` }
  );

  // Parse response based on format
  if (responseFormat === 'json' || responseFormat === 'verbose_json') {
    const json = JSON.parse(result);
    return {
      text: json.text || '',
      language: json.language || language,
      duration: json.duration || null,
      segments: json.segments || null,
      words: json.words || null,
      status: 'complete'
    };
  }

  // text, srt, vtt — return raw text
  return { text: result.trim(), status: 'complete' };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function httpPostMultipart(url, body, boundary, headers) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const mod = parsed.protocol === 'https:' ? https : http;
    const req = mod.request({
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`STT API error ${res.statusCode}: ${data.substring(0, 500)}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

module.exports = {
  detectProvider,
  createSTTService,
  createNullSTTService
};
