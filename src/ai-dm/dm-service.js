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
const { createCoinPool, scoreTurn, completeScene, calculateTier, formatChapterSummary, formatAdventureSummary, normalizeScores, buildCoinNotification, applyCategoryWeights, buildScoringPrompt } = require('../coin-engine');
const { createInventory, listItems, getEquippedEffects, addItem } = require('../inventory/inventory');
const StoryEngine = require('../story/story-engine');
const ThreatEncounters = require('../story/threat-encounters');
const GameMode = require('../game-mode');
const path = require('path');
const fs = require('fs');
// Image generation — optional, gracefully disabled when no provider configured
let _imageService = null;
function getImageService() {
  if (_imageService === null) {
    try {
      const { createImageService, createErrorRecovery } = require('../image');
      const raw = createImageService({ cacheDir: process.env.IMAGE_CACHE_DIR || 'data/images' });
      if (raw && raw.isEnabled) {
        _imageService = createErrorRecovery(raw, {
          maxRetries: 2,
          baseDelayMs: 1000,
          fallbackToMock: true,
        });
      } else {
        _imageService = raw; // disabled service, no recovery needed
      }
    } catch (err) {
      console.warn('[DM] Image service not available:', err.message);
      _imageService = false; // sentinel: don't retry
    }
  }
  return _imageService || null;
}

/**
 * Track which image URLs have been shown per session to avoid repeats.
 * Key: sessionId, Value: Set of image URLs already displayed.
 */
const _shownImages = new Map();

function _getShownSet(sessionId) {
  if (!_shownImages.has(sessionId)) {
    _shownImages.set(sessionId, new Set());
  }
  return _shownImages.get(sessionId);
}

/**
 * Static image base path — images served from public/assets/images/
 */
const STATIC_IMAGE_DIR = path.join(__dirname, '..', '..', 'public', 'assets', 'images');

/**
 * Get the static image URL for a scene variant, if it exists on disk.
 * Returns URL path like '/assets/images/dracula/scene_00_dread.png' or null.
 */
function getStaticSceneImage(adventureId, sceneId, mood) {
  const filename = `${sceneId}_${mood}.png`;
  const filepath = path.join(STATIC_IMAGE_DIR, adventureId, filename);
  if (fs.existsSync(filepath)) {
    return `/assets/images/${adventureId}/${filename}`;
  }
  return null;
}

/**
 * Get the static portrait URL for an NPC, if it exists on disk.
 */
function getStaticPortrait(adventureId, characterName) {
  const filename = `portrait_${characterName}.png`;
  const filepath = path.join(STATIC_IMAGE_DIR, adventureId, filename);
  if (fs.existsSync(filepath)) {
    return `/assets/images/${adventureId}/${filename}`;
  }
  return null;
}

/**
 * Map a scene name to its scene ID (e.g. "Castle Dracula" → "scene_04").
 * Uses the ADVENTURE_SCENES from pregenerate-images or falls back to fuzzy match.
 */
function mapSceneNameToSceneId(adventureId, sceneName) {
  try {
    const { ADVENTURE_SCENES } = require('../../scripts/pregenerate-images');
    const adventure = ADVENTURE_SCENES[adventureId];
    if (!adventure) return null;
    const name = (sceneName || '').toLowerCase();
    for (const scene of adventure.scenes) {
      if (scene.location.toLowerCase() === name || name.includes(scene.location.toLowerCase())) {
        return scene.id;
      }
    }
    // Fuzzy: check if any scene location words match
    for (const scene of adventure.scenes) {
      const words = scene.location.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      if (words.some(w => name.includes(w))) return scene.id;
    }
  } catch {}
  return null;
}

const SCENE_MOODS = ['dread', 'mystery', 'eerie'];

/**
 * Optionally generate an illustration for a new scene.
 * Checks static assets first (free, instant), then falls back to AI generation.
 * Avoids repeating images already shown in this session.
 * Returns image URL or null.
 */
async function generateSceneImage(adventureId, sceneName, sceneDescription, sessionId) {
  const shown = _getShownSet(sessionId);

  // --- PRIORITY 1: Static assets (free, instant, no API call) ---
  const sceneId = mapSceneNameToSceneId(adventureId, sceneName);
  if (sceneId) {
    // Shuffle moods for variety
    const shuffled = [...SCENE_MOODS].sort(() => Math.random() - 0.5);

    for (const mood of shuffled) {
      const staticUrl = getStaticSceneImage(adventureId, sceneId, mood);
      if (staticUrl && !shown.has(staticUrl)) {
        shown.add(staticUrl);
        console.log('[DM] Using static scene image (' + mood + ') for: ' + sceneName);
        return staticUrl;
      }
    }

    // All static variants shown — reuse one anyway
    for (const mood of shuffled) {
      const staticUrl = getStaticSceneImage(adventureId, sceneId, mood);
      if (staticUrl) {
        console.log('[DM] Reusing static scene image (' + mood + ') for: ' + sceneName);
        return staticUrl;
      }
    }
  }

  // --- PRIORITY 2: AI generation fallback (for scenes without static assets) ---
  const svc = getImageService();
  if (!svc || !svc.isEnabled) return null;

  try {
    const { buildScenePrompt } = require('../image');
    const prompt = buildScenePrompt({
      description: sceneDescription,
      location: sceneName,
      mood: 'dread',
    });
    const cached = svc.getCachedImage(prompt);
    if (cached && !shown.has(cached)) {
      shown.add(cached);
      return cached;
    }
    const url = await svc.generateRaw(prompt, { sessionId });
    if (url) shown.add(url);
    return url;
  } catch (err) {
    console.warn('[DM] Scene image generation failed:', err.message);
    return null;
  }
}

