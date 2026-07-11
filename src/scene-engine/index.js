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
    discovered: false
  }));

  return {
    sceneId: manifest.sceneId,
    sceneName: manifest.sceneName,
    contentItems,
    discoveredIds: new Set(),
    totalItems: contentItems.length,
    turnCount: 0,
    turnsSinceThreshold: null, // turn number when 75% was first reached
    hardExitTriggered: false,
    exitAction: manifest.exitAction || null,
    exitLabel: manifest.exitLabel || 'Move on',
    hardExitNarration: manifest.hardExitNarration || 'The world nudges you forward. It is time to go.'
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
  if (sceneState.turnsSinceThreshold !== null) {
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

/**
 * Keyword matching — checks if the player's action matches an undiscovered content item.
 * Uses explicit `keywords` array from the manifest (preferred), falls back to label word extraction.
 */
function matchKeywords(actionText, contentItems) {
  if (!actionText) return [];
  const action = actionText.toLowerCase();
  const matches = [];

  for (const item of contentItems) {
    if (item.discovered) continue;

    // Use explicit keywords if available
    if (item.keywords && item.keywords.length > 0) {
      const matchCount = item.keywords.filter(kw => action.includes(kw.toLowerCase())).length;
      if (matchCount >= 1) {
        matches.push(item.id);
        continue;
      }
    }

    // Fallback: extract content words from label
    const labelWords = item.label.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const matchCount = labelWords.filter(w => action.includes(w)).length;
    if (matchCount >= Math.min(2, labelWords.length)) {
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

  context += `Exit action: "${sceneState.exitLabel}"\n`;

  // Pressure instructions
  switch (pressure) {
    case PRESSURE_LEVELS.BACKGROUND:
      context += `Exit pressure: BACKGROUND — The player has just arrived. Focus on rich scene descriptions and let them explore. Include the exit action as one of the suggested actions but don't highlight it.\n`;
      break;
    case PRESSURE_LEVELS.GENTLE:
      context += `Exit pressure: GENTLE — The player has explored some content. Weave in environmental cues that time is passing (candles burning, weather changing, NPCs getting restless). Keep suggesting scene content but make the exit feel natural.\n`;
      break;
    case PRESSURE_LEVELS.STRONG:
      context += `Exit pressure: STRONG — The player has seen most of what this scene offers. Push the exit harder: narrate NPCs urging them on, environmental changes suggesting it's time to leave. Move the exit action to the first suggested action slot.\n`;
      break;
    case PRESSURE_LEVELS.FORCED:
      context += `Exit pressure: FORCED — The scene must end now. Narrate the world forcing the transition: doors closing, characters insisting, the environment becoming hostile. The next response should transition to the next scene. Do NOT offer more scene content.\n`;
      break;
  }

  context += `NEVER tell the player about completion numbers or pressure levels. Keep it narrative.`;

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

module.exports = {
  PRESSURE_LEVELS,
  enterScene,
  processTurn,
  parseExploredTags,
  getCompletion,
  getPressureLevel,
  buildSceneContext,
  getExitAction,
  getUndiscoveredContent,
  isHardExitTriggered,
  getHardExitNarration
};
