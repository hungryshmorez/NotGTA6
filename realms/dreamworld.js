// /realms/dreamworld.js - Dreamworld sleep-trial realm
// Nightly symbolic trials. Each door yields a persistent boon (or risks a
// curse) resolved through the Dreamworld bridge, then wakes in the city.
(function(global) {
  var DOORS = [
    { id: 'red',  label: '🔴 The Red Door', desc: 'Lucid fortune — wake with cash in your pocket.',
      boons: ['lucid_fortune'], curses: [] },
    { id: 'blue', label: '🔵 The Blue Door', desc: 'Court of Childhood Regrets. Confess honestly for Unshakable Will.',
      boons: ['unshakable_will'], curses: [], risk: 0.25, riskCurse: ['memory_debt'] },
    { id: 'gold', label: '🟡 The Gold Door', desc: 'The Clockwork Heart transplant — durability over frailty.',
      boons: ['clockwork_heart'], curses: [], risk: 0.35, riskCurse: ['hall_of_glass'] }
  ];

  var el = null;

  function mount(root) {
    el = document.createElement('div');
    el.className = 'scene-card realm-dreamworld';
    el.innerHTML =
      '<div class="scene-media-wrapper">' +
        '<div class="scene-img realm-bg-dreamworld"></div>' +
        '<div class="scene-overlay-badge">💤 DREAMWORLD</div>' +
      '</div>' +
      '<div class="scene-content">' +
        '<h2>Floating Doorway Selection</h2>' +
        '<p>You drift down a zero-gravity hallway. Three doors hang in the dark, ' +
          'each humming a different promise. Choose one and let the trial take you.</p>' +
        '<div id="dw-doors" class="decision-grid"></div>' +
      '</div>';
    root.innerHTML = '';
    root.appendChild(el);

    var mount2 = el.querySelector('#dw-doors');
    DOORS.forEach(function(door) {
      var btn = document.createElement('button');
      btn.innerHTML = '<b>' + door.label + '</b><br><span class="sub">' + door.desc + '</span>';
      btn.onclick = function() { chooseDoor(door); };
      mount2.appendChild(btn);
    });
  }

  function chooseDoor(door) {
    global.eventBus.publish('dialogue.start');
    var boons = door.boons.slice();
    var curses = door.curses.slice();
    if (door.risk && Math.random() < door.risk) {
      // Trial backfires: the boon is lost and a curse takes its place.
      boons = [];
      curses = curses.concat(door.riskCurse || []);
      global.eventBus.publish('ui.toast', '🌒 The dream turned on you...');
    } else {
      global.eventBus.publish('ui.toast', '✨ The trial rewards you.');
    }
    setTimeout(function() {
      global.eventBus.publish('dialogue.end');
      global.DreamworldBridge.resolve({ boons: boons, curses: curses });
    }, 900);
  }

  function unmount() { el = null; }

  global.RealmRouter.register('dreamworld', { mount: mount, unmount: unmount });
})(window);
