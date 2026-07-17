#!/usr/bin/env node
/**
 * The Binding — Server Entry Point
 * 
 * Starts the Fastify API + WebSocket server.
 * Phase 1: Mock LLM by default (no API key needed for testing).
 * Set LLM_API_KEY and LLM_BASE_URL env vars to use a real LLM.
 */

const { createServer } = require('./src/api/server');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

async function main() {
  console.log('');
  console.log('  ╔═══════════════════════════════════════╗');
  console.log('  ║           THE BINDING                 ║');
  console.log('  ║     Enter the books you love.         ║');
  console.log('  ╚═══════════════════════════════════════╝');
  console.log('');

  const llmConfig = {
    mock: !process.env.LLM_API_KEY,
    apiKey: process.env.LLM_API_KEY || '',
    baseUrl: process.env.LLM_BASE_URL || 'https://api.openai.com/v1',
    model: process.env.LLM_MODEL || 'gpt-4o'
  };

  if (llmConfig.mock) {
    console.log('  ⚠  Running in MOCK mode (no LLM_API_KEY set)');
    console.log('     Set LLM_API_KEY env var to use a real AI DM.');
    console.log('');
  } else {
    console.log(`  🤖 LLM: ${llmConfig.model} @ ${llmConfig.baseUrl}`);
    console.log('');
  }

  const server = await createServer({ llmConfig });

  try {
    await server.listen({ port: PORT, host: HOST });
    console.log(`  ✅ Server running at http://${HOST}:${PORT}`);
    console.log(`  📡 Polling: GET /api/sessions/:id/messages?after=N`);
    console.log(`  🎮 REST API: http://${HOST}:${PORT}/api/`);
    console.log('');
    console.log('  Endpoints:');
    console.log('    GET  /api/health          — Health check');
    console.log('    GET  /api/adventures       — List adventures');
    console.log('    POST /api/sessions         — Create a new game');
    console.log('    GET  /api/sessions/:id     — Get session info');
    console.log('    WS   /ws/game/:sessionId   — Play via WebSocket');
    console.log('');
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

main();

// ---------------------------------------------------------------------------
// Image Generation Pipeline Integration
// ---------------------------------------------------------------------------
//
// To wire the image service into the game, add this to createServer() or
// wherever session/game state is initialised:
//
//   const { createImageService } = require('./src/image');
//   const imageService = createImageService();
//
//   // Then pass it into your session/adventure/scene handlers:
//   //   const sceneUrl = await imageService.generateScene({
//   //     description: scene.text,
//   //     location: scene.location,
//   //     mood: scene.mood,
//   //   });
//   //
//   //   // For character portraits during creation or key moments:
//   //   const portrait = await imageService.generateCharacter({
//   //     name: character.name,
//   //     race: character.race,
//   //     classType: character.class,
//   //     appearance: character.appearance,
//   //   });
//   //
//   //   // For combat scene art on critical hits/kills:
//   //   const combatArt = await imageService.generateCombat({
//   //     attacker: combatState.attacker.name,
//   //     defender: combatState.defender.name,
//   //     weapon: combatState.weapon,
//   //     outcome: combatState.lastOutcome,
//   //   });
//   //
//   // The service auto-detects XAI_API_KEY or OPENAI_API_KEY.
//   // When neither is set, all generate*() calls return null gracefully.
//   // Images are cached (LRU, 100 entries default) to avoid re-generating
//   // the same scene/character art.
//
// Environment variables:
//   XAI_API_KEY         — Enables Grok Imagine (xAI) as image provider
//   XAI_BASE_URL        — Override xAI API base URL (default: https://api.x.ai)
//   XAI_IMAGE_MODEL     — Override xAI image model (default: grok-2-image)
//   OPENAI_API_KEY      — Enables DALL-E (OpenAI) as image provider
//   OPENAI_BASE_URL     — Override OpenAI base URL (default: https://api.openai.com)
//   OPENAI_IMAGE_MODEL  — Override OpenAI image model (default: dall-e-3)
// ---------------------------------------------------------------------------
