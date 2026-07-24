/**
 * Story Mode Engine Tests — Character creation, scene flow, abilities, damage, healing
 * Run with: node tests/story-mode.test.js
 */

const {
  createCharacter, startScene, getEncounterActions,
  useEncounterAbility, resolveDamage, recoverHealth,
  getCharacterSummary, getClassIds, getClassSummaries
} = require('../src/story-mode');

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

function assertClose(actual, expected, tolerance, label) {
  total++;
  if (Math.abs(actual - expected) <= tolerance) { passed++; console.log('  ✓ ' + label); }
  else { failed++; failures.push(label); console.error('  ✗ ' + label + ' — expected ~' + expected + ', got ' + actual); }
}

function section(name) { console.log('\n═══ ' + name + ' ═══'); }

// ════════════════════════════════════════════════════════════════════════
// createCharacter()
// ════════════════════════════════════════════════════════════════════════

section('createCharacter()');

{
  const char = createCharacter('fighter', 'Sir Aldric');
  assert(char !== null, 'creates fighter — not null');
  assertEq(char.name, 'Sir Aldric', 'fighter name');
  assertEq(char.classId, 'fighter', 'fighter classId');
  assertEq(char.className, 'Fighter', 'fighter className');
  assertEq(char.hp, 12, 'fighter HP');
  assertEq(char.maxHp, 12, 'fighter maxHp');
  assert(char.classData !== undefined, 'classData defined');
  assertEq(char.classData.abilities.length, 2, 'fighter has 2 abilities');
}

{
  const hps = { fighter: 12, cleric: 10, mage: 8, rogue: 9 };
  for (const [cls, hp] of Object.entries(hps)) {
    const char = createCharacter(cls, 'Test');
    assertEq(char.hp, hp, cls + ' HP = ' + hp);
    assertEq(char.maxHp, hp, cls + ' maxHp = ' + hp);
  }
}

{
  const char = createCharacter('fighter');
  assertEq(char.name, 'Adventurer', 'default name is Adventurer');
}

{
  assert(createCharacter('wizard') === null, 'invalid class returns null');
  assert(createCharacter('') === null, 'empty string returns null');
  assert(createCharacter(null) === null, 'null class returns null');
}

{
  const char = createCharacter('mage', 'Gandalf');
  assertEq(char.scenesCompleted, 0, 'scenesCompleted starts at 0');
  assertEq(char.totalDamageTaken, 0, 'totalDamageTaken starts at 0');
  assertEq(char.totalDamageMitigated, 0, 'totalDamageMitigated starts at 0');
  assertEq(char.totalHealingReceived, 0, 'totalHealingReceived starts at 0');
  assertEq(char.abilitiesUsed, 0, 'abilitiesUsed starts at 0');
  assertEq(char.encountersBypassed, 0, 'encountersBypassed starts at 0');
}

// ════════════════════════════════════════════════════════════════════════
// startScene()
// ════════════════════════════════════════════════════════════════════════

section('startScene()');

{
  const char = createCharacter('fighter', 'Test');
  char.classData.abilities[0].used = true;
  char.classData.abilities[1].used = true;
  startScene(char);
  assertEq(char.classData.abilities[0].used, false, 'ability 0 recharged');
  assertEq(char.classData.abilities[1].used, false, 'ability 1 recharged');
  assertEq(char.scenesCompleted, 1, 'scenesCompleted = 1');
}

{
  const char = createCharacter('cleric', 'Test');
  startScene(char); startScene(char); startScene(char);
  assertEq(char.scenesCompleted, 3, 'scenesCompleted = 3 after 3 scenes');
}

// ════════════════════════════════════════════════════════════════════════
// getEncounterActions()
// ════════════════════════════════════════════════════════════════════════

section('getEncounterActions()');

{
  const char = createCharacter('fighter', 'Test');
  const actions = getEncounterActions(char, 'combat');
  assertEq(actions.length, 2, 'returns 2 actions for fighter');
  assert('relevant' in actions[0], 'action has relevant flag');
}

{
  const char = createCharacter('fighter', 'Test');
  const actions = getEncounterActions(char, 'combat');
  const shield = actions.find(a => a.id === 'shield_block');
  const strike = actions.find(a => a.id === 'power_strike');
  assert(shield.relevant === true, 'shield_block relevant to combat');
  assert(strike.relevant === true, 'power_strike relevant to combat');
}

