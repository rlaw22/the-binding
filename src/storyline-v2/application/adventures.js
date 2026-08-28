'use strict';

const { buildDraculaCanaryManifest, buildDraculaBranchingOpeningManifest } = require('../adapters/native-dracula-canary');
const { StorylineV2Service } = require('./service');
const { FileSessionRepository } = require('./repositories/file-session-repository');

/**
 * Build the currently supported Storyline v2 adventure registry.
 * Compilation happens at construction time so malformed authored data fails
 * before a session can start.
 */
function createStorylineV2Service(options = {}) {
  const dracula = buildDraculaCanaryManifest();
  const resolvedOptions = { ...options };
  if (!resolvedOptions.sessionRepository && process.env.STORYLINE_V2_SESSION_FILE) {
    resolvedOptions.sessionRepository = new FileSessionRepository(process.env.STORYLINE_V2_SESSION_FILE);
  }
  return new StorylineV2Service({ [dracula.adventureId]: dracula }, resolvedOptions);
}

module.exports = { createStorylineV2Service };

function createStorylineV2CanaryService(options = {}) {
  const { buildDraculaBranchingOpeningManifest } = require('../adapters/native-dracula-canary');
  // The protected personal canary exists to validate the improved authored
  // experience. Keep the public V2 service on its separate native path, but
  // never let the personal canary silently fall back to the weaker sequential
  // opening.
  const canary = buildDraculaBranchingOpeningManifest();
  const resolvedOptions = { ...options };
  if (!resolvedOptions.sessionRepository && process.env.STORYLINE_V2_SESSION_FILE) {
    resolvedOptions.sessionRepository = new FileSessionRepository(process.env.STORYLINE_V2_SESSION_FILE);
  }
  return new StorylineV2Service({ [canary.adventureId]: canary }, resolvedOptions);
}

module.exports.createStorylineV2CanaryService = createStorylineV2CanaryService;
