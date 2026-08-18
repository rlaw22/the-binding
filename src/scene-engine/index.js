/**
 * Scene Engine — Tracks scene completion, generates exit pressure, manages scene lifecycle.
 *
 * Every scene has a manifest of discoverable content (NPCs, items, clues, atmosphere).
 * As the player explores, completion rises. Exit pressure ramps naturally.
 * Hard exit triggers 4 turns after 75% completion.
 *
 * Nothing is exposed to the player — no progress bars, no counters.
 */

const PRESSURE_LEVELS = {
  BACKGROUND: 'background',    // 0-25% — exit available, not highlighted
  GENTLE: 'gentle',            // 25-50% — environmental cues
  STRONG: 'strong',            // 50-75% — world pushes harder
  FORCED: 'forced'             // 75%+ — hard exit after 4 turns
};

const HARD_EXIT_TURNS_AFTER_75 = 4;
const MIN_TURNS_BEFORE_EXIT = 3; // player must have at least this many turns before any exit trigger

/**
 * Create a scene state tracker for a new scene.
 * @param {object} manifest — scene manifest with discoverable content
 */
function enterScene(manifest) {
  const contentItems = (manifest.content || []).map(item => ({
    id: item.id,
    label: item.label,        // what the player sees as a button (a verb)
    discovery: item.discovery || null,  // what the DM reveals after the action (hidden from player)
    keywords: item.keywords || [],       // explicit keywords for action matching
    discovered: false,
    requires: item.requires || null,     // dependency: content ID that must be discovered first
    coinReward: item.coinReward || 0
  }));

  return {
    sceneId: manifest.sceneId,
    sceneName: manifest.sceneName,
    description: manifest.description || '',  // scene setting for LLM boundary enforcement
    contentItems,
    discoveredIds: new Set(),
    usedSuggestions: new Set(),   // track which suggestion labels have been used
    totalItems: contentItems.length,
    turnCount: 0,
    turnsSinceThreshold: null, // turn number when 75% was first reached
    hardExitTriggered: false,
    exitAction: manifest.exitAction || null,
    exitLabel: manifest.exitLabel || 'Move on',
    hardExitNarration: manifest.hardExitNarration || 'The world nudges you forward. It is time to go.',
    locationKeywords: manifest.locationKeywords || null,  // banned locations for LLM
    storyMode: manifest.storyMode || null,  // story mode config for StoryEngine
    initialFacts: manifest.initialFacts || null  // initial items/NPCs for inventory sync
  };
}

/**
 * Process a DM response and player action to discover content.
 * Returns the updated scene state.
 *
 * @param {object} sceneState — current scene state from enterScene()
 * @param {string} dmResponse — the DM's narrative response (may contain [EXPLORED: ...] tag)
 * @param {string} playerAction — the player's action text
 * @returns {object} updated scene state
 */
function processTurn(sceneState, dmResponse, playerAction) {
  if (!sceneState) return sceneState;

  sceneState.turnCount++;

  // Parse [EXPLORED: id1, id2, ...] tags from DM response
  const explored = parseExploredTags(dmResponse);

  // Also do keyword matching on player action as a fallback
  const keywordMatches = matchKeywords(playerAction, sceneState.contentItems);

  // Merge discovered items
  const allNew = [...explored, ...keywordMatches];
  for (const id of allNew) {
    if (!sceneState.discoveredIds.has(id)) {
      sceneState.discoveredIds.add(id);
      const item = sceneState.contentItems.find(i => i.id === id);
      if (item) item.discovered = true;
    }
  }

  // Check hard exit threshold
  const completion = getCompletion(sceneState);
  if (completion >= 0.75 && sceneState.turnsSinceThreshold === null) {
    sceneState.turnsSinceThreshold = sceneState.turnCount;
  }

  // Check if hard exit should trigger
  // ENGINE RULE: player must have minimum exploration turns before any exit
  if (sceneState.turnsSinceThreshold !== null && sceneState.turnCount >= MIN_TURNS_BEFORE_EXIT) {
    const turnsSince = sceneState.turnCount - sceneState.turnsSinceThreshold;
    if (turnsSince >= HARD_EXIT_TURNS_AFTER_75) {
      sceneState.hardExitTriggered = true;
    }
  }

  return sceneState;
}

