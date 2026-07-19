/**
 * The Binding — Dice Roller v4 (dice-box-threejs)
 *
 * Replaces the custom Three.js + settling animation with @3d-dice/dice-box-threejs
 * for real rigid-body physics (Cannon ES), proper bouncing, collisions, and themes.
 *
 * Preserves the same DiceRoller.roll() API so the rest of the app doesn't need changes.
 *
 * API:
 *   DiceRoller.roll({ type: 'd20', result: 17 }) → Promise<result>
 *   DiceRoller.roll([{ type: 'd6', result: 4 }, { type: 'd6', result: 3 }]) → Promise<result>
 *   DiceRoller.setTheme(themeName) — change dice colorset + material
 *   DiceRoller.setSurface(surface) — change table surface (green-felt, blue-felt, wood, etc.)
 *   DiceRoller.setPhysics({ gravity, strength, lightIntensity, baseScale }) — physics tuning
 *   DiceRoller.setSounds(enabled, volume?) — toggle sound effects
 *   DiceRoller.themes — list of available themes
 *   DiceRoller.surfaces — list of available surfaces
 *   DiceRoller.materials — list of available materials
 *
 * Requires:
 *   <script src="/dice-box-threejs.umd.js"></script>
 */
const DiceRoller = (function () {
  'use strict';

  var box = null;
  var overlay = null;
  var resultLabel = null;
  var initPromise = null;
  var _resolveRoll = null;

  // dice-box-threejs UMD exports as window["dice-box-threejs"], not DiceBox
  function getDiceBoxClass() {
    if (typeof DiceBox !== 'undefined') return DiceBox;
    if (typeof window !== 'undefined' && window['dice-box-threejs']) return window['dice-box-threejs'];
    return null;
  }

  // ── Theme definitions ────────────────────────────────────────────
  var THEMES = {
    'bronze':       { label: 'Thylean Bronze',   colorset: 'bronze',       material: 'metal' },
    'bloodmoon':    { label: 'Blood Moon',        colorset: 'bloodmoon',    material: 'metal' },
    'necrotic':     { label: 'Necrotic',          colorset: 'necrotic',     material: 'glass' },
    'fire':         { label: 'Fire',              colorset: 'fire',         material: 'metal' },
    'ice':          { label: 'Ice',               colorset: 'ice',          material: 'glass' },
    'classic':      { label: 'Classic White',     colorset: 'white',        material: 'none' },
    'black':        { label: 'Obsidian',          colorset: 'black',        material: 'none' },
    'rainbow':      { label: 'Rainbow',           colorset: 'rainbow',      material: 'none' },
    'glitterparty': { label: 'Glitter Party',     colorset: 'glitterparty', material: 'glass' },
    'astralsea':    { label: 'Astral Sea',        colorset: 'astralsea',    material: 'none' },
    'dragons':      { label: 'Here be Dragons',   colorset: 'dragons',      material: 'none' },
    'starynight':   { label: 'Stary Night',       colorset: 'starynight',   material: 'none' }
  };

  // ── Surface options ──────────────────────────────────────────────
  var SURFACES = [
    'green-felt', 'blue-felt', 'red-felt', 'wood', 'wood-dark',
    'metal', 'marble', 'sand', 'snow'
  ];

  // ── Material options ─────────────────────────────────────────────
  var MATERIALS = ['none', 'metal', 'wood', 'glass', 'plastic'];

  var currentTheme = 'bronze';
  var currentSurface = 'green-felt';
  var currentMaterial = 'metal';

  // ── Create result overlay ────────────────────────────────────────
  function ensureOverlay() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.id = 'dice-result-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;' +
      'background:rgba(0,0,0,0.7);display:none;align-items:center;justify-content:center;' +
      'z-index:10000;cursor:pointer;';
    resultLabel = document.createElement('div');
    resultLabel.style.cssText = 'font-family:Georgia,serif;font-size:4em;font-weight:700;' +
      'color:#C9A84C;text-shadow:0 0 20px rgba(201,168,76,0.5);letter-spacing:4px;';
    overlay.appendChild(resultLabel);
    document.body.appendChild(overlay);
    overlay.addEventListener('click', hideOverlay);
  }

  function showOverlay(total) {
    ensureOverlay();
    resultLabel.textContent = total;
    overlay.style.display = 'flex';
  }

  function hideOverlay() {
    if (overlay) overlay.style.display = 'none';
  }

  // ── Initialize the dice box ──────────────────────────────────────
  function init() {
    if (initPromise) return initPromise;

    initPromise = new Promise(function (resolve) {
      ensureOverlay();

      var DiceBoxClass = getDiceBoxClass();
      if (!DiceBoxClass) {
        console.error('dice-box-threejs not loaded — check script tag');
        resolve();
        return;
      }

      // Find or create the dice container
      var container = document.getElementById('dice-box');
      if (!container) {
        container = document.createElement('div');
        container.id = 'dice-box';
        container.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:9999;pointer-events:none;';
        document.body.appendChild(container);
      }

      // CRITICAL: wait one frame so the browser computes the container's layout
      // before Three.js tries to create the WebGLRenderer with those dimensions.
      requestAnimationFrame(function () {
        box = new DiceBoxClass('#dice-box', {
          assetPath: '/assets/dice-box/',
          sounds: true,
          volume: 60,
          shadows: true,
          theme_surface: currentSurface,
          theme_colorset: THEMES[currentTheme].colorset,
          theme_material: THEMES[currentTheme].material,
          sound_dieMaterial: 'plastic',
          gravity_multiplier: 400,
          light_intensity: 0.7,
          baseScale: 100,
          strength: 1,
          onRollComplete: function (results) {
            var total = 0;
            if (results) {
              if (results.total !== undefined) {
                total = results.total;
              } else if (results.length) {
                for (var i = 0; i < results.length; i++) {
                  total += (results[i].value !== undefined) ? results[i].value : results[i];
                }
              }
            }
            showOverlay(total);
            if (_resolveRoll) {
              _resolveRoll(total);
              _resolveRoll = null;
            }
          }
        });

        // CRITICAL: init() creates the WebGLRenderer, scene, camera, physics world
        // and loads themes. Without this call, this.renderer is undefined on roll().
        box.initialize().then(function () {
          console.log('[DiceRoller] dice-box-threejs initialized successfully');
          resolve();
        }).catch(function (err) {
          console.error('[DiceRoller] DiceBox init failed:', err);
          resolve();
        });
      });
    });

    return initPromise;
  }

  // ── Apply a dice theme ───────────────────────────────────────────
  function applyTheme(themeName) {
    if (!box || !THEMES[themeName]) return;
    currentTheme = themeName;
    var theme = THEMES[themeName];
    currentMaterial = theme.material || 'none';
    try {
      box.updateConfig({
        theme_colorset: theme.colorset,
        theme_material: currentMaterial
      });
    } catch (e) {
      console.warn('Theme update failed:', e);
    }
  }

  // ── Set surface ──────────────────────────────────────────────────
  function applySurface(surface) {
    if (!box) return;
    currentSurface = surface;
    try {
      box.updateConfig({ theme_surface: surface });
    } catch (e) {
      console.warn('Surface update failed:', e);
    }
  }

  // ── Set physics parameters ───────────────────────────────────────
  function applyPhysics(params) {
    if (!box) return;
    var cfg = {};
    if (params.gravity !== undefined) cfg.gravity_multiplier = params.gravity;
    if (params.strength !== undefined) cfg.strength = params.strength;
    if (params.lightIntensity !== undefined) cfg.light_intensity = params.lightIntensity;
    if (params.baseScale !== undefined) cfg.baseScale = params.baseScale;
    if (params.shadows !== undefined) cfg.shadows = params.shadows;
    try {
      box.updateConfig(cfg);
    } catch (e) {
      console.warn('Physics update failed:', e);
    }
  }

  // ── Set sounds ───────────────────────────────────────────────────
  function applySounds(enabled, volume) {
    if (!box) return;
    try {
      var cfg = { sounds: !!enabled };
      if (volume !== undefined) cfg.volume = volume;
      box.updateConfig(cfg);
    } catch (e) {
      console.warn('Sound update failed:', e);
    }
  }

  // ── Main roll function (preserves original API) ──────────────────
  function roll(params) {
    return init().then(function () {
      hideOverlay();

      var rolls = Array.isArray(params) ? params : [params];
      if (rolls.length === 0) return Promise.resolve(0);

      var parts = [];
      var values = [];
      rolls.forEach(function (r) {
        var type = r.type || 'd20';
        var sides = parseInt(type.replace('d', ''), 10);
        parts.push('1d' + sides);
        values.push(r.result || Math.floor(Math.random() * sides) + 1);
      });

      var notation = parts.join('+') + '@' + values.join(',');

      return new Promise(function (resolve) {
        _resolveRoll = resolve;
        try {
          box.roll(notation);
        } catch (e) {
          console.warn('DiceBox.roll failed, using fallback:', e);
          var total = 0;
          values.forEach(function (v) { total += v; });
          showOverlay(total);
          resolve(total);
          _resolveRoll = null;
        }
      });
    });
  }

  // ── Public API ───────────────────────────────────────────────────
  return {
    roll: roll,
    init: init,
    setTheme: applyTheme,
    setSurface: applySurface,
    setPhysics: applyPhysics,
    setSounds: applySounds,
    themes: function () { return Object.keys(THEMES); },
    themeLabels: function () { return THEMES; },
    surfaces: function () { return SURFACES.slice(); },
    materials: function () { return MATERIALS.slice(); }
  };
})();
