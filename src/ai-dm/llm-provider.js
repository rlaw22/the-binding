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
 * Create a scene-aware mock LLM provider for testing.
 * Returns contextually appropriate responses based on the current scene.
 */
function createMockProvider() {
  let callCount = 0;

  // Scene-specific response pools — the DM picks from the right pool based on context
  const innResponses = [
    `The innkeeper leans across the worn wooden bar, his face creased with worry. "Castle Dracula," he repeats, as if the words themselves taste bitter. "I have lived in Bistritz my whole life, and I tell you — no one returns from that place the same." He crosses himself quickly. "The Count has lived there for centuries, they say. Centuries." He pushes a small brass crucifix across the counter toward you. "Take this. You will need it more than I will."`,

    `In the corner of the inn, an old woman sits alone, nursing a cup of something dark. Her eyes catch yours — sharp, knowing, afraid. She whispers something you can't hear, then looks away quickly. The innkeeper notices you watching her. "Pay her no mind," he says, though his voice lacks conviction. "She lost her husband on the road to the Borgo Pass twenty years ago. Hasn't been right since." The woman's hands tremble around her cup.`,

    `You step through the back door into the stable yard. The air is cold and smells of hay and horse sweat. A single coach stands ready — its driver a silent figure wrapped in dark cloth, sitting perfectly still on the bench. The horses stamp and snort, their eyes rolling white in the lamplight. One of them rears suddenly, pulling against its harness. The driver doesn't flinch. Something about the way he sits — too still, too patient — makes your skin crawl.`,

    `On a bench near the fire, half-hidden beneath a folded shawl, you find a letter. The handwriting is hurried, desperate: "To whoever finds this — do NOT travel to the Borgo Pass after dark. The wolves are not natural. The coachman is not what he seems. God have mercy on Jonathan Harker's soul." The letter is dated three months ago. The ink is smeared, as if the writer's hands were shaking.`,

    `The innkeeper sets a bowl of thick stew before you, though you hadn't asked for it. "Eat," he says. "You will need your strength." He glances at the window, where the last light of day is fading behind the Carpathian peaks. "Your coach arrives at sundown. I have sent word to the driver — he knows the route to the castle." He pauses, then adds quietly: "If you insist on going... do not eat anything the Count offers you. And do not fall asleep before dawn."`,

    `The fire crackles and pops, casting long shadows across the inn's common room. A crucifix hangs above the mantelpiece — the only one you've seen that isn't facing the wall. The innkeeper catches you looking at it. "My grandmother's," he says. "She believed it kept the old evil at bay." He laughs, but it's hollow. "Perhaps it does. Perhaps that's why I'm still here." Outside, a wolf howls — closer than it should be.`
  ];

  const coachResponses = [
    `The coach rattles through the darkness, each bump in the road jarring your teeth. Through the narrow window, the Carpathian forest is a wall of black shapes — twisted trees, jagged rocks, and occasionally, the gleam of eyes reflecting the coach lantern. The other passengers — a priest and two women wrapped in shawls — press themselves against their seats, muttering prayers. One of the women reaches out and touches your arm. "Do not look outside after midnight," she whispers. "Whatever you see — do not acknowledge it."`,

    `The coachman urges the horses faster. The road narrows, climbing steeply into the mountains. Through the mist, you catch glimpses of something moving alongside the coach — low, fast, grey shapes weaving between the trees. Wolves. The priest sees them too and begins praying louder. One of the wolves runs parallel to the window for a moment, its yellow eyes fixed on yours. Then it veers away into the darkness, and you hear its howl echo across the valley.`,

    `Strange lights dance on the horses' harness — a pale blue-green glow that flickers and shifts. St. Elmo's fire, the old woman beside you mutters. "It means the dead are watching." The coach lurches around a bend, and suddenly the forest falls silent. No wolves, no wind, no insects. Just the creak of the coach and the steady hoofbeats. The silence is worse than the noise. Then, ahead — a faint light, and the shape of something vast and dark perched on a cliff above the road.`
  ];

  const castleResponses = [
    `The great hall of Castle Dracula is magnificent and terrible. Ancient tapestries line the walls — scenes of battle, of victory, of something darker. Candles burn in iron sconces, but they give off little heat. The air is cold, stone-cold, and smells of earth and age. At the far end of the hall, a fire burns in a massive hearth, but the flames cast strange shadows that seem to move with purpose. A chair sits before the fire — large, carved, draped in crimson velvet. It is empty. But you have the distinct impression someone was sitting in it moments ago.`,

    `The Count appears at the top of a grand staircase, descending with the grace of a predator. He is tall, pale, dressed in black from throat to ankle. His face is sharp — high cheekbones, a thin nose, a mouth that smiles too easily. His eyes are the strangest thing about him — dark, deep-set, burning with an intelligence that is almost inhuman. "Welcome to my home," he says, his English flawless, his accent faint but precise. "I trust your journey was not too unpleasant. The roads in my country can be... challenging." He extends a hand — his grip is cold as marble.`,

    `You notice the mirrors first. Or rather, the absence of them. In the great hall, the corridors, the chambers — not a single mirror. Where you'd expect glass, there is only stone or dark wood. The Count notices you looking. "I am an old man," he says with a thin smile, "and old men prefer not to be reminded of time's passage." His eyes glitter with something you can't quite read. "Besides — in a castle this old, mirrors have a way of showing things one would rather not see."`,
  ];

  const responsesByContext = {
    inn: innResponses,
    coach: coachResponses,
    castle: castleResponses
  };

  return async function mockLlmCall(messages) {
    // Detect context from the system prompt or recent messages
    let context = 'inn'; // default
    const fullText = messages.map(m => m.content || '').join(' ').toLowerCase();

    if (fullText.includes('coach ride') || fullText.includes('carpathian') || fullText.includes('the road') || fullText.includes('bumpy')) {
      context = 'coach';
    } else if ((fullText.includes('great hall') || fullText.includes('dining hall') || fullText.includes('the count appears') || fullText.includes('the count extends')) && !fullText.includes('inn') && !fullText.includes('bistritz')) {
      context = 'castle';
    }

    const pool = responsesByContext[context] || innResponses;
    const response = pool[callCount % pool.length];
    callCount++;

    return response;
  };
}

/**
 * Create a provider based on config.
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
