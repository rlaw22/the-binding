/**
 * LLM Provider — Abstraction over LLM APIs.
 * 
 * Phase 1: Uses OpenAI-compatible API (works with OpenAI, Anthropic via proxy, local models)
 * Phase 2: Can swap to direct Anthropic, local models, or any provider
 * 
 * The provider is injected into the DM service — the service doesn't care which LLM it uses.
 */

const https = require('https');
const http = require('http');

/**
 * Create an OpenAI-compatible LLM provider.
 * @param {object} config
 * @param {string} config.apiKey — API key
 * @param {string} config.baseUrl — API base URL (default: https://api.openai.com/v1)
 * @param {string} config.model — Model name (default: gpt-4o)
 * @param {number} config.maxTokens — Max response tokens (default: 2000)
 * @param {number} config.temperature — Creativity (default: 0.8)
 */
function createOpenAIProvider(config = {}) {
  const apiKey = config.apiKey || process.env.LLM_API_KEY || '';
  const baseUrl = config.baseUrl || process.env.LLM_BASE_URL || 'https://api.openai.com/v1';
  const model = config.model || process.env.LLM_MODEL || 'gpt-4o';
  const maxTokens = config.maxTokens || 2000;
  const temperature = config.temperature || 0.8;

  return async function llmCall(messages) {
    const url = new URL(`${baseUrl}/chat/completions`);
    const isHttps = url.protocol === 'https:';
    const httpModule = isHttps ? https : http;

    const body = JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
      top_p: 0.95
    });

    return new Promise((resolve, reject) => {
      const req = httpModule.request({
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Content-Length': Buffer.byteLength(body)
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.error) {
              reject(new Error(`LLM API error: ${json.error.message || JSON.stringify(json.error)}`));
              return;
            }
            const content = json.choices?.[0]?.message?.content || '';
            resolve(content);
          } catch (e) {
            reject(new Error(`Failed to parse LLM response: ${e.message}`));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(60000, () => {
        req.destroy();
        reject(new Error('LLM request timed out (60s)'));
      });
      req.write(body);
      req.end();
    });
  };
}

/**
 * Create a mock LLM provider for testing.
 * Returns canned responses so the game loop can be tested without API calls.
 */
function createMockProvider() {
  let callCount = 0;

  const responses = [
    `The wind howls through the mountain pass as your coach rattles along the ancient road. The driver, a silent figure wrapped in dark cloth, urges the horses forward with practiced ease. Ahead, through the swirling mist, you catch your first glimpse of Castle Dracula — a jagged silhouette against the lightning-split sky.

The other passengers clutch their crucifixes and mutter prayers. One old woman reaches out and presses something into your hand — a small rosary. "For protection," she whispers, her eyes wide with fear.

---

SUGGESTED ACTIONS:
1. Accept the rosary graciously and ask the old woman about the castle
2. Stand up in the coach to get a better view of the approaching fortress
3. Try to engage the silent driver in conversation about their master
4. Check your luggage to make sure Jonathan's journal is still secure`,

    `The Count stands at the head of a long dining table, his pale fingers steepled before him. The candlelight catches his sharp features — high cheekbones, a cruel mouth that smiles too wide, and eyes that burn with an intelligence that is almost predatory.

"I trust you found your room adequate?" His English is flawless, accented but precise. "I do apologize for the... rustic accommodations. We Transylvanians are a simple people."

He gestures to the empty chair across from him. No food is set before you — only a goblet of deep red wine. You notice there are no mirrors in the dining hall.

---

SUGGESTED ACTIONS:
1. Sit down and ask the Count about the history of his castle
2. Casually mention that you noticed there are no mirrors and watch his reaction
3. Take a sip of the wine and compliment it, steering the conversation toward England
4. Excuse yourself to "freshen up" and use the opportunity to explore the castle`,

    `You press your ear to the heavy oak door of the forbidden wing. Silence. Then — a sound that makes your blood run cold. A low, rhythmic breathing, like someone sleeping. But it's coming from below the floor.

The lock is old but sturdy. You examine it closely — a iron mechanism, corroded with age but still functional. A keyhole large enough to peer through. When you kneel and press your eye to it, you see rows of wooden boxes. Coffins. Filled with dark earth.

One of them is open. Empty.

---

SUGGESTED ACTIONS:
1. Try to pick the lock using a hairpin or small tool
2. Search the nearby rooms for a key that might fit
3. Mark the door and leave — you've seen enough to know something is very wrong
4. Listen more carefully to determine if the breathing is coming from inside the coffins`
  ];

  return async function mockLlmCall(messages) {
    const response = responses[callCount % responses.length];
    callCount++;
    return response;
  };
}

/**
 * Create a simple HTTP provider that works with any OpenAI-compatible endpoint.
 */
function createProvider(config) {
  if (config.mock || process.env.LLM_MOCK === 'true') {
    return createMockProvider();
  }
  return createOpenAIProvider(config);
}

module.exports = {
  createOpenAIProvider,
  createMockProvider,
  createProvider
};
