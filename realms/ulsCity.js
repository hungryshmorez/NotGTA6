// /realms/ulsCity.js - ULS City Hub realm (Chroma City)
// The city is now AI-narrated: the Story engine owns the scene card, freeform
// actions and AI-suggested choices drive the loop, and each turn regenerates
// the scene image. This realm just mounts the Story shell and refreshes it when
// the world clock / weather changes.
(function(global) {
  function mount(root) {
    global.Story.mount(root);

    // Keep the scene meta/travel in sync with ambient world changes.
    global.RealmRouter.bindRealmListener('time.phase.changed', function() { global.Story.refresh(); });
    global.RealmRouter.bindRealmListener('player.stats.updated', function() { global.Story.refresh(); });
  }

  function unmount() {
    if (global.Story && global.Story.unmount) global.Story.unmount();
  }

  global.RealmRouter.register('uls', { mount: mount, unmount: unmount });
})(window);
