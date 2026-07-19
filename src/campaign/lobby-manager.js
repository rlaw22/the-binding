/**
 * Lobby Manager — Session lobby system for multiplayer campaigns.
 *
 * Manages the pre-game lobby phase where players join, build characters,
 * and ready up before the DM starts the campaign. Handles invite codes,
 * host authority, and the lobby → active transition.
 *
 * Builds on the session model — lobby state is stored on session.lobby.
 */

const { v4: uuidv4 } = require('uuid');
const { SessionState } = require('../session');

// Lobby-specific constants
const INVITE_CODE_LENGTH = 6;
const INVITE_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars (0/O, 1/I/L)
const MIN_PLAYERS_TO_START = 1;
const MAX_PLAYERS_DEFAULT = 6;

/**
 * Generate a 6-character alphanumeric invite code.
 * Excludes ambiguous characters (0/O, 1/I/L) for readability.
 *
 * @returns {string} Uppercase 6-char code, e.g. "A3K7WP"
 */
function generateInviteCode() {
  let code = '';
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    const idx = Math.floor(Math.random() * INVITE_CODE_CHARS.length);
    code += INVITE_CODE_CHARS[idx];
  }
  return code;
}

/**
 * Initialize lobby state on a session and add the host player.
 *
 * @param {object} session - Session object (from createSession / createCampaignSession)
 * @param {object} hostPlayer - Character data for the host (name, race, class, etc.)
 * @returns {object} The host player object that was added to the session
 */
function createLobby(session, hostPlayer) {
  if (session.state !== SessionState.LOBBY) {
    throw new Error('Cannot create lobby: session is not in LOBBY state');
  }

  if (session.lobby) {
    throw new Error('Lobby already exists on this session');
  }

  const inviteCode = generateInviteCode();

  session.lobby = {
    inviteCode,
    readyStates: {},       // { playerId: boolean }
    createdAt: Date.now(),
    maxPlayers: session.maxPlayers || MAX_PLAYERS_DEFAULT
  };

  // Add the host player via the session's own addPlayer
  const { addPlayer } = require('../session');
  const host = addPlayer(session, {
    ...hostPlayer,
    role: 'host'
  });

  session.lobby.readyStates[host.id] = false;

  session.updatedAt = Date.now();
  return host;
}

/**
 * Join an existing lobby by invite code. Validates the code, checks capacity,
 * and adds the player to the session.
 *
 * @param {object} session - Session with an active lobby
 * @param {string} inviteCode - The 6-char code shared by the host
 * @param {object} playerOptions - Character data (name, race, class, etc.)
 * @returns {object} The player object that was added
 */
function joinLobby(session, inviteCode, playerOptions) {
  if (!session.lobby) {
    throw new Error('No lobby exists on this session');
  }

  if (session.state !== SessionState.LOBBY) {
    throw new Error('Cannot join: session is not in LOBBY state');
  }

  if (session.lobby.inviteCode !== inviteCode) {
    throw new Error('Invalid invite code');
  }

  if (session.players.length >= session.lobby.maxPlayers) {
    throw new Error(`Lobby is full (${session.lobby.maxPlayers} players max)`);
  }

  // Check for duplicate names
  const name = playerOptions.name || 'Unknown Hero';
  const duplicate = session.players.find(
    p => p.character.name.toLowerCase() === name.toLowerCase()
  );
  if (duplicate) {
    throw new Error(`A player named "${name}" is already in the lobby`);
  }

  const { addPlayer } = require('../session');
  const player = addPlayer(session, {
    ...playerOptions,
    role: 'spectator'
  });

  session.lobby.readyStates[player.id] = false;
  session.updatedAt = Date.now();

  return player;
}

/**
 * Set a player's ready state in the lobby.
 *
 * @param {object} session - Session with an active lobby
 * @param {string} playerId - ID of the player toggling ready
 * @param {boolean} ready - Whether the player is ready
 * @returns {object} Updated ready states map
 */
function setReady(session, playerId, ready) {
  if (!session.lobby) {
    throw new Error('No lobby exists on this session');
  }

  if (session.state !== SessionState.LOBBY) {
    throw new Error('Cannot set ready: session is not in LOBBY state');
  }

  const player = session.players.find(p => p.id === playerId);
  if (!player) {
    throw new Error(`Player ${playerId} is not in this lobby`);
  }

  session.lobby.readyStates[playerId] = !!ready;
  session.updatedAt = Date.now();

  return { ...session.lobby.readyStates };
}

/**
 * Check if all players in the lobby are ready.
 *
 * @param {object} session - Session with an active lobby
 * @returns {boolean} True if every player has readyState === true
 */
function isAllReady(session) {
  if (!session.lobby) return false;
  if (session.players.length < MIN_PLAYERS_TO_START) return false;

  return session.players.every(
    p => session.lobby.readyStates[p.id] === true
  );
}

/**
 * Start the campaign from the lobby. Validates that all players are ready
 * and transitions the session from LOBBY to ACTIVE state.
 *
 * @param {object} session - Session with an active lobby
 * @returns {object} Session summary with player count and state
 */
