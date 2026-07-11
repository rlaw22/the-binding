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
