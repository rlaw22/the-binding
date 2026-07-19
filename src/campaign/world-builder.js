/**
 * World Builder — Procedural world generation for Campaign Mode.
 *
 * Generates a sandbox world from a theme seed: locations, NPCs,
 * connections, and initial state. The AI DM then evolves this world
 * dynamically as the player explores.
 */

const { v4: uuidv4 } = require('uuid');

// Location templates by type
const LOCATION_TEMPLATES = {
  settlement: {
    types: ['tavern', 'market', 'temple', 'blacksmith', 'inn', 'town_square', 'guard_post'],
    npcRoles: ['innkeeper', 'merchant', 'guard', 'priest', 'blacksmith', 'beggar', 'noble']
  },
  wilderness: {
    types: ['forest', 'road', 'river', 'mountain_pass', 'cave_entrance', 'ruins', 'campsite'],
    npcRoles: ['traveler', 'hunter', 'bandit', 'hermit', 'patrol']
  },
  dungeon: {
    types: ['entrance', 'corridor', 'chamber', 'treasure_room', 'boss_room', 'trap_room', 'puzzle_room'],
    npcRoles: ['prisoner', 'cultist', 'guard', 'spirit']
  },
  special: {
    types: ['ancient_library', 'dragon_lair', 'portal', 'crypt', 'laboratory', 'shrine'],
    npcRoles: ['sage', 'lich', 'guardian', 'oracle']
  }
};

