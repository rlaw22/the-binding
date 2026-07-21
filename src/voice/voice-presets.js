/**
 * Voice Presets — Character voice configurations for The Binding adventures.
 *
 * Each character has:
 *   - voiceId: provider-specific voice identifier
 *   - pitch: SSML pitch value (e.g. '-10%', '+5%', 'low', 'high')
 *   - rate: SSML rate value (e.g. 'slow', '90%', 'fast')
 *   - volume: SSML volume value (e.g. 'soft', 'loud', '+6dB')
 *   - description: human-readable voice description
 *
 * Adventure themes:
 *   - Dracula: deep, eerie, Transylvanian — low pitches, slow deliberate rates
 *   - Holmes: British, Victorian, precise — mid-high pitches, measured rates
 *   - Frankenstein: formal, Gothic, weighty — low pitches, deliberate rates
 */

const VOICE_PRESETS = {
  // ── Dracula ──────────────────────────────────────────────────────────
  dracula: {
    dm: {
      voiceId: 'onyx',
      pitch: '-15%',
      rate: 'slow',
      volume: 'medium',
      description: 'Deep, ominous narrator — like a Gothic chronicler reading from a journal'
    },
    dracula: {
      voiceId: 'nova',
      pitch: '-20%',
      rate: '85%',
      volume: 'soft',
      description: 'Smooth, seductive, menacing — the Count speaks low and deliberate'
    },
    van_helsing: {
      voiceId: 'echo',
      pitch: '-5%',
      rate: '95%',
      volume: 'loud',
      description: 'Authoritative Dutch-accented professor — firm and commanding'
    },
    mina: {
      voiceId: 'shimmer',
      pitch: '+10%',
      rate: '100%',
      volume: 'medium',
      description: 'Warm, intelligent, composed — a woman of quiet strength'
    },
    lucy: {
      voiceId: 'alloy',
      pitch: '+15%',
      rate: '105%',
      volume: 'medium',
      description: 'Light, vivacious, youthful — bright before the darkness takes her'
    },
    renfield: {
      voiceId: 'fable',
      pitch: '-10%',
      rate: '110%',
      volume: 'soft',
      description: 'Unsettling, manic, whispering — oscillates between servile and crazed'
    },
    jonathan: {
      voiceId: 'nova',
      pitch: '+5%',
      rate: '100%',
      volume: 'medium',
      description: 'Young, earnest, increasingly anxious — a solicitor out of his depth'
    },
    seward: {
      voiceId: 'onyx',
      pitch: '-5%',
      rate: '95%',
      volume: 'medium',
      description: 'Clinical, steady, professional — a doctor recording observations'
    },
    innkeeper: {
      voiceId: 'echo',
      pitch: '+0%',
      rate: '90%',
      volume: 'soft',
      description: 'Worried, accented, superstitious — trying to warn without alarming'
    },
    driver: {
      voiceId: 'fable',
      pitch: '-20%',
      rate: '80%',
      volume: 'soft',
      description: 'Mysterious, low, terse — speaks little, knows more than he says'
    }
  },

  // ── Holmes (Hound of the Baskervilles) ───────────────────────────────
  holmes: {
    dm: {
      voiceId: 'onyx',
      pitch: '-5%',
      rate: '95%',
      volume: 'medium',
      description: 'Victorian atmospheric narrator — measured, literary, fog-laden'
    },
    holmes: {
      voiceId: 'echo',
      pitch: '+5%',
      rate: '110%',
      volume: 'medium',
      description: 'Sharp, analytical, dry wit — rapid deductions delivered with precision'
    },
    watson: {
      voiceId: 'nova',
      pitch: '+0%',
      rate: '100%',
      volume: 'medium',
      description: 'Warm, loyal, observant — the steadfast chronicler and friend'
    },
    stapleton: {
      voiceId: 'alloy',
      pitch: '+10%',
      rate: '100%',
      volume: 'medium',
      description: 'Charming naturalist with hidden menace — pleasant surface, cold depths'
    },
    beryl: {
      voiceId: 'shimmer',
      pitch: '+15%',
      rate: '105%',
      volume: 'soft',
      description: 'Frightened but brave — a woman caught in someone else\'s plot'
    },
    sir_henry: {
      voiceId: 'nova',
      pitch: '-5%',
      rate: '100%',
      volume: 'loud',
      description: 'Direct, courageous, colonial Canadian accent — a Baskerville unafraid'
    },
    barrymore: {
      voiceId: 'fable',
      pitch: '-10%',
      rate: '90%',
      volume: 'soft',
      description: 'Rigid, secretive butler — speaks with practiced restraint'
    },
    mortimer: {
      voiceId: 'echo',
      pitch: '+0%',
      rate: '95%',
      volume: 'medium',
      description: 'Thoughtful, troubled country doctor — scholarly and concerned'
    },
    selden: {
      voiceId: 'fable',
      pitch: '-15%',
      rate: '115%',
      volume: 'loud',
      description: 'Rough, terrified escaped convict — desperate and hunted'
    },
    laura_lyons: {
      voiceId: 'shimmer',
      pitch: '+10%',
      rate: '100%',
      volume: 'soft',
      description: 'Vulnerable, manipulated — used by Stapleton, struggling to trust'
    },
    lestrade: {
      voiceId: 'onyx',
      pitch: '+0%',
      rate: '105%',
      volume: 'loud',
      description: 'Dogged Scotland Yard inspector — officious, eager, slightly outclassed'
    }
  },

  // ── Frankenstein ─────────────────────────────────────────────────────
  frankenstein: {
    dm: {
      voiceId: 'onyx',
      pitch: '-10%',
      rate: '90%',
      volume: 'medium',
      description: 'Philosophical, weighty narrator — Gothic prose delivered with gravitas'
    },
    victor: {
      voiceId: 'nova',
      pitch: '+0%',
      rate: '100%',
      volume: 'medium',
      description: 'Passionate, driven, increasingly haunted — genius curdling into guilt'
    },
    creature: {
      voiceId: 'echo',
      pitch: '-20%',
      rate: '85%',
      volume: 'loud',
      description: 'Deep, eloquent, tragic — Milton-quoting soul in a monstrous form'
    },
    elizabeth: {
      voiceId: 'shimmer',
      pitch: '+15%',
      rate: '95%',
      volume: 'soft',
      description: 'Gentle, poetic, loving — the light in Victor\'s darkening world'
    },
    clerval: {
      voiceId: 'alloy',
      pitch: '+10%',
      rate: '105%',
      volume: 'medium',
      description: 'Warm, adventurous, optimistic — Victor\'s loyal and spirited friend'
    },
    waldman: {
      voiceId: 'onyx',
      pitch: '-5%',
      rate: '90%',
      volume: 'medium',
      description: 'Commanding professor of chemistry — authoritative and inspiring'
    },
    alphonse: {
      voiceId: 'fable',
      pitch: '-10%',
      rate: '90%',
      volume: 'medium',
      description: 'Dignified, loving patriarch — a father watching his family unravel'
    }
  }
};

/**
 * Get the voice preset for a character in an adventure.
 *
 * @param {string} adventureId - 'dracula' | 'holmes' | 'frankenstein'
 * @param {string} [characterId] - Character id. Omit or null for DM (narrator).
 * @returns {Object|null} Voice preset { voiceId, pitch, rate, volume, description } or null if not found
 */
function getVoicePreset(adventureId, characterId) {
  const adventure = VOICE_PRESETS[adventureId];
  if (!adventure) return null;
  const key = characterId || 'dm';
  return adventure[key] || null;
}

/**
 * Get all voice presets for an adventure.
 *
 * @param {string} adventureId
 * @returns {Object} Map of characterId → preset, or empty object
 */
function getAdventurePresets(adventureId) {
  return VOICE_PRESETS[adventureId] || {};
}

/**
 * List all available adventure IDs that have voice presets.
 *
 * @returns {string[]}
 */
function listAdventures() {
  return Object.keys(VOICE_PRESETS);
}

module.exports = {
  VOICE_PRESETS,
  getVoicePreset,
  getAdventurePresets,
  listAdventures
};
