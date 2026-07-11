/**
 * Message Router — All AI DM output flows through here.
 * 
 * Phase 1: every message targets the single player (array length 1)
 * Phase 2: router broadcasts shared messages, whispers private ones
 * 
 * DmMessage types:
 *   narration    — scene description, NPC dialogue, story text
 *   dice_result  — dice roll result with animation reference
 *   combat_update — HP changes, initiative, damage
 *   coin_reward  — coins earned notification (hybrid: real-time subtle)
 *   whisper      — private message to specific player(s)
 *   chapter_summary — end-of-chapter coin breakdown
 *   tier_award   — tier badge earned
 *   system       — system messages (player joined, session saved, etc.)
 *   suggested_actions — the AI-generated action suggestions + free text prompt
 */

const MessageTypes = {
  NARRATION: 'narration',
  DICE_RESULT: 'dice_result',
  COMBAT_UPDATE: 'combat_update',
  COIN_REWARD: 'coin_reward',
  WHISPER: 'whisper',
  CHAPTER_SUMMARY: 'chapter_summary',
  TIER_AWARD: 'tier_award',
  SYSTEM: 'system',
  SUGGESTED_ACTIONS: 'suggested_actions',
  ERROR: 'error'
};

/**
 * Create a DmMessage.
 * @param {string} type — MessageTypes enum
 * @param {string} content — the text content
 * @param {object} options — targets, metadata, etc.
 */
function createMessage(type, content, options = {}) {
  return {
    id: generateId(),
    type,
    content,
    timestamp: Date.now(),

    // Targets — array of player IDs. Phase 1: always single element.
    // Empty array = broadcast to all players in session
    targets: options.targets || [],

    // Metadata
    metadata: {
      sceneImageUrl: options.sceneImageUrl || null,
      diceRoll: options.diceRoll || null,        // { dieType, result, modifier, total }
      coinAmount: options.coinAmount || null,     // { amount, category, reason }
      actions: options.actions || null,           // the suggested actions
      combatData: options.combatData || null,     // { attacker, defender, damage, etc. }
      tierData: options.tierData || null,         // { tier, adventure, score }
      priority: options.priority || 'normal',     // 'low', 'normal', 'high'
      ephemeral: options.ephemeral || false       // if true, don't persist in history
    }
  };
}

/**
 * Route a message to the appropriate players.
 * Phase 1: direct delivery to single player.
 * Phase 2: filters based on targets and message type.
 */
function routeMessage(session, message, deliveryCallback) {
  if (!session || !session.players.length) return [];

  const deliveredTo = [];

  if (message.type === MessageTypes.WHISPER) {
    // Whisper goes ONLY to specified targets
    for (const target of message.targets) {
      const player = session.players.find(p => p.id === target);
      if (player && player.connected) {
        deliveryCallback(player.id, message);
        deliveredTo.push(player.id);
      }
    }
  } else if (message.targets.length > 0) {
    // Specific targets
    for (const target of message.targets) {
      const player = session.players.find(p => p.id === target);
      if (player && player.connected) {
        deliveryCallback(player.id, message);
        deliveredTo.push(player.id);
      }
    }
  } else {
    // Broadcast to all connected players
    for (const player of session.players) {
      if (player.connected) {
        deliveryCallback(player.id, message);
        deliveredTo.push(player.id);
      }
    }
  }

  return deliveredTo;
}

/**
 * Create a narration message (scene description, NPC dialogue).
 */
function narration(content, options = {}) {
  return createMessage(MessageTypes.NARRATION, content, options);
}

/**
 * Create a dice result message.
 */
function diceResult(dieType, result, modifier, total, options = {}) {
  return createMessage(MessageTypes.DICE_RESULT,
    `Rolled ${dieType}: ${result}${modifier >= 0 ? '+' : ''}${modifier} = ${total}`,
    { ...options, diceRoll: { dieType, result, modifier, total } }
  );
}

/**
 * Create a combat update message.
 */
function combatUpdate(content, combatData, options = {}) {
  return createMessage(MessageTypes.COMBAT_UPDATE, content, {
    ...options, combatData
  });
}

/**
 * Create a coin reward message (hybrid: real-time subtle notification).
 */
function coinReward(amount, category, reason, options = {}) {
  return createMessage(MessageTypes.COIN_REWARD,
    `+${amount} coins earned`,
    { ...options, coinAmount: { amount, category, reason }, priority: 'low' }
  );
}

/**
 * Create a chapter summary message (end-of-chapter coin breakdown).
 */
function chapterSummary(content, summaryData, options = {}) {
  return createMessage(MessageTypes.CHAPTER_SUMMARY, content, options);
}

/**
 * Create a tier award message.
 */
function tierAward(tier, adventureName, score, options = {}) {
  return createMessage(MessageTypes.TIER_AWARD,
    `Tier earned: ${tier.toUpperCase()}`,
    { ...options, tierData: { tier, adventure: adventureName, score } }
  );
}

/**
 * Create a system message.
 */
function system(content, options = {}) {
  return createMessage(MessageTypes.SYSTEM, content, { ...options, ephemeral: true });
}

/**
 * Create a suggested actions message (the suggested actions + free text prompt).
 */
function suggestedActions(actions, prompt, options = {}) {
  return createMessage(MessageTypes.SUGGESTED_ACTIONS, prompt, {
    ...options,
    actions: actions.map((a, i) => ({
      id: i + 1,
      label: a.label,
      description: a.description || null,
      type: a.type || 'free'   // 'combat', 'skill_check', 'social', 'investigation', 'free'
    }))
  });
}

/**
 * Create a whisper (private) message.
 */
function whisper(content, targetPlayerId, options = {}) {
  return createMessage(MessageTypes.WHISPER, content, {
    ...options,
    targets: [targetPlayerId]
  });
}

// Simple ID generator for messages
function generateId() {
  return 'msg_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
}

module.exports = {
  MessageTypes,
  createMessage,
  routeMessage,
  narration,
  diceResult,
  combatUpdate,
  coinReward,
  chapterSummary,
  tierAward,
  system,
  suggestedActions,
  whisper
};
