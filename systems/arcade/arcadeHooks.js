// /systems/arcade/arcadeHooks.js - Bridge mini-game results into the world
// Runs a mini-game, applies economy/stat consequences, then narrates the
// outcome through the Story loop (when a realm is mounted).
(function(global) {
  function narrate(text) {
    if (text && global.Story && global.Story.isMounted()) global.Story.turn(text);
    else if (text) global.eventBus.publish('ui.toast', text);
  }

  function loseHealth(n) {
    var s = global.saveState.get('global');
    s.health = Math.max(0, s.health - n);
    global.saveState.set('global', s);
    global.eventBus.publish('player.stats.updated', s);
  }

  global.ArcadeHooks = {
    // A fight with standard stakes. opts:
    //   enemyName, difficulty, reward (cash), rep, toDebt (pay debt on win),
    //   healthLoss, heatOnLoss, winText, loseText
    fight: function(opts) {
      opts = opts || {};
      if (!global.Arcade) return Promise.resolve({ win: false });
      return global.Arcade.play('fight', {
        enemyName: opts.enemyName || 'Street Tough',
        difficulty: opts.difficulty || 1,
        damage: opts.damage
      }).then(function(res) {
        var text;
        if (res.win) {
          if (opts.reward && global.Economy) global.Economy.adjust(opts.reward, 'won a fight');
          if (opts.toDebt && global.Economy) global.Economy.payDebt(opts.toDebt);
          if (opts.rep && global.Economy) global.Economy.adjustReputation(opts.rep);
          text = opts.winText || 'win the fight, standing over them as the crowd roars';
          global.GameAudio.play('cash');
        } else if (res.forfeit) {
          text = 'back out of the fight before a punch is thrown';
        } else {
          loseHealth(opts.healthLoss != null ? opts.healthLoss : 25);
          if (opts.heatOnLoss && global.Economy) global.Economy.adjustHeat(opts.heatOnLoss);
          text = opts.loseText || 'lose the fight and limp away bloodied';
        }
        narrate(text);
        return res;
      });
    }
  };

  // Bounty-hunter ambush when the heat is high. Fired from the world tick.
  global.eventBus.subscribe('encounter.bounty', function() {
    if (global.Arcade && global.Arcade.isOpen()) return;
    global.eventBus.publish('ui.toast', '🎯 A bounty hunter steps out of the shadows!');
    global.ArcadeHooks.fight({
      enemyName: 'Bounty Hunter', difficulty: 1.6, damage: 20,
      reward: 250, rep: 8, healthLoss: 35, heatOnLoss: 0,
      winText: 'drop the bounty hunter who came for your head, and lift their bankroll',
      loseText: 'take a beating from the bounty hunter and barely crawl away'
    }).then(function(res) {
      // Beating the hunter cools the heat; losing keeps you hunted.
      if (res.win && global.Economy) global.Economy.adjustHeat(-30);
    });
  });
})(window);
