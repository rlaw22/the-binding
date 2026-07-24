/**
 * PWA & Session Improvements Test Suite
 * 
 * Tests the new session rejoin functions, spectator mode improvements,
 * offline fallback enhancements, and mobile responsiveness changes.
 * Run with: node tests/pwa-improvements.test.js
 */

const fs = require('fs');
const path = require('path');

let passed = 0, failed = 0, total = 0;

function assert(condition, label) {
  total++;
  if (condition) { passed++; console.log('  ✓ ' + label); }
  else { failed++; console.error('  ✗ FAILED: ' + label); }
}

function assertEq(actual, expected, label) {
  total++;
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { passed++; console.log('  ✓ ' + label); }
  else { failed++; console.error('  ✗ FAILED: ' + label + ' — expected ' + e + ', got ' + a); }
}

function section(name) { console.log('\n═══ ' + name + ' ═══'); }

// ─── Session Rejoin Improvements ──────────────────────────────────────
section('Session Rejoin Functions');

const session = require('../src/session/index.js');

// validateRejoin
assert(typeof session.validateRejoin === 'function', 'validateRejoin is exported');

const testSession = session.createSession({ adventureId: 'dracula' });
const testPlayer = session.addPlayer(testSession, { name: 'Hero', race: 'human', class: 'fighter' });

const validResult = session.validateRejoin(testSession, testPlayer.id);
assert(validResult.valid === true, 'validateRejoin returns valid for active session');
assert(validResult.reason === null, 'validateRejoin has null reason for valid session');
assert(validResult.session === testSession, 'validateRejoin returns session reference');

const nullResult = session.validateRejoin(null, 'any-id');
assert(nullResult.valid === false, 'validateRejoin rejects null session');
assertEq(nullResult.reason, 'Session not found', 'validateRejoin reason for null session');

// Completed session
const completedSession = session.createSession({ adventureId: 'dracula' });
completedSession.state = 'completed';
const completedResult = session.validateRejoin(completedSession, 'any-id');
assert(completedResult.valid === false, 'validateRejoin rejects completed session');
assertEq(completedResult.reason, 'Adventure already completed', 'validateRejoin reason for completed session');

// Stale session (set updatedAt to 3 hours ago)
const staleSession = session.createSession({ adventureId: 'dracula' });
staleSession.updatedAt = Date.now() - (3 * 60 * 60 * 1000);
const staleResult = session.validateRejoin(staleSession, 'any-id');
assert(staleResult.valid === false, 'validateRejoin rejects stale session (>2h inactive)');
assertEq(staleResult.reason, 'Session expired due to inactivity', 'validateRejoin reason for stale session');

// Paused session should NOT be considered stale even if old
const pausedSession = session.createSession({ adventureId: 'dracula' });
pausedSession.state = 'paused';
pausedSession.updatedAt = Date.now() - (3 * 60 * 60 * 1000);
const pausedResult = session.validateRejoin(pausedSession, 'any-id');
assert(pausedResult.valid === true, 'validateRejoin accepts old paused session (not stale)');

// recordHeartbeat
assert(typeof session.recordHeartbeat === 'function', 'recordHeartbeat is exported');

const hbSession = session.createSession({ adventureId: 'dracula' });
const hbPlayer = session.addPlayer(hbSession, { name: 'Hero', race: 'human', class: 'fighter' });
const oldUpdatedAt = hbSession.updatedAt;

const hbResult = session.recordHeartbeat(hbSession, hbPlayer.id);
assert(hbResult === true, 'recordHeartbeat returns true for valid player');
assert(hbSession.updatedAt >= oldUpdatedAt, 'recordHeartbeat updates session.updatedAt');
assert(hbPlayer.connected === true, 'recordHeartbeat sets player.connected = true');

const hbFail = session.recordHeartbeat(hbSession, 'nonexistent-id');
assert(hbFail === false, 'recordHeartbeat returns false for invalid player');

// markDisconnected
assert(typeof session.markDisconnected === 'function', 'markDisconnected is exported');

const discSession = session.createSession({ adventureId: 'dracula' });
const discPlayer = session.addPlayer(discSession, { name: 'Hero', race: 'human', class: 'fighter' });
assert(discPlayer.connected === true, 'player starts connected');

const discResult = session.markDisconnected(discSession, discPlayer.id);
assert(discResult === true, 'markDisconnected returns true for valid player');
assert(discPlayer.connected === false, 'markDisconnected sets player.connected = false');

const discFail = session.markDisconnected(discSession, 'nonexistent-id');
assert(discFail === false, 'markDisconnected returns false for invalid player');

// getSessionSummary
assert(typeof session.getSessionSummary === 'function', 'getSessionSummary is exported');

