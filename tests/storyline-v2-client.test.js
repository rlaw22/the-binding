'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const client = fs.readFileSync(path.join(__dirname, '..', 'public/src/storyline-v2-client.js'), 'utf8');
assert.ok(client.includes('StorylineV2Client'));
assert.ok(client.includes("Action is not in the current server catalog"));
assert.ok(client.includes('catalogVersion'));
assert.ok(!client.includes('Math.random'));
assert.ok(!client.includes('createAction'));
console.log('  ✓ Storyline v2 client adapter remains catalog-bound and presentation-only');
