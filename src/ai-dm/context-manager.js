/**
 * Context Manager — Tiered context for AI DM conversations.
 * 
 * Manages the LLM context window across long adventures (50+ hours).
 * Four tiers:
 *   HOT     — last 5-10 exchanges (immediate conversation)
 *   WARM    — current scene summary + recent events
 *   COLD    — adventure summary, key decisions, important NPCs
 *   REFERENCE — rules, character sheets, scene graph structure
 * 
 * This keeps the LLM focused without losing long-term memory.
 */

const MAX_HOT_TURNS = 10;       // Last N exchanges kept verbatim
const MAX_WARM_CHARS = 2000;    // Current scene summary cap
const MAX_COLD_CHARS = 4000;    // Adventure summary cap

/**
 * Create a new context manager for a session.
 */
function createContextManager() {
  return {
    // Hot: recent conversation turns (verbatim)
    hot: [],

    // Warm: current scene summary + recent events
    warm: {
      sceneSummary: '',
      recentEvents: [],
      npcMoods: {}
    },

    // Cold: adventure-level summary
    cold: {
      adventureSummary: '',
      keyDecisions: [],
      importantNPCs: [],
      questsCompleted: [],
      questsActive: []
    },

    // Reference: static data (rules, character sheet, scene graph)
    reference: {
      characterSheet: null,
      rulesSummary: '',
      adventureOutline: '',
      currentSceneOptions: []
    },

    // Total conversation length tracker
    totalTurns: 0
  };
}

/**
 * Add a new turn to the hot context.
 * Automatically summarizes old hot turns into warm when limit exceeded.
 */
function addTurn(contextManager, role, content) {
  contextManager.hot.push({
    role,     // 'user' or 'assistant'
    content,
    timestamp: Date.now()
  });
  contextManager.totalTurns++;

  // If hot buffer exceeds limit, summarize the oldest turn into warm
  while (contextManager.hot.length > MAX_HOT_TURNS) {
    const oldTurn = contextManager.hot.shift();
    contextManager.warm.recentEvents.push(oldTurn.content);

    // Keep recent events bounded
    if (contextManager.warm.recentEvents.length > 20) {
      const removed = contextManager.warm.recentEvents.shift();
      // In Phase 1, we just drop old events
      // Phase 2: could summarize into cold
      contextManager.cold.keyDecisions.push(removed.substring(0, 200));
    }
  }
}

/**
 * Set the character sheet reference.
 */
function setCharacterSheet(contextManager, character) {
  contextManager.reference.characterSheet = character;
}

/**
 * Set the rules summary reference.
 */
function setRulesSummary(contextManager, rules) {
  contextManager.reference.rulesSummary = rules;
}

/**
 * Update the current scene context.
 */
function updateScene(contextManager, sceneSummary, sceneOptions) {
  // Archive old scene summary to cold
  if (contextManager.warm.sceneSummary) {
    contextManager.cold.keyDecisions.push(contextManager.warm.sceneSummary.substring(0, 300));
  }

  contextManager.warm.sceneSummary = sceneSummary;
  contextManager.warm.recentEvents = [];
  contextManager.reference.currentSceneOptions = sceneOptions || [];
}

/**
 * Set the adventure-level context.
 */
function setAdventureContext(contextManager, adventureSummary, outline) {
  contextManager.cold.adventureSummary = adventureSummary;
  contextManager.reference.adventureOutline = outline;
}

/**
 * Add a key decision to cold memory.
 */
function addKeyDecision(contextManager, decision) {
  contextManager.cold.keyDecisions.push(decision);
  // Keep bounded
  if (contextManager.cold.keyDecisions.length > 30) {
    contextManager.cold.keyDecisions.shift();
  }
}

/**
 * Track NPC interaction in warm context.
 */
function updateNPCMood(contextManager, npcId, mood) {
  contextManager.warm.npcMoods[npcId] = mood;
}

/**
 * Build the full context array for the LLM.
 * Returns messages in the format expected by most LLM APIs.
 * Phase 1: returns array of {role, content} objects
 */
