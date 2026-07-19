/**
 * NPC Engine — Phase 2C
 *
 * Manages NPC personality, dialogue, memory, and relationship tracking
 * for campaign mode. Gives each NPC a distinct voice and persistent memory.
 */

// Personality trait archetypes (Big Five simplified + D&D-style)
const PERSONALITY_TRAITS = {
  // Disposition
  friendly: { label: 'Friendly', description: 'Warm, welcoming, helpful', attitudeBias: 0.2 },
  suspicious: { label: 'Suspicious', description: 'Distrustful, guarded, cautious', attitudeBias: -0.1 },
  neutral: { label: 'Neutral', description: 'Professional, transactional', attitudeBias: 0 },
  hostile: { label: 'Hostile', description: 'Aggressive, confrontational', attitudeBias: -0.4 },
  cowardly: { label: 'Cowardly', description: 'Fearful, easily intimidated', attitudeBias: -0.1 },
  brave: { label: 'Brave', description: 'Courageous, stands ground', attitudeBias: 0.1 },

  // Temperament
  calm: { label: 'Calm', description: 'Even-tempered, patient' },
  volatile: { label: 'Volatile', description: 'Quick to anger, emotional' },
  jovial: { label: 'Jovial', description: 'Cheerful, joke-telling' },
  melancholy: { label: 'Melancholy', description: 'Sad, reflective, haunted' },
  eccentric: { label: 'Eccentric', description: 'Odd, unpredictable, whimsical' },

  // Intelligence style
  cunning: { label: 'Cunning', description: 'Street-smart, manipulative' },
  scholarly: { label: 'Scholarly', description: 'Bookish, precise, verbose' },
  simple: { label: 'Simple', description: 'Plain-spoken, direct' },
  cryptic: { label: 'Cryptic', description: 'Speaks in riddles, hints' },

  // Moral leaning
  honorable: { label: 'Honorable', description: 'Keeps promises, fair' },
  deceitful: { label: 'Deceitful', description: 'Lies freely, self-serving' },
  greedy: { label: 'Greedy', description: 'Motivated by coin above all' },
  charitable: { label: 'Charitable', description: 'Gives freely, compassionate' }
};

// Voice archetypes for DM narration
const VOICE_ARCHETYPES = {
  gruff_elder: { pace: 'slow', vocabulary: 'rough', mannerisms: ['clears throat', 'squints'] },
  bubbly_barmaid: { pace: 'fast', vocabulary: 'colloquial', mannerisms: ['laughs', 'gestures broadly'] },
  nervous_scholar: { pace: 'halting', vocabulary: 'academic', mannerisms: ['adjusts glasses', 'fidgets'] },
  stoic_guard: { pace: 'measured', vocabulary: 'terse', mannerisms: ['crosses arms', 'nods'] },
  jovial_merchant: { pace: 'animated', vocabulary: 'flowery', mannerisms: ['rubbing hands', 'winks'] },
  haunted_survivor: { pace: 'slow', vocabulary: 'sparse', mannerisms: ['stares into distance', 'whispers'] },
  pompous_noble: { pace: 'deliberate', vocabulary: 'ornate', mannerisms: ['sneers', 'gestures dismissively'] },
  street_urchin: { pace: 'quick', vocabulary: 'slang', mannerisms: ['looks around nervously', 'shuffles feet'] }
};

// Relationship thresholds
const RELATIONSHIP_LEVELS = {
  hostile: { min: -1, max: -0.6, label: 'Hostile', description: 'Actively works against the party' },
  unfriendly: { min: -0.6, max: -0.2, label: 'Unfriendly', description: 'Reluctant, unhelpful' },
  indifferent: { min: -0.2, max: 0.2, label: 'Indifferent', description: 'Neutral, transactional' },
  friendly: { min: 0.2, max: 0.6, label: 'Friendly', description: 'Helpful, cooperative' },
  allied: { min: 0.6, max: 1, label: 'Allied', description: 'Loyal, willing to take risks for the party' }
};

/**
 * Create a new NPC with personality, voice, and memory.
 */
