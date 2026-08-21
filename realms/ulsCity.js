// /realms/ulsCity.js - ULS City Hub realm (Chroma City, 4 districts)
(function(global) {
  var DISTRICTS = {
    glass:      { name: 'Glass Garden',  tag: 'Corporate towers & penthouse contracts', safe: false },
    market:     { name: 'Crystal Market', tag: 'Street economy, vendors & gig work', safe: true },
    industrial: { name: 'Rust Belt',     tag: 'Warehouses, fixers & the underworld', safe: true },
    neon:       { name: 'Neon Heights',  tag: 'Rooftop nightlife & high rollers', safe: false }
  };

  // Freeform "gig" actions available in the city. Each resolves through the
  // economy/stat systems so the core loop stays authoritative.
  var GIGS = [
    { label: '🚴 Run a courier delivery', pay: [40, 90], heat: 0, sanity: -3 },
    { label: '🎸 Busk on the corner', pay: [10, 35], heat: 0, sanity: 2 },
    { label: '🗑️ Scavenge the dumpsters', pay: [5, 25], heat: 0, sanity: -5 },
    { label: '🎨 Tag a wall (district clout)', pay: [0, 15], heat: 12, sanity: 4 },
    { label: '💵 Pass a counterfeit bill', pay: [60, 140], heat: 25, sanity: -2 }
  ];

  var el = null;

  function currentDistrictKey() {
    return global.saveState.get('player.district', 'market');
  }

  function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function mount(root) {
    var dk = currentDistrictKey();
    var d = DISTRICTS[dk] || DISTRICTS.market;
    var heat = global.saveState.get('global.heat', 0);

    el = document.createElement('div');
    el.className = 'scene-card';
    el.innerHTML =
      '<div class="scene-media-wrapper">' +
        '<div id="scene-image" class="scene-img district-' + dk + '"></div>' +
        '<div class="scene-overlay-badge">' + d.name.toUpperCase() + '</div>' +
      '</div>' +
      '<div class="scene-content">' +
        '<h2 id="scene-title">' + d.name + '</h2>' +
        '<p id="scene-description">' + d.tag + '. ' +
          (global.Weather ? global.Weather.describe() : '') + ' ' +
          (global.GameClock ? global.GameClock.format() : '') + '</p>' +
        '<div class="district-travel" id="district-travel"></div>' +
        '<div id="decision-buttons" class="decision-grid"></div>' +
      '</div>';
    root.innerHTML = '';
    root.appendChild(el);

    renderTravel();
    renderGigs();

    // Refresh the scene when the day/phase or weather shifts.
    global.RealmRouter.bindRealmListener('time.phase.changed', refreshDescription);
    global.RealmRouter.bindRealmListener('weather.changed', refreshDescription);
    global.RealmRouter.bindRealmListener('player.stats.updated', refreshDescription);
  }

  function refreshDescription() {
    if (!el) return;
    var dk = currentDistrictKey();
    var d = DISTRICTS[dk] || DISTRICTS.market;
    var desc = el.querySelector('#scene-description');
    if (desc) {
      desc.textContent = d.tag + '. ' +
        (global.Weather ? global.Weather.describe() : '') + ' ' +
        (global.GameClock ? global.GameClock.format() : '');
    }
  }

  function renderTravel() {
    var mount = el.querySelector('#district-travel');
    var heat = global.saveState.get('global.heat', 0);
    var dk = currentDistrictKey();
    mount.innerHTML = '<span class="travel-lbl">Travel:</span>';
    Object.keys(DISTRICTS).forEach(function(key) {
      var d = DISTRICTS[key];
      var btn = document.createElement('button');
      btn.className = 'travel-btn' + (key === dk ? ' current' : '');
      btn.textContent = d.name;
      // High heat physically locks travel to non-safe districts.
      var locked = heat >= 70 && !d.safe && key !== dk;
      if (locked) {
        btn.classList.add('locked');
        btn.title = 'Locked — too much heat to move through here.';
      }
      btn.onclick = function() {
        if (locked) {
          global.eventBus.publish('ui.toast', '🚔 Too hot to enter ' + d.name + '. Lie low first.');
          return;
        }
        if (key === dk) return;
        global.saveState.set('player.district', key);
        global.eventBus.publish('player.action.submitted', 'travel to ' + d.name);
        global.RealmRouter.go('uls');
      };
      mount.appendChild(btn);
    });
  }

  function renderGigs() {
    var mount = el.querySelector('#decision-buttons');
    mount.innerHTML = '';
    var heat = global.saveState.get('global.heat', 0);

    GIGS.forEach(function(gig) {
      var btn = document.createElement('button');
      btn.textContent = gig.label;
      // Legit storefront-style gigs close down under heavy heat.
      var shutByHeat = heat >= 70 && gig.heat === 0 && gig.label.indexOf('courier') !== -1;
      if (shutByHeat) { btn.disabled = true; btn.title = 'Shops closed while wanted.'; }
      btn.onclick = function() { runGig(gig); };
      mount.appendChild(btn);
    });

    // Underworld fixer: the sanctioned way to burn heat.
    var fixer = document.createElement('button');
    fixer.className = 'fixer-btn';
    fixer.textContent = '🕵️ Pay a fixer to cool the heat ($200)';
    fixer.onclick = payFixer;
    mount.appendChild(fixer);
  }

  function runGig(gig) {
    var pay = rand(gig.pay[0], gig.pay[1]);
    if (pay > 0 && global.Economy) global.Economy.adjust(pay, gig.label);
    if (gig.heat && global.Economy) global.Economy.adjustHeat(gig.heat);

    var stats = global.saveState.get('global');
    if (gig.sanity) stats.sanity = Math.max(0, Math.min(100, stats.sanity + gig.sanity));
    global.saveState.set('global', stats);

    global.eventBus.publish('ui.toast', gig.label + ' → +$' + pay +
      (gig.heat ? ' (+' + gig.heat + ' heat)' : ''));
    // Advance the world clock / needs / anomaly check.
    global.eventBus.publish('player.action.submitted', gig.label);
    renderGigs();
    renderTravel();
  }

  function payFixer() {
    var money = global.saveState.get('global.money', 0);
    if (money < 200) {
      global.eventBus.publish('ui.toast', 'Not enough cash for the fixer.');
      global.GameAudio.play('ui_error');
      return;
    }
    global.Economy.adjust(-200, 'fixer bribe');
    var stats = global.saveState.get('global');
    stats.heat = Math.max(0, stats.heat - 40);
    global.saveState.set('global', stats);
    global.eventBus.publish('player.stats.updated', stats);
    global.eventBus.publish('ui.toast', '🕵️ The fixer makes some calls. Heat drops hard.');
    renderTravel();
    renderGigs();
  }

  function unmount() {
    el = null;
  }

  global.RealmRouter.register('uls', { mount: mount, unmount: unmount });
})(window);
