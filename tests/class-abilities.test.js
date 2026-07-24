/**
 * Class Abilities Tests — Story Mode classes with abilities
 * Tests: class retrieval, summaries, ability use/recharge,
 * damage mitigation (physical + supernatural), healing, edge cases
 */
const {
  CLASSES, getClass, getClassIds, getClassSummaries,
  rechargeAbilities, useAbility, getAvailableAbilities,
  applyDamage, heal
} = require('../src/story/class-abilities');

describe('Class Definitions', () => {
  test('all 4 classes exist', () => {
    const ids = getClassIds();
    expect(ids).toHaveLength(4);
    expect(ids).toEqual(expect.arrayContaining(['fighter', 'cleric', 'mage', 'rogue']));
  });

  test('each class has required fields', () => {
    for (const id of getClassIds()) {
      const cls = CLASSES[id];
      expect(cls.id).toBe(id);
      expect(cls.name).toBeDefined();
      expect(cls.description).toBeDefined();
      expect(cls.startingHp).toBeGreaterThan(0);
      expect(cls.maxHp).toBe(cls.startingHp);
      expect(cls.abilities).toHaveLength(2);
    }
  });

  test('each ability has required fields', () => {
    for (const id of getClassIds()) {
      for (const ability of CLASSES[id].abilities) {
        expect(ability.id).toBeDefined();
        expect(ability.name).toBeDefined();
        expect(ability.type).toBeDefined();
        expect(ability.effect).toBeDefined();
        expect(typeof ability.value).toBe('number');
        expect(ability.used).toBe(false);
        expect(ability.flavor).toBeDefined();
      }
    }
  });

  test('fighter is tankiest (12 HP), mage is squishiest (8 HP)', () => {
    expect(CLASSES.fighter.startingHp).toBe(12);
    expect(CLASSES.mage.startingHp).toBe(8);
  });
});

describe('getClass()', () => {
  test('returns deep copy (not reference)', () => {
    const a = getClass('fighter');
    const b = getClass('fighter');
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });

  test('returns null for unknown class', () => {
    expect(getClass('wizard')).toBeNull();
    expect(getClass('')).toBeNull();
    expect(getClass(null)).toBeNull();
  });

  test('deep copy isolation — modifying copy does not affect original', () => {
    const a = getClass('fighter');
    const b = getClass('fighter');
    a.abilities[0].used = true;
    expect(b.abilities[0].used).toBe(false);
  });
});

describe('getClassSummaries()', () => {
  test('returns 4 summaries with id, name, description, hp', () => {
    const summaries = getClassSummaries();
    expect(summaries).toHaveLength(4);
    for (const s of summaries) {
      expect(s.id).toBeDefined();
      expect(s.name).toBeDefined();
      expect(s.description).toBeDefined();
      expect(s.hp).toBeGreaterThan(0);
    }
  });

  test('hp matches startingHp for each class', () => {
    for (const s of getClassSummaries()) {
      expect(s.hp).toBe(CLASSES[s.id].startingHp);
    }
  });
});

describe('useAbility()', () => {
  function makeFighter() {
    const cls = getClass('fighter');
    return { hp: cls.startingHp, classData: cls };
  }

  test('marks ability as used and returns it', () => {
    const char = makeFighter();
    const ability = useAbility(char, 'shield_block');
    expect(ability).not.toBeNull();
    expect(ability.id).toBe('shield_block');
    expect(ability.used).toBe(true);
  });

  test('cannot use same ability twice without recharge', () => {
    const char = makeFighter();
    useAbility(char, 'shield_block');
    expect(useAbility(char, 'shield_block')).toBeNull();
  });

  test('returns null for unknown ability', () => {
    expect(useAbility(makeFighter(), 'fireball')).toBeNull();
  });

  test('returns null for character without classData', () => {
    expect(useAbility({ hp: 10 }, 'shield_block')).toBeNull();
  });
});

describe('rechargeAbilities()', () => {
  test('resets all used abilities to false', () => {
    const cls = getClass('fighter');
    const char = { hp: cls.startingHp, classData: cls };
    useAbility(char, 'shield_block');
    useAbility(char, 'power_strike');
    expect(getAvailableAbilities(char)).toHaveLength(0);
    rechargeAbilities(char);
    expect(getAvailableAbilities(char)).toHaveLength(2);
  });

  test('safe on character without classData', () => {
    expect(() => rechargeAbilities({ hp: 10 })).not.toThrow();
  });
});

