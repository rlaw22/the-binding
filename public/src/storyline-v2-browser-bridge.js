/* Feature-flagged Storyline v2 browser bridge.
 *
 * The legacy Storyline flow remains the fallback. This bridge activates only
 * when the server explicitly enables v2 and the selected adventure is hosted
 * by the v2 registry. It renders server-issued catalogs and sends only
 * server-issued action IDs back to the v2 transport.
 */
(function (root) {
  'use strict';

  root.storylineV2Active = false;
  root.storylineV2Client = null;

  function sessionId() {
    return 'storyline-v2-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function ensureBookPresentation() {
    var app = document.getElementById('app');
    if (!app || document.getElementById('storyline-v2-book-tools')) return;
    var tools = document.createElement('section');
    tools.id = 'storyline-v2-book-tools';
    tools.className = 'storyline-v2-book-tools';
    tools.setAttribute('aria-label', 'Storyline book navigation');
    var rail = document.createElement('div');
    rail.id = 'storyline-v2-bookmarks';
    var historyButton = document.createElement('button');
    historyButton.type = 'button';
    historyButton.className = 'storyline-v2-book-tool-button';
    historyButton.textContent = 'Journal';
    historyButton.setAttribute('aria-expanded', 'false');
    historyButton.addEventListener('click', function () {
      var journal = document.getElementById('storyline-v2-journal-panel');
      if (!journal) return;
      var open = !journal.hidden;
      journal.hidden = open;
      historyButton.setAttribute('aria-expanded', String(!open));
      if (!open) {
        journal.setAttribute('aria-live', 'polite');
        journal.focus();
      }
    });
    tools.appendChild(historyButton);
    tools.appendChild(rail);
    var journal = document.createElement('section');
    journal.id = 'storyline-v2-journal-panel';
    journal.className = 'storyline-v2-journal-panel';
    journal.hidden = true;
    journal.tabIndex = -1;
    journal.setAttribute('aria-label', 'Storyline journal history');
    tools.appendChild(journal);
    var review = document.createElement('section');
    review.id = 'storyline-v2-bookmark-review';
    review.className = 'storyline-v2-bookmark-review-host';
    review.hidden = true;
    review.tabIndex = -1;
    tools.appendChild(review);
    app.insertBefore(tools, app.firstChild);
  }

  function renderBookPresentation(snapshot) {
    if (!root.storylineV2Client || !snapshot) return;
    ensureBookPresentation();
    var state = snapshot.state || {};
    var journal = state.journal && Array.isArray(state.journal.entries) ? state.journal.entries : [];
    var bookmarks = Array.isArray(state.replayBookmarks) ? state.replayBookmarks : [];
    root.storylineV2Client.renderBookHistory(document.getElementById('storyline-v2-journal-panel'), journal);
    root.storylineV2Client.renderBookmarkRail(document.getElementById('storyline-v2-bookmarks'), bookmarks, {
      onPresent: function () {
        var messages = document.getElementById('messages');
        if (messages) messages.scrollTop = messages.scrollHeight;
        var journalPanel = document.getElementById('storyline-v2-journal-panel');
        if (journalPanel) journalPanel.hidden = true;
      },
      onReview: function (bookmark) {
        var review = document.getElementById('storyline-v2-bookmark-review');
        if (!review) return;
        review.hidden = false;
        root.storylineV2Client.renderBookmarkReview(review, bookmark, {
          onHistory: function () {
            review.hidden = true;
            var journalPanel = document.getElementById('storyline-v2-journal-panel');
            if (journalPanel) journalPanel.hidden = false;
          },
          onReplay: function () {
            if (typeof root.addMessage === 'function') root.addMessage('system', 'Replay is an explicit server action and is not enabled in this presentation preview.');
          }
        });
        review.setAttribute('aria-live', 'polite');
        review.focus();
      }
    });
  }

  function render(snapshot) {
    var scene = snapshot && snapshot.catalog;
    if (!scene) return;
    renderBookPresentation(snapshot);
    var narrative = snapshot.state && snapshot.state.sceneId ? scene.sceneId : '';
    if (narrative && typeof root.addMessage === 'function' && (!root._storylineV2Scene || root._storylineV2Scene !== narrative)) {
      root._storylineV2Scene = narrative;
      if (scene.sceneName) root.addMessage('system', scene.sceneName);
      if (scene.setting) root.addMessage('dm', scene.setting);
      if (scene.openingNarration && scene.openingNarration !== scene.setting) root.addMessage('dm', scene.openingNarration);
      if (Array.isArray(scene.presentNpcs) && scene.presentNpcs.length) root.addMessage('system', 'Present: ' + scene.presentNpcs.join(', '));
    }
    root.storylineV2Client.renderCatalog(document.getElementById('action-buttons'), function (action) {
      submit(action);
    });
  }

  function refreshAfterStale(error) {
    if (!error || error.status !== 409 || !root.storylineV2Client) return Promise.resolve(false);
    return root.storylineV2Client.refresh().then(function (snapshot) {
      render(snapshot);
      if (typeof root.addMessage === 'function') root.addMessage('system', 'The scene changed. Choose an action from the refreshed list.');
      return true;
    }).catch(function () { return false; });
  }

  function submit(action) {
    if (!root.storylineV2Client) return;
    root.storylineV2Client.submitAction({ actionId: action.actionId, turnId: 'turn-' + Date.now().toString(36) })
      .then(function (result) {
        if (result && result.narrative && typeof root.addMessage === 'function') {
          root.addMessage('dm', result.narrative);
        }
        render(root.storylineV2Client.snapshot);
      })
      .catch(function (error) {
        refreshAfterStale(error).then(function (refreshed) {
          if (!refreshed && typeof root.addMessage === 'function') root.addMessage('error', error.message || 'Storyline v2 action failed.');
        });
      });
  }

  root.tryStartStorylineV2 = async function (adventureId, classId) {
    if (!root.StorylineV2Client) return false;
    try {
      var statusResponse = await fetch('/api/storyline-v2/status', { headers: { 'Accept': 'application/json' } });
      if (!statusResponse.ok) return false;
      var status = await statusResponse.json();
      if (!status.enabled || !Array.isArray(status.adventures) || status.adventures.indexOf(adventureId) === -1) return false;

      var client = new root.StorylineV2Client();
      var snapshot = await client.start(adventureId, classId, sessionId());
      root.storylineV2Client = client;
      root.storylineV2Active = true;
      root._storylineV2Scene = null;
      root.storyModeActive = true;
      document.body.classList.add('storyline-active');
      ['start-screen', 'storyline-setup-screen', 'class-select-overlay'].forEach(function (id) {
        var screen = document.getElementById(id);
        if (screen) { screen.classList.add('hidden'); screen.style.display = 'none'; }
      });
      var messages = document.getElementById('messages');
      if (messages) messages.classList.remove('hidden');
      var inputRow = document.getElementById('input-row');
      if (inputRow) inputRow.style.display = 'none';
      var actionButtons = document.getElementById('action-buttons');
      if (actionButtons) actionButtons.classList.add('storyline-actions');
      render(snapshot);
      return true;
    } catch (error) {
      root.storylineV2Active = false;
      root.storylineV2Client = null;
      return false;
    }
  };
}(window));
