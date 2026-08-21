// /router/realmRouter.js - Complete Lifecycle Controller with Auto-Disposal
(function(global) {
  var realms = {};
  var currentRealm = null;
  var currentDisposables = [];

  global.RealmRouter = {
    register: function(id, definition) {
      realms[id] = definition;
    },

    go: function(targetId, params) {
      // 1. Teardown active realm & dispose all registered event listeners
      if (currentRealm && realms[currentRealm] && realms[currentRealm].unmount) {
        try {
          realms[currentRealm].unmount();
        } catch (e) {
          console.error('[Router] Error unmounting realm:', currentRealm, e);
        }
      }
      for (var i = 0; i < currentDisposables.length; i++) {
        try { currentDisposables[i].dispose(); } catch (e) {}
      }
      currentDisposables = [];

      // 2. Transition DOM state
      currentRealm = targetId;
      document.body.setAttribute('data-realm', targetId);

      // 3. Mount incoming realm
      var mountRoot = document.getElementById('realm-root');
      if (realms[targetId] && realms[targetId].mount) {
        realms[targetId].mount(mountRoot, global.eventBus, global.saveState, params);
      }

      global.eventBus.publish('router.navigated', { realm: targetId, params: params });
    },

    bindRealmListener: function(topic, callback) {
      var sub = global.eventBus.subscribe(topic, callback);
      currentDisposables.push(sub);
      return sub;
    },

    getActiveRealm: function() { return currentRealm; },

    isRegistered: function(id) { return !!realms[id]; }
  };
})(window);
