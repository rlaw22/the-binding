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

const { createSession, addPlayer, getPrimaryPlayer, getHostPlayer, getPlayer, isHost, addSuggestion, approveSuggestion, dismissSuggestion, getPendingSuggestions, getSpectators, transitionScene, setFlag, hasFlag, updateWorldState } = require('../session');
const MessageRouter = require('../session/message-router');
const { createContextManager, addTurn, setCharacterSheet, setAdventureContext, updateScene, addKeyDecision } = require('../ai-dm/context-manager');
const { buildAdventureSystemPrompt, CHARACTER_CREATION_PROMPT } = require('../ai-dm/prompts');
const { createGame, processAction, processCharacterCreation, parseDMResponse, scoreAction, generateSceneActions } = require('../ai-dm/dm-service');
const { createProvider } = require('../ai-dm/llm-provider');
const { createCoinPool, scoreTurn, completeScene, calculateTier, formatChapterSummary, CoinCategory } = require('../coin-engine');
const { listAdventures, getAdventure, getAdventureStart, getAdventureOutline } = require('../adventure');
const SceneEngine = require('../scene-engine');
const RuleEngine = require('../rule-engine');
const DiceService = require('../dice/dice-service');
const TokenStore = require('../auth/token-store');
const { createVoiceService, getCachedAudio } = require('../voice');
const { saveSessions, loadSessions, startAutoSave, setupExitSave, markDirty } = require('../session/persistence');
const CombatManager = require('../combat/combat-manager');
const Inventory = require('../inventory/inventory');

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
/**
 * Generate a natural DM comment for a smart player action.
 * Varies the response and connects it to what the player did.
 */
