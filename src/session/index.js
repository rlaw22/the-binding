/**
 * Session Service — Future-proof container for game sessions.
 * 
 * Phase 1: single-player (array length 1)
 * Phase 2: multi-player Campaign Mode (array length 2-6)
 * 
 * Key design: sessions are ALWAYS multi-player capable from Day 1.
 * A single-player adventure is just a session with one player.
 */

const { v4: uuidv4 } = require('uuid');

// Session modes — Phase 1 uses ADVENTURE, Phase 2 adds CAMPAIGN
const SessionMode = {
  ADVENTURE: 'adventure',   // Book-based, single-player, curated scenes
  CAMPAIGN: 'campaign'       // Open-ended, multi-player, full DM
};

// Session states
const SessionState = {
  LOBBY: 'lobby',           // Waiting for players to join
  ACTIVE: 'active',         // Game in progress
  PAUSED: 'paused',         // Saved, can be resumed
  COMPLETED: 'completed'    // Adventure/campaign finished
};

function createSession(options = {}) {
  return {
    id: uuidv4(),
    mode: options.mode || SessionMode.ADVENTURE,
    state: SessionState.LOBBY,
    createdAt: Date.now(),
    updatedAt: Date.now(),

    // Players array — always an array, even for single-player
    players: [],

    // Phase 2: host/spectator support
    hostId: null,             // player ID of the host (first player)
    suggestions: [],          // spectator suggestions: [{ id, spectatorId, spectatorName, action, timestamp, status }]
    nextSuggestionId: 1,

    // Shared world state — everyone sees this
    worldState: {
      currentScene: null,
      previousScene: null,
      npcs: {},           // NPC states: { npcId: { mood, lastSeen, knownInfo } }
      environment: {},    // Current environment: { lighting, terrain, weather }
      activeQuests: [],   // Active quest objectives
      completedQuests: [],
      flags: {},          // Story flags: { metVanHelsing: true, foundKey: false }
      timeOfDay: 'evening',
      turnCount: 0        // How many player turns have happened
    },

    // Scene graph reference — which adventure we're running
    adventureId: options.adventureId || null,

    // Turn management — null in Phase 1, used in Phase 2 Campaign Mode
    turnOrder: null,
    currentPlayerIndex: null,

    // Session metadata
    sessionName: options.sessionName || 'Untitled Session',
    maxPlayers: options.maxPlayers || 6,

    // Statistics
    stats: {
      totalTurns: 0,
      totalDiceRolls: 0,
      totalCoinsEarned: 0,
      totalCombatEncounters: 0,
      totalSkillChecks: 0,
      sessionDuration: 0    // ms, updated on pause/complete
    }
  };
}

/**
 * Add a player to a session. Returns the player object.
 * Each player has shared state (character visible to all) and private state (secrets).
 */
function addPlayer(session, characterData) {
  const isFirst = session.players.length === 0;
  const role = characterData.role || (isFirst ? 'host' : 'spectator');

  if (isFirst) {
    // Will set hostId after we know the player id
  }

  const player = {
    id: characterData.id || uuidv4(),
    name: characterData.name || 'Unknown Hero',
    role,                    // 'host' | 'spectator'
    characterId: characterData.id || uuidv4(),
    character: {
      name: characterData.name || 'Unknown Hero',
      race: characterData.race || 'human',
      class: characterData.class || 'fighter',
      level: characterData.level || 1,
      stats: characterData.stats || {},
      hp: characterData.hp || { current: 10, max: 10 },
      portrait: characterData.portrait || null
    },

    // Private state — only this player sees this (Phase 2: DM whispers)
    privateState: {
      secretClues: [],
      personalGoals: [],
      privateInventory: [],
      notes: []
    },

    // Connection info
    connected: true,
    connectedAt: Date.now(),

    // Player-specific stats
    stats: {
      coinsEarned: 0,
      currentTier: null,
      diceRolls: 0,
      combatsWon: 0,
      skillChecksPassed: 0,
      actionsTotal: 0
    }
  };

  session.players.push(player);

  // First player is always the host
  if (isFirst && !session.hostId) {
    session.hostId = player.id;
  }

  session.updatedAt = Date.now();
  return player;
}

/**
 * Get a player by ID from the session.
 */
function getPlayer(session, playerId) {
  return session.players.find(p => p.id === playerId) || null;
}

/**
 * Get the "primary" player — in Phase 1 this is always the first (only) player.
 */
function getPrimaryPlayer(session) {
  return session.players[0] || null;
}

