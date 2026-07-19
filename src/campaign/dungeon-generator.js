/**
 * Dungeon Generator — Phase 2D
 *
 * Procedural dungeon room generator for campaign mode.
 * Creates interconnected rooms with encounters, traps, and treasure.
 * Integrates with encounter-builder.js and loot-engine.js.
 */

const { buildEncounter } = require('./encounter-builder');
const { generateTreasureHoard } = require('./loot-engine');

/** @type {string[]} Available room archetypes */
const ROOM_TYPES = [
  'chamber', 'corridor', 'cavern', 'shrine', 'treasury',
  'prison', 'library', 'throne_room', 'crypt', 'trap_room'
];

/** @type {Array<{name:string, cr:number, damage:string, saveType:string, description:string}>} */
const TRAP_TYPES = [
  { name: 'Poison Needle',    cr: 1, damage: '1d4 piercing + 2d4 poison', saveType: 'constitution', description: 'A tiny needle coated in venom protrudes from a hidden spring.' },
  { name: 'Tripwire Alarm',   cr: 0, damage: '1d4 bludgeoning',            saveType: 'dexterity',    description: 'A thin wire stretches across the threshold, rigged to a bell.' },
  { name: 'Falling Block',    cr: 2, damage: '4d6 bludgeoning',            saveType: 'dexterity',    description: 'A section of ceiling is rigged to collapse when weight is applied.' },
  { name: 'Fire Glyph',       cr: 3, damage: '5d6 fire',                   saveType: 'dexterity',    description: 'A glowing rune on the floor erupts in a gout of flame.' },
  { name: 'Frost Rune',       cr: 3, damage: '4d6 cold',                   saveType: 'constitution', description: 'Crystalline frost spirals out from a hidden glyph beneath the dust.' },
  { name: 'Lightning Arc',    cr: 4, damage: '6d6 lightning',              saveType: 'dexterity',    description: 'Metal plates in the walls discharge a crackling bolt of electricity.' },
  { name: 'Acid Spray',       cr: 2, damage: '3d6 acid',                   saveType: 'dexterity',    description: 'Nozzles hidden in the walls spray a corrosive mist.' },
  { name: 'Spike Pit',        cr: 1, damage: '2d6 piercing',               saveType: 'dexterity',    description: 'A section of floor gives way, revealing iron spikes below.' },
  { name: 'Choking Gas',      cr: 3, damage: '4d6 poison',                 saveType: 'constitution', description: 'A sickly green vapor seeps from vents in the floor.' },
  { name: 'Blade Barrier',    cr: 5, damage: '6d10 slashing',              saveType: 'dexterity',    description: 'Razor-sharp blades swing out from hidden slots in the walls.' },
  { name: 'Necrotic Sigil',   cr: 4, damage: '5d8 necrotic',               saveType: 'constitution', description: 'A dark sigil pulses with deathly energy, draining nearby life.' },
  { name: 'Psychic Resonance',cr: 3, damage: '4d6 psychic',                saveType: 'wisdom',       description: 'Whispers flood the mind — a psychic trap left by a dead wizard.' },
  { name: 'Gravity Collapse', cr: 5, damage: '6d6 force',                  saveType: 'strength',     description: 'The air warps and gravity inverts for a sickening moment.' },
  { name: 'Disintegration Circle', cr: 6, damage: '7d6 force',             saveType: 'constitution', description: 'A ring of pale runes dissolves anything that steps within.' },
  { name: 'Soul Drain Pillar',    cr: 7, damage: '8d6 necrotic',           saveType: 'charisma',     description: 'A black obelisk hums with vampiric magic, siphoning the soul.' }
];

