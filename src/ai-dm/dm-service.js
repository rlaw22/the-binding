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
const { getDigitalDMPromptSuffix, getDigitalDMWorldPrompt, isDigitalDM } = require('../campaign/digital-dm');
const MessageRouter = require('../session/message-router');
const SceneEngine = require('../scene-engine');
const { createValidator } = require('../scene-engine/continuity-validator');
const { getAdventure, getAdventureHelpers } = require('../adventure');
const { createCoinPool, scoreTurn, completeScene, calculateTier, formatChapterSummary, formatAdventureSummary, normalizeScores, buildCoinNotification, applyCategoryWeights, buildScoringPrompt } = require('../coin-engine');
const { createInventory, listItems, getEquippedEffects, addItem, normalizeItemId } = require('../inventory/inventory');
const { addStorylineItem, listStorylineItems, normalizeStorylineItemId } = require('../story/storyline-inventory');
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
 * Build a spatial anchor from scene description for storyline mode free-text actions.
 * Extracts spatial constraints so the LLM respects scene boundaries.
 *
 * @param {string} sceneDescription — the full scene description text
 * @param {string} sceneName — the scene name
 * @returns {string} spatial anchor prompt prefix
 */
function buildSpatialAnchor(sceneDescription, sceneName) {
  const desc = (sceneDescription || '').toLowerCase();

  // Detect containment — is the player inside something?
  const indoorKeywords = ['inside', 'interior', 'within', 'enclosed', 'coach', 'carriage',
    'cabin', 'room', 'chamber', 'hall', 'inn', 'tavern', 'dining', 'crypt', 'tunnel', 'cave'];
  const isIndoor = indoorKeywords.some(kw => desc.includes(kw));

  // Detect vehicle/movement
  const vehicleKeywords = ['coach', 'carriage', 'horse', 'riding', 'rattling', 'moving',
    'speed', 'lurching', 'wagon', 'train', 'boat', 'ship'];
  const isInVehicle = vehicleKeywords.some(kw => desc.includes(kw));

  // Detect outdoor
  const outdoorKeywords = ['forest', 'field', 'road', 'path', 'mountain', 'cliff',
    'courtyard', 'graveyard', 'cemetery', 'moor', 'heath'];
  const isOutdoor = outdoorKeywords.some(kw => desc.includes(kw)) && !isIndoor;

  let anchor = `SPATIAL ANCHOR — CRITICAL:\n`;
  anchor += `Current location: "${sceneName}"\n`;

  if (isInVehicle) {
    anchor += `The player is INSIDE A MOVING VEHICLE. They cannot:\n`;
    anchor += `- Touch the ground, search the earth, or interact with anything outside the vehicle\n`;
    anchor += `- Leave the vehicle until it stops\n`;
    anchor += `- Find items on the ground or in the forest\n`;
    anchor += `All actions must occur within the vehicle interior.\n`;
  } else if (isIndoor) {
    anchor += `The player is INDOORS in "${sceneName}". They cannot:\n`;
    anchor += `- Access outdoor areas not connected to this room\n`;
    anchor += `- Interact with items not described in the scene\n`;
  } else if (isOutdoor) {
    anchor += `The player is OUTDOORS in "${sceneName}". They cannot:\n`;
    anchor += `- Enter buildings or structures not described in the scene\n`;
    anchor += `- Interact with items not described in the scene\n`;
  }

  return anchor;
}

/**
 * Strip phantom items from LLM responses in storyline mode.
 * Removes sentences that narrate the player finding, picking up, or acquiring
 * items that don't exist in the manifest, scene description, or player inventory.
 *
 * @param {string} response — the LLM response text
 * @param {object} game — the game state (has sceneState and inventory)
 * @returns {string} cleaned response with phantom items removed
 */
function stripPhantomItems(response, game) {
  if (!response || !game) return response;

  // Build the set of known items: inventory + scene initialFacts + scene description nouns
  const knownItems = new Set();

  // From inventory
  if (game.inventory && game.inventory.slots) {
    for (const slot of game.inventory.slots) {
      if (slot.id) knownItems.add(slot.id.toLowerCase());
      if (slot.name) knownItems.add(slot.name.toLowerCase());
    }
  }

  // From scene initialFacts
  if (game.sceneState && game.sceneState.initialFacts && game.sceneState.initialFacts.items) {
    for (const item of game.sceneState.initialFacts.items) {
      knownItems.add(item.toLowerCase());
    }
  }

  // From scene content items (discoverable things in the scene)
  if (game.sceneState && game.sceneState.contentItems) {
    for (const item of game.sceneState.contentItems) {
      if (item.label) {
        // Extract nouns from labels
        const words = item.label.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        words.forEach(w => knownItems.add(w));
      }
    }
  }

  // Known physical items that are always legitimate
  const alwaysValid = new Set(['torch', 'journal', 'crucifix', 'garlic', 'sword', 'shield',
    'cross', 'rosary', 'letter', 'key', 'lock', 'door', 'candle', 'wine', 'glass',
    'plate', 'food', 'chair', 'table', 'bench', 'fire', 'candlestick']);
  alwaysValid.forEach(i => knownItems.add(i));

  // Phrases that indicate item acquisition — if the item isn't known, strip the sentence
  const acquisitionPatterns = [
    /you find\s+(?:a |an |the )?(.+?)(?:\.|,|$)/gi,
    /you discover\s+(?:a |an |the )?(.+?)(?:\.|,|$)/gi,
    /you pick up\s+(?:a |an |the )?(.+?)(?:\.|,|$)/gi,
    /you take\s+(?:a |an |the )?(.+?)(?:\.|,|$)/gi,
    /you grab\s+(?:a |an |the )?(.+?)(?:\.|,|$)/gi,
    /you notice\s+(?:a |an |the )?(.+?)(?:lying|sitting|resting|hidden)/gi,
    /(?:a |an |the )?small\s+(\w+)\s+(?:lies|rests|sits|catches|glints|gleams)/gi,
    /(?:half-buried|hidden|tucked|concealed).*?(?:find|discover|notice)\s+(?:a |an |the )?(.+?)(?:\.|,|$)/gi,
  ];

  let cleaned = response;
  const sentences = response.match(/[^.!?]+[.!?]+/g) || [response];
  const keptSentences = [];

  for (const sentence of sentences) {
    let isPhantom = false;
    const lower = sentence.toLowerCase();

    // Check if this sentence describes finding/acquiring something
    const isAcquisition = lower.includes('find') || lower.includes('discover') ||
      lower.includes('pick up') || lower.includes('glint of metal') ||
      lower.includes('tarnished') || lower.includes('half-buried');

    if (isAcquisition) {
      // Check if any known item is mentioned in this sentence
      const mentionsKnown = [...knownItems].some(item =>
        item.length > 3 && lower.includes(item)
      );
      if (!mentionsKnown) {
        console.log('[StoryEngine] Stripping phantom item sentence:', sentence.trim().slice(0, 80));
        isPhantom = true;
      }
    }

    if (!isPhantom) {
      keptSentences.push(sentence);
    }
  }

  return keptSentences.join('').trim();
}

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
  // Digital DM mode has no curated adventure
  if (game.gameMode === 'digital_dm') return null;
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
  const initialStoryState = gameMode === 'storyline' ? StoryEngine.createPlayerState(options.classId || 'fighter') : null;
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
    inventory: createInventory([]),  // P0 fix: start empty — items are added narratively during gameplay
    sceneState: null, // scene engine state — initialized when first scene starts
    validator: null, // continuity validator — initialized with first scene
    storyPlayerState: initialStoryState, // Storyline-only inventory/state; never Campaign inventory
    storyButtonContext: null, // tracks which button the player clicked (type + id)
    fullCharacter: null, // full D&D 5e character sheet from CharacterService
  };
}

