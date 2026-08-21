'use strict';

/**
 * Application-level names for the current V2 service boundary. These wrappers
 * keep transport code independent from the eventual repository-backed use
 * cases while preserving the validated service behavior today.
 */
function startBookSession(service, input) {
  return service.start(input);
}

function getBookSnapshot(service, sessionId) {
  return service.snapshot(sessionId);
}

function submitAction(service, input) {
  return service.submit(input);
}

function submitTextIntent(service, input) {
  return service.submitText(input);
}

function transitionBookSession(service, input) {
  return service.transition(input);
}

module.exports = {
  startBookSession,
  getBookSnapshot,
  submitAction,
  submitTextIntent,
  transitionBookSession
};
