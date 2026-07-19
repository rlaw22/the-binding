/**
 * Turn Manager — Phase 2B
 *
 * Manages turn order, initiative, and action phases for multiplayer campaigns.
 * Supports both initiative-based (combat) and narrative-based (exploration) modes.
 */

const TURN_PHASES = ['action', 'bonus_action', 'movement', 'reaction', 'free'];

const TURN_MODES = {
  INITIATIVE: 'initiative',   // Combat — strict dexterity order
  NARRATIVE: 'narrative',     // Exploration/social — DM calls on players
  HYBRID: 'hybrid'            // Auto-switches based on context
};

/**
 * Create a new turn manager state.
 */
function createTurnManager(players = [], mode = TURN_MODES.NARRATIVE) {
  return {
    mode,
    originalMode: mode,
    turnOrder: [],
    currentIndex: 0,
    round: 0,
    turnPhase: 'free',
    turnTimer: null,
    turnTimeout: 120, // seconds per turn (0 = no limit)
    history: [],
    paused: false,
    afkThreshold: 3, // consecutive missed turns before auto-skip
    afkCounts: {}
  };
}

/**
 * Roll initiative for all participants and set turn order.
 */
function rollInitiative(turnMgr, participants) {
  const rolls = participants.map(p => {
    const dexMod = Math.floor(((p.dex || p.dexterity || 10) - 10) / 2);
    const roll = Math.floor(Math.random() * 20) + 1;
    return {
      id: p.id,
      name: p.name || p.id,
      initiative: roll + dexMod,
      roll,
      dexMod,
      isPlayer: p.isPlayer !== false
    };
  });

  // Sort by initiative (desc), then dex mod (desc), then roll (desc)
  rolls.sort((a, b) =>
    b.initiative - a.initiative || b.dexMod - a.dexMod || b.roll - a.roll
  );

  turnMgr.turnOrder = rolls;
  turnMgr.currentIndex = 0;
  turnMgr.round = 1;
  turnMgr.mode = TURN_MODES.INITIATIVE;
  turnMgr.turnPhase = 'action';

  turnMgr.history.push({
    type: 'initiative_rolled',
    order: rolls.map(r => ({ name: r.name, initiative: r.initiative })),
    round: 1,
    timestamp: Date.now()
  });

  return rolls;
}

/**
 * Set narrative turn order (DM assigns who's up).
 */
function setNarrativeOrder(turnMgr, playerIds) {
  turnMgr.turnOrder = playerIds.map((id, i) => ({
    id,
    name: id,
    initiative: playerIds.length - i,
    isPlayer: true
  }));
  turnMgr.currentIndex = 0;
  turnMgr.round = 1;
  turnMgr.mode = TURN_MODES.NARRATIVE;
  turnMgr.turnPhase = 'free';
  return turnMgr.turnOrder;
}

/**
 * Get the current player whose turn it is.
 */
function getCurrentPlayer(turnMgr) {
  if (turnMgr.turnOrder.length === 0) return null;
  if (turnMgr.paused) return null;
  return turnMgr.turnOrder[turnMgr.currentIndex] || null;
}

/**
 * Advance to the next turn.
 */
function advanceTurn(turnMgr) {
  if (turnMgr.turnOrder.length === 0) return null;
  if (turnMgr.paused) return null;

  const prev = turnMgr.turnOrder[turnMgr.currentIndex];

  // Reset AFK count for the player who just acted
  if (prev && turnMgr.afkCounts[prev.id]) {
    turnMgr.afkCounts[prev.id] = 0;
  }

  turnMgr.currentIndex++;

  // Wrap around — new round
  if (turnMgr.currentIndex >= turnMgr.turnOrder.length) {
    turnMgr.currentIndex = 0;
    turnMgr.round++;
    turnMgr.history.push({
      type: 'new_round',
      round: turnMgr.round,
      timestamp: Date.now()
    });
  }

  turnMgr.turnPhase = 'action';

  const next = turnMgr.turnOrder[turnMgr.currentIndex];
  turnMgr.history.push({
    type: 'turn_advanced',
    from: prev?.name || null,
    to: next?.name || null,
    round: turnMgr.round,
    timestamp: Date.now()
  });

  return next;
}

