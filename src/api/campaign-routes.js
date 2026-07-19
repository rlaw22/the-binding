/**
 * Campaign API Routes — REST endpoints for Campaign Mode.
 *
 * Provides campaign CRUD, player actions, character management,
 * and SSE event streaming. Mounts on /api/campaigns.
 */

const { v4: uuidv4 } = require('uuid');
const {
  createCampaignSession, startCampaign, processCampaignAction,
  applyWorldChanges, saveCampaign, resumeCampaign, getCampaignSummary
} = require('../campaign');
const { addPlayer, getPlayer, SessionState } = require('../session');

// In-memory campaign store (Phase 1 pattern — JSON persistence, no DB)
const campaignStore = new Map();

/**
 * Register campaign routes on a Fastify instance.
 */
async function campaignRoutes(fastify, options) {

  // ── Create Campaign ──────────────────────────────────────────
  fastify.post('/api/campaigns', async (request, reply) => {
    const { theme, sessionName, maxPlayers, customDescription, playerName, characterClass, characterRace } = request.body || {};

    const session = createCampaignSession({
      theme: theme || 'gothic_horror',
      sessionName: sessionName || undefined,
      maxPlayers: maxPlayers || 6,
      customDescription: customDescription || undefined
    });

    // Add the creating player as host
    const player = addPlayer(session, {
      name: playerName || 'Adventurer',
      class: characterClass || 'fighter',
      race: characterRace || 'human',
      level: 1,
      hp: { current: 10, max: 10 }
    });

    campaignStore.set(session.id, session);

    return {
      campaignId: session.id,
      session: sanitizeSession(session),
      player: { id: player.id, name: player.character.name, role: player.role }
    };
  });

  // ── Get Campaign State ───────────────────────────────────────
  fastify.get('/api/campaigns/:id', async (request, reply) => {
    const session = campaignStore.get(request.params.id);
    if (!session) return reply.code(404).send({ error: 'Campaign not found' });
    return { campaign: sanitizeSession(session), summary: getCampaignSummary(session) };
  });

  // ── List Campaigns ───────────────────────────────────────────
  fastify.get('/api/campaigns', async (request, reply) => {
    const campaigns = [];
    for (const [id, session] of campaignStore) {
      campaigns.push({
        id,
        name: session.sessionName,
        theme: session.campaign?.theme,
        state: session.state,
        players: session.players.length,
        maxPlayers: session.maxPlayers,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
      });
    }
    return { campaigns };
  });

  // ── Start Campaign ───────────────────────────────────────────
  fastify.post('/api/campaigns/:id/start', async (request, reply) => {
    const session = campaignStore.get(request.params.id);
    if (!session) return reply.code(404).send({ error: 'Campaign not found' });
    if (session.state === SessionState.ACTIVE && session.campaign.world) {
      return reply.code(400).send({ error: 'Campaign already started' });
    }

    const result = startCampaign(session, {
      startingLevel: request.body?.startingLevel || 1,
      seed: request.body?.seed || undefined
    });

    return {
      campaignId: session.id,
      openingNarration: result.openingNarration,
      availableQuests: result.availableQuests,
      currentLocation: result.currentLocation
    };
  });

  // ── Submit Player Action ─────────────────────────────────────
  fastify.post('/api/campaigns/:id/actions', async (request, reply) => {
    const session = campaignStore.get(request.params.id);
    if (!session) return reply.code(404).send({ error: 'Campaign not found' });
    if (!session.campaign.world) return reply.code(400).send({ error: 'Campaign not started' });

    const { playerId, action } = request.body || {};
    if (!action) return reply.code(400).send({ error: 'Action is required' });

    // Use first player if no playerId specified
    const pid = playerId || session.players[0]?.id;
    if (!pid) return reply.code(400).send({ error: 'No players in session' });

    const result = processCampaignAction(session, pid, action);

    return {
      campaignId: session.id,
      turnNumber: session.worldState.turnCount,
      dmContext: result.dmContext,
      currentSituation: result.currentSituation,
      activeQuests: result.activeQuests,
      worldState: result.worldState
    };
  });

  // ── Apply DM Response (after LLM generates narration) ────────
  fastify.post('/api/campaigns/:id/dm-response', async (request, reply) => {
    const session = campaignStore.get(request.params.id);
    if (!session) return reply.code(404).send({ error: 'Campaign not found' });

    const { narrative } = request.body || {};
    if (!narrative) return reply.code(400).send({ error: 'Narrative is required' });

    const changes = applyWorldChanges(session, narrative);

    return {
      campaignId: session.id,
      changes,
      worldState: {
        currentLocation: session.campaign.world?.currentLocation,
        timeOfDay: session.campaign.world?.timeOfDay,
        dayCount: session.campaign.world?.dayCount,
        weather: session.campaign.world?.weather
      }
    };
  });

  // ── Join Campaign ────────────────────────────────────────────
  fastify.post('/api/campaigns/:id/join', async (request, reply) => {
    const session = campaignStore.get(request.params.id);
    if (!session) return reply.code(404).send({ error: 'Campaign not found' });
    if (session.players.length >= session.maxPlayers) {
      return reply.code(400).send({ error: 'Campaign is full' });
    }

    const { playerName, characterClass, characterRace } = request.body || {};

    const player = addPlayer(session, {
      name: playerName || 'Adventurer',
      class: characterClass || 'fighter',
      race: characterRace || 'human',
      level: 1,
      hp: { current: 10, max: 10 }
    });

    return {
      campaignId: session.id,
      player: { id: player.id, name: player.character.name, role: player.role },
      totalPlayers: session.players.length
    };
  });

  // ── Get Character Sheet ──────────────────────────────────────
  fastify.get('/api/campaigns/:id/character/:playerId', async (request, reply) => {
    const session = campaignStore.get(request.params.id);
    if (!session) return reply.code(404).send({ error: 'Campaign not found' });

    const player = getPlayer(session, request.params.playerId);
    if (!player) return reply.code(404).send({ error: 'Player not found' });

    return { character: player.character, privateState: player.privateState, stats: player.stats };
  });

  // ── Save Campaign ────────────────────────────────────────────
  fastify.post('/api/campaigns/:id/save', async (request, reply) => {
    const session = campaignStore.get(request.params.id);
    if (!session) return reply.code(404).send({ error: 'Campaign not found' });

    const saved = saveCampaign(session);
    // In Phase 1 pattern, we just return the JSON. File persistence is handled by the persistence module.
    return { campaignId: session.id, savedAt: session.campaign.lastSaved, state: saved.state };
  });

  // ── Get Discovered Locations (Theater of Mind Map) ───────────
  fastify.get('/api/campaigns/:id/map', async (request, reply) => {
    const session = campaignStore.get(request.params.id);
    if (!session) return reply.code(404).send({ error: 'Campaign not found' });
    if (!session.campaign.world) return reply.code(400).send({ error: 'Campaign not started' });

    const world = session.campaign.world;
    const discovered = Object.values(world.locations)
      .filter(l => l.discovered)
      .map(l => ({
        id: l.id,
        name: l.name,
        type: l.type,
        current: l.id === world.currentLocation,
        connections: l.connections,
        npcCount: (l.npcs || []).length
      }));

    return { currentLocation: world.currentLocation, locations: discovered };
  });
}

/**
 * Strip internal state from session before sending to client.
 */
function sanitizeSession(session) {
  return {
    id: session.id,
    sessionName: session.sessionName,
    mode: session.mode,
    state: session.state,
    players: session.players.map(p => ({
      id: p.id,
      name: p.character.name,
      class: p.character.class,
      level: p.character.level,
      role: p.role
    })),
    maxPlayers: session.maxPlayers,
    campaign: session.campaign ? {
      theme: session.campaign.theme,
      themeName: session.campaign.themeName,
      world: session.campaign.world ? {
        currentLocation: session.campaign.world.currentLocation,
        timeOfDay: session.campaign.world.timeOfDay,
        dayCount: session.campaign.world.dayCount,
        weather: session.campaign.world.weather,
        discoveredLocations: Object.values(session.campaign.world.locations).filter(l => l.discovered).length,
        knownNPCs: Object.values(session.campaign.world.npcs).filter(n => n.alive).length
      } : null,
      quests: {
        active: session.campaign.quests.active.length,
        available: session.campaign.quests.available.length,
        completed: session.campaign.quests.completed.length
      }
    } : null,
    stats: session.stats,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt
  };
}

module.exports = campaignRoutes;
