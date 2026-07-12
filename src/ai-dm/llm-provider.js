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
 * 
 * KEY DESIGN: Picks responses based on what the player ACTUALLY DID,
 * not a blind cycling counter. Each session gets its own instance.
 */
function createMockProvider() {
  const usedResponses = { inn: new Set(), coach: new Set(), castle: new Set() };

  // === INN RESPONSES ===
  // Each mapped to a keyword pattern. Removed duplicate crucifix from #0
  // since the opening narration already gives one.
  const innResponses = {
    innkeeper: `The innkeeper leans across the worn wooden bar, his face creased with worry. "Castle Dracula," he repeats, as if the words themselves taste bitter. "I have lived in Bistritz my whole life, and I tell you — no one returns from that place the same." He crosses himself quickly. "The Count has lived there for centuries, they say. Centuries." He lowers his voice. "Do not speak his name after dark. It draws his attention."`,

    crucifix: `You turn the small crucifix over in your hands. It's old — the brass is worn smooth from years of fingers rubbing it for comfort. The figure of Christ is barely visible now, worn down to a faint outline. Despite its age, there's a warmth to it when you hold it close, as if someone's faith still lingers in the metal. The innkeeper watches you examine it. "My wife made me carry that for thirty years," he says quietly. "She passed last winter. I have no more need of it — but you do."`,

    woman: `You approach the old woman slowly. Her eyes snap up — sharp, knowing, afraid. She whispers something you can't hear, then looks away quickly. Her hands tremble around her cup.`,
    stable: `You peer through the back window into the stable yard. The air is cold and smells of hay and horse sweat. A single coach stands ready — its driver a silent figure wrapped in dark cloth, sitting perfectly still on the bench. The horses stamp and snort, their eyes rolling white in the lamplight. One of them rears suddenly, pulling against its harness. The driver doesn't flinch. Something about the way he sits — too still, too patient — makes your skin crawl. The innkeeper sees you looking. "Your coach," he says quietly. "Best not to keep him waiting."`,
    letter: `On a bench near the fire, half-hidden beneath a folded shawl, you find a letter. The handwriting is hurried, desperate: "To whoever finds this — do NOT travel to the Borgo Pass after dark. The wolves are not natural. The coachman is not what he seems. God have mercy on Jonathan Harker's soul." The letter is dated three months ago. The ink is smeared, as if the writer's hands were shaking.`,

    food: `The innkeeper sets a bowl of thick stew before you, though you hadn't asked for it. "Eat," he says. "You will need your strength." He glances at the window, where the last light of day is fading behind the Carpathian peaks. "Your coach arrives at sundown. I have sent word to the driver — he knows the route to the castle." He pauses, then adds quietly: "If you insist on going... do not eat anything the Count offers you. And do not fall asleep before dawn."`,

    fire: `The fire crackles and pops, casting long shadows across the inn's common room. A crucifix hangs above the mantelpiece — the only one you've seen that isn't facing the wall. The innkeeper catches you looking at it. "My grandmother's," he says. "She believed it kept the old evil at bay." He laughs, but it's hollow. "Perhaps it does. Perhaps that's why I'm still here." Outside, a wolf howls — closer than it should be.`
  };

  // === COACH RESPONSES ===
  const coachResponses = {
    passenger: `The coach rattles through the darkness, each bump in the road jarring your teeth. Through the narrow window, the Carpathian forest is a wall of black shapes — twisted trees, jagged rocks, and occasionally, the gleam of eyes reflecting the coach lantern. The other passengers — a priest and two women wrapped in shawls — press themselves against their seats, muttering prayers. One of the women reaches out and touches your arm. "Do not look outside after midnight," she whispers. "Whatever you see — do not acknowledge it."`,

    wolves: `The coachman urges the horses faster. The road narrows, climbing steeply into the mountains. Through the mist, you catch glimpses of something moving alongside the coach — low, fast, grey shapes weaving between the trees. Wolves. The priest sees them too and begins praying louder. One of the wolves runs parallel to the window for a moment, its yellow eyes fixed on yours. Then it veers away into the darkness, and you hear its howl echo across the valley.`,

    lights: `Strange lights dance on the horses' harness — a pale blue-green glow that flickers and shifts. St. Elmo's fire, the old woman beside you mutters. "It means the dead are watching." The coach lurches around a bend, and suddenly the forest falls silent. No wolves, no wind, no insects. Just the creak of the coach and the steady hoofbeats. The silence is worse than the noise. Then, ahead — a faint light, and the shape of something vast and dark perched on a cliff above the road.`
  };

  // === CASTLE RESPONSES ===
  const castleResponses = {
    hall: `The great hall of Castle Dracula is magnificent and terrible. Ancient tapestries line the walls — scenes of battle, of victory, of something darker. Candles burn in iron sconces, but they give off little heat. The air is cold, stone-cold, and smells of earth and age. At the far end of the hall, a fire burns in a massive hearth, but the flames cast strange shadows that seem to move with purpose. A chair sits before the fire — large, carved, draped in crimson velvet. It is empty. But you have the distinct impression someone was sitting in it moments ago.`,

    count: `The Count appears at the top of a grand staircase, descending with the grace of a predator. He is tall, pale, dressed in black from throat to ankle. His face is sharp — high cheekbones, a thin nose, a mouth that smiles too easily. His eyes are the strangest thing about him — dark, deep-set, burning with an intelligence that is almost inhuman. "Welcome to my home," he says, his English flawless, his accent faint but precise. "I trust your journey was not too unpleasant. The roads in my country can be... challenging." He extends a hand — his grip is cold as marble.`,

    mirrors: `You notice the mirrors first. Or rather, the absence of them. In the great hall, the corridors, the chambers — not a single mirror. Where you'd expect glass, there is only stone or dark wood. The Count notices you looking. "I am an old man," he says with a thin smile, "and old men prefer not to be reminded of time's passage." His eyes glitter with something you can't quite read. "Besides — in a castle this old, mirrors have a way of showing things one would rather not see."`
  };

  const allPools = { inn: innResponses, coach: coachResponses, castle: castleResponses };

  /**
   * Pick the best response based on what the player actually said.
   * Matches keywords in the player's action to response keys.
   */
  function pickResponse(pool, playerAction, context) {
    const action = (playerAction || '').toLowerCase();
    const used = usedResponses[context];
    const keys = Object.keys(pool);

    // Keyword mapping: check the player's action against response keys
    const keywordMap = {
      // Inn keywords
      innkeeper: ['innkeeper', 'ask', 'tell', 'dracula', 'castle', 'count', 'speak', 'talk', 'question', 'warn', 'warning'],
      crucifix: ['crucifix', 'cross', 'examine', 'inspect', 'look at', 'hold', 'brass', 'protection'],
      woman: ['woman', 'old', 'corner', 'whisper', 'her', 'she', 'stranger'],
      stable: ['stable', 'coach', 'outside', 'driver', 'horse', 'yard', 'back door', 'look around'],
      letter: ['letter', 'bench', 'note', 'read', 'paper', 'find', 'search', 'hidden'],
      food: ['eat', 'food', 'stew', 'drink', 'meal', 'hungry', 'wine'],
      fire: ['fire', 'room', 'look around', 'atmosphere', 'common room', 'mantel', 'mantle', 'warm'],
      // Coach keywords
      passenger: ['passenger', 'talk', 'speak', 'priest', 'woman', 'pray', 'who'],
      wolves: ['wolf', 'wolves', 'outside', 'look', 'window', 'animal', 'howl'],
      lights: ['light', 'glow', 'fire', 'strange', 'weird', 'eerie', 'st. elmo', 'watch'],
      // Castle keywords
      hall: ['hall', 'great', 'room', 'look', 'tapestry', 'explore', 'enter', 'around'],
      count: ['count', 'dracula', 'greet', 'meet', 'man', 'staircase', 'approach', 'who'],
      mirrors: ['mirror', 'glass', 'reflection', 'look', 'notice', 'absent', 'missing', 'search']
    };

    // Find the best keyword match
    let bestKey = null;
    let bestScore = 0;

    for (const key of keys) {
      if (used.has(key)) continue; // skip already-used responses
      const keywords = keywordMap[key] || [key];
      let score = 0;
      for (const kw of keywords) {
        if (action.includes(kw)) score++;
      }
      if (score > bestScore) {
        bestScore = score;
        bestKey = key;
      }
    }

    // If no keyword match, pick the first unused response
    if (!bestKey) {
      for (const key of keys) {
        if (!used.has(key)) {
          bestKey = key;
          break;
        }
      }
    }

    // If all responses used, reset and pick the first one
    if (!bestKey) {
      used.clear();
      bestKey = keys[0];
    }

    used.add(bestKey);
    return pool[bestKey];
  }

  return async function mockLlmCall(messages) {
    // Get the last user message (the player's action)
    const userMessages = messages.filter(m => m.role === 'user');
    const lastAction = userMessages.length > 0 ? userMessages[userMessages.length - 1].content : '';

    // Check the system prompt for discovery text (works for ANY adventure)
    // The scene engine passes discovery text via buildSceneContext()
    const systemMessages = messages.filter(m => m.role === 'system');
    let discoveryText = null;
    for (const msg of systemMessages) {
      if (!msg.content) continue;
      // Parse: When player "<action>": <discovery text>
      // Discovery text can span multiple lines — capture until next "When player" or end of section
      const lines = msg.content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const lineMatch = lines[i].match(/^\s*-\s*When player "([^"]+)":\s*(.*)/);
        if (lineMatch) {
          const discoveryAction = lineMatch[1].toLowerCase();
          let discovery = lineMatch[2].trim();
          // Capture continuation lines (lines that don't start with a new bullet or section header)
          for (let j = i + 1; j < lines.length; j++) {
            if (lines[j].match(/^\s*-\s*When player/) || lines[j].match(/^[A-Z][A-Z ]+:/) || lines[j].match(/^\s*[A-Z][a-zA-Z]+:/)) break;
            if (lines[j].trim()) discovery += ' ' + lines[j].trim();
          }
          // Check if the player's action matches this discovery action
          const actionLower = lastAction.toLowerCase();
          const actionWords = discoveryAction.split(/\s+/).filter(w => w.length > 3);
          const matched = actionWords.filter(w => actionLower.includes(w)).length;
          if (matched >= Math.min(2, actionWords.length) && discovery.length > 10) {
            discoveryText = discovery;
            break;
          }
        }
      }
      if (discoveryText) break;
    }

    // If we found a matching discovery, use it as the response
    if (discoveryText) {
      return discoveryText;
    }

    // Fall back to response pool based on scene context
    // Check two sources: warm context ("Current Scene:") and scene engine ("SCENE STATE" / "Scene:")
    const allSystem = messages.filter(m => m.role === 'system' && m.content);
    let context = 'inn';
    for (const msg of allSystem) {
      const text = msg.content.toLowerCase();
      if (text.includes('scene: ') || text.includes('current scene:')) {
        if (text.includes('inn') || text.includes('bistritz') || text.includes('golden krone')) { context = 'inn'; break; }
        if (text.includes('coach ride') || text.includes('borgo pass') || text.includes('crossroads')) { context = 'coach'; break; }
        if (text.includes('castle') || text.includes('dinner') || text.includes('forbidden wing') || text.includes('dining hall')) { context = 'castle'; break; }
      }
    }

    const pool = allPools[context] || allPools.inn;
    return pickResponse(pool, lastAction, context);
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
