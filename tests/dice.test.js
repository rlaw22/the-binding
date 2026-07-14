/**
 * The Binding — Dice Service Comprehensive Test Suite
 *
 * Tests all 4 dice modules:
 *   1. random.js       — crypto RNG, provably-fair proofs
 *   2. dice-types.js   — type catalogue, animation selection
 *   3. dice-service.js — core rolling engine, history, leaderboard
 *   4. rule-engine/dice.js — expression parser, keep/drop notation
 *
 * Run with: node tests/dice.test.js
 */

let passed = 0;
let failed = 0;
let total = 0;
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

function assertThrows(fn, label) {
  total++;
  try { fn(); failed++; failures.push(label); console.error('  ✗ ' + label + ' — expected throw'); }
  catch (e) { passed++; console.log('  ✓ ' + label); }
}

function section(name) { console.log('\n═══ ' + name + ' ═══'); }

// ════════════════════════════════════════════════════════════════════════
// 1. RANDOM MODULE
// ════════════════════════════════════════════════════════════════════════

section('random.js — randomInt');
const { randomInt, randomBytes, generateProof, verifyProof } = require('../src/dice/random');

{
  for (let i = 0; i < 50; i++) {
    const v = randomInt(1, 20);
    assert(v >= 1 && v <= 20, 'randomInt(1,20) in range: ' + v);
  }
  assertEq(randomInt(5, 5), 5, 'randomInt(5,5) = 5');

  const seen = new Set();
  for (let i = 0; i < 500; i++) seen.add(randomInt(1, 6));
  assert(seen.size === 6, 'randomInt(1,6) hits all 6 faces in 500 rolls');

  assertThrows(() => randomInt(5, 3), 'randomInt throws when max < min');
  assertThrows(() => randomInt(1.5, 3), 'randomInt throws for non-integer min');
}

section('random.js — randomBytes');
{
  const buf = randomBytes(16);
  assert(Buffer.isBuffer(buf), 'randomBytes returns a Buffer');
  assertEq(buf.length, 16, 'randomBytes(16) returns 16 bytes');
  assertThrows(() => randomBytes(0), 'randomBytes(0) throws');
  assertThrows(() => randomBytes(-1), 'randomBytes(-1) throws');
}

section('random.js — provably-fair proofs');
{
  const seed = 'testseed12345678';
  const proof = generateProof(seed, 0);

  assert(typeof proof.proof === 'string', 'proof is a string');
  assertEq(proof.proof.length, 64, 'proof is 64 hex chars (SHA-256)');
  assertEq(proof.seed, seed, 'proof echoes seed');
  assertEq(proof.nonce, 0, 'proof echoes nonce');
  assert(typeof proof.timestamp === 'string', 'proof has timestamp');

  assert(verifyProof(proof.proof, seed, 0, proof.timestamp), 'valid proof verifies');
  assert(!verifyProof('deadbeef' + proof.proof.slice(8), seed, 0, proof.timestamp), 'tampered proof fails');
  assert(!verifyProof(proof.proof, 'wrongseed9999999', 0, proof.timestamp), 'wrong seed fails');
  assert(!verifyProof(proof.proof, seed, 1, proof.timestamp), 'wrong nonce fails');
  assert(!verifyProof(proof.proof, seed, 0, '2020-01-01T00:00:00.000Z'), 'wrong timestamp fails');

  const p2 = generateProof(seed, 1);
  assert(proof.proof !== p2.proof, 'different nonces produce different hashes');

  assert(!verifyProof(null, seed, 0, proof.timestamp), 'null proof returns false');
  assert(!verifyProof(proof.proof, '', 0, proof.timestamp), 'empty seed returns false');
  assertThrows(() => generateProof('', 0), 'empty seed throws');
  assertThrows(() => generateProof(seed, -1), 'negative nonce throws');
}

// ════════════════════════════════════════════════════════════════════════
// 2. DICE TYPES MODULE
// ════════════════════════════════════════════════════════════════════════

section('dice-types.js — type catalogue');
const { DICE_TYPES, getDiceType, getAnimationForRoll, getRandomAnimation } = require('../src/dice/dice-types');

{
  assertEq(DICE_TYPES.length, 7, '7 dice types defined');

  for (const dt of DICE_TYPES) {
    assert(typeof dt.type === 'string', dt.type + ' has type string');
    assert(typeof dt.faces === 'number' && dt.faces > 0, dt.type + ' has positive faces');
    assert(typeof dt.animationCount === 'number', dt.type + ' has animationCount');
    assert(typeof dt.animationPrefix === 'string', dt.type + ' has animationPrefix');
  }

  const d20 = getDiceType('d20');
  assertEq(d20.faces, 20, 'd20 has 20 faces');
  const d4 = getDiceType('d4');
  assertEq(d4.faces, 4, 'd4 has 4 faces');

  assertThrows(() => getDiceType('d7'), 'd7 throws unknown die type');
  assertThrows(() => getDiceType('d20 '), 'd20 with space throws');
}

