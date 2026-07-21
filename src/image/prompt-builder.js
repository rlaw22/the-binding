/**
 * prompt-builder.js — Gothic Literary Illustration Prompt Engine
 *
 * Builds rich image generation prompts from game context (scenes, characters,
 * combat). Style target: dark gothic literary illustration, pen-and-ink with
 * watercolor wash — evoking the visual language of classic horror literature
 * (Dracula, Frankenstein, Sherlock Holmes).
 */

'use strict';

// ---------------------------------------------------------------------------
// Style constants
// ---------------------------------------------------------------------------

const STYLE_PREFIX =
  'A dark gothic literary illustration in pen-and-ink with watercolor wash. ' +
  'Muted palette of deep indigos, blood reds, sickly greens, and parchment yellows. ' +
  'Heavy cross-hatching and atmospheric fog. ' +
  'Inspired by the original engravings of Dracula (1897), Frankenstein (1818), ' +
  'and the Strand Magazine illustrations of Sherlock Holmes. ' +
  'No modern elements. No text or lettering in the image.';

const STYLE_SUFFIX =
  'Dramatic chiaroscuro lighting. Painterly brush strokes visible in the watercolor areas. ' +
  'The overall mood is ominous, foreboding, and romantically dark.';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Sanitise a raw description into prompt-safe English.
 * Strips markdown, excess whitespace, and truncates to a safe length.
 */