/**
 * Check if it's a specific player's turn.
 */
function isPlayerTurn(turnMgr, playerId) {
  const current = getCurrentPlayer(turnMgr);
  return current && current.id === playerId;
}

/**
 * Force advance past an AFK player.
 */
function forceAdvance(turnMgr) {
  const current = getCurrentPlayer(turnMgr);
  if (!current) return null;

  turnMgr.afkCounts[current.id] = (turnMgr.afkCounts[current.id] || 0) + 1;

  turnMgr.history.push({
    type: 'force_advance',
    player: current.name,
    reason: 'afk',
    timestamp: Date.now()
  });

  return advanceTurn(turnMgr);
}

/**
 * Set the current turn phase.
 */
function setTurnPhase(turnMgr, phase) {
  if (!TURN_PHASES.includes(phase)) {
    throw new Error(`Invalid turn phase: ${phase}. Must be one of: ${TURN_PHASES.join(', ')}`);
  }
  turnMgr.turnPhase = phase;
  return phase;
}

/**
 * Switch turn mode (e.g., narrative → initiative when combat starts).
 */
function switchMode(turnMgr, newMode, participants) {
  const prevMode = turnMgr.mode;

  if (newMode === TURN_MODES.INITIATIVE && participants) {
    rollInitiative(turnMgr, participants);
  } else if (newMode === TURN_MODES.NARRATIVE) {
    turnMgr.mode = TURN_MODES.NARRATIVE;
    turnMgr.turnPhase = 'free';
  }

  turnMgr.history.push({
    type: 'mode_switch',
    from: prevMode,
    to: newMode,
    timestamp: Date.now()
  });

  return turnMgr.mode;
}

/**
 * Pause/unpause turns (e.g., during a cutscene).
 */
function pauseTurns(turnMgr) {
  turnMgr.paused = true;
  return { paused: true };
}

function unpauseTurns(turnMgr) {
  turnMgr.paused = false;
  return { paused: false };
}

/**
 * Remove a player from turn order (e.g., they left or their character died).
 */
function removeParticipant(turnMgr, playerId) {
  const idx = turnMgr.turnOrder.findIndex(p => p.id === playerId);
  if (idx === -1) return false;

  turnMgr.turnOrder.splice(idx, 1);

  // Adjust current index if needed
  if (idx < turnMgr.currentIndex) {
    turnMgr.currentIndex--;
  } else if (idx === turnMgr.currentIndex && turnMgr.currentIndex >= turnMgr.turnOrder.length) {
    turnMgr.currentIndex = 0;
  }

  return true;
}

/**
 * Add a participant mid-combat (e.g., reinforcements).
 */
function addParticipant(turnMgr, participant, position = 'end') {
  const entry = {
    id: participant.id,
    name: participant.name || participant.id,
    initiative: participant.initiative || 0,
    isPlayer: participant.isPlayer !== false
  };

  if (position === 'end') {
    turnMgr.turnOrder.push(entry);
  } else if (position === 'next') {
    turnMgr.turnOrder.splice(turnMgr.currentIndex + 1, 0, entry);
  } else if (typeof position === 'number') {
    turnMgr.turnOrder.splice(position, 0, entry);
  }

  return entry;
}

/**
 * Get a summary of the current turn state for display.
 */
function getTurnSummary(turnMgr) {
  const current = getCurrentPlayer(turnMgr);
  return {
    mode: turnMgr.mode,
    round: turnMgr.round,
    current: current ? current.name : 'None',
    phase: turnMgr.turnPhase,
    paused: turnMgr.paused,
    order: turnMgr.turnOrder.map(p => ({
      id: p.id,
      name: p.name,
      initiative: p.initiative,
      isCurrent: current && p.id === current.id
    }))
  };
}

module.exports = {
  TURN_PHASES,
  TURN_MODES,
  createTurnManager,
  rollInitiative,
  setNarrativeOrder,
  getCurrentPlayer,
  advanceTurn,
  isPlayerTurn,
  forceAdvance,
  setTurnPhase,
  switchMode,
  pauseTurns,
  unpauseTurns,
  removeParticipant,
  addParticipant,
  getTurnSummary
};
