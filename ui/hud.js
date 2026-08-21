// /ui/hud.js - Touch-Friendly Responsive Player HUD
(function(global) {
  var dom = {};

  function init(container) {
    container.innerHTML =
      '<div class="hud-container">' +
        '<div class="hud-stat-group">' +
          '<div class="hud-badge district-badge" id="hud-district">DISTRICT: MARKET</div>' +
          '<div class="hud-badge debt-badge" id="hud-debt">DEBT: $50,000</div>' +
          '<div class="hud-badge cash-badge" id="hud-cash">CASH: $150</div>' +
          '<div class="hud-badge key-badge" id="hud-keys">KEYS: 0/4</div>' +
        '</div>' +
        '<div class="hud-meters">' +
          '<div class="meter-item" title="Health"><span class="m-lbl">HP</span><div class="m-bar"><div class="m-fill hp" id="bar-hp"></div></div></div>' +
          '<div class="meter-item" title="Sanity"><span class="m-lbl">SAN</span><div class="m-bar"><div class="m-fill san" id="bar-san"></div></div></div>' +
          '<div class="meter-item" title="Water"><span class="m-lbl">H2O</span><div class="m-bar"><div class="m-fill h2o" id="bar-h2o"></div></div></div>' +
          '<div class="meter-item" title="Hunger"><span class="m-lbl">FOOD</span><div class="m-bar"><div class="m-fill food" id="bar-food"></div></div></div>' +
        '</div>' +
        '<div class="hud-stars" id="hud-wanted-stars">☆☆☆☆☆</div>' +
        '<div class="hud-actions">' +
          '<button class="hud-btn" id="btn-hud-city">🏙️ City</button>' +
          '<button class="hud-btn" id="btn-hud-shop">🏪 Shop</button>' +
          '<button class="hud-btn" id="btn-hud-sleep">🛏️ Sleep</button>' +
          '<button class="hud-btn" id="btn-hud-tv">📺 Living Hell</button>' +
          '<button class="hud-btn" id="btn-hud-ai">⚙️ AI</button>' +
        '</div>' +
      '</div>';

    dom.district = container.querySelector('#hud-district');
    dom.debt = container.querySelector('#hud-debt');
    dom.cash = container.querySelector('#hud-cash');
    dom.keys = container.querySelector('#hud-keys');
    dom.barHp = container.querySelector('#bar-hp');
    dom.barSan = container.querySelector('#bar-san');
    dom.barH2o = container.querySelector('#bar-h2o');
    dom.barFood = container.querySelector('#bar-food');
    dom.stars = container.querySelector('#hud-wanted-stars');

    container.querySelector('#btn-hud-city').onclick = function() {
      if (global.RealmRouter.isRegistered('uls')) global.RealmRouter.go('uls');
    };
    container.querySelector('#btn-hud-shop').onclick = function() {
      global.eventBus.publish('ui.shop.open');
    };
    container.querySelector('#btn-hud-sleep').onclick = function() {
      if (global.RealmRouter.isRegistered('dreamworld')) global.RealmRouter.go('dreamworld');
    };
    container.querySelector('#btn-hud-tv').onclick = function() {
      if (global.RealmRouter.isRegistered('living-hell')) global.RealmRouter.go('living-hell');
    };
    container.querySelector('#btn-hud-ai').onclick = function() {
      global.eventBus.publish('ui.ai.open');
    };

    global.eventBus.subscribe('player.stats.updated', updateDisplay);
    global.eventBus.subscribe('state.reset', function() { updateDisplay(global.saveState.get('global')); });
    updateDisplay(global.saveState.get('global'));
  }

  function fmtMoney(n) {
    return (n || 0).toLocaleString('en-US');
  }

  function updateDisplay(stats) {
    if (!stats) return;
    dom.cash.textContent = 'CASH: $' + fmtMoney(stats.money);
    dom.debt.textContent = 'DEBT: $' + fmtMoney(stats.debt != null ? stats.debt : 50000);
    if (dom.keys) dom.keys.textContent = 'KEYS: ' + (stats.keysCollected || 0) + '/4';

    var district = global.saveState.get('player.district', 'market');
    dom.district.textContent = 'DISTRICT: ' + String(district).toUpperCase();

    dom.barHp.style.width = (stats.health || 0) + '%';
    dom.barSan.style.width = (stats.sanity || 0) + '%';
    dom.barH2o.style.width = (stats.water || 0) + '%';
    dom.barFood.style.width = (stats.hunger || 0) + '%';

    // GTA Wanted Stars (0 to 5)
    var heat = stats.heat || 0;
    var starCount = heat >= 90 ? 5 : heat >= 70 ? 4 : heat >= 50 ? 3 : heat >= 30 ? 2 : heat >= 10 ? 1 : 0;
    var starStr = '';
    for (var i = 0; i < 5; i++) {
      starStr += (i < starCount) ? '★' : '☆';
    }
    dom.stars.textContent = starStr;
    dom.stars.className = 'hud-stars star-lvl-' + starCount;
  }

  global.PlayerHUD = {
    mount: function(container) { init(container); }
  };
})(window);