function sanitise(text) {
  if (!text) return '';
  return text
    .replace(/[*_`#>\[\]()]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
}

/**
 * Map a game-internal mood/atmosphere tag to a visual direction string.
 */
function moodDirection(mood) {
  const map = {
    dread:       'Thick suffocating darkness, barely any light source.',
    mystery:     'Swirling fog, half-seen shapes, a single lantern glow.',
    combat:      'Violent motion blur, sparks, splattered ink.',
    eerie:       'Unnatural stillness, long distorted shadows.',
    melancholy:  'Rain-streaked window panes, wilting flowers, candle stubs.',
    triumphant:  'A shaft of golden light breaking through storm clouds.',
    grotesque:   'Unsettling anatomical exaggeration, Goya-esque nightmare imagery.',
    tense:       'Tight framing, claustrophobic composition, hands gripping.',
    default:     'Atmospheric and moody with deep shadows.',
  };
  return map[mood] || map.default;
}

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

/**
 * Build an image prompt for a narrative scene.
 *
 * @param {object} ctx
 * @param {string} ctx.description  - Scene description text from the DM
 * @param {string} [ctx.location]   - Location name (e.g. "Castle Dracula's crypt")
 * @param {string} [ctx.mood]       - Mood tag (dread, mystery, eerie, …)
 * @param {string[]} [ctx.details]  - Extra visual details to weave in
 * @returns {string} Full prompt string
 */
function buildScenePrompt(ctx = {}) {
  const parts = [STYLE_PREFIX];

  if (ctx.location) {
    parts.push(`Setting: ${sanitise(ctx.location)}.`);
  }

  parts.push(sanitise(ctx.description) || 'A mysterious interior scene.');

  if (ctx.mood) {
    parts.push(moodDirection(ctx.mood));
  }

  if (ctx.details && ctx.details.length) {
    parts.push('Additional details: ' + ctx.details.map(sanitise).filter(Boolean).join(', ') + '.');
  }

  parts.push(STYLE_SUFFIX);
  return parts.join(' ');
}

/**
 * Build an image prompt for a character portrait.
 *
 * @param {object} ctx
 * @param {string} ctx.name         - Character name
 * @param {string} [ctx.race]       - Race (human, elf, …)
 * @param {string} [ctx.classType]  - Class (fighter, mage, …)
 * @param {string} [ctx.appearance] - Appearance description
 * @param {string} [ctx.mood]       - Mood tag
 * @param {object} [ctx.equipment]  - Notable visible equipment
 * @returns {string} Full prompt string
 */
function buildCharacterPrompt(ctx = {}) {
  const parts = [STYLE_PREFIX];

  const subject = ctx.name ? `A portrait of ${sanitise(ctx.name)}` : 'A portrait of a mysterious figure';
  parts.push(subject + '.');

  if (ctx.race || ctx.classType) {
    const descriptors = [ctx.race, ctx.classType].filter(Boolean).map(sanitise);
    parts.push(`They are a ${descriptors.join(' ')}.`);
  }

  if (ctx.appearance) {
    parts.push(sanitise(ctx.appearance));
  }

  if (ctx.mood) {
    parts.push(moodDirection(ctx.mood));
  }

  if (ctx.equipment) {
    const eq = Object.values(ctx.equipment).filter(Boolean).map(sanitise).filter(Boolean);
    if (eq.length) {
      parts.push('Visible equipment: ' + eq.join(', ') + '.');
    }
  }

  parts.push('Bust or three-quarter portrait composition against a dark, textured background.');
  parts.push(STYLE_SUFFIX);
  return parts.join(' ');
}

/**
 * Build an image prompt for a combat scene.
 *
 * @param {object} ctx
 * @param {string} [ctx.description] - Combat narration / situation
 * @param {string} [ctx.attacker]    - Attacker description
 * @param {string} [ctx.defender]    - Defender description
 * @param {string} [ctx.weapon]      - Weapon or attack type
 * @param {string} [ctx.location]    - Where the fight takes place
 * @param {string} [ctx.outcome]     - "hit", "miss", "critical", "kill"
 * @returns {string} Full prompt string
 */
function buildCombatPrompt(ctx = {}) {
  const parts = [STYLE_PREFIX];

  parts.push('A dramatic combat illustration.');

  if (ctx.location) {
    parts.push(`Setting: ${sanitise(ctx.location)}.`);
  }

  if (ctx.attacker && ctx.defender) {
    parts.push(`${sanitise(ctx.attacker)} clashes with ${sanitise(ctx.defender)}.`);
  }

  if (ctx.weapon) {
    parts.push(`Weapon: ${sanitise(ctx.weapon)}.`);
  }

  if (ctx.description) {
    parts.push(sanitise(ctx.description));
  }

  // Outcome-specific visual direction
  const outcomeMap = {
    hit:      'The moment of impact — ink splatter suggesting violence.',
    miss:     'A near-miss, the defender recoiling, motion lines in the air.',
    critical: 'EXPLOSIVE impact — the page itself seems to shatter. Ink flying everywhere.',
    kill:     'A fatal blow rendered in stark black ink, the victim collapsing.',
  };
  if (ctx.outcome && outcomeMap[ctx.outcome]) {
    parts.push(outcomeMap[ctx.outcome]);
  }

  parts.push('Dynamic composition with strong diagonal lines suggesting movement.');
  parts.push(STYLE_SUFFIX);
  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// Adventure-specific prompt templates
// ---------------------------------------------------------------------------

const ADVENTURE_TEMPLATES = {
  dracula: {
    name: 'Dracula',
    style: 'Victorian gothic horror. Heavy shadows, candlelight, stone castles, wolves, bats, blood-red accents. Inspired by 1897 Stoker illustrations.',
    scenes: {
      inn: 'A warm but ominous inn in the Carpathian mountains. Wooden benches, a nervous innkeeper, a brass crucifix catching firelight.',
      coach: 'A horse-drawn coach racing through a dark Carpathian forest. Wolves running alongside, glowing eyes in the trees.',
      castle: 'Castle Dracula perched on a cliff. Black stone, iron gates, turrets silhouetated against lightning-split sky. No mirrors anywhere.',
      crypt: 'A stone crypt beneath the castle. Coffins lining the walls, earth scattered on the floor, something stirring in the darkness.',
      london: 'Victorian London streets shrouded in fog. Gas lamps, cobblestones, the shadow of Carfax Abbey looming in the distance.',
      graveyard: 'A moonlit graveyard with ancient headstones. A freshly opened tomb, garlic wreaths, and the figure of a vampire rising.',
    },
    characters: {
      dracula: 'An aristocratic vampire lord. Sharp features, pale skin, burning dark eyes, a thin smile showing very white teeth. Cape with a high collar.',
      van_helsing: 'A Dutch doctor and vampire hunter. Weathered face, silver hair, piercing grey eyes. Carries a bag of garlic, crucifixes, and wooden stakes.',
      mina: 'A young Victorian woman with auburn hair and intelligent eyes. Brave but frightened. A small wound on her neck.',
    },
  },

  frankenstein: {
    name: 'Frankenstein',
    style: 'Romantic-era gothic. Stormy skies, alpine landscapes, candlelit laboratories, anatomical sketches, galvanic apparatus. Inspired by 1818 Shelley illustrations.',
    scenes: {
      geneva: 'The Frankenstein home in Geneva. Warm domestic interior, bookshelves filled with natural philosophy, a storm gathering over the lake.',
      university: 'The University of Ingolstadt. A lecture hall with anatomical charts, a chemistry laboratory with glass retorts and copper wires.',
      laboratory: 'A disused warehouse laboratory. A massive figure on a table, voltaic apparatus humming, Leyden jars, copper electrodes, storm light through a skylight.',
      forest: 'A dark forest at dawn. A massive figure crouching by a stream, discovering its own reflection. Autumn leaves, cold mist.',
      cottage: 'A humble cottage in the woods. A blind old man playing guitar, warm firelight, the creature watching through a crack in the wall.',
      arctic: 'The Arctic ice. Infinite white desert, a dying man on a sled, northern lights overhead, a massive figure watching from a ridge.',
    },
    characters: {
      creature: 'An eight-foot-tall figure assembled from the dead. Yellow skin, pale blue eyes, black hair, white teeth. Beautiful and terrible. Intelligent, eloquent, deeply wounded.',
      victor: 'A young scientist. Gaunt, wild-eyed, dark circles under his eyes. Hands trembling. The look of a man haunted by what he has created.',
      elizabeth: 'A young woman with auburn hair and grey-green eyes. Gentle, intelligent, radiant. The embodiment of everything Victor stands to lose.',
    },
  },

  holmes: {
    name: 'The Hound of the Baskervilles',
    style: 'Victorian detective fiction. Foggy London streets, gas-lit Baker Street, desolate Dartmoor moors, stone circles, ancient manors. Inspired by Strand Magazine illustrations.',
    scenes: {
      baker_street: '221B Baker Street. A cluttered sitting room, violin on the chair, chemical apparatus on the mantelpiece, fire burning, pipe smoke curling.',
      moor: 'Dartmoor at night. Fog rolling across desolate moorland, ancient stone circles, the distant howl of something terrible, phosphorescent glow.',
      hall: 'Baskerville Hall. An ancient manor house, dark wood panelling, Baskerville portraits on the walls, gloomy corridors, candlelight.',
      mire: 'The Grimpen Mire. A deadly bog shrouded in mist, treacherous patches of green, a pony sinking, cairns marking safe paths.',
      london_fog: 'London streets in thick fog. Gas lamps barely visible, a hansom cab, shadows moving, the silhouette of a large dog.',
    },
    characters: {
      holmes: 'Sherlock Holmes. Tall, lean, hawk-nosed, sharp grey eyes. Wearing a deerstalker cap and Inverness cape. Pipe in hand, intensely focused.',
      watson: 'Dr. John Watson. Sturdy, moustached, military bearing. Loyal, practical, observant. Notebook in hand.',
      stapleton: 'Jack Stapleton. A charming naturalist. Lean, tanned, carrying a butterfly net. Warm smile that does not reach his eyes.',
    },
  },
};

/**
 * Build an adventure-specific scene prompt.
 *
 * @param {string} adventureId - dracula, frankenstein, or holmes
 * @param {string} sceneKey - Key from the adventure's scenes map (e.g. 'inn', 'castle')
 * @param {object} [extra] - Additional context (description, mood, details)
 * @returns {string} Full prompt string
 */
function buildAdventureScenePrompt(adventureId, sceneKey, extra = {}) {
  const template = ADVENTURE_TEMPLATES[adventureId];
  if (!template) {
    return buildScenePrompt(extra); // fallback to generic
  }

  const sceneDesc = template.scenes[sceneKey] || extra.description || 'A mysterious scene.';
  return buildScenePrompt({
    description: sceneDesc,
    location: extra.location || template.name,
    mood: extra.mood || 'dread',
    details: extra.details || [],
    style: template.style,
  });
}

/**
 * Build an adventure-specific character prompt.
 *
 * @param {string} adventureId - dracula, frankenstein, or holmes
 * @param {string} characterKey - Key from the adventure's characters map
 * @param {object} [extra] - Additional context
 * @returns {string} Full prompt string
 */
function buildAdventureCharacterPrompt(adventureId, characterKey, extra = {}) {
  const template = ADVENTURE_TEMPLATES[adventureId];
  if (!template) {
    return buildCharacterPrompt(extra); // fallback to generic
  }

  const charDesc = template.characters[characterKey] || extra.appearance || 'A mysterious figure.';
  return buildCharacterPrompt({
    name: extra.name || characterKey,
    appearance: charDesc,
    mood: extra.mood || 'dread',
    ...extra,
  });
}

// ---------------------------------------------------------------------------
// Adventure-specific style presets
// ---------------------------------------------------------------------------

/**
 * Get style preset modifiers for a specific adventure type.
 * Returns additional style text to append to the base STYLE_PREFIX.
 *
 * @param {string} adventureType - 'dracula', 'frankenstein', or 'holmes'
 * @returns {string} Style modifier text, or empty string for unknown types
 */
function getStylePreset(adventureType) {
  const presets = {
    dracula: 'Gothic horror aesthetic. Dark Victorian atmosphere with blood-red accents, ' +
      'heavy shadows from candlelight, stone castle interiors, iron fixtures, ' +
      'velvet drapes, and religious iconography. Inspired by 1897 Stoker illustrations and Victorian gothic engravings.',

    frankenstein: 'Gothic laboratory aesthetic. Stormy nights with lightning illumination, ' +
      'galvanic apparatus, copper electrodes, glass retorts, anatomical sketches, ' +
      'alpine landscapes under turbulent skies. Inspired by 1818 Shelley illustrations and Romantic-era scientific imagery.',

    holmes: 'Gaslit London detective aesthetic. Fog-shrouded streets, warm gaslight glow, ' +
      'cluttered Baker Street interiors, desolate Dartmoor moors, stone manors, ' +
      'deerstalker caps and Inverness capes. Inspired by Strand Magazine illustrations and Sidney Paget engravings.',
  };

  return presets[adventureType] || '';
}

// ---------------------------------------------------------------------------
// Additional scene templates: combat, NPC portraits, item illustrations
// ---------------------------------------------------------------------------

/**
 * Build an image prompt for an NPC portrait — a non-player character the
 * player encounters during the adventure (innkeeper, guard, merchant, etc.).
 *
 * @param {object} ctx
 * @param {string} ctx.name         - NPC name
 * @param {string} [ctx.role]       - Role or occupation (innkeeper, guard, merchant…)
 * @param {string} [ctx.race]       - Race or species
 * @param {string} [ctx.appearance] - Appearance description
 * @param {string} [ctx.personality]- Personality hint (gruff, mysterious, warm…)
 * @param {string} [ctx.mood]       - Mood tag
 * @returns {string} Full prompt string
 */
function buildNPCPortraitPrompt(ctx = {}) {
  const parts = [STYLE_PREFIX];

  const subject = ctx.name
    ? `A portrait of ${sanitise(ctx.name)}`
    : 'A portrait of a local figure';
  parts.push(subject + '.');

  if (ctx.role) {
    parts.push(`They are a ${sanitise(ctx.role)}.`);
  }

  if (ctx.race) {
    parts.push(`Race: ${sanitise(ctx.race)}.`);
  }

  if (ctx.appearance) {
    parts.push(sanitise(ctx.appearance));
  }

  if (ctx.personality) {
    parts.push(`Demeanor: ${sanitise(ctx.personality)}.`);
  }

  if (ctx.mood) {
    parts.push(moodDirection(ctx.mood));
  }

  parts.push('Three-quarter portrait composition, waist-up, against an atmospheric background that hints at their occupation.');
  parts.push(STYLE_SUFFIX);
  return parts.join(' ');
}

/**
 * Build an image prompt for an item illustration — a weapon, artifact,
 * potion, scroll, or other notable object the player finds or uses.
 *
 * @param {object} ctx
 * @param {string} ctx.name        - Item name
 * @param {string} [ctx.type]      - Item type (weapon, potion, scroll, artifact…)
 * @param {string} [ctx.description]- Description of the item
 * @param {string} [ctx.material]  - Material (silver, iron, crystal, leather…)
 * @param {string} [ctx.enchantment]- Magical property or enchantment hint
 * @param {string} [ctx.mood]      - Mood tag
 * @returns {string} Full prompt string
 */
function buildItemPrompt(ctx = {}) {
  const parts = [STYLE_PREFIX];

  const subject = ctx.name
    ? `An illustration of ${sanitise(ctx.name)}`
    : 'An illustration of a mysterious object';
  parts.push(subject + '.');

  if (ctx.type) {
    parts.push(`Item type: ${sanitise(ctx.type)}.`);
  }

  if (ctx.description) {
    parts.push(sanitise(ctx.description));
  }

  if (ctx.material) {
    parts.push(`Made of ${sanitise(ctx.material)}.`);
  }

  if (ctx.enchantment) {
    parts.push(`Enchantment: ${sanitise(ctx.enchantment)}. A faint magical glow emanates from the object.`);
  }

  if (ctx.mood) {
    parts.push(moodDirection(ctx.mood));
  }

  parts.push('Centered composition on a dark surface or held in a hand. Dramatic single-source lighting.');
  parts.push(STYLE_SUFFIX);
  return parts.join(' ');
}

/**
 * Build an image prompt for a detailed combat scene with more context
 * than the basic buildCombatPrompt — includes environment, stakes, and
 * tactical positioning.
 *
 * @param {object} ctx
 * @param {string} [ctx.description] - Combat narration
 * @param {string} [ctx.attacker]    - Attacker description
 * @param {string} [ctx.defender]    - Defender description
 * @param {string} [ctx.weapon]      - Weapon or attack type
 * @param {string} [ctx.location]    - Where the fight takes place
 * @param {string} [ctx.outcome]     - "hit", "miss", "critical", "kill"
 * @param {string} [ctx.environment] - Environmental details (torches, pillars, rain…)
 * @param {string} [ctx.stakes]      - What's at risk (a door, a life, a secret…)
 * @returns {string} Full prompt string
 */
function buildDetailedCombatPrompt(ctx = {}) {
  const parts = [STYLE_PREFIX];

  parts.push('A dramatic and detailed combat illustration.');

  if (ctx.location) {
    parts.push(`Setting: ${sanitise(ctx.location)}.`);
  }

  if (ctx.environment) {
    parts.push(`Environment: ${sanitise(ctx.environment)}.`);
  }

  if (ctx.attacker && ctx.defender) {
    parts.push(`${sanitise(ctx.attacker)} clashes with ${sanitise(ctx.defender)}.`);
  }

  if (ctx.weapon) {
    parts.push(`Weapon: ${sanitise(ctx.weapon)}.`);
  }

  if (ctx.description) {
    parts.push(sanitise(ctx.description));
  }

  if (ctx.stakes) {
    parts.push(`The stakes: ${sanitise(ctx.stakes)}.`);
  }

  // Outcome-specific visual direction
  const outcomeMap = {
    hit:      'The moment of impact — ink splatter suggesting violence.',
    miss:     'A near-miss, the defender recoiling, motion lines in the air.',
    critical: 'EXPLOSIVE impact — the page itself seems to shatter. Ink flying everywhere.',
    kill:     'A fatal blow rendered in stark black ink, the victim collapsing.',
  };
  if (ctx.outcome && outcomeMap[ctx.outcome]) {
    parts.push(outcomeMap[ctx.outcome]);
  }

  parts.push('Dynamic composition with strong diagonal lines suggesting movement. Multiple depth layers — foreground action, mid-ground environment, background atmosphere.');
  parts.push(STYLE_SUFFIX);
  return parts.join(' ');
}

module.exports = {
  buildScenePrompt,
  buildCharacterPrompt,
  buildCombatPrompt,
  buildNPCPortraitPrompt,
  buildItemPrompt,
  buildDetailedCombatPrompt,
  buildAdventureScenePrompt,
  buildAdventureCharacterPrompt,
  getStylePreset,
  ADVENTURE_TEMPLATES,
  // Expose for testing
  _sanitise: sanitise,
  _moodDirection: moodDirection,
  STYLE_PREFIX,
  STYLE_SUFFIX,
};
