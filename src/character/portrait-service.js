'use strict';

/**
 * Portrait Service for The Binding
 * Generates detailed image-generation prompts from character data,
 * stores and retrieves portrait URLs, and manages style presets.
 */

const characterService = require('./character-service');

// ── Style Presets ────────────────────────────────────────────────────────────

const STYLE_PRESETS = {
  realistic: {
    name: 'Realistic',
    suffix: 'hyper-realistic digital painting, photorealistic skin textures, volumetric lighting, cinematic composition, 8k detail, artstation quality',
    negative: 'cartoon, anime, sketch, blurry, low quality, watermark, text',
  },
  anime: {
    name: 'Anime',
    suffix: 'anime style, cel-shaded, vibrant colors, detailed character design, clean linework, high quality anime illustration, studio ghibli meets final fantasy',
    negative: 'photorealistic, blurry, low quality, western cartoon, 3d render',
  },
  oil_painting: {
    name: 'Oil Painting',
    suffix: 'classical oil painting style, rich impasto brushstrokes, warm palette, dramatic chiaroscuro lighting, Renaissance master quality, museum piece',
    negative: 'digital art, photograph, cartoon, flat colors, modern style',
  },
  dark_fantasy: {
    name: 'Dark Fantasy',
    suffix: 'dark fantasy art, moody atmospheric lighting, gothic undertones, muted earth tones with splashes of crimson, gritty texture, Greg Rutkowski style, dark souls aesthetic',
    negative: 'bright colors, cartoon, cheerful, flat lighting, low detail',
  },
  watercolor: {
    name: 'Watercolor',
    suffix: 'delicate watercolor painting, soft washes, visible paper texture, gentle color bleeding, whimsical illustration, storybook quality',
    negative: 'digital art, photorealistic, sharp edges, dark, gritty',
  },
  pixel_art: {
    name: 'Pixel Art',
    suffix: '16-bit pixel art, retro RPG sprite style, detailed pixel shading, SNES era Final Fantasy aesthetic, limited but vibrant color palette',
    negative: 'photorealistic, 3d render, high resolution photo, smooth gradients, anime',
  },
};

// ── Race Appearance Descriptors ──────────────────────────────────────────────

const RACE_DESCRIPTIONS = {
  human: 'human adventurer with versatile features',
  elf: 'graceful elf with pointed ears, angular features, and an ethereal beauty',
  dwarf: 'sturdy dwarf with a thick braided beard, broad shoulders, and weathered features',
  halfling: 'small halfling with curly hair, round cheerful face, and hairy bare feet',
  gnome: 'tiny gnome with large expressive eyes, wild hair, and a mischievous grin',
  'half-elf': 'half-elf with slightly pointed ears, combining human warmth with elven grace',
  'half-orc': 'half-orc with prominent lower tusks, green-tinged skin, and a powerful build',
  tiefling: 'tiefling with curved horns, a long tail, and skin tinged in deep crimson',
  dragonborn: 'dragonborn with scaled draconic features, a powerful snout, and vestigial horns',
};

const SUBRACE_DESCRIPTIONS = {
  'high-elf': 'with an intellectual bearing and arcane symbols etched into their attire',
  'wood-elf': 'with forest camouflage clothing and leaf-shaped ear tips',
  'dark-elf': 'with obsidian-dark skin, white hair, and glowing red eyes',
  'hill-dwarf': 'with a warm complexion and nature-worn leather gear',
  'mountain-dwarf': 'with polished clan-forged armor and intricate metalwork',
  lightfoot: 'with a friendly demeanor and traveler\'s weathered cloak',
  stout: 'with a stockier build and ale-stained adventuring gear',
  'forest-gnome': 'with bark-brown hair and tiny flowers woven into clothing',
  'rock-gnome': 'with goggles, tools, and tinkered gadgets dangling from a utility belt',
};

