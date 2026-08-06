/**
 * Game Mode Configuration Tests — The Binding
 * Tests: GameMode enum, MODE_CONFIG, MODE_META, getModeConfig, getModeMeta,
 *        listModes, isFeatureEnabled, getUIConfig, isValidMode
 * Run with: npx tape tests/game-mode.test.js
 */

const test = require('tape');
const {
  GameMode, MODE_CONFIG, MODE_META,
  getModeConfig, getModeMeta, listModes,
  isFeatureEnabled, getUIConfig, isValidMode
} = require('../src/game-mode');

// ─── Canonical 23 feature-flag keys (from the-binding-matrix.md) ───
const MATRIX_FEATURE_KEYS = [
  'summary',           // #1
  'maxPlayers',        // #2
  'savedCharacter',    // #3
  'freeTextInput',     // #4
  'narrativeVoice',    // #5
  'combatResolution',  // #6
  'narrativeStyle',    // #7
  'reusableCharacters',// #8
  'scenarioSource',    // #9
  'lifePointsTracked', // #10
  'voiceInput',        // #11
  'coinsEarned',       // #12
  'characterSelection',// #13
  'imagesPerScene',    // #14
  'mapping',           // #15
  'inventory',         // #16
  'shopEnabled',       // #17
  'nftCharacters',     // #18
  'charactersTransferable', // #19
  'logicStyle',        // #20
  'playMode',          // #21
  'journaling',        // #22
  'questTracker'       // #23
];

// ════════════════════════════════════════════════════════════════════════
// 1. GameMode enum
// ════════════════════════════════════════════════════════════════════════

test('GameMode enum has exactly 3 values', function (t) {
  const modes = Object.values(GameMode);
  t.equal(modes.length, 3, '3 modes defined');
  t.ok(modes.includes('storyline'), 'storyline present');
  t.ok(modes.includes('campaign'), 'campaign present');
  t.ok(modes.includes('digital_dm'), 'digital_dm present');
  t.end();
});

test('GameMode enum is frozen', function (t) {
  t.equal(Object.isFrozen(GameMode), true, 'GameMode is frozen');
  t.end();
});

// ════════════════════════════════════════════════════════════════════════
// 2. All 3 mode configs have all 23 feature-flag keys
// ════════════════════════════════════════════════════════════════════════

test('MODE_CONFIG: all 3 modes contain every matrix feature-flag key', function (t) {
  for (const mode of Object.values(GameMode)) {
    const cfg = MODE_CONFIG[mode];
    t.ok(cfg, mode + ' config exists');
    for (const key of MATRIX_FEATURE_KEYS) {
      t.ok(key in cfg, mode + ' has key "' + key + '"');
    }
  }
  t.end();
});

// ════════════════════════════════════════════════════════════════════════
// 3. Storyline mode — correct values
// ════════════════════════════════════════════════════════════════════════

test('Storyline mode config values', function (t) {
  const s = MODE_CONFIG[GameMode.STORYLINE];
  t.equal(s.maxPlayers, 1, 'single player only');
  t.equal(s.savedCharacter, false, 'no saved character');
  t.equal(s.freeTextInput, false, 'no free text input');
  t.equal(s.narrativeVoice, true, 'narrative voice enabled');
  t.equal(s.combatResolution, 'narrative', 'combat is narrative');
  t.equal(s.narrativeStyle, 'predetermined', 'predetermined narrative');
  t.equal(s.reusableCharacters, false, 'no reusable characters');
  t.equal(s.scenarioSource, 'book', 'book scenario');
  t.equal(s.lifePointsTracked, false, 'no life points');
  t.equal(s.voiceInput, false, 'no voice input');
  t.equal(s.coinsEarned, false, 'no coins earned');
  t.equal(s.characterSelection, 'name_only', 'name-only character');
  t.equal(s.imagesPerScene, 1, '1 image per scene');
  t.equal(s.mapping, false, 'no mapping');
  t.equal(s.inventory, 'predetermined', 'predetermined inventory');
  t.equal(s.shopEnabled, false, 'no shop');
  t.equal(s.nftCharacters, false, 'no NFT characters');
  t.equal(s.charactersTransferable, false, 'characters not transferable');
  t.equal(s.logicStyle, 'guided', 'guided logic');
  t.equal(s.playMode, 'local_narrative', 'local narrative play');
  t.equal(s.journaling, false, 'no journaling');
  t.equal(s.questTracker, false, 'no quest tracker');
  t.end();
});

