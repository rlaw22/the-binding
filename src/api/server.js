/**
 * API Server — Fastify with SSE + REST for The Binding.
 * 
 * Uses Server-Sent Events (SSE) for server→client and HTTP POST for client→server.
 * Works through any HTTP proxy (localtunnel, nginx, cloudflare, etc.) — no WebSocket upgrade needed.
 *
 * Supports:
 * - Multi-device: message history replay on reconnect
 * - Rejoin codes: short human-readable codes for reconnecting from another device
 * - Direct link rejoin: ?session=<id> URL parameter
 */

const Fastify = require('fastify');
const fastifySse = require('fastify-sse-v2');
const fastifyCors = require('@fastify/cors');
const fastifyStatic = require('@fastify/static');
const path = require('path');
const crypto = require('crypto');

const { createSession, addPlayer, getPrimaryPlayer, transitionScene, setFlag, hasFlag, updateWorldState } = require('../session');
const MessageRouter = require('../session/message-router');
const { createContextManager, addTurn, setCharacterSheet, setAdventureContext, updateScene, addKeyDecision } = require('../ai-dm/context-manager');
const { buildAdventureSystemPrompt, CHARACTER_CREATION_PROMPT } = require('../ai-dm/prompts');
const { createGame, processAction, processCharacterCreation, parseDMResponse, scoreAction } = require('../ai-dm/dm-service');
const { createProvider } = require('../ai-dm/llm-provider');
const { createCoinPool, scoreTurn, completeScene, calculateTier, formatChapterSummary, CoinCategory } = require('../coin-engine');
const { listAdventures, getAdventure, getAdventureStart, getAdventureOutline } = require('../adventure');
const RuleEngine = require('../rule-engine');
const DiceService = require('../dice/dice-service');

// In-memory session store (Phase 1: no persistence)
const sessions = new Map();
const sseStreams = new Map();  // sessionId -> Set<res>
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
 * Broadcast an SSE event to all connected clients for a session.
 * Also records the message in history so reconnecting devices can replay it.
 */
function broadcast(sessionId, data) {
  const streams = sseStreams.get(sessionId);
  const sessionData = sessions.get(sessionId);
  const payload = typeof data === 'string' ? data : JSON.stringify(data);

  // Record in history for replay
  if (sessionData && sessionData.history) {
    sessionData.history.push(payload);
  }

  if (!streams) return;
  for (const stream of streams) {
    try {
      stream.sse({ event: 'message', data: payload });
    } catch (err) {
      streams.delete(stream);
    }
  }
}

/**
 * Send to a single SSE stream and optionally record in history.
 */
function sendToStream(stream, data, sessionId) {
  const payload = typeof data === 'string' ? data : JSON.stringify(data);

  // Record in history
  if (sessionId) {
    const sessionData = sessions.get(sessionId);
    if (sessionData && sessionData.history) {
      sessionData.history.push(payload);
    }
  }

  try {
    stream.sse({ event: 'message', data: payload });
  } catch (err) {
    // stream closed
  }
}

/**
 * Replay full message history to a single SSE stream.
 */
function replayHistory(stream, sessionData, character) {
  // Send a rejoin welcome
  stream.sse({
    event: 'message',
    data: JSON.stringify({
      type: 'connected',
      sessionId: sessionData.session.id,
      character: character,
      rejoin: true
    })
  });

  // Replay every historical message
  for (const msg of sessionData.history) {
    try {
      stream.sse({ event: 'message', data: msg });
    } catch (err) {
      break;
    }
  }
}

/**
 * Create and configure the Fastify server.
 */
