'use strict';

// Native, source-generated Dracula canary loader. This boundary intentionally
// contains no legacy field translation or runtime authoring logic.
const fs = require('fs');
const path = require('path');
const { compileAdventure } = require('../domain');
const { authorDraculaOpening } = require('../content/dracula-opening');

const manifestPath = path.join(__dirname, '..', '..', '..', 'content', 'ingestion', 'dracula-1897', 'full-book', 'manifest.json');
const branchingOpeningManifestPath = path.join(__dirname, '..', '..', '..', 'content', 'ingestion', 'dracula-1897', 'candidates', 'dracula-opening-dramatic-002', 'manifest.json');

function compileNativeManifest(filePath, adventureId = 'dracula', applyOpeningAuthoring = true) {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  // Preserve the public adventure identifier used by the V2 transport while
  // selecting source-authored content instead of legacy content.
  raw.adventureId = adventureId;
  const authored = applyOpeningAuthoring ? authorDraculaOpening(raw) : raw;
  return compileAdventure(authored);
}

function buildDraculaCanaryManifest() {
  return compileNativeManifest(manifestPath);
}

/**
 * The branching opening is opt-in and intended only for the protected
 * personal canary. The public service continues to use the native canary.
 */
function buildDraculaBranchingOpeningManifest() {
  return compileNativeManifest(branchingOpeningManifestPath, 'dracula', false);
}

module.exports = {
  buildDraculaCanaryManifest,
  buildDraculaBranchingOpeningManifest,
  manifestPath,
  branchingOpeningManifestPath
};
