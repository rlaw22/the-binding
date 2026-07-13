/**
 * DM Service — The brain of The Binding.
 * 
 * Orchestrates: player action → rule engine (if needed) → LLM → narrative response + suggested actions.
 * 
 * Phase 1: single-player, Adventure Mode
 * Phase 2: multi-player, Campaign Mode (same service, different session config)
 */

const { v4: uuidv4 } = require('uuid');
const { createContextManager, addTurn, setCharacterSheet, buildContext, updateScene, addKeyDecision, getStats } = require('./context-manager');
const { buildAdventureSystemPrompt, CHARACTER_CREATION_PROMPT, buildCoinScoringPrompt } = require('./prompts');
const MessageRouter = require('../session/message-router');
const SceneEngine = require('../scene-engine');
const { createValidator } = require('../scene-engine/continuity-validator');
const { getAdventure, getAdventureHelpers } = require('../adventure');

// Player profile tracking for adaptive replayability

/**
 * Get the active adventure object from a game.
 */
function resolveAdventure(game) {
  return getAdventure(game.adventureId) || getAdventure('dracula');
}

/**
 * Get the helpers (getScene, getDMGuidance, getAdventureOutline) for a game's adventure.
 */
function resolveHelpers(game) {
  return getAdventureHelpers(game.adventureId) || getAdventureHelpers('dracula');
}

/**
 * Transition to the next scene in the adventure.
 * Loads the new manifest, initializes scene state, updates validator and context.
 * Returns the opening narration for the new scene, or null if no next scene.
 */
function transitionScene(game, narration) {
  const adventure = resolveAdventure(game);
  const helpers = resolveHelpers(game);
  const nextSceneId = getNextSceneId(game);
  if (!nextSceneId) return null;

  const nextSceneData = adventure.scenes.find(s => s.id === nextSceneId);
  const nextManifest = adventure.sceneManifests[nextSceneId];

  if (nextManifest) {
    // Full manifest available — initialize scene engine
    game.sceneState = SceneEngine.enterScene(nextManifest);
    if (game.validator) {
      game.validator.transitionTo(nextManifest, nextManifest.description || '');
    }
  } else if (nextSceneData) {
    // Scene exists in adventure graph but has no manifest yet — minimal state
    game.sceneState = SceneEngine.enterScene({
      sceneId: nextSceneId,
      sceneName: nextSceneData.name,
      content: [],
      exitAction: null,
      exitLabel: 'Continue',
      hardExitNarration: 'The story pushes you forward.'
    });
    if (game.validator) {
      game.validator.transitionTo({ sceneName: nextSceneData.name, sceneId: nextSceneId }, '');
    }
  }

  // Update warm context so the LLM knows what scene we're in
  if (nextSceneData) {
    updateScene(game.contextManager, nextSceneData.name, []);
  }

  // Return the opening narration for the new scene
  return nextManifest ? nextManifest.description : null;
}

/**
 * Check if the player's action matches the scene's exit action.
 * Uses keyword matching similar to the scene engine's discovery matching.
 *
 * FIX: The first specific word of the exit label is the ACTION VERB
 * (e.g. "Board", "Follow", "Step"). The player must include that verb
 * to trigger an exit — otherwise generic nouns like "Castle Dracula"
 * would false-match actions like "Ask about Castle Dracula."
 */
function isExitAction(sceneState, playerAction) {
  if (!sceneState || !sceneState.exitLabel) return false;
  const action = (playerAction || '').toLowerCase();
  const exitWords = sceneState.exitLabel.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const genericVerbs = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'your', 'have', 'will', 'into', 'onto']);
  const specific = exitWords.filter(w => !genericVerbs.has(w));
  if (specific.length === 0) return false;

  // The first specific word is the action verb — it MUST be present
  const actionVerb = specific[0];
  if (!action.includes(actionVerb)) return false;

  // Require the verb + at least 1 more word from the exit label
  const matched = specific.filter(w => action.includes(w)).length;
  return matched >= Math.min(2, specific.length);
}
function createPlayerProfile() {
  return {
    combatAffinity: 0.5,
    diplomacyAffinity: 0.5,
    investigationAffinity: 0.5,
    creativityScore: 0.5,
    riskTolerance: 0.5,
    compassionIndex: 0.5,
    totalActions: 0,
    tags: []
  };
}