section('dice-types.js — animation selection');
{
  const a1 = getAnimationForRoll('d20', 15);
  const a2 = getAnimationForRoll('d20', 15);
  assertEq(a1.file, a2.file, 'same roll produces same animation file (deterministic)');

  const a3 = getAnimationForRoll('d20', 1);
  assert(typeof a3.file === 'string' && a3.file.includes('d20_roll_'), 'animation file path is valid');
  assert(typeof a3.duration === 'number' && a3.duration > 0, 'animation has positive duration');

  const d4anim = getAnimationForRoll('d4', 2);
  const d20anim = getAnimationForRoll('d20', 2);
  assert(d20anim.duration > d4anim.duration, 'd20 duration > d4 duration');

  const recent = [getAnimationForRoll('d6', 1).file, getAnimationForRoll('d6', 2).file];
  const rand = getRandomAnimation('d6', 3, recent);
  assert(!recent.includes(rand.file), 'random animation avoids recently used');

  const randAll = getRandomAnimation('d6', 1, []);
  assert(typeof randAll.file === 'string', 'random animation with no recents returns valid file');
}


// ════════════════════════════════════════════════════════════════════════
// 3. DICE SERVICE MODULE
// ════════════════════════════════════════════════════════════════════════

section('dice-service.js — rollDice basics');
const DiceService = require('../src/dice/dice-service');

{
  // Basic d20 roll
  const r = DiceService.rollDice({ type: 'd20' });
  assert(r.total >= 1 && r.total <= 20, 'd20 roll in [1,20]: got ' + r.total);
  assert(r.proof && r.proof.hash, 'd20 roll has proof hash');
  assert(r.rolls && r.rolls.length === 1, 'd20 produces 1 roll');
  assert(typeof r.id === 'string' && r.id.length > 0, 'roll has unique id');
  assert(typeof r.timestamp === 'string', 'roll has timestamp');
  assert(r.animation && r.animation.file, 'roll has animation');
  assert(r.context === 'general', 'default context is general');

  // Multi-die
  const two = DiceService.rollDice({ type: 'd6', count: 3 });
  assert(two.rolls.length === 3, '3d6 produces 3 rolls');
  assert(two.natural >= 3 && two.natural <= 18, '3d6 natural in [3,18]: got ' + two.natural);

  // With flat modifier
  const mod = DiceService.rollDice({ type: 'd20', modifier: 5 });
  assert(mod.total >= 6 && mod.total <= 25, 'd20+5 in [6,25]: got ' + mod.total);
  assert(mod.modifiersApplied.length === 1, 'flat modifier recorded');

  // Negative modifier
  const neg = DiceService.rollDice({ type: 'd20', modifier: -3 });
  assert(neg.total >= -2 && neg.total <= 17, 'd20-3 in [-2,17]: got ' + neg.total);

  // All die types work
  for (const dt of ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100']) {
    const roll = DiceService.rollDice({ type: dt });
    assert(roll.rolls.length === 1, dt + ' produces 1 roll');
  }
}

section('dice-service.js — advantage & disadvantage');
{
  // Advantage: 2d20, keep highest
  const adv = DiceService.rollDice({ type: 'd20', advantage: true });
  assert(adv.rolls.length === 2, 'advantage rolls 2d20');
  assert(adv.advantage === true, 'advantage flag set');
  const keptAdv = adv.rolls.find(r => r.kept);
  assert(keptAdv, 'advantage marks kept roll');
  assert(adv.natural === keptAdv.value, 'advantage natural = kept value');

  // Disadvantage: 2d20, keep lowest
  const dis = DiceService.rollDice({ type: 'd20', disadvantage: true });
  assert(dis.rolls.length === 2, 'disadvantage rolls 2d20');
  assert(dis.disadvantage === true, 'disadvantage flag set');
  const keptDis = dis.rolls.find(r => r.kept);
  assert(keptDis, 'disadvantage marks kept roll');
  assert(dis.natural === keptDis.value, 'disadvantage natural = kept value');

  // Advantage only works for single d20
  const multiAdv = DiceService.rollDice({ type: 'd6', count: 2, advantage: true });
  assert(multiAdv.rolls.length === 2, 'advantage with 2d6 just rolls 2d6 (not advantage logic)');
  assert(multiAdv.advantage === true, 'advantage flag preserved even for non-d20');
}

