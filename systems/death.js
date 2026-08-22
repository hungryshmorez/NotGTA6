// /systems/death.js - Death watch & game-over
// Watches player health across every system. The moment health hits zero — a
// failed Living Hell challenge, a lost fight, starvation — the run ends. Fires
// game.over.death exactly once with a cause so the UI can show a game-over.
(function(global) {
  var dead = false;

  function check(stats) {
    if (dead) return;
    stats = stats || global.saveState.get('global') || {};
    if ((stats.health || 0) <= 0) {
      dead = true;
      var cause = global.saveState.get('player.lastDamageCause', 'the city') ;
      global.eventBus.publish('game.over.death', { cause: cause });
    }
  }

  global.DeathWatch = {
    init: function() {
      global.eventBus.subscribe('player.stats.updated', check);
      global.eventBus.subscribe('state.reset', function() { dead = false; });
    },
    isDead: function() { return dead; },
    // Systems call this right before applying lethal damage so the game-over
    // screen can name what killed you.
    setCause: function(cause) { global.saveState.set('player.lastDamageCause', cause); },
    revive: function() { dead = false; }
  };
})(window);
