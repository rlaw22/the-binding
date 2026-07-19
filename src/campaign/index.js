/**
 * Campaign Session Manager — Core of Phase 2A.
 *
 * Manages open-ended campaign sessions where the AI DM creates worlds,
 * NPCs, quests, and combat encounters on the fly. Unlike Adventure Mode
 * (curated scene graphs), Campaign Mode is sandbox.
 *
 * Builds on Phase 1 session model — same session container, different mode.
 */

const { v4: uuidv4 } = require('uuid');
const { createSession, addPlayer, SessionMode, SessionState } = require('../session');
const WorldBuilder = require('./world-builder');
const QuestEngine = require('./quest-engine');

// Campaign themes — preset starting points for world generation
const CAMPAIGN_THEMES = {
  gothic_horror: {
    id: 'gothic_horror',
    name: 'Gothic Horror',
    description: 'Dark villages, haunted forests, vampire lords.',
    startingLocation: 'A crumbling village tavern on the edge of a cursed forest',
    tone: 'dark, atmospheric, suspenseful',
    tags: ['horror', 'gothic', 'supernatural']
  },
  sword_coast: {
    id: 'sword_coast',
    name: 'Sword Coast',
    description: 'Classic D&D frontier — dungeons, dragons, heroes for hire.',
    startingLocation: 'A bustling frontier town with a quest board in the square',
    tone: 'heroic, adventurous, epic',
    tags: ['fantasy', 'adventure', 'classic']
  },
  noir_mystery: {
    id: 'noir_mystery',
    name: 'Noir Mystery',
    description: 'Urban intrigue, thieves guilds, political corruption.',
    startingLocation: 'A rain-slicked alley behind a detective agency',
    tone: 'noir, mysterious, tense',
    tags: ['mystery', 'urban', 'intrigue']
  },
  wilderness_expedition: {
    id: 'wilderness_expedition',
    name: 'Wilderness Expedition',
    description: 'Exploration, ruins, ancient civilizations.',
    startingLocation: 'A base camp at the edge of uncharted wilderness',
    tone: 'exploratory, wonder, danger',
    tags: ['exploration', 'wilderness', 'discovery']
  },
  custom: {
    id: 'custom',
    name: 'Custom',
    description: 'Player describes a setting — AI DM generates from description.',
    startingLocation: null,
    tone: 'player-defined',
    tags: ['custom']
  }
};

/**
 * Create a new campaign session.
 */
function createCampaignSession(options = {}) {
  const theme = CAMPAIGN_THEMES[options.theme || 'gothic_horror'];
  if (!theme) throw new Error(`Unknown campaign theme: ${options.theme}`);

  const session = createSession({
    mode: SessionMode.CAMPAIGN,
    sessionName: options.sessionName || `${theme.name} Campaign`,
    maxPlayers: options.maxPlayers || 6,
    adventureId: null
  });

  session.campaign = {
    theme: theme.id,
    themeName: theme.name,
    customDescription: options.customDescription || null,
    world: null,
    quests: { active: [], completed: [], available: [], failed: [] },
    campaignLog: [],
    campaignFlags: {},
    dmContext: {
      currentSituation: null,
      activeThreads: [],
      recentEvents: [],
      tensionLevel: 0.3
    },
    saveVersion: 1,
    lastSaved: null,
    autoSaveInterval: 10,
    turnSinceLastSave: 0
  };

  return session;
}

/**
 * Start a campaign — generate the initial world and set the scene.
 */
function startCampaign(session, options = {}) {
  if (session.campaign.world) {
    throw new Error('Campaign already started');
  }

  const theme = CAMPAIGN_THEMES[session.campaign.theme];
  const customDesc = session.campaign.theme === 'custom'
    ? session.campaign.customDescription : null;

  const world = WorldBuilder.generateWorld({
    theme: session.campaign.theme,
    customDescription: customDesc,
    startingLevel: options.startingLevel || 1,
    partySize: session.players.length || 1,
    seed: options.seed || null
  });

  session.campaign.world = world;

  const initialQuests = QuestEngine.generateStartingQuests(world, session.campaign.theme);
  session.campaign.quests.available = initialQuests;

  session.campaign.dmContext.currentSituation = {
    location: world.currentLocation,
    description: world.locations[world.currentLocation]?.description || '',
    npcsPresent: getNPCsAtLocation(world, world.currentLocation),
    timeOfDay: world.timeOfDay,
    weather: world.weather
  };

  logCampaignEvent(session, 'campaign_started', {
    theme: session.campaign.theme,
    startingLocation: world.currentLocation,
    partySize: session.players.length
  });

  session.state = SessionState.ACTIVE;
  session.updatedAt = Date.now();

  return {
    world,
    openingNarration: generateOpeningNarration(world, theme),
    availableQuests: initialQuests,
    currentLocation: world.locations[world.currentLocation]
  };
}

