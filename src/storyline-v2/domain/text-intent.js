'use strict';

function matchFreeText(text, catalog, definitions) {
  const normalized = normalize(text);
  if (!normalized || !catalog || !Array.isArray(catalog.actions)) return { status: 'no_match', action: null };
  const definitionMap = new Map((definitions || []).map(item => [item.actionId, item]));
  const candidates = catalog.actions.map(action => {
    const definition = definitionMap.get(action.actionId) || action;
    const terms = [definition.actionId, definition.contentId, definition.label, definition.shortLabel, ...(definition.keywords || [])]
      .filter(Boolean).map(normalize).filter(term => term.length >= 2);
    const exact = terms.filter(term => normalized === term);
    const phrase = terms.filter(term => term.length >= 3 && normalized.includes(term));
    const tokenOverlap = terms.filter(term => term.split(' ').length > 1 && term.split(' ').every(token => normalized.split(' ').includes(token)));
    const score = exact.length ? 100 : phrase.length ? 60 : tokenOverlap.length ? 40 : 0;
    return { action, score, exact: exact.length > 0 };
  }).filter(candidate => candidate.score > 0).sort((a, b) => b.score - a.score || a.action.actionId.localeCompare(b.action.actionId));
  if (!candidates.length) return { status: 'no_match', action: null };
  const top = candidates[0];
  const tied = candidates.filter(candidate => candidate.score === top.score);
  if (tied.length !== 1 || (!top.exact && candidates.length > 1 && candidates[1].score >= top.score - 20)) {
    return { status: 'ambiguous', action: null, candidates: tied.map(candidate => candidate.action) };
  }
  return { status: 'matched', action: top.action };
}

function normalize(text) { return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' '); }

const matchTextIntent = matchFreeText;

module.exports = { matchFreeText, matchTextIntent, normalize };