// Theme-specific world templates
const THEME_TEMPLATES = {
  gothic_horror: {
    startingLocations: [
      { id: 'loc_tavern', name: 'The Ashen Flagon', type: 'settlement',
        description: 'A weathered tavern at the crossroads of a fog-shrouded valley. The timber walls groan under centuries of damp. A fire crackles weakly in the hearth, casting long shadows across faces that avoid eye contact. The barkeep slides a tankard toward you without a word.' },
      { id: 'loc_village', name: 'Hollow Creek', type: 'settlement',
        description: 'A dying village of cobblestone streets and shuttered windows. Garlic braids hang from every doorframe. The church bell tolls at odd hours, and no one walks the streets after dark.' },
      { id: 'loc_forest', name: 'The Blighted Wood', type: 'wilderness',
        description: 'Ancient oaks with bark like scarred flesh. The canopy blocks all sunlight. Strange symbols are carved into the oldest trees — warnings or prayers, you cannot tell.' },
      { id: 'loc_ruins', name: 'Ruins of St. Aldric\'s Abbey', type: 'wilderness',
        description: 'Crumbling stone walls rise from the mist. Broken stained glass glints in the moonlight. The air smells of incense and decay.' }
    ],
    startingNPCs: [
      { id: 'npc_innkeeper', name: 'Elara Thornwick', role: 'innkeeper', race: 'Human',
        personality: ['warm', 'gossipy', 'secretly afraid'],
        attitude: 0.3, knownInfo: ['rumors_about_abbey', 'missing_villagers'],
        secrets: ['saw_the_creature_last_night'], location: 'loc_tavern' },
      { id: 'npc_priest', name: 'Father Aldric', role: 'priest', race: 'Human',
        personality: ['stern', 'faithful', 'hiding something'],
        attitude: -0.1, knownInfo: ['old_rituals', 'the_curse'],
        secrets: ['knows_the_vampire_lord'], location: 'loc_village' },
      { id: 'npc_stranger', name: 'The Hooded Traveler', role: 'traveler', race: 'Unknown',
        personality: ['cryptic', 'knowledgeable', 'dangerous'],
        attitude: 0.0, knownInfo: ['the_wider_world', 'dark_powers'],
        secrets: ['vampire_hunter'], location: 'loc_tavern' }
    ],
    connections: {
      'loc_tavern': ['loc_village', 'loc_forest'],
      'loc_village': ['loc_tavern', 'loc_ruins'],
      'loc_forest': ['loc_tavern', 'loc_ruins'],
      'loc_ruins': ['loc_village', 'loc_forest']
    }
  },

  sword_coast: {
    startingLocations: [
      { id: 'loc_tavern', name: 'The Yawning Portal', type: 'settlement',
        description: 'A bustling tavern built over the entrance to a massive dungeon. Adventurers swap stories over ale. A notice board bristles with quest postings.' },
      { id: 'loc_town', name: 'Neverwinter Square', type: 'settlement',
        description: 'A grand market square in a frontier city. Merchants hawk exotic goods. City guards patrol in polished armor. The smell of fresh bread mingles with forge smoke.' },
      { id: 'loc_road', name: 'The High Road', type: 'wilderness',
        description: 'A well-traveled trade road winding through rolling hills. Caravans pass regularly, but so do bandits. Ruins dot the horizon.' },
      { id: 'loc_dungeon', name: 'Entrance to Undermountain', type: 'dungeon',
        description: 'A yawning pit descends into darkness. Cool air rises from below, carrying the faint sound of dripping water and something else... movement.' }
    ],
    startingNPCs: [
      { id: 'npc_innkeeper', name: 'Durnan', role: 'innkeeper', race: 'Human',
        personality: ['gruff', 'experienced', 'no-nonsense'],
        attitude: 0.2, knownInfo: ['dungeon_rumors', 'adventurer_gossip'],
        secrets: ['explored_level_12'], location: 'loc_tavern' },
      { id: 'npc_merchant', name: 'Kyrie Alara', role: 'merchant', race: 'Half-Elf',
        personality: ['charming', 'shrewd', 'adventurous'],
        attitude: 0.4, knownInfo: ['trade_routes', 'rare_items'],
        secrets: ['smuggler'], location: 'loc_town' },
      { id: 'npc_guard', name: 'Captain Rolf', role: 'guard', race: 'Human',
        personality: ['dutiful', 'suspicious', 'fair'],
        attitude: -0.1, knownInfo: ['city_laws', 'recent_crimes'],
        secrets: ['taking_bribes'], location: 'loc_town' }
    ],
    connections: {
      'loc_tavern': ['loc_town'],
      'loc_town': ['loc_tavern', 'loc_road'],
      'loc_road': ['loc_town', 'loc_dungeon'],
      'loc_dungeon': ['loc_road']
    }
  },

  noir_mystery: {
    startingLocations: [
      { id: 'loc_office', name: 'Sterling Detective Agency', type: 'settlement',
        description: 'A cramped office above a noodle shop. Rain streaks the window. A ceiling fan turns slowly. The desk is buried under case files and empty coffee cups.' },
      { id: 'loc_bar', name: 'The Velvet Shadow', type: 'settlement',
        description: 'A jazz club with a speakeasy vibe. Blue light, smoke, and secrets. The bartender knows everyone and says nothing.' },
      { id: 'loc_alley', name: 'Crescent Moon Alley', type: 'wilderness',
        description: 'A narrow alley slick with rain. Dumpsters and fire escapes. A single flickering streetlight. Someone has been following you.' },
      { id: 'loc_docks', name: 'Harbor District', type: 'wilderness',
        description: 'Fog rolls off the water. Cargo ships creak at their moorings. The dockworkers union has secrets they kill to protect.' }
    ],
    startingNPCs: [
      { id: 'npc_bartender', name: 'Vera Malone', role: 'innkeeper', race: 'Human',
        personality: ['mysterious', 'alluring', 'dangerous'],
        attitude: 0.1, knownInfo: ['city_secrets', 'who_owes_who'],
        secrets: ['informant_for_the_boss'], location: 'loc_bar' },
      { id: 'npc_informant', name: 'Slim Jim', role: 'beggar', race: 'Halfling',
        personality: ['nervous', 'clever', 'loyal_to_money'],
        attitude: 0.5, knownInfo: ['street_gossip', 'recent_crimes'],
        secrets: ['witnessed_the_murder'], location: 'loc_alley' },
      { id: 'npc_detective', name: 'Inspector Cross', role: 'guard', race: 'Human',
        personality: ['methodical', 'corrupt', 'ambitious'],
        attitude: -0.3, knownInfo: ['open_cases', 'evidence_locker'],
        secrets: ['framing_someone'], location: 'loc_office' }
    ],
    connections: {
      'loc_office': ['loc_bar', 'loc_alley'],
      'loc_bar': ['loc_office', 'loc_docks'],
      'loc_alley': ['loc_office', 'loc_docks'],
      'loc_docks': ['loc_bar', 'loc_alley']
    }
  },

  wilderness_expedition: {
    startingLocations: [
      { id: 'loc_camp', name: 'Base Camp', type: 'settlement',
        description: 'A collection of tents at the edge of the known world. Supply crates are stacked high. The expedition leader marks a map by lantern light.' },
      { id: 'loc_trail', name: 'The Overgrown Trail', type: 'wilderness',
        description: 'A path barely visible through dense jungle. Strange bird calls echo overhead. The air is thick with humidity and the scent of unknown flowers.' },
      { id: 'loc_ruins', name: 'Pillars of the Ancients', type: 'wilderness',
        description: 'Massive stone pillars covered in vines rise from the jungle floor. The carvings depict a civilization that predates all known history.' },
      { id: 'loc_cave', name: 'The Mouth of Echoes', type: 'dungeon',
        description: 'A cave entrance carved with warning symbols. Cool air flows from within, carrying the sound of distant underground rivers.' }
    ],
    startingNPCs: [
      { id: 'npc_leader', name: 'Professor Harlow', role: 'sage', race: 'Human',
        personality: ['enthusiastic', 'absent-minded', 'brave'],
        attitude: 0.5, knownInfo: ['ancient_history', 'expedition_routes'],
        secrets: ['funded_by_cult'], location: 'loc_camp' },
      { id: 'npc_guide', name: 'Kaya', role: 'hunter', race: 'Elf',
        personality: ['quiet', 'competent', 'spiritual'],
        attitude: 0.2, knownInfo: ['jungle_survival', 'animal_behavior'],
        secrets: ['guardian_of_the_ruins'], location: 'loc_trail' },
      { id: 'npc_merchant', name: 'Trader Voss', role: 'merchant', race: 'Dwarf',
        personality: ['practical', 'greedy', 'superstitious'],
        attitude: 0.3, knownInfo: ['supply_routes', 'local_traders'],
        secrets: ['selling_info_to_rivals'], location: 'loc_camp' }
    ],
    connections: {
      'loc_camp': ['loc_trail'],
      'loc_trail': ['loc_camp', 'loc_ruins', 'loc_cave'],
      'loc_ruins': ['loc_trail', 'loc_cave'],
      'loc_cave': ['loc_trail', 'loc_ruins']
    }
  }
};

