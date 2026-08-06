/**
 * Game Mode Configuration — The Binding
 *
 * Defines the three game modes (Storyline, Campaign, Digital DM) and their
 * feature flags based on the 23-feature matrix from the-binding-matrix.md.
 *
 * This is the single source of truth for what each mode supports.
 * Server routes and frontend query this module to gate behavior.
 */

// ─── MODE ENUM ────────────────────────────────────────────────────

const GameMode = Object.freeze({
  STORYLINE: 'storyline',
  CAMPAIGN: 'campaign',
  DIGITAL_DM: 'digital_dm'
});

// ─── FEATURE FLAGS PER MODE ───────────────────────────────────────
//
// Each feature maps directly to one of the 23 rows in the matrix.
// Boolean flags enable/disable features; string/enum values control behavior.

const MODE_CONFIG = {
  [GameMode.STORYLINE]: {
    // #1 — Summary: tap-to-act guided book storyline
    summary: 'Follows the book storyline via prompt-and-response. Tap-to-act style.',

    // #2 — Players
    maxPlayers: 1,

    // #3 — Saved character
    savedCharacter: false,

    // #4 — Text input & AI response
    freeTextInput: false,

    // #5 — Narrative voice option (TTS read-aloud)
    narrativeVoice: true,

    // #6 — Combat resolution: narrative selections, not dice
    combatResolution: 'narrative', // 'narrative' | 'dice'

    // #7 — Action narratives: predetermined path, AI spices up text
    narrativeStyle: 'predetermined', // 'predetermined' | 'flexible' | 'freeform'

    // #8 — Reusable / saved characters across adventures
    reusableCharacters: false,

    // #9 — Scenario or theme: select a book
    scenarioSource: 'book', // 'book' | 'book+dnd'

    // #10 — Life points tracked
    lifePointsTracked: false,

    // #11 — Voice input option (speech-to-text)
    voiceInput: false,

    // #12 — $Binding Coins earned
    coinsEarned: false,

    // #13 — Character selection: name only
    characterSelection: 'name_only', // 'name_only' | 'name_class' | 'full_dnd'

    // #14 — Visuals: 1 AI image per scene
    imagesPerScene: 1,

    // #15 — Mapping
    mapping: false,

    // #16 — Inventory: predetermined storyline items only
    inventory: 'predetermined', // 'predetermined' | 'full'

    // #17 — Shop (buy/sell)
    shopEnabled: false,

    // #18 — Character NFTs
    nftCharacters: false,

    // #19 — Characters transferable
    charactersTransferable: false,

    // #20 — Logic: guided predetermined scenes, physical logistics
    logicStyle: 'guided', // 'guided' | 'gentle_guidance' | 'freeform'

    // #21 — Play mode: local PC/mobile, listen to narrative
    playMode: 'local_narrative', // 'local_narrative' | 'local_input' | 'local_remote'

    // #22 — Journaling
    journaling: false,

    // #23 — Quest tracker
    questTracker: false,

    // Additional behavior flags derived from the matrix
    showHpBar: false,
    showCoinBar: false,
    showInventoryPanel: false,
    showShopButton: false,
    showMapPanel: false,
    showJournalButton: false,
    showQuestTracker: false,
    showCharacterSheet: false,
    showVoiceInputButton: false,
    showFreeTextEntry: false,
    showDiceRoller: false,
    allowClassSelection: false,
    allowRaceSelection: false,
    showMultiplayerLobby: false,
    showSpectatorMode: false,
    useStoryEngine: true,  // Uses the deterministic story-engine.js button processor
    useLLMForNarrative: true, // AI spices up the predetermined text
    useLLMForActions: false,  // No free-form LLM action processing
  },

  [GameMode.CAMPAIGN]: {
    // #1 — Summary
    summary: 'Book storyline + D&D elements + prompt/response + free form text. Tap-to-act.',

    // #2 — Players
    maxPlayers: 1,

    // #3 — Saved character
    savedCharacter: true,

    // #4 — Text input & AI response
    freeTextInput: true,

    // #5 — Narrative voice option
    narrativeVoice: true,

    // #6 — Combat resolution: D&D dice roll
    combatResolution: 'dice',

    // #7 — Action narratives: predetermined path with more flexibility
    narrativeStyle: 'flexible',

    // #8 — Reusable / saved characters
    reusableCharacters: false,

    // #9 — Scenario or theme: select a book
    scenarioSource: 'book',

    // #10 — Life points tracked
    lifePointsTracked: true,

    // #11 — Voice input option
    voiceInput: true,

    // #12 — $Binding Coins earned
    coinsEarned: true,

    // #13 — Character selection: name + class w/ 2 D&D abilities
    characterSelection: 'name_class',

    // #14 — Visuals: 1 AI image per scene
    imagesPerScene: 1,

    // #15 — Mapping
    mapping: true,

    // #16 — Inventory
    inventory: 'full',

    // #17 — Shop (buy/sell)
    shopEnabled: true,

    // #18 — Character NFTs
    nftCharacters: true,

    // #19 — Characters transferable
    charactersTransferable: true,

    // #20 — Logic: free form with gentle guidance, logical path
    logicStyle: 'gentle_guidance',

    // #21 — Play mode: local, text or voice input
    playMode: 'local_input',

    // #22 — Journaling
    journaling: true,

    // #23 — Quest tracker
    questTracker: false,

    // Additional behavior flags
    showHpBar: true,
    showCoinBar: true,
    showInventoryPanel: true,
    showShopButton: true,
    showMapPanel: true,
    showJournalButton: true,
    showQuestTracker: false,
    showCharacterSheet: true,
    showVoiceInputButton: true,
    showFreeTextEntry: true,
    showDiceRoller: true,
    allowClassSelection: true,
    allowRaceSelection: true,
    showMultiplayerLobby: false,
    showSpectatorMode: false,
    useStoryEngine: false,
    useLLMForNarrative: true,
    useLLMForActions: true,
  },

  [GameMode.DIGITAL_DM]: {
    // #1 — Summary
    summary: 'Full DM — books & D&D scenarios. Tap-to-act, free form text & voice. Long-term quest/goal.',

    // #2 — Players: 1-6
    maxPlayers: 6,

    // #3 — Saved character
    savedCharacter: true,

    // #4 — Text input & AI response
    freeTextInput: true,

    // #5 — Narrative voice option
    narrativeVoice: true,

    // #6 — Combat resolution: D&D dice roll
    combatResolution: 'dice',

    // #7 — Action narratives: D&D style + free form + interactive AI
    narrativeStyle: 'freeform',

    // #8 — Reusable / saved characters
    reusableCharacters: true,

    // #9 — Scenario or theme: books + D&D scenarios
    scenarioSource: 'book+dnd',

    // #10 — Life points tracked
    lifePointsTracked: true,

    // #11 — Voice input option
    voiceInput: true,

    // #12 — $Binding Coins earned
    coinsEarned: true,

    // #13 — Character selection: full D&D character creation
    characterSelection: 'full_dnd',

    // #14 — Visuals: multiple AI images per scene
    imagesPerScene: 3,

    // #15 — Mapping
    mapping: true,

    // #16 — Inventory
    inventory: 'full',

    // #17 — Shop (buy/sell)
    shopEnabled: true,

    // #18 — Character NFTs
    nftCharacters: true,

    // #19 — Characters transferable
    charactersTransferable: true,

    // #20 — Logic: total free form, nudges toward quest, increasing stakes
    logicStyle: 'freeform',

    // #21 — Play mode: local (same room, voice recognition) or remote
    playMode: 'local_remote',

    // #22 — Journaling
    journaling: true,

    // #23 — Quest tracker
    questTracker: true,

    // Additional behavior flags
    showHpBar: true,
    showCoinBar: true,
    showInventoryPanel: true,
    showShopButton: true,
    showMapPanel: true,
    showJournalButton: true,
    showQuestTracker: true,
    showCharacterSheet: true,
    showVoiceInputButton: true,
    showFreeTextEntry: true,
    showDiceRoller: true,
    allowClassSelection: true,
    allowRaceSelection: true,
    showMultiplayerLobby: true,
    showSpectatorMode: true,
    useStoryEngine: false,
    useLLMForNarrative: true,
    useLLMForActions: true,
  }
};

