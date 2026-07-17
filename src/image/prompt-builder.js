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

module.exports = {
  buildScenePrompt,
  buildCharacterPrompt,
  buildCombatPrompt,
  // Expose for testing
  _sanitise: sanitise,
  _moodDirection: moodDirection,
  STYLE_PREFIX,
  STYLE_SUFFIX,
};
