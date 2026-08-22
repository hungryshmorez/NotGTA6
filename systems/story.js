// /systems/story.js - Config-driven narrated story loop (the "it talks back" driver)
// Owns the scene card for ANY realm: takes a player action, advances the
// mechanical world tick, asks the AI narrator what happens, applies the narrated
// effects, and renders narration + AI-suggested choices + a fresh scene image.
// Each realm mounts it with a config describing its flavor, backdrop, opening,
// realm-specific action buttons, and (optionally) an exit.
(function(global) {
  var dom = {};
  var mounted = false;
  var config = null;

  var CITY_DEFAULT = {
    realm: 'uls',
    badge: 'CHROMA CITY',
    districtKey: null, // null => use player's current district
    showTravel: true,
    opening: "The rain hasn't let up in three days. You owe the Chroma Syndicate fifty grand, and the clock is already running. What do you do?",
    openingChoices: ['Look around', 'Find some quick work', 'Head to the Crystal Market', 'Check the alley behind you'],
    openingScene: 'establishing shot of Chroma City, rain-soaked neon street at night',
    actions: [],   // realm-specific persistent buttons
    exit: null
  };

  function fmt(n) { return (n || 0).toLocaleString('en-US'); }
  function currentDistrict() {
    return (config && config.districtKey) || global.saveState.get('player.district', 'market');
  }

  function mount(root, cfg) {
    config = Object.assign({}, CITY_DEFAULT, cfg || {});
    root.innerHTML =
      '<div class="scene-card story-card">' +
        '<div class="scene-media-wrapper">' +
          '<div class="scene-img kenburns district-market"></div>' +
          '<div class="scene-overlay-badge" id="story-badge"></div>' +
          '<div class="scene-loader" id="story-loader"><span></span><span></span><span></span></div>' +
        '</div>' +
        '<div class="scene-content">' +
          '<div class="story-meta" id="story-meta"></div>' +
          '<p id="story-narration" class="story-narration"></p>' +
          '<div class="district-travel" id="story-travel"></div>' +
          '<div id="story-actions" class="realm-actions"></div>' +
          '<div id="story-choices" class="decision-grid"></div>' +
          '<div id="story-exit"></div>' +
        '</div>' +
      '</div>';

    dom.wrapper = root.querySelector('.scene-media-wrapper');
    dom.badge = root.querySelector('#story-badge');
    dom.loader = root.querySelector('#story-loader');
    dom.meta = root.querySelector('#story-meta');
    dom.narration = root.querySelector('#story-narration');
    dom.travel = root.querySelector('#story-travel');
    dom.actions = root.querySelector('#story-actions');
    dom.choices = root.querySelector('#story-choices');
    dom.exit = root.querySelector('#story-exit');
    mounted = true;

    if (dom.narration) dom.narration.textContent = global.SafetyRuntime.filterText(config.opening);
    renderMeta();
    renderTravel();
    renderActions();
    renderExit();
    renderChoices(config.openingChoices);
    if (global.ImageGen) {
      global.ImageGen.apply(dom.wrapper, config.openingScene, currentDistrict());
    }
  }

  function realmName() {
    if (config && config.realm !== 'uls') return config.badge;
    return global.AIContext ? global.AIContext.districtLabel(currentDistrict()).split(' (')[0] : 'Chroma City';
  }

  function renderMeta() {
    if (!dom.meta) return;
    var g = global.saveState.get('global') || {};
    dom.meta.textContent = (global.GameClock ? global.GameClock.format() : ('Day ' + (g.day || 1))) +
      '  ·  ' + (global.Weather ? global.Weather.get() : 'clear') +
      '  ·  ' + realmName();
    if (dom.badge) dom.badge.textContent = String(realmName()).toUpperCase();
  }

  function renderTravel() {
    if (!dom.travel) return;
    if (!config.showTravel) { dom.travel.innerHTML = ''; dom.travel.style.display = 'none'; return; }
    dom.travel.style.display = '';
    var districts = { glass: 'Glass Garden', market: 'Crystal Market', industrial: 'Rust Belt', neon: 'Neon Heights' };
    var heat = global.saveState.get('global.heat', 0);
    var cur = currentDistrict();
    dom.travel.innerHTML = '<span class="travel-lbl">Go:</span>';
    Object.keys(districts).forEach(function(key) {
      var btn = document.createElement('button');
      btn.className = 'travel-btn' + (key === cur ? ' current' : '');
      btn.textContent = districts[key];
      var locked = heat >= 70 && key !== cur && (key === 'glass' || key === 'neon');
      if (locked) btn.classList.add('locked');
      btn.onclick = function() {
        if (key === cur) return;
        if (locked) { global.eventBus.publish('ui.toast', '🚔 Too hot to move into ' + districts[key] + '.'); return; }
        global.saveState.set('player.district', key);
        turn('travel to ' + districts[key]);
      };
      dom.travel.appendChild(btn);
    });
  }

  // Persistent realm-specific action buttons (challenges, doors, scavenge...).
  function renderActions() {
    if (!dom.actions) return;
    dom.actions.innerHTML = '';
    var actions = (config && config.actions) || [];
    if (!actions.length) { dom.actions.style.display = 'none'; return; }
    dom.actions.style.display = '';
    actions.forEach(function(a) {
      var btn = document.createElement('button');
      btn.className = 'realm-action-btn';
      btn.innerHTML = a.label;
      btn.onclick = function() {
        if (global.AINarrator && global.AINarrator.isBusy()) return;
        // The action's run() applies real mechanics and returns an action
        // string to narrate. If it returns falsy it is async (e.g. launches a
        // mini-game) and will call Story.turn() itself when it resolves.
        var actionText = a.run ? a.run() : a.label;
        if (actionText) turn(actionText);
      };
      dom.actions.appendChild(btn);
    });
  }

  function renderExit() {
    if (!dom.exit) return;
    dom.exit.innerHTML = '';
    if (!config || !config.exit) return;
    var btn = document.createElement('button');
    btn.className = 'fixer-btn';
    btn.textContent = config.exit.label;
    btn.onclick = function() { if (config.exit.run) config.exit.run(); };
    dom.exit.appendChild(btn);
  }

  function renderChoices(choices) {
    if (!dom.choices) return;
    dom.choices.innerHTML = '';
    (choices || []).forEach(function(c) {
      var btn = document.createElement('button');
      btn.textContent = c;
      btn.onclick = function() { turn(c); };
      dom.choices.appendChild(btn);
    });
  }

  function setBusy(busy) {
    if (dom.loader) dom.loader.classList.toggle('active', busy);
    if (dom.narration) dom.narration.classList.toggle('dimmed', busy);
    global.eventBus.publish('story.busy', busy);
  }

  function applyEffects(resp) {
    var eff = resp.effects || {};
    if (eff.money && global.Economy) global.Economy.adjust(eff.money, 'story');
    if (eff.heat && global.Economy) global.Economy.adjustHeat(eff.heat);

    var stats = global.saveState.get('global');
    ['health', 'sanity', 'water', 'hunger'].forEach(function(k) {
      if (eff[k]) stats[k] = Math.max(0, Math.min(100, (stats[k] || 0) + eff[k]));
    });
    global.saveState.set('global', stats);

    // Location changes only make sense in the open city.
    if (resp.location && config && config.realm === 'uls') global.saveState.set('player.district', resp.location);
    if (resp.sfx && global.GameAudio) global.GameAudio.play(resp.sfx);
    global.eventBus.publish('player.stats.updated', global.saveState.get('global'));
  }

  function render(resp) {
    if (dom.narration) dom.narration.textContent = global.SafetyRuntime.filterText(resp.narration);
    renderMeta();
    renderTravel();
    renderActions();
    renderChoices(resp.choices && resp.choices.length ? resp.choices
      : ['Keep moving', 'Look for an angle', 'Lie low', 'Check your surroundings']);
    if (global.ImageGen && dom.wrapper) {
      global.ImageGen.apply(dom.wrapper, resp.scene, (config && config.realm === 'uls' && resp.location) ? resp.location : currentDistrict());
    }
    if (dom.meta && resp._provider) {
      var tag = resp._fallback ? 'offline' :
        (resp._provider === 'byok' ? 'premium' : resp._provider === 'local' ? 'local' : 'free');
      dom.meta.setAttribute('data-provider', tag);
    }
  }

  function turn(actionText) {
    if (!actionText) return;
    if (global.AINarrator && global.AINarrator.isBusy()) return;
    setBusy(true);
    global.eventBus.publish('player.action.submitted', actionText);
    global.AINarrator.narrate(actionText).then(function(resp) {
      applyEffects(resp);
      render(resp);
      setBusy(false);
    }).catch(function(err) {
      console.error('[Story] turn failed', err);
      setBusy(false);
    });
  }

  global.Story = {
    mount: mount,
    turn: turn,
    refresh: function() { if (mounted) { renderMeta(); renderTravel(); renderActions(); } },
    isMounted: function() { return mounted; },
    getRealm: function() { return config ? config.realm : null; },
    unmount: function() { mounted = false; config = null; dom = {}; }
  };
})(window);
