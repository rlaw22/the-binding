/**
 * Digital DM Mode — Open-ended AI-driven play scaffolding.
 *
 * Digital DM Mode is the third game mode alongside Storyline (curated adventures)
 * and Campaign (multiplayer with human DM). In Digital DM Mode, the AI DM creates
 * EVERYTHING live — no curated content, no human DM. Pure sandbox improvisation.
 *
 * This module provides the scaffolding: mode configuration, prompt overrides,
 * and the "no rails" behavior that distinguishes it from Campaign Mode.
 */

const { CAMPAIGN_THEMES } = require('./index');

// Digital DM mode configuration
const DIGITAL_DM_CONFIG = {
  id: 'digital_dm',
  name: 'Digital DM',
  description: 'Open-ended AI-driven play. No curated adventure required — the AI DM creates everything live.',
  maxPlayers: 6,
  minPlayers: 1,
  dmType: 'ai', // always AI — no human DM option
  sessionModel: 'sandbox', // no scene graph, no quest rails

  // AI DM behavior overrides for Digital DM mode
  dmBehavior: {
    // The AI DM has full creative freedom — no scene constraints
    sceneConstraints: false,
    // Quest generation is entirely AI-driven
    questGeneration: 'dynamic', // vs 'template' in Campaign
    // NPC generation is on-the-fly
    npcGeneration: 'on_the_fly',
    // World persistence is critical — everything the AI creates must be tracked
    worldPersistence: 'strict',
    // Combat can happen anywhere, anytime
    combatFrequency: 'narrative', // triggered by story, not by location
    // The AI DM can create locations, NPCs, items, and quests without limits
    creationFreedom: 'unlimited'
  },

  // Prompt overrides — Digital DM needs different prompting than Campaign
  promptOverrides: {
    // Emphasize improvisation and player agency
    systemPromptSuffix: `
You are running in DIGITAL DM MODE — pure sandbox, no rails.
- You create EVERYTHING: locations, NPCs, quests, encounters, storylines
- There is no pre-written content — you ARE the content
- Build on what the player does — every action creates new possibilities
- Maintain consistency with everything you've created (track your own world state)
- Escalate stakes naturally — start small, build to epic
- The player can go ANYWHERE and do ANYTHING — say yes, and...
- When in doubt, add detail rather than restricting options`,

    // World generation is more aggressive in Digital DM
    worldBuildingPrompt: `You are generating a COMPLETE WORLD for a sandbox D&D 5e session.
No pre-written content exists — you are creating everything from scratch.
Generate a starting location with rich detail, 2-3 NPCs with distinct personalities,
and 2-3 potential adventure hooks. Make it feel alive and full of possibility.`,

    // Combat is more dramatic in Digital DM
    combatPrompt: `This is a Digital DM session — combat should feel dramatic and consequential.
Every fight should matter. Enemies should have motivations. Victory should feel earned.
Describe combat cinematically — this is the player's story.`
  }
};

/**
 * Create a Digital DM session.
 * Similar to campaign creation but with Digital DM-specific config.
 */
function createDigitalDMSession(options = {}) {
  const { createCampaignSession } = require('./index');

  // Digital DM uses the campaign session as base, with overrides
  const session = createCampaignSession({
    theme: options.theme || 'custom',
    sessionName: options.sessionName || 'Digital DM Session',
    maxPlayers: options.maxPlayers || DIGITAL_DM_CONFIG.maxPlayers,
    customDescription: options.customDescription || 'A world of infinite possibility.'
  });

  // Override mode
  session.mode = 'digital_dm';

  // Add Digital DM-specific config
  session.digitalDM = {
    ...DIGITAL_DM_CONFIG.dmBehavior,
    worldSeed: options.worldSeed || null,
    improvisationLevel: options.improvisationLevel || 'high', // low, medium, high
    combatFrequency: options.combatFrequency || 'narrative',
    tonePreference: options.tonePreference || 'adaptive' // adaptive, dark, light, humorous
  };

  return session;
}

/**
 * Get the Digital DM system prompt suffix.
 * Appended to the base campaign system prompt.
 */
function getDigitalDMPromptSuffix() {
  return DIGITAL_DM_CONFIG.promptOverrides.systemPromptSuffix;
}

/**
 * Get the Digital DM world building prompt.
 */
function getDigitalDMWorldPrompt() {
  return DIGITAL_DM_CONFIG.promptOverrides.worldBuildingPrompt;
}

/**
 * Get the Digital DM combat prompt.
 */
function getDigitalDMCombatPrompt() {
  return DIGITAL_DM_CONFIG.promptOverrides.combatPrompt;
}

/**
 * Check if a session is Digital DM mode.
 */
function isDigitalDM(session) {
  return session.mode === 'digital_dm' || session.mode === 'digital-dm';
}

/**
 * Get Digital DM mode info for display.
 */
function getDigitalDMInfo() {
  return {
    id: DIGITAL_DM_CONFIG.id,
    name: DIGITAL_DM_CONFIG.name,
    description: DIGITAL_DM_CONFIG.description,
    maxPlayers: DIGITAL_DM_CONFIG.maxPlayers,
    dmType: DIGITAL_DM_CONFIG.dmType,
    features: [
      'AI creates everything live — no pre-written content',
      'Full sandbox — go anywhere, do anything',
      'Dynamic world generation and NPC creation',
      'Escalating stakes and emergent storytelling',
      'Works for 1-6 players (AI DM handles all)'
    ]
  };
}

module.exports = {
  DIGITAL_DM_CONFIG,
  createDigitalDMSession,
  getDigitalDMPromptSuffix,
  getDigitalDMWorldPrompt,
  getDigitalDMCombatPrompt,
  isDigitalDM,
  getDigitalDMInfo
};