/**
 * Process a player action in campaign mode.
 */
function processCampaignAction(session, playerId, action) {
  const player = session.players.find(p => p.id === playerId);
  if (!player) throw new Error(`Player ${playerId} not in session`);

  const world = session.campaign.world;
  if (!world) throw new Error('Campaign not started');

  logCampaignEvent(session, 'player_action', {
    playerId, playerName: player.character.name,
    action, location: world.currentLocation
  });

  session.campaign.turnSinceLastSave++;
  session.worldState.turnCount++;
  session.stats.totalTurns++;

  if (session.campaign.turnSinceLastSave >= session.campaign.autoSaveInterval) {
    session.campaign.lastSaved = Date.now();
    session.campaign.turnSinceLastSave = 0;
  }

  const dmContext = buildDMContext(session, player, action);

  session.campaign.dmContext.recentEvents.push({
    type: 'player_action', player: player.character.name,
    action, location: world.currentLocation,
    turn: session.worldState.turnCount
  });
  if (session.campaign.dmContext.recentEvents.length > 10) {
    session.campaign.dmContext.recentEvents.shift();
  }

  session.updatedAt = Date.now();

  return {
    dmContext,
    currentSituation: session.campaign.dmContext.currentSituation,
    activeQuests: session.campaign.quests.active,
    worldState: {
      currentLocation: world.currentLocation,
      timeOfDay: world.timeOfDay,
      dayCount: world.dayCount,
      weather: world.weather
    }
  };
}

/**
 * Apply world state changes from the AI DM's response.
 * Parses structured tags and updates the world accordingly.
 */
function applyWorldChanges(session, dmResponse) {
  const world = session.campaign.world;
  if (!world) return;

  const changes = parseDMResponseTags(dmResponse);

  // Location changes
  if (changes.locationMoved) {
    const prevLocation = world.currentLocation;
    world.currentLocation = changes.locationMoved;

    if (!world.locations[changes.locationMoved]) {
      world.locations[changes.locationMoved] = {
        id: changes.locationMoved,
        name: changes.locationName || changes.locationMoved,
        description: changes.locationDescription || 'An unfamiliar place.',
        type: changes.locationType || 'unknown',
        npcs: [],
        connections: [prevLocation],
        discovered: true,
        events: []
      };
    } else {
      world.locations[changes.locationMoved].discovered = true;
    }

    // Add bidirectional connection
    if (prevLocation && world.locations[prevLocation]) {
      if (!world.locations[prevLocation].connections.includes(changes.locationMoved)) {
        world.locations[prevLocation].connections.push(changes.locationMoved);
      }
    }

    session.campaign.dmContext.currentSituation = {
      location: changes.locationMoved,
      description: world.locations[changes.locationMoved].description,
      npcsPresent: getNPCsAtLocation(world, changes.locationMoved),
      timeOfDay: world.timeOfDay,
      weather: world.weather
    };

    logCampaignEvent(session, 'location_changed', { from: prevLocation, to: changes.locationMoved });
  }

  // NPC changes
  if (changes.npcUpdates && changes.npcUpdates.length > 0) {
    for (const update of changes.npcUpdates) {
      if (!world.npcs[update.id]) {
        world.npcs[update.id] = {
          id: update.id,
          name: update.name || update.id,
          race: update.race || 'unknown',
          role: update.role || 'civilian',
          personality: update.personality || [],
          attitude: update.attitude || 0,
          knownInfo: [],
          secrets: [],
          location: world.currentLocation,
          alive: true,
          dialogueHistory: []
        };
        logCampaignEvent(session, 'npc_discovered', { npcId: update.id, name: update.name });
      } else {
        const npc = world.npcs[update.id];
        if (update.attitude !== undefined) npc.attitude = update.attitude;
        if (update.mood !== undefined) npc.mood = update.mood;
        if (update.location !== undefined) npc.location = update.location;
        if (update.alive === false) npc.alive = false;
        if (update.dialogue) npc.dialogueHistory.push(update.dialogue);
      }
    }
  }

  // Quest updates
  if (changes.questUpdates && changes.questUpdates.length > 0) {
    for (const qu of changes.questUpdates) {
      QuestEngine.processQuestUpdate(session.campaign.quests, qu);
      logCampaignEvent(session, 'quest_updated', qu);
    }
  }

  // Time advancement
  if (changes.timeAdvanced) {
    world.timeOfDay = changes.timeOfDay || advanceTime(world.timeOfDay);
    if (changes.newDay) {
      world.dayCount++;
      logCampaignEvent(session, 'new_day', { day: world.dayCount });
    }
  }

  // Weather
  if (changes.weather) world.weather = changes.weather;

  // Global flags
  if (changes.flags) {
    for (const [flag, value] of Object.entries(changes.flags)) {
      world.globalFlags[flag] = value;
      session.campaign.campaignFlags[flag] = value;
    }
  }

  // Combat triggers
  if (changes.combatStart) {
    logCampaignEvent(session, 'combat_started', changes.combatStart);
  }

  // Item grants
  if (changes.itemsGranted) {
    for (const item of changes.itemsGranted) {
      logCampaignEvent(session, 'item_granted', item);
    }
  }

  session.updatedAt = Date.now();
  return changes;
}