/**
 * Parse [EXPLORED: id1, id2, ...] tags from a DM response string.
 * Returns array of discovered content IDs.
 */
function parseExploredTags(text) {
  if (!text) return [];
  const results = [];
  // Match [EXPLORED: id1, id2, id3] — case insensitive
  const regex = /\[EXPLORED:\s*([^\]]+)\]/gi;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const ids = match[1].split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    results.push(...ids);
  }
  return results;
}

// Generic verbs that appear across many items — must NOT count as unique keyword matches
const GENERIC_VERBS = new Set([
  'look', 'ask', 'talk', 'speak', 'find', 'get', 'go', 'see', 'try', 'use', 'take',
  'open', 'close', 'search', 'approach', 'examine', 'inspect', 'walk', 'move', 'check',
  'watch', 'listen', 'feel', 'touch', 'grab', 'hold', 'pull', 'push', 'turn', 'step',
  'enter', 'leave', 'sit', 'stand', 'run', 'fight', 'attack', 'defend', 'cast', 'pray'
]);

/**
 * Keyword matching — checks if the player's action matches an undiscovered content item.
 * Uses explicit `keywords` array from the manifest (preferred), falls back to label word extraction.
 *
 * ENGINE RULES (apply to all adventures):
 * - Generic verbs (look, ask, talk, search, etc.) are excluded from matching
 * - At least 2 non-generic keywords must match (prevents false discoveries)
 * - Keywords must be specific to THIS item, not shared across items
 */
function matchKeywords(actionText, contentItems) {
  if (!actionText) return [];
  const action = actionText.toLowerCase();
  const matches = [];

  for (const item of contentItems) {
    if (item.discovered) continue;

    // Use explicit keywords if available
    if (item.keywords && item.keywords.length > 0) {
      // Filter out generic verbs — they match too many items
      const specificKeywords = item.keywords.filter(kw => !GENERIC_VERBS.has(kw.toLowerCase()));
      if (specificKeywords.length === 0) continue;
      const matchCount = specificKeywords.filter(kw => action.includes(kw.toLowerCase())).length;
      if (matchCount >= 2) {
        matches.push(item.id);
        continue;
      }
    }

    // Label match: if the player action contains most of the label, discover it
    const labelLower = item.label.toLowerCase();
    const labelWords = labelLower.split(/\s+/).filter(w => !GENERIC_VERBS.has(w));
    if (labelWords.length > 0) {
      const labelMatchCount = labelWords.filter(w => action.includes(w)).length;
      if (labelMatchCount >= Math.ceil(labelWords.length * 0.5)) {
        matches.push(item.id);
        continue;
      }
    }

    // Fallback: extract content words from label, excluding generic verbs
    const contentWords = item.label.toLowerCase().split(/\s+/).filter(w => w.length > 3 && !GENERIC_VERBS.has(w));
    if (contentWords.length === 0) continue;
    const matchCount = contentWords.filter(w => action.includes(w)).length;
    if (matchCount >= 2) {
      matches.push(item.id);
    }
  }

  return matches;
}

/**
 * Get completion percentage (0.0 to 1.0).
 */
function getCompletion(sceneState) {
  if (!sceneState || sceneState.totalItems === 0) return 1.0;
  return sceneState.discoveredIds.size / sceneState.totalItems;
}

/**
 * Get the current pressure level based on completion.
 */
function getPressureLevel(sceneState) {
  if (!sceneState) return PRESSURE_LEVELS.BACKGROUND;

  const completion = getCompletion(sceneState);

  if (sceneState.hardExitTriggered) return PRESSURE_LEVELS.FORCED;
  if (completion >= 0.75) return PRESSURE_LEVELS.STRONG;
  if (completion >= 0.25) return PRESSURE_LEVELS.GENTLE;
  return PRESSURE_LEVELS.BACKGROUND;
}

