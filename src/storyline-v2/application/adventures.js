'use strict';

const { compileDracula } = require('../adapters/legacy-dracula-adapter');
const { StorylineV2Service } = require('./service');

/**
 * Build the currently supported Storyline v2 adventure registry.
 * Compilation happens at construction time so malformed authored data fails
 * before a session can start.
 */
function createStorylineV2Service() {
  const dracula = compileDracula();
  return new StorylineV2Service({ [dracula.adventureId]: dracula });
}

module.exports = { createStorylineV2Service };
