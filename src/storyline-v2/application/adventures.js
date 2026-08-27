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
  const { buildDraculaCanaryManifest, buildDraculaBranchingOpeningManifest } = require('../adapters/native-dracula-canary');
  const canary = process.env.STORYLINE_V2_BRANCHING_OPENING === 'true'
    ? buildDraculaBranchingOpeningManifest()
    : buildDraculaCanaryManifest();
  const resolvedOptions = { ...options };
  if (!resolvedOptions.sessionRepository && process.env.STORYLINE_V2_SESSION_FILE) {
    resolvedOptions.sessionRepository = new FileSessionRepository(process.env.STORYLINE_V2_SESSION_FILE);
  }
  return new StorylineV2Service({ [canary.adventureId]: canary }, resolvedOptions);
}

module.exports.createStorylineV2CanaryService = createStorylineV2CanaryService;
