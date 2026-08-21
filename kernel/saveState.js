// /kernel/saveState.js - State-Sliced Persistence with Quota Safety
(function(global) {
  var STORAGE_KEY = 'uls_production_save_v2';
  var DEFAULT_STATE = {
    global: {
      money: 150,
      debt: 50000,
      keysCollected: 0,
      heat: 0,
      reputation: 0,
      health: 100,
      sanity: 100,
      water: 90,
      hunger: 90,
      day: 1,
      hour: 8
    },
    player: {
      name: 'Rookie',
      role: 'Wanderer',
      rawRole: 'Wanderer',
      district: 'market',
      adultMode: false,
      inventory: []
    },
    slices: {
      uls: { calmTurns: 0, rentDueDays: 3 },
      livingHell: { viewers: 12, clout: 5, activeChallenge: null },
      dreamworld: { activeBoons: [], activeCurses: [] },
      backrooms: { glitchedOnce: false, turnsElapsed: 0 }
    }
  };

  var memoryState = JSON.parse(JSON.stringify(DEFAULT_STATE));

  global.saveState = {
    get: function(path, fallback) {
      if (!path) return memoryState;
      var keys = path.split('.');
      var curr = memoryState;
      for (var i = 0; i < keys.length; i++) {
        if (curr == null || typeof curr !== 'object' || !(keys[i] in curr)) {
          return fallback;
        }
        curr = curr[keys[i]];
      }
      return curr;
    },

    set: function(path, value) {
      var keys = path.split('.');
      var curr = memoryState;
      for (var i = 0; i < keys.length - 1; i++) {
        if (!curr[keys[i]] || typeof curr[keys[i]] !== 'object') {
          curr[keys[i]] = {};
        }
        curr = curr[keys[i]];
      }
      curr[keys[keys.length - 1]] = value;
      this.persist();
      global.eventBus.publish('state.changed', { path: path, value: value });
    },

    persist: function() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryState));
      } catch (e) {
        console.warn('[SaveState] LocalStorage quota exceeded or storage disabled.', e);
      }
    },

    load: function() {
      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          var parsed = JSON.parse(raw);
          memoryState = Object.assign({}, DEFAULT_STATE, parsed);
        }
      } catch (e) {
        console.error('[SaveState] Failed to parse save payload, resetting.', e);
        memoryState = JSON.parse(JSON.stringify(DEFAULT_STATE));
      }
      return memoryState;
    },

    reset: function() {
      memoryState = JSON.parse(JSON.stringify(DEFAULT_STATE));
      this.persist();
      global.eventBus.publish('state.reset', memoryState);
    }
  };

  global.saveState.load();
})(window);