const sumSession = session.createSession({ adventureId: 'frankenstein', sessionName: 'Test Session' });
const sumPlayer = session.addPlayer(sumSession, { name: 'Dr. Frank', race: 'human', class: 'wizard' });
session.addPlayer(sumSession, { name: 'Igor', race: 'human', class: 'rogue', role: 'spectator' });

const summary = session.getSessionSummary(sumSession);
assert(summary.sessionId === sumSession.id, 'summary has correct sessionId');
assertEq(summary.adventureId, 'frankenstein', 'summary has correct adventureId');
assertEq(summary.sessionName, 'Test Session', 'summary has correct sessionName');
assertEq(summary.state, 'lobby', 'summary has correct state');
assertEq(summary.playerCount, 2, 'summary has correct playerCount');
assertEq(summary.hostName, 'Dr. Frank', 'summary has correct hostName');
assertEq(summary.totalTurns, 0, 'summary has correct totalTurns');
assert(typeof summary.updatedAt === 'number', 'summary has updatedAt timestamp');

// ─── Spectator Mode Improvements ─────────────────────────────────────
section('Spectator Mode (spectator.html)');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const spectatorPath = path.join(PUBLIC_DIR, 'spectator.html');
assert(fs.existsSync(spectatorPath), 'spectator.html exists');

const spectatorContent = fs.readFileSync(spectatorPath, 'utf8');

// Should NOT be a "coming soon" page anymore
assert(!spectatorContent.includes('Coming soon'), 'spectator.html is no longer a "coming soon" page');
assert(!spectatorContent.includes('being forged'), 'spectator.html no longer says "being forged"');

// Should have a functional join form
assert(spectatorContent.includes('id="spectate-form"'), 'spectator.html has join form');
assert(spectatorContent.includes('id="spectate-code"'), 'spectator.html has code input');
assert(spectatorContent.includes('id="spectate-name"'), 'spectator.html has name input');
assert(spectatorContent.includes('joinSpectate()'), 'spectator.html has join function');
assert(spectatorContent.includes('/api/rejoin/'), 'spectator.html uses rejoin API');
assert(spectatorContent.includes('/api/sessions/'), 'spectator.html uses sessions API');
assert(spectatorContent.includes('/api/health'), 'spectator.html checks server health');

// Should have proper PWA meta tags
assert(spectatorContent.includes('viewport-fit=cover'), 'spectator.html has viewport-fit=cover');
assert(spectatorContent.includes('apple-mobile-web-app-capable'), 'spectator.html has apple PWA meta');
assert(spectatorContent.includes('manifest.json'), 'spectator.html links to manifest');

// Should have mobile responsive CSS
assert(spectatorContent.includes('max-width:500px'), 'spectator.html has mobile breakpoint');
assert(spectatorContent.includes('max-width:360px'), 'spectator.html has small phone breakpoint');
assert(spectatorContent.includes('safe-area-inset-bottom'), 'spectator.html has safe-area-inset');

// Should have error handling
assert(spectatorContent.includes('error-msg'), 'spectator.html has error display');
assert(spectatorContent.includes('showError'), 'spectator.html has error handling function');

// Should support URL params for pre-filling
assert(spectatorContent.includes("params.get('code')"), 'spectator.html reads ?code= param');
assert(spectatorContent.includes("params.get('session')"), 'spectator.html reads ?session= param');

// ─── Offline Fallback Improvements ───────────────────────────────────
section('Offline Fallback (offline.html)');

const offlinePath = path.join(PUBLIC_DIR, 'offline.html');
assert(fs.existsSync(offlinePath), 'offline.html exists');

const offlineContent = fs.readFileSync(offlinePath, 'utf8');

// Theme colors
assert(offlineContent.includes('#1A1A2E'), 'offline.html uses dark theme background');
assert(offlineContent.includes('#C9A84C'), 'offline.html uses gold accent color');

// Content
assert(offlineContent.includes("You're offline"), 'offline.html shows offline message');
assert(offlineContent.includes('reconnect'), 'offline.html mentions reconnection');
assert(offlineContent.includes('Retry'), 'offline.html has retry button');

// Auto-retry on reconnect
assert(offlineContent.includes("'online'"), 'offline.html listens for online event');

// NEW: Saved session indicator
assert(offlineContent.includes('id="saved-session"'), 'offline.html has saved session indicator');
assert(offlineContent.includes('binding_session'), 'offline.html reads localStorage binding_session');
assert(offlineContent.includes('saved-char-name'), 'offline.html displays character name');
assert(offlineContent.includes('saved-rejoin-btn'), 'offline.html has rejoin button for saved session');
assert(offlineContent.includes('saved-dismiss-btn'), 'offline.html has dismiss button for saved session');
assert(offlineContent.includes('24 * 60 * 60 * 1000'), 'offline.html checks 24h expiry');

