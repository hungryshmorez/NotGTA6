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

  global.ArcadeHooks.drive = function(opts) {
    opts = opts || {};
    if (!global.Arcade) return Promise.resolve({ win: false });
    var chase = opts.mode === 'chase';
    return global.Arcade.play('drive', {
      mode: opts.mode, goalTime: opts.goalTime || (chase ? 18 : 22), difficulty: opts.difficulty || 1
    }).then(function(res) {
      var text;
      if (res.win) {
        var pay = (opts.reward || 0) + (res.score || 0);
        if (pay && global.Economy) global.Economy.adjust(pay, chase ? 'shook the cops' : 'courier run');
        if (chase && global.Economy) global.Economy.adjustHeat(-50);
        else if (opts.rep && global.Economy) global.Economy.adjustReputation(opts.rep);
        text = chase
          ? 'floor it through the district and lose the cops in the neon, cash still on me — $' + pay
          : 'nail the courier run across town, pocketing $' + pay + ' plus whatever I scooped up';
      } else if (res.forfeit) {
        text = 'pull over and bail on the run';
      } else if (res.busted) {
        if (global.Economy) global.Economy.adjustHeat(chase ? 20 : 15);
        loseHealth(15);
        text = chase ? 'wrap the car around a cruiser — the cops drag me out' : 'total the bike on the courier run, package scattered across the asphalt';
      } else {
        text = 'end the run in one piece';
      }
      narrate(text);
      return res;
    });
  };

  // A quick skill challenge (lockpick / pickpocket / hack). opts:
  //   type, reward, heatOnWin, winText, loseText, difficulty
  global.ArcadeHooks.skill = function(opts) {
    opts = opts || {};
    if (!global.Arcade) return Promise.resolve({ win: false });
    return global.Arcade.play('skill', {
      type: opts.type, title: opts.title,
      speed: opts.speed, zoneW: opts.zoneW, pins: opts.pins, len: opts.len
    }).then(function(res) {
      var text;
      if (res.win) {
        var pay = (opts.reward || 60) + (res.score || 0) * (opts.perScore || 15);
        if (global.Economy) global.Economy.adjust(pay, opts.type || 'skill');
        if (opts.heatOnWin && global.Economy) global.Economy.adjustHeat(opts.heatOnWin);
        text = (opts.winText || 'pull off the job clean') + ' — $' + pay;
      } else if (res.forfeit) {
        text = 'think better of it and walk away';
      } else {
        if (opts.heatOnLoss && global.Economy) global.Economy.adjustHeat(opts.heatOnLoss);
        text = opts.loseText || 'botch it and have to bolt before anyone notices';
      }
      narrate(text);
      return res;
    });
  };

  // Walk-around explore: play the movement game, then dispatch the chosen spot.
  global.ArcadeHooks.explore = function() {
    if (!global.Arcade) return;
    global.Arcade.play('move', {}).then(function(res) {
      if (!res || !res.hotspot) return;
      switch (res.hotspot) {
        case 'shop':  global.eventBus.publish('ui.shop.open'); break;
        case 'tv':    if (global.RealmRouter.isRegistered('living-hell')) global.RealmRouter.go('living-hell'); break;
        case 'bed':   if (global.RealmRouter.isRegistered('dreamworld')) global.RealmRouter.go('dreamworld'); break;
        case 'gig':   global.ArcadeHooks.drive({ mode: 'gig', reward: 80, rep: 4 }); break;
        case 'fixer': global.eventBus.publish('ui.toast', 'The fixer is in the alley — use the fixer action to cool your heat.'); break;
        case 'leave': default: break;
      }
    });
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