/**
 * Get the host player (the one who controls actions).
 */
function getHostPlayer(session) {
  if (session.hostId) {
    return session.players.find(p => p.id === session.hostId) || null;
  }
  // Fallback: first host-role player, or first player
  return session.players.find(p => p.role === 'host') || session.players[0] || null;
}

/**
 * Get all spectator players.
 */
function getSpectators(session) {
  return session.players.filter(p => p.role === 'spectator');
}

/**
 * Check if a player is the host.
 */
function isHost(session, playerId) {
  const player = getPlayer(session, playerId);
  return player && player.role === 'host';
}

/**
 * Add a spectator suggestion.
 */
function addSuggestion(session, spectatorId, action) {
  const spectator = getPlayer(session, spectatorId);
  const suggestion = {
    id: session.nextSuggestionId++,
    spectatorId,
    spectatorName: spectator ? spectator.character.name : 'Unknown',
    action,
    timestamp: Date.now(),
    status: 'pending'  // 'pending' | 'approved' | 'dismissed'
  };
  session.suggestions.push(suggestion);
  session.updatedAt = Date.now();
  return suggestion;
}

/**
 * Approve a spectator suggestion (host picks it as their action).
 */
function approveSuggestion(session, suggestionId) {
  const suggestion = session.suggestions.find(s => s.id === suggestionId);
  if (!suggestion) return null;
  suggestion.status = 'approved';
  session.updatedAt = Date.now();
  return suggestion;
}

/**
 * Dismiss a spectator suggestion.
 */
function dismissSuggestion(session, suggestionId) {
  const suggestion = session.suggestions.find(s => s.id === suggestionId);
  if (suggestion) {
    suggestion.status = 'dismissed';
    session.updatedAt = Date.now();
  }
  return suggestion;
}

/**
 * Get pending (unresolved) suggestions.
 */
function getPendingSuggestions(session) {
  return session.suggestions.filter(s => s.status === 'pending');
}

/**
 * Update shared world state.
 */
function updateWorldState(session, updates) {
  Object.assign(session.worldState, updates);
  session.updatedAt = Date.now();
}

/**
 * Set a story flag.
 */
function setFlag(session, flag, value = true) {
  session.worldState.flags[flag] = value;
  session.updatedAt = Date.now();
}

/**
 * Check if a story flag is set.
 */
function hasFlag(session, flag) {
  return !!session.worldState.flags[flag];
}

/**
 * Add an NPC to the world state.
 */
function addNPC(session, npcIdOrData, npcData) {
  const npcId = typeof npcIdOrData === 'string' ? npcIdOrData : (npcIdOrData && npcIdOrData.id);
  const data = typeof npcIdOrData === 'object' ? npcIdOrData : (npcData || {});
  session.worldState.npcs[npcId] = {
    name: data.name,
    mood: data.mood || data.attitude || 'neutral',
    lastSeen: session.worldState.currentScene,
    knownInfo: [],
    alive: true,
    ...data
  };
  session.updatedAt = Date.now();
}

/**
 * Update an NPC's state.
 */
function updateNPC(session, npcId, updates) {
  if (session.worldState.npcs[npcId]) {
    Object.assign(session.worldState.npcs[npcId], updates);
    session.updatedAt = Date.now();
  }
}

/**
 * Transition to a new scene.
 */
function transitionScene(session, newSceneId) {
  session.worldState.previousScene = session.worldState.currentScene;
  session.worldState.currentScene = newSceneId;
  session.worldState.turnCount++;
  session.stats.totalTurns++;
  session.updatedAt = Date.now();
}

/**
 * Save session state (for pause/resume).
 * In Phase 1 this returns the JSON. Phase 2 persists to database.
 */
function saveSession(session) {
  session.state = SessionState.PAUSED;
  session.updatedAt = Date.now();
  return JSON.parse(JSON.stringify(session));
}

/**
 * Resume a saved session.
 */
function resumeSession(savedState) {
  savedState.state = SessionState.ACTIVE;
  savedState.updatedAt = Date.now();
  return savedState;
}

module.exports = {
  SessionMode,
  SessionState,
  createSession,
  addPlayer,
  getPlayer,
  getPrimaryPlayer,
  getHostPlayer,
  getSpectators,
  isHost,
  addSuggestion,
  approveSuggestion,
  dismissSuggestion,
  getPendingSuggestions,
  updateWorldState,
  setFlag,
  hasFlag,
  addNPC,
  updateNPC,
  transitionScene,
  saveSession,
  resumeSession
};