/**
 * Process a player action and generate the DM's response.
 * This is the main game loop entry point.
 */
async function processAction(game, playerAction, character, actionMeta = {}) {
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
  const isDm = game.gameMode === 'digital_dm';

  // Initialize StoryEngine state only for Storyline mode.
  if (isStoryline && !game.storyPlayerState) {
    game.storyPlayerState = StoryEngine.createPlayerState('fighter');
  }

  // Storyline initial facts belong to the narrative inventory. Campaign/Digital DM
  // continue to use the equipment inventory and its catalog unchanged.
  if (isStoryline && game.sceneState && game.sceneState.initialFacts && game.sceneState.initialFacts.items) {
    for (const itemId of game.sceneState.initialFacts.items) {
      addStorylineItem(game.storyPlayerState, normalizeStorylineItemId(itemId));
    }
  }

  // Storyline mode: run StoryEngine deterministic logic first
  let storyResult = null;
  let atmosphereContext = null;
  let discoveryNarration = null;
  let buttonType = null;
  if (isStoryline && game.sceneState && game.sceneState.storyMode) {
    const storyMode = game.sceneState.storyMode;
    const manifest = game.sceneState;

    // Prefer the stable action ID submitted by the browser. Label matching is
    // retained only as a backward-compatible fallback for older clients/free text.
    const actionLower = playerAction.toLowerCase();
    buttonType = 'explore';
    // Treat browser-supplied action metadata as untrusted input. Older clients
    // and malformed payloads may send an object here; only scalar string IDs
    // are valid stable identities. Invalid metadata must fall back to label
    // matching rather than crashing on String.prototype.startsWith().
    const rawButtonId = actionMeta.actionId || actionMeta.contentId || '';
    let buttonId = typeof rawButtonId === 'string' ? rawButtonId : '';
    if (buttonId && buttonId.startsWith('item_')) buttonType = 'item';
    else if (buttonId && buttonId.startsWith('ability_')) buttonType = 'ability';
    else if (buttonId && buttonId.startsWith('bad_')) buttonType = 'bad_choice';
    else if (buttonId && buttonId.startsWith('filler_')) buttonType = 'filler';
    else if (buttonId && (buttonId === game.sceneState.exitAction || buttonId.startsWith('exit'))) buttonType = 'exit';

    // Match against labels only when no stable action identity was supplied.
    // This preserves compatibility with older clients and free-text actions.
    if (!buttonId && (actionLower.includes('fight') || actionLower.includes('defend') || actionLower.includes('run') ||
        actionLower.includes('flee') || actionLower.includes('escape'))) {
      buttonType = 'threat';
      if (actionLower.includes('fight') || actionLower.includes('attack')) buttonId = 'threat_fight';
      else if (actionLower.includes('defend') || actionLower.includes('block')) buttonId = 'threat_defend';
      else buttonId = 'threat_run';
    }
    // Match against item buttons
    else if (!buttonId && storyMode.collectibleItem && actionLower.includes(storyMode.collectibleItem.label.toLowerCase())) {
      buttonType = 'item';
      buttonId = 'item_' + storyMode.collectibleItem.id;
    }
    // Match against ability buttons
    else if (!buttonId && (actionLower.includes('spell') || actionLower.includes('ability') || actionLower.includes('channel') ||
             actionLower.includes('turn undead') || actionLower.includes('shadow step') || actionLower.includes('arcane'))) {
      buttonType = 'ability';
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
    else if (!buttonId && storyMode.badChoice && actionLower.includes(storyMode.badChoice.label.toLowerCase())) {
      buttonType = 'bad_choice';
      buttonId = 'bad_' + storyMode.badChoice.id;
    }
    // Default: explore — match against content items
    else if (!buttonId) {
      buttonType = 'explore';
      const content = manifest.contentItems || [];
      // First pass: exact label match (case-insensitive)
      for (const item of content) {
        if (item.label && actionLower === item.label.toLowerCase()) {
          buttonId = item.id;
          break;
        }
      }
      // Second pass: best partial match — longest label substring found in the action
      if (!buttonId) {
        let bestMatch = null;
        let bestLength = 0;
        for (const item of content) {
          if (!item.label) continue;
          const labelLower = item.label.toLowerCase();
          // Check if a significant portion of the label appears in the action
          if (actionLower.includes(labelLower.substring(0, 12)) && labelLower.substring(0, 12).length > bestLength) {
            bestMatch = item;
            bestLength = labelLower.substring(0, 12).length;
          }
        }
        if (bestMatch) buttonId = bestMatch.id;
      }
      if (!buttonId) buttonId = 'explore_generic';
    }

    // Extract discovery narration from the manifest content item (if matched)
    if (buttonType === 'explore' && buttonId !== 'explore_generic') {
      const contentItems = manifest.contentItems || [];
      const matchedItem = contentItems.find(i => i.id === buttonId);
      if (matchedItem && matchedItem.discovery) {
        discoveryNarration = matchedItem.discovery;
      }
    }

    // P0 fix: explicitly mark content item as discovered when button matches.
    // Previously relied on unreliable [EXPLORED:] tags from LLM or keyword matching —
    // neither was guaranteed to fire, causing content items to repeat endlessly.
    if (buttonType === 'explore' && buttonId !== 'explore_generic' && game.sceneState) {
      SceneEngine.markDiscovered(game.sceneState, buttonId);
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

    // StoryEngine owns Storyline item awards. Do not mirror them into the
    // Campaign equipment inventory; the dedicated endpoint reads story state.

    // Build constrained atmosphere context for the LLM
    atmosphereContext = StoryEngine.buildAtmosphereContext(
      game.storyPlayerState, manifest, storyResult
    );

    // Store button context for reference
    game.storyButtonContext = { type: buttonType, id: buttonId, result: storyResult };

    // P0 fix: track AI-suggested action labels to prevent them repeating across turns.
    // Previously, the same AI suggestion (e.g. "Ask the innkeeper about Castle Dracula")
    // would reappear every turn because usedSuggestions was never populated from AI actions.
    if (game.sceneState && playerAction) {
      SceneEngine.markUsedSuggestion(game.sceneState, playerAction.toLowerCase());
    }
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
${discoveryNarration ? 'DISCOVERY TEXT (you MUST use this exact text, adapted minimally for tone): ' + discoveryNarration : ''}
${atmosphereContext.inventory.length > 0 ? 'PLAYER INVENTORY: ' + atmosphereContext.inventory.join(', ') : ''}
${atmosphereContext.flags && Object.keys(atmosphereContext.flags).length > 0 ? 'FLAGS: ' + JSON.stringify(atmosphereContext.flags) : ''}
HP STATE: ${atmosphereContext.hpState} (${atmosphereContext.hp}/${atmosphereContext.maxHp})

TASK: Expand the deterministic result into ${sentenceGuide}
${discoveryNarration ? 'You MUST narrate the discovery using the DISCOVERY TEXT above. Do NOT invent details, add DM directives, or leak meta-commentary.' : 'PRESERVE the core imagery of the seed narrative (if provided). Add sensory detail — sound, temperature, texture.'}
Do NOT change the outcome, damage, or coin values.
Do NOT generate buttons, suggestions, or new content.
Do NOT add meta-commentary or compliments.
Do NOT re-describe locations, NPCs, or objects the player has already encountered in this scene. Move the narrative forward.
Do NOT generate a SUGGESTED ACTIONS block — buttons are handled by the game engine.
STRICT SCENE BOUNDARY — You are narrating ONLY: "${atmosphereContext.sceneName || 'the current location'}"
- ONLY the NPCs and objects listed in the SCENE STATE above exist in this scene.
- Do NOT bring characters from previous scenes into this scene. They are not here.
- If the player references someone not in this scene, narrate that they are not present.
- Stay in the setting described above. Do not invent new locations or NPCs.
Stay in the world. Be concise.`;
  } else if (isStoryline && !storyResult) {
    // Storyline mode but no StoryEngine match (free-text action not matching any button)
    // Build a spatially-anchored prompt so the LLM respects scene boundaries
    const sceneDesc = game.sceneState ? game.sceneState.sceneName : 'unknown location';
    const sceneDescription = game.sceneState ? (game.sceneState.description || '') : '';

    // Extract spatial constraints from scene description
    const spatialAnchor = buildSpatialAnchor(sceneDescription, sceneDesc);

    systemPrompt = buildAdventureSystemPrompt({
      adventureName: game.adventureName,
      adventureDescription: '',
      tone: adventure ? adventure.tone : 'gothic, suspenseful, mysterious',
      sceneContext: game.sceneState ? SceneEngine.buildSceneContext(game.sceneState) : ''
    });

    // Prepend spatial anchor — this is the critical fix for scene boundary violations
    systemPrompt = spatialAnchor + '\n\n' + systemPrompt;

    // Append inventory context
    if (game.inventory) {
      const items = listItems(game.inventory);
      if (items.length > 0) {
        const itemList = items.map(i => `${i.name}${i.consumable ? ` (${i.uses})` : ''}`).join(', ');
        systemPrompt += `\n\nPLAYER INVENTORY: ${itemList}`;
        systemPrompt += `\nOnly items listed above exist. Do NOT narrate the player possessing, finding, or using items NOT in this list.`;
      }
    }

    // Add strict anti-hallucination rules for free-text in storyline mode
    systemPrompt += `

STRICT RULES FOR FREE-TEXT ACTIONS:
- You MUST stay within the current scene location. Do NOT move the player to a different place.
- Do NOT invent new items, objects, or NPCs that are not already described in the scene.
- Do NOT narrate the player finding, picking up, or acquiring items unless they are explicitly listed in the scene description or player inventory.
- If the player's action is impossible in the current setting (e.g. searching the ground while inside a moving vehicle), narrate WHY it cannot be done — do not hallucinate a result.
- Keep the response to 2-3 sentences maximum.
- Do NOT generate a SUGGESTED ACTIONS block — buttons are handled by the game engine.
- Do NOT re-describe locations, NPCs, or objects the player has already encountered. Advance the narrative.`;
  } else if (isDm) {
    // === DIGITAL DM MODE: scenario-based play ===
    const scenario = game.digitalDMScenario;
    const scenarioDesc = scenario?.scenarioDescription || 'Open-ended AI-driven play. The DM creates everything live.';

    systemPrompt = buildAdventureSystemPrompt({
      adventureName: game.adventureName || 'Digital DM Sandbox',
      adventureDescription: scenarioDesc,
      tone: 'immersive, responsive, player-driven',
      sceneContext: game.sceneState ? SceneEngine.buildSceneContext(game.sceneState) : ''
    });

    // Inject Digital DM sandbox prompt suffix
    systemPrompt += '\n\n' + getDigitalDMPromptSuffix();

    // First turn: inject world-building prompt
    if (game.turnHistory.length === 0) {
      systemPrompt += '\n\n' + getDigitalDMWorldPrompt();

      // Inject scenario world seed context (first turn only)
      if (scenario?.worldSeed) {
        if (scenario.worldSeed.locations) {
          // Theme-based: inject structured world
          const currentLoc = scenario.worldSeed.locations[scenario.worldSeed.currentLocation];
          const knownLocs = Object.values(scenario.worldSeed.locations).map(l => l.name).join(', ');
          const knownNpcs = Object.values(scenario.worldSeed.npcs).map(n => `${n.name} (${n.role})`).join(', ');
          systemPrompt += `\n\nSTARTING WORLD (maintain consistency with this foundation):\nTheme: ${scenario.scenarioName}\nStarting Location: ${currentLoc?.name}\nDescription: ${currentLoc?.description}\nKnown Locations: ${knownLocs}\nKnown NPCs: ${knownNpcs}`;
        } else if (scenario.worldSeed.scenes) {
          // Manifest-based: inject scene structure
          const startScene = scenario.worldSeed.scenes[0];
          const npcList = scenario.worldSeed.keyNPCs?.map(n => `${n.name} (${n.role})`).join(', ') || 'TBD';
          systemPrompt += `\n\nADVENTURE MODULE: ${scenario.scenarioName}\n${scenarioDesc}\nStarting Scene: ${startScene?.location} — ${startScene?.summary}\nKey NPCs: ${npcList}\nTotal Scenes: ${scenario.worldSeed.scenes.length}`;
        }
      }
    }

    // Track world state in the game object
    if (!game.worldState) {
      game.worldState = {
        locations: [],
        npcs: [],
        quests: [],
        items: [],
        events: []
      };
    }

    // Append inventory context
    if (game.inventory) {
      const items = listItems(game.inventory);
      if (items.length > 0) {
        const itemList = items.map(i => `${i.name}${i.consumable ? ` (${i.uses})` : ''}`).join(', ');
        systemPrompt += `\n\nPLAYER INVENTORY: ${itemList}`;
        systemPrompt += `\nNarrate item usage naturally when the player references their gear. If they find a new item, mention it clearly.`;
      }
    }

    // Inject full character sheet so the DM can reference exact stats for skill checks, combat, etc.
    if (game.fullCharacter) {
      const ch = game.fullCharacter;
      const stats = ch.stats || {};
      const mod = (v) => Math.floor(((v || 10) - 10) / 2);
      const modStr = (v) => { const m = mod(v); return m >= 0 ? `+${m}` : `${m}`; };
      const statLine = Object.entries(stats).map(([k, v]) => `${k.toUpperCase()} ${v} (${modStr(v)})`).join(', ');
      const saves = ch.savingThrows ? Object.entries(ch.savingThrows).map(([k, v]) => `${k.toUpperCase()} ${v.value >= 0 ? '+' : ''}${v.value}${v.proficient ? '*' : ''}`).join(', ') : 'N/A';
      const features = ch.features ? ch.features.join(', ') : 'none';
      const langs = ch.languages ? ch.languages.map(l => l.charAt(0).toUpperCase() + l.slice(1)).join(', ') : 'Common';
      const spells = ch.spells && ch.spells.cantrips && ch.spells.cantrips.length > 0
        ? `Cantrips: ${ch.spells.cantrips.join(', ')}. ` + (ch.spells.known ? `Known: ${ch.spells.known.join(', ')}` : '')
        : '';
      systemPrompt += `\n\nPLAYER CHARACTER SHEET:
Name: ${ch.name} | Race: ${ch.race} | Class: ${ch.characterClass} | Level ${ch.level}
HP: ${ch.hp.current}/${ch.hp.max} | AC: ${ch.ac} | Speed: ${ch.speed}ft | Proficiency: +${ch.proficiencyBonus}
Stats: ${statLine}
Saving Throws: ${saves} (* = proficient)
Features: ${features}
Languages: ${langs}
Hit Dice: ${ch.hitDice ? ch.hitDice.current + '/' + ch.hitDice.max + ' d' + ch.hitDice.die : 'N/A'}
${spells}

USE THIS SHEET for all mechanical references. When the player makes a skill check, use the correct ability modifier and proficiency bonus. When combat occurs, use their AC and HP. Do NOT invent stats — use exactly what is listed above.`;
    }

    // Append world state so the DM maintains consistency
    const ws = game.worldState;
    if (ws.locations.length > 0 || ws.npcs.length > 0) {
      let worldContext = '\n\nESTABLISHED WORLD STATE (maintain consistency):';
      if (ws.locations.length > 0) worldContext += `\nLocations: ${ws.locations.join(', ')}`;
      if (ws.npcs.length > 0) worldContext += `\nNPCs: ${ws.npcs.join(', ')}`;
      if (ws.quests.length > 0) worldContext += `\nActive quests: ${ws.quests.join(', ')}`;
      if (ws.items.length > 0) worldContext += `\nWorld items: ${ws.items.join(', ')}`;
      systemPrompt += worldContext;
    }
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

    // Inject full character sheet for campaign/storyline mode too
    if (game.fullCharacter) {
      const ch = game.fullCharacter;
      const stats = ch.stats || {};
      const mod = (v) => Math.floor(((v || 10) - 10) / 2);
      const modStr = (v) => { const m = mod(v); return m >= 0 ? `+${m}` : `${m}`; };
      const statLine = Object.entries(stats).map(([k, v]) => `${k.toUpperCase()} ${v} (${modStr(v)})`).join(', ');
      const saves = ch.savingThrows ? Object.entries(ch.savingThrows).map(([k, v]) => `${k.toUpperCase()} ${v.value >= 0 ? '+' : ''}${v.value}${v.proficient ? '*' : ''}`).join(', ') : 'N/A';
      const features = ch.features ? ch.features.join(', ') : 'none';
      systemPrompt += `\n\nPLAYER CHARACTER SHEET:
Name: ${ch.name} | Race: ${ch.race} | Class: ${ch.characterClass} | Level ${ch.level}
HP: ${ch.hp.current}/${ch.hp.max} | AC: ${ch.ac} | Speed: ${ch.speed}ft | Proficiency: +${ch.proficiencyBonus}
Stats: ${statLine}
Saving Throws: ${saves} (* = proficient)
Features: ${features}

USE THIS SHEET for all mechanical references. When the player makes a skill check, use the correct ability modifier and proficiency bonus. When combat occurs, use their AC and HP.`;
    }
  }

  let fullSystemPrompt = systemPrompt;

  // Inject discovery narration into non-storyline prompts so the LLM echoes clean manifest text
  if (discoveryNarration && !isStoryline) {
    fullSystemPrompt += `\n\nIMPORTANT: The player just discovered something. Use this exact text as the core of your narration (adapt minimally for tone, do NOT add DM directives or meta-commentary):\n"${discoveryNarration}"\n\nThen add 1-2 atmospheric sentences. Do NOT repeat the text verbatim or add stage directions.`;
  }

  // Inject available content IDs so the LLM can emit [EXPLORED: id] tags accurately
  if (game.sceneState && game.sceneState.contentItems) {
    const available = game.sceneState.contentItems
      .filter(i => !i.discovered)
      .map(i => `${i.id} ("${i.label}")`)
      .join(', ');
    if (available) {
      fullSystemPrompt += `\n\nAVAILABLE CONTENT IDS for [EXPLORED:] tags: ${available}\nOnly tag items the player genuinely explored this turn.`;
    }
  }

  const messages = buildContext(contextManager, fullSystemPrompt);

  // Call LLM for narrative response
  let dmResponse;
  if (isStoryline && storyResult) {
    // P0 fix: skip LLM entirely for explore actions with pre-authored discovery text.
    // The LLM consistently overrides "you MUST use this exact text" directives with
    // invented narration, destroying the authored discovery experience.
    // Use the discovery text directly — no LLM expansion needed.
    if (buttonType === 'filler') {
      // Filler actions are deterministic atmosphere only. Never send them to
      // the LLM, which could invent NPC interactions, item discoveries, or
      // location changes for a non-story action.
      dmResponse = storyResult.narrative;
    } else if (discoveryNarration && buttonType === 'explore') {
      console.log('[StoryEngine] Discovery narration available for explore action — skipping LLM, using authored text directly');
      // Preserve deterministic acquisition confirmation when an authored
      // discovery also awards an item. Otherwise the direct-discovery fast
      // path would hide the inventory-changing part of the result.
      dmResponse = storyResult.itemGained ? storyResult.narrative : discoveryNarration;
    } else {
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
    }
  } else if (isStoryline && !storyResult) {
    // Storyline mode free-text: spatially-anchored LLM with phantom item stripping
    const storyMessages = [
      { role: 'system', content: fullSystemPrompt },
      { role: 'user', content: playerAction }
    ];
    try {
      dmResponse = await llmProvider(storyMessages);
    } catch (err) {
      console.warn('[StoryEngine] Free-text LLM failed:', err.message);
      dmResponse = `You consider your action, but the darkness around you offers no opportunity.`;
    }

    // Post-LLM: strip phantom items the LLM may have hallucinated
    dmResponse = stripPhantomItems(dmResponse, game);
  } else if (isDm) {
    // Digital DM mode: full LLM response, then extract world state
    dmResponse = await llmProvider(messages);

    // Post-LLM: extract new world entities from the response
    if (game.worldState) {
      extractWorldState(dmResponse, playerAction, game.worldState);
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
      // Enforce: regenerate if location jump detected (up to 2 retries, with timeout protection)
      const hasLocationJump = validation.violations.some(v => v.startsWith('LOCATION_JUMP'));
      if (hasLocationJump && game.llmProvider) {
        for (let retry = 0; retry < 2; retry++) {
          const correctionPrompt = fullSystemPrompt + `\n\nIMPORTANT: Your previous response referenced a location the player is NOT in. You are in "${game.sceneState ? game.sceneState.sceneName : 'this scene'}". Do NOT mention any location that is not the current scene. Stay in the current location.`;
          const correctionMessages = buildContext(contextManager, correctionPrompt);
          try {
            // Fix 5: Timeout protection — wrap retry in a race with timeout
            const retryTimeout = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Retry timeout')), 15000)
            );
            const retryResponse = await Promise.race([
              llmProvider(correctionMessages),
              retryTimeout
            ]);
            const retryValidation = game.validator.validate(retryResponse, playerAction);
            if (retryValidation.valid || !retryValidation.violations.some(v => v.startsWith('LOCATION_JUMP'))) {
              dmResponse = retryResponse;
              console.log('[ContinuityValidator] Retry ' + (retry + 1) + ' succeeded');
              break;
            }
            console.warn('[ContinuityValidator] Retry ' + (retry + 1) + ' still has violations:', retryValidation.violations);
          } catch (retryErr) {
            console.warn('[ContinuityValidator] Retry ' + (retry + 1) + ' timed out or failed:', retryErr.message);
            break; // Stop retrying — fall through to scrub
          }
        }
        // Fallback: if retries didn't fix it, scrub banned location sentences
        const stillBad = game.validator.validate(dmResponse, playerAction);
        if (!stillBad.valid && stillBad.violations.some(v => v.startsWith('LOCATION_JUMP'))) {
          const scrubbed = game.validator.scrubBannedLocations(dmResponse);
          if (scrubbed !== dmResponse) {
            console.log('[ContinuityValidator] Scrubbed banned locations from response');
            dmResponse = scrubbed;
          }
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
  let cleanResponse = dmResponse.replace(/\[EXPLORED:[^\]]*\]/gi, '').trim();
  // Strip DM directive blocks that leaked into the LLM response
  cleanResponse = cleanResponse.replace(/<!--\s*DM INSTRUCTIONS[\s\S]*?END DM INSTRUCTIONS\s*-->/gi, '').trim();
  cleanResponse = cleanResponse.replace(/<!--\s*DM INSTRUCTIONS[\s\S]*?-->/gi, '').trim();
  // Also strip bare DM instructions that the LLM might emit without HTML comments
  cleanResponse = cleanResponse.replace(/Suggested exit when ready:.*$/gim, '').trim();
  cleanResponse = cleanResponse.replace(/Scene pacing:.*$/gim, '').trim();
  cleanResponse = cleanResponse.replace(/Location boundary:.*$/gim, '').trim();
  cleanResponse = cleanResponse.replace(/NEVER include completion numbers.*$/gim, '').trim();

  // Add DM response to context (with tags for context, clean for display)
  addTurn(contextManager, 'assistant', dmResponse);

  // Parse response for game mechanics
  const parsed = parseDMResponse(cleanResponse);

  // Apply character effects from the DM narrative (damage, healing, XP, inventory)
  if (game.fullCharacter) {
    const effectsResult = applyCharacterEffects(game, parsed.narrative);
    if (effectsResult) {
      parsed.characterEffects = effectsResult;
    }
  }

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
        // Fix 10: Deduplicate exit narration — don't append if the transition narration
        // already contains significant text about the departure (prevents double-narration)
        const transitionLen = transitionNarration.length;
        const openingPreview = openingNarration.slice(0, 100).toLowerCase();
        const hasOverlap = transitionLen > 100 &&
          (transitionNarration.toLowerCase().includes('coach') && openingPreview.includes('coach')) ||
          (transitionNarration.toLowerCase().includes('door') && openingPreview.includes('door'));
        if (!hasOverlap) {
          parsed.narrative += '\n\n' + openingNarration;
        }
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
  } else if (isDm && parsed.suggestedActions && parsed.suggestedActions.length === 0) {
    // Digital DM: if the LLM didn't suggest actions, generate generic sandbox actions
    parsed.suggestedActions = ['Look around', 'Speak to someone nearby', 'Move forward'];
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

  // Fix 8: In storyline mode, dampen coins for free-text actions that didn't match a manifest button.
  // Generic free-text actions should earn less than curated button actions.
  if (isStoryline && !storyResult) {
    // Free-text action in storyline mode — reduce all scores by 40%
    for (const key of Object.keys(coinScores)) {
      if (typeof coinScores[key] === 'number') {
        coinScores[key] = Math.round(coinScores[key] * 0.6);
      }
    }
    console.log('[CoinEngine] Dampened free-text storyline action coins by 40%');
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
    contextStats: getStats(contextManager),
    characterEffects: parsed.characterEffects || null,
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
  // Preserve enough object/scene context for mobile buttons. A previous 16-character
  // cutoff turned useful actions into vague labels such as "Look" or "Grab".
  if (!label || label.length <= 28) return label;

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
  const allContent = SceneEngine.getAllContentWithStatus(sceneState);

  // STORYLINE MODE: Only show undiscovered items. Once explored, buttons vanish.
  // AI suggestions are completely excluded — they caused repetition and scene-irrelevant noise.
  const contentActions = allContent.filter(i => i.available).map(item => ({
    id: item.id,
    contentId: item.id,
    label: item.label,
    shortLabel: generateShortLabel(item.label),
    type: 'exploration'
  }));

  // FILLER SYSTEM: Generate atmospheric explore actions to keep button count >= 3.
  // These don't advance completion — they just keep the player feeling in control.
  const FILLER_ACTIONS = {
    inn: [
      { label: 'Steady your breathing and steel your resolve', shortLabel: 'Steel yourself' },
      { label: 'Check your gear and make sure nothing was lost in transit', shortLabel: 'Check gear' },
      { label: 'Recite a quiet prayer under your breath', shortLabel: 'Pray quietly' },
      { label: 'Recount the warnings you have received so far', shortLabel: 'Recount warnings' },
      { label: 'Study the light and shadow patterns in the room', shortLabel: 'Study shadows' },
      { label: 'Take a deep breath of the warm inn air', shortLabel: 'Breathe deep' },
      { label: 'Roll your shoulders and work out the travel stiffness', shortLabel: 'Roll shoulders' },
      { label: 'Review what you know about your destination', shortLabel: 'Review knowledge' },
      { label: 'Touch the crucifix in your pocket for reassurance', shortLabel: 'Touch crucifix' },
      { label: 'Notice how the firelight dances on the walls', shortLabel: 'Watch firelight' },
      { label: 'Flex your fingers to keep them from going numb', shortLabel: 'Flex fingers' },
      { label: 'Mutter a line from a psalm you learned as a child', shortLabel: 'Mutter psalm' },
    ],
    travel: [
      { label: 'Check your belongings for the hundredth time', shortLabel: 'Check gear' },
      { label: 'Recite a prayer for safe passage', shortLabel: 'Pray' },
      { label: 'Count the miles since you left the last town', shortLabel: 'Count miles' },
      { label: 'Flex your fingers to keep the cold at bay', shortLabel: 'Warm hands' },
      { label: 'Recall the faces of those who warned you not to come', shortLabel: 'Recall warnings' },
      { label: 'Meditate on your purpose for making this journey', shortLabel: 'Meditate' },
      { label: 'Adjust your cloak and shift your weight', shortLabel: 'Adjust cloak' },
      { label: 'Try to estimate how much daylight remains', shortLabel: 'Estimate time' },
      { label: 'Run your thumb along the edge of your prayer book', shortLabel: 'Touch prayer book' },
      { label: 'Whisper a prayer for Jonathan Harker', shortLabel: 'Pray for Harker' },
      { label: 'Study the road surface for recent tracks', shortLabel: 'Check road' },
      { label: 'Test the weight of your pack against your shoulders', shortLabel: 'Shift pack' },
    ],
    castle: [
      { label: 'Press your back to the wall and listen to your heartbeat', shortLabel: 'Listen to heartbeat' },
      { label: 'Recite the Lord\'s Prayer under your breath', shortLabel: 'Pray' },
      { label: 'Check that your crucifix is still around your neck', shortLabel: 'Check crucifix' },
      { label: 'Test the floor for creaks before stepping', shortLabel: 'Test floor' },
      { label: 'Study the dust patterns for signs of recent passage', shortLabel: 'Check dust' },
      { label: 'Steady your nerves with a slow exhale', shortLabel: 'Steady nerves' },
      { label: 'Count your remaining supplies in your mind', shortLabel: 'Count supplies' },
      { label: 'Press your ear to the stone and listen', shortLabel: 'Listen to stone' },
      { label: 'Recite a psalm of protection against evil', shortLabel: 'Recite psalm' },
      { label: 'Check the walls for hidden marks or symbols', shortLabel: 'Check marks' },
      { label: 'Feel the air current for hints of openings', shortLabel: 'Feel air' },
      { label: 'Make the sign of the cross and press on', shortLabel: 'Sign of cross' },
    ],
    outdoor: [
      { label: 'Shield your eyes and scan the horizon', shortLabel: 'Scan horizon' },
      { label: 'Feel the wind and judge how fast night is coming', shortLabel: 'Judge time' },
      { label: 'Recite a psalm against the gathering dark', shortLabel: 'Recite psalm' },
      { label: 'Check the ground for wolf tracks', shortLabel: 'Check tracks' },
      { label: 'Tighten your cloak against the cold', shortLabel: 'Tighten cloak' },
      { label: 'Pause and listen to the silence between the trees', shortLabel: 'Listen to silence' },
      { label: 'Study the sky for signs of weather changing', shortLabel: 'Check sky' },
      { label: 'Shift your weight and test your footing', shortLabel: 'Test footing' },
      { label: 'Rub your hands together for warmth', shortLabel: 'Rub hands' },
      { label: 'Mark the position of the sun in your mind', shortLabel: 'Mark sun' },
      { label: 'Mutter a prayer for protection on the road', shortLabel: 'Pray on road' },
      { label: 'Check that your weapons are within easy reach', shortLabel: 'Check weapons' },
    ],
    generic: [
      { label: 'Take a moment to collect yourself', shortLabel: 'Collect yourself' },
      { label: 'Check your gear and provisions', shortLabel: 'Check gear' },
      { label: 'Mutter a quiet prayer for guidance', shortLabel: 'Pray' },
      { label: 'Study the light and shadows around you', shortLabel: 'Study shadows' },
      { label: 'Steady your breathing and focus your mind', shortLabel: 'Focus' },
      { label: 'Recall why you undertook this journey', shortLabel: 'Recall purpose' },
      { label: 'Roll the tension out of your neck', shortLabel: 'Roll neck' },
      { label: 'Touch the reassuring weight of your crucifix', shortLabel: 'Touch crucifix' },
      { label: 'Listen to the sound of your own breathing', shortLabel: 'Listen to breathing' },
      { label: 'Whisper a line from your favorite hymn', shortLabel: 'Whisper hymn' },
      { label: 'Make a mental note of your surroundings', shortLabel: 'Note surroundings' },
      { label: 'Square your shoulders and press on', shortLabel: 'Square shoulders' },
    ]
  };

  // Pick filler category based on scene name
  const sceneLower = (sceneState.sceneName || '').toLowerCase();
  let fillerPool = FILLER_ACTIONS.generic;
  if (sceneLower.includes('inn') || sceneLower.includes('tavern') || sceneLower.includes('krone') || sceneLower.includes('room')) fillerPool = FILLER_ACTIONS.inn;
  else if (sceneLower.includes('journey') || sceneLower.includes('train') || sceneLower.includes('coach') || sceneLower.includes('carriage') || sceneLower.includes('passage')) fillerPool = FILLER_ACTIONS.travel;
  else if (sceneLower.includes('castle') || sceneLower.includes('crypt') || sceneLower.includes('tower') || sceneLower.includes('hall')) fillerPool = FILLER_ACTIONS.castle;
  else if (sceneLower.includes('forest') || sceneLower.includes('road') || sceneLower.includes('pass') || sceneLower.includes('mountain')) fillerPool = FILLER_ACTIONS.outdoor;

  // Add filler if content count < 3, or if we've explored most items (keep options open)
  const MIN_BUTTONS = 4;
  const exploredCount = allContent.filter(i => i.discovered).length;
  const totalContent = allContent.length;
  // Add more filler as the player explores more (keep button count steady)
  const fillerNeeded = Math.max(MIN_BUTTONS - contentActions.length, Math.floor(exploredCount * 0.5));
  if (fillerNeeded > 0) {
    // Use scene state to track which fillers have been shown
    if (!sceneState._shownFillers) sceneState._shownFillers = new Set();
    const available = fillerPool.filter(f => !sceneState._shownFillers.has(f.label));
    // Shuffle available fillers
    for (let i = available.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [available[i], available[j]] = [available[j], available[i]];
    }
    const toAdd = available.slice(0, fillerNeeded);
    for (const filler of toAdd) {
      sceneState._shownFillers.add(filler.label);
      contentActions.push({
        id: 'filler_' + sceneState.sceneId + '_' + sceneState._shownFillers.size,
        label: filler.label,
        shortLabel: filler.shortLabel || generateShortLabel(filler.label),
        type: 'filler'
      });
    }
  }

  // Add bad choice if it exists in the scene's storyMode (visible from the start)
  if (sceneState.storyMode && sceneState.storyMode.badChoice) {
    contentActions.push({
      id: 'bad_' + sceneState.storyMode.badChoice.id,
      label: sceneState.storyMode.badChoice.label,
      shortLabel: generateShortLabel(sceneState.storyMode.badChoice.label),
      type: 'bad_choice'
    });
  }

  // Shuffle content actions so bad choice isn't in a predictable position
  for (let i = contentActions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [contentActions[i], contentActions[j]] = [contentActions[j], contentActions[i]];
  }

  // Exit button: always visible. Position depends on pressure level.
  if (exitAction && exitAction.priority === 1) {
    // Strong/forced pressure — exit goes first
    actions.push({ id: exitAction.id, label: exitAction.label, shortLabel: generateShortLabel(exitAction.label), type: 'exit' });
    actions.push(...contentActions);
  } else if (exitAction) {
    // Background/gentle — content first, exit last
    actions.push(...contentActions);
    actions.push({ id: exitAction.id, label: exitAction.label, shortLabel: generateShortLabel(exitAction.label), type: 'exit' });
  } else {
    // No exit defined — just content
    actions.push(...contentActions);
  }

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

  // SUGGESTED ACTIONS parser removed — buttons are exclusively generated by
  // generateSceneActions() from the scene manifest. The LLM cannot inject buttons.
  // If the LLM still generates a SUGGESTED ACTIONS block, strip it from the narrative.
  const actionsMatch = response.match(/SUGGESTED ACTIONS?[\s\S]*?(?=\n\n|$)/i);
  if (actionsMatch) {
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
/**
 * Apply mechanical character effects parsed from the DM's narrative.
 * Detects damage, healing, XP grants, and item acquisition from natural language.
 * Returns an effects summary object, or null if nothing was applied.
 */
function applyCharacterEffects(game, narrative) {
  const ch = game.fullCharacter;
  if (!ch) return null;

  const effects = { damage: 0, healing: 0, xp: 0, items: [], notes: [] };
  const lower = narrative.toLowerCase();

  // ── Damage detection ──────────────────────────────────────────────────
  // Match patterns like: "takes 8 damage", "deals 12 points of damage",
  // "you lose 5 hit points", "suffers 3 points of slashing damage"
  const damagePatterns = [
    /(?:you|the player|your character)\s+(?:take|takes|suffer|suffers|lose|loses|receive|receives)\s+(\d+)\s+(?:points?\s+of\s+)?(?:\w+\s+)?damage/i,
    /deals?\s+(\d+)\s+(?:points?\s+of\s+)?(?:\w+\s+)?damage\s+to\s+you/i,
    /(\d+)\s+(?:points?\s+of\s+)?(?:\w+\s+)?damage\s+(?:to|against)\s+(?:you|the player)/i,
    /you\s+(?:are|get)\s+(?:hit|struck|wounded)\s+for\s+(\d+)/i,
    /take[s]?\s+(\d+)\s+(?:hit\s+points?|hp)\s+(?:of\s+)?damage/i,
  ];
  for (const pat of damagePatterns) {
    const m = narrative.match(pat);
    if (m) {
      effects.damage = Math.max(effects.damage, parseInt(m[1], 10));
    }
  }

  // ── Healing detection ─────────────────────────────────────────────────
  const healPatterns = [
    /(?:you|the player|your character)\s+(?:regain|regains|recover|recovers|heal|heals|gain|gains)\s+(\d+)\s+(?:hit\s+points?|hp)/i,
    /(?:heals?|restores?|recovers?)\s+(\d+)\s+(?:hit\s+points?|hp)\s+(?:to|for)\s+you/i,
    /(?:potion|spell|magic)\s+(?:heals?|restores?|recovers?)\s+you\s+(?:for\s+)?(\d+)/i,
    /drink\s+(?:the\s+)?(?:potion|elixir)[^.!]*?(?:regain|recover|heal)\s+(\d+)/i,
  ];
  for (const pat of healPatterns) {
    const m = narrative.match(pat);
    if (m) {
      effects.healing = Math.max(effects.healing, parseInt(m[1], 10));
    }
  }

  // ── XP detection ──────────────────────────────────────────────────────
  const xpPatterns = [
    /(?:you|the player)\s+(?:gain|gains|earn|earns|receive|receives)\s+(\d+)\s+(?:experience\s+points?|xp|experience)/i,
    /(\d+)\s+(?:experience\s+points?|xp)\s+(?:awarded|granted|gained|earned)/i,
    /award[s]?\s+(?:you\s+)?(\d+)\s+(?:experience\s+points?|xp)/i,
  ];
  for (const pat of xpPatterns) {
    const m = narrative.match(pat);
    if (m) {
      effects.xp = Math.max(effects.xp, parseInt(m[1], 10));
    }
  }

  // ── Item detection ────────────────────────────────────────────────────
  const itemPatterns = [
    /(?:you|the player)\s+(?:find|finds|receive|receives|obtain|obtains|pick up|picks up|acquire|acquires|gain|gains)\s+(?:a|an|the)\s+([A-Za-z][\w\s]+?)(?:\.|,|!|\band\b)/i,
    /(?:give|gives|hand|hands|offer|offers)\s+you\s+(?:a|an|the)\s+([A-Za-z][\w\s]+?)(?:\.|,|!|\band\b)/i,
    /(?:loot|loot\s+from)[^.!]*?(?:find|finds|obtain|obtains)\s+(?:a|an|the)\s+([A-Za-z][\w\s]+?)(?:\.|,|!)/i,
  ];
  for (const pat of itemPatterns) {
    const m = narrative.match(pat);
    if (m) {
      const itemName = m[1].trim().toLowerCase();
      // Filter out false positives — common non-item phrases
      const blacklist = ['look', 'moment', 'chance', 'way', 'place', 'room', 'door', 'step',
        'deep breath', 'closer', 'glance', 'seat', 'rest', 'break', 'fight', 'fighting',
        'position', 'opportunity', 'approach', 'attack', 'hit', 'damage', 'pain', 'wound'];
      if (!blacklist.includes(itemName) && itemName.length > 2 && itemName.length < 40) {
        effects.items.push(itemName);
      }
    }
  }

  // ── Apply effects to the character ────────────────────────────────────
  const CharacterService = require('../character/character-service');
  let modified = false;

  // Apply damage
  if (effects.damage > 0) {
    ch.hp.current = Math.max(0, ch.hp.current - effects.damage);
    effects.notes.push(`Took ${effects.damage} damage (HP: ${ch.hp.current}/${ch.hp.max})`);
    modified = true;
  }

  // Apply healing
  if (effects.healing > 0) {
    const healed = Math.min(effects.healing, ch.hp.max - ch.hp.current);
    ch.hp.current += healed;
    effects.notes.push(`Healed ${healed} HP (HP: ${ch.hp.current}/${ch.hp.max})`);
    modified = true;
  }

  // Apply XP
  if (effects.xp > 0) {
    try {
      const xpResult = CharacterService.gainXP(ch, effects.xp);
      effects.notes.push(`Gained ${effects.xp} XP`);
      if (xpResult.levelsGained > 0) {
        // Refresh the fullCharacter reference after level-up
        const updated = CharacterService.getCharacter(ch.id);
        if (updated) {
          game.fullCharacter = updated;
          effects.notes.push(`LEVEL UP! Now level ${updated.level}`);
          effects.levelUp = true;
        }
      }
      modified = true;
    } catch (e) {
      console.warn('[DM] Failed to apply XP:', e.message);
    }
  }

  // Apply items
  for (const itemName of effects.items) {
    try {
      CharacterService.addToInventory(ch.id, { name: itemName, type: 'misc', quantity: 1 });
      effects.notes.push(`Acquired: ${itemName}`);
      modified = true;
    } catch (e) {
      console.warn('[DM] Failed to add item:', e.message);
    }
  }

  // Sync HP back to the session player object so the frontend stays current
  if (modified && game._syncPlayerHp) {
    game._syncPlayerHp(ch);
  }

  if (!modified) return null;

  console.log('[DM] Character effects applied:', effects.notes);
  return effects;
}

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

/**
 * Extract world state entities from a Digital DM narrative response.
 * Simple heuristic: look for capitalized names following trigger phrases.
 * This is intentionally lightweight — the LLM is the source of truth;
 * this just gives it a persistent reference for consistency.
 */
function extractWorldState(dmResponse, playerAction, worldState) {
  const lower = dmResponse.toLowerCase();

  // Extract location names (e.g. "You arrive at the Crimson Tavern")
  const locPatterns = [
    /you (?:arrive at|enter|reach|find yourself (?:in|at)) (?:the |a )?([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/gi,
    /(?:the |a )?([A-Z][a-z]+(?:\s[A-Z][a-z]+)*) (?:is|stands|lies|sits) (?:before|ahead|near)/gi,
  ];
  for (const pat of locPatterns) {
    let m;
    while ((m = pat.exec(dmResponse)) !== null) {
      const loc = m[1].trim();
      if (loc.length > 3 && loc.length < 50 && !worldState.locations.includes(loc)) {
        worldState.locations.push(loc);
      }
    }
  }

  // Extract NPC names (e.g. "a tall figure named Elara" or "Elara says")
  const npcPatterns = [
    /(?:named|introduces? (?:herself|himself) as|called) ([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/g,
    /([A-Z][a-z]+) (?:says|replies|asks|nods|smiles|growls|whispers|shouts)/g,
  ];
  for (const pat of npcPatterns) {
    let m;
    while ((m = pat.exec(dmResponse)) !== null) {
      const npc = m[1].trim();
      if (npc.length > 2 && npc.length < 40 && !worldState.npcs.includes(npc)) {
        worldState.npcs.push(npc);
      }
    }
  }

  // Extract quest hooks (e.g. "you must find", "the quest to")
  const questPatterns = [
    /(?:you (?:must|need to|should)|quest to|tasked with|mission to) ([^.!?\n]{10,80})/gi,
  ];
  for (const pat of questPatterns) {
    let m;
    while ((m = pat.exec(dmResponse)) !== null) {
      const quest = m[1].trim().replace(/\s+$/, '');
      if (!worldState.quests.includes(quest)) {
        worldState.quests.push(quest);
        if (worldState.quests.length > 10) worldState.quests.shift(); // cap
      }
    }
  }

  // Log for debugging
  if (worldState.locations.length + worldState.npcs.length + worldState.quests.length > 0) {
    console.log('[DigitalDM] World state:', {
      locs: worldState.locations.length,
      npcs: worldState.npcs.length,
      quests: worldState.quests.length
    });
  }
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
  extractWorldState,
};