/**
 * Generate a combat scene illustration when combat triggers.
 * Returns image URL or null. Non-blocking — failures are logged and ignored.
 *
 * @param {object} combatCtx - Combat context
 * @param {string} combatCtx.attacker - Attacker description
 * @param {string} combatCtx.defender - Defender description
 * @param {string} [combatCtx.weapon] - Weapon or attack type
 * @param {string} [combatCtx.location] - Where the fight takes place
 * @param {string} [combatCtx.outcome] - "hit", "miss", "critical", "kill"
 * @param {string} [combatCtx.description] - Combat narration
 * @param {string} [combatCtx.sessionId] - Session ID for rate limiting
 * @returns {Promise<string|null>} Image URL or null
 */
async function generateCombatImage(combatCtx) {
  const svc = getImageService();
  if (!svc || !svc.isEnabled) return null;

  try {
    const { buildCombatPrompt, buildDetailedCombatPrompt } = require('../image');
    // Use detailed combat prompt if we have enough context, otherwise basic
    const hasRichContext = combatCtx.environment || combatCtx.stakes;
    const prompt = hasRichContext
      ? buildDetailedCombatPrompt(combatCtx)
      : buildCombatPrompt(combatCtx);
    const url = await svc.generateRaw(prompt, { sessionId: combatCtx.sessionId });
    if (url) console.log('[DM] Generated combat image for: ' + (combatCtx.attacker || 'combat scene'));
    return url;
  } catch (err) {
    console.warn('[DM] Combat image generation failed:', err.message);
    return null;
  }
}

/**
 * Generate an NPC portrait when players encounter NPCs.
 * Returns image URL or null. Non-blocking — failures are logged and ignored.
 *
 * @param {object} npcCtx - NPC context
 * @param {string} npcCtx.name - NPC name
 * @param {string} [npcCtx.role] - Role or occupation (innkeeper, guard, merchant…)
 * @param {string} [npcCtx.race] - Race or species
 * @param {string} [npcCtx.appearance] - Appearance description
 * @param {string} [npcCtx.personality] - Personality hint (gruff, mysterious, warm…)
 * @param {string} [npcCtx.mood] - Mood tag
 * @param {string} [npcCtx.sessionId] - Session ID for rate limiting
 * @returns {Promise<string|null>} Image URL or null
 */
async function generateNPCPortrait(npcCtx) {
  const svc = getImageService();
  if (!svc || !svc.isEnabled) return null;

  try {
    const { buildNPCPortraitPrompt } = require('../image');
    const prompt = buildNPCPortraitPrompt(npcCtx);
    const url = await svc.generateRaw(prompt, { sessionId: npcCtx.sessionId });
    if (url) console.log('[DM] Generated NPC portrait for: ' + (npcCtx.name || 'unknown NPC'));
    return url;
  } catch (err) {
    console.warn('[DM] NPC portrait generation failed:', err.message);
    return null;
  }
}

/**
 * Generate an item illustration when players find items.
 * Returns image URL or null. Non-blocking — failures are logged and ignored.
 *
 * @param {object} itemCtx - Item context
 * @param {string} itemCtx.name - Item name
 * @param {string} [itemCtx.type] - Item type (weapon, potion, scroll, artifact…)
 * @param {string} [itemCtx.description] - Description of the item
 * @param {string} [itemCtx.material] - Material (silver, iron, crystal, leather…)
 * @param {string} [itemCtx.enchantment] - Magical property or enchantment hint
 * @param {string} [itemCtx.mood] - Mood tag
 * @param {string} [itemCtx.sessionId] - Session ID for rate limiting
 * @returns {Promise<string|null>} Image URL or null
 */
async function generateItemImage(itemCtx) {
  const svc = getImageService();
  if (!svc || !svc.isEnabled) return null;

  try {
    const { buildItemPrompt } = require('../image');
    const prompt = buildItemPrompt(itemCtx);
    const url = await svc.generateRaw(prompt, { sessionId: itemCtx.sessionId });
    if (url) console.log('[DM] Generated item image for: ' + (itemCtx.name || 'unknown item'));
    return url;
  } catch (err) {
    console.warn('[DM] Item image generation failed:', err.message);
    return null;
  }
}

/**
 * Map a scene name to a template key for the adventure.
 */
