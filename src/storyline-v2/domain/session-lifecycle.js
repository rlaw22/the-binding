'use strict';

const SESSION_STATES = Object.freeze([
  'browsing', 'preparation', 'active', 'paused', 'interrupted',
  'awaiting_recovery', 'completed', 'failed', 'archived'
]);

const TRANSITIONS = Object.freeze({
  browsing: ['preparation', 'active', 'archived'],
  preparation: ['active', 'browsing', 'archived'],
  active: ['paused', 'interrupted', 'awaiting_recovery', 'completed', 'failed'],
  paused: ['active', 'interrupted', 'archived'],
  interrupted: ['active', 'paused', 'awaiting_recovery', 'archived'],
  awaiting_recovery: ['active', 'failed', 'archived'],
  completed: ['archived'],
  failed: ['archived'],
  archived: []
});

function canTransition(from, to) {
  return SESSION_STATES.includes(from) && TRANSITIONS[from].includes(to);
}

function transitionSession(state, to) {
  if (!state || !canTransition(state.lifecycle, to)) {
    const from = state && state.lifecycle;
    throw new Error(`Invalid session lifecycle transition: ${from} -> ${to}`);
  }
  return { ...state, lifecycle: to };
}

function isPlayable(state) {
  return Boolean(state && (state.lifecycle === 'active' || state.lifecycle === 'awaiting_recovery'));
}

module.exports = { SESSION_STATES, TRANSITIONS, canTransition, transitionSession, isPlayable };