const THEME_DESCRIPTIONS = {
  gothic_horror: {
    chamber:     ['A vaulted chamber with crumbling stone arches and cobwebs thick as curtains.', 'Dried bloodstains pattern the floor in disturbing arrangements.'],
    corridor:    ['A narrow passageway lit by guttering torches that cast long, dancing shadows.', 'The walls are slick with condensation and something darker.'],
    cavern:      ['A natural cave with stalactites that drip rhythmically in the dark.', 'Bioluminescent fungi provide an eerie blue-green glow.'],
    shrine:      ['A desecrated altar stands at the center, its holy symbols defaced and inverted.', 'Candles made of black tallow burn with pale, cold flames.'],
    treasury:    ['An iron-bound vault, its lock rusted but still formidable. Dust covers every surface.', 'Empty weapon racks and shattered display cases line the walls.'],
    prison:      ['Rusted iron bars line the walls, behind which bones lie in heaps.', 'Manacles hang from the ceiling, still holding skeletal wrists.'],
    library:     ['Rotting bookshelves sag under the weight of waterlogged tomes.', 'A single reading lamp still burns with an unnatural violet flame.'],
    throne_room: ['A massive throne carved from a single block of obsidian dominates the far wall.', 'Gargoyles perch on the pillars, their eyes seeming to follow intruders.'],
    crypt:       ['Stone sarcophagi are arranged in rows, their lids etched with the faces of the dead.', 'The temperature drops sharply and breath mists in the air.'],
    trap_room:   ['The floor tiles are uneven and suspiciously clean compared to the rest of the dungeon.', 'Scratch marks on the walls suggest something mechanical within.']
  },
  ancient_ruins: {
    chamber:     ['A once-grand hall with faded mosaics depicting forgotten kings.', 'Crumbled columns frame a central dais covered in ancient dust.'],
    corridor:    ['A processional corridor lined with headless statues of forgotten gods.', 'The floor is worn smooth by centuries of passage.'],
    cavern:      ['A natural grotto where ancient builders carved steps into the living rock.', 'Roots from the surface have broken through the ceiling.'],
    shrine:      ['A small domed room with a cracked altar to a deity whose name is lost.', 'Offerings of tarnished bronze still sit in corroded bowls.'],
    treasury:    ['A sealed chamber with walls inlaid with electrum filigree, mostly stripped.', 'Clay tablets with cuneiform writing are scattered on shelves.'],
    prison:      ['Thick stone cells with bronze doors, each inscribed with binding glyphs.', 'Scratches on the walls tally days in a forgotten calendar.'],
    library:     ['Clay tablets and stone cylinders replace books in this ancient archive.', 'The dry air has preserved everything in near-perfect condition.'],
    throne_room: ['A pillared audience hall with a cracked stone throne upon a ziggurat of steps.', 'Mosaic floor depicts a map of a kingdom that no longer exists.'],
    crypt:       ['Rows of burial niches carved into the walls, each sealed with a clay tablet.', 'Canopic jars line shelves, their contents long since turned to dust.'],
    trap_room:   ['Pressure plates of a different stone color are set into the mosaic floor.', 'The craftsmanship here is noticeably more precise than elsewhere.']
  },
  infernal: {
    chamber:     ['The walls are warm to the touch and veined with glowing red cracks.', 'Sulfurous air hangs heavy and the stone seems to pulse like a heartbeat.'],
    corridor:    ['A passage carved from basalt, etched with chains of infernal script.', 'The temperature rises with each step deeper.'],
    cavern:      ['A magma-lit cavern where rivers of molten rock provide hellish illumination.', 'Obsidian formations jut like jagged teeth from the cavern floor.'],
    shrine:      ['A profane altar to an archdevil, still actively maintained with fresh offerings.', 'Iron braziers burn with brimstone flames that produce no smoke.'],
    treasury:    ['A vault sealed with infernal contracts written in blood on vellum.', 'Gold coins stamped with the faces of archdevils litter the floor.'],
    prison:      ['Soul cages line the walls, some still faintly glowing with trapped essences.', 'The bars are made of infernal iron that burns to the touch.'],
    library:     ['Grimoires bound in skin sit on shelves of black iron.', 'The pages turn themselves, whispering forbidden knowledge.'],
    throne_room: ['A massive throne of fused bone and iron atop a pile of smoldering coals.', 'Horns of fallen demons adorn the pillars like trophies.'],
    crypt:       ['Not tombs but contracts — the dead here sold their souls and this is payment.', 'Skeletal remains are chained upright, forever bowing toward the throne.'],
    trap_room:   ['Hellfire runes are carved into every surface, dormant but volatile.', 'The air shimmers with barely-contained infernal energy.']
  },
  fey_wild: {
    chamber:     ['A room where the walls are living wood and flowers bloom from cracks in the stone.', 'The air smells of honeysuckle and something intoxicating.'],
    corridor:    ['A tunnel of intertwined roots and vines that seem to breathe.', 'Bioluminescent flowers light the way in shifting pastel colors.'],
    cavern:      ['A grotto with a crystal-clear pool that reflects a sky that is not there.', 'Mushrooms the size of trees form a canopy overhead.'],
    shrine:      ['A ring of standing stones covered in moss and tiny blooming flowers.', 'The air hums with a melody just below the threshold of hearing.'],
    treasury:    ['A hollow tree filled with trinkets, each one beautiful and slightly wrong.', 'Everything here is a glamour — the real treasure is hidden beneath.'],
    prison:      ['Cages of woven thorn that grow tighter when struggled against.', 'Tiny lights flicker inside — trapped sprites or will-o-wisps.'],
    library:     ['Living books that whisper their contents when opened, sometimes truthfully.', 'The shelves rearrange themselves when no one is looking.'],
    throne_room: ['A throne of living flowers atop a hill of impossibly green moss.', 'The air is thick with enchantment and the ground bounces slightly.'],
    crypt:       ['Not death but sleep — the dead here rest in crystal coffins, dreaming.', 'Flowers grow from the mouths of the sleepers, each one unique.'],
    trap_room:   ['The floor is a patchwork of enchanted tiles that rearrange when stepped on.', 'Illusory walls and real walls swap places without warning.']
  }
};

