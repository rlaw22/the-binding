/**
 * Story Mode Engine Tests — Character creation, scene flow, abilities, damage, healing
 */
const {
  createCharacter, startScene, getEncounterActions,
  useEncounterAbility, resolveDamage, recoverHealth,
  getCharacterSummary, getClassIds, getClassSummaries
} = require('../src/story-mode');

describe('createCharacter()', () => {
  test('creates fighter with correct stats', () => {
    const char = createCharacter('fighter', 'Sir Aldric');
    expect(char).not.toBeNull();
    expect(char.name).toBe('Sir Aldric');
    expect(char.classId).toBe('fighter');
    expect(char.className).toBe('Fighter');
    expect(char.hp).toBe(12);
    expect(char.maxHp).toBe(12);
    expect(char.classData).toBeDefined();
    expect(char.classData.abilities).toHaveLength(2);
  });

  test('creates each class with correct HP', () => {
    const hps = { fighter: 12, cleric: 10, mage: 8, rogue: 9 };
    for (const [cls, hp] of Object.entries(hps)) {
      const char = createCharacter(cls, 'Test');
      expect(char.hp).toBe(hp);
      expect(char.maxHp).toBe(hp);
    }
  });

  test('defaults name to Adventurer if not provided', () => {
    const char = createCharacter('fighter');
    expect(char.name).toBe('Adventurer');
  });

  test('returns null for invalid class', () => {
    expect(createCharacter('wizard')).toBeNull();
    expect(createCharacter('')).toBeNull();
    expect(createCharacter(null)).toBeNull();
  });

  test('initializes tracking stats to zero', () => {
    const char = createCharacter('mage', 'Gandalf');
    expect(char.scenesCompleted).toBe(0);
    expect(char.totalDamageTaken).toBe(0);
    expect(char.totalDamageMitigated).toBe(0);
    expect(char.totalHealingReceived).toBe(0);
    expect(char.abilitiesUsed).toBe(0);
    expect(char.encountersBypassed).toBe(0);
  });
});

describe('startScene()', () => {
  test('recharges all abilities and increments scene count', () => {
    const char = createCharacter('fighter', 'Test');
    // Use both abilities
    char.classData.abilities[0].used = true;
    char.classData.abilities[1].used = true;
    
    startScene(char);
    
    expect(char.classData.abilities[0].used).toBe(false);
    expect(char.classData.abilities[1].used).toBe(false);
    expect(char.scenesCompleted).toBe(1);
  });

  test('scene count increments correctly across multiple scenes', () => {
    const char = createCharacter('cleric', 'Test');
    startScene(char);
    startScene(char);
    startScene(char);
    expect(char.scenesCompleted).toBe(3);
  });
});

describe('getEncounterActions()', () => {
  test('returns available abilities with relevance flag', () => {
    const char = createCharacter('fighter', 'Test');
    const actions = getEncounterActions(char, 'combat');
    expect(actions).toHaveLength(2);
    expect(actions[0]).toHaveProperty('relevant');
  });

  test('marks relevant abilities correctly for combat', () => {
    const char = createCharacter('fighter', 'Test');
    const actions = getEncounterActions(char, 'combat');
    // shield_block (defense) and power_strike (offense) are both relevant to combat
    const shield = actions.find(a => a.id === 'shield_block');
    const strike = actions.find(a => a.id === 'power_strike');
    expect(shield.relevant).toBe(true);
    expect(strike.relevant).toBe(true);
  });

  test('marks irrelevant abilities as not relevant', () => {
    const char = createCharacter('fighter', 'Test');
    const actions = getEncounterActions(char, 'social');
    // fighter abilities are defense + offense, not social
    for (const a of actions) {
      expect(a.relevant).toBe(false);
    }
  });

  test('cleric divine_sense is relevant to investigation', () => {
    const char = createCharacter('cleric', 'Test');
    const actions = getEncounterActions(char, 'investigation');
    const sense = actions.find(a => a.id === 'divine_sense');
    expect(sense.relevant).toBe(true);
  });

  test('excludes used abilities from actions', () => {
    const char = createCharacter('mage', 'Test');
    startScene(char);
    useEncounterAbility(char, 'arcane_shield');
    const actions = getEncounterActions(char, 'combat');
    expect(actions).toHaveLength(1);
    expect(actions[0].id).toBe('reveal');
  });
});

describe('useEncounterAbility()', () => {
  test('uses ability and returns success', () => {
    const char = createCharacter('rogue', 'Test');
    const result = useEncounterAbility(char, 'shadow_step');
    expect(result.success).toBe(true);
    expect(result.ability.id).toBe('shadow_step');
    expect(result.bypass).toBe(true); // stealth_bypass
    expect(char.abilitiesUsed).toBe(1);
    expect(char.encountersBypassed).toBe(1);
  });

  test('silver_tongue bypasses NPC encounter', () => {
    const char = createCharacter('rogue', 'Test');
    const result = useEncounterAbility(char, 'silver_tongue');
    expect(result.bypass).toBe(true);
    expect(char.encountersBypassed).toBe(1);
  });

  test('cleric turn_undead bypasses encounter', () => {
    const char = createCharacter('cleric', 'Test');
    const result = useEncounterAbility(char, 'turn_undead');
    expect(result.bypass).toBe(true);
  });

  test('non-bypass abilities do not bypass', () => {
    const char = createCharacter('fighter', 'Test');
    const result = useEncounterAbility(char, 'shield_block');
    expect(result.bypass).toBe(false);
  });

  test('cannot use ability twice', () => {
    const char = createCharacter('fighter', 'Test');
    useEncounterAbility(char, 'shield_block');
    const result = useEncounterAbility(char, 'shield_block');
    expect(result.success).toBe(false);
  });

  test('returns failure for unknown ability', () => {
    const char = createCharacter('mage', 'Test');
    const result = useEncounterAbility(char, 'fireball');
    expect(result.success).toBe(false);
  });

  test('increments abilitiesUsed counter', () => {
    const char = createCharacter('cleric', 'Test');
    useEncounterAbility(char, 'divine_sense');
    useEncounterAbility(char, 'turn_undead');
    expect(char.abilitiesUsed).toBe(2);
  });
});

