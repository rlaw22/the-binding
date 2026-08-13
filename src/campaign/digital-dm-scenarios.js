/**
 * Digital DM Scenarios — Scenario registry for Digital DM mode.
 *
 * Provides a catalog of available scenarios (themes + adventures) that players
 * can choose from when starting a Digital DM session. Themes use world-builder.js
 * to generate structured starting worlds; adventures use scene graphs where available.
 */

const fs = require('fs');
const path = require('path');

// ============================================================
// SCENARIO DEFINITIONS
// ============================================================

const SCENARIOS = {
  themes: [
    {
      id: 'gothic_horror',
      type: 'theme',
      name: 'Gothic Horror',
      description: 'Dark villages, haunted forests, vampire lords. A world of shadows and dread.',
      levelRange: { min: 1, max: 6, label: 'Levels 1–6' },
      tags: ['horror', 'gothic', 'supernatural'],
      icon: '🦇',
      worldBuilderTemplate: 'gothic_horror'
    },
    {
      id: 'sword_coast',
      type: 'theme',
      name: 'Sword Coast',
      description: 'Classic D&D frontier — dungeons, dragons, heroes for hire.',
      levelRange: { min: 1, max: 8, label: 'Levels 1–8' },
      tags: ['fantasy', 'adventure', 'classic'],
      icon: '⚔️',
      worldBuilderTemplate: 'sword_coast'
    },
    {
      id: 'noir_mystery',
      type: 'theme',
      name: 'Noir Mystery',
      description: 'Urban intrigue, thieves guilds, political corruption.',
      levelRange: { min: 1, max: 6, label: 'Levels 1–6' },
      tags: ['mystery', 'urban', 'intrigue'],
      icon: '🔍',
      worldBuilderTemplate: 'noir_mystery'
    },
    {
      id: 'wilderness_expedition',
      type: 'theme',
      name: 'Wilderness Expedition',
      description: 'Exploration, ruins, ancient civilizations.',
      levelRange: { min: 1, max: 6, label: 'Levels 1–6' },
      tags: ['exploration', 'wilderness', 'discovery'],
      icon: '🗺️',
      worldBuilderTemplate: 'wilderness_expedition'
    }
  ],

  adventures: [
    {
      id: 'dracula',
      type: 'adventure',
      name: 'Dracula',
      description: 'The classic tale of terror. Uncover the dark secret of Castle Dracula.',
      levelRange: { min: 1, max: 5, label: 'Levels 1–5' },
      tags: ['gothic', 'horror', 'vampire'],
      icon: '🧛',
      status: 'ready',
      source: 'Bram Stoker',
      estimatedLength: '8-12 hours'
    },
    {
      id: 'frankenstein',
      type: 'adventure',
      name: 'Frankenstein',
      description: 'A scientist\'s creation turns deadly. Hunt the monster across Europe.',
      levelRange: { min: 1, max: 5, label: 'Levels 1–5' },
      tags: ['gothic', 'horror', 'science'],
      icon: '⚡',
      status: 'ready',
      source: 'Mary Shelley',
      estimatedLength: '8-12 hours'
    },
    {
      id: 'holmes',
      type: 'adventure',
      name: 'Sherlock Holmes',
      description: 'Mystery and deduction in Victorian London. Solve the unsolvable.',
      levelRange: { min: 1, max: 5, label: 'Levels 1–5' },
      tags: ['mystery', 'deduction', 'victorian'],
      icon: '🔎',
      status: 'ready',
      source: 'Arthur Conan Doyle',
      estimatedLength: '8-12 hours'
    },
    {
      id: 'lost_mine',
      type: 'adventure',
      name: 'Lost Mine of Phandelver',
      description: 'Rescue a kidnapped merchant from goblins and uncover a lost magical forge.',
      levelRange: { min: 1, max: 5, label: 'Levels 1–5' },
      tags: ['dungeon', 'exploration', 'rescue'],
      icon: '⛏️',
      status: 'manifest_ready',
      source: 'WotC Starter Set',
      estimatedLength: '10-15 hours'
    },
    {
      id: 'death_house',
      type: 'adventure',
      name: 'Death House',
      description: 'A haunted house with a dark secret. Gothic horror one-shot.',
      levelRange: { min: 1, max: 3, label: 'Levels 1–3' },
      tags: ['horror', 'one-shot', 'dungeon'],
      icon: '🏚️',
      status: 'coming_soon',
      source: 'Curse of Strahd Intro',
      estimatedLength: '3-5 hours'
    },
    {
      id: 'most_potent_brew',
      type: 'adventure',
      name: 'A Most Potent Brew',
      description: 'A simple one-shot: clear the basement of a brewery infested with giant rats.',
      levelRange: { min: 1, max: 1, label: 'Level 1' },
      tags: ['one-shot', 'beginner', 'comedy'],
      icon: '🍺',
      status: 'coming_soon',
      source: 'Winghorn Press',
      estimatedLength: '2-3 hours'
    },
    {
      id: 'wild_sheep_chase',
      type: 'adventure',
      name: 'A Wild Sheep Chase',
      description: 'A wizard\'s spell goes wrong — a sheep asks for your help. Absurd and fun.',
      levelRange: { min: 4, max: 5, label: 'Levels 4–5' },
      tags: ['comedy', 'one-shot', 'magic'],
      icon: '🐑',
      status: 'coming_soon',
      source: 'Winghorn Press',
      estimatedLength: '3-4 hours'
    },
    {
      id: 'moon_over_graymoor',
      type: 'adventure',
      name: 'Moon Over Graymoor',
      description: 'A mystery in a village where not everything is as it seems.',
      levelRange: { min: 1, max: 3, label: 'Levels 1–3' },
      tags: ['mystery', 'horror', 'village'],
      icon: '🌙',
      status: 'coming_soon',
      source: 'DMs Guild',
      estimatedLength: '4-6 hours'
    },
    {
      id: 'sunken_temple',
      type: 'adventure',
      name: 'Secrets of the Sunken Temple',
      description: 'Explore an ancient temple submerged beneath the waves.',
      levelRange: { min: 1, max: 4, label: 'Levels 1–4' },
      tags: ['dungeon', 'exploration', 'underwater'],
      icon: '🏛️',
      status: 'coming_soon',
      source: 'Kassoon',
      estimatedLength: '5-7 hours'
    }
  ]
};