const CLASS_DESCRIPTIONS = {
  barbarian: 'raging barbarian warrior, bare-chested with war paint and a massive greataxe',
  bard: 'charismatic bard with a lute slung across their back, flamboyant clothing, and a knowing smirk',
  cleric: 'solemn cleric in holy vestments, wielding a glowing mace and bearing the symbol of their deity',
  druid: 'wilderness druid draped in leaves and vines, with animal furs and a gnarled wooden staff',
  fighter: 'battle-hardened fighter in polished plate armor, wielding a well-used longsword',
  monk: 'serene monk in simple robes, fists wrapped in cloth, poised in a martial arts stance',
  paladin: 'noble paladin in gleaming full plate, holy aura radiating, with a blessed warhammer',
  ranger: 'wilderness ranger in leather and fur, hooded cloak, carrying a longbow with a quiver of arrows',
  rogue: 'cunning rogue in dark leather armor, twin daggers at the belt, face half-hidden by a cowl',
  sorcerer: 'sorcerer crackling with innate magical energy, arcane sparks dancing around their fingertips',
  warlock: 'warlock bearing otherworldly markings, dark robes, with an eerie eldritch glow in their eyes',
  wizard: 'wise wizard in flowing robes covered in arcane sigils, carrying a staff topped with a crystal orb',
};

const EQUIPMENT_DESCRIPTIONS = {
  armor: {
    'light-armor': 'supple leather armor',
    'medium-armor': 'sturdy chainmail shirt',
    'heavy-armor': 'full plate armor',
    'studded-leather': 'studded leather armor',
    'chain-shirt': 'chain shirt',
    'breastplate': 'breastplate',
    'half-plate': 'half plate armor',
    'ring-mail': 'ring mail armor',
    'chain-mail': 'chain mail armor',
    'splint': 'splint armor',
    'plate': 'full plate armor',
  },
  weapons: {
    'longsword': 'a gleaming longsword',
    'shortsword': 'a swift shortsword',
    'greatsword': 'a massive greatsword',
    'greataxe': 'a brutal greataxe',
    'rapier': 'an elegant rapier',
    'dagger': 'a sharp dagger',
    'staff': 'a gnarled wooden staff',
    'bow': 'a finely crafted longbow',
    'crossbow': 'a sturdy crossbow',
    'mace': 'a heavy mace',
    'warhammer': 'a formidable warhammer',
  },
};

// ── Helper: Guess equipment appearance ───────────────────────────────────────

function _equipmentLook(char) {
  const parts = [];

  // Armor
  if (char.equipment.armor) {
    const armorName = char.equipment.armor.name.toLowerCase();
    parts.push(`wearing ${char.equipment.armor.name}`);
  } else {
    // Default look by class
    const classArmor = {
      barbarian: 'bare-chested with fur pelts',
      monk: 'simple cloth robes',
      sorcerer: 'flowing arcane robes',
      warlock: 'dark layered robes with eldritch symbols',
      wizard: 'ornate wizard robes',
    };
    parts.push(classArmor[char.characterClass] || 'adventuring clothes');
  }

  // Shield
  if (char.equipment.shield) {
    parts.push(`bearing a ${char.equipment.shield.name}`);
  }

  // Main hand
  if (char.equipment.mainHand) {
    parts.push(`wielding ${char.equipment.mainHand.name}`);
  }

  // Off hand
  if (char.equipment.offHand) {
    parts.push(`with ${char.equipment.offHand.name} in the off-hand`);
  }

  // Accessories
  if (char.equipment.accessories.length > 0) {
    const accNames = char.equipment.accessories.map(a => a.name);
    parts.push(`adorned with ${accNames.join(', ')}`);
  }

  return parts.join(', ');
}

// ── Portrait Prompt Generation ───────────────────────────────────────────────

/**
 * Generate a detailed image-generation prompt from a character's data.
 *
 * @param {object} character — full character object
 * @param {string} [style]   — style preset key (default: 'realistic')
 * @param {object} [opts]    — additional prompt modifiers
 * @param {string} [opts.scene]     — e.g. 'standing in a torchlit dungeon'
 * @param {string} [opts.mood]      — e.g. 'menacing', 'triumphant'
 * @param {string} [opts.camera]    — e.g. 'close-up portrait', 'full body shot'
 * @param {string} [opts.extra]     — additional prompt text
 * @returns {{ prompt: string, negativePrompt: string, style: string }}
 */