const DEFAULT_ROOM_DESC = {
  chamber:     ['A dusty stone chamber, unremarkable but functional.'],
  corridor:    ['A plain stone corridor connecting two areas.'],
  cavern:      ['A natural cave opening in the rock.'],
  shrine:      ['A small alcove with a weathered altar.'],
  treasury:    ['A locked room that once held valuables.'],
  prison:      ['A room with iron bars and heavy locks.'],
  library:     ['Shelves line the walls, mostly empty.'],
  throne_room: ['A raised platform dominates the far end of this large room.'],
  crypt:       ['Stone coffins rest in orderly rows.'],
  trap_room:   ['The floor and walls show signs of mechanical construction.']
};

// ─── Utility Functions ───────────────────────────────────────────────────────

/** @param {string} expr @returns {number} */
function roll(expr) {
  const match = String(expr).match(/^(\d+)d(\d+)$/i);
  if (!match) return parseInt(expr) || 0;
  const [, count, sides] = match;
  let total = 0;
  for (let i = 0; i < parseInt(count); i++) {
    total += Math.floor(Math.random() * parseInt(sides)) + 1;
  }
  return total;
}

/** @param {Array} arr @returns {*} */
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

/** @returns {string} */
function roomId() { return 'room_' + Math.random().toString(36).slice(2, 8); }

/** @param {string} difficulty @returns {string} */
function difficultyToTarget(difficulty) {
  return { easy: 'easy', medium: 'medium', hard: 'hard', deadly: 'deadly' }[difficulty] || 'medium';
}

/** @param {number} partyLevel @returns {number} */
function treasureCR(partyLevel) { return Math.max(0, Math.min(partyLevel, 20)); }

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * Generate a trap for a given type and party level.
 * @param {object} trapType - Entry from TRAP_TYPES
 * @param {number} partyLevel - Average party level
 * @returns {object} Trap object with DC, damage, description
 */
function generateTrap(trapType, partyLevel) {
  const baseDC = 10 + Math.floor(partyLevel / 3);
  const dcVariation = Math.floor(Math.random() * 3) - 1;
  const dc = Math.max(8, baseDC + dcVariation);

  // Scale damage dice count with level
  const baseDiceMatch = trapType.damage.match(/(\d+)d(\d+)/);
  const baseDice = baseDiceMatch ? parseInt(baseDiceMatch[1]) : 1;
  const sides = baseDiceMatch ? parseInt(baseDiceMatch[2]) : 6;
  const scaledDice = baseDice + Math.floor(partyLevel / 5);
  const scaledDamage = `${scaledDice}d${sides}`;

  return {
    name: trapType.name,
    cr: trapType.cr + Math.floor(partyLevel / 4),
    dc,
    damage: scaledDamage,
    saveType: trapType.saveType,
    description: trapType.description,
    detected: false,
    triggered: false
  };
}

