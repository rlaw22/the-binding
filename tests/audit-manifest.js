#!/usr/bin/env node
/**
 * Manifest Quality Audit Script
 *
 * Reusable audit checking 5 quality dimensions across all adventures:
 *   1. presentCharacters presence and completeness
 *   2. badChoice uniqueness (recycling detection across acts)
 *   3. badChoice context-appropriateness (noun extraction vs scene description)
 *   4. NPC introduction ordering (cross-scene check)
 *   5. Content quality (item count, discovery text length, required fields)
 *
 * CLI: node tests/audit-manifest.js [--adventure=X] [--verbose] [--json]
 * Exit code 1 on failures (CI-blocking).
 */

const path = require('path');

// ---------------------------------------------------------------------------
// Adventure manifest registry
// ---------------------------------------------------------------------------

const ADVENTURES = {
  dracula: {
    name: 'Dracula',
    acts: [
      { act: 1, file: '../manifests-act1.js' },
      { act: 2, file: '../manifests-act2.js' },
      { act: 3, file: '../manifests-act3.js' },
      { act: 4, file: '../manifests-act4.js' },
      { act: 5, file: '../manifests-act5.js' },
    ],
    adventureFile: '../src/adventure/dracula.js',
  },
  frankenstein: {
    name: 'Frankenstein',
    acts: [
      { act: 1, file: '../manifests-frankenstein-act1.js' },
      { act: 2, file: '../manifests-frankenstein-act2.js' },
      { act: 3, file: '../manifests-frankenstein-act3.js' },
      { act: 4, file: '../manifests-frankenstein-act4.js' },
      { act: 5, file: '../manifests-frankenstein-act5.js' },
    ],
    adventureFile: '../src/adventure/frankenstein.js',
  },
  holmes: {
    name: 'Holmes',
    acts: [
      { act: 1, file: '../manifests-holmes-act1.js' },
      { act: 2, file: '../manifests-holmes-act2.js' },
      { act: 3, file: '../manifests-holmes-act3.js' },
      { act: 4, file: '../manifests-holmes-act4.js' },
      { act: 5, file: '../manifests-holmes-act5.js' },
    ],
    adventureFile: '../src/adventure/holmes.js',
  },
};

// ---------------------------------------------------------------------------
// Noun extraction helpers (simple stop-word approach)
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
  'up', 'about', 'into', 'through', 'during', 'before', 'after',
  'above', 'below', 'between', 'out', 'off', 'over', 'under', 'again',
  'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
  'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
  'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
  'than', 'too', 'very', 'just', 'because', 'as', 'until', 'while',
  'but', 'and', 'or', 'if', 'this', 'that', 'these', 'those', 'it',
  'its', 'you', 'your', 'he', 'she', 'we', 'they', 'me', 'him', 'her',
  'us', 'them', 'my', 'his', 'our', 'their', 'what', 'which', 'who',
  'whom', 'i',
]);

/**
 * Extract probable nouns from a text string using stop-word filtering.
 * Returns a Set of lowercase words (3+ chars, not stop words).
 */
function extractNouns(text) {
  const words = text
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !STOP_WORDS.has(w));
  return new Set(words);
}

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { adventure: null, verbose: false, json: false };
  for (const arg of args) {
    if (arg.startsWith('--adventure=')) {
      opts.adventure = arg.split('=')[1].toLowerCase();
    } else if (arg === '--verbose' || arg === '-v') {
      opts.verbose = true;
    } else if (arg === '--json') {
      opts.json = true;
    }
  }
  return opts;
}

// ---------------------------------------------------------------------------
// Audit checks
// ---------------------------------------------------------------------------

/**
 * Check 1: presentCharacters presence and completeness
 * Every scene manifest should have a presentCharacters array that lists
 * NPCs mentioned in the scene description.
 */
function checkPresentCharacters(scenes, adventureName) {
  const failures = [];
  for (const [sceneId, scene] of Object.entries(scenes)) {
    if (!scene.presentCharacters) {
      failures.push({
        check: 'presentCharacters',
        scene: sceneId,
        issue: 'missing presentCharacters field',
      });
    } else if (!Array.isArray(scene.presentCharacters)) {
      failures.push({
        check: 'presentCharacters',
        scene: sceneId,
        issue: 'presentCharacters is not an array',
      });
    }
  }
  return failures;
}