function createNPC(options = {}) {
  const id = options.id || `npc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const traits = options.traits || [pickRandom(Object.keys(PERSONALITY_TRAITS))];
  const voice = options.voice || pickRandom(Object.keys(VOICE_ARCHETYPES));

  return {
    id,
    name: options.name || 'Unknown',
    race: options.race || 'Human',
    role: options.role || 'civilian',
    personality: traits,
    voice,
    attitude: options.attitude ?? 0,  // -1 to 1
    mood: options.mood || 'neutral',
    location: options.location || null,
    alive: true,
    knownInfo: options.knownInfo || [],
    secrets: options.secrets || [],
    dialogueHistory: [],
    memory: [],  // Things the NPC remembers about interactions
    relationships: {},  // Per-player relationship scores
    disposition: options.disposition || 'neutral',
    inventory: options.inventory || [],
    notes: options.notes || '',
    createdAt: Date.now(),
    lastInteraction: null
  };
}

/**
 * Record an interaction with an NPC, updating their memory and attitude.
 */
function recordInteraction(npc, interaction) {
  const entry = {
    type: interaction.type || 'dialogue',
    playerId: interaction.playerId,
    playerName: interaction.playerName || 'Unknown',
    summary: interaction.summary || interaction.action || '',
    attitudeChange: interaction.attitudeChange || 0,
    timestamp: Date.now()
  };

  // Update attitude
  npc.attitude = Math.max(-1, Math.min(1, npc.attitude + entry.attitudeChange));

  // Update per-player relationship
  if (interaction.playerId) {
    if (!npc.relationships[interaction.playerId]) {
      npc.relationships[interaction.playerId] = 0;
    }
    npc.relationships[interaction.playerId] = Math.max(-1, Math.min(1,
      npc.relationships[interaction.playerId] + (entry.attitudeChange || 0)
    ));
  }

  // Add to memory (keep last 20 interactions)
  npc.memory.push(entry);
  if (npc.memory.length > 20) npc.memory.shift();

  // Add to dialogue history
  if (entry.type === 'dialogue') {
    npc.dialogueHistory.push({
      speaker: entry.playerName,
      summary: entry.summary,
      timestamp: entry.timestamp
    });
    if (npc.dialogueHistory.length > 15) npc.dialogueHistory.shift();
  }

  npc.lastInteraction = Date.now();
  return entry;
}

/**
 * Get the relationship level label for a given attitude score.
 */
function getRelationshipLevel(attitude) {
  for (const [key, level] of Object.entries(RELATIONSHIP_LEVELS)) {
    if (attitude >= level.min && attitude < level.max) {
      return { key, ...level };
    }
  }
  // Default to allied if at exactly 1
  return { key: 'allied', ...RELATIONSHIP_LEVELS.allied };
}

/**
 * Generate NPC dialogue context for the AI DM.
 */
function buildNPCDialogueContext(npc, player = null) {
  const voice = VOICE_ARCHETYPES[npc.voice] || VOICE_ARCHETYPES.neutral;
  const relLevel = getRelationshipLevel(npc.attitude);

  const context = {
    name: npc.name,
    race: npc.race,
    role: npc.role,
    personality: npc.personality.map(t => PERSONALITY_TRAITS[t]?.label || t).join(', '),
    voice: {
      pace: voice.pace,
      vocabulary: voice.vocabulary,
      mannerisms: voice.mannerisms
    },
    attitude: npc.attitude,
    relationshipLevel: relLevel.label,
    mood: npc.mood,
    knownInfo: npc.knownInfo,
    // Only reveal secrets if attitude is high enough
    secretsRevealed: npc.attitude > 0.5 ? npc.secrets : [],
    recentMemory: npc.memory.slice(-5).map(m => m.summary),
    recentDialogue: npc.dialogueHistory.slice(-3)
  };

  // Per-player relationship if specified
  if (player && npc.relationships[player.id] !== undefined) {
    context.playerRelationship = getRelationshipLevel(npc.relationships[player.id]).label;
    context.playerAttitude = npc.relationships[player.id];
  }

  return context;
}

/**
 * Update NPC mood based on recent events.
 */
function updateMood(npc, event) {
  const moodTransitions = {
    neutral: { positive: 'pleased', negative: 'annoyed', threat: 'frightened' },
    pleased: { positive: 'happy', negative: 'neutral', threat: 'nervous' },
    happy: { positive: 'happy', negative: 'pleased', threat: 'startled' },
    annoyed: { positive: 'neutral', negative: 'angry', threat: 'defensive' },
    angry: { positive: 'annoyed', negative: 'furious', threat: 'enraged' },
    frightened: { positive: 'nervous', negative: 'terrified', threat: 'panicked' },
    nervous: { positive: 'neutral', negative: 'frightened', threat: 'panicked' }
  };

  const eventType = event.type || 'neutral';
  const current = moodTransitions[npc.mood] || moodTransitions.neutral;
  npc.mood = current[eventType] || npc.mood;

  return npc.mood;
}

/**
 * Check if an NPC will share information based on attitude.
 */
function willShareInfo(npc, infoKey, player = null) {
  const attitude = player && npc.relationships[player.id] !== undefined
    ? npc.relationships[player.id] : npc.attitude;

  // Secrets require high trust
  if (npc.secrets.includes(infoKey)) {
    return attitude > 0.6;
  }

  // Known info is shared more freely
  if (npc.knownInfo.includes(infoKey)) {
    return attitude > -0.2;
  }

  return false;
}

/**
 * Move an NPC to a new location.
 */
function moveNPC(npc, newLocation) {
  const prev = npc.location;
  npc.location = newLocation;
  return { from: prev, to: newLocation };
}

/**
 * Kill an NPC.
 */
function killNPC(npc, cause = 'combat') {
  npc.alive = false;
  npc.deathCause = cause;
  npc.deathTime = Date.now();
  return { id: npc.id, name: npc.name, cause };
}

/**
 * Generate a batch of NPCs for a location.
 */
function generateLocationNPCs(location, options = {}) {
  const { count = 2, theme = 'sword_coast', roles = [] } = options;

  const defaultRoles = ['innkeeper', 'merchant', 'guard', 'scholar', 'beggar', 'noble', 'farmer', 'priest'];
  const availableRoles = roles.length > 0 ? roles : defaultRoles;

  const names = {
    human: ['Aldric', 'Brenna', 'Cedric', 'Dahlia', 'Edric', 'Faye', 'Gareth', 'Helena', 'Ivan', 'Jora'],
    elf: ['Aelindra', 'Caelum', 'Elara', 'Fenris', 'Galadria', 'Ilyndra', 'Lorien', 'Miriel', 'Thandril', 'Vaelin'],
    dwarf: ['Balin', 'Dori', 'Gimrund', 'Hilda', 'Kazrin', 'Marta', 'Norri', 'Thessa', 'Ulfgar', 'Yrsa'],
    halfling: ['Bilba', 'Cora', 'Drogo', 'Fern', 'Garret', 'Lila', 'Merric', 'Pippa', 'Rollo', 'Tansy']
  };

  const npcs = [];
  for (let i = 0; i < count; i++) {
    const race = pickRandom(['human', 'human', 'human', 'elf', 'dwarf', 'halfling']);
    const namePool = names[race] || names.human;
    const name = pickRandom(namePool);
    const role = pickRandom(availableRoles);

    const traitCount = 1 + Math.floor(Math.random() * 2);
    const traits = [];
    const traitKeys = Object.keys(PERSONALITY_TRAITS);
    for (let t = 0; t < traitCount; t++) {
      traits.push(pickRandom(traitKeys));
    }

    npcs.push(createNPC({
      name,
      race: race.charAt(0).toUpperCase() + race.slice(1),
      role,
      traits,
      location,
      attitude: (Math.random() * 0.6) - 0.1 // -0.1 to 0.5
    }));
  }

  return npcs;
}

/**
 * Format NPC for display/DM context.
 */
function formatNPCForDisplay(npc) {
  const relLevel = getRelationshipLevel(npc.attitude);
  return {
    name: npc.name,
    race: npc.race,
    role: npc.role,
    personality: npc.personality.map(t => PERSONALITY_TRAITS[t]?.label || t).join(', '),
    mood: npc.mood,
    relationship: relLevel.label,
    alive: npc.alive,
    location: npc.location
  };
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

module.exports = {
  PERSONALITY_TRAITS,
  VOICE_ARCHETYPES,
  RELATIONSHIP_LEVELS,
  createNPC,
  recordInteraction,
  getRelationshipLevel,
  buildNPCDialogueContext,
  updateMood,
  willShareInfo,
  moveNPC,
  killNPC,
  generateLocationNPCs,
  formatNPCForDisplay
};
