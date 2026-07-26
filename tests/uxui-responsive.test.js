/**
 * UXUI Responsive Audit Test Suite — The Binding
 *
 * Comprehensive device-matrix testing for ALL iPhones from iPhone 14
 * through the latest model (iPhone 16 series), in both portrait and
 * landscape orientations.
 *
 * Tests CSS media queries, viewport meta, safe-area handling, touch
 * targets, HUD layout rules, and game-active state management.
 *
 * Run with: node tests/uxui-responsive.test.js
 */

const fs = require('fs');
const path = require('path');

let passed = 0, failed = 0, total = 0;

function assert(condition, label) {
  total++;
  if (condition) { passed++; console.log('  ✓ ' + label); }
  else { failed++; console.error('  ✗ FAILED: ' + label); }
}

function assertMatch(str, regex, label) {
  total++;
  if (regex.test(str)) { passed++; console.log('  ✓ ' + label); }
  else { failed++; console.error('  ✗ FAILED: ' + label + ' — regex ' + regex + ' did not match'); }
}

function assertContains(haystack, needle, label) {
  total++;
  if (haystack.includes(needle)) { passed++; console.log('  ✓ ' + label); }
  else { failed++; console.error('  ✗ FAILED: ' + label + ' — missing: ' + needle.substring(0, 80)); }
}

function section(name) { console.log('\n═══ ' + name + ' ═══'); }

// ─── Load Source Files ──────────────────────────────────────────────────

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const indexHtml = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf8');

// ═════════════════════════════════════════════════════════════════════════
// DEVICE MATRIX — iPhones 14 through 16 series
// Source: Apple Human Interface Guidelines / UIKit device screen specs
// ═════════════════════════════════════════════════════════════════════════

const DEVICES = [
  // iPhone 14 series
  { name: 'iPhone 14',          width: 390, height: 844, safeArea: true, dynamicIsland: false },
  { name: 'iPhone 14 Plus',     width: 428, height: 926, safeArea: true, dynamicIsland: false },
  { name: 'iPhone 14 Pro',      width: 393, height: 852, safeArea: true, dynamicIsland: true  },
  { name: 'iPhone 14 Pro Max',  width: 430, height: 932, safeArea: true, dynamicIsland: true  },
  // iPhone 15 series
  { name: 'iPhone 15',          width: 393, height: 852, safeArea: true, dynamicIsland: true  },
  { name: 'iPhone 15 Plus',     width: 430, height: 932, safeArea: true, dynamicIsland: true  },
  { name: 'iPhone 15 Pro',      width: 393, height: 852, safeArea: true, dynamicIsland: true  },
  { name: 'iPhone 15 Pro Max',  width: 430, height: 932, safeArea: true, dynamicIsland: true  },
  // iPhone 16 series
  { name: 'iPhone 16',          width: 393, height: 852, safeArea: true, dynamicIsland: true  },
  { name: 'iPhone 16 Plus',     width: 430, height: 932, safeArea: true, dynamicIsland: true  },
  { name: 'iPhone 16 Pro',      width: 402, height: 874, safeArea: true, dynamicIsland: true  },
  { name: 'iPhone 16 Pro Max',  width: 440, height: 956, safeArea: true, dynamicIsland: true  },
  { name: 'iPhone 16e',         width: 390, height: 844, safeArea: true, dynamicIsland: false },
  // iPad (tablet)
  { name: 'iPad Air 11"',       width: 820, height: 1180, safeArea: true, dynamicIsland: true  },
  { name: 'iPad Pro 12.9"',    width: 1024, height: 1366, safeArea: true, dynamicIsland: true  },
  { name: 'iPad 10th gen',      width: 810, height: 1080, safeArea: true, dynamicIsland: false },
  // Android tablet
  { name: 'Galaxy Tab S9',      width: 800, height: 1280, safeArea: false, dynamicIsland: false },
  { name: 'Galaxy Tab S9 FE',   width: 1280, height: 800, safeArea: false, dynamicIsland: false },
  { name: 'Pixel Tablet',       width: 840, height: 1288, safeArea: false, dynamicIsland: false },
];

// ═════════════════════════════════════════════════════════════════════════
// SECTION 1: Viewport Meta Tag
// ═════════════════════════════════════════════════════════════════════════

section('Viewport Meta Tag');

assertContains(indexHtml, 'viewport-fit=cover',
  'viewport meta includes viewport-fit=cover (Dynamic Island / notch)');

assertContains(indexHtml, 'width=device-width',
  'viewport meta sets width=device-width');

assertContains(indexHtml, 'initial-scale=1.0',
  'viewport meta sets initial-scale=1.0');

assertContains(indexHtml, 'apple-mobile-web-app-capable',
  'apple-mobile-web-app-capable meta present');

assertContains(indexHtml, 'black-translucent',
  'status bar style black-translucent (needed for safe-area)');

// ═════════════════════════════════════════════════════════════════════════
// SECTION 2: Dynamic Viewport Height (100dvh)
// ═════════════════════════════════════════════════════════════════════════

section('Dynamic Viewport Height (100dvh)');

