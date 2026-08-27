'use strict';

/**
 * Browser-independent Northstar contract gate.
 *
 * This intentionally does not claim pixel fidelity. It verifies the static
 * player contract and the server-side journey without requiring Node 20,
 * Playwright, Chromium, or native desktop libraries.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { compileAdventure, createState, buildCatalog, resolveTurn } = require('../src/storyline-v2');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const client = fs.readFileSync(path.join(root, 'public/src/storyline-v2-northstar.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'content/ingestion/dracula-1897/candidates/dracula-opening-dramatic-002/manifest.json'), 'utf8'));
const adventure = compileAdventure(manifest);

function required(value, label) {
  assert.ok(value, `${label} is required`);
}

// Static document contract.
required(html.includes('class="northstar-app"'), 'Northstar root');
required(html.includes('id="launch"'), 'launch surface');
required(html.includes('id="game"'), 'game surface');
required(html.includes('id="class-select"'), 'role selector');
required(html.includes('id="token" type="password"'), 'private token input');
required(html.includes('id="token-help"'), 'token help text');
required(html.includes('id="actions"'), 'action container');
required(html.includes('id="narrative"'), 'narrative container');
required(html.includes('id="response"'), 'recent response container');
required(html.includes('id="journal"'), 'journal container');
required(html.includes('id="text-intent"'), 'bounded text input');
required(html.includes('id="text-intent-submit"'), 'text submit control');
required(html.includes('aria-live="polite"'), 'live update region');
required(/@media\s*\(max-width:\s*760px\)/.test(html), 'responsive layout rule');
required(html.includes('min-height:44px'), 'touch target rule');
required(html.includes('/src/storyline-v2-northstar.js'), 'Northstar client script');

// Client transport and presentation contract.
required(client.includes("var api = '/api/storyline-v2-personal'"), 'protected API boundary');
required(client.includes("Authorization: 'Bearer ' + token"), 'bearer authorization');
required(client.includes("catalogVersion: catalog.catalogVersion"), 'catalog version submission');
required(client.includes('turnId:'), 'idempotent turn identifier');
required(client.includes('action.disabled'), 'disabled action presentation');
required(client.includes('textContent'), 'safe text rendering');
required(client.includes("status.enabled"), 'canary availability check');

// Authoritative API-equivalent opening replay.
const state = createState(adventure, { classId: 'rogue' });
const catalog = buildCatalog(adventure, state);
const routes = [
  ['dracula_opening_01__trust_warning', 'dracula_opening_02', 'trusted_local_warning'],
  ['dracula_opening_01__investigate_then_board', 'dracula_opening_03', 'evidence_route'],
  ['dracula_opening_01__dismiss_warning', 'dracula_opening_04', 'exposed_route']
];
for (const [actionId, destination, flag] of routes) {
  const result = resolveTurn({
    adventure,
    state: createState(adventure, { classId: 'rogue' }),
    actionId,
    catalogVersion: catalog.catalogVersion,
    turnId: `contract-${actionId}`
  });
  assert.strictEqual(result.result.error, undefined, `${actionId} must resolve`);
  assert.strictEqual(result.result.transition.destinationSceneId, destination);
  assert.strictEqual(result.state.flags[flag], true);
  assert.ok(result.result.dramaticBeat.reaction.length > 20);
  assert.ok(result.result.dramaticBeat.changedSituation.length > 20);
}

console.log('✓ Northstar browser-independent contract and three-route replay');