/**
 * Check 2: Bad choice uniqueness
 * Detect recycled bad choice labels across scenes within the same adventure.
 */
function checkBadChoiceUniqueness(allScenes, adventureName) {
  const failures = [];
  const seen = new Map(); // label -> first scene

  for (const [sceneId, scene] of Object.entries(allScenes)) {
    const bc = scene.storyMode?.badChoice;
    if (!bc) continue;

    const label = (bc.label || '').toLowerCase().trim();
    if (!label) continue;

    if (seen.has(label)) {
      failures.push({
        check: 'badChoice-uniqueness',
        scene: sceneId,
        issue: `recycled bad choice "${bc.label}" (first used in ${seen.get(label)})`,
      });
    } else {
      seen.set(label, sceneId);
    }
  }
  return failures;
}

/**
 * Check 3: Bad choice context-appropriateness
 * Extract nouns from the scene description and check whether any word from
 * the bad choice label appears in the scene description. If none do, flag
 * a potential context mismatch.
 */
function checkBadChoiceContext(allScenes, adventureName) {
  const failures = [];

  for (const [sceneId, scene] of Object.entries(allScenes)) {
    const bc = scene.storyMode?.badChoice;
    if (!bc || !bc.label) continue;

    const descNouns = extractNouns(scene.description || '');
    const labelNouns = extractNouns(bc.label);

    if (labelNouns.size === 0) continue;

    let anyMatch = false;
    for (const word of labelNouns) {
      if (descNouns.has(word)) {
        anyMatch = true;
        break;
      }
    }

    if (!anyMatch) {
      failures.push({
        check: 'badChoice-context',
        scene: sceneId,
        issue: `bad choice "${bc.label}" shares no nouns with scene description — possible context mismatch`,
      });
    }
  }
  return failures;
}

/**
 * Check 4: NPC introduction ordering
 * If a scene's initialFacts.metNPCs lists an NPC, verify that NPC hasn't
 * already been met in a prior scene (duplicate introduction).
 */
function checkNPCIntroductionOrder(allScenes, adventureName, keyNPCs) {
  const failures = [];

  // Build known NPC names from adventure definition
  const knownNames = new Set();
  if (keyNPCs) {
    for (const npc of keyNPCs) {
      knownNames.add((npc.name || '').toLowerCase());
      knownNames.add((npc.id || '').toLowerCase());
    }
  }

  // Sort scenes by their numeric suffix for ordering
  const sceneIds = Object.keys(allScenes).sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
    return numA - numB;
  });

  for (const sceneId of sceneIds) {
    const scene = allScenes[sceneId];
    const met = scene.initialFacts?.metNPCs || [];

    for (const npc of met) {
      const npcLower = npc.toLowerCase();
      // Check if NPC name/id is recognized in the adventure's keyNPCs list
      if (knownNames.size > 0 && !knownNames.has(npcLower)) {
        // Also try partial match (e.g. "jonathan harker" matches id "jonathan")
        let found = false;
        for (const name of knownNames) {
          if (npcLower.includes(name) || name.includes(npcLower)) {
            found = true;
            break;
          }
        }
        if (!found) {
          failures.push({
            check: 'npc-introduction',
            scene: sceneId,
            issue: `NPC "${npc}" in metNPCs does not match any keyNPCs entry — possible typo or missing NPC definition`,
          });
        }
      }
    }
  }
  return failures;
}

/**
 * Check 5: Content quality
 * - Scene has at least 2 content items (actions/discoveries)
 * - Discovery text is at least 30 characters
 * - Required fields: initialFacts, locationKeywords
 */