// ============================================================
// SCENARIO LOOKUP FUNCTIONS
// ============================================================

/**
 * List all available Digital DM scenarios, grouped by type.
 * Returns { themes: [...], adventures: [...] }
 */
function listDigitalDMScenarios() {
  return {
    themes: SCENARIOS.themes.map(s => ({
      id: s.id,
      type: s.type,
      name: s.name,
      description: s.description,
      levelRange: s.levelRange,
      tags: s.tags,
      icon: s.icon,
      status: 'ready'
    })),
    adventures: SCENARIOS.adventures.map(s => ({
      id: s.id,
      type: s.type,
      name: s.name,
      description: s.description,
      levelRange: s.levelRange,
      tags: s.tags,
      icon: s.icon,
      status: s.status,
      source: s.source,
      estimatedLength: s.estimatedLength
    }))
  };
}

/**
 * Get a specific scenario by ID.
 * Searches both themes and adventures.
 */
function getDigitalDMScenario(scenarioId) {
  const theme = SCENARIOS.themes.find(s => s.id === scenarioId);
  if (theme) return { ...theme, status: 'ready' };

  const adventure = SCENARIOS.adventures.find(s => s.id === scenarioId);
  if (adventure) return adventure;

  return null;
}

/**
 * Get the world seed for a scenario.
 * For themes: generates a full world using world-builder.js
 * For adventures with manifests: loads the manifest data
 * For adventures with scene graphs (ready): returns the adventure ID
 */
