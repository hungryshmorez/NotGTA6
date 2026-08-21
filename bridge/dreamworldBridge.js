// /bridge/dreamworldBridge.js - Dreamworld Sleep Trial Protocol Adapter
// Resolves a completed sleep trial into persistent boons/curses and returns
// the player to the city. Boons and curses live in the dreamworld state slice
// and are applied as immediate stat modifiers on wake.
(function(global) {
  var BOONS = {
    unshakable_will:   { label: 'Unshakable Will',   sanity: 25 },
    clockwork_heart:   { label: 'Clockwork Heart',   health: 20 },
    night_owl:         { label: 'Night Owl',         sanity: 10 },
    lucid_fortune:     { label: 'Lucid Fortune',     money: 200 }
  };
  var CURSES = {
    memory_debt:       { label: 'Memory Debt',       sanity: -15 },
    hall_of_glass:     { label: 'Hall of Shattered Glass', health: -10 }
  };

  function applyModifiers(defTable, ids, stats) {
    (ids || []).forEach(function(id) {
      var def = defTable[id];
      if (!def) return;
      if (def.sanity) stats.sanity = Math.max(0, Math.min(100, stats.sanity + def.sanity));
      if (def.health) stats.health = Math.max(0, Math.min(100, stats.health + def.health));
      if (def.money) stats.money = Math.max(0, stats.money + def.money);
    });
  }

  global.DreamworldBridge = {
    BOONS: BOONS,
    CURSES: CURSES,

    // Resolve a trial: persist boons/curses, apply modifiers, wake in city.
    resolve: function(result) {
      result = result || {};
      var boons = result.boons || [];
      var curses = result.curses || [];

      var stats = global.saveState.get('global');
      applyModifiers(BOONS, boons, stats);
      applyModifiers(CURSES, curses, stats);

      // A night's sleep restores rest and advances to morning.
      stats.hour = 7;
      stats.day = (stats.day || 1) + 1;
      global.saveState.set('global', stats);

      var slice = global.saveState.get('slices.dreamworld') || { activeBoons: [], activeCurses: [] };
      slice.activeBoons = (slice.activeBoons || []).concat(boons);
      slice.activeCurses = (slice.activeCurses || []).concat(curses);
      global.saveState.set('slices.dreamworld', slice);

      global.eventBus.publish('player.stats.updated', stats);
      global.eventBus.publish('dreamworld.exit', { boons: boons, curses: curses });

      if (global.RealmRouter.isRegistered('uls')) global.RealmRouter.go('uls');
    }
  };
})(window);