function mapSceneNameToKey(adventureId, sceneName) {
  const name = (sceneName || '').toLowerCase();
  const mappings = {
    dracula: {
      'inn': 'inn', 'golden krone': 'inn',
      'coach': 'coach', 'ride': 'coach',
      'castle': 'castle', 'dracula': 'castle',
      'crypt': 'crypt', 'tomb': 'crypt',
      'london': 'london', 'carfax': 'london',
      'graveyard': 'graveyard', 'cemetery': 'graveyard',
    },
    frankenstein: {
      'geneva': 'geneva', 'home': 'geneva',
      'university': 'university', 'ingolstadt': 'university',
      'laboratory': 'laboratory', 'lab': 'laboratory',
      'forest': 'forest', 'awakening': 'forest',
      'cottage': 'cottage', 'de lacey': 'cottage',
      'arctic': 'arctic', 'ice': 'arctic',
    },
    holmes: {
      'baker': 'baker_street', '221b': 'baker_street',
      'moor': 'moor', 'dartmoor': 'moor',
      'hall': 'hall', 'baskerville': 'hall',
      'mire': 'mire', 'grimpen': 'mire',
      'fog': 'london_fog', 'london': 'london_fog',
    },
  };

  const advMappings = mappings[adventureId] || {};
  for (const [keyword, key] of Object.entries(advMappings)) {
    if (name.includes(keyword)) return key;
  }
  return 'default';
}



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
  const openingNarration = nextManifest ? nextManifest.description : null;

  // Optionally generate a scene illustration (non-blocking, best-effort)
  if (openingNarration && nextSceneData) {
    generateSceneImage(game.adventureId, nextSceneData.name, openingNarration, game.sessionId)
      .then(imageUrl => {
        if (imageUrl) {
          game._lastSceneImage = imageUrl;
          console.log('[DM] Scene image ready: ' + imageUrl.slice(0, 80));
        }
      })
      .catch(() => {}); // silently ignore failures
  }

  return openingNarration;
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
  const gameMode = options.gameMode || 'campaign';
  return {
    sessionId: uuidv4(),
    adventureId: options.adventureId || null,
    adventureName: options.adventureName || 'Untitled Adventure',
    gameMode: gameMode,
    contextManager: createContextManager(),
    playerProfile: createPlayerProfile(),
    state: 'character_creation', // 'character_creation', 'playing', 'combat', 'completed'
    turnHistory: [],
    llmProvider: options.llmProvider || null, // injected
    ruleEngine: options.ruleEngine || null,   // injected
    diceService: options.diceService || null, // injected
    coinEngine: options.coinEngine || null,   // injected
    coinPool: null,       // initialized when adventure starts
    sceneScores: [],      // accumulated turn scores for current scene
    inventory: createInventory(['torch', 'journal']),  // starting items
    sceneState: null, // scene engine state — initialized when first scene starts
    validator: null, // continuity validator — initialized with first scene
    storyPlayerState: null, // StoryEngine player state — initialized for storyline mode
    storyButtonContext: null // tracks which button the player clicked (type + id)
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

  // Initialize coin pool if not yet created and adventure is available
  if (!game.coinPool && adventure && game.sceneState) {
    game.coinPool = createCoinPool({
      adventureId: game.adventureId,
      storyLength: adventure.scenes ? adventure.scenes.length : 10,
      difficulty: adventure.difficulty || 'medium',
      totalScenes: adventure.scenes ? adventure.scenes.length : 10
    });
  }

  // Add player action to context
  addTurn(contextManager, 'user', playerAction);

  // === STORYLINE MODE: StoryEngine deterministic flow ===
  const isStoryline = game.gameMode === 'storyline';

  // Initialize StoryEngine player state if needed (storyline mode only)
  if (isStoryline && !game.storyPlayerState) {
    game.storyPlayerState = StoryEngine.createPlayerState('fighter'); // default class
  }

  // Sync initialFacts.items to inventory (both modes, when scene transitions)
  if (game.sceneState && game.sceneState.initialFacts && game.sceneState.initialFacts.items) {
    for (const itemId of game.sceneState.initialFacts.items) {
      // Check if item is already in inventory (by ID or name match)
      const existing = game.inventory.slots.find(s =>
        s.id === itemId || s.name.toLowerCase() === itemId.toLowerCase()
      );
      if (!existing) {
        try {
          addItem(game.inventory, itemId);
        } catch (e) {
          // Item template not in registry — skip gracefully
          console.log('[DM] Item "' + itemId + '" not in inventory registry, skipping server sync');
        }
      }
    }
  }

  // Storyline mode: run StoryEngine deterministic logic first
  let storyResult = null;
  let atmosphereContext = null;
  if (isStoryline && game.sceneState && game.sceneState.storyMode) {
    const storyMode = game.sceneState.storyMode;
    const manifest = game.sceneState;

    // Detect button type from the player action label
    const actionLower = playerAction.toLowerCase();
    let buttonType = 'explore';
    let buttonId = '';

    // Match against threat encounter buttons
    if (actionLower.includes('fight') || actionLower.includes('defend') || actionLower.includes('run') ||
        actionLower.includes('flee') || actionLower.includes('escape')) {
      buttonType = 'threat';
      if (actionLower.includes('fight') || actionLower.includes('attack')) buttonId = 'threat_fight';
      else if (actionLower.includes('defend') || actionLower.includes('block')) buttonId = 'threat_defend';
      else buttonId = 'threat_run';
    }
    // Match against item buttons
    else if (storyMode.collectibleItem && actionLower.includes(storyMode.collectibleItem.label.toLowerCase())) {
      buttonType = 'item';
      buttonId = 'item_' + storyMode.collectibleItem.id;
    }
    // Match against ability buttons
    else if (actionLower.includes('spell') || actionLower.includes('ability') || actionLower.includes('channel') ||
             actionLower.includes('turn undead') || actionLower.includes('shadow step') || actionLower.includes('arcane')) {
      buttonType = 'ability';
      // Extract ability ID from context
      const abilities = StoryEngine.getAvailableAbilities(game.storyPlayerState);
      for (const ab of abilities) {
        if (actionLower.includes(ab.name.toLowerCase()) || actionLower.includes(ab.id.replace(/_/g, ' '))) {
          buttonId = 'ability_' + ab.id;
          break;
        }
      }
      if (!buttonId) buttonId = 'ability_unknown';
    }
    // Match against bad choice
    else if (storyMode.badChoice && actionLower.includes(storyMode.badChoice.label.toLowerCase())) {
      buttonType = 'bad_choice';
      buttonId = 'bad_' + storyMode.badChoice.id;
    }
    // Default: explore — match against content items
    else {
      buttonType = 'explore';
      const content = manifest.contentItems || [];
      for (const item of content) {
        if (item.label && actionLower.includes(item.label.toLowerCase().substring(0, 8))) {
          buttonId = item.id;
          break;
        }
      }
      if (!buttonId) buttonId = 'explore_generic';
    }

    // Get threat definition if this is a threat scene
    let threatDef = null;
    if (buttonType === 'threat' && storyMode.threat) {
      const sceneIndex = adventure.scenes ? adventure.scenes.findIndex(s => s.id === game.sceneState.sceneId) : 0;
      threatDef = ThreatEncounters.getThreatForScene(sceneIndex, game.adventureId);
    }

    // Run StoryEngine deterministic processing
    storyResult = StoryEngine.processButtonAction(
      buttonId, buttonType, manifest, game.storyPlayerState, threatDef
    );

    // Sync StoryEngine item gains to server inventory
    if (storyResult.itemGained) {
      try {
        addItem(game.inventory, storyResult.itemGained);
      } catch (e) {
        console.log('[DM] Could not add story item "' + storyResult.itemGained + '" to server inventory');
      }
    }

    // Build constrained atmosphere context for the LLM
    atmosphereContext = StoryEngine.buildAtmosphereContext(
      game.storyPlayerState, manifest, storyResult
    );

    // Store button context for reference
    game.storyButtonContext = { type: buttonType, id: buttonId, result: storyResult };
  }

  // Build full context for LLM, including scene state
  let systemPrompt;
  if (isStoryline && storyResult && atmosphereContext) {
    // Storyline mode: constrained LLM — only atmospheric flavor
    const actionNarrative = storyResult.narrative || '';
    const isThreat = storyResult.type === 'threat';
    const isDramatic = isThreat || storyResult.type === 'bad_choice';

    // Build seed narrative for threats
    let seedText = '';
    if (isThreat && threatDef) {
      const reaction = storyResult.reaction || 'fight';
      const baseOutcome = threatDef.outcomes[reaction];
      if (baseOutcome && baseOutcome.text) {
        seedText = `\nSEED NARRATIVE: "${baseOutcome.text}"`;
      }
    }

    // Variable atmosphere length based on drama
    let sentenceGuide;
    if (isDramatic) {
      sentenceGuide = '3-4 vivid sentences. Reference the player\'s class, any items used, and the outcome.';
    } else if (storyResult.type === 'item') {
      sentenceGuide = '1 sentence confirming the item collection.';
    } else {
      sentenceGuide = '1-2 atmospheric sentences. Do not over-explain.';
    }

    systemPrompt = `You are the narrator for a gothic horror RPG in Storyline Mode.
The deterministic game engine has already resolved the outcome. Your ONLY job is to add atmospheric flavor.

PLAYER ACTION: "${playerAction}"
DETERMINISTIC RESULT: ${actionNarrative}${seedText}
${atmosphereContext.inventory.length > 0 ? 'PLAYER INVENTORY: ' + atmosphereContext.inventory.join(', ') : ''}
${atmosphereContext.flags && Object.keys(atmosphereContext.flags).length > 0 ? 'FLAGS: ' + JSON.stringify(atmosphereContext.flags) : ''}
HP STATE: ${atmosphereContext.hpState} (${atmosphereContext.hp}/${atmosphereContext.maxHp})

TASK: Expand the deterministic result into ${sentenceGuide}
PRESERVE the core imagery of the seed narrative (if provided). Add sensory detail — sound, temperature, texture.
Do NOT change the outcome, damage, or coin values.
Do NOT generate buttons, suggestions, or new content.
Do NOT add meta-commentary or compliments.
Stay in the world. Be concise.`;
  } else {
    // Campaign/Digital DM mode: full LLM prompt (unchanged)
    systemPrompt = buildAdventureSystemPrompt({
      adventureName: game.adventureName,
      adventureDescription: '',
      tone: adventure ? adventure.tone : 'gothic, suspenseful, mysterious',
      sceneContext: game.sceneState ? SceneEngine.buildSceneContext(game.sceneState) : ''
    });

    // Append inventory context so the DM knows what the player is carrying
    if (game.inventory) {
      const items = listItems(game.inventory);
      if (items.length > 0) {
        const itemList = items.map(i => `${i.name}${i.consumable ? ` (${i.uses})` : ''}`).join(', ');
        const equipped = Object.entries(game.inventory.equipment)
          .filter(([_, v]) => v !== null)
          .map(([slot, v]) => `${slot}: ${v.name}`)
          .join(', ');
        systemPrompt += `\n\nPLAYER INVENTORY: ${itemList}`;
        if (equipped) systemPrompt += `\nEQUIPPED: ${equipped}`;
        systemPrompt += `\nNarrate item usage naturally when the player references their gear. If they find a new item, mention it clearly.`;
      }
    }
  }

  let fullSystemPrompt = systemPrompt;
  const messages = buildContext(contextManager, fullSystemPrompt);

  // Call LLM for narrative response
  let dmResponse;
  if (isStoryline && storyResult) {
    // Storyline mode: LLM adds atmosphere to deterministic result
    // Use a simpler message set — just the system prompt with the action
    const storyMessages = [
      { role: 'system', content: fullSystemPrompt },
      { role: 'user', content: playerAction }
    ];
    try {
      const llmAtmosphere = await llmProvider(storyMessages);
      // Combine: deterministic narrative + LLM atmosphere
      dmResponse = storyResult.narrative + '\n\n' + llmAtmosphere;
    } catch (err) {
      // LLM failed — use deterministic narrative only (fallback)
      console.warn('[StoryEngine] LLM atmosphere failed, using deterministic narrative only:', err.message);
      dmResponse = storyResult.narrative;
    }
  } else {
    // Campaign/Digital DM mode: full LLM response (unchanged)
    dmResponse = await llmProvider(messages);
  }

  // Validate the DM response against established facts
  if (game.validator) {
    const validation = game.validator.validate(dmResponse, playerAction);
    if (!validation.valid) {
      console.warn('[ContinuityValidator] VIOLATIONS:', validation.violations);
      // Enforce: regenerate if location jump detected (up to 2 retries)
      const hasLocationJump = validation.violations.some(v => v.startsWith('LOCATION_JUMP'));
      if (hasLocationJump && game.llmProvider) {
        for (let retry = 0; retry < 2; retry++) {
          const correctionPrompt = fullSystemPrompt + `\n\nIMPORTANT: Your previous response referenced a location the player is NOT in. You are in "${game.sceneState ? game.sceneState.sceneName : 'this scene'}". Do NOT mention any location that is not the current scene. Stay in the current location.`;
          const correctionMessages = buildContext(contextManager, correctionPrompt);
          const retryResponse = await llmProvider(correctionMessages);
          const retryValidation = game.validator.validate(retryResponse, playerAction);
          if (retryValidation.valid || !retryValidation.violations.some(v => v.startsWith('LOCATION_JUMP'))) {
            dmResponse = retryResponse;
            console.log('[ContinuityValidator] Retry ' + (retry + 1) + ' succeeded');
            break;
          }
          console.warn('[ContinuityValidator] Retry ' + (retry + 1) + ' still has violations:', retryValidation.violations);
        }
      }
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

  // Save AI-suggested actions before generateSceneActions overwrites them
  const aiSuggestedActions = parsed.suggestedActions;

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
      // Complete the current scene in the coin engine before transitioning
      if (game.coinPool && game.sceneScores.length > 0) {
        const currentSceneIndex = game.coinPool.scenePools.findIndex(sp => !sp.earned);
        if (currentSceneIndex >= 0) {
          const sceneResult = completeScene(currentSceneIndex, game.sceneScores, game.coinPool);
          if (sceneResult) {
            parsed.chapterSummary = formatChapterSummary(sceneResult);
          }
        }
        game.sceneScores = []; // reset for next scene
      }

      parsed.narrative = transitionNarration;
      const openingNarration = transitionScene(game, parsed.narrative);
      if (openingNarration) {
        parsed.narrative += '\n\n' + openingNarration;
      }
      // Regenerate suggested actions from the new scene state
      if (game.sceneState) {
        parsed.suggestedActions = generateSceneActions(game.sceneState, aiSuggestedActions);
      }
      parsed.sceneTransition = {
        sceneId: game.sceneState ? game.sceneState.sceneId : getNextSceneId(game),
        fromScene: adventure.scenes.findIndex(s => s.id === (game.sceneState ? game.sceneState.sceneId : ''))
      };
    }
  }

  // Generate suggested actions from scene engine + AI contextual actions
  if (game.sceneState) {
    parsed.suggestedActions = generateSceneActions(game.sceneState, aiSuggestedActions);
  }

  // Score the player's action for coins — heuristic by default, LLM only when COIN_SCORING_MODE=llm
  let coinScores;
  const useLLMScoring = process.env.COIN_SCORING_MODE === 'llm' && game.llmProvider && game.coinPool;
  if (useLLMScoring) {
    try {
      // Build scene info for the coin engine's full rubric prompt
      const sceneInfo = (game.sceneState && game.coinPool) ? {
        sceneIndex: game.coinPool.scenePools.findIndex(sp => !sp.earned),
        totalScenes: game.coinPool.scenePools ? game.coinPool.scenePools.length : 10,
        difficulty: game.coinPool.difficulty || 'medium',
        adventureId: game.adventureId
      } : null;
      coinScores = await scoreActionWithLLM(game.llmProvider, playerAction, parsed.narrative, sceneInfo);
    } catch (err) {
      console.warn('[CoinEngine] LLM scoring failed, falling back to heuristic:', err.message);
      coinScores = scoreAction(playerAction, parsed.narrative);
    }
  } else {
    coinScores = scoreAction(playerAction, parsed.narrative);
  }

  // Apply bell curve normalization — makes high scores harder to achieve
  coinScores = normalizeScores(coinScores);

  // Wire coin engine: score the turn into the pool
  if (game.coinPool && game.sceneState) {
    const sceneIndex = game.coinPool.scenePools.findIndex(sp => !sp.earned);
    if (sceneIndex >= 0) {
      const turnResult = scoreTurn(game.coinPool, sceneIndex, coinScores);
      game.sceneScores.push(turnResult);

      // Build subtle coin notification for frontend
      const runningTotal = game.sceneScores.reduce((sum, s) => sum + s.turnTotal, 0);
      parsed.coinNotification = buildCoinNotification(turnResult, runningTotal);
    }
  }

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
/**
 * Generate a compact 2-4 word short label for mobile buttons.
 * Maps common D&D action verbs + extracts the key noun.
 * Falls back to word-boundary truncation if no pattern matches.
 */
function generateShortLabel(label) {
  if (!label || label.length <= 16) return label;

  var lower = label.toLowerCase().trim();

  // Map common verb phrases to short verbs
  var verbPatterns = [
    [/^talk to\s+/i, 'Talk'],
    [/^speak to\s+/i, 'Talk'],
    [/^speak with\s+/i, 'Talk'],
    [/^chat with\s+/i, 'Talk'],
    [/^converse with\s+/i, 'Talk'],
    [/^examine\s+/i, 'Check'],
    [/^examine the\s+/i, 'Check'],
    [/^investigate\s+/i, 'Check'],
    [/^inspect\s+/i, 'Check'],
    [/^look at\s+/i, 'Check'],
    [/^look in\s+/i, 'Check'],
    [/^look behind\s+/i, 'Check'],
    [/^look around\s+/i, 'Search'],
    [/^search the\s+/i, 'Search'],
    [/^search\s+/i, 'Search'],
    [/^pick up\s+/i, 'Grab'],
    [/^pick up the\s+/i, 'Grab'],
    [/^take the\s+/i, 'Grab'],
    [/^take\s+/i, 'Grab'],
    [/^grab the\s+/i, 'Grab'],
    [/^grab\s+/i, 'Grab'],
    [/^approach the\s+/i, 'Approach'],
    [/^approach\s+/i, 'Approach'],
    [/^enter the\s+/i, 'Enter'],
    [/^enter\s+/i, 'Enter'],
    [/^open the\s+/i, 'Open'],
    [/^open\s+/i, 'Open'],
    [/^attack the\s+/i, 'Attack'],
    [/^attack\s+/i, 'Attack'],
    [/^fight the\s+/i, 'Fight'],
    [/^fight\s+/i, 'Fight'],
    [/^flee from\s+/i, 'Flee'],
    [/^flee\s+/i, 'Flee'],
    [/^run from\s+/i, 'Flee'],
    [/^run away\s+/i, 'Flee'],
    [/^escape\s+/i, 'Escape'],
    [/^ask the\s+/i, 'Ask'],
    [/^ask about\s+/i, 'Ask'],
    [/^listen at\s+/i, 'Listen'],
    [/^listen to\s+/i, 'Listen'],
    [/^listen\s+/i, 'Listen'],
    [/^hide behind\s+/i, 'Hide'],
    [/^hide\s+/i, 'Hide'],
    [/^wait for\s+/i, 'Wait'],
    [/^wait\s+/i, 'Wait'],
    [/^go to\s+/i, 'Go to'],
    [/^go to the\s+/i, 'Go to'],
    [/^move to\s+/i, 'Go to'],
    [/^walk to\s+/i, 'Go to'],
    [/^head to\s+/i, 'Go to'],
    [/^head to the\s+/i, 'Go to'],
    [/^use the\s+/i, 'Use'],
    [/^use\s+/i, 'Use'],
    [/^try to\s+/i, 'Try'],
    [/^try the\s+/i, 'Try'],
    [/^attempt to\s+/i, 'Try'],
    [/^climb the\s+/i, 'Climb'],
    [/^climb\s+/i, 'Climb'],
    [/^drink the\s+/i, 'Drink'],
    [/^drink\s+/i, 'Drink'],
    [/^eat the\s+/i, 'Eat'],
    [/^eat\s+/i, 'Eat'],
    [/^read the\s+/i, 'Read'],
    [/^read\s+/i, 'Read'],
    [/^pray at\s+/i, 'Pray'],
    [/^pray\s+/i, 'Pray'],
    [/^pray to\s+/i, 'Pray'],
    [/^get on\s+/i, 'Board'],
    [/^board the\s+/i, 'Board'],
    [/^board\s+/i, 'Board'],
    [/^catch your\s+/i, 'Rest'],
    [/^check your\s+/i, 'Check'],
    [/^press onward\s+/i, 'Onward'],
    [/^continue\s+/i, 'Continue'],
    [/^proceed\s+/i, 'Continue'],
    [/^push forward\s+/i, 'Onward'],
    [/^light the\s+/i, 'Light'],
    [/^light\s+/i, 'Light'],
    [/^close the\s+/i, 'Close'],
    [/^close\s+/i, 'Close'],
    [/^push the\s+/i, 'Push'],
    [/^push\s+/i, 'Push'],
    [/^pull the\s+/i, 'Pull'],
    [/^pull\s+/i, 'Pull'],
  ];

  var verb = null;
  var rest = label;

  for (var p = 0; p < verbPatterns.length; p++) {
    var match = lower.match(verbPatterns[p][0]);
    if (match && match.index === 0) {
      verb = verbPatterns[p][1];
      rest = label.substring(match[0].length).trim();
      break;
    }
  }

  // Extract key noun from rest — strip articles/determiners
  var articles = { 'a': 1, 'an': 1, 'the': 1, 'this': 1, 'that': 1, 'your': 1,
    'my': 1, 'his': 1, 'her': 1, 'its': 1, 'our': 1, 'their': 1, 'some': 1, 'any': 1 };
  var words = rest.split(/\s+/).filter(function(w) { return !articles[w.toLowerCase()]; });

  var noun = '';
  if (words.length > 0) {
    noun = words[0];
    // Include a second word if the first is a short adjective/qualifier
    if (words.length >= 2 && words[0].length <= 5) {
      noun = words[0] + ' ' + words[1];
    }
  }

  if (verb && noun) return verb + ' ' + noun;
  if (verb) return verb;
  if (noun) return noun;

  // Ultimate fallback: first 3 words
  var allWords = label.split(/\s+/);
  return allWords.slice(0, 3).join(' ');
}

function generateSceneActions(sceneState, aiSuggestedActions = []) {
  const actions = [];
  const exitAction = SceneEngine.getExitAction(sceneState);
  const undiscovered = SceneEngine.getUndiscoveredContent(sceneState);

  // Pick all undiscovered content items — no artificial limit
  const contentActions = undiscovered.map(item => ({
    label: item.label,
    shortLabel: generateShortLabel(item.label),
    type: 'exploration'
  }));

  // Get banned location keywords for filtering suggestions
  const bannedLocations = (sceneState.locationKeywords && sceneState.locationKeywords.banned) || [];
  const bannedLower = bannedLocations.map(l => l.toLowerCase());

  // Build a set of significant words from content items for deduplication
  const genericWords = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'your', 'have', 'will', 'into', 'onto', 'back', 'out', 'about', 'through', 'every']);
  const contentWordSets = contentActions.map(a =>
    new Set(a.label.toLowerCase().split(/\s+/).filter(w => w.length > 3 && !genericWords.has(w)))
  );

  // Filter AI suggestions: keep only those that don't significantly overlap with content items
  // and don't reference banned locations
  const contextualActions = (aiSuggestedActions || [])
    .filter(ai => {
      const aiLabel = ai.label.toLowerCase();
      // Filter out suggestions that reference banned locations
      if (bannedLower.some(loc => aiLabel.includes(loc))) return false;
      const aiWords = aiLabel.split(/\s+/).filter(w => w.length > 3 && !genericWords.has(w));
      if (aiWords.length === 0) return false;
      // Count how many significant AI words appear in any content item
      const overlap = aiWords.filter(w =>
        contentWordSets.some(cws => [...cws].some(cw => cw.includes(w) || w.includes(cw)))
      ).length;
      // If more than half the words overlap, it's a duplicate
      return overlap < Math.ceil(aiWords.length / 2);
    })
    .map(ai => ({ label: ai.label, shortLabel: generateShortLabel(ai.label), type: 'contextual' }));

  if (exitAction && exitAction.priority === 1) {
    // Strong/forced pressure — exit goes first
    actions.push({ label: exitAction.label, shortLabel: generateShortLabel(exitAction.label), type: 'exit' });
    actions.push(...contentActions);
    actions.push(...contextualActions);
  } else {
    // Background/gentle — content first, contextual next, exit last
    actions.push(...contentActions);
    actions.push(...contextualActions);
    if (exitAction) {
      actions.push({ label: exitAction.label, shortLabel: generateShortLabel(exitAction.label), type: 'exit' });
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
        if (text) suggestedActions.push({ label: text, shortLabel: generateShortLabel(text), type: 'free' });
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
 * Score a player action using the LLM for nuanced creativity assessment.
 * Falls back to heuristic scoring if LLM returns invalid JSON after retry.
 *
 * Fix history:
 *   - v2: Added code-fence stripping, robust JSON extraction, retry with
 *         explicit JSON-only instruction, and numeric clamping.
 */
async function scoreActionWithLLM(llmProvider, playerAction, narrativeContext, sceneInfo) {
  // Use the coin engine's full rubric when scene info is available, simplified prompt as fallback
  const prompt = sceneInfo
    ? buildScoringPrompt(playerAction, { sceneDescription: narrativeContext }, sceneInfo)
    : buildCoinScoringPrompt(playerAction, narrativeContext);

  /**
   * Extract JSON object from an LLM response that may contain markdown
   * code fences, explanatory text, or trailing garbage.
   */
  function extractJson(text) {
    // Strip markdown code fences (```json ... ``` or ``` ... ```)
    let cleaned = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
    // Try the cleaned text first
    const braceMatch = cleaned.match(/\{[^\0]*\}/);
    if (braceMatch) return braceMatch[0];
    // Fallback: try the original text
    const origMatch = text.match(/\{[^\0]*\}/);
    return origMatch ? origMatch[0] : null;
  }

  /**
   * Clamp a score to 0-10 integer range.
   */
  function clampScore(val) {
    const n = parseInt(val, 10);
    return Math.min(10, Math.max(0, isNaN(n) ? 0 : n));
  }

  /**
   * Parse and validate a coin scoring response.
   * Returns normalized scores or null if unparseable.
   */
  function parseScores(text) {
    const jsonStr = extractJson(text);
    if (!jsonStr) return null;
    try {
      const parsed = JSON.parse(jsonStr);
      // Must have at least one recognized category
      const categories = ['creativity', 'investigation', 'roleplay', 'combat', 'exploration'];
      const hasScores = categories.some(c => parsed[c] !== undefined);
      if (!hasScores) return null;
      return {
        creativity: clampScore(parsed.creativity),
        investigation: clampScore(parsed.investigation),
        roleplay: clampScore(parsed.roleplay),
        combat: clampScore(parsed.combat),
        exploration: clampScore(parsed.exploration),
        reasoning: parsed.reasoning || ''
      };
    } catch {
      return null;
    }
  }

  // --- Attempt 1: standard prompt ---
  const messages = [{ role: 'system', content: prompt + '\n\nRESPOND WITH ONLY A JSON OBJECT. No markdown fences, no explanation before or after.' }];
  const response = await llmProvider(messages);
  const scores1 = parseScores(response);
  if (scores1) return scores1;

  // --- Attempt 2: retry with stronger JSON-only instruction ---
  const retryMessages = [
    { role: 'system', content: 'You must respond with ONLY valid JSON. No text, no code fences, no explanation.\n\n' + prompt },
    { role: 'user', content: `Score this action. Return ONLY JSON like {"creativity":5,"investigation":3,"roleplay":4,"combat":0,"exploration":2,"reasoning":"brief note"}.\n\nAction: "${playerAction}"\nContext: ${typeof narrativeContext === 'string' ? narrativeContext.slice(0, 500) : 'N/A'}` }
  ];
  const retryResponse = await llmProvider(retryMessages);
  const scores2 = parseScores(retryResponse);
  if (scores2) return scores2;

  throw new Error('LLM did not return valid JSON for coin scoring (tried twice)');
}

/**
 * Score a player action for coin rewards (deterministic + heuristic).
 * Full AI scoring happens when the LLM provider is available.
 *
 * Rubric: each category scored 0-10. Keywords map to tiers:
 *   Strong match (3pts): direct, unambiguous keyword hit
 *   Moderate match (2pts): related action verb
 *   Weak match (1pt): indirect or implied
 *   Bonus (+1): detail/length, multi-word sophistication
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

  // ── Creativity heuristics ──────────────────────────────────────
  // Strong: combining items, using tools unconventionally, improvising
  if (/combine|improvis|rig|craft|build|construct/.test(action)) scores.creativity += 3;
  if (/(?:use|apply|throw|pour|mix).*(?:with|on|at|into)/.test(action)) scores.creativity += 3;
  // Moderate: attempting novel actions, experimenting
  if (/try|attempt|experiment|trick|deceiv|distract|disguise/.test(action)) scores.creativity += 2;
  if (/set a trap|create a diversion|barricad|fortif/.test(action)) scores.creativity += 2;
  // Weak: some thought behind it
  if (/careful|clever|carefully|slowly|quietly/.test(action)) scores.creativity += 1;
  if (action.length > 60) scores.creativity += 1; // detailed actions show thought
  if (action.split(' ').length > 10) scores.creativity += 1; // multi-clause actions

  // ── Investigation heuristics ───────────────────────────────────
  // Strong: direct examination, searching, evidence-gathering
  if (/search|examine|inspect|investigate|analy[sz]e|forensic/.test(action)) scores.investigation += 3;
  if (/look (?:at|for|under|behind|inside|through|around)|check/.test(action)) scores.investigation += 3;
  // Moderate: asking, listening, reading
  if (/ask|question|interrogat|listen|eavesdrop|overhear/.test(action)) scores.investigation += 2;
  if (/read|study|decipher|translat|examin/.test(action)) scores.investigation += 2;
  // Weak: general awareness
  if (/observe|watch|notice|scan|survey/.test(action)) scores.investigation += 1;
  if (/follow|track|trace/.test(action)) scores.investigation += 1;

  // ── Combat heuristics ──────────────────────────────────────────
  // Strong: direct attack actions
  if (/attack|strike|slash|thrust|stab|shoot|fire (?:at|upon)/.test(action)) scores.combat += 3;
  if (/cast (?:a )?(?:spell|fireball|magic missile|lightning)/.test(action)) scores.combat += 3;
  // Moderate: defensive or tactical combat
  if (/fight|battle|engage|charge|rush (?:at|toward)/.test(action)) scores.combat += 2;
  if (/dodge|parry|block|deflect|counter|riposte/.test(action)) scores.combat += 2;
  if (/draw (?:my |the )?(?:sword|weapon|blade|axe|bow)/.test(action)) scores.combat += 2;
  // Weak: combat-adjacent
  if (/aim|ready|brace|flank|retreat|advance/.test(action)) scores.combat += 1;

  // ── Exploration heuristics ─────────────────────────────────────
  // Strong: directional movement, entering new areas
  if (/go (?:to|through|into|down|up|inside)|enter|climb|descend/.test(action)) scores.exploration += 3;
  if (/open (?:the )?(?:door|gate|chest|window|trapdoor|hatch)/.test(action)) scores.exploration += 3;
  // Moderate: navigation, physical movement
  if (/walk|run|sneak|creep|crawl|jump|leap|swim/.test(action)) scores.exploration += 2;
  if (/north|south|east|west|upstairs|downstairs|outside|inside/.test(action)) scores.exploration += 2;
  // Weak: environmental awareness
  if (/look (?:around|out|up|down)|map|path|road/.test(action)) scores.exploration += 1;
  if (/push|pull|lift|move|turn (?:the )?(?:key|handle|lever|wheel)/.test(action)) scores.exploration += 1;

  // ── Roleplay heuristics ────────────────────────────────────────
  // Strong: direct speech, character voice
  if (/[""\u201c\u201d].*[""\u201c\u201d]/.test(action)) scores.roleplay += 3; // quoted speech
  if (/i say|i tell|i ask|i whisper|i shout|i exclaim|i declare|i respond/.test(action)) scores.roleplay += 3;
  // Moderate: emotional/thematic engagement
  if (/(?:i feel|i sense|i (?:am|'m) (?:afraid|scared|brave|determined|curious|angry|sad))/.test(action)) scores.roleplay += 2;
  if (/pray|meditat|swear (?:an? )?oath|honor|pledge|vow/.test(action)) scores.roleplay += 2;
  // Weak: first-person narration, staying in character
  if (/^i (?:cautiously|carefully|bravely|hesitantly|reluctantly)/.test(action)) scores.roleplay += 1;
  if (/in character|i roleplay|speaking as/.test(action)) scores.roleplay += 1;

  // ── Contextual bonus from narrative ────────────────────────────
  // If the player's action references something from the DM's narration, reward engagement
  if (context && typeof context === 'string') {
    const ctxWords = context.toLowerCase().split(/\W+/).filter(w => w.length > 4);
    const actionWords = action.split(/\W+/).filter(w => w.length > 4);
    const overlap = actionWords.filter(w => ctxWords.includes(w)).length;
    if (overlap >= 3) scores.investigation += 1; // references scene details
    if (overlap >= 5) scores.creativity += 1; // deeply engaged with scene
  }

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
  scoreActionWithLLM,
  generateSceneActions,
  // Image generation hooks
  generateSceneImage,
  generateCombatImage,
  generateNPCPortrait,
  generateItemImage,
  // Expose for testing
  getImageService,
  mapSceneNameToKey,
};
