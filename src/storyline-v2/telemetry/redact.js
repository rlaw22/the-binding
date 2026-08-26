'use strict';

const ALLOWED_CONTEXT = new Set([
  'accountId', 'sessionId', 'runId', 'adventureId', 'manifestVersion',
  'sceneId', 'chapterId', 'actId', 'inputMode', 'clientPlatform', 'clientVersion'
]);
const ALLOWED_PAYLOAD = new Set([
  'actionId', 'contentId', 'resultType', 'error', 'outcome', 'endingId',
  'edgeId', 'sourceSceneId', 'destinationSceneId', 'turnId', 'status',
  'durationMs', 'cache', 'provider', 'model', 'requestType', 'retryCount',
  'quotaDecision', 'inputTokens', 'outputTokens', 'ttsCharacters',
  'transcriptionSeconds', 'imageUnits', 'estimatedCost', 'actualCost'
]);

function pick(source, allowed) {
  const output = {};
  if (!source || typeof source !== 'object') return output;
  Object.keys(source).forEach(key => {
    if (allowed.has(key)) output[key] = source[key];
  });
  return output;
}

function redactContext(context) {
  return pick(context, ALLOWED_CONTEXT);
}

function redactPayload(payload) {
  return pick(payload, ALLOWED_PAYLOAD);
}

module.exports = { redactContext, redactPayload, ALLOWED_CONTEXT, ALLOWED_PAYLOAD };