/**
 * Generate a world from a theme.
 */
function generateWorld(options = {}) {
  const themeId = options.theme || 'gothic_horror';
  const template = THEME_TEMPLATES[themeId];

  if (!template && themeId !== 'custom') {
    throw new Error(`No template for theme: ${themeId}`);
  }

  // For custom themes, generate a minimal world
  const worldTemplate = template || generateCustomWorld(options.customDescription);

  const world = {
    id: uuidv4(),
    theme: themeId,
    currentLocation: worldTemplate.startingLocations[0].id,
    locations: {},
    npcs: {},
    quests: { active: [], completed: [], available: [] },
    globalFlags: {},
    timeOfDay: 'evening',
    dayCount: 1,
    weather: 'clear',
    createdAt: Date.now()
  };

  // Populate locations
  for (const loc of worldTemplate.startingLocations) {
    world.locations[loc.id] = {
      ...loc,
      npcs: [],
      connections: worldTemplate.connections[loc.id] || [],
      discovered: loc.id === world.currentLocation,
      events: []
    };
  }

  // Populate NPCs
  for (const npc of worldTemplate.startingNPCs) {
    world.npcs[npc.id] = {
      ...npc,
      alive: true,
      dialogueHistory: [],
      mood: 'neutral'
    };
    // Link NPC to location
    if (world.locations[npc.location]) {
      world.locations[npc.location].npcs.push(npc.id);
    }
  }

  return world;
}

/**
 * Generate a minimal custom world from a player description.
 */
function generateCustomWorld(description) {
  return {
    startingLocations: [
      { id: 'loc_start', name: 'Starting Area', type: 'settlement',
        description: description || 'A mysterious place awaits your arrival.' },
      { id: 'loc_nearby', name: 'Nearby Area', type: 'wilderness',
        description: 'An area adjacent to where you began, waiting to be explored.' }
    ],
    startingNPCs: [
      { id: 'npc_guide', name: 'A Mysterious Figure', role: 'guide', race: 'Unknown',
        personality: ['enigmatic', 'helpful'],
        attitude: 0.2, knownInfo: ['local_area'],
        secrets: [], location: 'loc_start' }
    ],
    connections: {
      'loc_start': ['loc_nearby'],
      'loc_nearby': ['loc_start']
    }
  };
}

/**
 * Discover a new location — called when the AI DM describes a new place.
 */
function discoverLocation(world, locationData) {
  const id = locationData.id || `loc_${uuidv4().slice(0, 8)}`;
  if (world.locations[id]) {
    world.locations[id].discovered = true;
    return world.locations[id];
  }

  const location = {
    id,
    name: locationData.name || 'Unknown Location',
    type: locationData.type || 'unknown',
    description: locationData.description || '',
    npcs: [],
    connections: locationData.connections || [world.currentLocation],
    discovered: true,
    events: []
  };

  world.locations[id] = location;

  // Add bidirectional connection from current location
  if (world.currentLocation && world.locations[world.currentLocation]) {
    const currentLoc = world.locations[world.currentLocation];
    if (!currentLoc.connections.includes(id)) {
      currentLoc.connections.push(id);
    }
  }

  return location;
}

/**
 * Get all discovered locations.
 */
function getDiscoveredLocations(world) {
  return Object.values(world.locations).filter(l => l.discovered);
}

/**
 * Get location connections (the map).
 */
function getLocationMap(world, locationId) {
  const loc = world.locations[locationId || world.currentLocation];
  if (!loc) return [];
  return loc.connections.map(id => ({
    id,
    name: world.locations[id]?.name || 'Unknown',
    discovered: world.locations[id]?.discovered || false
  }));
}

module.exports = {
  THEME_TEMPLATES,
  LOCATION_TEMPLATES,
  generateWorld,
  generateCustomWorld,
  discoverLocation,
  getDiscoveredLocations,
  getLocationMap
};