// NEW: Connection monitoring
assert(offlineContent.includes('conn-dot'), 'offline.html has connection status indicator');
assert(offlineContent.includes('conn-text'), 'offline.html has connection status text');
assert(offlineContent.includes('checkConnection'), 'offline.html has connection check function');
assert(offlineContent.includes('manifest.json'), 'offline.html probes manifest.json for connectivity');

// NEW: SW rejoin banner
assert(offlineContent.includes('CHECK_REJOIN'), 'offline.html sends CHECK_REJOIN to SW');
assert(offlineContent.includes('REJOIN_INFO'), 'offline.html listens for REJOIN_INFO from SW');
assert(offlineContent.includes('RECONNECTED'), 'offline.html listens for RECONNECTED from SW');

// NEW: Mobile responsive
assert(offlineContent.includes('max-width: 500px'), 'offline.html has mobile breakpoint');
assert(offlineContent.includes('max-width: 360px'), 'offline.html has small phone breakpoint');
assert(offlineContent.includes('safe-area-inset-bottom'), 'offline.html has safe-area-inset');
assert(offlineContent.includes('100dvh'), 'offline.html uses dvh for mobile viewport');

// ─── Mobile Responsiveness in index.html ─────────────────────────────
section('Mobile Responsiveness (index.html)');

const indexPath = path.join(PUBLIC_DIR, 'index.html');
const indexContent = fs.readFileSync(indexPath, 'utf8');

// Safe-area-inset on fixed bottom elements
assert(indexContent.includes('calc(12px + env(safe-area-inset-bottom'), 'index.html has safe-area-inset on report-btn');

// @media ≤360px block exists
assert(indexContent.includes('max-width: 360px'), 'index.html has @media ≤360px breakpoint');

// Spectator bar responsive at ≤360px — check the block contains both the media query and the selector
const has360Block = indexContent.includes('@media (max-width: 360px)');
const has360Spectator = indexContent.includes('#spectator-bar{font-size:0.7em;padding:4px 6px;}');
assert(has360Block && has360Spectator, 'index.html has spectator-bar styles at ≤360px');

// Rejoin bar responsive at ≤360px
const has360Rejoin = indexContent.includes('#rejoin-bar{font-size:0.7em;padding:4px 6px;}');
assert(has360Block && has360Rejoin, 'index.html has rejoin-bar styles at ≤360px');

// Spectator suggestion panel enabled in spectator mode
assert(
  indexContent.includes("document.getElementById('spectator-actions').classList.remove('hidden')"),
  'index.html enables spectator-actions panel in spectator mode'
);

// ─── Service Worker Version ──────────────────────────────────────────
section('Service Worker');

const swPath = path.join(PUBLIC_DIR, 'sw.js');
const swContent = fs.readFileSync(swPath, 'utf8');

assert(swContent.includes("CACHE_VERSION = 'v7'"), 'SW uses cache version v7');
assert(swContent.includes('the-binding-${CACHE_VERSION}'), 'SW uses versioned cache names');
assert(swContent.includes("'/offline.html'"), 'SW pre-caches offline.html');
assert(swContent.includes("'/manifest.json'"), 'SW pre-caches manifest.json');
assert(swContent.includes('CHECK_REJOIN'), 'SW handles CHECK_REJOIN message');
assert(swContent.includes('REJOIN_INFO'), 'SW responds with REJOIN_INFO');
assert(swContent.includes('RECONNECTED'), 'SW sends RECONNECTED message');

// ─── Manifest ────────────────────────────────────────────────────────
section('Manifest');

const manifestPath = path.join(PUBLIC_DIR, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

assertEq(manifest.name, 'The Binding', 'manifest name');
assertEq(manifest.display, 'standalone', 'manifest display');
assertEq(manifest.theme_color, '#C9A84C', 'manifest theme_color');
assert(manifest.icons.length >= 2, 'manifest has at least 2 icons');
assert(Array.isArray(manifest.shortcuts), 'manifest has shortcuts');
assert(manifest.shortcuts.some(s => s.url.includes('rejoin')), 'manifest has rejoin shortcut');

// ─── Summary ──────────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════');
console.log('  PWA Improvements Tests: ' + passed + '/' + total + ' passed');
if (failed > 0) {
  console.error('  ✗ ' + failed + ' FAILED');
  process.exit(1);
} else {
  console.log('  ✓ All PWA improvements tests passed');
  process.exit(0);
}