{
  const char = createCharacter('fighter', 'Test');
  const actions = getEncounterActions(char, 'social');
  let allIrrelevant = true;
  for (const a of actions) { if (a.relevant) allIrrelevant = false; }
  assert(allIrrelevant, 'fighter abilities irrelevant to social');
}

{
  const char = createCharacter('cleric', 'Test');
  const actions = getEncounterActions(char, 'investigation');
  const sense = actions.find(a => a.id === 'divine_sense');
  assert(sense.relevant === true, 'divine_sense relevant to investigation');
}

{
  const char = createCharacter('mage', 'Test');
  startScene(char);
  useEncounterAbility(char, 'arcane_shield');
  const actions = getEncounterActions(char, 'combat');
  assertEq(actions.length, 1, 'excludes used ability, 1 remaining');
  assertEq(actions[0].id, 'reveal', 'remaining ability is reveal');
}

// ════════════════════════════════════════════════════════════════════════
// useEncounterAbility()
// ════════════════════════════════════════════════════════════════════════

section('useEncounterAbility()');

{
  const char = createCharacter('rogue', 'Test');
  const result = useEncounterAbility(char, 'shadow_step');
  assert(result.success === true, 'shadow_step success');
  assertEq(result.ability.id, 'shadow_step', 'result contains ability');
  assert(result.bypass === true, 'shadow_step bypasses encounter');
  assertEq(char.abilitiesUsed, 1, 'abilitiesUsed = 1');
  assertEq(char.encountersBypassed, 1, 'encountersBypassed = 1');
}

{
  const char = createCharacter('rogue', 'Test');
  const result = useEncounterAbility(char, 'silver_tongue');
  assert(result.bypass === true, 'silver_tongue bypasses NPC');
  assertEq(char.encountersBypassed, 1, 'encountersBypassed = 1');
}

{
  const char = createCharacter('cleric', 'Test');
  const result = useEncounterAbility(char, 'turn_undead');
  assert(result.bypass === true, 'turn_undead bypasses encounter');
}

{
  const char = createCharacter('fighter', 'Test');
  const result = useEncounterAbility(char, 'shield_block');
  assert(result.bypass === false, 'shield_block does not bypass');
}

{
  const char = createCharacter('fighter', 'Test');
  useEncounterAbility(char, 'shield_block');
  const result = useEncounterAbility(char, 'shield_block');
  assert(result.success === false, 'cannot use ability twice');
}

{
  const char = createCharacter('mage', 'Test');
  const result = useEncounterAbility(char, 'fireball');
  assert(result.success === false, 'unknown ability returns failure');
}

{
  const char = createCharacter('cleric', 'Test');
  useEncounterAbility(char, 'divine_sense');
  useEncounterAbility(char, 'turn_undead');
  assertEq(char.abilitiesUsed, 2, 'abilitiesUsed = 2');
}

// ════════════════════════════════════════════════════════════════════════
// resolveDamage()
// ════════════════════════════════════════════════════════════════════════

section('resolveDamage()');

{
  const char = createCharacter('fighter', 'Test');
  const result = resolveDamage(char, 5, 'physical', null);
  assertEq(result.actualDamage, 5, 'full damage no defense');
  assertEq(char.hp, 7, 'HP reduced to 7');
  assertEq(char.totalDamageTaken, 5, 'totalDamageTaken = 5');
}

{
  const char = createCharacter('fighter', 'Test');
  const defense = char.classData.abilities[0]; // shield_block
  const result = resolveDamage(char, 5, 'physical', defense);
  assertEq(result.actualDamage, 2, 'shield mitigates to 2');
  assertEq(result.mitigated, 3, 'mitigated 3');
  assertEq(char.totalDamageMitigated, 3, 'totalDamageMitigated = 3');
}

{
  const char = createCharacter('mage', 'Test');
  resolveDamage(char, 3, 'physical', null);
  resolveDamage(char, 2, 'supernatural', null);
  assertEq(char.totalDamageTaken, 5, 'cumulative damage = 5');
  assertEq(char.hp, 3, 'HP = 3 after cumulative');
}

// ════════════════════════════════════════════════════════════════════════
// recoverHealth()
// ════════════════════════════════════════════════════════════════════════

section('recoverHealth()');

{
  const char = createCharacter('cleric', 'Test');
  resolveDamage(char, 6, 'physical', null);
  const result = recoverHealth(char, 3);
  assertEq(result.healed, 3, 'healed 3 HP');
  assertEq(char.hp, 7, 'HP = 7');
  assertEq(char.totalHealingReceived, 3, 'totalHealingReceived = 3');
}