function updatePlayerProfile(profile, action, scores) {
  profile.totalActions++;
  // Weighted moving average
  const w = 0.1;
  if (scores.combat > 0) profile.combatAffinity = profile.combatAffinity * (1 - w) + (scores.combat / 10) * w;
  if (scores.investigation > 0) profile.investigationAffinity = profile.investigationAffinity * (1 - w) + (scores.investigation / 10) * w;
  if (scores.creativity > 0) profile.creativityScore = profile.creativityScore * (1 - w) + (scores.creativity / 10) * w;
  if (scores.roleplay > 0) profile.diplomacyAffinity = profile.diplomacyAffinity * (1 - w) + (scores.roleplay / 10) * w;
  // Update tags
  if (profile.totalActions >= 5) {
    profile.tags = [];
    if (profile.combatAffinity > 0.6) profile.tags.push('combatant');
    if (profile.investigationAffinity > 0.6) profile.tags.push('investigator');
    if (profile.creativityScore > 0.6) profile.tags.push('creative');
    if (profile.diplomacyAffinity > 0.6) profile.tags.push('diplomat');
    if (profile.riskTolerance > 0.7) profile.tags.push('risk-taker');
  }
  return profile;
}

/**
 * Create a new game session with DM service initialized.
 */
function createGame(options) {
  return {
    sessionId: uuidv4(),
    adventureId: options.adventureId || null,
    adventureName: options.adventureName || 'Untitled Adventure',
    contextManager: createContextManager(),
    playerProfile: createPlayerProfile(),
    state: 'character_creation', // 'character_creation', 'playing', 'combat', 'completed'
    turnHistory: [],
    llmProvider: options.llmProvider || null, // injected
    ruleEngine: options.ruleEngine || null,   // injected
    diceService: options.diceService || null, // injected
    coinEngine: options.coinEngine || null,   // injected
    sceneState: null, // scene engine state — initialized when first scene starts
    validator: null // continuity validator — initialized with first scene
  };
}

/**
 * Process a player action and generate the DM's response.
 * This is the main game loop entry point.
 */