function generateCoinComment(topCategory, playerAction) {
  const action = (playerAction || '').toLowerCase();

  const comments = {
    creativity: [
      "That's an approach no one else would have thought of.",
      "You have a clever mind.",
      "Interesting — that's not the obvious choice, and it just might work.",
      "A creative solution. The game rewards that.",
      "That's the kind of thinking that keeps you alive in places like this."
    ],
    investigation: [
      "You notice things others would miss.",
      "Sharp eye. That detail matters more than you know.",
      "Good instinct to look closer.",
      "Your attention to detail is paying off.",
      "You're putting the pieces together."
    ],
    roleplay: [
      "You speak with conviction, and it shows.",
      "That's exactly what someone in your position would say.",
      "Well played. The character suits you.",
      "You're getting into the spirit of this.",
      "That was well said."
    ],
    combat: [
      "Good instincts under pressure.",
      "That was tactically sound.",
      "You move like someone who's done this before.",
      "Quick thinking. That could have gone badly."
    ],
    exploration: [
      "Your curiosity is rewarded.",
      "You find something most travelers would have walked right past.",
      "Good eye. Not everyone thinks to look there.",
      "You're thorough. That pays off in a place like this."
    ]
  };

  const pool = comments[topCategory] || comments.creativity;
  return pool[Math.floor(Math.random() * pool.length)];
}

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

  // Voice / TTS service — additive, gracefully disabled if no API key
  const voiceService = createVoiceService();
  const voiceEnabled = voiceService.isReady();

  // --- REST ENDPOINTS ---

  app.get('/api/adventures', async () => {
    return listAdventures();
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
    return { status: 'ok', uptime: process.uptime(), sessions: sessions.size, rejoinCodes: rejoinCodes.size, betaEnabled: !!ADMIN_KEY, voiceEnabled };
  });

  // --- LLM STATUS ENDPOINT ---
  app.get('/api/llm/status', async () => {
    return {
      mode: llmConfig.mock ? 'mock' : 'real',
      model: llmConfig.model || process.env.LLM_MODEL || 'gpt-4o',
      hasApiKey: !!(llmConfig.apiKey || process.env.LLM_API_KEY)
    };
  });

  // --- TTS VOICE ENDPOINTS ---

  // Get TTS audio for a task (polls async providers, returns cached sync results)
  app.get('/api/tts/:taskId', async (request, reply) => {
    const taskId = request.params.taskId;
    if (!taskId) return reply.status(400).send({ error: 'taskId required' });

    // Check cache first
    const cached = getCachedAudio(taskId);
    if (cached) {
      return { ready: true, audioUrl: cached.audioUrl, audioBase64: cached.audioBase64, audioType: cached.audioType };
    }

    // For async providers, poll for the result
    if (voiceEnabled) {
      const result = await voiceService.getAudio(taskId);
      return result;
    }

    return { ready: false, reason: 'TTS disabled' };
  });

  // Get voice service status
  app.get('/api/voice/status', async () => {
    return {
      enabled: voiceEnabled,
      provider: voiceService.provider,
      voice: voiceService.voice,
      speed: voiceService.speed
    };
  });

  // --- BETA TOKEN ENDPOINTS ---

  const ADMIN_KEY = process.env.ADMIN_KEY || '';

  /**
   * Simple admin auth check. Returns true if the request has a valid admin key.
   * If ADMIN_KEY is not set, admin endpoints are disabled.
   */
  function requireAdmin(request, reply) {
    if (!ADMIN_KEY) {
      reply.status(403).send({ error: 'Admin endpoints disabled — set ADMIN_KEY env var' });
      return false;
    }
    const key = request.headers['x-admin-key'] || request.query.adminKey;
    if (key !== ADMIN_KEY) {
      reply.status(401).send({ error: 'Invalid admin key' });
      return false;
    }
    return true;
  }

  // Validate a beta token (public — used by the gate page)
  app.post('/api/beta/validate', async (request, reply) => {
    const { token } = request.body || {};
    if (!token) return reply.status(400).send({ error: 'token is required' });

    const valid = TokenStore.validateToken(token);
    if (!valid) return reply.status(401).send({ error: 'Invalid or expired token' });

    return { ok: true, label: valid.label };
  });

  // Record beta signup (NDA acceptance + questionnaire)
  app.post('/api/beta/signup', async (request, reply) => {
    const { token, ndaAccepted, questionnaire } = request.body || {};
    if (!token) return reply.status(400).send({ error: 'token is required' });
    if (!ndaAccepted) return reply.status(400).send({ error: 'ndaAccepted is required' });

    const valid = TokenStore.validateToken(token);
    if (!valid) return reply.status(401).send({ error: 'Invalid or expired token' });

    TokenStore.recordSignup(token, ndaAccepted, questionnaire || {});
    return { ok: true };
  });

  // Admin: list all signups
  app.get('/api/admin/signups', async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    return { signups: TokenStore.getSignups() };
  });

  // --- FEEDBACK: Beta tester bug reports ---
  const feedbackLog = [];
  app.post('/api/feedback', async (request, reply) => {
    const { sessionId, betaToken, description, recentMessages } = request.body || {};
    if (!description || !description.trim()) {
      return reply.status(400).send({ error: 'description is required' });
    }
    const entry = {
      id: 'fb_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      sessionId: sessionId || null,
      betaToken: betaToken || null,
      description: description.trim(),
      recentMessages: recentMessages || [],
      timestamp: new Date().toISOString(),
      userAgent: request.headers['user-agent'] || ''
    };
    feedbackLog.push(entry);
    console.log('[Feedback] #' + feedbackLog.length + ': ' + description.trim().substring(0, 120));
    // Keep last 500 feedback entries in memory
    if (feedbackLog.length > 500) feedbackLog.splice(0, feedbackLog.length - 500);
    return { ok: true, id: entry.id };
  });

  // Admin: list all feedback
  app.get('/api/admin/feedback', async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    return { feedback: feedbackLog };
  });

  // Generate a new token (admin only)
  app.post('/api/admin/tokens', async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const { label, maxSessions } = request.body || {};
    const token = TokenStore.generateToken(label, maxSessions);
    return { ok: true, token };
  });

  // Generate a batch of tokens (admin only)
  app.post('/api/admin/tokens/batch', async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const { count, prefix, maxSessions } = request.body || {};
    const n = Math.min(Math.max(parseInt(count) || 10, 1), 100);
    const tokens = [];
    for (let i = 0; i < n; i++) {
      tokens.push(TokenStore.generateToken(prefix ? `${prefix}-${i + 1}` : '', maxSessions));
    }
    return { ok: true, count: tokens.length, tokens };
  });

  // List all tokens (admin only)
  app.get('/api/admin/tokens', async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    return { tokens: TokenStore.listTokens(), stats: TokenStore.getTokenCount() };
  });

  // Revoke a token (admin only)
  app.delete('/api/admin/tokens/:code', async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const ok = TokenStore.revokeToken(request.params.code);
    if (!ok) return reply.status(404).send({ error: 'Token not found' });
    return { ok: true };
  });

  // Reactivate a token (admin only)
  app.put('/api/admin/tokens/:code', async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const { action } = request.body || {};
    if (action === 'activate') {
      const ok = TokenStore.activateToken(request.params.code);
      if (!ok) return reply.status(404).send({ error: 'Token not found' });
      return { ok: true };
    }
    return reply.status(400).send({ error: 'Unknown action. Use action: "activate"' });
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

  // Create a new game session (requires valid beta token when ADMIN_KEY is set)
  app.post('/api/sessions', async (request, reply) => {
    const { adventureId, playerName, characterClass, characterRace, betaToken } = request.body || {};

    // Resolve beta token code — available for both validation and session recording
    const betaTokenHeader = request.headers['x-beta-token'];
    const tokenCode = betaToken || betaTokenHeader || '';

    // Validate beta token — only enforce when ADMIN_KEY is set (production mode)
    let betaUser = null;
    if (ADMIN_KEY) {
      betaUser = TokenStore.validateToken(tokenCode);
      if (!betaUser) {
        return reply.status(401).send({ error: 'Valid beta access code required. Please enter your code on the login page.' });
      }
    }

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
    if (tokenCode) TokenStore.recordSession(tokenCode);
    session._rejoinCode = rejoinCode;
    markDirty();

    // Initialize scene engine with the first scene's manifest
    const sceneManifest = adventure.sceneManifests[adventure.startScene || 'scene_00'];
    const openingNarrationText = sceneManifest ? sceneManifest.description : '';
    if (sceneManifest) {
      game.sceneState = SceneEngine.enterScene(sceneManifest);
      // Initialize continuity validator with the opening narration as established facts
      const { createValidator } = require('../scene-engine/continuity-validator');
      game.validator = createValidator(sceneManifest, openingNarrationText);
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
        sceneManifest.description,
        {}
      ));

      // Add opening narration to the context manager so the DM knows what already happened
      addTurn(game.contextManager, 'assistant', sceneManifest.description);

      // Generate suggested actions from the scene engine
      const openingActions = generateSceneActions(game.sceneState);
      recordMessage(session.id, MessageRouter.suggestedActions(
        openingActions.map(a => ({ label: a.label, type: a.type || 'free' })),
        'What would you like to do?'
      ));
    }

    // Collect opening messages for the response
    const sessionData = sessions.get(session.id);
    const openingMessages = sessionData ? sessionData.history.map((h, i) => ({ index: i, data: JSON.parse(h) })) : [];

    return {
      sessionId: session.id,
      rejoinCode,
      playerId: player.id,
      adventureName: adventure.name,
      character: player.character,
      messages: openingMessages,
      message: `Welcome to ${adventure.name}. Your adventure begins...`
    };
  });

  // Get session info (Phase 2: includes roles and suggestions)
  app.get('/api/sessions/:id', async (request, reply) => {
    const data = sessions.get(request.params.id);
    if (!data) return reply.status(404).send({ error: 'Session not found' });
    const host = getHostPlayer(data.session);
    return {
      sessionId: data.session.id,
      state: data.session.state,
      adventureName: data.session.sessionName,
      character: host ? host.character : null,
      hostId: data.session.hostId,
      players: data.session.players.map(p => ({ id: p.id, name: p.character.name, level: p.character.level, role: p.role })),
      spectatorCount: getSpectators(data.session).length,
      pendingSuggestions: getPendingSuggestions(data.session).length,
      currentScene: data.session.worldState.currentScene,
      totalTurns: data.game.turnHistory.length,
      historyLength: data.history.length
    };
  });

  // --- COIN STATS ENDPOINT ---
  app.get('/api/sessions/:id/coins', async (request, reply) => {
    const data = sessions.get(request.params.id);
    if (!data) return reply.status(404).send({ error: 'Session not found' });

    const { coinPool, sceneCoins, game } = data;
    let totalEarned = 0;
    for (const sc of sceneCoins) {
      totalEarned += (sc && sc.turnTotal) || (sc && sc.total) || 0;
    }

    const currentScene = game.sceneState ? game.sceneState.sceneId : null;
    const sessionAdv = getAdventure(data.game.adventureId) || getAdventure('dracula');
    const sceneIndex = sessionAdv.scenes.findIndex(s => s.id === currentScene);

    return {
      totalEarned,
      totalPool: coinPool.totalPool,
      percentage: coinPool.totalPool > 0 ? Math.round((totalEarned / coinPool.totalPool) * 100) : 0,
      currentScene: sceneIndex,
      totalScenes: coinPool.totalScenes,
      categoryBreakdown: sceneCoins.reduce((acc, sc) => {
        if (sc && sc.coins) {
          for (const [cat, val] of Object.entries(sc.coins)) {
            acc[cat] = (acc[cat] || 0) + val;
          }
        }
        return acc;
      }, {})
    };
  });

  // --- PROGRESS TRACKER ENDPOINT ---
  app.get('/api/sessions/:id/progress', async (request, reply) => {
    const data = sessions.get(request.params.id);
    if (!data) return reply.status(404).send({ error: 'Session not found' });

    const currentScene = data.game.sceneState ? data.game.sceneState.sceneId : null;
    const progressAdv = getAdventure(data.game.adventureId) || getAdventure('dracula');
    const sceneIndex = progressAdv.scenes.findIndex(s => s.id === currentScene);
    const totalScenes = progressAdv.scenes.length;

    // Determine act based on scene index
    const acts = progressAdv.acts || [];
    let currentAct = null;
    for (const act of acts) {
      if (act.scenes && act.scenes.includes(sceneIndex)) {
        currentAct = act;
        break;
      }
    }

    // Completion from scene engine
    const sceneState = data.game.sceneState;
    const sceneCompletion = sceneState ? SceneEngine.getCompletion(sceneState) : 0;

    return {
      currentScene: sceneIndex >= 0 ? sceneIndex : 0,
      totalScenes,
      sceneName: sceneState ? sceneState.sceneName : 'Unknown',
      sceneCompletion: Math.round(sceneCompletion * 100),
      act: currentAct ? {
        id: currentAct.id,
        name: currentAct.name,
        number: acts.indexOf(currentAct) + 1,
        totalActs: acts.length,
        summary: currentAct.summary
      } : null,
      totalTurns: data.game.turnHistory.length
    };
  });

  // --- INVENTORY ENDPOINTS ---
  app.get('/api/sessions/:id/inventory', async (request, reply) => {
    const data = sessions.get(request.params.id);
    if (!data) return reply.status(404).send({ error: 'Session not found' });
    return { items: Inventory.listItems(data.inventory) };
  });

  app.post('/api/sessions/:id/inventory/use', async (request, reply) => {
    const data = sessions.get(request.params.id);
    if (!data) return reply.status(404).send({ error: 'Session not found' });
    const { itemId } = request.body || {};
    if (!itemId) return reply.status(400).send({ error: 'itemId is required' });

    const result = Inventory.useItem(data.inventory, itemId);
    if (!result) return reply.status(400).send({ error: 'Item not found or no uses remaining' });

    // If there's active combat and the item has a combat effect, apply it
    if (data.combat && data.combat.active && result.effect) {
      const effect = result.effect;
      if (effect.type === 'heal') {
        const healRoll = RuleEngine.rollDamage({ dice: effect.dice, modifier: effect.modifier });
        data.combat.player.hp.current = Math.min(data.combat.player.hp.max, data.combat.player.hp.current + healRoll.total);
        return { ok: true, item: result.item.name, effect: 'heal', amount: healRoll.total, consumed: result.consumed, playerHp: data.combat.player.hp };
      }
      if (effect.type === 'damage') {
        // Apply to first alive enemy
        const target = data.combat.enemies.find(e => e.alive);
        if (target) {
          const dmg = RuleEngine.rollDamage({ dice: effect.dice, modifier: 0 });
          target.hp.current = Math.max(0, target.hp.current - dmg.total);
          if (target.hp.current <= 0) target.alive = false;
          markDirty();
          return { ok: true, item: result.item.name, effect: 'damage', amount: dmg.total, target: target.name, consumed: result.consumed, targetHp: target.hp };
        }
      }
      if (effect.type === 'repel' || effect.type === 'ward') {
        // Give the player advantage on next round
        data.combat.player._itemAdvantage = true;
        markDirty();
        return { ok: true, item: result.item.name, effect: effect.type, description: result.item.name + ' repels the undead!', consumed: result.consumed };
      }
    }

    markDirty();
    return { ok: true, item: result.item.name, consumed: result.consumed, remainingUses: result.remainingUses };
  });

  // --- COMBAT ENDPOINTS ---
  app.post('/api/sessions/:id/combat/start', async (request, reply) => {
    const data = sessions.get(request.params.id);
    if (!data) return reply.status(404).send({ error: 'Session not found' });
    const { enemies } = request.body || {};
    if (!enemies || !enemies.length) return reply.status(400).send({ error: 'enemies array required (e.g. [{template: "wolf", count: 3}])' });

    const player = data.session.players[0];
    if (!player) return reply.status(400).send({ error: 'No player in session' });

    data.combat = CombatManager.startCombat(player.character, enemies);
    recordMessage(data.session.id, MessageRouter.narration(
      'Combat begins! Roll for initiative...',
      { combat: true }
    ));
    markDirty();

    return { ok: true, combat: CombatManager.getCombatSummary(data.combat) };
  });

  app.get('/api/sessions/:id/combat', async (request, reply) => {
    const data = sessions.get(request.params.id);
    if (!data) return reply.status(404).send({ error: 'Session not found' });
    if (!data.combat) return { active: false };
    return CombatManager.getCombatSummary(data.combat);
  });

  app.post('/api/sessions/:id/combat/action', async (request, reply) => {
    const data = sessions.get(request.params.id);
    if (!data) return reply.status(404).send({ error: 'Session not found' });
    if (!data.combat || !data.combat.active) return reply.status(400).send({ error: 'No active combat' });

    const { action } = request.body || {};
    if (!action) return reply.status(400).send({ error: 'action required (attack, defend, cast, flee, use_item)' });

    const result = CombatManager.processPlayerAction(data.combat, action, request.body);

    // Record combat narration as messages
    recordMessage(data.session.id, MessageRouter.narration(result.narrative));

    // If combat ended, clear combat state and add aftermath
    if (!result.combat.active) {
      data.combat = null;
      // Add victory/defeat suggested actions
      if (result.combat.outcome === 'victory') {
        recordMessage(data.session.id, MessageRouter.suggestedActions([
          { label: 'Catch your breath', type: 'free' },
          { label: 'Search the area', type: 'exploration' },
          { label: 'Check your wounds', type: 'free' },
          { label: 'Press onward', type: 'exit' }
        ], 'The battle is won. What do you do?'));
      }
    }

    markDirty();
    return { ok: true, narrative: result.narrative, combat: CombatManager.getCombatSummary(result.combat), diceRolls: result.diceRolls };
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

  // --- ACTION ENDPOINT (Phase 2: host-only validation) ---
  app.post('/api/sessions/:id/actions', async (request, reply) => {
    const sessionId = request.params.id;
    const data = sessions.get(sessionId);

    if (!data) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    const { type, content, playerId } = request.body || {};
    if (!content) {
      return reply.status(400).send({ error: 'content is required' });
    }

    const { session, game, coinPool } = data;

    // Phase 2: resolve the acting player — must be the host
    let player;
    if (playerId) {
      player = getPlayer(session, playerId);
      if (!player) return reply.status(404).send({ error: 'Player not found' });
      if (player.role === 'spectator') return reply.status(403).send({ error: 'Spectators cannot submit actions' });
    } else {
      player = getHostPlayer(session);
    }
    if (!player) return reply.status(404).send({ error: 'No host player found' });

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

      // Generate TTS voice for the narration (async, non-blocking)
      if (voiceEnabled) {
        voiceService.generate(result.narrative).then(ttsResult => {
          if (ttsResult.taskId) {
            recordMessage(sessionId, MessageRouter.voiceAudio(ttsResult.taskId, ttsResult.status));
          }
        }).catch(err => {
          console.error('[TTS] Voice generation failed:', err.message);
          // Gameplay continues without voice — no error to user
        });
      }

      // Coin reward — only on genuinely smart moves, shown as a natural DM comment
      const smartThreshold = 4; // any individual category must score >= 4
      const scores = result.coinScores || {};
      const topCategory = Object.entries(scores).reduce((best, [cat, val]) =>
        val > best[1] ? [cat, val] : best, ['none', 0]);

      if (topCategory[1] >= smartThreshold) {
        const comment = generateCoinComment(topCategory[0], content);
        recordMessage(sessionId, MessageRouter.narration(comment));
      }

      // Record suggested actions
      if (result.suggestedActions.length > 0) {
        recordMessage(sessionId, MessageRouter.suggestedActions(
          result.suggestedActions.map(a => ({ label: a.label, type: a.type || 'free' })),
          'What would you like to do?'
        ));
      }

      // Handle scene transitions — session-level tracking only
      // (dm-service already handled game state, validator, warm context, and opening narration)
      if (result.sceneTransition) {
        transitionScene(session, result.sceneTransition.sceneId);
      }

      data.sceneCoins.push(turnCoins);
      markDirty();

      return {
        ok: true,
        turnNumber: game.turnHistory.length,
        narrative: result.narrative,
        suggestedActions: result.suggestedActions || []
      };
    } catch (err) {
      app.log.error(err);
      recordMessage(sessionId, MessageRouter.error('Something went wrong. Please try again.'));
      return reply.status(500).send({ error: 'Action processing failed' });
    }
  });

  // --- PHASE 2: SPECTATOR JOIN ---
  app.post('/api/sessions/:id/join', async (request, reply) => {
    const data = sessions.get(request.params.id);
    if (!data) return reply.status(404).send({ error: 'Session not found' });

    const { playerName } = request.body || {};
    if (!playerName) return reply.status(400).send({ error: 'playerName is required' });

    const { session } = data;
    if (session.players.length >= session.maxPlayers) {
      return reply.status(400).send({ error: 'Session is full' });
    }

    const spectator = addPlayer(session, {
      name: playerName,
      role: 'spectator',
      class: 'spectator',
      race: 'spectator',
      level: 0,
      hp: { current: 0, max: 0 }
    });

    // Announce the spectator joining
    recordMessage(session.id, MessageRouter.system(
      `${playerName} is now watching the adventure.`
    ));

    return {
      sessionId: session.id,
      playerId: spectator.id,
      role: 'spectator',
      hostId: session.hostId,
      character: spectator.character,
      players: session.players.map(p => ({ id: p.id, name: p.character.name, role: p.role }))
    };
  });

  // --- PHASE 2: SPECTATOR SUGGESTION ---
  app.post('/api/sessions/:id/suggestions', async (request, reply) => {
    const data = sessions.get(request.params.id);
    if (!data) return reply.status(404).send({ error: 'Session not found' });

    const { playerId, content } = request.body || {};
    if (!content) return reply.status(400).send({ error: 'content is required' });
    if (!playerId) return reply.status(400).send({ error: 'playerId is required' });

    const { session } = data;
    const player = getPlayer(session, playerId);
    if (!player) return reply.status(404).send({ error: 'Player not found' });
    if (player.role !== 'spectator') return reply.status(403).send({ error: 'Only spectators can submit suggestions' });

    const suggestion = addSuggestion(session, playerId, content);

    // Broadcast the suggestion to the host as a message
    const msg = MessageRouter.spectatorSuggestion(content, player.character.name, playerId);
    recordMessage(session.id, msg);

    return { ok: true, suggestion };
  });

  // --- PHASE 2: HOST APPROVES SUGGESTION ---
  app.post('/api/sessions/:id/suggestions/:suggestionId/approve', async (request, reply) => {
    const data = sessions.get(request.params.id);
    if (!data) return reply.status(404).send({ error: 'Session not found' });

    const { playerId } = request.body || {};
    const { session } = data;

    // Verify the approver is the host
    if (playerId) {
      const player = getPlayer(session, playerId);
      if (!player || player.role !== 'host') {
        return reply.status(403).send({ error: 'Only the host can approve suggestions' });
      }
    }

    const suggestionId = parseInt(request.params.suggestionId, 10);
    const suggestion = approveSuggestion(session, suggestionId);
    if (!suggestion) return reply.status(404).send({ error: 'Suggestion not found' });

    // Execute the approved suggestion as a host action through the DM
    const host = getHostPlayer(session);
    const game = data.game;
    const coinPool = data.coinPool;

    try {
      recordMessage(session.id, {
        type: 'player_action',
        content: suggestion.action,
        playerName: host.character.name,
        suggestedBy: suggestion.spectatorName,
        timestamp: Date.now()
      });

      const result = await processAction(game, suggestion.action, host.character);

      const currentSceneIndex = game.turnHistory.length;
      const turnCoins = scoreTurn(result.coinScores, coinPool.scenePools[Math.min(currentSceneIndex, coinPool.scenePools.length - 1)]);

      recordMessage(session.id, MessageRouter.narration(result.narrative, {}));

      // Generate TTS voice for the narration (async, non-blocking)
      if (voiceEnabled) {
        voiceService.generate(result.narrative).then(ttsResult => {
          if (ttsResult.taskId) {
            recordMessage(session.id, MessageRouter.voiceAudio(ttsResult.taskId, ttsResult.status));
          }
        }).catch(err => {
          console.error('[TTS] Voice generation failed (suggestion):', err.message);
        });
      }

      // Coin reward — same logic as main action endpoint
      const smartThreshold = 4;
      const scores = result.coinScores || {};
      const topCategory = Object.entries(scores).reduce((best, [cat, val]) =>
        val > best[1] ? [cat, val] : best, ['none', 0]);

      if (topCategory[1] >= smartThreshold) {
        const comment = generateCoinComment(topCategory[0], suggestion.action);
        recordMessage(session.id, MessageRouter.narration(comment));
      }

      if (result.suggestedActions.length > 0) {
        recordMessage(session.id, MessageRouter.suggestedActions(
          result.suggestedActions.map(a => ({ label: a.label, type: a.type || 'free' })),
          'What would you like to do?'
        ));
      }

      if (result.sceneTransition) {
        transitionScene(session, result.sceneTransition.sceneId);
      }

      data.sceneCoins.push(turnCoins);
      markDirty();

      return { ok: true, suggestion, turnNumber: game.turnHistory.length, narrative: result.narrative };
    } catch (err) {
      app.log.error(err);
      recordMessage(session.id, MessageRouter.error('Something went wrong processing the suggestion.'));
      return reply.status(500).send({ error: 'Suggestion processing failed' });
    }
  });

  // --- PHASE 2: GET PENDING SUGGESTIONS ---
  app.get('/api/sessions/:id/suggestions', async (request, reply) => {
    const data = sessions.get(request.params.id);
    if (!data) return reply.status(404).send({ error: 'Session not found' });
    return { suggestions: getPendingSuggestions(data.session) };
  });

  // --- PERSISTENCE: Load saved sessions and start auto-save ---
  const loadedCount = loadSessions(sessions, rejoinCodes, createProvider, llmConfig, RuleEngine, DiceService);
  if (loadedCount > 0) {
    console.log('  \u{1f4be} Restored ' + loadedCount + ' saved session(s)');
  }
  startAutoSave(sessions);
  setupExitSave(sessions);

  return app;
}

module.exports = { createServer };
