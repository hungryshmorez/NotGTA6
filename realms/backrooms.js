// /realms/backrooms.js - The Backrooms liminal scavenge realm
// Reached by a reality glitch. A short scavenge loop: search rooms for
// almond water, artifacts and Reality Encryption Key fragments, then find the
// fire exit back to the city. Low sanity draw each move.
(function(global) {
  var el = null;
  var roomsSearched = 0;

  function mount(root) {
    roomsSearched = 0;
    global.GameAudio.play('backrooms_hum');

    el = document.createElement('div');
    el.className = 'scene-card realm-backrooms';
    el.innerHTML =
      '<div class="scene-media-wrapper">' +
        '<div class="scene-img realm-bg-backrooms"></div>' +
        '<div class="scene-overlay-badge">🟨 LEVEL 0 — NOCLIP</div>' +
      '</div>' +
      '<div class="scene-content">' +
        '<h2>The Backrooms</h2>' +
        '<p id="br-log">Endless damp yellow carpet. The fluorescent hum presses on your skull. ' +
          'Somewhere in the mono-yellow maze is a way out — and things worth taking.</p>' +
        '<div id="br-actions" class="decision-grid"></div>' +
      '</div>';
    root.innerHTML = '';
    root.appendChild(el);

    renderActions();
  }

  function log(msg) {
    var l = el && el.querySelector('#br-log');
    if (l) l.textContent = msg;
  }

  function renderActions() {
    var mount = el.querySelector('#br-actions');
    mount.innerHTML = '';

    addBtn(mount, '🔦 Search a cubicle', searchRoom);
    addBtn(mount, '🚪 Look for the fire exit', findExit);
    addBtn(mount, '🥤 Throw a soda can (distract entity)', distract);
  }

  function addBtn(mount, label, fn) {
    var btn = document.createElement('button');
    btn.textContent = label;
    btn.onclick = fn;
    mount.appendChild(btn);
  }

  function drainSanity(n) {
    var stats = global.saveState.get('global');
    stats.sanity = Math.max(0, stats.sanity - n);
    global.saveState.set('global', stats);
    global.eventBus.publish('player.stats.updated', stats);
  }

  function searchRoom() {
    roomsSearched++;
    drainSanity(4);
    var roll = Math.random();
    if (roll < 0.18) {
      // Reality Encryption Key fragment.
      global.Economy.grantKey();
      log('Behind peeling wallpaper: a humming crystalline shard. A Reality Encryption Key fragment.');
    } else if (roll < 0.45) {
      var stats = global.saveState.get('global');
      stats.water = Math.min(100, stats.water + 30);
      stats.sanity = Math.min(100, stats.sanity + 20);
      global.saveState.set('global', stats);
      global.eventBus.publish('player.stats.updated', stats);
      log('A sealed flask of Almond Water. It steadies your mind and quenches your thirst.');
    } else if (roll < 0.7) {
      var cash = 40 + Math.floor(Math.random() * 160);
      global.Economy.adjust(cash, 'backrooms anomaly artifact');
      log('A dead terminal coughs up a black-market crypto wallet. +$' + cash + '.');
    } else {
      log('Empty drawers, dust, and the endless hum. Nothing here.');
    }
    checkSanity();
    renderActions();
  }

  function distract() {
    drainSanity(1);
    log('The can clatters away down a distant corridor. Something shuffles after it. Safer, for now.');
  }

  function findExit() {
    drainSanity(3);
    // Odds of finding the exit improve the longer you have scavenged.
    var chance = 0.35 + Math.min(0.4, roomsSearched * 0.08);
    if (Math.random() < chance) {
      global.saveState.set('slices.backrooms.glitchedOnce', false); // allow future glitches
      global.eventBus.publish('ui.toast', '🚪 A heavy fire door swings open onto a city alley. You made it out.');
      global.GameAudio.stop('backrooms_hum');
      if (global.RealmRouter.isRegistered('uls')) global.RealmRouter.go('uls');
    } else {
      log('The EXIT sign was a trap — red neon leading deeper in. The maze rearranges behind you.');
      renderActions();
    }
  }

  function checkSanity() {
    var sanity = global.saveState.get('global.sanity', 100);
    if (sanity <= 0) {
      global.eventBus.publish('ui.toast', '🌀 Your mind slips. The Backrooms spit you back into the city.');
      global.GameAudio.stop('backrooms_hum');
      global.saveState.set('slices.backrooms.glitchedOnce', false);
      if (global.RealmRouter.isRegistered('uls')) global.RealmRouter.go('uls');
    }
  }

  function unmount() {
    global.GameAudio.stop('backrooms_hum');
    el = null;
  }

  global.RealmRouter.register('backrooms', { mount: mount, unmount: unmount });
})(window);
