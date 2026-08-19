'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'public/index.html'), 'utf8');
const bridge = fs.readFileSync(path.join(__dirname, '..', 'public/src/storyline-v2-browser-bridge.js'), 'utf8');

assert.ok(html.includes('/src/storyline-v2-client.js'));
assert.ok(html.includes('/src/storyline-v2-browser-bridge.js'));
assert.ok(html.includes('tryStartStorylineV2'));
assert.ok(html.includes('startGame().then'));
assert.ok(bridge.includes("/api/storyline-v2/status"));
assert.ok(bridge.includes('status.enabled'));
assert.ok(bridge.includes('StorylineV2Client'));
assert.ok(bridge.includes('renderCatalog'));
assert.ok(bridge.includes('return false'));
assert.ok(!bridge.includes('createAction'));
console.log('  ✓ Storyline v2 browser bridge is feature-flagged with legacy fallback');