/**
 * Generate atmospheric description for a room based on type and theme.
 * @param {object} room - Room object (needs .type)
 * @param {string} theme - Theme key
 * @returns {string} Flavour text
 */
function generateRoomDescription(room, theme) {
  const themeSet = THEME_DESCRIPTIONS[theme] || THEME_DESCRIPTIONS.gothic_horror;
  const options = themeSet[room.type] || DEFAULT_ROOM_DESC[room.type] || DEFAULT_ROOM_DESC.chamber;
  return pick(options);
}

/**
 * Generate the dungeon entrance room (always safe, has exit marker).
 * @param {string} theme - Theme key
 * @returns {object} Entrance room
 */
function generateDungeonEntrance(theme) {
  const room = {
    id: roomId(),
    type: 'chamber',
    name: 'Dungeon Entrance',
    isEntrance: true,
    isBoss: false,
    safe: true,
    connections: [],
    encounters: [],
    traps: [],
    treasure: null,
    description: ''
  };
  room.description = generateRoomDescription(room, theme);
  return room;
}

/**
 * Generate the boss room with a powerful encounter.
 * @param {string} theme - Theme key
 * @param {number} partyLevel
 * @param {number} partySize
 * @returns {object} Boss room
 */
function generateBossRoom(theme, partyLevel, partySize) {
  const room = {
    id: roomId(),
    type: pick(['throne_room', 'crypt', 'cavern', 'shrine']),
    name: 'Boss Chamber',
    isEntrance: false,
    isBoss: true,
    safe: false,
    connections: [],
    encounters: [],
    traps: [],
    treasure: null,
    description: ''
  };
  room.description = generateRoomDescription(room, theme);

  // Build a deadly encounter for the boss room
  const party = Array.from({ length: partySize }, (_, i) => ({
    id: `player_${i}`,
    level: partyLevel
  }));

  try {
    const encounter = buildEncounter({
      party,
      targetDifficulty: 'deadly',
      template: 'boss_fight'
    });
    room.encounters.push(encounter);
  } catch (e) {
    room.encounters.push({ monsters: [], difficulty: 'deadly', error: e.message });
  }

  // Boss room always has treasure
  room.treasure = generateTreasureHoard(treasureCR(partyLevel));

  return room;
}

/**
 * Populate a room with encounters, traps, and treasure based on difficulty.
 * @param {object} room - Room to populate
 * @param {object} options - { difficulty, partyLevel, partySize, theme }
 */
function populateRoom(room, options) {
  const { difficulty = 'medium', partyLevel = 3, partySize = 4, theme = 'gothic_horror' } = options;

  if (room.safe) return;

  // Difficulty weights: chance of encounter, trap, treasure
  const weights = {
    easy:   { encounter: 0.4, trap: 0.15, treasure: 0.3 },
    medium: { encounter: 0.6, trap: 0.3,  treasure: 0.45 },
    hard:   { encounter: 0.75, trap: 0.45, treasure: 0.55 },
    deadly: { encounter: 0.9, trap: 0.55, treasure: 0.7 }
  };
  const w = weights[difficulty] || weights.medium;

  // Trap rooms always have a trap
  if (room.type === 'trap_room' || Math.random() < w.trap) {
    const trapType = pick(TRAP_TYPES);
    room.traps.push(generateTrap(trapType, partyLevel));
  }

  // Treasury rooms always have treasure
  if (room.type === 'treasury' || Math.random() < w.treasure) {
    room.treasure = generateTreasureHoard(treasureCR(partyLevel));
  }

  // Combat encounter
  if (Math.random() < w.encounter) {
    const party = Array.from({ length: partySize }, (_, i) => ({
      id: `player_${i}`,
      level: partyLevel
    }));

    const templateMap = {
      corridor: 'ambush',
      cavern: 'random_encounter',
      prison: 'dungeon_room',
      crypt: 'dungeon_room',
      shrine: 'dungeon_room',
      throne_room: 'boss_fight'
    };

    try {
      const encounter = buildEncounter({
        party,
        targetDifficulty: difficultyToTarget(difficulty),
        template: templateMap[room.type] || 'dungeon_room'
      });
      room.encounters.push(encounter);
    } catch (e) {
      room.encounters.push({ monsters: [], difficulty, error: e.message });
    }
  }
}