section('dice-service.js — structured modifiers');
{
  const mods = [
    { source: 'strength', type: 'ability', value: 3, description: 'STR +3' },
    { source: 'proficiency', type: 'prof', value: 2, description: 'Prof +2' },
  ];
  const r = DiceService.rollDice({ type: 'd20', modifier: 1, modifiers: mods });
  assert(r.modifiersApplied.length === 3, '3 modifiers applied (1 flat + 2 structured)');
  assert(r.total >= 7 && r.total <= 26, 'd20+1+3+2 in [7,26]: got ' + r.total);
}

section('dice-service.js — crit & fumble detection');
{
  // Roll many attack rolls to potentially hit crit/fumble
  let sawCrit = false, sawFumble = false;
  for (let i = 0; i < 500; i++) {
    const r = DiceService.rollDice({ type: 'd20', context: 'attack_roll' });
    if (r.natural === 20) sawCrit = true;
    if (r.natural === 1) sawFumble = true;
  }
  assert(sawCrit, 'saw natural 20 crit in 500 attack rolls');
  assert(sawFumble, 'saw natural 1 fumble in 500 attack rolls');

  // Crit only for attack_roll context
  const save = DiceService.rollDice({ type: 'd20', context: 'saving_throw' });
  assert(save.isCrit === false || save.natural !== 20, 'no crit flag for saving throws (only when natural 20)');
}

section('dice-service.js — convenience wrappers');
{
  const atk = DiceService.rollAttack({ modifier: 5, characterId: 'fighter-1' });
  assert(atk.context === 'attack_roll', 'rollAttack sets context');
  assert(atk.characterId === 'fighter-1', 'rollAttack sets characterId');
  assert(atk.type === 'd20', 'rollAttack uses d20');

  const dmg = DiceService.rollDamage('d8', 2, 3);
  assert(dmg.context === 'damage', 'rollDamage sets context');
  assert(dmg.rolls.length === 2, 'rollDamage rolls 2d8');
  assert(dmg.total >= 5 && dmg.total <= 19, '2d8+3 in [5,19]: got ' + dmg.total);

  const save = DiceService.rollSave({ modifier: 2 });
  assert(save.context === 'saving_throw', 'rollSave sets context');

  const chk = DiceService.rollCheck({ modifier: -1 });
  assert(chk.context === 'skill_check', 'rollCheck sets context');

  const simple = DiceService.roll('d6', 2);
  assert(simple.total >= 3 && simple.total <= 8, 'roll(d6,2) in [3,8]: got ' + simple.total);
}

section('dice-service.js — proof verification');
{
  const r = DiceService.rollDice({ type: 'd20' });
  assert(DiceService.verifyRollProof(r), 'proof verifies for fresh roll');

  // Tamper with proof
  const tampered = { ...r, proof: { ...r.proof, seed: 'tampered' } };
  assert(!DiceService.verifyRollProof(tampered), 'tampered proof fails verification');

  // Null/missing proof
  assert(!DiceService.verifyRollProof(null), 'null record fails');
  assert(!DiceService.verifyRollProof({}), 'missing proof fails');
  assert(!DiceService.verifyRollProof({ proof: null }), 'null proof fails');
}

section('dice-service.js — roll history');
{
  DiceService.clearHistory();
  assertEq(DiceService.getRollHistory().length, 0, 'clearHistory empties history');

  DiceService.rollDice({ type: 'd20', characterId: 'hero-1' });
  DiceService.rollDice({ type: 'd6', count: 2, characterId: 'hero-2' });
  DiceService.rollDice({ type: 'd20', characterId: 'hero-1' });

  const recent = DiceService.getRecentRolls(2);
  assertEq(recent.length, 2, 'getRecentRolls(2) returns 2');

  const hero1 = DiceService.getCharacterRolls('hero-1');
  assertEq(hero1.length, 2, 'hero-1 has 2 rolls in history');

  const hero2 = DiceService.getCharacterRolls('hero-2');
  assertEq(hero2.length, 1, 'hero-2 has 1 roll in history');

  // Bounded to 100
  DiceService.clearHistory();
  for (let i = 0; i < 110; i++) DiceService.rollDice({ type: 'd4' });
  assertEq(DiceService.getRollHistory().length, 100, 'history bounded at 100');
}

section('dice-service.js — leaderboard stats');
{
  DiceService.clearHistory();
  for (let i = 0; i < 100; i++) {
    DiceService.rollDice({ type: 'd20', context: 'attack_roll', characterId: 'hero' });
  }
  const stats = DiceService.getLeaderboardStats();
  assertEq(stats.totalRolls, 100, 'leaderboard counts 100 rolls');
  assert(stats.critCount >= 0, 'critCount is non-negative');
  assert(stats.fumbleCount >= 0, 'fumbleCount is non-negative');
  assert(stats.byCharacter['hero'], 'leaderboard tracks hero');
  assert(stats.byCharacter['hero'].rolls === 100, 'hero rolled 100 times');
  assert(typeof stats.averageByType['d20'] === 'number', 'averageByType has d20');
}

