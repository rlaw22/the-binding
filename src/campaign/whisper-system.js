/**
 * Whisper System — Private Messaging for Campaign Sessions
 *
 * Handles DM-to-player whispers, player-to-player messages, broadcast
 * narration, and visibility filtering. Integrates with the message router's
 * DmMessage format (targets[], type: 'whisper').
 *
 * All messages flow through the router's routeMessage() for delivery —
 * this module creates properly-structured messages and manages history.
 */

const { v4: uuidv4 } = require('uuid');

// ─── Whisper Types ───────────────────────────────────────────────────────────

/** @enum {string} */
const WhisperType = {
  PLAYER_TO_PLAYER: 'player_to_player',
  DM_TO_PLAYER: 'dm_to_player',
  PLAYER_TO_DM: 'player_to_dm',
  DM_NARRATION: 'dm_narration',
  BROADCAST: 'broadcast',
  SYSTEM: 'system'
};

// ─── Core Message Creation ───────────────────────────────────────────────────

/**
 * Create a whisper message object.
 * @param {string} fromId - Sender player ID ('dm' for DM-originated)
 * @param {string[]} toIds - Array of recipient player IDs (empty = broadcast)
 * @param {string} content - Message text
 * @param {object} [metadata={}] - Additional metadata (whisperType, tone, etc.)
 * @returns {object} DmMessage-compatible whisper object
 */
function createWhisper(fromId, toIds, content, metadata = {}) {
  const whisperType = metadata.whisperType || _inferWhisperType(fromId, toIds);

  return {
    id: uuidv4(),
    type: 'whisper',
    content,
    timestamp: Date.now(),
    targets: toIds,
    metadata: {
      ...metadata,
      whisperType,
      fromId,
      priority: metadata.priority || 'normal',
      ephemeral: metadata.ephemeral || false,
      replyTo: metadata.replyTo || null
    }
  };
}

/**
 * Create a broadcast message visible to all players in the session.
 * @param {object} session - Campaign session with players[]
 * @param {string} content - Message text
 * @param {object} [metadata={}] - Additional metadata
 * @returns {object} DmMessage with empty targets (router broadcasts to all)
 */
function broadcastToAll(session, content, metadata = {}) {
  const allIds = _getPlayerIds(session);
  return createWhisper('dm', allIds, content, {
    ...metadata,
    whisperType: WhisperType.BROADCAST
  });
}

/**
 * Private message from one player to another, or DM to a player.
 * @param {object} session - Campaign session
 * @param {string} fromId - Sender ID ('dm' or player ID)
 * @param {string} toId - Recipient player ID
 * @param {string} content - Message text
 * @returns {object} Whisper message targeted to the recipient
 */
function whisperToPlayer(session, fromId, toId, content) {
  const type = fromId === 'dm'
    ? WhisperType.DM_TO_PLAYER
    : WhisperType.PLAYER_TO_PLAYER;

  return createWhisper(fromId, [toId], content, {
    whisperType: type
  });
}

/**
 * DM narration visible to all players (scene description, NPC dialogue).
 * Unlike broadcast, this is story content — the DM "speaking" to the party.
 * @param {object} session - Campaign session
 * @param {string} content - Narration text
 * @returns {object} Narration-style whisper to all players
 */
function whisperToParty(session, content) {
  const allIds = _getPlayerIds(session);
  return createWhisper('dm', allIds, content, {
    whisperType: WhisperType.DM_NARRATION,
    ephemeral: false
  });
}

/**
 * Player sends a private message to the DM only.
 * @param {object} session - Campaign session
 * @param {string} fromId - Sending player ID
 * @param {string} content - Message text
 * @returns {object} Whisper targeted to DM (targets=['dm'])
 */
function whisperToDM(session, fromId, content) {
  return createWhisper(fromId, ['dm'], content, {
    whisperType: WhisperType.PLAYER_TO_DM
  });
}

// ─── History & Visibility ────────────────────────────────────────────────────