// ════════════════════════════════════════════════════════════════════════
// 4. Campaign mode — correct values
// ════════════════════════════════════════════════════════════════════════

test('Campaign mode config values', function (t) {
  const c = MODE_CONFIG[GameMode.CAMPAIGN];
  t.equal(c.maxPlayers, 1, 'single player');
  t.equal(c.savedCharacter, true, 'saved character');
  t.equal(c.freeTextInput, true, 'free text input enabled');
  t.equal(c.narrativeVoice, true, 'narrative voice enabled');
  t.equal(c.combatResolution, 'dice', 'dice combat');
  t.equal(c.narrativeStyle, 'flexible', 'flexible narrative');
  t.equal(c.reusableCharacters, false, 'no reusable characters');
  t.equal(c.scenarioSource, 'book', 'book scenario');
  t.equal(c.lifePointsTracked, true, 'life points tracked');
  t.equal(c.voiceInput, true, 'voice input enabled');
  t.equal(c.coinsEarned, true, 'coins earned');
  t.equal(c.characterSelection, 'name_class', 'name + class selection');
  t.equal(c.imagesPerScene, 1, '1 image per scene');
  t.equal(c.mapping, true, 'mapping enabled');
  t.equal(c.inventory, 'full', 'full inventory');
  t.equal(c.shopEnabled, true, 'shop enabled');
  t.equal(c.nftCharacters, true, 'NFT characters');
  t.equal(c.charactersTransferable, true, 'characters transferable');
  t.equal(c.logicStyle, 'gentle_guidance', 'gentle guidance logic');
  t.equal(c.playMode, 'local_input', 'local input play');
  t.equal(c.journaling, true, 'journaling enabled');
  t.equal(c.questTracker, false, 'no quest tracker');
  t.end();
});

// ════════════════════════════════════════════════════════════════════════
// 5. Digital DM mode — correct values
// ════════════════════════════════════════════════════════════════════════

test('Digital DM mode config values', function (t) {
  const d = MODE_CONFIG[GameMode.DIGITAL_DM];
  t.equal(d.maxPlayers, 6, 'up to 6 players');
  t.equal(d.savedCharacter, true, 'saved character');
  t.equal(d.freeTextInput, true, 'free text input enabled');
  t.equal(d.narrativeVoice, true, 'narrative voice enabled');
  t.equal(d.combatResolution, 'dice', 'dice combat');
  t.equal(d.narrativeStyle, 'freeform', 'freeform narrative');
  t.equal(d.reusableCharacters, true, 'reusable characters');
  t.equal(d.scenarioSource, 'book+dnd', 'books + D&D scenarios');
  t.equal(d.lifePointsTracked, true, 'life points tracked');
  t.equal(d.voiceInput, true, 'voice input enabled');
  t.equal(d.coinsEarned, true, 'coins earned');
  t.equal(d.characterSelection, 'full_dnd', 'full D&D character creation');
  t.equal(d.imagesPerScene, 3, '3 images per scene');
  t.equal(d.mapping, true, 'mapping enabled');
  t.equal(d.inventory, 'full', 'full inventory');
  t.equal(d.shopEnabled, true, 'shop enabled');
  t.equal(d.nftCharacters, true, 'NFT characters');
  t.equal(d.charactersTransferable, true, 'characters transferable');
  t.equal(d.logicStyle, 'freeform', 'freeform logic');
  t.equal(d.playMode, 'local_remote', 'local + remote play');
  t.equal(d.journaling, true, 'journaling enabled');
  t.equal(d.questTracker, true, 'quest tracker enabled');
  t.end();
});

