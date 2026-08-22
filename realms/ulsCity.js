// /realms/ulsCity.js - ULS City Hub realm (Chroma City)
// AI-narrated open sandbox. The Story engine owns the scene card; this realm
// supplies the city config (travel bar on, a fixer action to burn HEAT) and
// keeps the scene meta in sync with ambient world changes.
(function(global) {
  function payFixer() {
    var money = global.saveState.get('global.money', 0);
    if (money < 200) {
      global.eventBus.publish('ui.toast', 'Not enough cash for the fixer ($200).');
      global.GameAudio.play('ui_error');
      return 'try to pay a fixer to cool my heat but come up short on cash';
    }
    global.Economy.adjust(-200, 'fixer bribe');
    var stats = global.saveState.get('global');
    stats.heat = Math.max(0, stats.heat - 40);
    global.saveState.set('global', stats);
    global.eventBus.publish('player.stats.updated', stats);
    return 'slip a fixer $200 to make the heat disappear';
  }

  function mount(root) {
    global.Story.mount(root, {
      realm: 'uls',
      showTravel: true,
      actions: [
        { label: '🕵️ Pay a fixer to cool the heat ($200)', run: payFixer }
      ]
    });

    global.RealmRouter.bindRealmListener('time.phase.changed', function() { global.Story.refresh(); });
    global.RealmRouter.bindRealmListener('player.stats.updated', function() { global.Story.refresh(); });
  }

  function unmount() {
    if (global.Story && global.Story.unmount) global.Story.unmount();
  }

  global.RealmRouter.register('uls', { mount: mount, unmount: unmount });
})(window);
