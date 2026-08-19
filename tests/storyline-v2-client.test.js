'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const client = fs.readFileSync(path.join(__dirname, '..', 'public/src/storyline-v2-client.js'), 'utf8');
assert.ok(client.includes('StorylineV2Client'));
assert.ok(client.includes("Action is not in the current server catalog"));
assert.ok(client.includes('catalogVersion'));
assert.ok(client.includes('storyline-v2-action'));
assert.ok(client.includes('iconKey'));
assert.ok(client.includes('aria-label'));
assert.ok(client.includes('renderBookHistory'));
assert.ok(client.includes('renderBookmarkRail'));
assert.ok(client.includes('renderBookmarkReview'));
assert.ok(client.includes('Replay from here'));
assert.ok(client.includes('Close bookmark review'));
assert.ok(client.includes('aria-live'));
assert.ok(client.includes('slice(0, 2)'));
assert.ok(client.includes('content-type'));
assert.ok(client.includes('data && data.error'));
assert.ok(!client.includes('Math.random'));
assert.ok(!client.includes('createAction'));
console.log('  ✓ Storyline v2 client adapter remains catalog-bound and presentation-only');
