/**
 * Class Abilities Tests — Story Mode classes with abilities
 * Run with: node tests/class-abilities.test.js
 */

const {
  CLASSES, getClass, getClassIds, getClassSummaries,
  rechargeAbilities, useAbility, getAvailableAbilities,
  applyDamage, heal
} = require('../src/story/class-abilities');

let passed = 0, failed = 0, total = 0;
const failures = [];

function assert(condition, label) {
  total++;
  if (condition) { passed++; console.log('  ✓ ' + label); }
  else { failed++; failures.push(label); console.error('  ✗ ' + label); }
}

function assertEq(actual, expected, label) {
  total++;
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { passed++; console.log('  ✓ ' + label); }
  else { failed++; failures.push(label); console.error('  ✗ ' + label + ' — expected ' + e + ', got ' + a); }
}

function section(name) { console.log('\n═══ ' + name + ' ═══'); }

// ════════════════════════════════════════════════════════════════════════
// CLASS DEFINITIONS
// ════════════════════════════════════════════════════════════════════════

section('Class Definitions');

{
  const ids = getClassIds();
  assertEq(ids.length, 4, 'all 4 classes exist');
  assert(ids.includes('fighter'), 'fighter class exists');
  assert(ids.includes('cleric'), 'cleric class exists');
  assert(ids.includes('mage'), 'mage class exists');
  assert(ids.includes('rogue'), 'rogue class exists');

  for (const id of ids) {
    const cls = CLASSES[id];
    assert(cls.id === id, id + ' has correct id');
    assert(cls.name, id + ' has name');
    assert(cls.description, id + ' has description');
    assert(cls.startingHp > 0, id + ' has positive startingHp');
    assert(cls.maxHp === cls.startingHp, id + ' maxHp equals startingHp');
    assertEq(cls.abilities.length, 2, id + ' has 2 abilities');
  }

  assertEq(CLASSES.fighter.startingHp, 12, 'fighter is tankiest (12 HP)');
  assertEq(CLASSES.mage.startingHp, 8, 'mage is squishiest (8 HP)');
}

// ════════════════════════════════════════════════════════════════════════
// ABILITY FIELDS
// ════════════════════════════════════════════════════════════════════════

section('Ability Fields');

{
  for (const id of getClassIds()) {
    for (const ability of CLASSES[id].abilities) {
      assert(ability.id, id + '.' + (ability.name || '?') + ' has id');
      assert(ability.name, id + ' ability has name');
      assert(ability.type, id + '.' + ability.id + ' has type');
      assert(ability.effect, id + '.' + ability.id + ' has effect');
      assert(typeof ability.value === 'number', id + '.' + ability.id + ' value is number');
      assert(ability.used === false, id + '.' + ability.id + ' starts unused');
      assert(ability.flavor, id + '.' + ability.id + ' has flavor text');
    }
  }
}

// ════════════════════════════════════════════════════════════════════════
// GETCLASS
// ════════════════════════════════════════════════════════════════════════

section('getClass()');

{
  const a = getClass('fighter');
  const b = getClass('fighter');
  assert(a !== b, 'returns deep copy (not same reference)');
  assertEq(a, b, 'deep copies are equal');

  assert(getClass('wizard') === null, 'returns null for unknown class');
  assert(getClass('') === null, 'returns null for empty string');
  assert(getClass(null) === null, 'returns null for null');

  // Deep copy isolation
  a.abilities[0].used = true;
  assert(b.abilities[0].used === false, 'modifying copy does not affect original');
}

// ════════════════════════════════════════════════════════════════════════
// GETCLASSSUMMARIES
// ════════════════════════════════════════════════════════════════════════

section('getClassSummaries()');

{
  const summaries = getClassSummaries();
  assertEq(summaries.length, 4, 'returns 4 summaries');
  for (const s of summaries) {
    assert(s.id, s.id + ' summary has id');
    assert(s.name, s.id + ' summary has name');
    assert(s.description, s.id + ' summary has description');
    assert(s.hp > 0, s.id + ' summary has positive hp');
    assertEq(s.hp, CLASSES[s.id].startingHp, s.id + ' hp matches startingHp');
  }
}

// ════════════════════════════════════════════════════════════════════════
// USEABILITY
// ════════════════════════════════════════════════════════════════════════

section('useAbility()');

{
  function makeFighter() {
    const cls = getClass('fighter');
    return { hp: cls.startingHp, classData: cls };
  }

  const char = makeFighter();
  const ability = useAbility(char, 'shield_block');
  assert(ability !== null, 'returns ability on success');
  assertEq(ability.id, 'shield_block', 'returned ability has correct id');
  assertEq(ability.used, true, 'ability marked as used');

  const second = useAbility(char, 'shield_block');
  assert(second === null, 'cannot use same ability twice');

  assert(useAbility(makeFighter(), 'fireball') === null, 'returns null for unknown ability');
  assert(useAbility({ hp: 10 }, 'shield_block') === null, 'returns null without classData');
}

// ════════════════════════════════════════════════════════════════════════
// RECHARGE ABILITIES
// ════════════════════════════════════════════════════════════════════════

section('rechargeAbilities()');