async function createServer(options = {}) {
  const app = Fastify({ logger: true });

  // CORS for local dev / tunnel access
  await app.register(fastifyCors, { origin: true });

  // SSE support
  await app.register(fastifySse);

  // Serve static frontend files (no-cache for dev)
  await app.register(fastifyStatic, {
    root: path.join(__dirname, '..', '..', 'public'),
    prefix: '/',
    cacheControl: false
  });

  // Disable caching for all responses (dev mode)
  app.addHook('onSend', async (request, reply) => {
    reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  });

  // LLM provider
  const llmProvider = createProvider(options.llmConfig || { mock: true });

  // --- REST ENDPOINTS ---

  // List available adventures
  app.get('/api/adventures', async () => {
    return { adventures: listAdventures() };
  });

  // Get adventure details
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

  // Health check
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

    // Create session (future-proof: player array from Day 1)
    const session = createSession({
      mode: 'adventure',
      adventureId,
      sessionName: `${adventure.name} — ${playerName || 'Unknown Hero'}`
    });

    // Add player
    const player = addPlayer(session, {
      name: playerName || 'Unknown Hero',
      class: characterClass || 'fighter',
      race: characterRace || 'human',
      level: 1,
      hp: { current: 10, max: 10 }
    });

    // Create game instance with all services
    const game = createGame({
      adventureId,
      adventureName: adventure.name,
      llmProvider,
      ruleEngine: RuleEngine,
      diceService: DiceService
    });

    // Set adventure context on the context manager
    setAdventureContext(game.contextManager, adventure.adventureSummary, getAdventureOutline());
    setCharacterSheet(game.contextManager, player.character);

    // Create coin pool for this adventure
    const coinPool = createCoinPool(adventure.coinPoolConfig);

    // Generate rejoin code
    const rejoinCode = generateRejoinCode(adventureId);

    // Store session + game + coin pool + history
    session.state = 'active';
    sessions.set(session.id, { session, game, coinPool, sceneCoins: [], history: [] });
    sseStreams.set(session.id, new Set());
    rejoinCodes.set(rejoinCode, session.id);

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

  // --- SSE EVENT STREAM ---
  // Client connects here to receive real-time events from the server.
  app.get('/api/sessions/:id/events', async (request, reply) => {
    const sessionId = request.params.id;
    const data = sessions.get(sessionId);

    if (!data) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    // Set SSE headers
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    // Register this stream
    const streams = sseStreams.get(sessionId);
    streams.add(reply);

    const { session, game, coinPool } = data;
    const player = getPrimaryPlayer(session);

    // If there's existing history, this is a rejoin — replay everything
    if (data.history.length > 0) {
      // Rejoin — replay full history (connected event is sent separately by replayHistory)
      replayHistory(reply, data, player.character);
    } else {
      // First connection — send welcome + opening narration + initial actions

      // Send welcome (directly, not recorded in history — it's per-connection metadata)
      reply.sse({
        event: 'message',
        data: JSON.stringify({
          type: 'connected',
          sessionId,
          character: player.character,
          rejoin: false
        })
      });

      // Auto-start the adventure: send opening narration
      const startInfo = getAdventureStart(data.session.adventureId);
      if (startInfo) {
        transitionScene(session, startInfo.scene.id);
        updateScene(game.contextManager, startInfo.scene.summary, []);

        const openingMessage = MessageRouter.narration(
          `You arrive at the Golden Krone Inn in the village of Bistritz. The evening air is thick with the scent of pine and wood smoke. Inside, the innkeeper — a stout, worried-looking man — glances at you with a mixture of pity and alarm when you mention your destination: Castle Dracula.\n\n"Surely you do not mean to go there tonight?" he says, wringing his hands. "The castle is far, and the roads... the roads are not safe after dark."\n\nHe presses a small crucifix into your hands. "Take this. For protection."\n\nOutside, the last light of day fades behind the Carpathian peaks. Your coach will arrive soon.`,
          {}
        );
        sendToStream(reply, openingMessage, sessionId);

        // Send initial suggested actions
        const actions = MessageRouter.suggestedActions([
          { label: 'Ask the innkeeper about Castle Dracula', type: 'investigation' },
          { label: 'Examine the crucifix and ask about local superstitions', type: 'investigation' },
          { label: 'Step outside to survey the road and your surroundings', type: 'exploration' },
          { label: 'Order a drink and steel yourself for the journey', type: 'social' }
        ], 'What would you like to do?');
        sendToStream(reply, actions, sessionId);
      }
    }

    // Keep-alive ping every 30s
    const keepAlive = setInterval(() => {
      try {
        reply.raw.write(': keepalive\n\n');
      } catch (e) {
        clearInterval(keepAlive);
        streams.delete(reply);
      }
    }, 30000);

    // Clean up on disconnect
    request.raw.on('close', () => {
      clearInterval(keepAlive);
      streams.delete(reply);
    });
  });

  // --- ACTION ENDPOINT ---
  // Client sends actions here via HTTP POST.
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
      // Record the player's action in history so rejoining devices see it
      broadcast(sessionId, {
        type: 'player_action',
        content: content,
        playerName: player.character.name,
        timestamp: Date.now()
      });

      // Process through DM service
      const result = await processAction(game, content, player.character);

      // Score coins for this turn
      const currentSceneIndex = game.turnHistory.length;
      const turnCoins = scoreTurn(result.coinScores, coinPool.scenePools[Math.min(currentSceneIndex, coinPool.scenePools.length - 1)]);

      // Broadcast narrative to all connected clients (also records in history)
      broadcast(sessionId, MessageRouter.narration(result.narrative, {}));

      // Send subtle coin notification if earned
      if (turnCoins.turnTotal > 0) {
        broadcast(sessionId, MessageRouter.coinReward(
          turnCoins.turnTotal,
          'intelligence',
          'Clever play',
          {}
        ));
      }

      // Send suggested actions
      if (result.suggestedActions.length > 0) {
        broadcast(sessionId, MessageRouter.suggestedActions(
          result.suggestedActions.map(a => ({ label: a.label, type: a.type || 'free' })),
          'What would you like to do?'
        ));
      }

      // Handle scene transitions
      if (result.sceneTransition) {
        transitionScene(session, result.sceneTransition.sceneId);
        updateScene(game.contextManager, result.sceneTransition.description, []);
      }

      // Track scene coins
      data.sceneCoins.push(turnCoins);

      return { ok: true, turnNumber: game.turnHistory.length };
    } catch (err) {
      app.log.error(err);
      broadcast(sessionId, MessageRouter.error('Something went wrong. Please try again.'));
      return reply.status(500).send({ error: 'Action processing failed' });
    }
  });

  return app;
}

module.exports = { createServer };