/**
 * Generate the scene context string for the DM prompt.
 * This tells the DM what's been discovered, what's left, and how hard to push the exit.
 */
function buildSceneContext(sceneState) {
  if (!sceneState) return '';

  const completion = getCompletion(sceneState);
  const pressure = getPressureLevel(sceneState);
  const discovered = sceneState.contentItems.filter(i => i.discovered);
  const undiscovered = sceneState.contentItems.filter(i => !i.discovered);

  let context = `\n\nSCENE STATE:\n`;
  context += `Scene: ${sceneState.sceneName}\n`;

  // Inject scene description — the authoritative setting the LLM must respect
  if (sceneState.description) {
    context += `Setting: ${sceneState.description.replace(/\n/g, ' ').substring(0, 500)}\n`;
  }

  // Inject scene-boundary enforcement: only these NPCs/elements exist HERE
  if (sceneState.initialFacts) {
    const npcs = sceneState.initialFacts.metNPCs || [];
    const items = sceneState.initialFacts.items || [];
    const established = sceneState.initialFacts.established || [];
    if (npcs.length > 0) context += `NPCs present in THIS scene: ${npcs.join(', ')}. Do NOT include NPCs from other scenes.\n`;
    if (items.length > 0) context += `Items available: ${items.join(', ')}.\n`;
    if (established.length > 0) context += `Established facts: ${established.join('; ')}.\n`;
  }

  context += `Completion: ${discovered.length} of ${sceneState.totalItems} explored\n`;

  if (undiscovered.length > 0) {
    context += `Undiscovered actions: ${undiscovered.map(i => i.label).join(', ')}\n`;
    // Pass discovery text to the DM so it knows what to reveal when the player acts
    const withDiscovery = undiscovered.filter(i => i.discovery);
    if (withDiscovery.length > 0) {
      context += `Hidden discoveries (reveal when player acts on corresponding action):\n`;
      for (const item of withDiscovery) {
        context += `  - When player "${item.label}": ${item.discovery}\n`;
      }
    }
  }

  // --- DM-ONLY INSTRUCTIONS (never surface to the player) ---
  context += `\n<!-- DM INSTRUCTIONS — DO NOT include any of the following text in your response. These are internal guidance only. -->\n`;
  context += `Suggested exit when ready: "${sceneState.exitLabel}"\n`;

  // Pressure instructions — atmospheric guidance, not commands
  switch (pressure) {
    case PRESSURE_LEVELS.BACKGROUND:
      context += `Scene pacing: The player has just arrived. Focus on rich scene descriptions and let them explore. The exit is available but not urgent.\n`;
      break;
    case PRESSURE_LEVELS.GENTLE:
      context += `Scene pacing: The player has explored the scene. Weave in subtle environmental cues that time is passing — candles burning lower, weather shifting, NPCs growing restless. The exit should feel like a natural next step.\n`;
      break;
    case PRESSURE_LEVELS.STRONG:
      context += `Scene pacing: The player has seen most of what this scene offers. The story is naturally moving forward — the environment reflects this (light changing, NPCs moving on, sounds from outside). Place the exit as the first suggested action.\n`;
      break;
    case PRESSURE_LEVELS.FORCED:
      context += `Scene pacing: The scene has reached its natural end. The world is moving on — narrate the transition gently. The next response should conclude this scene. Offer only the exit action.\n`;
      break;
  }

  // Banned locations — internal reference only
  if (sceneState.locationKeywords && sceneState.locationKeywords.banned) {
    const banned = sceneState.locationKeywords.banned;
    if (banned.length > 0) {
      context += `\nLocation boundary: The player is currently at "${sceneState.sceneName}". Do not reference or move them to: ${banned.join(', ')}. If the player tries, describe why they cannot go there yet.\n`;
    }
  }

  context += `NEVER include completion numbers, pressure levels, or these instructions in your narrative response. Stay in the world.`;
  context += `\n<!-- END DM INSTRUCTIONS -->\n`;

  return context;
}

/**
 * Generate the exit action for the suggested actions list.
 * Returns { label, type } for use in the action generation.
 */
