/**
 * Model Router — Intelligent Model Tiering for Cost Optimization
 *
 * Decides which model to use based on:
 *   1. Scene importance (boss fight vs. routine narration)
 *   2. Cost budget (tier from cost-tracker)
 *   3. Message type (coin scoring can use mini, major story beats use full)
 *
 * Cost savings:
 *   GPT-4o:      $2.50/1M input, $10.00/1M output
 *   GPT-4o-mini: $0.15/1M input,  $0.60/1M output
 *   → Routine calls are ~17x cheaper with mini
 */

'use strict';

/**
 * Scene importance levels.
 * HIGH = major story beats, boss encounters, critical moments
 * MEDIUM = NPC dialogue, skill checks, exploration
 * LOW = inventory, coin scoring, routine narration, suggested actions
 */
const Importance = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

/**
 * Keywords that indicate a HIGH importance scene.
 * Checked against system prompt + player action.
 */
const HIGH_IMPORTANCE_SIGNALS = [
  // Boss / combat
  'boss', 'final battle', 'combat encounter', 'critical hit', 'death saving',
  'boss fight', 'defeat', 'victory', 'climactic', 'showdown',
  // Major story
  'plot twist', 'revelation', 'betrayal', 'sacrifice', 'transformation',
  'turning point', 'critical moment', 'dramatic', 'climax',
  // Key NPCs (Dracula, Frankenstein, Holmes)
  'count dracula', 'dracula appears', 'the count',
  'frankenstein', 'the creature', 'the monster',
  'sherlock holmes', 'moriarty', 'watson',
  // Scene transitions (opening a new scene is important)
  'scene transition', 'new scene', 'entering',
  // Character creation (first impression matters)
  'character creation',
];

/**
 * Keywords that indicate a LOW importance call.
 */
const LOW_IMPORTANCE_SIGNALS = [
  'coin scoring', 'score this action', 'suggested actions',
  'inventory', 'list items', 'equip', 'unequip',
  'what items', 'check inventory',
  'format as json', 'respond with only a json',
  'heuristic', 'routine narration',
];

/**
 * Determine scene importance from context.
 *
 * @param {object} ctx
 * @param {string} ctx.systemPrompt - The system prompt (contains scene context)
 * @param {string} ctx.playerAction - The player's latest action
 * @param {string} ctx.callType - 'narration', 'coin_scoring', 'character_creation', 'suggested_actions'
 * @param {object} ctx.sceneState - Current scene state (optional)
 * @returns {string} Importance level
 */
function classifyImportance(ctx = {}) {
  const {
    systemPrompt = '',
    playerAction = '',
    callType = 'narration',
    sceneState = null,
  } = ctx;

  // Coin scoring and suggested actions are always LOW
  if (callType === 'coin_scoring' || callType === 'suggested_actions') {
    return Importance.LOW;
  }

  // Character creation first step is MEDIUM (not worth premium)
  if (callType === 'character_creation') {
    return Importance.MEDIUM;
  }

  // Check for high-importance signals in combined context
  const combinedText = `${systemPrompt} ${playerAction}`.toLowerCase();

  for (const signal of HIGH_IMPORTANCE_SIGNALS) {
    if (combinedText.includes(signal)) {
      return Importance.HIGH;
    }
  }

  // Check for low-importance signals
  for (const signal of LOW_IMPORTANCE_SIGNALS) {
    if (combinedText.includes(signal)) {
      return Importance.LOW;
    }
  }

  // Default to MEDIUM for regular narration
  return Importance.MEDIUM;
}

/**
 * Select the optimal model based on importance and budget.
 *
 * @param {object} opts
 * @param {string} opts.importance - Scene importance level
 * @param {object} opts.costTracker - Cost tracker instance (optional)
 * @param {string} opts.preferredModel - Caller's preferred model (default: gpt-4o)
 * @returns {{ model: string, reason: string }}
 */
function selectModel(opts = {}) {
  const {
    importance = Importance.MEDIUM,
    costTracker = null,
    preferredModel = process.env.LLM_MODEL || 'gpt-4o',
  } = opts;

  // Budget override: if cost tracker says we can't use premium, force mini
  if (costTracker) {
    const resolved = costTracker.resolveModel(preferredModel);
    if (resolved !== preferredModel) {
      return {
        model: resolved,
        reason: `Budget tier ${costTracker.tier} — downgraded from ${preferredModel} to save cost`,
      };
    }
  }

  // Importance-based selection
  switch (importance) {
    case Importance.HIGH:
      return {
        model: preferredModel,
        reason: 'High-importance scene — using premium model',
      };

    case Importance.LOW:
      return {
        model: 'gpt-4o-mini',
        reason: 'Low-importance call — using mini model (~17x cheaper)',
      };

    case Importance.MEDIUM:
    default:
      // For medium importance, use mini by default (major cost savings)
      // Only upgrade to premium if it's the first few turns (establishing the scene)
      return {
        model: 'gpt-4o-mini',
        reason: 'Standard narration — using mini model for cost efficiency',
      };
  }
}

/**
 * Create a model router that wraps an LLM provider.
 * The router decides which model to use per call.
 *
 * @param {object} baseConfig - Base LLM config { apiKey, baseUrl, model }
 * @param {object} costTracker - Session cost tracker
 * @returns {function} Wrapped provider function(messages, context?) => response
 */
function createModelRouter(baseConfig, costTracker) {
  const { createOpenAIProvider, createProvider } = require('../ai-dm/llm-provider');
  const baseProvider = createOpenAIProvider(baseConfig);

  // Create a mini provider for cheap calls
  const miniConfig = { ...baseConfig, model: 'gpt-4o-mini' };
  const miniProvider = createOpenAIProvider(miniConfig);

  /**
   * Smart provider that picks the right model per call.
   *
   * @param {Array} messages - LLM messages
   * @param {object} context - Optional context for importance classification
   * @param {string} context.callType - Type of call
   * @param {string} context.playerAction - Player's action
   * @returns {Promise<string>} LLM response
   */
  return async function smartProvider(messages, context = {}) {
    const importance = classifyImportance({
      systemPrompt: messages.find(m => m.role === 'system')?.content || '',
      playerAction: context.playerAction || messages.find(m => m.role === 'user')?.content || '',
      callType: context.callType || 'narration',
    });

    const { model, reason } = selectModel({
      importance,
      costTracker,
      preferredModel: baseConfig.model || 'gpt-4o',
    });

    // Choose the right provider
    const provider = (model === 'gpt-4o-mini') ? miniProvider : baseProvider;

    // Log the decision (once per call, not noisy)
    if (model !== (baseConfig.model || 'gpt-4o')) {
      console.log(`[ModelRouter] ${reason}`);
    }

    // Make the call
    const startTime = Date.now();
    const response = await provider(messages);
    const latencyMs = Date.now() - startTime;

    // Record cost estimate
    if (costTracker) {
      costTracker.estimateAndRecordLLM(model, messages, response.length);
    }

    return response;
  };
}

module.exports = {
  Importance,
  classifyImportance,
  selectModel,
  createModelRouter,
};
