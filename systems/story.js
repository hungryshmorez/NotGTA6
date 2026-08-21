// /systems/story.js - Narrated story loop (the "it talks back" driver)
// Owns the scene card: takes a player action, advances the mechanical world
// tick, asks the AI narrator what happens, applies the narrated effects, and
// renders narration + AI-suggested choices + a fresh scene image.
(function(global) {
  var dom = {};
  var mounted = false;

  function fmt(n) { return (n || 0).toLocaleString('en-US'); }

  // Build the narrated scene-card shell inside a realm root.
  function mount(root) {
    root.innerHTML =
      '<div class="scene-card story-card">' +
        '<div class="scene-media-wrapper">' +
          '<div class="scene-img kenburns district-market"></div>' +
          '<div class="scene-overlay-badge" id="story-badge">CHROMA CITY</div>' +
          '<div class="scene-loader" id="story-loader"><span></span><span></span><span></span></div>' +
        '</div>' +
        '<div class="scene-content">' +
          '<div class="story-meta" id="story-meta"></div>' +
          '<p id="story-narration" class="story-narration">The rain hasn\'t let up in three days. You owe the Chroma Syndicate fifty grand, and the clock is already running. What do you do?</p>' +
          '<div class="district-travel" id="story-travel"></div>' +
          '<div id="story-choices" class="decision-grid"></div>' +
        '</div>' +
      '</div>';

    dom.wrapper = root.querySelector('.scene-media-wrapper');
    dom.badge = root.querySelector('#story-badge');
    dom.loader = root.querySelector('#story-loader');
    dom.meta = root.querySelector('#story-meta');
    dom.narration = root.querySelector('#story-narration');
    dom.travel = root.querySelector('#story-travel');
    dom.choices = root.querySelector('#story-choices');
    mounted = true;

    renderTravel();
    renderMeta();
    // Opening choices before the first AI turn.
    renderChoices(['Look around', 'Find some quick work', 'Head to the Crystal Market', 'Check the alley behind you']);
    // Kick an ambient opening image.
    if (global.ImageGen) {
      global.ImageGen.apply(dom.wrapper, 'establishing shot of Chroma City, rain-soaked neon street at night', currentDistrict());
    }
  }

  function currentDistrict() { return global.saveState.get('player.district', 'market'); }

  function renderMeta() {
    if (!dom.meta) return;
    var g = global.saveState.get('global') || {};
    dom.meta.textContent = (global.GameClock ? global.GameClock.format() : ('Day ' + (g.day || 1))) +
      '  ·  ' + (global.Weather ? global.Weather.get() : 'clear') +
      '  ·  ' + (global.AIContext ? global.AIContext.districtLabel(currentDistrict()).split(' (')[0] : '');
    var badgeName = global.AIContext ? global.AIContext.districtLabel(currentDistrict()).split(' (')[0] : 'Chroma City';
    if (dom.badge) dom.badge.textContent = badgeName.toUpperCase();
  }

  function renderTravel() {
    if (!dom.travel) return;
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

  // Apply the narrator's effect deltas through the core systems.
  function applyEffects(resp) {
    var eff = resp.effects || {};
    if (eff.money && global.Economy) global.Economy.adjust(eff.money, 'story');
    if (eff.heat && global.Economy) global.Economy.adjustHeat(eff.heat);

    var stats = global.saveState.get('global');
    ['health', 'sanity', 'water', 'hunger'].forEach(function(k) {
      if (eff[k]) stats[k] = Math.max(0, Math.min(100, (stats[k] || 0) + eff[k]));
    });
    global.saveState.set('global', stats);

    if (resp.location) global.saveState.set('player.district', resp.location);
    if (resp.sfx && global.GameAudio) global.GameAudio.play(resp.sfx);
    global.eventBus.publish('player.stats.updated', global.saveState.get('global'));
  }

  function render(resp) {
    if (dom.narration) {
      dom.narration.textContent = global.SafetyRuntime.filterText(resp.narration);
    }
    renderMeta();
    renderTravel();
    renderChoices(resp.choices && resp.choices.length ? resp.choices
      : ['Keep moving', 'Look for an angle', 'Lie low', 'Check your pockets']);
    if (global.ImageGen && dom.wrapper) {
      global.ImageGen.apply(dom.wrapper, resp.scene, resp.location || currentDistrict());
    }
    // Provider tag (small, for transparency) — free/local/premium.
    if (dom.meta && resp._provider) {
      var tag = resp._fallback ? 'offline' :
        (resp._provider === 'byok' ? 'premium' : resp._provider === 'local' ? 'local' : 'free');
      dom.meta.setAttribute('data-provider', tag);
    }
  }

  // The single turn entry point used by the ACT box, choices, and travel.
  function turn(actionText) {
    if (!actionText) return;
    if (global.AINarrator && global.AINarrator.isBusy()) return;
    setBusy(true);

    // 1. Advance the mechanical world (needs decay, clock, heat, backrooms roll).
    global.eventBus.publish('player.action.submitted', actionText);

    // 2. Ask the narrator what happens, then apply + render.
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
    refresh: function() { if (mounted) { renderMeta(); renderTravel(); } },
    isMounted: function() { return mounted; },
    unmount: function() { mounted = false; dom = {}; }
  };
})(window);