// ════════════════════════════════════════════════════════════════════════
// 6. getModeConfig returns a copy (not the original)
// ════════════════════════════════════════════════════════════════════════

test('getModeConfig returns a shallow copy, not the original', function (t) {
  for (const mode of Object.values(GameMode)) {
    const original = MODE_CONFIG[mode];
    const copy = getModeConfig(mode);
    t.notEqual(copy, original, mode + ': returned object is not the same reference');
    t.deepEqual(copy, original, mode + ': returned object has identical values');
    // Mutating the copy must not affect the original
    copy.__mutated = true;
    t.notOk('__mutated' in MODE_CONFIG[mode], mode + ': mutation on copy does not affect original');
  }
  t.end();
});

// ════════════════════════════════════════════════════════════════════════
// 7. getModeConfig throws on invalid mode
// ════════════════════════════════════════════════════════════════════════

test('getModeConfig throws on invalid mode', function (t) {
  t.throws(function () { getModeConfig('invalid'); }, /Invalid game mode/, 'throws for "invalid"');
  t.throws(function () { getModeConfig(''); }, /Invalid game mode/, 'throws for empty string');
  t.throws(function () { getModeConfig(null); }, /Invalid game mode/, 'throws for null');
  t.throws(function () { getModeConfig(undefined); }, /Invalid game mode/, 'throws for undefined');
  t.end();
});

// ════════════════════════════════════════════════════════════════════════
// 8. getModeMeta works for all 3 modes
// ════════════════════════════════════════════════════════════════════════

test('getModeMeta returns correct metadata for all modes', function (t) {
  const expected = {
    storyline: { id: 'storyline', name: 'Storyline', icon: '📖', minPlayers: 1, maxPlayers: 1, available: true },
    campaign:  { id: 'campaign',  name: 'Campaign',  icon: '⚔️',  minPlayers: 1, maxPlayers: 1, available: true },
    digital_dm:{ id: 'digital_dm',name: 'Digital DM', icon: '🐉', minPlayers: 1, maxPlayers: 6, available: true }
  };

  for (const [mode, exp] of Object.entries(expected)) {
    const meta = getModeMeta(mode);
    t.ok(meta, mode + ' meta exists');
    t.equal(meta.id, exp.id, mode + ' id');
    t.equal(meta.name, exp.name, mode + ' name');
    t.equal(meta.icon, exp.icon, mode + ' icon');
    t.equal(meta.minPlayers, exp.minPlayers, mode + ' minPlayers');
    t.equal(meta.maxPlayers, exp.maxPlayers, mode + ' maxPlayers');
    t.equal(meta.available, exp.available, mode + ' available');
    t.ok(meta.tagline, mode + ' has tagline');
    t.ok(meta.description, mode + ' has description');
    t.ok(meta.color, mode + ' has color');
  }
  t.end();
});

test('getModeMeta returns a copy', function (t) {
  for (const mode of Object.values(GameMode)) {
    const original = MODE_META[mode];
    const copy = getModeMeta(mode);
    t.notEqual(copy, original, mode + ': not same reference');
    t.deepEqual(copy, original, mode + ': identical values');
  }
  t.end();
});

test('getModeMeta throws on invalid mode', function (t) {
  t.throws(function () { getModeMeta('bogus'); }, /Invalid game mode/, 'throws for bogus mode');
  t.end();
});

// ════════════════════════════════════════════════════════════════════════
// 9. listModes returns all 3 modes
// ════════════════════════════════════════════════════════════════════════