function getScenarioWorldSeed(scenarioId) {
  const scenario = getDigitalDMScenario(scenarioId);
  if (!scenario) throw new Error(`Unknown scenario: ${scenarioId}`);

  if (scenario.type === 'theme') {
    const WorldBuilder = require('./world-builder');
    return WorldBuilder.generateWorld({
      theme: scenario.worldBuilderTemplate,
      startingLevel: 1,
      partySize: 1
    });
  }

  if (scenario.type === 'adventure') {
    if (scenario.status === 'ready') {
      // Dracula, Frankenstein, Holmes — full scene graphs
      return { adventureId: scenario.id, useSceneGraph: true };
    }

    if (scenario.status === 'manifest_ready') {
      // Lost Mine of Phandelver — load manifest from docs
      return loadAdventureManifest(scenario.id);
    }

    // coming_soon — no world seed, AI improvises from description
    return null;
  }

  return null;
}

/**
 * Load an adventure manifest from docs/ directory.
 * Parses the markdown manifest into a structured world seed.
 */
function loadAdventureManifest(adventureId) {
  const manifestMap = {
    lost_mine: './docs/lmop-adventure-manifest.md'
  };

  const manifestPath = manifestMap[adventureId];
  if (!manifestPath) return null;

  try {
    const fullPath = path.join(__dirname, '..', '..', manifestPath);
    const content = fs.readFileSync(fullPath, 'utf8');
    return parseAdventureManifest(adventureId, content);
  } catch (err) {
    console.warn(`[DigitalDMScenarios] Failed to load manifest for ${adventureId}:`, err.message);
    return null;
  }
}

/**
 * Parse a markdown adventure manifest into a structured world seed.
 * Extracts: scenes, NPCs, level progression, key items.
 */
function parseAdventureManifest(adventureId, content) {
  const seed = {
    adventureId,
    scenes: [],
    keyNPCs: [],
    levelProgression: [],
    summary: ''
  };

  // Extract scenes from table rows: | `1.0` | **Location** | Summary | Encounters |
  const sceneRegex = /\|\s*`([^`]+)`\s*\|\s*\*\*([^*]+)\*\*\s*\|\s*([^|]+)\|\s*([^|]*)\|/g;
  let match;
  while ((match = sceneRegex.exec(content)) !== null) {
    seed.scenes.push({
      id: match[1].trim(),
      location: match[2].trim(),
      summary: match[3].trim(),
      encounters: match[4].trim() || '—'
    });
  }

  // Extract NPCs: | **Name** | Role | Location | Quest | Notes |
  const npcRegex = /\|\s*\*\*([^*]+)\*\*\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]*)\|\s*([^|]*)\|/g;
  const npcSection = content.split('## 4. KEY NPCs')[1] || '';
  while ((match = npcRegex.exec(npcSection)) !== null) {
    const name = match[1].trim();
    if (name === 'NPC' || name === 'Name') continue; // skip header rows
    seed.keyNPCs.push({
      name,
      role: match[2].trim(),
      location: match[3].trim(),
      notes: match[5].trim()
    });
  }

  // Extract level progression: | **1** | Adventure start | Characters begin at Level 1 |
  const levelRegex = /\|\s*\*\*(\d+)\*\*\s*\|\s*([^|]+)\|\s*([^|]+)\|/g;
  const levelSection = content.split('## 3. LEVEL PROGRESSION')[1]?.split('## 4.')[0] || '';
  while ((match = levelRegex.exec(levelSection)) !== null) {
    seed.levelProgression.push({
      level: parseInt(match[1]),
      reachedAfter: match[2].trim(),
      milestone: match[3].trim()
    });
  }

  // Extract overview summary
  const overviewMatch = content.match(/## 1\. OVERVIEW\n([\s\S]*?)(?=\n---)/);
  if (overviewMatch) {
    seed.summary = overviewMatch[1].replace(/- \*\*[^*]+\*\*:\s*/g, '').trim();
  }

  return seed;
}

module.exports = {
  listDigitalDMScenarios,
  getDigitalDMScenario,
  getScenarioWorldSeed,
  loadAdventureManifest
};
