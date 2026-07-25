/**
 * iife-wrap.js — Wraps class-abilities.js and story-engine.js in IIFEs
 * exposing window.ClassAbilities and window.StoryEngine respectively.
 * Run: node iife-wrap.js
 */
const fs = require('fs');
const path = require('path');

// ── 1. Wrap class-abilities.js ────────────────────────────────────
{
  const filePath = path.join(__dirname, 'src/story/class-abilities.js');
  let src = fs.readFileSync(filePath, 'utf8');

  // Wrap in IIFE and expose window global
  const wrapped = [
    '/**',
    ' * Class Abilities — 4 classes for Story Mode',
    ' * IIFE-wrapped for browser use. Exposes window.ClassAbilities.',
    ' */',
    '(function() {',
    '',
    src.trim(),
    '',
    '  // Expose as browser global',
    '  window.ClassAbilities = {',
    '    CLASSES: CLASSES,',
    '    getClass: getClass,',
    '    getClassIds: getClassIds,',
    '    getClassSummaries: getClassSummaries,',
    '    rechargeAbilities: rechargeAbilities,',
    '    useAbility: useAbility,',
    '    getAvailableAbilities: getAvailableAbilities,',
    '    applyDamage: applyDamage,',
    '    heal: heal',
    '  };',
    '',
    '})();',
    ''
  ].join('\n');

  fs.writeFileSync(filePath, wrapped, 'utf8');
  console.log('Wrapped class-abilities.js → window.ClassAbilities');
}

// ── 2. Wrap story-engine.js ───────────────────────────────────────
{
  const filePath = path.join(__dirname, 'src/story/story-engine.js');
  let src = fs.readFileSync(filePath, 'utf8');

  // Replace the CommonJS require with window global reference
  src = src.replace(
    /const\s*\{[^}]+\}\s*=\s*require\(['"]\.\/class-abilities['"]\);?/,
    '// Use ClassAbilities from window global (set by class-abilities.js IIFE)\nconst { CLASSES, getClass, rechargeAbilities, useAbility, getAvailableAbilities, applyDamage, heal } = window.ClassAbilities;'
  );

  // Wrap in IIFE and expose window global
  const wrapped = [
    '/**',
    ' * story-engine.js — Deterministic button processing for Story Mode',
    ' * IIFE-wrapped for browser use. Exposes window.StoryEngine.',
    ' */',
    '(function() {',
    '',
    src.trim(),
    '',
    '  // Expose as browser global',
    '  window.StoryEngine = {',
    '    createPlayerState: createPlayerState,',
    '    rechargeForNewScene: rechargeForNewScene,',
    '    generateStoryButtons: generateStoryButtons,',
    '    processButtonAction: processButtonAction,',
    '    processExplore: processExplore,',
    '    processThreat: processThreat,',
    '    processItem: processItem,',
    '    processAbility: processAbility,',
    '    processBadChoice: processBadChoice,',
    '    checkZeroHp: checkZeroHp,',
    '    applyHealing: applyHealing,',
    '    checkItemRequirement: checkItemRequirement,',
    '    checkTacticalBonus: checkTacticalBonus,',
    '    processTravel: processTravel,',
    '    buildButtonLayout: buildButtonLayout,',
    '    buildAtmosphereContext: buildAtmosphereContext',
    '  };',
    '',
    '})();',
    ''
  ].join('\n');

  fs.writeFileSync(filePath, wrapped, 'utf8');
  console.log('Wrapped story-engine.js → window.StoryEngine');
}

console.log('\nDone. Both files IIFE-wrapped.');