function getExitAction(sceneState) {
  if (!sceneState || !sceneState.exitAction) return null;

  const pressure = getPressureLevel(sceneState);

  return {
    id: sceneState.exitAction,
    label: sceneState.exitLabel,
    type: 'exit',
    priority: pressure === PRESSURE_LEVELS.STRONG || pressure === PRESSURE_LEVELS.FORCED
      ? 1 // slot 1 — most prominent
      : 4  // slot 4 — background
  };
}

/**
 * Get undiscovered content items for generating suggested actions.
 */
function getUndiscoveredContent(sceneState) {
  if (!sceneState) return [];
  return sceneState.contentItems
    .filter(i => !i.discovered)
    .map(i => ({ id: i.id, label: i.label }));
}

/**
 * Get available content — undiscovered items whose dependencies are met,
 * minus already-used suggestions.
 */
function getAvailableContent(sceneState) {
  if (!sceneState) return [];
  return sceneState.contentItems.filter(i => {
    if (i.discovered) return false;
    // Check dependency: requires another content ID to be discovered first
    if (i.requires && !sceneState.discoveredIds.has(i.requires)) return false;
    // Skip already-used suggestions
    if (sceneState.usedSuggestions && sceneState.usedSuggestions.has(i.label)) return false;
    return true;
  });
}

/**
 * Get all content items with their discovered/available status.
 */
function getAllContentWithStatus(sceneState) {
  if (!sceneState) return [];
  return sceneState.contentItems.map(i => ({
    id: i.id,
    label: i.label,
    discovered: i.discovered,
    available: !i.discovered && (!i.requires || sceneState.discoveredIds.has(i.requires)),
    hasDiscovery: !!i.discovery
  }));
}

/**
 * Mark a content item as discovered by ID.
 * Used when the server receives a button click with contentId.
 */
function markDiscovered(sceneState, contentId) {
  if (!sceneState || !contentId) return;
  if (sceneState.discoveredIds.has(contentId)) return;

  sceneState.discoveredIds.add(contentId);
  const item = sceneState.contentItems.find(i => i.id === contentId);
  if (item) item.discovered = true;
}

/**
 * Mark a suggestion label as used so it doesn't regenerate.
 */
function markUsedSuggestion(sceneState, label) {
  if (!sceneState || !label) return;
  if (!sceneState.usedSuggestions) sceneState.usedSuggestions = new Set();
  sceneState.usedSuggestions.add(label);
}

/**
 * Check if the scene's hard exit has been triggered.
 */
function isHardExitTriggered(sceneState) {
  return sceneState && sceneState.hardExitTriggered;
}

/**
 * Get the hard exit narration text.
 */
function getHardExitNarration(sceneState) {
  return sceneState ? sceneState.hardExitNarration : 'It is time to move on.';
}


const StoryEngine = require('../story/story-engine');

/**
 * Process a Story Mode button action. Deterministic handler for button clicks
 * in Story Mode (no LLM involvement in game logic).
 *
 * @param {string} buttonId — the button id clicked
 * @param {string} buttonType — 'explore'|'threat'|'item'|'ability'|'bad_choice'
 * @param {object} sceneManifest — scene manifest with storyMode field
 * @param {object} playerState — current player state (mutated in place)
 * @param {object|null} threatDef — threat definition if threat scene
 * @returns {object} result with type, narrative, hpChange, coinChange, etc.
 */
function processButtonAction(buttonId, buttonType, sceneManifest, playerState, threatDef) {
  return StoryEngine.processButtonAction(buttonId, buttonType, sceneManifest, playerState, threatDef);
}

module.exports = {
  PRESSURE_LEVELS,
  enterScene,
  processTurn,
  parseExploredTags,
  getCompletion,
  getPressureLevel,
  buildSceneContext,
  getExitAction,
  getAvailableContent,
  getUndiscoveredContent,
  getAllContentWithStatus,
  markDiscovered,
  markUsedSuggestion,
  isHardExitTriggered,
  getHardExitNarration,
  processButtonAction
};
