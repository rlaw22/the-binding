'use strict';

const { clone } = require('./collections');
const { CAPABILITIES } = require('./character-state');

const CAPABILITY_BANDS = Object.freeze([-2, -1, 0, 1, 2]);
const PREFERENCE_BANDS = Object.freeze({ gentle: -1, standard: 0, demanding: 1 });
const DEFAULT_BOUNDS = Object.freeze({ min: 0, max: 0 });
const DEFAULT_WEIGHTS = Object.freeze({ capability: 0.75, preference: 0.50 });

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function roundHalfAwayFromZero(value) { return value < 0 ? -Math.round(Math.abs(value)) : Math.round(value); }
function finite(value, fallback) { return Number.isFinite(value) ? value : fallback; }

function normalizePreference(value) {
  const key = String(value || 'standard').toLowerCase();
  if (key === 'elevated' || key === 'hard' || key === 'demanding') return 'demanding';
  if (key === 'easy' || key === 'forgiving' || key === 'gentle') return 'gentle';
  return 'standard';
}

function preferenceToBand(value) { return PREFERENCE_BANDS[normalizePreference(value)]; }

function normalizeCapabilityValue(value) {
  if (!Number.isFinite(value)) return 0;
  return clamp(value, -10, 10);
}

function deriveCapabilityScore(character = {}, policy = {}) {
  const range = policy.recommendedLevelRange || { min: 1, max: 4 };
  const min = finite(range.min, 1); const max = Math.max(min, finite(range.max, min + 1));
  const level = finite(character.level, min);
  const midpoint = (min + max) / 2;
  const halfRange = Math.max((max - min) / 2, 1);
  const levelScore = clamp(50 + ((level - midpoint) / halfRange) * 50, 0, 100);
  const values = CAPABILITIES.map(key => normalizeCapabilityValue(character.capabilities && character.capabilities[key]));
  const coverageScore = values.length ? (values.reduce((sum, value) => sum + ((value + 10) / 20) * 100, 0) / values.length) : 50;
  const supported = new Set([...(character.abilities || []), ...(character.approvedInventory || []), ...(character.compatibleAbilities || []), ...(character.compatibleItems || [])]);
  const supportScore = CAPABILITIES.length ? clamp((supported.size / CAPABILITIES.length) * 100, 0, 100) : 0;
  const conditionPenalty = (character.persistentConditions || []).reduce((sum, condition) => sum + (Number.isFinite(condition.penalty) ? condition.penalty : 0), 0);
  const score = clamp(0.45 * levelScore + 0.35 * coverageScore + 0.20 * supportScore - conditionPenalty, 0, 100);
  return { score, levelScore, coverageScore, supportScore, conditionPenalty };
}

function classifyCapability(score, target = {}) {
  const value = finite(score, finite(target.score, 50));
  const targetScore = finite(target.score, 50);
  const width = Math.max(1, finite(target.bandWidth, 12));
  const delta = value - targetScore;
  if (delta <= -2 * width) return -2;
  if (delta < -width) return -1;
  if (delta <= width) return 0;
  if (delta < 2 * width) return 1;
  return 2;
}

function boundsFor(policy = {}) {
  const bounds = policy.offsetBounds || { min: policy.minOffset, max: policy.maxOffset };
  return {
    min: clamp(Number.isInteger(bounds && bounds.min) ? bounds.min : DEFAULT_BOUNDS.min, -2, 2),
    max: clamp(Number.isInteger(bounds && bounds.max) ? bounds.max : DEFAULT_BOUNDS.max, -2, 2)
  };
}

function calculateDifficultyProfile(book, character = {}, options = {}) {
  const policy = book && book.adaptiveDifficulty ? book.adaptiveDifficulty : (book && book.difficultyPolicy && book.difficultyPolicy.adaptiveDifficulty) || {};
  const enabled = policy.enabled === true;
  const bounds = enabled ? boundsFor(policy) : { min: 0, max: 0 };
  const scoreData = deriveCapabilityScore(character, { ...policy, recommendedLevelRange: policy.targetCapability && policy.targetCapability.recommendedLevelRange || policy.recommendedLevelRange });
  const capabilityBand = classifyCapability(scoreData.score, policy.targetCapability || { score: 50, bandWidth: 12 });
  const preference = normalizePreference(options.challengePreference || options.preference || character.challengePreference);
  const preferenceBand = preferenceToBand(preference);
  const weights = policy.weights || DEFAULT_WEIGHTS;
  const rawOffset = roundHalfAwayFromZero(finite(weights.capability, 0.75) * capabilityBand + finite(weights.preference, 0.50) * preferenceBand);
  const sessionOffset = clamp(rawOffset, bounds.min, bounds.max);
  return {
    schemaVersion: policy.schemaVersion || '1.0',
    mode: policy.mode || 'authored', enabled,
    calculatedAt: options.calculatedAt || new Date().toISOString(),
    manifestVersion: book && book.schemaVersion || null,
    characterVersion: character.characterVersion || null,
    characterId: character.characterId || null,
    capabilityScore: scoreData.score,
    capabilityBand,
    preference,
    preferenceBand,
    rawOffset,
    sessionOffset,
    offsetBounds: bounds,
    weights: { capability: finite(weights.capability, 0.75), preference: finite(weights.preference, 0.50) },
    clamped: rawOffset !== sessionOffset,
    allowedLevers: clone(policy.allowedLevers || []),
    resolvedAuthoredLevers: [],
    disclosure: clone(policy.disclosure || { adaptiveChallenge: enabled, normalization: 'none', summaryKey: enabled ? 'authored-adaptive-challenge' : 'standard-authored-challenge' })
  };
}

function applyAuthoredLever(lever, sessionOffset) {
  if (!lever || !lever.leverId) throw new Error('Adaptive lever ID is required');
  if (!Number.isInteger(sessionOffset) || sessionOffset < -2 || sessionOffset > 2) throw new Error('Adaptive session offset is invalid');
  const mapping = lever.byOffset && lever.byOffset[String(sessionOffset)];
  if (mapping == null) throw new Error(`Adaptive lever has no mapping for offset ${sessionOffset}: ${lever.leverId}`);
  const allowed = lever.allowedDelta || { min: 0, max: 0 };
  if (!Number.isFinite(mapping) || mapping < allowed.min || mapping > allowed.max) throw new Error(`Adaptive lever delta is outside its declaration: ${lever.leverId}`);
  return { ...clone(lever), resolvedDelta: mapping, resolvedValue: Number.isFinite(lever.baseValue) ? lever.baseValue + mapping : mapping };
}

function disclosureForProfile(profile) {
  return { enabled: !!profile.enabled, preference: profile.preference, sessionOffset: profile.sessionOffset, summaryKey: profile.disclosure && profile.disclosure.summaryKey, text: profile.enabled ? 'Challenge is adjusted within this book\'s authored limits.' : 'This book uses its standard authored challenge.' };
}

module.exports = { CAPABILITY_BANDS, PREFERENCE_BANDS, normalizePreference, preferenceToBand, deriveCapabilityScore, classifyCapability, calculateDifficultyProfile, applyAuthoredLever, disclosureForProfile, clamp };