/**
 * Get whisper history visible to a specific player.
 * Returns their sent messages + messages targeted to them, sorted newest-first.
 * @param {object} session - Campaign session (must have whisperHistory[])
 * @param {string} playerId - Player ID to filter for
 * @param {number} [limit=50] - Max messages to return
 * @returns {object[]} Array of whisper messages
 */
function getWhisperHistory(session, playerId, limit = 50) {
  const history = session.whisperHistory || [];
  const visible = history.filter(msg => _isMessageVisibleTo(msg, playerId));
  visible.sort((a, b) => b.timestamp - a.timestamp);
  return visible.slice(0, limit);
}

/**
 * Filter a message log to only show messages visible to playerId.
 * A message is visible if:
 *   - It's a broadcast/narration (empty targets or all-player targets)
 *   - The player is in the targets list
 *   - The player is the sender (fromId)
 *   - It's a system message
 * @param {object} session - Campaign session
 * @param {string} playerId - Player ID to filter for
 * @param {object[]} messageLog - Full message log
 * @returns {object[]} Filtered messages visible to this player
 */
function getVisibleMessages(session, playerId, messageLog) {
  if (!messageLog || !messageLog.length) return [];

  return messageLog.filter(msg => _isMessageVisibleTo(msg, playerId));
}

// ─── Context Builders ────────────────────────────────────────────────────────

/**
 * Build a private context object with info only this player should see.
 * Includes their perception checks, secret knowledge, personal quest hooks,
 * and any DM notes targeted to them.
 * @param {object} session - Campaign session
 * @param {string} playerId - Player ID
 * @returns {object} Private context for AI DM prompting
 */
function createPrivateContext(session, playerId) {
  const player = _findPlayer(session, playerId);
  const privateNotes = (session.privateNotes || {})[playerId] || [];
  const personalQuests = (session.personalQuests || {})[playerId] || [];
  const secretKnowledge = (session.secretKnowledge || {})[playerId] || [];
  const whisperHistory = getWhisperHistory(session, playerId, 20);

  return {
    playerId,
    playerName: player ? player.name : playerId,
    character: player ? player.character : null,
    privateNotes,
    personalQuests,
    secretKnowledge,
    recentWhispers: whisperHistory,
    perceptionResults: _getPrivatePerceptionResults(session, playerId),
    knownClues: _getKnownClues(session, playerId),
    timestamp: Date.now()
  };
}

/**
 * Build shared context visible to all players.
 * Includes party state, public quest progress, shared map knowledge,
 * and recent broadcast messages.
 * @param {object} session - Campaign session
 * @returns {object} Shared context for AI DM prompting
 */
function createSharedContext(session) {
  const allIds = _getPlayerIds(session);
  const recentBroadcasts = (session.whisperHistory || [])
    .filter(msg => {
      const wt = msg.metadata && msg.metadata.whisperType;
      return wt === WhisperType.BROADCAST || wt === WhisperType.DM_NARRATION;
    })
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 20);

  return {
    sessionId: session.id,
    campaignId: session.campaignId || null,
    players: (session.players || []).map(p => ({
      id: p.id,
      name: p.name,
      character: p.character || null,
      connected: p.connected || false
    })),
    partyState: session.partyState || {},
    publicQuests: session.publicQuests || [],
    sharedKnowledge: session.sharedKnowledge || [],
    currentScene: session.currentScene || null,
    recentBroadcasts,
    timestamp: Date.now()
  };
}

// ─── Display Formatting ──────────────────────────────────────────────────────

/**
 * Format a whisper message for UI display.
 * Returns a structured object with display-ready fields.
 * @param {object} whisper - Whisper message object
 * @returns {object} Formatted display object
 */