test('listModes returns exactly 3 modes with meta + config', function (t) {
  const modes = listModes();
  t.ok(Array.isArray(modes), 'returns an array');
  t.equal(modes.length, 3, '3 modes returned');

  const ids = modes.map(function (m) { return m.id; });
  t.ok(ids.includes('storyline'), 'includes storyline');
  t.ok(ids.includes('campaign'), 'includes campaign');
  t.ok(ids.includes('digital_dm'), 'includes digital_dm');

  for (const m of modes) {
    t.ok(m.name, m.id + ' has name');
    t.ok(m.tagline, m.id + ' has tagline');
    t.ok(m.description, m.id + ' has description');
    t.ok(m.icon, m.id + ' has icon');
    t.ok(m.config, m.id + ' has config');
    t.ok(m.config.maxPlayers !== undefined, m.id + ' config has maxPlayers');
  }
  t.end();
});

// ════════════════════════════════════════════════════════════════════════
// 10. isFeatureEnabled works for boolean and non-boolean features
// ════════════════════════════════════════════════════════════════════════

test('isFeatureEnabled: boolean features', function (t) {
  // Storyline: freeTextInput is false
  t.equal(isFeatureEnabled(GameMode.STORYLINE, 'freeTextInput'), false, 'storyline freeTextInput → false');
  // Storyline: narrativeVoice is true
  t.equal(isFeatureEnabled(GameMode.STORYLINE, 'narrativeVoice'), true, 'storyline narrativeVoice → true');
  // Campaign: coinsEarned is true
  t.equal(isFeatureEnabled(GameMode.CAMPAIGN, 'coinsEarned'), true, 'campaign coinsEarned → true');
  // Campaign: questTracker is false
  t.equal(isFeatureEnabled(GameMode.CAMPAIGN, 'questTracker'), false, 'campaign questTracker → false');
  // Digital DM: questTracker is true
  t.equal(isFeatureEnabled(GameMode.DIGITAL_DM, 'questTracker'), true, 'digital_dm questTracker → true');
  t.end();
});

test('isFeatureEnabled: numeric features (imagesPerScene)', function (t) {
  t.equal(isFeatureEnabled(GameMode.STORYLINE, 'imagesPerScene'), true, 'storyline imagesPerScene=1 → true');
  t.equal(isFeatureEnabled(GameMode.DIGITAL_DM, 'imagesPerScene'), true, 'digital_dm imagesPerScene=3 → true');
  t.end();
});

test('isFeatureEnabled: string features', function (t) {
  t.equal(isFeatureEnabled(GameMode.STORYLINE, 'combatResolution'), true, 'storyline combatResolution="narrative" → truthy');
  t.equal(isFeatureEnabled(GameMode.CAMPAIGN, 'characterSelection'), true, 'campaign characterSelection="name_class" → truthy');
  t.end();
});

test('isFeatureEnabled: invalid mode returns false', function (t) {
  t.equal(isFeatureEnabled('bogus', 'freeTextInput'), false, 'invalid mode → false');
  t.end();
});

test('isFeatureEnabled: missing feature returns false', function (t) {
  t.equal(isFeatureEnabled(GameMode.STORYLINE, 'nonExistentFeature'), false, 'missing feature → false');
  t.end();
});

// ════════════════════════════════════════════════════════════════════════
// 11. getUIConfig returns correct UI flags for each mode
// ════════════════════════════════════════════════════════════════════════