describe('resolveDamage()', () => {
  test('applies full damage with no defense', () => {
    const char = createCharacter('fighter', 'Test');
    const result = resolveDamage(char, 5, 'physical', null);
    expect(result.actualDamage).toBe(5);
    expect(char.hp).toBe(7);
    expect(char.totalDamageTaken).toBe(5);
  });

  test('fighter shield_block mitigates physical damage', () => {
    const char = createCharacter('fighter', 'Test');
    const defense = char.classData.abilities[0]; // shield_block
    const result = resolveDamage(char, 5, 'physical', defense);
    expect(result.actualDamage).toBe(2);
    expect(result.mitigated).toBe(3);
    expect(char.totalDamageMitigated).toBe(3);
  });

  test('tracks cumulative damage across encounters', () => {
    const char = createCharacter('mage', 'Test');
    resolveDamage(char, 3, 'physical', null);
    resolveDamage(char, 2, 'supernatural', null);
    expect(char.totalDamageTaken).toBe(5);
    expect(char.hp).toBe(3);
  });
});

describe('recoverHealth()', () => {
  test('heals and tracks healing received', () => {
    const char = createCharacter('cleric', 'Test');
    resolveDamage(char, 6, 'physical', null); // hp = 4
    const result = recoverHealth(char, 3);
    expect(result.healed).toBe(3);
    expect(char.hp).toBe(7);
    expect(char.totalHealingReceived).toBe(3);
  });

  test('healing caps at maxHp', () => {
    const char = createCharacter('fighter', 'Test');
    resolveDamage(char, 2, 'physical', null); // hp = 10
    recoverHealth(char, 100);
    expect(char.hp).toBe(12);
    expect(char.totalHealingReceived).toBe(2); // only healed 2
  });
});

describe('getCharacterSummary()', () => {
  test('returns complete summary', () => {
    const char = createCharacter('rogue', 'Shadow');
    startScene(char);
    resolveDamage(char, 3, 'physical', null);
    
    const summary = getCharacterSummary(char);
    expect(summary.name).toBe('Shadow');
    expect(summary.className).toBe('Rogue');
    expect(summary.hp).toBe(6);
    expect(summary.maxHp).toBe(9);
    expect(summary.hpPercent).toBe(67); // 6/9 = 67%
    expect(summary.scenesCompleted).toBe(1);
    expect(summary.abilitiesAvailable).toBe(2);
    expect(summary.abilitiesTotal).toBe(2);
    expect(summary.totalDamageTaken).toBe(3);
  });

  test('hpPercent rounds correctly', () => {
    const char = createCharacter('mage', 'Test');
    resolveDamage(char, 1, 'physical', null); // 7/8 = 87.5%
    const summary = getCharacterSummary(char);
    expect(summary.hpPercent).toBe(88);
  });
});

describe('Re-exported helpers', () => {
  test('getClassIds returns 4 classes', () => {
    expect(getClassIds()).toHaveLength(4);
  });

  test('getClassSummaries returns 4 summaries', () => {
    expect(getClassSummaries()).toHaveLength(4);
  });
});

describe('Full adventure simulation', () => {
  test('fighter survives 3-scene adventure with damage and healing', () => {
    const char = createCharacter('fighter', 'Sir Aldric');
    
    // Scene 1: combat
    startScene(char);
    const defense = useEncounterAbility(char, 'shield_block');
    expect(defense.success).toBe(true);
    resolveDamage(char, 6, 'physical', defense.ability); // 6-3 = 3 damage
    expect(char.hp).toBe(9);
    useEncounterAbility(char, 'power_strike');
    expect(char.abilitiesUsed).toBe(2);
    
    // Scene 2: investigation + damage
    startScene(char);
    resolveDamage(char, 4, 'physical', null);
    expect(char.hp).toBe(5);
    recoverHealth(char, 2);
    expect(char.hp).toBe(7);
    
    // Scene 3: boss fight
    startScene(char);
    const finalDefense = useEncounterAbility(char, 'shield_block');
    resolveDamage(char, 8, 'supernatural', finalDefense.ability); // shield doesn't help vs supernatural
    expect(char.hp).toBe(0);
    
    const summary = getCharacterSummary(char);
    expect(summary.scenesCompleted).toBe(3);
    expect(summary.totalDamageTaken).toBe(15); // 3 + 4 + 8
    expect(summary.totalDamageMitigated).toBe(3); // only shield block in scene 1
    expect(summary.totalHealingReceived).toBe(2);
  });

  test('rogue avoids all damage through bypasses', () => {
    const char = createCharacter('rogue', 'Whisper');
    
    startScene(char);
    const stealth = useEncounterAbility(char, 'shadow_step');
    expect(stealth.bypass).toBe(true);
    
    startScene(char);
    const talk = useEncounterAbility(char, 'silver_tongue');
    expect(talk.bypass).toBe(true);
    
    const summary = getCharacterSummary(char);
    expect(summary.totalDamageTaken).toBe(0);
    expect(summary.encountersBypassed).toBe(2);
  });
});