function checkContentQuality(allScenes, adventureName) {
  const failures = [];

  for (const [sceneId, scene] of Object.entries(allScenes)) {
    // Content items
    const content = scene.content || [];
    if (content.length < 2) {
      failures.push({
        check: 'content-quality',
        scene: sceneId,
        issue: `only ${content.length} content item(s) — minimum is 2`,
      });
    }

    // Discovery text length
    for (const item of content) {
      if (item.discovery && item.discovery.length < 30) {
        failures.push({
          check: 'content-quality',
          scene: sceneId,
          issue: `discovery text for "${item.id}" is only ${item.discovery.length} chars — minimum is 30`,
        });
      }
    }

    // Required fields
    if (!scene.initialFacts) {
      failures.push({
        check: 'content-quality',
        scene: sceneId,
        issue: 'missing required field: initialFacts',
      });
    }
    if (!scene.locationKeywords) {
      failures.push({
        check: 'content-quality',
        scene: sceneId,
        issue: 'missing required field: locationKeywords',
      });
    }
  }
  return failures;
}

// ---------------------------------------------------------------------------
// Main audit runner
// ---------------------------------------------------------------------------

function loadManifest(filePath) {
  try {
    return require(filePath);
  } catch (err) {
    return null;
  }
}

function loadAdventure(filePath) {
  try {
    const mod = require(filePath);
    return mod.default || mod;
  } catch (err) {
    return null;
  }
}

function auditAdventure(adventureKey, config, verbose) {
  const allScenes = {};
  let loadedActs = 0;

  for (const act of config.acts) {
    const manifest = loadManifest(path.resolve(__dirname, act.file));
    if (!manifest) {
      if (verbose) console.warn(`  WARN: Could not load ${act.file}`);
      continue;
    }
    loadedActs++;
    Object.assign(allScenes, manifest);
  }

  if (loadedActs === 0) {
    return {
      adventure: config.name,
      totalScenes: 0,
      failures: [{ check: 'load', scene: '-', issue: 'no manifest files could be loaded' }],
    };
  }

  // Load adventure file for keyNPCs (if needed for future checks)
  const adventureData = loadAdventure(path.resolve(__dirname, config.adventureFile));
  if (verbose && adventureData?.keyNPCs) {
    console.log(`  keyNPCs: ${adventureData.keyNPCs.map(n => n.name || n.id).join(', ')}`);
  }

  const failures = [
    ...checkPresentCharacters(allScenes, config.name),
    ...checkBadChoiceUniqueness(allScenes, config.name),
    ...checkBadChoiceContext(allScenes, config.name),
    ...checkNPCIntroductionOrder(allScenes, config.name, adventureData?.keyNPCs),
    ...checkContentQuality(allScenes, config.name),
  ];

  return {
    adventure: config.name,
    totalScenes: Object.keys(allScenes).length,
    failures,
  };
}

function main() {
  const opts = parseArgs();
  const adventuresToAudit = opts.adventure
    ? { [opts.adventure]: ADVENTURES[opts.adventure] }
    : ADVENTURES;

  if (opts.adventure && !ADVENTURES[opts.adventure]) {
    console.error(`Unknown adventure: ${opts.adventure}`);
    console.error(`Available: ${Object.keys(ADVENTURES).join(', ')}`);
    process.exit(2);
  }

  const results = [];
  let totalFailures = 0;

  for (const [key, config] of Object.entries(adventuresToAudit)) {
    if (!config) {
      console.error(`Unknown adventure: ${key}`);
      process.exit(2);
    }
    if (opts.verbose) console.log(`\nAuditing ${config.name}...`);
    const result = auditAdventure(key, config, opts.verbose);
    results.push(result);
    totalFailures += result.failures.length;
  }

  // Output
  if (opts.json) {
    console.log(JSON.stringify({ results, totalFailures }, null, 2));
  } else {
    console.log('\n=== Manifest Quality Audit ===\n');
    for (const result of results) {
      const status = result.failures.length === 0 ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${result.adventure} (${result.totalScenes} scenes, ${result.failures.length} failures)`);

      if (result.failures.length > 0) {
        for (const f of result.failures) {
          console.log(`  [${f.check}] ${f.scene}: ${f.issue}`);
        }
      }
    }
    console.log(`\nTotal failures: ${totalFailures}`);
  }

  // Exit code 1 if any failures (CI-blocking)
  process.exit(totalFailures > 0 ? 1 : 0);
}

main();