async function processAction(game, playerAction, character) {
  const { contextManager, llmProvider } = game;
  const adventure = resolveAdventure(game);
  const helpers = resolveHelpers(game);

  // Initialize scene state and validator if needed
  if (!game.sceneState && adventure) {
    const startSceneId = adventure.startScene || 'scene_00';
    const manifest = adventure.sceneManifests[startSceneId];
    if (manifest) {
      game.sceneState = SceneEngine.enterScene(manifest);
      game.validator = createValidator(manifest, manifest.description || null);
      // Set warm context so the LLM knows what scene we're in
      updateScene(game.contextManager, manifest.sceneName, []);
    }
  }

  // Add player action to context
  addTurn(contextManager, 'user', playerAction);

  // Build full context for LLM, including scene state
  const systemPrompt = buildAdventureSystemPrompt({
    adventureName: game.adventureName,
    adventureDescription: '',
    tone: adventure ? adventure.tone : 'gothic, suspenseful, mysterious',
    sceneContext: game.sceneState ? SceneEngine.buildSceneContext(game.sceneState) : ''
  });
  const messages = buildContext(contextManager, systemPrompt);

  // Call LLM for narrative response
  const dmResponse = await llmProvider(messages);

  // Validate the DM response against established facts
  if (game.validator) {
    const validation = game.validator.validate(dmResponse, playerAction);
    if (!validation.valid) {
      console.warn('[ContinuityValidator] VIOLATIONS:', validation.violations);
      // In mock mode, we log violations. With a real LLM, we'd regenerate.
    }
    if (validation.warnings.length > 0) {
      console.warn('[ContinuityValidator] WARNINGS:', validation.warnings);
    }
  }

  // Process scene engine — discover content from DM response
  if (game.sceneState) {
    game.sceneState = SceneEngine.processTurn(game.sceneState, dmResponse, playerAction);
  }

  // Strip [EXPLORED: ...] tags from the player-facing narrative
  const cleanResponse = dmResponse.replace(/\[EXPLORED:[^\]]*\]/gi, '').trim();

  // Add DM response to context (with tags for context, clean for display)
  addTurn(contextManager, 'assistant', dmResponse);

  // Parse response for game mechanics
  const parsed = parseDMResponse(cleanResponse);

  // Check for scene transition: explicit exit action OR hard exit triggered
  if (game.sceneState) {
    let shouldTransition = false;
    let transitionNarration = '';

    // Case 1: Player explicitly chose the exit action
    if (isExitAction(game.sceneState, playerAction)) {
      shouldTransition = true;
      // Use the DM's response as the transition narration (it already narrated the departure)
      transitionNarration = parsed.narrative;
    }

    // Case 2: Hard exit triggered by the scene engine (too many turns at high completion)
    if (SceneEngine.isHardExitTriggered(game.sceneState)) {
      shouldTransition = true;
      const hardExitNarration = SceneEngine.getHardExitNarration(game.sceneState);
      transitionNarration = parsed.narrative + '\n\n' + hardExitNarration;
    }

    if (shouldTransition) {
      parsed.narrative = transitionNarration;
      const openingNarration = transitionScene(game, parsed.narrative);
      if (openingNarration) {
        parsed.narrative += '\n\n' + openingNarration;
      }
      // Regenerate suggested actions from the new scene state
      if (game.sceneState) {
        parsed.suggestedActions = generateSceneActions(game.sceneState);
      }
      parsed.sceneTransition = {
        sceneId: game.sceneState ? game.sceneState.sceneId : getNextSceneId(game),
        fromScene: adventure.scenes.findIndex(s => s.id === (game.sceneState ? game.sceneState.sceneId : ''))
      };
    }
  }

  // Generate suggested actions from scene engine
  if (game.sceneState) {
    parsed.suggestedActions = generateSceneActions(game.sceneState);
  }

  // Score the player's action for coins
  const coinScores = scoreAction(playerAction, parsed.narrative);
  game.playerProfile = updatePlayerProfile(game.playerProfile, playerAction, coinScores);

  // Track in history
  game.turnHistory.push({
    turn: game.turnHistory.length + 1,
    playerAction,
    dmResponse: parsed.narrative,
    suggestedActions: parsed.suggestedActions,
    coinScores,
    rulesCalls: parsed.rulesCalls,
    sceneTransition: parsed.sceneTransition,
    timestamp: Date.now()
  });

  return {
    narrative: parsed.narrative,
    suggestedActions: parsed.suggestedActions,
    rulesCalls: parsed.rulesCalls,
    sceneTransition: parsed.sceneTransition,
    coinScores,
    playerProfile: game.playerProfile,
    turnNumber: game.turnHistory.length,
    contextStats: getStats(contextManager)
  };
}

/**
 * Get the next scene ID in the adventure sequence.
 */
function getNextSceneId(game) {
  if (!game.sceneState) return null;
  const adventure = resolveAdventure(game);
  if (!adventure) return null;
  const currentSceneIndex = adventure.scenes.findIndex(s => s.id === game.sceneState.sceneId);
  if (currentSceneIndex >= 0 && currentSceneIndex < adventure.scenes.length - 1) {
    return adventure.scenes[currentSceneIndex + 1].id;
  }
  return null;
}

/**
 * Generate suggested actions from the scene engine.
 * 3 actions from undiscovered content + 1 exit action.
 * Exit position depends on pressure level.
 */
function generateSceneActions(sceneState) {
  const actions = [];
  const exitAction = SceneEngine.getExitAction(sceneState);
  const undiscovered = SceneEngine.getUndiscoveredContent(sceneState);

  // Pick all undiscovered content items — no artificial limit
  const contentActions = undiscovered.map(item => ({
    label: item.label,
    type: 'exploration'
  }));

  if (exitAction && exitAction.priority === 1) {
    // Strong/forced pressure — exit goes first
    actions.push({ label: exitAction.label, type: 'exit' });
    actions.push(...contentActions);
  } else {
    // Background/gentle — content first, exit last
    actions.push(...contentActions);
    if (exitAction) {
      actions.push({ label: exitAction.label, type: 'exit' });
    }
  }

  // Return all available actions — no filler, no artificial limit
  return actions;
}

/**
 * Parse DM response to extract narrative, actions, rules calls, scene transitions.
 */
