/**
 * API Server — Fastify with HTTP Polling + REST for The Binding.
 *
 * Uses HTTP polling for server→client and HTTP POST for client→server.
 * No long-lived connections — works behind any proxy (Render, Cloudflare, nginx, etc.).
 *
 * Supports:
 * - Multi-device: message history replay via polling
 * - Rejoin codes: short human-readable codes for reconnecting from another device
 * - Direct link rejoin: ?session=<id> URL parameter
 */

const Fastify = require('fastify');
const fastifyCors = require('@fastify/cors');
const fastifyStatic = require('@fastify/static');
const path = require('path');
const crypto = require('crypto');

const { createSession, addPlayer, getPrimaryPlayer, transitionScene, setFlag, hasFlag, updateWorldState } = require('../session');
const MessageRouter = require('../session/message-router');
const { createContextManager, addTurn, setCharacterSheet, setAdventureContext, updateScene, addKeyDecision } = require('../ai-dm/context-manager');
const { buildAdventureSystemPrompt, CHARACTER_CREATION_PROMPT } = require('../ai-dm/prompts');
const { createGame, processAction, processCharacterCreation, parseDMResponse, scoreAction, generateSceneActions } = require('../ai-dm/dm-service');
const { createProvider } = require('../ai-dm/llm-provider');
const { createCoinPool, scoreTurn, completeScene, calculateTier, formatChapterSummary, CoinCategory } = require('../coin-engine');
const { listAdventures, getAdventure, getAdventureStart, getAdventureOutline } = require('../adventure');
const { DraculaAdventure } = require('../adventure/dracula');
const SceneEngine = require('../scene-engine');
const RuleEngine = require('../rule-engine');
const DiceService = require('../dice/dice-service');

// In-memory session store
const sessions = new Map();
const rejoinCodes = new Map(); // code -> sessionId

/**
 * Generate a short human-readable rejoin code like "DRAC-7A3K".
 */