function buildContext(contextManager, systemPrompt) {
  const messages = [];

  // System prompt (always first)
  messages.push({
    role: 'system',
    content: systemPrompt
  });

  // Reference context (rules, character, adventure outline)
  const ref = contextManager.reference;
  let referenceBlock = '=== GAME REFERENCE ===\n';
  if (ref.characterSheet) {
    referenceBlock += '\nPLAYER CHARACTER:\n' + formatCharacterSheet(ref.characterSheet) + '\n';
  }
  if (ref.rulesSummary) {
    referenceBlock += '\nRULES:\n' + ref.rulesSummary + '\n';
  }
  if (ref.adventureOutline) {
    referenceBlock += '\nADVENTURE STRUCTURE:\n' + ref.adventureOutline + '\n';
  }
  if (ref.currentSceneOptions.length > 0) {
    referenceBlock += '\nCURRENT SCENE OPTIONS:\n' +
      ref.currentSceneOptions.map((s, i) => `${i + 1}. ${s}`).join('\n') + '\n';
  }
  messages.push({ role: 'system', content: referenceBlock });

  // Cold context (adventure history, key decisions)
  const cold = contextManager.cold;
  let coldBlock = '=== ADVENTURE HISTORY ===\n';
  if (cold.adventureSummary) {
    coldBlock += '\nAdventure Summary: ' + cold.adventureSummary + '\n';
  }
  if (cold.keyDecisions.length > 0) {
    coldBlock += '\nKey Events:\n' + cold.keyDecisions.slice(-15).map(d => '- ' + d).join('\n') + '\n';
  }
  if (cold.questsActive.length > 0) {
    coldBlock += '\nActive Quests: ' + cold.questsActive.join(', ') + '\n';
  }
  if (cold.questsCompleted.length > 0) {
    coldBlock += '\nCompleted: ' + cold.questsCompleted.join(', ') + '\n';
  }
  messages.push({ role: 'system', content: coldBlock });

  // Warm context (current scene, recent events)
  const warm = contextManager.warm;
  let warmBlock = '=== CURRENT STATE ===\n';
  if (warm.sceneSummary) {
    warmBlock += '\nCurrent Scene: ' + warm.sceneSummary + '\n';
  }
  if (Object.keys(warm.npcMoods).length > 0) {
    warmBlock += '\nNPC Moods: ' +
      Object.entries(warm.npcMoods).map(([id, mood]) => `${id}: ${mood}`).join(', ') + '\n';
  }
  if (warm.recentEvents.length > 0) {
    warmBlock += '\nRecent Events:\n' + warm.recentEvents.slice(-5).map(e => '- ' + e).join('\n') + '\n';
  }
  messages.push({ role: 'system', content: warmBlock });

  // Hot context (recent conversation turns)
  for (const turn of contextManager.hot) {
    messages.push({ role: turn.role, content: turn.content });
  }

  return messages;
}

/**
 * Format a character sheet for LLM consumption.
 */
function formatCharacterSheet(character) {
  if (!character) return 'No character data available.';
  let sheet = `Name: ${character.name}\n`;
  sheet += `Race: ${character.race}\n`;
  sheet += `Class: ${character.class}\n`;
  sheet += `Level: ${character.level}\n`;
  sheet += `HP: ${character.hp?.current || '?'}/${character.hp?.max || '?'}\n`;
  if (character.stats) {
    sheet += `Stats: STR ${character.stats.strength || '?'}, DEX ${character.stats.dexterity || '?'}, `;
    sheet += `CON ${character.stats.constitution || '?'}, INT ${character.stats.intelligence || '?'}, `;
    sheet += `WIS ${character.stats.wisdom || '?'}, CHA ${character.stats.charisma || '?'}\n`;
  }
  return sheet;
}

/**
 * Get context stats for debugging.
 */
function getStats(contextManager) {
  return {
    hotTurns: contextManager.hot.length,
    hotCount: contextManager.hot.length,
    totalTurns: contextManager.totalTurns,
    warmEvents: contextManager.warm.recentEvents.length,
    coldDecisions: contextManager.cold.keyDecisions.length,
    activeQuests: contextManager.cold.questsActive.length
  };
}

module.exports = {
  createContextManager,
  addTurn,
  setCharacterSheet,
  setRulesSummary,
  updateScene,
  setAdventureContext,
  addKeyDecision,
  updateNPCMood,
  buildContext,
  getStats
};