test('getUIConfig: Storyline mode — minimal UI', function (t) {
  const ui = getUIConfig(GameMode.STORYLINE);
  t.equal(ui.showHpBar, false, 'no HP bar');
  t.equal(ui.showCoinBar, false, 'no coin bar');
  t.equal(ui.showInventoryPanel, false, 'no inventory panel');
  t.equal(ui.showShopButton, false, 'no shop button');
  t.equal(ui.showMapPanel, false, 'no map panel');
  t.equal(ui.showJournalButton, false, 'no journal button');
  t.equal(ui.showQuestTracker, false, 'no quest tracker');
  t.equal(ui.showCharacterSheet, false, 'no character sheet');
  t.equal(ui.showVoiceInputButton, false, 'no voice input button');
  t.equal(ui.showFreeTextEntry, false, 'no free text entry');
  t.equal(ui.showDiceRoller, false, 'no dice roller');
  t.equal(ui.allowClassSelection, false, 'no class selection');
  t.equal(ui.allowRaceSelection, false, 'no race selection');
  t.equal(ui.showMultiplayerLobby, false, 'no multiplayer lobby');
  t.equal(ui.showSpectatorMode, false, 'no spectator mode');
  t.equal(ui.maxPlayers, 1, 'maxPlayers 1');
  t.equal(ui.imagesPerScene, 1, '1 image per scene');
  t.equal(ui.combatResolution, 'narrative', 'narrative combat');
  t.equal(ui.characterSelection, 'name_only', 'name-only character');
  t.equal(ui.playMode, 'local_narrative', 'local narrative play');
  t.end();
});

test('getUIConfig: Campaign mode — moderate UI', function (t) {
  const ui = getUIConfig(GameMode.CAMPAIGN);
  t.equal(ui.showHpBar, true, 'HP bar shown');
  t.equal(ui.showCoinBar, true, 'coin bar shown');
  t.equal(ui.showInventoryPanel, true, 'inventory panel shown');
  t.equal(ui.showShopButton, true, 'shop button shown');
  t.equal(ui.showMapPanel, true, 'map panel shown');
  t.equal(ui.showJournalButton, true, 'journal button shown');
  t.equal(ui.showQuestTracker, false, 'no quest tracker');
  t.equal(ui.showCharacterSheet, true, 'character sheet shown');
  t.equal(ui.showVoiceInputButton, true, 'voice input button shown');
  t.equal(ui.showFreeTextEntry, true, 'free text entry shown');
  t.equal(ui.showDiceRoller, true, 'dice roller shown');
  t.equal(ui.allowClassSelection, true, 'class selection allowed');
  t.equal(ui.allowRaceSelection, true, 'race selection allowed');
  t.equal(ui.showMultiplayerLobby, false, 'no multiplayer lobby');
  t.equal(ui.showSpectatorMode, false, 'no spectator mode');
  t.equal(ui.maxPlayers, 1, 'maxPlayers 1');
  t.equal(ui.combatResolution, 'dice', 'dice combat');
  t.equal(ui.characterSelection, 'name_class', 'name+class selection');
  t.equal(ui.playMode, 'local_input', 'local input play');
  t.end();
});

test('getUIConfig: Digital DM mode — full UI', function (t) {
  const ui = getUIConfig(GameMode.DIGITAL_DM);
  t.equal(ui.showHpBar, true, 'HP bar shown');
  t.equal(ui.showCoinBar, true, 'coin bar shown');
  t.equal(ui.showInventoryPanel, true, 'inventory panel shown');
  t.equal(ui.showShopButton, true, 'shop button shown');
  t.equal(ui.showMapPanel, true, 'map panel shown');
  t.equal(ui.showJournalButton, true, 'journal button shown');
  t.equal(ui.showQuestTracker, true, 'quest tracker shown');
  t.equal(ui.showCharacterSheet, true, 'character sheet shown');
  t.equal(ui.showVoiceInputButton, true, 'voice input button shown');
  t.equal(ui.showFreeTextEntry, true, 'free text entry shown');
  t.equal(ui.showDiceRoller, true, 'dice roller shown');
  t.equal(ui.allowClassSelection, true, 'class selection allowed');
  t.equal(ui.allowRaceSelection, true, 'race selection allowed');
  t.equal(ui.showMultiplayerLobby, true, 'multiplayer lobby shown');
  t.equal(ui.showSpectatorMode, true, 'spectator mode shown');
  t.equal(ui.maxPlayers, 6, 'maxPlayers 6');
  t.equal(ui.imagesPerScene, 3, '3 images per scene');
  t.equal(ui.combatResolution, 'dice', 'dice combat');
  t.equal(ui.characterSelection, 'full_dnd', 'full D&D character');
  t.equal(ui.playMode, 'local_remote', 'local+remote play');
  t.end();
});

