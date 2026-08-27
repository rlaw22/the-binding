(function () {
  'use strict';
  var api = '/api/storyline-v2-personal';
  var token = '';
  var session = '';
  var snapshot = null;
  var busy = false;
  var $ = function (id) { return document.getElementById(id); };
  function setStatus(text) { $('launch-status').textContent = text || ''; }
  function setError(text) { $('launch-error').textContent = text || ''; }
  async function request(path, options) {
    options = options || {};
    options.headers = Object.assign({ 'Content-Type': 'application/json', Accept: 'application/json', Authorization: 'Bearer ' + token }, options.headers || {});
    var response = await fetch(api + path, options);
    var data = await response.json().catch(function () { return {}; });
    if (!response.ok) throw new Error(data.error || 'The book could not be opened.');
    return data;
  }
  function textBlock(value) {
    var box = document.createElement('div');
    String(value || '').split(/\n+/).filter(Boolean).forEach(function (line) { var p = document.createElement('p'); p.textContent = line; box.appendChild(p); });
    return box;
  }
  function render(data) {
    snapshot = data;
    var catalog = data.catalog || {};
    var state = data.state || {};
    $('scene-label').textContent = 'Dracula';
    $('scene-progress').textContent = state.act ? 'Act ' + state.act : 'The journey';
    $('scene-meta').textContent = catalog.chapterTitle || catalog.actLabel || 'The present chapter';
    $('scene-title').textContent = catalog.sceneName || catalog.title || 'The book opens';
    $('narrative').textContent = '';
    var opening = catalog.openingNarration || catalog.description || '';
    var setting = catalog.setting || '';
    // Never present compiler IDs, scene IDs, or a bare chapter heading as
    // player-facing prose. The canary must supply authored opening text.
    if (!opening || opening.trim() === setting.trim() || /^Chapter \d+:/i.test(opening.trim())) {
      opening = 'The page waits for your attention.';
    }
    $('narrative').appendChild(textBlock(opening));
    var response = $('response');
    var responseEntries = Array.isArray(state.journal) ? state.journal.filter(function (entry) { return entry && (entry.text || entry.summary || entry.narrative); }).slice(-2) : [];
    response.hidden = responseEntries.length === 0;
    response.textContent = '';
    if (responseEntries.length) {
      var responseLabel = document.createElement('strong'); responseLabel.textContent = 'Recent actions'; response.appendChild(responseLabel);
      responseEntries.forEach(function (entry) {
        var article = document.createElement('article');
        article.className = 'northstar-response-entry';
        article.textContent = entry.text || entry.summary || entry.narrative;
        response.appendChild(article);
      });
    }
    var actions = $('actions'); actions.textContent = '';
    (catalog.actions || []).forEach(function (action) {
      var button = document.createElement('button'); button.type = 'button'; button.className = 'northstar-action'; button.dataset.actionId = action.actionId; button.disabled = !!action.disabled;
      button.setAttribute('aria-label', (action.label || action.shortLabel || action.actionId) + (action.subtitle ? ' — ' + action.subtitle : ''));
      var title = document.createElement('span'); title.textContent = action.label || action.shortLabel || action.actionId; button.appendChild(title);
      if (action.subtitle) { var sub = document.createElement('small'); sub.textContent = action.subtitle; button.appendChild(sub); }
      button.addEventListener('click', function () { submit(action.actionId); }); actions.appendChild(button);
    });
    $('text-intent-feedback').textContent = '';
    $('text-intent').value = '';
    var journal = $('journal'); journal.textContent = '';
    var journalEntries = Array.isArray(state.journal) ? state.journal : (state.journal && Array.isArray(state.journal.entries) ? state.journal.entries : []);
    journalEntries.forEach(function (entry) { var article = document.createElement('article'); var entryText = entry.text || entry.summary || entry.narrative || ''; article.textContent = entryText || 'A turn was recorded.'; journal.appendChild(article); });
  }
  async function submit(actionId) {
    if (busy || !snapshot) return; busy = true; setError('');
    document.querySelectorAll('.northstar-action').forEach(function (button) { button.disabled = true; });
    $('text-intent-submit').disabled = true;
    try {
      var catalog = snapshot.catalog || {};
      var result = await request('/sessions/' + encodeURIComponent(session) + '/actions', { method: 'POST', body: JSON.stringify({ actionId: actionId, catalogVersion: catalog.catalogVersion, turnId: 'northstar-' + Date.now().toString(36) }) });
      render({ adventureId: snapshot.adventureId, state: result.state, catalog: result.catalog, result: result });
    } catch (error) { setError(error.message); document.querySelectorAll('.northstar-action').forEach(function (button) { button.disabled = false; }); } finally { $('text-intent-submit').disabled = false; busy = false; }
  }
  async function submitText(text) {
    if (busy || !snapshot || !text.trim()) return;
    busy = true; setError(''); $('text-intent-submit').disabled = true; $('text-intent-feedback').textContent = 'Considering the page…';
    document.querySelectorAll('.northstar-action').forEach(function (button) { button.disabled = true; });
    try {
      var result = await request('/sessions/' + encodeURIComponent(session) + '/actions', { method: 'POST', body: JSON.stringify({ text: text.trim(), turnId: 'northstar-text-' + Date.now().toString(36) }) });
      if (result.result && result.result.rejected) {
        $('text-intent-feedback').textContent = result.result.message || result.result.error || 'That action is not available here.';
        document.querySelectorAll('.northstar-action').forEach(function (button) { button.disabled = false; });
        return;
      }
      if (result.result && result.result.state && result.result.catalog) {
        render({ adventureId: snapshot.adventureId, state: result.result.state, catalog: result.result.catalog, result: result.result });
      } else if (result.state && result.catalog) {
        render({ adventureId: snapshot.adventureId, state: result.state, catalog: result.catalog, result: result });
      } else {
        $('text-intent-feedback').textContent = result.message || 'The page could not resolve that request.';
        document.querySelectorAll('.northstar-action').forEach(function (button) { button.disabled = false; });
      }
    } catch (error) { setError(error.message); document.querySelectorAll('.northstar-action').forEach(function (button) { button.disabled = false; }); }
    finally { $('text-intent-submit').disabled = false; busy = false; }
  }
  $('launch-form').addEventListener('submit', async function (event) {
    event.preventDefault(); setError(''); setStatus('Checking the private canary…'); token = $('token').value.trim(); if (!token) return;
    session = 'northstar-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
    try {
      var status = await request('/status');
      if (!status.enabled || !Array.isArray(status.adventures) || !status.adventures.length) throw new Error('The private Dracula canary is unavailable.');
      var adventureId = status.adventures[0];
      setStatus('Opening the newly ingested Dracula…');
      var data = await request('/sessions', { method: 'POST', body: JSON.stringify({ adventureId: adventureId, classId: $('class-select').value, sessionId: session }) });
      render(data); $('launch').style.display = 'none'; $('game').classList.add('active'); setStatus('');
    } catch (error) { setStatus(''); setError(error.message); }
  });
  $('text-intent-form').addEventListener('submit', function (event) { event.preventDefault(); submitText($('text-intent').value); });
  $('leave').addEventListener('click', function () { $('game').classList.remove('active'); $('launch').style.display = ''; token = ''; session = ''; snapshot = null; $('token').value = ''; $('text-intent').value = ''; $('text-intent-feedback').textContent = ''; });
}());