function parseDMResponse(response) {
  let narrative = response;
  const suggestedActions = [];
  const rulesCalls = [];
  let sceneTransition = null;

  // Extract suggested actions
  const actionsMatch = response.match(/SUGGESTED ACTIONS?[\s\S]*?(?=\n\n|$)/i);
  if (actionsMatch) {
    const actionBlock = actionsMatch[0];
    const actionLines = actionBlock.match(/\d+\.\s+(.+)/g);
    if (actionLines) {
      for (const line of actionLines) {
        const text = line.replace(/^\d+\.\s+/, '').trim();
        if (text) suggestedActions.push({ label: text, type: 'free' });
      }
    }
    narrative = narrative.replace(actionsMatch[0], '').replace(/---+/g, '').trim();
  }

  // Extract rules calls
  const rollMatches = response.matchAll(/\[ROLL:\s*(\w+),\s*(\w+),\s*(\w+)\s*(\d+)\]/g);
  for (const match of rollMatches) {
    rulesCalls.push({ type: match[1], ability: match[2], dc: parseInt(match[4]) });
    narrative = narrative.replace(match[0], '');
  }

  // Extract combat calls
  const combatMatch = response.match(/\[COMBAT:\s*(\w+)\]/g);
  if (combatMatch) {
    for (const match of combatMatch) {
      const action = match.match(/\[COMBAT:\s*(\w+)\]/)[1];
      rulesCalls.push({ type: 'combat', action });
      narrative = narrative.replace(match, '');
    }
  }

  // Extract scene transition
  const sceneMatch = response.match(/\[SCENE:\s*(\w+),\s*"([^"]+)"\]/);
  if (sceneMatch) {
    sceneTransition = { sceneId: sceneMatch[1], description: sceneMatch[2] };
    narrative = narrative.replace(sceneMatch[0], '');
  }

  // Clean up narrative
  narrative = narrative.replace(/\n{3,}/g, '\n\n').trim();

  return { narrative, suggestedActions, rulesCalls, sceneTransition };
}

/**
 * Score a player action for coin rewards (deterministic + heuristic).
 * Full AI scoring happens when the LLM provider is available.
 */
function scoreAction(playerAction, context) {
  const action = playerAction.toLowerCase();
  const scores = {
    creativity: 0,
    investigation: 0,
    roleplay: 0,
    combat: 0,
    exploration: 0
  };

  // Creativity heuristics
  if (action.includes('combine') || action.includes('use') && action.includes('with')) scores.creativity += 3;
  if (action.includes('try') || action.includes('attempt')) scores.creativity += 1;
  if (action.length > 50) scores.creativity += 1; // detailed actions show thought

  // Investigation heuristics
  if (action.includes('search') || action.includes('examine') || action.includes('look') || action.includes('inspect')) scores.investigation += 3;
  if (action.includes('ask') || action.includes('question') || action.includes('listen')) scores.investigation += 2;
  if (action.includes('read') || action.includes('study')) scores.investigation += 2;

  // Combat heuristics
  if (action.includes('attack') || action.includes('strike') || action.includes('cast') || action.includes('fight')) scores.combat += 2;
  if (action.includes('dodge') || action.includes('parry') || action.includes('block')) scores.combat += 1;

  // Exploration heuristics
  if (action.includes('open') || action.includes('enter') || action.includes('climb') || action.includes('go')) scores.exploration += 2;
  if (action.includes('north') || action.includes('south') || action.includes('east') || action.includes('west')) scores.exploration += 1;

  // Roleplay heuristics
  if (action.includes('"') || action.includes("'")) scores.roleplay += 2; // quoted speech
  if (action.includes('i say') || action.includes('i tell') || action.includes('i ask')) scores.roleplay += 2;

  // Cap at 10
  for (const key in scores) scores[key] = Math.min(scores[key], 10);

  return scores;
}

/**
 * Handle the character creation flow.
 */
async function processCharacterCreation(game, playerInput, currentStep) {
  const { contextManager, llmProvider } = game;

  addTurn(contextManager, 'user', playerInput);

  const messages = buildContext(contextManager, CHARACTER_CREATION_PROMPT);
  const response = await llmProvider(messages);

  addTurn(contextManager, 'assistant', response);

  return {
    narrative: response,
    isComplete: currentStep >= 4, // 4 steps of character creation
    step: currentStep + 1
  };
}

module.exports = {
  createGame,
  processAction,
  processCharacterCreation,
  createPlayerProfile,
  updatePlayerProfile,
  parseDMResponse,
  scoreAction,
  generateSceneActions
};
