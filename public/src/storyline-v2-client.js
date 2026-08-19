/* Storyline v2 client adapter.
 * Presentation-only: the server owns state, catalogs, IDs, availability, and resolution.
 */
(function (root) {
  'use strict';

  function StorylineV2Client(options) {
    options = options || {};
    this.base = options.base || '/api/storyline-v2';
    this.sessionId = null;
    this.snapshot = null;
    this.busy = false;
  }

  StorylineV2Client.prototype.request = async function (url, init) {
    init = init || {};
    init.headers = Object.assign({ 'Content-Type': 'application/json' }, init.headers || {});
    var response = await fetch(this.base + url, init);
    var data = await response.json();
    if (!response.ok) {
      var error = new Error(data.error || 'Storyline v2 request failed');
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  };

  StorylineV2Client.prototype.setSnapshot = function (data) {
    if (data && data.state && data.catalog) {
      this.snapshot = { adventureId: data.adventureId || (this.snapshot && this.snapshot.adventureId), state: data.state, catalog: data.catalog };
    }
    return data;
  };

  StorylineV2Client.prototype.start = async function (adventureId, classId, sessionId, options) {
    var data = await this.request('/sessions', { method: 'POST', body: JSON.stringify({ adventureId: adventureId, classId: classId, sessionId: sessionId, options: options || {} }) });
    this.sessionId = sessionId;
    this.setSnapshot(data);
    return data;
  };

  StorylineV2Client.prototype.refresh = async function () {
    if (!this.sessionId) throw new Error('Storyline v2 session has not started');
    var data = await this.request('/sessions/' + encodeURIComponent(this.sessionId));
    this.setSnapshot(data);
    return data;
  };

  StorylineV2Client.prototype.submitAction = async function (action) {
    if (!this.sessionId || !this.snapshot || !this.snapshot.catalog) throw new Error('Storyline v2 session has not started');
    if (this.busy) throw new Error('Storyline v2 action is already being submitted');
    var catalog = this.snapshot.catalog;
    var catalogAction = (catalog.actions || []).find(function (candidate) { return candidate.actionId === action.actionId; });
    if (!catalogAction) throw new Error('Action is not in the current server catalog');
    this.busy = true;
    try {
      var data = await this.request('/sessions/' + encodeURIComponent(this.sessionId) + '/actions', { method: 'POST', body: JSON.stringify({ actionId: catalogAction.actionId, catalogVersion: catalog.catalogVersion, turnId: action.turnId }) });
      this.setSnapshot({ adventureId: this.snapshot.adventureId, state: data.state, catalog: data.catalog });
      return data;
    } finally { this.busy = false; }
  };

  StorylineV2Client.prototype.submitText = async function (text, turnId) {
    if (!this.sessionId) throw new Error('Storyline v2 session has not started');
    var data = await this.request('/sessions/' + encodeURIComponent(this.sessionId) + '/actions', { method: 'POST', body: JSON.stringify({ text: text, turnId: turnId }) });
    if (data.result && data.result.state && data.result.catalog) this.setSnapshot({ adventureId: this.snapshot && this.snapshot.adventureId, state: data.result.state, catalog: data.result.catalog });
    return data;
  };

  StorylineV2Client.prototype.renderBookHistory = function (container, history, options) {
    if (!container) return;
    options = options || {};
    var entries = Array.isArray(history) ? history : [];
    container.textContent = '';
    container.classList.add('storyline-v2-journal');
    container.setAttribute('aria-label', options.ariaLabel || 'Storyline journal history');
    entries.forEach(function (entry, index) {
      var card = document.createElement('article');
      card.className = 'storyline-v2-journal-entry';
      card.dataset.historyIndex = String(index);
      var heading = document.createElement('h3');
      heading.className = 'storyline-v2-journal-entry-title';
      heading.textContent = entry.title || entry.eventLabel || ('Turn ' + (entry.turnNumber || index + 1));
      var meta = document.createElement('p');
      meta.className = 'storyline-v2-journal-entry-meta';
      meta.textContent = [entry.sceneName || entry.sceneId, entry.turnNumber ? 'Turn ' + entry.turnNumber : ''].filter(Boolean).join(' · ');
      var body = document.createElement('p');
      body.className = 'storyline-v2-journal-entry-body';
      body.textContent = entry.summary || entry.narrative || '';
      card.appendChild(heading);
      if (meta.textContent) card.appendChild(meta);
      if (body.textContent) card.appendChild(body);
      if (entry.diceResult !== undefined && entry.diceResult !== null) {
        var dice = document.createElement('span');
        dice.className = 'storyline-v2-journal-dice';
        dice.textContent = 'Dice result: ' + entry.diceResult;
        dice.setAttribute('aria-label', 'Dice result ' + entry.diceResult);
        card.appendChild(dice);
      }
      container.appendChild(card);
    });
  };

  StorylineV2Client.prototype.renderBookmarkRail = function (container, bookmarks, callbacks) {
    if (!container) return;
    callbacks = callbacks || {};
    var active = Array.isArray(bookmarks) ? bookmarks.slice(0, 2) : [];
    container.textContent = '';
    container.classList.add('storyline-v2-bookmark-rail');
    container.setAttribute('aria-label', 'Storyline bookmarks');

    var present = document.createElement('button');
    present.type = 'button';
    present.className = 'storyline-v2-bookmark storyline-v2-bookmark--present';
    present.textContent = 'Present';
    present.setAttribute('aria-label', 'Return to present');
    present.addEventListener('click', function () { if (typeof callbacks.onPresent === 'function') callbacks.onPresent(); });
    container.appendChild(present);

    active.forEach(function (bookmark, index) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'storyline-v2-bookmark storyline-v2-bookmark--saved';
      button.dataset.bookmarkId = bookmark.bookmarkId || bookmark.id || String(index);
      button.textContent = bookmark.label || ('Bookmark ' + (index + 1));
      button.setAttribute('aria-label', 'Review ' + button.textContent);
      button.addEventListener('click', function () {
        if (typeof callbacks.onReview === 'function') callbacks.onReview(bookmark);
      });
      container.appendChild(button);
    });
  };

  StorylineV2Client.prototype.renderBookmarkReview = function (container, bookmark, callbacks) {
    if (!container || !bookmark) return;
    callbacks = callbacks || {};
    container.textContent = '';
    container.className = 'storyline-v2-bookmark-review';
    container.setAttribute('role', 'dialog');
    container.setAttribute('aria-modal', 'true');
    container.setAttribute('aria-label', 'Bookmark review');
    var title = document.createElement('h2');
    title.textContent = bookmark.label || 'Saved page';
    var summary = document.createElement('p');
    summary.textContent = bookmark.summary || [bookmark.sceneName || bookmark.sceneId, bookmark.turnNumber ? 'Turn ' + bookmark.turnNumber : ''].filter(Boolean).join(' · ');
    var review = document.createElement('button');
    review.type = 'button'; review.textContent = 'Review history';
    review.addEventListener('click', function () { if (typeof callbacks.onHistory === 'function') callbacks.onHistory(bookmark); });
    var replay = document.createElement('button');
    replay.type = 'button'; replay.className = 'storyline-v2-replay-action'; replay.textContent = 'Replay from here';
    replay.addEventListener('click', function () { if (typeof callbacks.onReplay === 'function') callbacks.onReplay(bookmark); });
    container.appendChild(title); container.appendChild(summary); container.appendChild(review); container.appendChild(replay);
  };

  StorylineV2Client.prototype.renderCatalog = function (container, onAction) {
    if (!container || !this.snapshot || !this.snapshot.catalog) return;
    container.textContent = '';
    var catalog = this.snapshot.catalog;
    (catalog.actions || []).forEach(function (action) {
      var button = document.createElement('button');
      button.type = 'button'; button.className = 'storyline-v2-action';
      button.dataset.actionId = action.actionId; button.dataset.actionType = action.type || ''; button.dataset.category = action.category || '';
      button.dataset.catalogVersion = catalog.catalogVersion;
      button.setAttribute('aria-label', (action.label || action.shortLabel || action.actionId) + (action.subtitle ? ' — ' + action.subtitle : ''));
      var icon = document.createElement('span'); icon.className = 'storyline-v2-action-icon'; icon.setAttribute('aria-hidden', 'true'); icon.textContent = action.iconKey ? '✦' : '•';
      var copy = document.createElement('span'); copy.className = 'storyline-v2-action-copy';
      var title = document.createElement('strong'); title.textContent = action.shortLabel || action.label || action.actionId; copy.appendChild(title);
      if (action.subtitle) { var subtitle = document.createElement('em'); subtitle.textContent = action.subtitle; copy.appendChild(subtitle); }
      button.appendChild(icon); button.appendChild(copy); button.addEventListener('click', function () { onAction(action); }); container.appendChild(button);
    });
  };

  root.StorylineV2Client = StorylineV2Client;
}(window));