function generateRejoinCode(adventureId) {
  const prefix = (adventureId || 'game').substring(0, 4).toUpperCase();
  const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${prefix}-${suffix}`;
}

/**
 * Record a message in the session history and return its index.
 */
function recordMessage(sessionId, data) {
  const sessionData = sessions.get(sessionId);
  if (!sessionData) return -1;
  const payload = typeof data === 'string' ? data : JSON.stringify(data);
  sessionData.history.push(payload);
  return sessionData.history.length - 1;
}

/**
 * Create and configure the Fastify server.
 */
async function createServer(options = {}) {
  const app = Fastify({ logger: true });

  // CORS
  await app.register(fastifyCors, { origin: true });

  // Serve static frontend files
  await app.register(fastifyStatic, {
    root: path.join(__dirname, '..', '..', 'public'),
    prefix: '/',
    cacheControl: false
  });

  // No-cache header
  app.addHook('onSend', async (request, reply) => {
    reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  });

    // LLM provider config — each session gets its own provider instance
    // so mock response counters don't bleed across sessions
    const llmConfig = options.llmConfig || { mock: true };

  // --- REST ENDPOINTS ---

  app.get('/api/adventures', async () => {
    return { adventures: listAdventures() };
  });

  app.get('/api/adventures/:id', async (request, reply) => {
    const adventure = getAdventure(request.params.id);
    if (!adventure) return reply.status(404).send({ error: 'Adventure not found' });
    return {
      id: adventure.id,
      name: adventure.name,
      author: adventure.author,
      description: adventure.description,
      difficulty: adventure.difficulty,
      estimatedLength: adventure.estimatedLength,
      acts: adventure.acts
    };
  });

  app.get('/api/health', async () => {
    return { status: 'ok', uptime: process.uptime(), sessions: sessions.size, rejoinCodes: rejoinCodes.size };
  });

  // Rejoin: look up a session by its short code
  app.get('/api/rejoin/:code', async (request, reply) => {
    const code = request.params.code.toUpperCase();
    const sessionId = rejoinCodes.get(code);
    if (!sessionId) {
      return reply.status(404).send({ error: 'Invalid rejoin code' });
    }
    const data = sessions.get(sessionId);
    if (!data) {
      rejoinCodes.delete(code);
      return reply.status(404).send({ error: 'Session expired' });
    }
    const player = getPrimaryPlayer(data.session);
    return {
      sessionId: data.session.id,
      rejoinCode: code,
      adventureName: data.session.sessionName,
      character: player ? player.character : null,
      state: data.session.state,
      totalTurns: data.game.turnHistory.length
    };
  });

  // Create a new game session
  app.post('/api/sessions', async (request, reply) => {
    const { adventureId, playerName, characterClass, characterRace } = request.body || {};

    if (!adventureId) {
      return reply.status(400).send({ error: 'adventureId is required' });
    }

    const adventure = getAdventure(adventureId);
    if (!adventure) {
      return reply.status(404).send({ error: 'Adventure not found' });
    }

    const session = createSession({
      mode: 'adventure',
      adventureId,
      sessionName: `${adventure.name} — ${playerName || 'Unknown Hero'}`
    });

    const player = addPlayer(session, {
      name: playerName || 'Unknown Hero',
      class: characterClass || 'fighter',
      race: characterRace || 'human',
      level: 1,
      hp: { current: 10, max: 10 }
    });

    const game = createGame({
      adventureId,
      adventureName: adventure.name,
      llmProvider: createProvider(llmConfig),
      ruleEngine: RuleEngine,
      diceService: DiceService
    });

    setAdventureContext(game.contextManager, adventure.adventureSummary, getAdventureOutline());
    setCharacterSheet(game.contextManager, player.character);

    const coinPool = createCoinPool(adventure.coinPoolConfig);
    const rejoinCode = generateRejoinCode(adventureId);

    session.state = 'active';
    sessions.set(session.id, { session, game, coinPool, sceneCoins: [], history: [] });
    rejoinCodes.set(rejoinCode, session.id);

    // Initialize scene engine with the first scene's manifest
    const sceneManifest = DraculaAdventure.sceneManifests[adventure.startScene || 'scene_00'];
    if (sceneManifest) {
      game.sceneState = SceneEngine.enterScene(sceneManifest);
    }

    // Generate the opening narration and suggested actions
    const startInfo = getAdventureStart(adventureId);
    if (startInfo) {
      transitionScene(session, startInfo.scene.id);
      updateScene(game.contextManager, startInfo.scene.summary, []);

      recordMessage(session.id, {
        type: 'connected',
        sessionId: session.id,
        character: player.character
      });

      recordMessage(session.id, MessageRouter.narration(
        `You arrive at the Golden Krone Inn in the village of Bistritz. The evening air is thick with the scent of pine and wood smoke. Inside, the innkeeper — a stout, worried-looking man — glances at you with a mixture of pity and alarm when you mention your destination: Castle Dracula.\n\n"Surely you do not mean to go there tonight?" he says, wringing his hands. "The castle is far, and the roads... the roads are not safe after dark."\n\nHe presses a small crucifix into your hands. "Take this. For protection."\n\nOutside, the last light of day fades behind the Carpathian peaks. Your coach will arrive soon.`,
        {}
      ));

      // Generate suggested actions from the scene engine
      const openingActions = generateSceneActions(game.sceneState);
      recordMessage(session.id, MessageRouter.suggestedActions(
        openingActions.map(a => ({ label: a.label, type: a.type || 'free' })),
        'What would you like to do?'
      ));
    }

    return {
      sessionId: session.id,
      rejoinCode,
      playerId: player.id,
      adventureName: adventure.name,
      character: player.character,
      message: `Welcome to ${adventure.name}. Your adventure begins...`
    };
  });

  // Get session info
  app.get('/api/sessions/:id', async (request, reply) => {
    const data = sessions.get(request.params.id);
    if (!data) return reply.status(404).send({ error: 'Session not found' });
    const player = getPrimaryPlayer(data.session);
    return {
      sessionId: data.session.id,
      state: data.session.state,
      adventureName: data.session.sessionName,
      character: player ? player.character : null,
      players: data.session.players.map(p => ({ id: p.id, name: p.character.name, level: p.character.level })),
      currentScene: data.session.worldState.currentScene,
      totalTurns: data.game.turnHistory.length,
      historyLength: data.history.length
    };
  });

  // --- POLLING ENDPOINT ---
  // Client polls this to get new messages. Returns messages after the given index.
  app.get('/api/sessions/:id/messages', async (request, reply) => {
    const sessionId = request.params.id;
    const after = parseInt(request.query.after || '0', 10);

    const data = sessions.get(sessionId);
    if (!data) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    // Return messages after the given index
    const messages = [];
    for (let i = after; i < data.history.length; i++) {
      messages.push({ index: i, data: JSON.parse(data.history[i]) });
    }

    return {
      messages,
      total: data.history.length
    };
  });

  // --- ACTION ENDPOINT ---
  app.post('/api/sessions/:id/actions', async (request, reply) => {
    const sessionId = request.params.id;
    const data = sessions.get(sessionId);

    if (!data) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    const { type, content } = request.body || {};
    if (!content) {
      return reply.status(400).send({ error: 'content is required' });
    }

    const { session, game, coinPool } = data;
    const player = getPrimaryPlayer(session);

    try {
      // Record the player's action
      recordMessage(sessionId, {
        type: 'player_action',
        content: content,
        playerName: player.character.name,
        timestamp: Date.now()
      });

      // Process through DM service
      const result = await processAction(game, content, player.character);

      // Score coins
      const currentSceneIndex = game.turnHistory.length;
      const turnCoins = scoreTurn(result.coinScores, coinPool.scenePools[Math.min(currentSceneIndex, coinPool.scenePools.length - 1)]);

      // Record narrative
      recordMessage(sessionId, MessageRouter.narration(result.narrative, {}));

      // Record coin reward
      if (turnCoins.turnTotal > 0) {
        recordMessage(sessionId, MessageRouter.coinReward(
          turnCoins.turnTotal,
          'intelligence',
          'Clever play',
          {}
        ));
      }

      // Record suggested actions
      if (result.suggestedActions.length > 0) {
        recordMessage(sessionId, MessageRouter.suggestedActions(
          result.suggestedActions.map(a => ({ label: a.label, type: a.type || 'free' })),
          'What would you like to do?'
        ));
      }

      // Handle scene transitions
      if (result.sceneTransition) {
        transitionScene(session, result.sceneTransition.sceneId);
        updateScene(game.contextManager, result.sceneTransition.description, []);

        // Load the next scene's manifest into the scene engine
        const nextManifest = DraculaAdventure.sceneManifests[result.sceneTransition.sceneId];
        if (nextManifest) {
          game.sceneState = SceneEngine.enterScene(nextManifest);

          // Generate fresh suggested actions for the new scene
          const newActions = generateSceneActions(game.sceneState);
          recordMessage(sessionId, MessageRouter.suggestedActions(
            newActions.map(a => ({ label: a.label, type: a.type || 'free' })),
            'What would you like to do?'
          ));
        }
      }

      data.sceneCoins.push(turnCoins);

      return { ok: true, turnNumber: game.turnHistory.length };
    } catch (err) {
      app.log.error(err);
      recordMessage(sessionId, MessageRouter.error('Something went wrong. Please try again.'));
      return reply.status(500).send({ error: 'Action processing failed' });
    }
  });

  return app;
}

module.exports = { createServer };
