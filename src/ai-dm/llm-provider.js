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
 * Classified LLM error with user-facing message and retry metadata.
 */
class LLMError extends Error {
  constructor(message, { code, userMessage, retryable = false, retryAfterMs = 0 }) {
    super(message);
    this.name = 'LLMError';
    this.code = code;           // 'rate_limit' | 'timeout' | 'auth' | 'context_overflow' | 'server_error' | 'network' | 'unknown'
    this.userMessage = userMessage; // safe to show players
    this.retryable = retryable;
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * Classify a raw LLM API error into an LLMError with a player-facing message.
 * Handles HTTP status codes, OpenAI-style error objects, and network errors.
 */
function classifyLLMError(err, statusCode, responseBody) {
  const msg = (err?.message || '').toLowerCase();
  const body = (responseBody || '').toLowerCase();

  // Rate limit — retryable with backoff
  if (statusCode === 429 || msg.includes('rate') || msg.includes('too many') || body.includes('rate_limit')) {
    const retryAfter = err?.retryAfterMs || 5000;
    return new LLMError(err?.message || 'Rate limited', {
      code: 'rate_limit',
      userMessage: 'The storyteller is thinking hard — too many requests right now. Retrying...',
      retryable: true,
      retryAfterMs: retryAfter
    });
  }

  // Timeout — retryable
  if (statusCode === 408 || msg.includes('timeout') || msg.includes('timed out') || msg.includes('etimedout') || msg.includes('socket hang up')) {
    return new LLMError(err?.message || 'Request timed out', {
      code: 'timeout',
      userMessage: 'The storyteller took too long to respond. Retrying...',
      retryable: true,
      retryAfterMs: 2000
    });
  }

  // Auth failure — not retryable
  if (statusCode === 401 || statusCode === 403 || msg.includes('unauthorized') || msg.includes('invalid') && msg.includes('key') || body.includes('invalid_api_key')) {
    return new LLMError(err?.message || 'Authentication failed', {
      code: 'auth',
      userMessage: 'The storyteller could not be reached — a configuration issue is blocking responses. Please try again later.',
      retryable: false
    });
  }

  // Context length overflow — not retryable (same request would fail again)
  if (statusCode === 400 && (body.includes('context_length') || body.includes('maximum context') || body.includes('token') && body.includes('limit'))) {
    return new LLMError(err?.message || 'Context length exceeded', {
      code: 'context_overflow',
      userMessage: 'The story has grown too long for the storyteller to hold in memory. This session may need to be shortened.',
      retryable: false
    });
  }

  // Server error (5xx) from the LLM provider — retryable
  if (statusCode >= 500) {
    return new LLMError(err?.message || `LLM server error (${statusCode})`, {
      code: 'server_error',
      userMessage: 'The storyteller had an internal hiccup. Retrying...',
      retryable: true,
      retryAfterMs: 3000
    });
  }

  // Network error (ECONNREFUSED, ENOTFOUND, etc.) — retryable
  if (msg.includes('econnrefused') || msg.includes('enotfound') || msg.includes('econnreset') || msg.includes('enetunreach')) {
    return new LLMError(err?.message || 'Network error reaching LLM', {
      code: 'network',
      userMessage: 'Could not reach the storyteller — network issue. Retrying...',
      retryable: true,
      retryAfterMs: 3000
    });
  }

  // Fallback — unknown error
  return new LLMError(err?.message || 'Unknown LLM error', {
    code: 'unknown',
    userMessage: 'The storyteller encountered an unexpected issue. Please try again.',
    retryable: false
  });
}

const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000;

/**
 * Create an OpenAI-compatible LLM provider with retry logic.
 */
function createOpenAIProvider(config = {}) {
  const apiKey = config.apiKey || process.env.LLM_API_KEY || '';
  const baseUrl = config.baseUrl || process.env.LLM_BASE_URL || 'https://api.openai.com/v1';
  const model = config.model || process.env.LLM_MODEL || 'gpt-4o';
  const maxTokens = config.maxTokens || 2000;
  const temperature = config.temperature || 0.8;

  /**
   * Single attempt — makes one HTTP request to the LLM API.
   * On failure, throws an LLMError with classification.
   */
  function attempt(messages) {
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
      let statusCode = null;
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
        statusCode = res.statusCode;
        // Capture Retry-After header if the LLM provider sends one
        const retryAfterHeader = res.headers['retry-after'];
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.error) {
              const llmErr = classifyLLMError(
                new Error(json.error.message || JSON.stringify(json.error)),
                statusCode,
                data
              );
              // Respect Retry-After header if present
              if (retryAfterHeader && llmErr.retryable) {
                const parsed = parseInt(retryAfterHeader, 10);
                if (!isNaN(parsed)) llmErr.retryAfterMs = parsed * 1000;
              }
              reject(llmErr);
              return;
            }
            const content = json.choices?.[0]?.message?.content || '';
            resolve(content);
          } catch (e) {
            reject(classifyLLMError(
              new Error(`Failed to parse LLM response: ${e.message}`),
              statusCode,
              data
            ));
          }
        });
      });

      req.on('error', (err) => {
        reject(classifyLLMError(err, statusCode));
      });
      req.setTimeout(60000, () => {
        req.destroy();
        reject(classifyLLMError(new Error('LLM request timed out (60s)'), 408));
      });
      req.write(body);
      req.end();
    });
  }

  /**
   * Main entry — retries on transient failures with exponential backoff.
   */
  return async function llmCall(messages) {
    let lastError;
    for (let attempt_num = 0; attempt_num <= MAX_RETRIES; attempt_num++) {
      try {
        return await attempt(messages);
      } catch (err) {
        lastError = err instanceof LLMError ? err : classifyLLMError(err);
        if (!lastError.retryable || attempt_num >= MAX_RETRIES) {
          throw lastError;
        }
        const delay = lastError.retryAfterMs || (BASE_RETRY_DELAY_MS * Math.pow(2, attempt_num));
        console.warn(`[LLM] Retry ${attempt_num + 1}/${MAX_RETRIES} after ${delay}ms — ${lastError.code}: ${lastError.message}`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
    throw lastError;
  };
}

/**
 * Create a scene-aware mock LLM provider for testing.
 * 
 * KEY DESIGN: Picks responses based on what the player ACTUALLY DID,
 * not a blind cycling counter. Each session gets its own instance.
 */
function createMockProvider() {
  const usedResponses = { inn: new Set(), coach: new Set(), castle: new Set(), london: new Set(), hunt: new Set(), final: new Set() };

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

  // === LONDON RESPONSES ===
  const londonResponses = {
    vanhelsing: `Van Helsing listens intently, his blue eyes sharp behind his spectacles. He paces the study, hands clasped behind his back, occasionally stopping to peer at you over the rims. "Yes," he says softly. "Yes, this is as I feared. The signs are unmistakable — the pallor, the wounds, the wasting. We are dealing with a vampire. And not just any vampire. An ancient one. One who has perfected his craft over centuries." He opens a cabinet and produces a collection of strange objects: garlic bulbs, a small crucifix, a bottle of holy water. "These are not superstition," he says firmly. "These are weapons. And we will need every one of them.`,

    lucy: `Lucy Westenra lies in her canopied bed, her golden hair spread across the pillow like a halo. She is beautiful even in illness — porcelain skin, dark lashes, lips that might once have been pink but are now the color of old roses. Her breathing is shallow, almost imperceptible. On her throat, barely visible above the lace collar of her nightgown, two small wounds — red, inflamed, placed precisely over the jugular. The room smells of lavender and something else: the sweet, metallic scent you remember from the coffins in the forbidden wing. A garlic bulb sits on the windowsill, its paper skin already browning.`,

    renfield: `Renfield sits cross-legged on the floor of his cell, surrounded by the remains of his latest meal — a spider, half-crushed, its legs still twitching. He looks up at you with bright, feverish eyes and a smile that is equal parts madness and terrible clarity. "The Master is coming," he says conversationally, as if discussing the weather. "He is already here, in fact. In this city. Walking among you. Breathing your air. Planning his migration." He catches a fly from the air with startling speed and examines it thoughtfully. "You think I am mad. Perhaps I am. But madness and truth are not mutually exclusive, are they?"`
  };

  // === HUNT RESPONSES ===
  const huntResponses = {
    crypt: `The crypt is cold and damp, the walls slick with moisture that catches the lamplight like silver. The air smells of turned earth and something older — the sweet, wrong scent of vampire. Coffins line the walls, their lids slightly askew. Fresh earth stains the marble floor. At the far end, a figure lies in an open coffin — beautiful, terrible, familiar. The golden hair, the porcelain skin, the crimson lips. Lucy. But not Lucy. Something wearing Lucy's face like a mask.`,

    mina: `Mina Murray sits in a straight-backed chair, her hands folded in her lap with the composure of someone who has decided to be brave and is holding onto that decision with both hands. Her skin is pale — not the deathly pallor of Lucy's illness, but something subtler, as if the color is draining from her one drop at a time. She touches her throat absently, then catches herself and drops her hand. "I can feel him," she says quietly. "Always. Like a thread pulling behind my ribs. He is... moving. Fleeing. But not fast enough.`,

    carfax: `Carfax Abbey is a ruin of red brick and ivy, perched on a hill above the Thames like a rotting tooth. The chapel roof has collapsed. The nave is choked with dead leaves and the nests of rats. But the cellar — the cellar is different. Fresh-pressed earth, carefully laid stone, and the smell of Transylvanian soil that you will never forget. Eleven wooden crates, each six feet long, each filled to the brim with dark, rich earth from the Carpathian mountains. Earth boxes. Dracula's connection to his homeland. His source of power. His weakness.`
  };

  // === FINAL BATTLE RESPONSES ===
  const finalResponses = {
    transylvania: `The Carpathian mountains rise around you like the bones of the earth, grey and ancient and indifferent to the small group of humans struggling up the mountain path. The air is thin and cold. Snow lies in patches on the ground, and the trees press in on either side like a corridor of bones. Ahead, Mina walks with her eyes half-closed, guided by the bond, seeing through Dracula's eyes, walking his path. Behind you, Van Helsing prays under his breath. The castle is close now. You can feel it — a presence in the air, a weight in the silence. Something ancient and terrible is waiting for you.`,

    castle_ruins: `Castle Dracula is a ruin. The iron gates hang from rusted hinges. The courtyard is choked with dead leaves and the bones of small animals. The great hall — where you once dined with the Count over crimson wine — is a cathedral of dust and shadow. But the castle is not empty. You feel them before you see them: a drop in temperature, a prickling on the back of your neck, a sense of being watched by something that has been watching for centuries. The sisters are here. And below, deeper, in the crypts, the Count waits.`,

    final: `The coffin room is deep beneath the castle, carved from the living rock of the mountain. The air is thick with the smell of Transylvanian earth and something older — the scent of centuries, of dust and blood and time itself. He stands in the center of the room, beside the stone coffin that has been his bed for five hundred years. He is not the gracious host who welcomed you over wine. He is not the furious monster who stormed the asylum. He is something older than either — a creature of pure will, backed into a corner, fighting for his existence. His eyes are dark and ancient. His face is carved from pale stone. "You have come far," he says, and his voice fills the room like smoke. "Perhaps it is time."`
  };

  const allPools = { inn: innResponses, coach: coachResponses, castle: castleResponses, london: londonResponses, hunt: huntResponses, final: finalResponses };

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
        // Act 1: Journey
        if (text.includes('inn') || text.includes('bistritz') || text.includes('golden krone')) { context = 'inn'; break; }
        if (text.includes('coach ride') || text.includes('borgo pass') || text.includes('crossroads')) { context = 'coach'; break; }
        // Act 1-2: Castle
        if (text.includes('arrival') || text.includes('dinner') || text.includes('dining hall') || text.includes('great hall')) { context = 'castle'; break; }
        if (text.includes('forbidden wing') || text.includes('three sisters') || text.includes('journal') || text.includes('escape from') || text.includes('wilderness')) { context = 'castle'; break; }
        // Act 3: London
        if (text.includes('van helsing') || text.includes('london') || text.includes('lucy') || text.includes('renfield') || text.includes('night watch') || text.includes('asylum')) { context = 'london'; break; }
        // Act 4: The Hunt
        if (text.includes('crypt') || text.includes('mina') || text.includes('carfax') || text.includes('counter-attack') || text.includes('blood bond')) { context = 'hunt'; break; }
        // Act 5: Final Battle
        if (text.includes('chase') || text.includes('carpathian') || text.includes('revisited') || text.includes('final') || text.includes('dracula') || text.includes('bites end')) { context = 'final'; break; }
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
  LLMError,
  classifyLLMError,
  createOpenAIProvider,
  createMockProvider,
  createProvider
};