// ─── MODE METADATA ────────────────────────────────────────────────

const MODE_META = {
  [GameMode.STORYLINE]: {
    id: GameMode.STORYLINE,
    name: 'Storyline',
    tagline: 'Follow the book. Tap to act.',
    description: 'Experience classic novels through guided, tap-to-act gameplay. The story follows the book with AI-enhanced narration. No dice, no stats — just the story.',
    icon: '📖',
    color: '#8B4513',
    minPlayers: 1,
    maxPlayers: 1,
    available: true
  },
  [GameMode.CAMPAIGN]: {
    id: GameMode.CAMPAIGN,
    name: 'Campaign',
    tagline: 'The book, with D&D under the hood.',
    description: 'Play through classic stories with full D&D mechanics — dice rolls, character classes, abilities, inventory, and coin rewards. Single-player with deeper gameplay.',
    icon: '⚔️',
    color: '#C9A84C',
    minPlayers: 1,
    maxPlayers: 1,
    available: true
  },
  [GameMode.DIGITAL_DM]: {
    id: GameMode.DIGITAL_DM,
    name: 'Digital DM',
    tagline: 'Full dungeon master. Books & beyond.',
    description: 'The complete AI Dungeon Master experience. Play books or original D&D scenarios with 1-6 players. Voice input, reusable characters, quest tracking, and more.',
    icon: '🐉',
    color: '#6B5CE7',
    minPlayers: 1,
    maxPlayers: 6,
    available: true
  }
};