describe('getAvailableAbilities()', () => {
  test('returns all abilities when none used', () => {
    const cls = getClass('mage');
    const char = { hp: cls.startingHp, classData: cls };
    expect(getAvailableAbilities(char)).toHaveLength(2);
  });

  test('returns empty when all used', () => {
    const cls = getClass('mage');
    const char = { hp: cls.startingHp, classData: cls };
    useAbility(char, 'arcane_shield');
    useAbility(char, 'reveal');
    expect(getAvailableAbilities(char)).toHaveLength(0);
  });
});

describe('applyDamage()', () => {
  function makeChar(hp) {
    const cls = getClass('fighter');
    return { hp, classData: cls };
  }

  test('applies full damage when no defense', () => {
    const char = makeChar(12);
    const result = applyDamage(char, 5, 'physical', null);
    expect(result.actualDamage).toBe(5);
    expect(result.mitigated).toBe(0);
    expect(result.newHp).toBe(7);
    expect(result.unconscious).toBe(false);
  });

  test('fighter shield_block reduces physical damage by 3', () => {
    const char = makeChar(12);
    const defense = CLASSES.fighter.abilities[0];
    const result = applyDamage(char, 5, 'physical', defense);
    expect(result.actualDamage).toBe(2);
    expect(result.mitigated).toBe(3);
  });

  test('shield_block does NOT reduce supernatural damage', () => {
    const char = makeChar(12);
    const defense = CLASSES.fighter.abilities[0];
    const result = applyDamage(char, 5, 'supernatural', defense);
    expect(result.actualDamage).toBe(5);
    expect(result.mitigated).toBe(0);
  });

  test('mage arcane_shield reduces supernatural damage by 4', () => {
    const char = makeChar(8);
    const defense = CLASSES.mage.abilities[0];
    const result = applyDamage(char, 6, 'supernatural', defense);
    expect(result.actualDamage).toBe(2);
    expect(result.mitigated).toBe(4);
  });

  test('arcane_shield does NOT reduce physical damage', () => {
    const char = makeChar(8);
    const defense = CLASSES.mage.abilities[0];
    const result = applyDamage(char, 6, 'physical', defense);
    expect(result.actualDamage).toBe(6);
    expect(result.mitigated).toBe(0);
  });

  test('mitigation caps at base damage (no negative)', () => {
    const char = makeChar(12);
    const defense = CLASSES.fighter.abilities[0];
    const result = applyDamage(char, 2, 'physical', defense);
    expect(result.actualDamage).toBe(0);
    expect(result.mitigated).toBe(2);
  });

  test('HP floors at 0', () => {
    const char = makeChar(3);
    applyDamage(char, 10, 'physical', null);
    expect(char.hp).toBe(0);
  });

  test('unconscious when HP hits 0', () => {
    const result = applyDamage(makeChar(5), 5, 'physical', null);
    expect(result.unconscious).toBe(true);
    expect(result.newHp).toBe(0);
  });

  test('unconscious when HP goes below 0', () => {
    const result = applyDamage(makeChar(3), 10, 'physical', null);
    expect(result.unconscious).toBe(true);
  });
});

describe('heal()', () => {
  test('restores HP up to max', () => {
    const cls = getClass('cleric');
    const char = { hp: 5, classData: cls };
    const result = heal(char, 3);
    expect(result.healed).toBe(3);
    expect(result.newHp).toBe(8);
  });

  test('does not exceed maxHp', () => {
    const cls = getClass('cleric');
    const char = { hp: 8, classData: cls };
    const result = heal(char, 100);
    expect(result.healed).toBe(2);
    expect(result.newHp).toBe(10);
  });

  test('healing at max does nothing', () => {
    const cls = getClass('fighter');
    const char = { hp: 12, classData: cls };
    const result = heal(char, 5);
    expect(result.healed).toBe(0);
  });

  test('healing from 0 HP (revive)', () => {
    const cls = getClass('mage');
    const char = { hp: 0, classData: cls };
    const result = heal(char, 4);
    expect(result.healed).toBe(4);
    expect(result.newHp).toBe(4);
  });
});