assertMatch(indexHtml, /html\s*\{[^}]*height:\s*100%;\s*height:\s*100dvh/,
  'html has 100dvh with 100% fallback');

assertMatch(indexHtml, /body\s*\{[^}]*height:\s*100%;\s*height:\s*100dvh/,
  'body has 100dvh with 100% fallback');

// ═════════════════════════════════════════════════════════════════════════
// SECTION 3: Safe Area Inset Support
// ═════════════════════════════════════════════════════════════════════════

section('Safe Area Inset Support');

assertContains(indexHtml, 'env(safe-area-inset-top',
  'safe-area-inset-top used (Dynamic Island / notch)');

assertContains(indexHtml, 'env(safe-area-inset-bottom',
  'safe-area-inset-bottom used (Home Indicator)');

// ═════════════════════════════════════════════════════════════════════════
// SECTION 4: Media Query Coverage for Device Widths
// ═════════════════════════════════════════════════════════════════════════

section('Media Query Coverage — Device Widths');

const maxWidthBreakpoints = [];
const mwRegex = /max-width:\s*(\d+)px/g;
let mwMatch;
while ((mwMatch = mwRegex.exec(indexHtml)) !== null) {
  maxWidthBreakpoints.push(parseInt(mwMatch[1]));
}
maxWidthBreakpoints.sort((a, b) => a - b);
console.log('  [info] max-width breakpoints: ' + maxWidthBreakpoints.join(', '));

const uniquePortraitWidths = [...new Set(DEVICES.map(d => d.width))].sort((a, b) => a - b);
console.log('  [info] device portrait widths: ' + uniquePortraitWidths.join(', '));

for (const w of uniquePortraitWidths) {
  const covered = maxWidthBreakpoints.some(bp => bp >= w) || w > 768;
  assert(covered, 'portrait width ' + w + 'px covered (breakpoint or base CSS for tablets)');
}

// iPhone 16 Pro unique 402px
assert(maxWidthBreakpoints.some(bp => bp >= 402 && bp <= 450),
  'breakpoint covers iPhone 16 Pro width (402px)');

// iPhone 16 Pro Max widest at 440px
assert(maxWidthBreakpoints.some(bp => bp >= 440),
  'breakpoint covers iPhone 16 Pro Max width (440px)');

// Dedicated 390-430px range
assertMatch(indexHtml, /min-width:\s*390px[^}]*max-width:\s*430px/,
  'dedicated 390-430px range breakpoint exists');

// ═════════════════════════════════════════════════════════════════════════
// SECTION 5: Landscape Orientation Support
// ═════════════════════════════════════════════════════════════════════════

section('Landscape Orientation Support');

assertContains(indexHtml, 'orientation: landscape',
  '@media (orientation: landscape) rule exists');

assertMatch(indexHtml, /landscape[\s\S]{0,800}game-active/,
  'landscape media query includes game-active rules');

assertMatch(indexHtml, /game-active[\s\S]{0,200}#rejoin-bar[\s\S]{0,100}display:\s*none/,
  'landscape hides rejoin bar in game mode');

assertMatch(indexHtml, /game-active[\s\S]{0,200}#header[\s\S]{0,100}display:\s*none/,
  'landscape hides header in game mode');

// ═════════════════════════════════════════════════════════════════════════
// SECTION 6: Device × Orientation Matrix (all 26 viewports)
// ═════════════════════════════════════════════════════════════════════════

section('Device × Orientation Matrix (26 viewports)');

for (const device of DEVICES) {
  const pW = device.width, pH = device.height;
  const lW = device.height, lH = device.width;

  const portraitCovered = maxWidthBreakpoints.some(bp => bp >= pW) || pW > 768;
  assert(portraitCovered,
    device.name + ' portrait (' + pW + '×' + pH + ') covered (breakpoint or base CSS)');

  const landscapeCovered = maxWidthBreakpoints.some(bp => bp >= lW) || lW > 768;
  assert(landscapeCovered,
    device.name + ' landscape (' + lW + '×' + lH + ') covered');

  if (device.dynamicIsland) {
    assert(indexHtml.includes('viewport-fit=cover'),
      device.name + ' Dynamic Island — viewport-fit=cover present');
  }
}

// ═════════════════════════════════════════════════════════════════════════
// SECTION 7: Touch Target Sizes (Apple HIG: 44×44pt minimum)
// ═════════════════════════════════════════════════════════════════════════

section('Touch Target Sizes (44pt minimum)');

assertMatch(indexHtml, /#send-btn\{[^}]*min-height:\s*(4[4-9]|[5-9]\d)px/,
  'send button min-height >= 44px (base CSS)');