function startFromLobby(session) {
  if (!session.lobby) {
    throw new Error('No lobby exists on this session');
  }

  if (session.state !== SessionState.LOBBY) {
    throw new Error(`Cannot start: session is in "${session.state}" state, not LOBBY`);
  }

  if (session.players.length < MIN_PLAYERS_TO_START) {
    throw new Error(`Need at least ${MIN_PLAYERS_TO_START} player(s) to start`);
  }

  if (!isAllReady(session)) {
    const notReady = session.players
      .filter(p => !session.lobby.readyStates[p.id])
      .map(p => p.character.name);
    throw new Error(`Not all players are ready. Waiting on: ${notReady.join(', ')}`);
  }

  session.state = SessionState.ACTIVE;
  session.updatedAt = Date.now();

  return {
    sessionId: session.id,
    state: session.state,
    playerCount: session.players.length,
    players: session.players.map(p => ({
      id: p.id,
      name: p.character.name,
      role: p.role
    }))
  };
}

/**
 * Remove a player from the lobby. If the leaving player is the host,
 * transfer host to the next available player. If no players remain,
 * the lobby is left empty.
 *
 * @param {object} session - Session with an active lobby
 * @param {string} playerId - ID of the player leaving
 * @returns {object} Info about who left and who (if anyone) became new host
 */
function leaveLobby(session, playerId) {
  if (!session.lobby) {
    throw new Error('No lobby exists on this session');
  }

  if (session.state !== SessionState.LOBBY) {
    throw new Error('Cannot leave: session is not in LOBBY state');
  }

  const playerIndex = session.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) {
    throw new Error(`Player ${playerId} is not in this lobby`);
  }

  const leavingPlayer = session.players[playerIndex];
  const wasHost = session.hostId === playerId;

  // Remove from players array and ready states
  session.players.splice(playerIndex, 1);
  delete session.lobby.readyStates[playerId];

  let newHost = null;

  // Transfer host if the leaving player was host
  if (wasHost && session.players.length > 0) {
    newHost = session.players[0]; // oldest remaining player
    session.hostId = newHost.id;
    newHost.role = 'host';
  }

  if (session.players.length === 0) {
    session.hostId = null;
  }

  session.updatedAt = Date.now();

  return {
    left: { id: leavingPlayer.id, name: leavingPlayer.character.name },
    wasHost,
    newHost: newHost
      ? { id: newHost.id, name: newHost.character.name }
      : null,
    remainingPlayers: session.players.length
  };
}

/**
 * Host kicks a player from the lobby. Only the current host may kick.
 *
 * @param {object} session - Session with an active lobby
 * @param {string} hostId - ID of the player attempting the kick (must be host)
 * @param {string} targetId - ID of the player to kick
 * @returns {object} Info about the kicked player
 */
function kickPlayer(session, hostId, targetId) {
  if (!session.lobby) {
    throw new Error('No lobby exists on this session');
  }

  if (session.state !== SessionState.LOBBY) {
    throw new Error('Cannot kick: session is not in LOBBY state');
  }

  if (session.hostId !== hostId) {
    throw new Error('Only the host can kick players');
  }

  if (hostId === targetId) {
    throw new Error('Host cannot kick themselves — use leaveLobby instead');
  }

  const targetIndex = session.players.findIndex(p => p.id === targetId);
  if (targetIndex === -1) {
    throw new Error(`Player ${targetId} is not in this lobby`);
  }

  const target = session.players[targetIndex];

  session.players.splice(targetIndex, 1);
  delete session.lobby.readyStates[targetId];

  session.updatedAt = Date.now();

  return {
    kicked: { id: target.id, name: target.character.name },
    remainingPlayers: session.players.length
  };
}

/**
 * Get the full lobby state — players, ready states, invite code, host info.
 *
 * @param {object} session - Session with an active lobby
 * @returns {object} Lobby status snapshot
 */
function getLobbyState(session) {
  if (!session.lobby) {
    return { active: false };
  }

  const host = session.players.find(p => p.id === session.hostId);

  return {
    active: true,
    sessionId: session.id,
    sessionName: session.sessionName,
    state: session.state,
    inviteCode: session.lobby.inviteCode,
    maxPlayers: session.lobby.maxPlayers,
    currentPlayerCount: session.players.length,
    host: host
      ? { id: host.id, name: host.character.name }
      : null,
    allReady: isAllReady(session),
    players: session.players.map(p => ({
      id: p.id,
      name: p.character.name,
      race: p.character.race,
      class: p.character.class,
      level: p.character.level,
      role: p.role,
      ready: !!session.lobby.readyStates[p.id]
    }))
  };
}

/**
 * Transfer host role to another player in the lobby.
 *
 * @param {object} session - Session with an active lobby
 * @param {string} newHostId - ID of the player who will become host
 * @returns {object} Info about the transfer
 */
function transferHost(session, newHostId) {
  if (!session.lobby) {
    throw new Error('No lobby exists on this session');
  }

  const newHost = session.players.find(p => p.id === newHostId);
  if (!newHost) {
    throw new Error(`Player ${newHostId} is not in this lobby`);
  }

  if (session.hostId === newHostId) {
    throw new Error('Player is already the host');
  }

  // Demote old host
  const oldHost = session.players.find(p => p.id === session.hostId);
  if (oldHost) {
    oldHost.role = 'spectator';
  }

  // Promote new host
  newHost.role = 'host';
  session.hostId = newHostId;
  session.updatedAt = Date.now();

  return {
    previousHost: oldHost
      ? { id: oldHost.id, name: oldHost.character.name }
      : null,
    newHost: { id: newHost.id, name: newHost.character.name }
  };
}

module.exports = {
  createLobby,
  generateInviteCode,
  joinLobby,
  setReady,
  isAllReady,
  startFromLobby,
  leaveLobby,
  kickPlayer,
  getLobbyState,
  transferHost
};