/**
 * Generate a single room with all properties.
 * @param {object} options - { type?, difficulty, partyLevel, partySize, theme }
 * @returns {object} Room object
 */
function generateRoom(options) {
  const { type, difficulty = 'medium', partyLevel = 3, partySize = 4, theme = 'gothic_horror' } = options;

  const room = {
    id: roomId(),
    type: type || pick(ROOM_TYPES),
    name: '',
    isEntrance: false,
    isBoss: false,
    safe: false,
    connections: [],
    encounters: [],
    traps: [],
    treasure: null,
    description: ''
  };

  room.name = `${room.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} [${room.id}]`;
  room.description = generateRoomDescription(room, theme);
  populateRoom(room, { difficulty, partyLevel, partySize, theme });

  return room;
}

/**
 * Connect rooms into a reachable graph (spanning tree + optional extra edges).
 * Guarantees all rooms are reachable from the entrance with no orphans.
 * @param {object[]} rooms - Array of room objects
 * @returns {object[]} Rooms with connections populated
 */
function connectRooms(rooms) {
  if (rooms.length <= 1) return rooms;

  for (const room of rooms) room.connections = [];

  // Build a spanning tree using a randomized Prim-like approach
  const connected = new Set([rooms[0].id]);
  const unconnected = new Set(rooms.slice(1).map(r => r.id));
  const roomMap = Object.fromEntries(rooms.map(r => [r.id, r]));

  while (unconnected.size > 0) {
    const fromId = pick([...connected]);
    const toId = pick([...unconnected]);

    roomMap[fromId].connections.push(toId);
    roomMap[toId].connections.push(fromId);

    connected.add(toId);
    unconnected.delete(toId);
  }

  // Add a few extra edges for loops (15-25% of room count)
  const extraEdges = Math.max(1, Math.floor(rooms.length * (0.15 + Math.random() * 0.1)));
  let added = 0;
  let attempts = 0;
  while (added < extraEdges && attempts < rooms.length * 3) {
    const a = pick(rooms);
    const b = pick(rooms);
    if (a.id !== b.id && !a.connections.includes(b.id)) {
      a.connections.push(b.id);
      b.connections.push(a.id);
      added++;
    }
    attempts++;
  }

  return rooms;
}

/**
 * Generate a thematic dungeon name.
 * @param {string} theme
 * @returns {string}
 */
function generateDungeonName(theme) {
  const prefixes = {
    gothic_horror:  ['The Dread', 'Catacombs of', 'Halls of', 'The Forsaken', 'Crypts of'],
    ancient_ruins:  ['Ruins of', 'The Lost', 'Beneath', 'Vaults of', 'The Forgotten'],
    infernal:       ['The Burning', 'Gates of', 'The Profane', 'Abyss of', 'The Infernal'],
    fey_wild:       ['The Enchanted', 'Grove of', 'The Verdant', 'Hollow of', 'The Whispering']
  };
  const suffixes = {
    gothic_horror:  ['Despair', 'the Damned', 'Midnight', 'Sorrow', 'the Hollow King'],
    ancient_ruins:  ['Athkatla', 'Netheril', 'the Ancients', 'Valdrek', 'Empires'],
    infernal:       ['Baalzebul', 'the Nine', 'Hellfire', 'Asmodeus', 'Torment'],
    fey_wild:       ['the Moonlit', 'Titania', 'Blossoms', 'the Trickster', 'Dreams']
  };
  const p = prefixes[theme] || prefixes.gothic_horror;
  const s = suffixes[theme] || suffixes.gothic_horror;
  return `${pick(p)} ${pick(s)}`;
}

/**
 * Generate a complete dungeon.
 * @param {object} options
 * @param {number}   [options.rooms=8]       - Number of rooms
 * @param {string}   [options.difficulty='medium'] - easy|medium|hard|deadly
 * @param {string}   [options.theme='gothic_horror'] - Theme key
 * @param {number}   [options.partyLevel=3]  - Average party level
 * @param {number}   [options.partySize=4]   - Number of PCs
 * @returns {object} Full dungeon object
 */
