'use strict';

const { clone, asArray } = require('./collections');
const { buildCatalog } = require('./action-catalog');
const { requirementsPass } = require('./requirements');
const { isPlayable } = require('./session-lifecycle');
const { markMutation } = require('./session-state');
const { resolveCheck } = require('./check-resolution');
const { applyAuthoredLever } = require('./difficulty');

function resolveTurn({ adventure, state: inputState, actionId, catalogVersion, turnId, now }) {
  const state = clone(inputState);
  // Idempotency is checked before catalog freshness: a retried request carries
  // the original catalog version, which is expected to be stale after the
  // first successful resolution.
  if (turnId && state.processedTurns[turnId]) return clone(state.processedTurns[turnId]);
  if (!isPlayable(state)) return rejected(adventure, 'SESSION_NOT_PLAYABLE', 'This book session is not currently playable.', state);
  if (catalogVersion !== state.catalogVersion) return rejected(adventure, 'STALE_CATALOG', 'That action is no longer available.', state);
  const scene = adventure.scenes[state.sceneId];
  const action = scene.actions.find(candidate => candidate.actionId === actionId);
  const catalog = buildCatalog(adventure, state);
  if (!action || !catalog.actions.some(candidate => candidate.actionId === actionId)) return rejected(adventure, 'ACTION_UNAVAILABLE', 'That action is no longer available.', state);

  const beforeSceneId = state.sceneId;
  const resolution = action.resolution || {};
  const profile = state.bookSession && state.bookSession.difficultyProfile;
  const leverId = action.adaptiveLeverId || resolution.adaptiveLeverId;
  const authoredLever = leverId && adventure.adaptiveDifficulty && (adventure.adaptiveDifficulty.levers || []).find(lever => lever.leverId === leverId);
  const appliedLever = authoredLever ? applyAuthoredLever(authoredLever, profile ? profile.sessionOffset : 0) : null;
  const resolvedCheck = resolution.check ? { ...resolution.check } : null;
  if (appliedLever && appliedLever.kind === 'checkTarget' && resolvedCheck) resolvedCheck.difficulty = appliedLever.resolvedValue;
  const check = resolveCheck({ check: resolvedCheck, state, actionId, turnId });
  const authored = check ? check.outcome : resolution;
  const stateChanges = { hp: 0, coins: 0, flags: {}, discoveredContentIds: [], itemsAdded: [], itemsRemoved: [] };
  if (action.replay !== 'repeatable') state.consumedActionIds.push(action.actionId);
  asArray(authored.discover).forEach(id => {
    if (!state.discoveredContentIds.includes(id)) { state.discoveredContentIds.push(id); stateChanges.discoveredContentIds.push(id); }
  });
  asArray(authored.addItems).forEach(id => {
    if (!state.inventory.includes(id)) { state.inventory.push(id); stateChanges.itemsAdded.push(id); }
  });
  asArray(authored.removeItems).forEach(id => {
    const index = state.inventory.indexOf(id);
    if (index !== -1) { state.inventory.splice(index, 1); stateChanges.itemsRemoved.push(id); }
  });
  if (authored.hp) {
    const beforeHp = state.character.hp;
    const maxHp = Number.isFinite(state.character.maxHp) ? state.character.maxHp : beforeHp;
    state.character.hp = Math.max(0, Math.min(maxHp, beforeHp + authored.hp));
    stateChanges.hp = state.character.hp - beforeHp;
  }
  if (authored.coins) {
    const beforeCoins = state.coins;
    state.coins = Math.max(0, beforeCoins + authored.coins);
    stateChanges.coins = state.coins - beforeCoins;
  }
  Object.assign(state.flags, authored.setFlags || {}); Object.assign(stateChanges.flags, authored.setFlags || {});
  if (action.type === 'recovery') {
    if (state.character.hp <= 0) {
      return rejected(adventure, 'RECOVERY_INSUFFICIENT', 'This recovery does not restore enough strength to continue.', state);
    }
    state.lifecycle = 'active';
  } else if (state.character.hp <= 0) {
    state.lifecycle = 'awaiting_recovery';
  }

  // Endings are authored on the action resolution and evaluated through the
  // same generic requirement system as availability and graph transitions.
  // The domain must not contain adventure-specific scene IDs or flag names.
  let endingId = authored.endingId || null;
  let narrative = authored.narration || action.label;
  const endingRule = asArray(authored.endingRules)
    .find(rule => rule && rule.endingId && requirementsPass(rule.requires || [], state));
  if (endingRule) {
    endingId = endingRule.endingId;
    const ending = adventure.endings && adventure.endings[endingId];
    if (ending && ending.narration) narrative = ending.narration;
  }

  let transition = null;
  const edge = (adventure.graph.edges || []).find(candidate => candidate.from === beforeSceneId && candidate.trigger && candidate.trigger.actionId === actionId && requirementsPass(candidate.trigger.requires || [], state));
  if (edge) {
    state.completedSceneIds.push(beforeSceneId);
    state.sceneId = edge.to; state.actId = adventure.scenes[edge.to].actId;
    transition = { edgeId: edge.edgeId, sourceSceneId: beforeSceneId, destinationSceneId: edge.to };
  }
  state.turnNumber += 1; state.catalogVersion = `${state.sceneId}:${state.turnNumber}`;
  const mutated = markMutation(state, now);
  Object.keys(state).forEach(key => delete state[key]);
  Object.assign(state, mutated);
  const result = {
    responseId: `response:${turnId || state.turnNumber}`, turnId: turnId || null, sceneId: state.sceneId, sourceSceneId: beforeSceneId,
    actionId, contentId: action.contentId, resultType: authored.resultType || action.type, narrative,
    endingId,
    check,
    adaptive: appliedLever ? { leverId: appliedLever.leverId, sessionOffset: profile.sessionOffset, resolvedVariant: appliedLever.resolvedValue, manifestVersion: adventure.schemaVersion } : null,
    stateChanges, transition, catalog: buildCatalog(adventure, state)
  };
  if (turnId) state.processedTurns[turnId] = clone(result);
  return { state, result };
}

function rejected(adventure, code, narrative, state) {
  return {
    state: clone(state),
    result: {
      responseId: null, turnId: null, sceneId: state.sceneId, sourceSceneId: state.sceneId,
      actionId: null, contentId: null, resultType: 'rejected', error: code, narrative,
      stateChanges: null, transition: null, catalog: buildCatalog(adventure, state)
    }
  };
}


const resolveAction = resolveTurn;

module.exports = { resolveTurn, resolveAction };
