// /ui/hud.js - Compact, organized player HUD
(function(global) {
  var dom = {};

  var METERS = [
    { key: 'health', cls: 'hp',   ico: '❤' },
    { key: 'sanity', cls: 'san',  ico: '🧠' },
    { key: 'water',  cls: 'h2o',  ico: '💧' },
    { key: 'hunger', cls: 'food', ico: '🍔' }
  ];

  var NAV = [
    { id: 'city',    ico: '🏙️', label: 'City' },
    { id: 'shop',    ico: '🏪', label: 'Shop' },
    { id: 'explore', ico: '🚶', label: 'Explore' },
    { id: 'sleep',   ico: '🛏️', label: 'Sleep' },
    { id: 'tv',      ico: '📺', label: 'Hell' },
    { id: 'ai',      ico: '⚙️', label: 'AI' }
  ];

  function init(container) {
    var metersHtml = METERS.map(function(m) {
      return '<div class="meter" title="' + m.key + '">' +
        '<span class="m-ico">' + m.ico + '</span>' +
        '<div class="m-track"><div class="m-fill ' + m.cls + '" id="bar-' + m.cls + '"></div></div>' +
        '<span class="m-val" id="val-' + m.cls + '">100</span></div>';
    }).join('');

    var navHtml = NAV.map(function(n) {
      return '<button class="nav-btn" id="nav-' + n.id + '" title="' + n.label + '">' +
        '<span class="nav-ico">' + n.ico + '</span><span class="nav-lbl">' + n.label + '</span></button>';
    }).join('');

    container.innerHTML =
      '<div class="hud">' +
        '<div class="hud-top">' +
          '<div class="hud-loc"><span class="loc-dot">🌆</span><span id="hud-district">CRYSTAL MARKET</span>' +
            '<span class="hud-clock" id="hud-clock">Day 1 · 08:00</span></div>' +
          '<div class="hud-wallet">' +
            '<span class="chip cash" id="hud-cash">$150</span>' +
            '<span class="chip debt" id="hud-debt">$50,000</span>' +
            '<span class="chip keys" id="hud-keys">🔑 0/4</span>' +
            '<span class="chip stars" id="hud-wanted-stars">☆☆☆☆☆</span>' +
          '</div>' +
        '</div>' +
        '<div class="hud-meters">' + metersHtml + '</div>' +
        '<div class="hud-nav">' + navHtml + '</div>' +
      '</div>';

    dom.district = container.querySelector('#hud-district');
    dom.clock = container.querySelector('#hud-clock');
    dom.cash = container.querySelector('#hud-cash');
    dom.debt = container.querySelector('#hud-debt');
    dom.keys = container.querySelector('#hud-keys');
    dom.stars = container.querySelector('#hud-wanted-stars');
    METERS.forEach(function(m) {
      dom['bar_' + m.cls] = container.querySelector('#bar-' + m.cls);
      dom['val_' + m.cls] = container.querySelector('#val-' + m.cls);
    });

    function tutLock() {
      if (global.Tutorial && global.Tutorial.isActive()) {
        global.eventBus.publish('ui.toast', "🔒 Finish Roxy's tour first — free roam unlocks at the end.");
        return true;
      }
      return false;
    }
    var handlers = {
      city:    function() { if (!tutLock() && global.RealmRouter.isRegistered('uls')) global.RealmRouter.go('uls'); },
      shop:    function() { global.eventBus.publish('ui.shop.open'); },
      explore: function() { if (!tutLock() && global.ArcadeHooks && global.ArcadeHooks.explore) global.ArcadeHooks.explore(); },
      sleep:   function() { if (!tutLock() && global.RealmRouter.isRegistered('dreamworld')) global.RealmRouter.go('dreamworld'); },
      tv:      function() { if (!tutLock() && global.RealmRouter.isRegistered('living-hell')) global.RealmRouter.go('living-hell'); },
      ai:      function() { global.eventBus.publish('ui.ai.open'); }
    };
    NAV.forEach(function(n) {
      var el = container.querySelector('#nav-' + n.id);
      if (el) el.onclick = handlers[n.id];
    });

    global.eventBus.subscribe('player.stats.updated', updateDisplay);
    global.eventBus.subscribe('state.reset', function() { updateDisplay(global.saveState.get('global')); });
    updateDisplay(global.saveState.get('global'));
  }

  function fmt(n) { return (n || 0).toLocaleString('en-US'); }

  function updateDisplay(stats) {
    if (!stats) return;
    dom.cash.textContent = '$' + fmt(stats.money);
    dom.debt.textContent = '$' + fmt(stats.debt != null ? stats.debt : 50000);
    if (dom.keys) dom.keys.textContent = '🔑 ' + (stats.keysCollected || 0) + '/4';

    var district = global.saveState.get('player.district', 'market');
    var label = global.AIContext ? global.AIContext.districtLabel(district).split(' (')[0] : district;
    dom.district.textContent = String(label).toUpperCase();
    if (dom.clock && global.GameClock) dom.clock.textContent = global.GameClock.format();

    METERS.forEach(function(m) {
      var v = Math.round(stats[m.key] || 0);
      if (dom['bar_' + m.cls]) dom['bar_' + m.cls].style.width = v + '%';
      if (dom['val_' + m.cls]) {
        dom['val_' + m.cls].textContent = v;
        dom['val_' + m.cls].className = 'm-val' + (v <= 20 ? ' low' : '');
      }
    });

    var heat = stats.heat || 0;
    var sc = heat >= 90 ? 5 : heat >= 70 ? 4 : heat >= 50 ? 3 : heat >= 30 ? 2 : heat >= 10 ? 1 : 0;
    var s = '';
    for (var i = 0; i < 5; i++) s += (i < sc ? '★' : '☆');
    dom.stars.textContent = s;
    dom.stars.className = 'chip stars star-lvl-' + sc;
  }

  global.PlayerHUD = { mount: function(container) { init(container); } };
})(window);