function generateDungeon(options = {}) {
  const {
    rooms: roomCount = 8,
    difficulty = 'medium',
    theme = 'gothic_horror',
    partyLevel = 3,
    partySize = 4
  } = options;

  const rooms = [];

  // 1. Entrance
  rooms.push(generateDungeonEntrance(theme));

  // 2. Middle rooms (random types)
  const middleCount = Math.max(1, roomCount - 2);
  for (let i = 0; i < middleCount; i++) {
    rooms.push(generateRoom({ difficulty, partyLevel, partySize, theme }));
  }

  // 3. Boss room (always last)
  rooms.push(generateBossRoom(theme, partyLevel, partySize));

  // 4. Connect all rooms
  connectRooms(rooms);

  // 5. Build dungeon metadata
  const totalEncounters = rooms.reduce((n, r) => n + r.encounters.length, 0);
  const totalTraps = rooms.reduce((n, r) => n + r.traps.length, 0);
  const totalTreasure = rooms.reduce((n, r) => n + (r.treasure ? 1 : 0), 0);

  return {
    id: 'dungeon_' + Math.random().toString(36).slice(2, 8),
    name: generateDungeonName(theme),
    theme,
    difficulty,
    partyLevel,
    partySize,
    rooms,
    stats: {
      roomCount: rooms.length,
      totalEncounters,
      totalTraps,
      totalTreasureRooms: totalTreasure
    }
  };
}

/**
 * Return a text-based map representation of the dungeon.
 * @param {object} dungeon - Full dungeon object from generateDungeon()
 * @returns {string} ASCII map
 */
function getDungeonMap(dungeon) {
  const rooms = dungeon.rooms;
  if (!rooms || rooms.length === 0) return '(empty dungeon)';

  const lines = [];
  lines.push(`=== ${dungeon.name} ===`);
  lines.push(`Theme: ${dungeon.theme} | Difficulty: ${dungeon.difficulty} | Level ${dungeon.partyLevel} (party of ${dungeon.partySize})`);
  lines.push('');

  const roomMap = Object.fromEntries(rooms.map(r => [r.id, r]));

  for (let i = 0; i < rooms.length; i++) {
    const room = rooms[i];
    const icon = room.isEntrance ? '🚪' : room.isBoss ? '💀' : room.safe ? '⛺' : '▪';
    const connLabels = room.connections.map(cid => {
      const target = roomMap[cid];
      if (!target) return '?';
      return target.isEntrance ? 'ENT' : target.isBoss ? 'BOSS' : rooms.indexOf(target).toString();
    });

    const tags = [];
    if (room.encounters.length > 0) tags.push('⚔️');
    if (room.traps.length > 0) tags.push('⚠️');
    if (room.treasure) tags.push('💰');

    const label = room.isEntrance ? 'ENTRANCE' : room.isBoss ? 'BOSS' : `Room ${i}`;
    lines.push(`${icon} [${label}] ${room.type.replace(/_/g, ' ')} ${tags.join('')} → ${connLabels.join(', ')}`);
  }

  lines.push('');
  lines.push('Legend: 🚪=entrance 💀=boss ⛺=safe ▪=normal ⚔️=encounter ⚠️=trap 💰=treasure');

  // Simple tree view
  lines.push('');
  lines.push('--- Connections ---');
  const visited = new Set();
  function drawTree(id, prefix, isLast) {
    if (visited.has(id)) {
      lines.push(`${prefix}${isLast ? '└── ' : '├── '}[revisit: ${roomMap[id]?.type || id}]`);
      return;
    }
    visited.add(id);
    const room = roomMap[id];
    if (!room) return;
    const label = room.isEntrance ? 'ENTRANCE' : room.isBoss ? 'BOSS' : room.type.replace(/_/g, ' ');
    lines.push(`${prefix}${isLast ? '└── ' : '├── '}${label}`);
    const children = room.connections.filter(cid => !visited.has(cid));
    children.forEach((cid, idx) => {
      drawTree(cid, prefix + (isLast ? '    ' : '│   '), idx === children.length - 1);
    });
  }
  const entrance = rooms.find(r => r.isEntrance);
  if (entrance) drawTree(entrance.id, '', true);

  return lines.join('\n');
}

/**
 * Format the full dungeon for AI DM context.
 * @param {object} dungeon - Full dungeon object from generateDungeon()
 * @returns {string} Formatted text block for DM context
 */