{
  const cls = getClass('fighter');
  const char = { hp: cls.startingHp, classData: cls };
  useAbility(char, 'shield_block');
  useAbility(char, 'power_strike');
  assertEq(getAvailableAbilities(char).length, 0, 'all abilities used');

  rechargeAbilities(char);
  assertEq(getAvailableAbilities(char).length, 2, 'all abilities recharged');

  // Safe on no classData
  let threw = false;
  try { rechargeAbilities({ hp: 10 }); } catch (e) { threw = true; }
  assert(!threw, 'safe on character without classData');
}

// ════════════════════════════════════════════════════════════════════════
// GETAVAILABLEABILITIES
// ════════════════════════════════════════════════════════════════════════

section('getAvailableAbilities()');

{
  const cls = getClass('mage');
  const char = { hp: cls.startingHp, classData: cls };
  assertEq(getAvailableAbilities(char).length, 2, 'all available when none used');

  useAbility(char, 'arcane_shield');
  useAbility(char, 'reveal');
  assertEq(getAvailableAbilities(char).length, 0, 'none available when all used');
}

// ════════════════════════════════════════════════════════════════════════
// APPLY DAMAGE
// ════════════════════════════════════════════════════════════════════════

section('applyDamage()');

{
  function makeChar(hp) {
    const cls = getClass('fighter');
    return { hp, classData: cls };
  }

  // Full damage with no defense
  let char = makeChar(12);
  let result = applyDamage(char, 5, 'physical', null);
  assertEq(result.actualDamage, 5, 'full damage with no defense');
  assertEq(result.mitigated, 0, 'no mitigation without defense');
  assertEq(result.newHp, 7, 'HP reduced correctly');
  assert(!result.unconscious, 'not unconscious');

  // Shield block reduces physical
  char = makeChar(12);
  const shield = CLASSES.fighter.abilities[0]; // shield_block, value=3
  result = applyDamage(char, 5, 'physical', shield);
  assertEq(result.actualDamage, 2, 'shield_block reduces physical by 3');
  assertEq(result.mitigated, 3, 'mitigated 3 damage');

  // Shield block does NOT reduce supernatural
  char = makeChar(12);
  result = applyDamage(char, 5, 'supernatural', shield);
  assertEq(result.actualDamage, 5, 'shield_block does not reduce supernatural');
  assertEq(result.mitigated, 0, 'no mitigation for wrong type');

  // Arcane shield reduces supernatural
  char = makeChar(8);
  const arcane = CLASSES.mage.abilities[0]; // arcane_shield, value=4
  result = applyDamage(char, 6, 'supernatural', arcane);
  assertEq(result.actualDamage, 2, 'arcane_shield reduces supernatural by 4');
  assertEq(result.mitigated, 4, 'mitigated 4 supernatural damage');

  // Arcane shield does NOT reduce physical
  char = makeChar(8);
  result = applyDamage(char, 6, 'physical', arcane);
  assertEq(result.actualDamage, 6, 'arcane_shield does not reduce physical');

  // Mitigation caps at base damage
  char = makeChar(12);
  result = applyDamage(char, 2, 'physical', shield);
  assertEq(result.actualDamage, 0, 'no negative damage from mitigation');
  assertEq(result.mitigated, 2, 'mitigation capped at base damage');

  // HP floors at 0
  char = makeChar(3);
  applyDamage(char, 10, 'physical', null);
  assertEq(char.hp, 0, 'HP floors at 0');

  // Unconscious at 0
  char = makeChar(5);
  result = applyDamage(char, 5, 'physical', null);
  assert(result.unconscious, 'unconscious when HP hits 0');

  // Unconscious below 0
  char = makeChar(3);
  result = applyDamage(char, 10, 'physical', null);
  assert(result.unconscious, 'unconscious when HP goes below 0');
}

// ════════════════════════════════════════════════════════════════════════
// HEAL
// ════════════════════════════════════════════════════════════════════════

section('heal()');

{
  const cls = getClass('cleric'); // maxHp = 10
  let char = { hp: 5, classData: cls };
  let result = heal(char, 3);
  assertEq(result.healed, 3, 'healed 3 HP');
  assertEq(result.newHp, 8, 'HP increased to 8');

  char = { hp: 8, classData: cls };
  result = heal(char, 100);
  assertEq(result.healed, 2, 'healing caps at maxHp');
  assertEq(result.newHp, 10, 'HP at max');

  char = { hp: 12, classData: getClass('fighter') };
  result = heal(char, 5);
  assertEq(result.healed, 0, 'no healing when already at max');

  char = { hp: 0, classData: getClass('mage') };
  result = heal(char, 4);
  assertEq(result.healed, 4, 'can heal from 0 HP');
  assertEq(result.newHp, 4, 'revive restores HP');
}

// ════════════════════════════════════════════════════════════════════════
// SUMMARY
// ════════════════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════');
console.log('  RESULTS: ' + passed + '/' + total + ' passed, ' + failed + ' failed');
console.log('═══════════════════════════════════════════════');
if (failures.length > 0) {
  console.log('\nFailures:');
  failures.forEach(f => console.log('  ✗ ' + f));
}
process.exit(failed > 0 ? 1 : 0);