/**
 * Parse structured tags from the AI DM's response.
 */
function parseDMResponseTags(response) {
  const changes = { npcUpdates: [], questUpdates: [], diceRolls: [], itemsGranted: [], flags: {} };

  // Location movement
  const locMatch = response.match(/\[LOCATION(?:_MOVED)?:\s*([^,\]]+)(?:,\s*"([^"]+)")?\]/i);
  if (locMatch) {
    changes.locationMoved = locMatch[1].trim();
    changes.locationName = locMatch[2] || changes.locationMoved;
  }
  const discMatch = response.match(/\[LOCATION_DISCOVERED:\s*([^,\]]+)(?:,\s*"([^"]+)")?\]/i);
  if (discMatch) {
    changes.locationMoved = discMatch[1].trim();
    changes.locationName = discMatch[2] || changes.locationMoved;
  }

  // NPC attitude
  for (const m of response.matchAll(/\[NPC_ATTITUDE:\s*([^,]+),\s*([+-]?[\d.]+)(?:,\s*"([^"]+)")?\]/gi)) {
    changes.npcUpdates.push({ id: m[1].trim(), attitude: parseFloat(m[2]), dialogue: m[3] || null });
  }
  // NPC discovered
  for (const m of response.matchAll(/\[NPC_DISCOVERED:\s*([^,]+)(?:,\s*"([^"]+)")?(?:,\s*(\w+))?\]/gi)) {
    changes.npcUpdates.push({ id: m[1].trim(), name: m[2] || m[1].trim(), role: m[3] || 'civilian' });
  }

  // Quest updates
  for (const m of response.matchAll(/\[QUEST_UPDATE:\s*([^,]+),\s*(\w+)(?::\s*([^\]]+))?\]/gi)) {
    changes.questUpdates.push({ questId: m[1].trim(), status: m[2].trim(), detail: m[3] || null });
  }

  // Dice rolls
  for (const m of response.matchAll(/\[DICE_ROLL:\s*([^,]+),\s*DC\s*(\d+),\s*([^\]]+)\]/gi)) {
    changes.diceRolls.push({ type: m[1].trim(), dc: parseInt(m[2]), ability: m[3].trim() });
  }

  // Combat
  const combatMatch = response.match(/\[COMBAT_START:\s*([^\]]+)\]/i);
  if (combatMatch) changes.combatStart = { description: combatMatch[1].trim() };

  // Items
  for (const m of response.matchAll(/\[ITEM_GRANTED:\s*([^,]+)(?:,\s*to:\s*([^\]]+))?\]/gi)) {
    changes.itemsGranted.push({ item: m[1].trim(), to: m[2] ? m[2].trim() : 'party' });
  }

  // Time
  if (response.match(/\[TIME_ADVANCED/i)) {
    changes.timeAdvanced = true;
    const tm = response.match(/\[TIME_ADVANCED:\s*([^\]]+)\]/i);
    if (tm) changes.timeOfDay = tm[1].trim();
  }
  if (response.match(/\[NEW_DAY\]/i)) { changes.timeAdvanced = true; changes.newDay = true; }

  // Weather
  const wm = response.match(/\[WEATHER:\s*([^\]]+)\]/i);
  if (wm) changes.weather = wm[1].trim();

  // Flags
  for (const m of response.matchAll(/\[FLAG:\s*([^,]+),\s*([^\]]+)\]/gi)) {
    changes.flags[m[1].trim()] = m[2].trim();
  }

  return changes;
}

