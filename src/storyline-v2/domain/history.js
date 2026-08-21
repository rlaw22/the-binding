'use strict';

const { clone } = require('./collections');

const MAX_MANUAL_BOOKMARKS = 2;

function addBookmark(state, input, now) {
  const bookmarks = Array.isArray(state.bookmarks) ? state.bookmarks : [];
  if (bookmarks.length >= MAX_MANUAL_BOOKMARKS) {
    throw new Error('Manual bookmark limit reached');
  }
  if (!input || !input.bookmarkId) throw new Error('Bookmark ID is required');
  const bookmark = {
    bookmarkId: input.bookmarkId,
    label: input.label || `Bookmark ${bookmarks.length + 1}`,
    sceneId: state.sceneId,
    actId: state.actId || null,
    turnNumber: state.turnNumber,
    revision: state.revision,
    catalogVersion: state.catalogVersion,
    createdAt: now || state.timestamps.updatedAt
  };
  return [...bookmarks, bookmark];
}

function removeBookmark(state, bookmarkId) {
  if (!bookmarkId) throw new Error('Bookmark ID is required');
  const bookmarks = Array.isArray(state.bookmarks) ? state.bookmarks : [];
  const next = bookmarks.filter(bookmark => bookmark.bookmarkId !== bookmarkId);
  if (next.length === bookmarks.length) throw new Error(`Unknown bookmark: ${bookmarkId}`);
  return next;
}

function appendJournal(state, entry) {
  const journal = Array.isArray(state.journal) ? state.journal : [];
  return [...journal, clone({
    entryId: entry.entryId,
    turnNumber: state.turnNumber,
    revision: state.revision,
    sceneId: state.sceneId,
    actionId: entry.actionId || null,
    text: entry.text || '',
    kind: entry.kind || 'narrative'
  })];
}

module.exports = { MAX_MANUAL_BOOKMARKS, addBookmark, removeBookmark, appendJournal };