/**
 * The Binding — Inventory Shoppe Enhancements Test Suite
 * Tests: getShoppeTransactionLog, hagglePrice, getShoppeRecommendations
 */
const {
  createInventory, addItem, buyItem, sellItem,
  getShoppeTransactionLog, hagglePrice, getShoppeRecommendations,
  getShoppeCatalog
} = require('../src/inventory/inventory');

let passed = 0, failed = 0, total = 0;
function assert(c, label) { total++; if (c) { passed++; console.log('  ✓ ' + label); } else { failed++; console.error('  ✗ ' + label); } }
function assertEq(a, e, label) { total++; const av = JSON.stringify(a), ev = JSON.stringify(e); if (av === ev) { passed++; console.log('  ✓ ' + label); } else { failed++; console.error('  ✗ ' + label + ' — expected ' + ev + ', got ' + av); } }
function section(n) { console.log('\n═══ ' + n + ' ═══'); }

// ── Transaction Log ─────────────────────────────────────────────────────

section('Shoppe Transaction Log');

const emptyLog = getShoppeTransactionLog(createInventory());
assertEq(emptyLog.length, 0, 'Empty log for new inventory');

const buyInv = createInventory();
buyItem(buyInv, 'wooden_stake', 100);
const buyLog = getShoppeTransactionLog(buyInv);
assertEq(buyLog.length, 1, 'One buy transaction logged');
assertEq(buyLog[0].type, 'buy', 'Transaction type is buy');
assertEq(buyLog[0].itemId, 'wooden_stake', 'Transaction has correct itemId');
assert(buyLog[0].timestamp, 'Transaction has timestamp');
assert(buyLog[0].itemName, 'Transaction has itemName');
assert(buyLog[0].price > 0, 'Transaction has positive price');

const sellInv = createInventory();
addItem(sellInv, 'crucifix');
sellItem(sellInv, 'crucifix');
const sellLog = getShoppeTransactionLog(sellInv);
assertEq(sellLog.length, 1, 'One sell transaction logged');
assertEq(sellLog[0].type, 'sell', 'Transaction type is sell');
assertEq(sellLog[0].itemId, 'crucifix', 'Sell transaction has correct itemId');

const multiInv = createInventory();
buyItem(multiInv, 'wooden_stake', 200);
buyItem(multiInv, 'garlic', 200);
sellItem(multiInv, 'wooden_stake');
const multiLog = getShoppeTransactionLog(multiInv);
assertEq(multiLog.length, 3, 'Three transactions accumulated');
assertEq(multiLog[0].type, 'buy', 'First is buy');
assertEq(multiLog[1].type, 'buy', 'Second is buy');
assertEq(multiLog[2].type, 'sell', 'Third is sell');

// ── Haggle Price ────────────────────────────────────────────────────────

section('Haggle Price');

const h1 = hagglePrice(30, 0.5);
assert(typeof h1.finalPrice === 'number', 'Haggle returns numeric finalPrice');
assert(typeof h1.roll === 'number', 'Haggle returns numeric roll');
assert(typeof h1.discount === 'number', 'Haggle returns numeric discount');
assert(h1.finalPrice >= 1, 'Final price >= 1');
assert(h1.roll >= 1 && h1.roll <= 20, 'Roll between 1 and 20');

let highTotal = 0, lowTotal = 0;
const runs = 300;
for (let i = 0; i < runs; i++) {
  highTotal += hagglePrice(100, 1.0).finalPrice;
  lowTotal += hagglePrice(100, 0.0).finalPrice;
}
const highAvg = highTotal / runs;
const lowAvg = lowTotal / runs;
assert(highAvg < lowAvg, 'High charisma avg (' + highAvg.toFixed(1) + ') < low charisma avg (' + lowAvg.toFixed(1) + ')');

let allMinOk = true;
for (let i = 0; i < 100; i++) {
  if (hagglePrice(1, 1.0).finalPrice < 1) allMinOk = false;
}
assert(allMinOk, 'Minimum price is always >= 1');

let allRollsOk = true;
for (let i = 0; i < 50; i++) {
  const r = hagglePrice(50, 0.5).roll;
  if (r < 1 || r > 20) allRollsOk = false;
}
assert(allRollsOk, 'All rolls between 1-20');

// ── Recommendations ─────────────────────────────────────────────────────

section('Shoppe Recommendations');

const noMoney = getShoppeRecommendations(createInventory(), 0);
assertEq(noMoney.length, 0, 'No recommendations with 0 coins');

const cheapRecs = getShoppeRecommendations(createInventory(), 15);
assert(cheapRecs.length > 0, 'Has recommendations for 15 coins');
for (const rec of cheapRecs) {
  assert(rec.price <= 15, 'Recommended item ' + rec.name + ' costs <= 15');
  assert(rec.name, 'Recommendation has name');
  assert(rec.reason, 'Recommendation has reason');
}

const ownedInv = createInventory();
addItem(ownedInv, 'wooden_stake');
const ownRecs = getShoppeRecommendations(ownedInv, 1000);
const stakeRec = ownRecs.find(r => r.id === 'wooden_stake');
assert(!stakeRec, 'Does not recommend already-owned item');

for (let i = 1; i < cheapRecs.length; i++) {
  assert(cheapRecs[i].price >= cheapRecs[i - 1].price, 'Sorted by price ascending');
}

// ── Summary ─────────────────────────────────────────────────────────────

console.log('\n═══════════════════════════════════════════');
console.log('  SHOPPE ENHANCEMENTS RESULTS: ' + passed + '/' + total + ' passed, ' + failed + ' failed');
console.log('═══════════════════════════════════════════\n');

if (failed > 0) process.exit(1);
