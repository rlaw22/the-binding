#!/usr/bin/env node
/**
 * audit-manifest.js — Quality audit for adventure manifest files
 * 
 * Checks 5 quality dimensions:
 * 1. presentCharacters — every scene must have non-empty presentCharacters
 * 2. No recycled bad choices — badChoice IDs must be unique across each adventure
 * 3. Context match — badChoice nouns must overlap with scene description nouns
 * 4. No NPC duplicates — presentCharacters must not contain duplicates
 * 5. Valid NPC names — presentCharacters entries must exist in keyNPCs roster
 * 
 * Usage: node tests/audit-manifest.js [--adventure=dracula|frankenstein|holmes] [--verbose] [--json]
 */
const fs = require('fs');
const path = require('path');

// ── NPC rosters (must match fix-manifests.js) ──
const NPC_ROSTER = {
  dracula: new Set([
    'jonathan harker', 'dracula', 'count dracula', 'mina', 'lucy',
    'van_helsing', 'seward', 'renfield', 'godalming', 'mr. hawkins',
    'innkeeper', 'mysterious coachman', 'quincey morris'
  ]),
  frankenstein: new Set([
    'victor frankenstein', 'the creature', 'elizabeth', 'henry clerval',
    'alphonse frankenstein', 'caroline frankenstein', 'captain walton',
    'felix de lacey', 'agatha de lacey', 'de lacey (old man)', 'safie',
    'professor krempe', 'professor waldman', 'justine moritz'
  ]),
  holmes: new Set([
    'holmes', 'watson', 'sir_henry', 'stapleton', 'mortimer',
    'barrymore', 'mrs_barrymore', 'selden', 'lestrade', 'beryl',
    'laura_lyons', 'james wilder'
  ])
};

// ── File mapping ──
const ADV_FILES = {
  dracula: ['manifests-act1.js','manifests-act2.js','manifests-act3.js','manifests-act4.js','manifests-act5.js'],
  frankenstein: ['manifests-frankenstein-act1.js','manifests-frankenstein-act2.js','manifests-frankenstein-act3.js','manifests-frankenstein-act4.js','manifests-frankenstein-act5.js'],
  holmes: ['manifests-holmes-act1.js','manifests-holmes-act2.js','manifests-holmes-act3.js','manifests-holmes-act4.js','manifests-holmes-act5.js']
};

// ── Noun extraction (simple) ──
function extractNouns(text) {
  if (!text) return new Set();
  const words = text.toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3);
  // Common stop words to exclude
  const stops = new Set(['this','that','with','from','have','been','were','they','their','your','will','would','could','should','into','about','there','then','than','them','some','when','what','which','where','just','more','also','very','much','such','each','most','only','other','into','over','after','before','between','under','again','further','once','here','these','those','both','same','does','doing','done']);
  return new Set(words.filter(w => !stops.has(w)));
}

// ── Parse args ──
const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const jsonOutput = args.includes('--json');
const advArg = args.find(a => a.startsWith('--adventure='));
const filterAdv = advArg ? advArg.split('=')[1] : null;

// ── Run audit ──
const results = {};
let totalFailures = 0;

