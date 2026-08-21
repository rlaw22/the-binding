'use strict';

const { clone, asArray } = require('./collections');
const { buildCatalog } = require('./action-catalog');
const { requirementsPass } = require('./requirements');
const { isPlayable } = require('./session-lifecycle');
const { markMutation } = require('./session-state');

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
  const stateChanges = { hp: 0, coins: 0, flags: {}, discoveredContentIds: [], itemsAdded: [], itemsRemoved: [] };
  if (action.replay !== 'repeatable') state.consumedActionIds.push(action.actionId);
  asArray(resolution.discover).forEach(id => {
    if (!state.discoveredContentIds.includes(id)) { state.discoveredContentIds.push(id); stateChanges.discoveredContentIds.push(id); }
  });
  asArray(resolution.addItems).forEach(id => {
    if (!state.inventory.includes(id)) { state.inventory.push(id); stateChanges.itemsAdded.push(id); }
  });
  asArray(resolution.removeItems).forEach(id => {
    const index = state.inventory.indexOf(id);
    if (index !== -1) { state.inventory.splice(index, 1); stateChanges.itemsRemoved.push(id); }
  });
  if (resolution.hp) { state.character.hp += resolution.hp; stateChanges.hp = resolution.hp; }
  if (resolution.coins) { state.coins += resolution.coins; stateChanges.coins = resolution.coins; }
  Object.assign(state.flags, resolution.setFlags || {}); Object.assign(stateChanges.flags, resolution.setFlags || {});

  // Endings are authored on the action resolution and evaluated through the
  // same generic requirement system as availability and graph transitions.
  // The domain must not contain adventure-specific scene IDs or flag names.
  let endingId = resolution.endingId || null;
  let narrative = resolution.narration || action.label;
  const endingRule = asArray(resolution.endingRules)
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
    actionId, contentId: action.contentId, resultType: resolution.resultType || action.type, narrative,
    endingId,
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