function formatDungeonForDM(dungeon) {
  const lines = [];
  lines.push(`# ${dungeon.name}`);
  lines.push(`Theme: ${dungeon.theme} | Difficulty: ${dungeon.difficulty}`);
  lines.push(`Party: Level ${dungeon.partyLevel}, ${dungeon.partySize} players`);
  lines.push(`Rooms: ${dungeon.stats.roomCount} | Encounters: ${dungeon.stats.totalEncounters} | Traps: ${dungeon.stats.totalTraps} | Treasure Rooms: ${dungeon.stats.totalTreasureRooms}`);
  lines.push('');

  const connRoomMap = Object.fromEntries(dungeon.rooms.map(r => [r.id, r]));

  for (let i = 0; i < dungeon.rooms.length; i++) {
    const room = dungeon.rooms[i];
    const label = room.isEntrance ? 'ENTRANCE' : room.isBoss ? 'BOSS ROOM' : `Room ${i}`;
    lines.push(`## ${label}: ${room.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}`);
    lines.push(`ID: ${room.id}`);
    lines.push(`Description: ${room.description}`);

    // Connections
    const connNames = room.connections.map(cid => {
      const t = connRoomMap[cid];
      return t ? (t.isEntrance ? 'Entrance' : t.isBoss ? 'Boss Room' : t.type.replace(/_/g, ' ')) : cid;
    });
    if (connNames.length > 0) lines.push(`Connections: ${connNames.join(', ')}`);

    // Encounters
    if (room.encounters.length > 0) {
      lines.push('');
      lines.push('### Encounters');
      for (const enc of room.encounters) {
        if (enc.error) {
          lines.push(`  - (Encounter generation failed: ${enc.error})`);
          continue;
        }
        lines.push(`  Difficulty: ${enc.difficulty} | Template: ${enc.template?.name || 'Standard'}`);
        if (enc.template?.description) lines.push(`  Setup: ${enc.template.description}`);
        for (const m of enc.monsters) {
          lines.push(`  - ${m.name} (CR ${m.cr}, AC ${m.ac}, HP ${m.hp})`);
        }
        if (enc.xpData) {
          lines.push(`  Total XP: ${enc.xpData.adjustedXP} (${enc.xpData.perPlayerXP} per player)`);
        }
      }
    }

    // Traps
    if (room.traps.length > 0) {
      lines.push('');
      lines.push('### Traps');
      for (const trap of room.traps) {
        lines.push(`  - ${trap.name} (CR ${trap.cr})`);
        lines.push(`    DC ${trap.dc} ${trap.saveType} save | Damage: ${trap.damage}`);
        lines.push(`    Description: ${trap.description}`);
      }
    }

    // Treasure
    if (room.treasure) {
      lines.push('');
      lines.push('### Treasure');
      const t = room.treasure;
      const coinParts = [];
      if (t.coins.cp) coinParts.push(`${t.coins.cp} cp`);
      if (t.coins.sp) coinParts.push(`${t.coins.sp} sp`);
      if (t.coins.gp) coinParts.push(`${t.coins.gp} gp`);
      if (t.coins.pp) coinParts.push(`${t.coins.pp} pp`);
      if (coinParts.length) lines.push(`  Coins: ${coinParts.join(', ')}`);
      if (t.gems && t.gems.length) {
        lines.push(`  Gems: ${t.gems.map(g => `${g.name} (${g.value} gp)`).join(', ')}`);
      }
      if (t.artObjects && t.artObjects.length) {
        lines.push(`  Art: ${t.artObjects.map(a => `${a.name} (${a.value} gp)`).join(', ')}`);
      }
      if (t.magicItems && t.magicItems.length) {
        lines.push(`  Magic Items: ${t.magicItems.map(m => `${m.name} (${m.rarity})`).join(', ')}`);
      }
      lines.push(`  Total Value: ${t.totalValue} gp`);
    }

    lines.push('');
  }

  return lines.join('\n');
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  ROOM_TYPES,
  TRAP_TYPES,
  THEME_DESCRIPTIONS,
  generateDungeon,
  generateRoom,
  connectRooms,
  populateRoom,
  generateRoomDescription,
  generateTrap,
  generateDungeonEntrance,
  generateBossRoom,
  getDungeonMap,
  formatDungeonForDM
};