/**
 * src/image/index.js — Image Generation Pipeline
 *
 * Module entry point. Exports createImageService() which returns a
 * provider-abstracted image generation service for The Binding.
 *
 * Usage:
 *   const { createImageService } = require('./src/image');
 *   const images = createImageService();
 *
 *   // Scene illustration
 *   const url = await images.generateScene({
 *     description: 'A vast crypt beneath the castle, stone coffins lining the walls.',
 *     location: 'Beneath Castle Dracula',
 *     mood: 'dread',
 *   });
 *
 *   // Character portrait
 *   const portrait = await images.generateCharacter({
 *     name: 'Van Helsing',
 *     classType: 'vampire hunter',
 *     appearance: 'Weathered face, silver hair, piercing grey eyes.',
 *     mood: 'tense',
 *   });
 *
 *   // Combat art
 *   const combat = await images.generateCombat({
 *     attacker: 'A cloaked figure with a silver-tipped stake',
 *     defender: 'A hissing vampire lord',
 *     weapon: 'Silver stake',
 *     location: 'A moonlit graveyard',
 *     outcome: 'critical',
 *   });
 *
 * Environment variables (auto-detects provider):
 *   XAI_API_KEY       — Enables Grok Imagine (xAI)
 *   OPENAI_API_KEY    — Enables DALL-E (OpenAI)
 *
 * When no key is set, all generate* methods return null gracefully —
 * the game continues without images.
 */

'use strict';

const { createImageService } = require('./image-service');

module.exports = { createImageService };