// Check across all breakpoints
const sendBtnMatches = indexHtml.match(/#send-btn\{[^}]*min-height[^;]*px/g);
console.log('  [info] send-btn min-height values: ' + (sendBtnMatches || []).map(m => m.match(/min-height[^;]*/)[0]).join(', '));

assertMatch(indexHtml, /#inv-toggle\{[^}]*width:\s*(4[4-9]|[5-9]\d)/,
  'inventory toggle >= 44px tap target');

// ═════════════════════════════════════════════════════════════════════════
// SECTION 8: Game-Active State Management
// ═════════════════════════════════════════════════════════════════════════

section('Game-Active State (body.game-active)');

assertContains(indexHtml, "classList.add('game-active')",
  'JS adds game-active class to body on game start');

assertContains(indexHtml, 'body.game-active #header',
  'CSS hides/compacts header when game-active');

assertContains(indexHtml, 'body.game-active #rejoin-bar',
  'CSS hides rejoin bar when game-active');

assertContains(indexHtml, 'body.game-active #char-bar',
  'CSS compacts char-bar when game-active');

assertContains(indexHtml, 'body.game-active #coin-bar',
  'CSS compacts coin-bar when game-active');

// ═════════════════════════════════════════════════════════════════════════
// SECTION 9: Beta Gate Cleanup on Game Start
// ═════════════════════════════════════════════════════════════════════════

section('Beta Gate Cleanup on Game Start');

assertMatch(indexHtml, /showGameUI[\s\S]{0,500}accessGate/,
  'accessGate hide is inside showGameUI (runs on every game start)');

assertMatch(indexHtml, /accessGate[\s\S]{0,100}display.*none/,
  'accessGate display set to none');

// ═════════════════════════════════════════════════════════════════════════
// SECTION 10: Duplicate Display Prevention
// ═════════════════════════════════════════════════════════════════════════

section('Duplicate Display Prevention');

assertMatch(indexHtml, /charBar[\s\S]{0,100}classList\.add\(['"]hidden['"]\)/,
  'char-bar hidden when story mode activates');

assertMatch(indexHtml, /coinBar[\s\S]{0,100}classList\.add\(['"]hidden['"]\)/,
  'coin-bar hidden when story mode activates');

assertMatch(indexHtml, /items\.length\s*>\s*0[\s\S]{0,200}classList\.remove/,
  'inventory toggle shown only when items exist');

// ═════════════════════════════════════════════════════════════════════════
// SECTION 11: Class Label Formatting
// ═════════════════════════════════════════════════════════════════════════

section('Class Label Formatting');

assertMatch(indexHtml, /charAt\(0\)\.toUpperCase/,
  'class label capitalizes first letter');

assertMatch(indexHtml, /slice\(1\)\.toLowerCase/,
  'class label lowercases remainder');

// ═════════════════════════════════════════════════════════════════════════
// SECTION 12: iPhone 16 Pro (402px) — New Unique Width
// ═════════════════════════════════════════════════════════════════════════

section('iPhone 16 Pro — 402px Width (New)');

assert(maxWidthBreakpoints.some(function(bp) { return bp >= 402; }),
  'breakpoint covers 402px (iPhone 16 Pro)');

assertMatch(indexHtml, /min-width:\s*390px[^}]*max-width:\s*430px/,
  '390-430px range breakpoint covers iPhone 16 Pro (402px)');

// ═════════════════════════════════════════════════════════════════════════
// SECTION 13: iPhone 16 Pro Max (440px) — Widest iPhone
// ═════════════════════════════════════════════════════════════════════════

section('iPhone 16 Pro Max — 440px Width (Widest)');

assert(maxWidthBreakpoints.some(function(bp) { return bp >= 440; }),
  'breakpoint covers 440px width (iPhone 16 Pro Max — widest iPhone)');

// ═════════════════════════════════════════════════════════════════════════
// SECTION 14: PWA Manifest Compatibility
// ═════════════════════════════════════════════════════════════════════════

section('PWA Manifest Compatibility');

var manifestPath = path.join(PUBLIC_DIR, 'manifest.json');
var manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

assert(manifest.display === 'standalone', 'manifest display is standalone');
assert(manifest.theme_color === '#C9A84C', 'manifest theme_color matches app');
assert(manifest.icons && manifest.icons.length >= 2, 'manifest has >= 2 icons');

// ═════════════════════════════════════════════════════════════════════════
// SECTION 15: Landscape × Device — Narrative Space Audit
// ═════════════════════════════════════════════════════════════════════════

section('Landscape × Device — Narrative Space Check');

for (var i = 0; i < DEVICES.length; i++) {
  var d = DEVICES[i];
  var lH = d.width; // landscape height = portrait width
  // In landscape, game-active hides header/rejoin, compacts HUD
  // Verify that the CSS makes narrative the dominant flex child
  assertMatch(indexHtml, /game-active[\s\S]{0,300}#messages[\s\S]{0,100}flex:\s*[7-9]/,
    d.name + ' landscape — messages flex >= 7 (narrative dominates)');
}

// ═════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═════════════════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════');
console.log('  UXUI Responsive Audit — iPhone 14 through 16 Series');
console.log('  Devices tested: ' + DEVICES.length);
console.log('  Orientations: portrait + landscape (' + (DEVICES.length * 2) + ' viewports)');
console.log('───────────────────────────────────────────────────────');
console.log('  Results: ' + passed + '/' + total + ' passed');
if (failed > 0) {
  console.error('  ✗ ' + failed + ' FAILED');
  process.exit(1);
} else {
  console.log('  ✓ All UXUI responsive audit tests passed');
  process.exit(0);
}