function generatePortraitPrompt(character, style = 'realistic', opts = {}) {
  if (!character) throw new Error('Character is required');
  if (!STYLE_PRESETS[style]) throw new Error(`Invalid style: ${style}. Valid: ${Object.keys(STYLE_PRESETS).join(', ')}`);

  const preset = STYLE_PRESETS[style];
  const parts = [];

  // Opening: subject
  parts.push('A detailed character portrait of');

  // Race
  const raceDesc = RACE_DESCRIPTIONS[character.race] || `a ${character.race} adventurer`;
  parts.push(raceDesc);

  // Subrace
  if (character.subrace && SUBRACE_DESCRIPTIONS[character.subrace]) {
    parts.push(SUBRACE_DESCRIPTIONS[character.subrace]);
  }

  // Class appearance
  const classDesc = CLASS_DESCRIPTIONS[character.characterClass] || `a ${character.characterClass}`;
  parts.push(classDesc);

  // Level-based appearance cues
  if (character.level >= 15) {
    parts.push('radiating immense power and legendary presence, with scars and trophies from countless battles');
  } else if (character.level >= 10) {
    parts.push('bearing the confident stance of a seasoned veteran');
  } else if (character.level >= 5) {
    parts.push('with the weathered look of an experienced adventurer');
  }

  // Equipment
  const equipDesc = _equipmentLook(character);
  if (equipDesc) parts.push(equipDesc);

  // Alignment-based mood
  if (!opts.mood) {
    const alignmentMood = {
      'lawful-good': 'righteous and noble',
      'neutral-good': 'warm and compassionate',
      'chaotic-good': 'wild and free-spirited',
      'lawful-neutral': 'disciplined and composed',
      'true-neutral': 'balanced and contemplative',
      'chaotic-neutral': 'unpredictable and roguish',
      'lawful-evil': 'cold and calculating',
      'neutral-evil': 'sinister and self-serving',
      'chaotic-evil': 'malevolent and unhinged',
    };
    if (character.alignment && alignmentMood[character.alignment]) {
      parts.push(`with a ${alignmentMood[character.alignment]} expression`);
    }
  }

  // Scene / mood / camera
  if (opts.scene) parts.push(opts.scene);
  if (opts.mood) parts.push(opts.mood);
  if (opts.camera) parts.push(opts.camera);
  else parts.push('three-quarter view portrait');

  // Extra
  if (opts.extra) parts.push(opts.extra);

  // Style suffix
  parts.push(preset.suffix);

  const prompt = parts.join(', ');

  return {
    prompt,
    negativePrompt: preset.negative || '',
    style,
    styleName: preset.name,
  };
}

// ── Portrait Storage ─────────────────────────────────────────────────────────

/** @type {Map<string, { characterId: string, url: string, style: string, prompt: string, createdAt: string }>} */
const _portraits = new Map();

/**
 * Store a portrait URL for a character.
 */
function storePortrait(characterId, imageUrl, style = 'realistic', prompt = '') {
  if (!characterId) throw new Error('characterId is required');
  if (!imageUrl) throw new Error('imageUrl is required');

  const record = {
    characterId,
    url: imageUrl,
    style,
    prompt,
    createdAt: new Date().toISOString(),
  };

  _portraits.set(characterId, record);

  // Also update the character's portrait field if available
  try {
    const char = characterService.getCharacter(characterId);
    if (char) {
      characterService.updateCharacter(characterId, {
        portrait: { url: imageUrl, style },
      });
    }
  } catch (_) {
    // Character service may not have this char — that's fine
  }

  return { ...record };
}

/**
 * Get the portrait for a character.
 */
function getPortrait(characterId) {
  if (!characterId) throw new Error('characterId is required');
  const record = _portraits.get(characterId);
  return record ? { ...record } : null;
}

/**
 * Delete a portrait.
 */
function deletePortrait(characterId) {
  return _portraits.delete(characterId);
}

/**
 * Get all style presets (for UI).
 */
function getStylePresets() {
  return Object.entries(STYLE_PRESETS).map(([key, val]) => ({
    key,
    name: val.name,
    description: val.suffix.split(',').slice(0, 2).join(','),
  }));
}

// ── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  generatePortraitPrompt,
  storePortrait,
  getPortrait,
  deletePortrait,
  getStylePresets,
  STYLE_PRESETS,
  RACE_DESCRIPTIONS,
  CLASS_DESCRIPTIONS,
};
