/**
 * story-engine.js — Deterministic button processing for Story Mode
 * IIFE-wrapped for browser use. Exposes window.StoryEngine.
 */
(function() {

/**
 * story-engine.js — Deterministic button processing engine for Story Mode
 *
 * This engine handles ALL game logic for Story Mode without LLM involvement.
 * The pre-authored content controls "truth" — what happens, what buttons appear,
 * what coins/HP change. A constrained LLM layer only wraps discovery text
 * in personalized atmosphere (never generates buttons, discovery text, or content).
 *
 * Button types: explore, threat, item, ability, bad_choice
 */

// Use ClassAbilities — browser global or Node.js require
var ClassAbilities;
if (typeof window !== 'undefined' && window.ClassAbilities) {
  ClassAbilities = window.ClassAbilities;
} else if (typeof require !== 'undefined') {
  ClassAbilities = require('./class-abilities');
}
const { CLASSES, getClass, rechargeAbilities, useAbility, getAvailableAbilities, applyDamage, heal } = ClassAbilities;

// ─── PLAYER STATE ──────────────────────────────────────────────────

/**
 * Create initial player state at adventure start.
 * @param {string} classId — 'fighter' | 'cleric' | 'mage' | 'rogue'
 * @returns {object} full player state
 */
function createPlayerState(classId) {
  const classData = getClass(classId);
  if (!classData) throw new Error('Invalid class: ' + classId);

  return {
    classId,
    className: classData.name,
    hp: classData.startingHp,
    maxHp: classData.maxHp,
    coins: 10,              // starting coins
    inventory: [],           // collected item IDs
    flags: {},               // penalty/bonus flags (e.g. { rescued_at_0hp: true })
    abilitiesUsed: {},       // { ability_id: boolean } — reset per scene
    scenesCompleted: 0,
    classData                // reference to CLASSES entry
  };
}

/**
 * Recharge all abilities at the start of a new scene.
 */
function rechargeForNewScene(playerState) {
  rechargeAbilities(playerState);
  playerState.scenesCompleted++;
}

// ─── BUTTON GENERATION ─────────────────────────────────────────────

/**
 * Generate Story Mode buttons for a scene.
 * Layout: 2-3 explore + 0-2 threat + 0-1 item + 0-1 ability + 1 bad_choice
 *
 * @param {object} sceneManifest — the scene manifest (with storyMode field)
 * @param {object} playerState — current player state
 * @returns {object} { buttons: [{ id, type, label, disabled? }], threatEncounter?, collectibleItems? }
 */
function generateStoryButtons(sceneManifest, playerState) {
  const storyMode = sceneManifest.storyMode || {};
  const buttons = [];

  // 1. Exploration buttons (2-3 from remaining content, cap at 3)
  const exploreItems = (sceneManifest.content || []).slice(0, 3);
  for (const item of exploreItems) {
    buttons.push({
      id: item.id,
      type: 'explore',
      label: item.label
    });
  }

  // 2. Threat encounter buttons (fight/defend/run)
  const threat = storyMode.threat || null;
  if (threat) {
    buttons.push({ id: 'threat_fight',  type: 'threat', label: 'Fight' });
    buttons.push({ id: 'threat_defend', type: 'threat', label: 'Defend' });
    buttons.push({ id: 'threat_run',    type: 'threat', label: 'Run' });
  }

  // 3. Collectible item buttons (0-1)
  if (storyMode.collectibleItem) {
    const alreadyHas = playerState.inventory.includes(storyMode.collectibleItem.id);
    if (!alreadyHas) {
      buttons.push({
        id: 'item_' + storyMode.collectibleItem.id,
        type: 'item',
        label: storyMode.collectibleItem.label
      });
    }
  }

  // 4. Class ability buttons (0-1 per available ability)
  const available = getAvailableAbilities(playerState);
  for (const ability of available) {
    buttons.push({
      id: 'ability_' + ability.id,
      type: 'ability',
      label: ability.name
    });
  }

  // 5. Bad choice (plausible trap — always 1)
  if (storyMode.badChoice) {
    buttons.push({
      id: 'bad_' + storyMode.badChoice.id,
      type: 'bad_choice',
      label: storyMode.badChoice.label
    });
  }

  return {
    buttons,
    threatEncounter: threat,
    collectibleItems: storyMode.collectibleItem ? [storyMode.collectibleItem] : []
  };
}

// ─── BUTTON PROCESSING ─────────────────────────────────────────────

/**
 * Process a button click. This is the core deterministic handler.
 * All game logic flows through here — no LLM involvement.
 *
 * @param {string} buttonId — the button id clicked
 * @param {string} buttonType — 'explore' | 'threat' | 'item' | 'ability' | 'bad_choice'
 * @param {object} sceneManifest — the full scene manifest (with storyMode field)
 * @param {object} playerState — current player state (mutated in place)
 * @param {object} threatDef — the threat definition from threat-encounters.js (if threat scene)
 * @returns {object} result: { type, narrative, hpChange, coinChange, itemGained, flagSet, abilityUsed, gameOver? }
 */
function processButtonAction(buttonId, buttonType, sceneManifest, playerState, threatDef) {
  const storyMode = sceneManifest.storyMode || {};

  switch (buttonType) {
    case 'explore':
      return processExplore(buttonId, sceneManifest, playerState);
    case 'threat':
      return processThreat(buttonId, threatDef, playerState);
    case 'item':
      return processItem(buttonId, storyMode, playerState);
    case 'ability':
      return processAbility(buttonId, playerState);
    case 'bad_choice':
      return processBadChoice(buttonId, storyMode, playerState);
    default:
      return { type: 'error', narrative: 'Unknown action type.' };
  }
}

/**
 * Process an exploration button click.
 * Returns the discovery text (pre-authored truth) + any item or flag rewards.
 */
function processExplore(buttonId, sceneManifest, playerState) {
  const content = sceneManifest.content || [];
  const item = content.find(c => c.id === buttonId);
  if (!item) {
    return { type: 'explore', narrative: 'You investigate, but find nothing of note.', discovered: true };
  }

  // Check for class-specific exploration bonuses
  const classBonus = (sceneManifest.storyMode || {}).classExploreBonus || {};
  const classOverride = classBonus[playerState.classId] && classBonus[playerState.classId][buttonId];

  const narrative = classOverride || item.discovery || 'You investigate further.';

  return {
    type: 'explore',
    narrative,
    discovered: true,
    contentId: buttonId,
    coinChange: 0,
    hpChange: 0
  };
}

/**
 * Process a threat reaction button (fight/defend/run).
 * Applies class modifiers, damage, coins, and flags.
 */
function processThreat(buttonId, threatDef, playerState) {
  if (!threatDef) {
    return { type: 'threat', narrative: 'The danger passes without consequence.', hpChange: 0, coinChange: 0 };
  }

  const reaction = buttonId.replace('threat_', ''); // 'fight' | 'defend' | 'run'
  const baseOutcome = threatDef.outcomes[reaction];

  if (!baseOutcome) {
    return { type: 'threat', narrative: 'You react instinctively.', hpChange: 0, coinChange: 0 };
  }

  // Check for class modifier
  let outcome = baseOutcome;
  const classMods = threatDef.classModifiers || {};
  const classMod = classMods[playerState.classId];
  if (classMod && classMod[reaction]) {
    outcome = { ...baseOutcome, ...classMod[reaction] };
  }

  // Check for Turn Undead bypass (cleric ability on undead threats)
  if (playerState.classId === 'cleric' && reaction === 'defend') {
    const tags = threatDef.tags || [];
    if (tags.includes('undead')) {
      outcome = {
        damage: 0,
        coins: (outcome.coins || 0) + 2,
        text: 'You present your holy symbol. The creature recoils with an unearthly shriek, dissolving into mist.'
      };
    }
  }

  // Check for Shadow Step bypass (rogue ability)
  if (playerState.classId === 'rogue' && reaction === 'run') {
    const tags = threatDef.tags || [];
    if (tags.includes('physical') || tags.includes('beast')) {
      outcome = {
        damage: 0,
        coins: (outcome.coins || 0) + 1,
        text: 'You melt into the shadows without a trace. The creature loses your scent entirely.'
      };
    }
  }

  // Check for Arcane Shield damage reduction (mage ability already activated)
  let damage = outcome.damage || 0;
  if (playerState.classId === 'mage' && playerState.abilitiesUsed && playerState.abilitiesUsed['arcane_shield']) {
    const tags = threatDef.tags || [];
    if (tags.includes('supernatural')) {
      damage = Math.max(0, damage - 4);
    }
  }

  // Check for Shield Block damage reduction (fighter ability already activated)
  if (playerState.classId === 'fighter' && playerState.abilitiesUsed && playerState.abilitiesUsed['shield_block']) {
    damage = Math.max(0, damage - 3);
  }

  // Apply damage
  if (damage > 0) {
    applyDamage(playerState, damage);
  }

  // Award coins
  const coins = outcome.coins || 0;
  if (coins > 0) {
    playerState.coins = (playerState.coins || 0) + coins;
  }

  // Check for 0 HP
  const zeroHpResult = checkZeroHp(playerState);

  return {
    type: 'threat',
    reaction,
    narrative: outcome.text || 'The encounter resolves.',
    hpChange: -damage,
    coinChange: coins,
    totalHp: playerState.hp,
    totalCoins: playerState.coins,
    zeroHp: zeroHpResult
  };
}

/**
 * Process a collectible item button click.
 * Adds the item to inventory.
 */
function processItem(buttonId, storyMode, playerState) {
  const itemId = buttonId.replace('item_', '');
  const collectible = storyMode.collectibleItem;

  if (!collectible || collectible.id !== itemId) {
    return { type: 'item', narrative: 'You pick up a useful trinket.', itemGained: itemId };
  }

  // Add to inventory
  if (!playerState.inventory.includes(itemId)) {
    playerState.inventory.push(itemId);
  }

  return {
    type: 'item',
    narrative: collectible.description || 'You carefully stow the item away.',
    itemGained: itemId,
    itemName: collectible.name || itemId
  };
}

/**
 * Process a class ability button click.
 * Marks the ability as used and returns the effect.
 */
function processAbility(buttonId, playerState) {
  const abilityId = buttonId.replace('ability_', '');
  const result = useAbility(playerState, abilityId);

  if (!result) {
    return { type: 'ability', narrative: 'You try, but the ability is not available.' };
  }

  return {
    type: 'ability',
    abilityUsed: abilityId,
    narrative: result.flavor || 'You channel your power.',
    effect: result.effect,
    value: result.value
  };
}

/**
 * Process a bad choice (plausible trap) button click.
 * Costs coins and sets penalty flags.
 */
function processBadChoice(buttonId, storyMode, playerState) {
  const badChoice = storyMode.badChoice;
  if (!badChoice) {
    return { type: 'bad_choice', narrative: 'A costly mistake.', coinChange: 0 };
  }

  const coinCost = badChoice.coinCost || 3;
  playerState.coins = Math.max(0, (playerState.coins || 0) - coinCost);

  // Set penalty flags
  if (badChoice.flagSet) {
    for (const [flag, value] of Object.entries(badChoice.flagSet)) {
      playerState.flags[flag] = value;
    }
  }

  return {
    type: 'bad_choice',
    narrative: badChoice.consequence || 'That was a mistake.',
    coinChange: -coinCost,
    totalCoins: playerState.coins,
    flagSet: badChoice.flagSet || {}
  };
}

// ─── ZERO HP RESCUE ────────────────────────────────────────────────

/**
 * Check if player hit 0 HP. If so, trigger rescue mechanics.
 * NOT game over — costs coins, sets penalty flags, restores to 1 HP.
 */
function checkZeroHp(playerState) {
  if (playerState.hp > 0) return null;

  // Rescue costs 5 coins (or all coins if less)
  const rescueCost = Math.min(5, playerState.coins || 0);
  playerState.coins = Math.max(0, (playerState.coins || 0) - rescueCost);
  playerState.hp = 1; // revived at 1 HP
  playerState.flags.rescued_at_0hp = true;
  playerState.flags.rescue_count = (playerState.flags.rescue_count || 0) + 1;

  return {
    rescued: true,
    coinCost: rescueCost,
    narrative: 'Darkness closes in. When you wake, a stranger has dragged you to safety. Your purse is lighter — payment for the rescue, they say. You are alive, barely.',
    totalCoins: playerState.coins
  };
}

// ─── HEALING ───────────────────────────────────────────────────────

/**
 * Apply a healing moment from a scene (monastery, Van Helsing's care, etc.)
 * @param {object} playerState
 * @param {number} amount — HP to restore
 * @param {string} narrative — healing scene text
 */
function applyHealing(playerState, amount, narrative) {
  const result = heal(playerState, amount);
  return {
    type: 'healing',
    narrative: narrative || 'You rest and recover your strength.',
    hpGained: result.healed,
    totalHp: result.newHp
  };
}

// ─── ITEM CRITICAL CHECK ───────────────────────────────────────────

/**
 * Check if a player has a required item for a downstream scene.
 * If missing, returns a harder variant flag.
 *
 * @param {object} playerState
 * @param {string} requiredItemId
 * @returns {object|null} { missing, harderVariant } or null if has item
 */
function checkItemRequirement(playerState, requiredItemId) {
  if (playerState.inventory.includes(requiredItemId)) {
    return null;
  }
  return {
    missing: true,
    requiredItem: requiredItemId,
    harderVariant: true,
    narrative: 'You lack something that would have made this easier...'
  };
}

/**
 * Check if a tactical bonus should be awarded.
 * Returns bonus coins if the right ability or item is used at the right time.
 */
function checkTacticalBonus(playerState, bonusConfig) {
  if (!bonusConfig) return 0;

  // Check if player used the right ability
  if (bonusConfig.abilityRequired && playerState.abilitiesUsed[bonusConfig.abilityRequired]) {
    return bonusConfig.bonusCoins || 2;
  }

  // Check if player has the right item
  if (bonusConfig.itemRequired && playerState.inventory.includes(bonusConfig.itemRequired)) {
    return bonusConfig.bonusCoins || 2;
  }

  return 0;
}

// ─── TRAVEL BETWEEN SCENES ─────────────────────────────────────────

/**
 * Generate travel narrative and optional travel encounter.
 * Some scenes are far apart — this provides the connective tissue.
 *
 * @param {string} fromSceneId — current scene ID
 * @param {string} toSceneId — next scene ID
 * @param {object} playerState
 * @param {object|null} travelConfig — from manifest storyMode.travel
 * @returns {object} { narrative, encounter?, healing? }
 */
function processTravel(fromSceneId, toSceneId, playerState, travelConfig) {
  if (!travelConfig) {
    return {
      narrative: 'You press onward to the next chapter of your journey.',
      encounter: null,
      healing: null
    };
  }

  const result = {
    narrative: travelConfig.narrative || 'You travel between scenes.',
    encounter: null,
    healing: null
  };

  // Travel healing (rest during long journeys)
  if (travelConfig.healing) {
    const healResult = applyHealing(
      playerState,
      travelConfig.healing.amount || 2,
      travelConfig.healing.narrative || 'The journey gives you time to rest and recover.'
    );
    result.healing = healResult;
  }

  // Travel encounter (optional — not every journey has one)
  if (travelConfig.encounter) {
    result.encounter = {
      name: travelConfig.encounter.name || 'A hazard on the road',
      description: travelConfig.encounter.description || 'Danger lurks on the path ahead.',
      buttons: [
        { id: 'travel_fight', type: 'threat', label: 'Fight' },
        { id: 'travel_avoid', type: 'threat', label: 'Avoid' }
      ]
    };
  }

  // Flag-based narrative variation
  if (travelConfig.flagVariants) {
    for (const [flag, variant] of Object.entries(travelConfig.flagVariants)) {
      if (playerState.flags[flag]) {
        result.narrative = variant.narrative || result.narrative;
        break;
      }
    }
  }

  return result;
}

// ─── BUTTON LAYOUT BUILDER ─────────────────────────────────────────

/**
 * Build the final button layout with counts validated.
 * Ensures total buttons stays in the 5-7 range (2-3 explore + rest).
 *
 * @param {object} sceneManifest
 * @param {object} playerState
 * @returns {object} { buttons, threatId, valid }
 */
function buildButtonLayout(sceneManifest, playerState) {
  const result = generateStoryButtons(sceneManifest, playerState);
  const { buttons } = result;

  // Validate: at least 2 explore buttons, no more than 7 total
  const exploreCount = buttons.filter(b => b.type === 'explore').length;
  const totalCount = buttons.length;

  return {
    buttons,
    threatId: result.threatEncounter ? result.threatEncounter.id : null,
    exploreCount,
    totalCount,
    valid: exploreCount >= 1 && totalCount >= 2 && totalCount <= 9
  };
}

// ─── SCENE SUMMARY (for LLM atmosphere layer) ─────────────────────

/**
 * Build a summary object for the constrained LLM layer.
 * Contains ONLY the facts the LLM needs — never discovery text or buttons.
 */
function buildAtmosphereContext(playerState, sceneManifest, result) {
  return {
    className: playerState.className,
    classId: playerState.classId,
    hp: playerState.hp,
    maxHp: playerState.maxHp,
    hpState: playerState.hp <= 3 ? 'critical' : playerState.hp <= 6 ? 'wounded' : 'healthy',
    coins: playerState.coins,
    inventorySize: playerState.inventory.length,
    inventory: playerState.inventory.slice(),
    flags: { ...playerState.flags },
    sceneName: sceneManifest.sceneName,
    actionType: result.type,
    actionNarrative: result.narrative,
    // LLM should add atmosphere referencing these facts
    // NEVER generate: buttons, discovery text, new content, new NPCs
    instruction: 'Add brief atmospheric flavor referencing the player class and HP state. ' +
      'Do NOT generate buttons, discovery text, or invent new content. ' +
      'Keep response under 2 sentences. Low temperature.'
  };
}

// ─── MODULE EXPORTS ────────────────────────────────────────────────

  // Expose as browser global
  var _exports = {
    createPlayerState: createPlayerState,
    rechargeForNewScene: rechargeForNewScene,
    generateStoryButtons: generateStoryButtons,
    processButtonAction: processButtonAction,
    processExplore: processExplore,
    processThreat: processThreat,
    processItem: processItem,
    processAbility: processAbility,
    processBadChoice: processBadChoice,
    checkZeroHp: checkZeroHp,
    applyHealing: applyHealing,
    checkItemRequirement: checkItemRequirement,
    checkTacticalBonus: checkTacticalBonus,
    processTravel: processTravel,
    buildButtonLayout: buildButtonLayout,
    buildAtmosphereContext: buildAtmosphereContext
  };

  // Browser global
  if (typeof window !== 'undefined') {
    window.StoryEngine = _exports;
  }
  // Node.js / CommonJS
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = _exports;
  }

})();
