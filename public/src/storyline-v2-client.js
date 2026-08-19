/* Storyline v2 client adapter.
 *
 * Presentation-only: the server owns state, catalogs, IDs, availability, and
 * resolution. This adapter never invents actions or derives mechanics locally.
 */
(function (root) {
  'use strict';

  function StorylineV2Client(options) {
    options = options || {};
    this.base = options.base || '/api/storyline-v2';
    this.sessionId = null;
    this.snapshot = null;
  }

  StorylineV2Client.prototype.request = async function (url, init) {
    var response = await fetch(this.base + url, Object.assign({
      headers: { 'Content-Type': 'application/json' }
    }, init || {}));
    var data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Storyline v2 request failed');
    return data;
  };

  StorylineV2Client.prototype.start = async function (adventureId, classId, sessionId, options) {
    var data = await this.request('/sessions', {
      method: 'POST',
      body: JSON.stringify({ adventureId: adventureId, classId: classId, sessionId: sessionId, options: options || {} })
    });
    this.sessionId = sessionId;
    this.snapshot = data;
    return data;
  };

  StorylineV2Client.prototype.refresh = async function () {
    if (!this.sessionId) throw new Error('Storyline v2 session has not started');
    var data = await this.request('/sessions/' + encodeURIComponent(this.sessionId));
    this.snapshot = data;
    return data;
  };

  StorylineV2Client.prototype.submitAction = async function (action) {
    if (!this.sessionId || !this.snapshot || !this.snapshot.catalog) throw new Error('Storyline v2 session has not started');
    var catalog = this.snapshot.catalog;
    var catalogAction = (catalog.actions || []).find(function (candidate) { return candidate.actionId === action.actionId; });
    if (!catalogAction) throw new Error('Action is not in the current server catalog');
    var data = await this.request('/sessions/' + encodeURIComponent(this.sessionId) + '/actions', {
      method: 'POST',
      body: JSON.stringify({ actionId: catalogAction.actionId, catalogVersion: catalog.catalogVersion, turnId: action.turnId })
    });
    this.snapshot = { adventureId: this.snapshot.adventureId, state: data.state, catalog: data.catalog };
    return data;
  };

  StorylineV2Client.prototype.submitText = async function (text, turnId) {
    if (!this.sessionId) throw new Error('Storyline v2 session has not started');
    var data = await this.request('/sessions/' + encodeURIComponent(this.sessionId) + '/actions', {
      method: 'POST',
      body: JSON.stringify({ text: text, turnId: turnId })
    });
    if (data.result && data.result.state) this.snapshot = { adventureId: this.snapshot.adventureId, state: data.result.state, catalog: data.result.catalog };
    return data;
  };

  StorylineV2Client.prototype.renderCatalog = function (container, onAction) {
    if (!container || !this.snapshot || !this.snapshot.catalog) return;
    container.textContent = '';
    var catalog = this.snapshot.catalog;
    (catalog.actions || []).forEach(function (action) {
      var button = document.createElement('button');
      button.type = 'button';
      button.textContent = action.shortLabel || action.label;
      button.dataset.actionId = action.actionId;
      button.dataset.catalogVersion = catalog.catalogVersion;
      button.addEventListener('click', function () { onAction(action); });
      container.appendChild(button);
    });
  };

  root.StorylineV2Client = StorylineV2Client;
}(window));
