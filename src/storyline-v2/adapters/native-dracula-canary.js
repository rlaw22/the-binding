'use strict';

// Native, source-generated Dracula canary loader. This boundary intentionally
// contains no legacy field translation or runtime authoring logic.
const fs = require('fs');
const path = require('path');
const { compileAdventure } = require('../domain');

const manifestPath = path.join(__dirname, '..', '..', '..', 'content', 'ingestion', 'dracula-1897', 'full-book', 'manifest.json');
function buildDraculaCanaryManifest() {
  const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  return compileAdventure(raw);
}
module.exports = { buildDraculaCanaryManifest, manifestPath };