test('getUIConfig throws on invalid mode', function (t) {
  t.throws(function () { getUIConfig('bogus'); }, /Invalid game mode/, 'throws for bogus mode');
  t.end();
});

// ════════════════════════════════════════════════════════════════════════
// 12. isValidMode works
// ════════════════════════════════════════════════════════════════════════

test('isValidMode: valid modes return true', function (t) {
  t.equal(isValidMode('storyline'), true, 'storyline is valid');
  t.equal(isValidMode('campaign'), true, 'campaign is valid');
  t.equal(isValidMode('digital_dm'), true, 'digital_dm is valid');
  t.end();
});

test('isValidMode: invalid modes return false', function (t) {
  t.equal(isValidMode('bogus'), false, 'bogus is invalid');
  t.equal(isValidMode(''), false, 'empty string is invalid');
  t.equal(isValidMode('STORYLINE'), false, 'case-sensitive: STORYLINE is invalid');
  t.equal(isValidMode(null), false, 'null is invalid');
  t.equal(isValidMode(undefined), false, 'undefined is invalid');
  t.equal(isValidMode(42), false, 'number is invalid');
  t.end();
});

// ════════════════════════════════════════════════════════════════════════
// 13. Feature progression: Storyline < Campaign < Digital DM
// ════════════════════════════════════════════════════════════════════════

test('Feature progression: boolean true count increases per tier', function (t) {
  function countBooleans(cfg) {
    return Object.values(cfg).filter(function (v) { return v === true; }).length;
  }
  const storylineBools = countBooleans(MODE_CONFIG[GameMode.STORYLINE]);
  const campaignBools  = countBooleans(MODE_CONFIG[GameMode.CAMPAIGN]);
  const digitalBools   = countBooleans(MODE_CONFIG[GameMode.DIGITAL_DM]);

  t.ok(campaignBools > storylineBools,
    'Campaign (' + campaignBools + ') has more true flags than Storyline (' + storylineBools + ')');
  t.ok(digitalBools > campaignBools,
    'Digital DM (' + digitalBools + ') has more true flags than Campaign (' + campaignBools + ')');
  t.ok(digitalBools > storylineBools,
    'Digital DM (' + digitalBools + ') has more true flags than Storyline (' + storylineBools + ')');
  t.end();
});

test('Feature progression: specific features unlock at each tier', function (t) {
  // Storyline has the fewest features
  t.equal(isFeatureEnabled(GameMode.STORYLINE, 'freeTextInput'), false, 'storyline: no free text');
  t.equal(isFeatureEnabled(GameMode.STORYLINE, 'coinsEarned'), false, 'storyline: no coins');
  t.equal(isFeatureEnabled(GameMode.STORYLINE, 'lifePointsTracked'), false, 'storyline: no HP');
  t.equal(isFeatureEnabled(GameMode.STORYLINE, 'questTracker'), false, 'storyline: no quest tracker');

  // Campaign adds free text, coins, HP, but not quest tracker or reusable chars
  t.equal(isFeatureEnabled(GameMode.CAMPAIGN, 'freeTextInput'), true, 'campaign: free text unlocked');
  t.equal(isFeatureEnabled(GameMode.CAMPAIGN, 'coinsEarned'), true, 'campaign: coins unlocked');
  t.equal(isFeatureEnabled(GameMode.CAMPAIGN, 'lifePointsTracked'), true, 'campaign: HP unlocked');
  t.equal(isFeatureEnabled(GameMode.CAMPAIGN, 'questTracker'), false, 'campaign: no quest tracker yet');
  t.equal(isFeatureEnabled(GameMode.CAMPAIGN, 'reusableCharacters'), false, 'campaign: no reusable chars yet');

  // Digital DM adds quest tracker, reusable chars, multiplayer
  t.equal(isFeatureEnabled(GameMode.DIGITAL_DM, 'questTracker'), true, 'digital_dm: quest tracker unlocked');
  t.equal(isFeatureEnabled(GameMode.DIGITAL_DM, 'reusableCharacters'), true, 'digital_dm: reusable chars unlocked');
  t.equal(isFeatureEnabled(GameMode.DIGITAL_DM, 'showMultiplayerLobby'), true, 'digital_dm: multiplayer unlocked');
  t.equal(isFeatureEnabled(GameMode.DIGITAL_DM, 'showSpectatorMode'), true, 'digital_dm: spectator mode unlocked');
  t.end();
});