function formatWhisperForDisplay(whisper) {
  const meta = whisper.metadata || {};
  const whisperType = meta.whisperType || WhisperType.SYSTEM;
  const fromId = meta.fromId || 'unknown';

  const senderLabel = fromId === 'dm'
    ? 'DM'
    : (meta.fromName || fromId);

  const targetLabels = (whisper.targets || []).map(id =>
    id === 'dm' ? 'DM' : (meta.targetNames?.[id] || id)
  );

  const typeLabels = {
    [WhisperType.DM_TO_PLAYER]: `🔒 Whisper from ${senderLabel}`,
    [WhisperType.PLAYER_TO_PLAYER]: `💬 ${senderLabel} → ${targetLabels.join(', ')}`,
    [WhisperType.PLAYER_TO_DM]: `📨 ${senderLabel} → DM`,
    [WhisperType.DM_NARRATION]: '📖 Narration',
    [WhisperType.BROADCAST]: '📢 Broadcast',
    [WhisperType.SYSTEM]: '⚙️ System'
  };

  return {
    id: whisper.id,
    label: typeLabels[whisperType] || whisperType,
    sender: senderLabel,
    targets: targetLabels,
    content: whisper.content,
    timestamp: whisper.timestamp,
    timeFormatted: _formatTimestamp(whisper.timestamp),
    whisperType,
    isPrivate: whisperType === WhisperType.DM_TO_PLAYER
      || whisperType === WhisperType.PLAYER_TO_DM
      || whisperType === WhisperType.PLAYER_TO_PLAYER,
    isEphemeral: meta.ephemeral || false
  };
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

/**
 * Infer whisper type from sender and recipient IDs.
 * @private
 */
function _inferWhisperType(fromId, toIds) {
  if (fromId === 'dm') {
    return toIds.length > 1 || toIds.length === 0
      ? WhisperType.BROADCAST
      : WhisperType.DM_TO_PLAYER;
  }
  if (toIds.includes('dm') && toIds.length === 1) {
    return WhisperType.PLAYER_TO_DM;
  }
  return WhisperType.PLAYER_TO_PLAYER;
}

/**
 * Extract all player IDs from a session.
 * @private
 */
function _getPlayerIds(session) {
  return (session.players || []).map(p => p.id);
}

/**
 * Find a player in the session by ID.
 * @private
 */
function _findPlayer(session, playerId) {
  return (session.players || []).find(p => p.id === playerId) || null;
}

/**
 * Check if a message is visible to a given player.
 * @private
 */
function _isMessageVisibleTo(msg, playerId) {
  const meta = msg.metadata || {};
  const fromId = meta.fromId;
  const targets = msg.targets || [];

  // Sender always sees their own messages
  if (fromId === playerId) return true;

  // System messages are visible to all
  if (msg.type === 'system') return true;

  // Broadcast/narration: empty targets or all-player targets
  const wt = meta.whisperType;
  if (wt === WhisperType.BROADCAST || wt === WhisperType.DM_NARRATION) return true;

  // Player is in the targets list
  if (targets.includes(playerId)) return true;

  return false;
}

/**
 * Get private perception check results for a player.
 * @private
 */
function _getPrivatePerceptionResults(session, playerId) {
  const checks = session.perceptionChecks || [];
  return checks.filter(c =>
    c.playerId === playerId && (c.private || c.secret)
  );
}

/**
 * Get clues known to a specific player.
 * @private
 */
function _getKnownClues(session, playerId) {
  const clues = session.clues || [];
  return clues.filter(c =>
    !c.restrictedTo || c.restrictedTo.includes(playerId)
  );
}

/**
 * Format a timestamp for display.
 * @private
 */
function _formatTimestamp(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const hours = d.getHours().toString().padStart(2, '0');
  const mins = d.getMinutes().toString().padStart(2, '0');
  return `${hours}:${mins}`;
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  WhisperType,
  createWhisper,
  broadcastToAll,
  whisperToPlayer,
  whisperToParty,
  whisperToDM,
  getWhisperHistory,
  getVisibleMessages,
  createPrivateContext,
  createSharedContext,
  formatWhisperForDisplay
};