// ─── HELPER FUNCTIONS ─────────────────────────────────────────────

/**
 * Get the full configuration for a game mode.
 * @param {string} mode — one of GameMode.STORYLINE | CAMPAIGN | DIGITAL_DM
 * @returns {object} mode config with all feature flags
 */
function getModeConfig(mode) {
  const config = MODE_CONFIG[mode];
  if (!config) {
    throw new Error(`Invalid game mode: ${mode}. Must be one of: ${Object.values(GameMode).join(', ')}`);
  }
  return { ...config };
}

/**
 * Get metadata for a game mode (name, description, icon).
 * @param {string} mode
 * @returns {object}
 */
function getModeMeta(mode) {
  const meta = MODE_META[mode];
  if (!meta) {
    throw new Error(`Invalid game mode: ${mode}`);
  }
  return { ...meta };
}

/**
 * List all available game modes with their metadata.
 * @returns {Array<object>}
 */
function listModes() {
  return Object.values(GameMode).map(mode => ({
    ...MODE_META[mode],
    config: MODE_CONFIG[mode]
  }));
}

/**
 * Check if a specific feature is enabled for a mode.
 * @param {string} mode
 * @param {string} feature — feature flag name
 * @returns {boolean}
 */
function isFeatureEnabled(mode, feature) {
  const config = MODE_CONFIG[mode];
  if (!config) return false;
  const value = config[feature];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  return !!value;
}

/**
 * Get the UI configuration for a mode (what UI elements to show/hide).
 * @param {string} mode
 * @returns {object} UI flags
 */
function getUIConfig(mode) {
  const config = MODE_CONFIG[mode];
  if (!config) throw new Error(`Invalid game mode: ${mode}`);

  return {
    showHpBar: config.showHpBar,
    showCoinBar: config.showCoinBar,
    showInventoryPanel: config.showInventoryPanel,
    showShopButton: config.showShopButton,
    showMapPanel: config.showMapPanel,
    showJournalButton: config.showJournalButton,
    showQuestTracker: config.showQuestTracker,
    showCharacterSheet: config.showCharacterSheet,
    showVoiceInputButton: config.showVoiceInputButton,
    showFreeTextEntry: config.showFreeTextEntry,
    showDiceRoller: config.showDiceRoller,
    allowClassSelection: config.allowClassSelection,
    allowRaceSelection: config.allowRaceSelection,
    showMultiplayerLobby: config.showMultiplayerLobby,
    showSpectatorMode: config.showSpectatorMode,
    maxPlayers: config.maxPlayers,
    imagesPerScene: config.imagesPerScene,
    combatResolution: config.combatResolution,
    characterSelection: config.characterSelection,
    playMode: config.playMode,
  };
}

/**
 * Validate a mode string.
 * @param {string} mode
 * @returns {boolean}
 */
function isValidMode(mode) {
  return Object.values(GameMode).includes(mode);
}

// ─── EXPORTS ──────────────────────────────────────────────────────

module.exports = {
  GameMode,
  MODE_CONFIG,
  MODE_META,
  getModeConfig,
  getModeMeta,
  listModes,
  isFeatureEnabled,
  getUIConfig,
  isValidMode
};