// ════════════════════════════════════════════════════════════════════════
// 14. All modes have narrativeVoice: true (feature #5)
// ════════════════════════════════════════════════════════════════════════

test('All modes have narrativeVoice: true', function (t) {
  for (const mode of Object.values(GameMode)) {
    t.equal(MODE_CONFIG[mode].narrativeVoice, true, mode + ' narrativeVoice is true');
    t.equal(isFeatureEnabled(mode, 'narrativeVoice'), true, mode + ' isFeatureEnabled(narrativeVoice) is true');
  }
  t.end();
});

// ════════════════════════════════════════════════════════════════════════
// 15. Only Digital DM allows more than 1 player
// ════════════════════════════════════════════════════════════════════════

test('Only Digital DM allows more than 1 player', function (t) {
  t.equal(MODE_CONFIG[GameMode.STORYLINE].maxPlayers, 1, 'storyline: maxPlayers = 1');
  t.equal(MODE_CONFIG[GameMode.CAMPAIGN].maxPlayers, 1, 'campaign: maxPlayers = 1');
  t.equal(MODE_CONFIG[GameMode.DIGITAL_DM].maxPlayers, 6, 'digital_dm: maxPlayers = 6');

  // Also verify via getUIConfig
  t.equal(getUIConfig(GameMode.STORYLINE).maxPlayers, 1, 'UI: storyline maxPlayers = 1');
  t.equal(getUIConfig(GameMode.CAMPAIGN).maxPlayers, 1, 'UI: campaign maxPlayers = 1');
  t.equal(getUIConfig(GameMode.DIGITAL_DM).maxPlayers, 6, 'UI: digital_dm maxPlayers = 6');
  t.end();
});

// ════════════════════════════════════════════════════════════════════════
// 16. Additional behavior flags consistency
// ════════════════════════════════════════════════════════════════════════

test('Storyline uses story engine, not LLM for actions', function (t) {
  const s = MODE_CONFIG[GameMode.STORYLINE];
  t.equal(s.useStoryEngine, true, 'uses story engine');
  t.equal(s.useLLMForNarrative, true, 'LLM narrates');
  t.equal(s.useLLMForActions, false, 'LLM does not process actions');
  t.end();
});

test('Campaign and Digital DM use LLM for actions, not story engine', function (t) {
  for (const mode of [GameMode.CAMPAIGN, GameMode.DIGITAL_DM]) {
    const cfg = MODE_CONFIG[mode];
    t.equal(cfg.useStoryEngine, false, mode + ': does not use story engine');
    t.equal(cfg.useLLMForNarrative, true, mode + ': LLM narrates');
    t.equal(cfg.useLLMForActions, true, mode + ': LLM processes actions');
  }
  t.end();
});

test('MODE_META has all 3 entries matching GameMode values', function (t) {
  const metaKeys = Object.keys(MODE_META);
  t.equal(metaKeys.length, 3, '3 meta entries');
  for (const mode of Object.values(GameMode)) {
    t.ok(MODE_META[mode], mode + ' has meta entry');
    t.equal(MODE_META[mode].id, mode, mode + ' meta.id matches key');
  }
  t.end();
});
