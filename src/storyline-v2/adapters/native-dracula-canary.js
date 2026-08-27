'use strict';

// Native, source-generated Dracula canary loader. This boundary intentionally
// contains no legacy field translation or runtime authoring logic.
const fs = require('fs');
const path = require('path');
const { compileAdventure } = require('../domain');
const { authorDraculaOpening } = require('../content/dracula-opening');

const manifestPath = path.join(__dirname, '..', '..', '..', 'content', 'ingestion', 'dracula-1897', 'full-book', 'manifest.json');
function buildDraculaCanaryManifest() {
  const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  // Preserve the public adventure identifier used by the V2 transport while
  // selecting the native source-authored manifest instead of legacy content.
  raw.adventureId = 'dracula';
  return compileAdventure(authorDraculaOpening(raw));
}
module.exports = { buildDraculaCanaryManifest, manifestPath };
