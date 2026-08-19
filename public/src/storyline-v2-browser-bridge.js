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

  function render(snapshot) {
    var scene = snapshot && snapshot.catalog;
    if (!scene) return;
    var narrative = snapshot.state && snapshot.state.sceneId ? scene.sceneId : '';
    if (narrative && typeof root.addMessage === 'function' && (!root._storylineV2Scene || root._storylineV2Scene !== narrative)) {
      root._storylineV2Scene = narrative;
      root.addMessage('system', 'Scene: ' + narrative);
    }
    root.storylineV2Client.renderCatalog(document.getElementById('action-buttons'), function (action) {
      submit(action);
    });
  }

  function submit(action) {
    if (!root.storylineV2Client) return;
    root.storylineV2Client.submitAction({ actionId: action.actionId, turnId: 'turn-' + Date.now().toString(36) })
      .then(function (result) {
        if (result && result.result && result.result.narration && typeof root.addMessage === 'function') {
          root.addMessage('dm', result.result.narration);
        }
        render(root.storylineV2Client.snapshot);
      })
      .catch(function (error) {
        if (typeof root.addMessage === 'function') root.addMessage('error', error.message || 'Storyline v2 action failed.');
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