// ════════════════════════════════════════════════════════════════════════
// 4. RULE ENGINE DICE (expression parser)
// ════════════════════════════════════════════════════════════════════════

section('rule-engine/dice.js — expression parsing');
const RuleDice = require('../src/rule-engine/dice');

{
  // Basic NdS
  const r1 = RuleDice.roll('2d6');
  assert(r1.rolls.length === 2, '2d6 produces 2 rolls');
  assert(r1.total >= 2 && r1.total <= 12, '2d6 in [2,12]: got ' + r1.total);
  assert(r1.dropped.length === 0, '2d6 drops nothing');

  // With modifier
  const r2 = RuleDice.roll('1d20+5');
  assert(r2.total >= 6 && r2.total <= 25, '1d20+5 in [6,25]: got ' + r2.total);
  assertEq(r2.modifier, 5, 'modifier is 5');

  // Negative modifier
  const r3 = RuleDice.roll('1d20-2');
  assert(r3.modifier === -2, 'modifier is -2');

  // Drop lowest
  const r4 = RuleDice.roll('4d6dl1');
  assert(r4.rolls.length === 3, '4d6dl1 keeps 3 dice');
  assert(r4.dropped.length === 1, '4d6dl1 drops 1 die');
  assert(r4.total >= 3 && r4.total <= 18, '4d6dl1 in [3,18]: got ' + r4.total);

  // Keep highest
  const r5 = RuleDice.roll('2d20kh1');
  assert(r5.rolls.length === 1, '2d20kh1 keeps 1');
  assert(r5.dropped.length === 1, '2d20kh1 drops 1');
  assert(r5.natural !== null, '2d20kh1 has natural (d20 single kept)');

  // Keep lowest
  const r6 = RuleDice.roll('2d20kl1');
  assert(r6.rolls.length === 1, '2d20kl1 keeps 1');
  assert(r6.dropped.length === 1, '2d20kl1 drops 1');
}

section('rule-engine/dice.js — aliases');
{
  const adv = RuleDice.roll('advantage');
  assert(adv.rolls.length === 1, 'advantage alias keeps 1');
  assert(adv.dropped.length === 1, 'advantage alias drops 1');

  const dis = RuleDice.roll('disadvantage');
  assert(dis.rolls.length === 1, 'disadvantage alias keeps 1');
  assert(dis.dropped.length === 1, 'disadvantage alias drops 1');

  // Via options
  const advOpt = RuleDice.roll('1d20', { advantage: true });
  assert(advOpt.rolls.length === 1, 'advantage via opts keeps 1');
}

section('rule-engine/dice.js — convenience functions');
{
  const ab = RuleDice.rollAbilityScore();
  assert(ab.rolls.length === 3, '4d6dl1 keeps 3');
  assert(ab.total >= 3 && ab.total <= 18, 'ability score in [3,18]: got ' + ab.total);

  const d20 = RuleDice.rollD20(3);
  assert(d20.total >= 4 && d20.total <= 23, 'd20+3 in [4,23]: got ' + d20.total);

  const adv = RuleDice.rollWithAdvantage(2);
  assert(adv.total >= 3 && adv.total <= 22, 'advantage+2 in [3,22]: got ' + adv.total);

  const dis = RuleDice.rollWithDisadvantage(-1);
  assert(dis.total >= 0 && dis.total <= 19, 'disadvantage-1 in [0,19]: got ' + dis.total);

  const death = RuleDice.rollDeathSave();
  assert(death.total >= 1 && death.total <= 20, 'death save in [1,20]: got ' + death.total);
}

section('rule-engine/dice.js — rollMultiple');
{
  const results = RuleDice.rollMultiple(['1d20+5', '2d6', '1d4-1']);
  assertEq(results.length, 3, 'rollMultiple returns 3 results');
  assert(results[0].total >= 6 && results[0].total <= 25, 'first result is d20+5');
  assert(results[1].total >= 2 && results[1].total <= 12, 'second result is 2d6');
}

section('rule-engine/dice.js — error handling');
{
  assertThrows(() => RuleDice.roll('invalid'), 'invalid expression throws');
  assertThrows(() => RuleDice.roll(''), 'empty string throws');
  assertThrows(() => RuleDice.roll(42), 'non-string throws');
  assertThrows(() => RuleDice.roll('1d7'), 'invalid die size d7 throws');
}

section('rule-engine/dice.js — breakdown strings');
{
  const r = RuleDice.roll('2d6+3');
  assert(typeof r.breakdown === 'string', 'result has breakdown string');
  assert(r.breakdown.includes('rolled'), 'breakdown contains "rolled"');
  assert(r.breakdown.includes('='), 'breakdown contains "="');
  assert(r.expression === '2d6+3', 'result echoes expression');
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