for (const [adv, files] of Object.entries(ADV_FILES)) {
  if (filterAdv && adv !== filterAdv) continue;
  
  const advResults = {
    missingPresentCharacters: [],
    duplicatePresentCharacters: [],
    invalidNPCNames: [],
    recycledBadChoices: [],
    contextMismatches: []
  };
  
  const seenBadChoiceIds = new Map(); // id → first scene
  
  for (const file of files) {
    const filePath = path.join(__dirname, '..', file);
    if (!fs.existsSync(filePath)) {
      advResults.missingPresentCharacters.push({ file, scene: 'FILE_MISSING', detail: `File not found: ${file}` });
      continue;
    }
    
    let manifest;
    try {
      manifest = require(filePath);
    } catch (e) {
      advResults.missingPresentCharacters.push({ file, scene: 'PARSE_ERROR', detail: e.message });
      continue;
    }
    
    for (const [sceneId, scene] of Object.entries(manifest)) {
      // 1. presentCharacters exists and non-empty
      if (!scene.presentCharacters || !Array.isArray(scene.presentCharacters) || scene.presentCharacters.length === 0) {
        advResults.missingPresentCharacters.push({ file, scene: sceneId });
      } else {
        // 4. No duplicates in presentCharacters
        const charSet = new Set(scene.presentCharacters);
        if (charSet.size !== scene.presentCharacters.length) {
          advResults.duplicatePresentCharacters.push({ file, scene: sceneId, chars: scene.presentCharacters });
        }
        
        // 5. Valid NPC names
        const roster = NPC_ROSTER[adv];
        for (const name of scene.presentCharacters) {
          if (!roster.has(name)) {
            advResults.invalidNPCNames.push({ file, scene: sceneId, name });
          }
        }
      }
      
      // 2. No recycled bad choices
      const bc = scene.storyMode?.badChoice;
      if (bc) {
        if (seenBadChoiceIds.has(bc.id)) {
          advResults.recycledBadChoices.push({ file, scene: sceneId, id: bc.id, firstSeen: seenBadChoiceIds.get(bc.id) });
        } else {
          seenBadChoiceIds.set(bc.id, { file, scene: sceneId });
        }
        
        // 3. Context match — badChoice label nouns should overlap with description nouns
        const descNouns = extractNouns(scene.description);
        const labelNouns = extractNouns(bc.label + ' ' + (bc.consequence || ''));
        const overlap = [...labelNouns].filter(n => descNouns.has(n));
        if (overlap.length === 0 && descNouns.size > 0 && labelNouns.size > 0) {
          advResults.contextMismatches.push({
            file, scene: sceneId,
            descSample: (scene.description || '').substring(0, 80),
            label: bc.label,
            descNouns: [...descNouns].slice(0, 10),
            labelNouns: [...labelNouns].slice(0, 10)
          });
        }
      }
    }
  }
  
  const failureCount = Object.values(advResults).reduce((s, a) => s + a.length, 0);
  totalFailures += failureCount;
  results[adv] = { failures: failureCount, details: advResults };
}

// ── Output ──
if (jsonOutput) {
  console.log(JSON.stringify({ totalFailures, results }, null, 2));
} else {
  console.log('\n📋 Manifest Quality Audit\n');
  for (const [adv, data] of Object.entries(results)) {
    console.log(`── ${adv.toUpperCase()} (${data.failures} failures) ──`);
    const d = data.details;
    if (d.missingPresentCharacters.length) console.log(`  ❌ Missing presentCharacters: ${d.missingPresentCharacters.length}`);
    if (d.duplicatePresentCharacters.length) console.log(`  ❌ Duplicate presentCharacters: ${d.duplicatePresentCharacters.length}`);
    if (d.invalidNPCNames.length) console.log(`  ❌ Invalid NPC names: ${d.invalidNPCNames.length}`);
    if (d.recycledBadChoices.length) console.log(`  ❌ Recycled bad choices: ${d.recycledBadChoices.length}`);
    if (d.contextMismatches.length) console.log(`  ⚠️  Context mismatches: ${d.contextMismatches.length}`);
    if (data.failures === 0) console.log('  ✅ All checks pass');
    
    if (verbose) {
      for (const m of d.missingPresentCharacters) console.log(`    MISSING: ${m.scene} in ${m.file}`);
      for (const m of d.duplicatePresentCharacters) console.log(`    DUP_CHARS: ${m.scene} in ${m.file}`);
      for (const m of d.invalidNPCNames) console.log(`    INVALID_NPC: "${m.name}" in ${m.scene} (${m.file})`);
      for (const m of d.recycledBadChoices) console.log(`    RECYCLED: "${m.id}" in ${m.scene} (${m.file}) — first seen in ${m.firstSeen.file}/${m.firstSeen.scene}`);
      for (const m of d.contextMismatches) console.log(`    CTX_MISS: ${m.scene} — "${m.label}" vs desc starting "${m.descSample}..."`);
    }
    console.log();
  }
  console.log(`Total: ${totalFailures} failures across ${Object.keys(results).length} adventures\n`);
}

process.exit(totalFailures > 0 ? 1 : 0);