{
  const char = createCharacter('fighter', 'Test');
  resolveDamage(char, 2, 'physical', null);
  recoverHealth(char, 100);
  assertEq(char.hp, 12, 'healing caps at maxHp');
  assertEq(char.totalHealingReceived, 2, 'only healed 2');
}

// ════════════════════════════════════════════════════════════════════════
// getCharacterSummary()
// ════════════════════════════════════════════════════════════════════════

section('getCharacterSummary()');

{
  const char = createCharacter('rogue', 'Shadow');
  startScene(char);
  resolveDamage(char, 3, 'physical', null);
  const summary = getCharacterSummary(char);
  assertEq(summary.name, 'Shadow', 'summary name');
  assertEq(summary.className, 'Rogue', 'summary className');
  assertEq(summary.hp, 6, 'summary hp');
  assertEq(summary.maxHp, 9, 'summary maxHp');
  assertClose(summary.hpPercent, 67, 1, 'hpPercent ~67');
  assertEq(summary.scenesCompleted, 1, 'summary scenesCompleted');
  assertEq(summary.abilitiesAvailable, 2, 'abilitiesAvailable');
  assertEq(summary.abilitiesTotal, 2, 'abilitiesTotal');
  assertEq(summary.totalDamageTaken, 3, 'summary totalDamageTaken');
}

{
  const char = createCharacter('mage', 'Test');
  resolveDamage(char, 1, 'physical', null);
  const summary = getCharacterSummary(char);
  assertClose(summary.hpPercent, 88, 1, 'hpPercent 87.5 rounds ~88');
}

// ════════════════════════════════════════════════════════════════════════
// Re-exported helpers
// ════════════════════════════════════════════════════════════════════════

section('Re-exported helpers');

assertEq(getClassIds().length, 4, 'getClassIds returns 4');
assertEq(getClassSummaries().length, 4, 'getClassSummaries returns 4');

// ════════════════════════════════════════════════════════════════════════
// Full adventure simulation
// ════════════════════════════════════════════════════════════════════════

section('Full adventure simulation');

{
  const char = createCharacter('fighter', 'Sir Aldric');
  startScene(char);
  const defense = useEncounterAbility(char, 'shield_block');
  assert(defense.success === true, 'scene1: shield_block used');
  resolveDamage(char, 6, 'physical', defense.ability);
  assertEq(char.hp, 9, 'scene1: HP=9 after shield+damage');
  useEncounterAbility(char, 'power_strike');
  assertEq(char.abilitiesUsed, 2, 'scene1: 2 abilities used');

  startScene(char);
  resolveDamage(char, 4, 'physical', null);
  assertEq(char.hp, 5, 'scene2: HP=5');
  recoverHealth(char, 2);
  assertEq(char.hp, 7, 'scene2: HP=7 after heal');

  startScene(char);
  const finalDefense = useEncounterAbility(char, 'shield_block');
  resolveDamage(char, 8, 'supernatural', finalDefense.ability);
  assertEq(char.hp, 0, 'scene3: HP=0 (defeated)');

  const summary = getCharacterSummary(char);
  assertEq(summary.scenesCompleted, 3, 'adventure: 3 scenes');
  assertEq(summary.totalDamageTaken, 15, 'adventure: total dmg=15');
  assertEq(summary.totalDamageMitigated, 3, 'adventure: mitigated=3');
  assertEq(summary.totalHealingReceived, 2, 'adventure: healed=2');
}

{
  const char = createCharacter('rogue', 'Whisper');
  startScene(char);
  const stealth = useEncounterAbility(char, 'shadow_step');
  assert(stealth.bypass === true, 'rogue: shadow_step bypass');
  startScene(char);
  const talk = useEncounterAbility(char, 'silver_tongue');
  assert(talk.bypass === true, 'rogue: silver_tongue bypass');
  const summary = getCharacterSummary(char);
  assertEq(summary.totalDamageTaken, 0, 'rogue: no damage');
  assertEq(summary.encountersBypassed, 2, 'rogue: 2 bypasses');
}

// ════════════════════════════════════════════════════════════════════════
// Results
// ════════════════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════════════════');
console.log('  RESULTS: ' + passed + '/' + total + ' passed, ' + failed + ' failed');
console.log('═══════════════════════════════════════════════════════════════════════');

if (failures.length > 0) {
  console.log('\nFAILURES:');
  failures.forEach(f => console.log('  ✗ ' + f));
}

process.exit(failed > 0 ? 1 : 0);