/**
 * Build the full context for the AI DM to generate a response.
 */
function buildDMContext(session, player, action) {
  const world = session.campaign.world;
  const currentLoc = world.locations[world.currentLocation] || {};

  return {
    currentLocation: {
      id: world.currentLocation,
      name: currentLoc.name || 'Unknown',
      description: currentLoc.description || '',
      npcsPresent: getNPCsAtLocation(world, world.currentLocation),
      connections: currentLoc.connections || []
    },
    activeQuests: session.campaign.quests.active.map(q => ({
      id: q.id, name: q.name, description: q.description, objectives: q.objectives
    })),
    party: session.players.map(p => ({
      name: p.character.name, class: p.character.class,
      level: p.character.level, hp: p.character.hp
    })),
    recentEvents: session.campaign.dmContext.recentEvents,
    timeOfDay: world.timeOfDay,
    dayCount: world.dayCount,
    weather: world.weather,
    playerAction: action,
    playerName: player.character.name,
    theme: session.campaign.theme,
    tensionLevel: session.campaign.dmContext.tensionLevel
  };
}

function getNPCsAtLocation(world, locationId) {
  return Object.values(world.npcs)
    .filter(npc => npc.location === locationId && npc.alive)
    .map(npc => ({ id: npc.id, name: npc.name, role: npc.role, attitude: npc.attitude, personality: npc.personality }));
}

function generateOpeningNarration(world, theme) {
  const startLoc = world.locations[world.currentLocation];
  if (!startLoc) return 'Your adventure begins...';
  return `**${theme.name}**\n\n${startLoc.description}\n\nThe world awaits your actions. What do you do?`;
}

function advanceTime(current) {
  const cycle = ['dawn', 'morning', 'midday', 'afternoon', 'evening', 'night', 'late_night', 'dawn'];
  const idx = cycle.indexOf(current);
  return idx >= 0 && idx < cycle.length - 1 ? cycle[idx + 1] : 'dawn';
}

function logCampaignEvent(session, type, data) {
  session.campaign.campaignLog.push({ type, data, turn: session.worldState.turnCount, timestamp: Date.now() });
  if (session.campaign.campaignLog.length > 200) {
    const summarized = session.campaign.campaignLog.slice(0, 50);
    const recent = session.campaign.campaignLog.slice(-100);
    session.campaign.campaignLog = [
      { type: 'log_summarized', data: { omitted: 50 }, turn: 0, timestamp: Date.now() },
      ...summarized, ...recent
    ];
  }
}

function saveCampaign(session) {
  session.campaign.lastSaved = Date.now();
  session.state = SessionState.PAUSED;
  return JSON.parse(JSON.stringify(session));
}

function resumeCampaign(savedState) {
  savedState.state = SessionState.ACTIVE;
  savedState.updatedAt = Date.now();
  return savedState;
}

function getCampaignSummary(session) {
  const world = session.campaign.world;
  if (!world) return 'Campaign not yet started.';
  const loc = world.locations[world.currentLocation] || {};
  const discoveredLocs = Object.values(world.locations).filter(l => l.discovered).length;
  const knownNPCs = Object.values(world.npcs).filter(n => n.alive).length;
  return [
    `Day ${world.dayCount}, ${world.timeOfDay}. ${world.weather || ''}`,
    `Location: ${loc.name || 'Unknown'} (${discoveredLocs} places discovered)`,
    `Party: ${session.players.map(p => `${p.character.name} (L${p.character.level} ${p.character.class})`).join(', ')}`,
    `Active Quests: ${session.campaign.quests.active.length}`,
    `Known NPCs: ${knownNPCs}`,
    `Tension: ${Math.round(session.campaign.dmContext.tensionLevel * 100)}%`
  ].join('\n');
}

module.exports = {
  CAMPAIGN_THEMES,
  createCampaignSession, startCampaign, processCampaignAction,
  applyWorldChanges, parseDMResponseTags, buildDMContext,
  saveCampaign, resumeCampaign, getCampaignSummary, logCampaignEvent
};
