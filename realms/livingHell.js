// /realms/livingHell.js - Living Hell House — lethal reality-horror realm
// Contestants really die on camera. Every challenge is a life-or-death gamble:
// win and a huge payout wipes off your Syndicate debt; fail and it costs real
// health (and can kill you outright). The narrator plays it as dread, not
// comedy. Outcomes run through the Story loop with a fresh scene image.
(function(global) {
  // win = survival odds. payout = cash wired to debt on a win. healthLoss =
  // real damage on failure (can be lethal). lethal = failure is certain death.
  var CHALLENGES = [
    { id: 'polygraph', name: 'The Truth Chair',        win: 0.62, payout: 2000, healthLoss: 22, sanityLoss: 15,
      blurb: 'Rigged polygraph. A wrong answer sends live current through the chair.' },
    { id: 'confront',  name: '3 AM Blood Confrontation', win: 0.5, payout: 3200, healthLoss: 45, sanityLoss: 22,
      blurb: 'A housemate comes at you in the dark with something sharp. Only one walks out clean.' },
    { id: 'gauntlet',  name: 'The Razorwire Gauntlet', win: 0.55, payout: 4000, healthLoss: 55, sanityLoss: 12,
      blurb: 'Sprint the backyard course strung with live wire and blades while the crowd bays.' },
    { id: 'chamber',   name: 'The Chamber',            win: 0.5, payout: 8000, healthLoss: 100, sanityLoss: 30, lethal: true,
      blurb: 'One loaded chamber. Pull the trigger on live TV. Win big — or die on air.' }
  ];

  function bumpViewers(delta) {
    var v = global.saveState.get('slices.livingHell.viewers', 12) + delta;
    global.saveState.set('slices.livingHell.viewers', Math.max(0, v));
  }
  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  function applyDamage(healthLoss, sanityLoss, cause) {
    if (global.DeathWatch) global.DeathWatch.setCause(cause);
    var stats = global.saveState.get('global');
    stats.health = Math.max(0, stats.health - healthLoss);
    stats.sanity = Math.max(0, stats.sanity - sanityLoss);
    global.saveState.set('global', stats);
    global.eventBus.publish('player.stats.updated', stats); // DeathWatch may fire here
  }

  // Runs the mechanic, returns an action string for the narrator to dramatize.
  function runChallenge(ch) {
    var win = Math.random() < ch.win;
    if (win) {
      global.LivingHellBridge.dispatch({ type: 'lh.payout', amount: ch.payout });
      global.LivingHellBridge.dispatch({ type: 'lh.clout', delta: 4 });
      bumpViewers(rand(40, 200));
      global.GameAudio.play('cash');
      return 'survive "' + ch.name + '" on live TV — blood-soaked and shaking, I watch $' + ch.payout.toLocaleString('en-US') + ' wipe off my Syndicate debt while the crowd screams my name';
    }
    // Failure hurts for real. It can be lethal.
    global.GameAudio.play('ui_error');
    bumpViewers(rand(-40, 120)); // a death spikes ratings
    global.LivingHellBridge.dispatch({ type: 'lh.clout', delta: 2 });
    applyDamage(ch.healthLoss, ch.sanityLoss, ch.name + ' on live TV');
    if (ch.lethal || global.saveState.get('global.health', 0) <= 0) {
      return 'lose "' + ch.name + '" on live television — the last thing I see is the red RECORDING light and the audience on its feet';
    }
    return 'fail "' + ch.name + '" and get carried off the set broken and bleeding as the ratings spike';
  }

  function actions() {
    var list = CHALLENGES.map(function(ch) {
      return {
        label: '<b>' + ch.name + '</b> <span class="sub">$' + ch.payout.toLocaleString('en-US') + '</span>',
        run: function() { return runChallenge(ch); }
      };
    });
    // Skill-based cage fight to the finish — losing badly can kill you.
    list.push({
      label: '<b>🥊 Cage Fight to the Finish</b> <span class="sub">$5,000</span>',
      run: function() {
        if (global.DeathWatch) global.DeathWatch.setCause('the house champion in the cage');
        global.ArcadeHooks.fight({
          enemyName: 'The Butcher', difficulty: 2.2, damage: 26,
          toDebt: 5000, rep: 12, healthLoss: 55, heatOnLoss: 0,
          winText: 'leave the house champion motionless on the cage floor — $5,000 wired straight off my debt as the crowd bays for more',
          loseText: 'go down under The Butcher\'s fists on live TV, the world going dark to the sound of the countdown'
        });
        return null;
      }
    });
    return list;
  }

  function mount(root) {
    var viewers = global.saveState.get('slices.livingHell.viewers', 12);
    global.Story.mount(root, {
      realm: 'living-hell',
      badge: '🔴 LIVE — LIVING HELL HOUSE',
      districtKey: 'livinghell',
      showTravel: false,
      opening: "The steel doors seal behind you with a sound like a coffin lid. This is the Tank — a fully wired smart-house where you live in the walls and " + viewers + " million paying viewers run the show. They control the lights, the heat, the doors; they pay to whisper in your ear and vote on your punishments. \"WELCOME TO HELL,\" the host says, and he isn't smiling. Survive their challenges and the grand prize wipes your Syndicate debt clean. Get voted out, or broken, or killed on camera — the chat doesn't care which, as long as it's good television.",
      openingChoices: ['Stare down the nearest camera', 'Size up which challenge you can survive', 'Play the chat for sympathy', 'Look for a blind spot the cameras miss'],
      openingScene: 'brutal blood-spattered reality TV death-game arena, harsh spotlights, roaring bloodthirsty crowd, dark and menacing',
      actions: actions(),
      exit: { label: '🚪 Try to slip out the eviction window (back to the city)', run: function() {
        global.LivingHellBridge.dispatch({ type: 'lh.exit' });
      } }
    });
  }

  function unmount() { if (global.Story && global.Story.unmount) global.Story.unmount(); }

  global.RealmRouter.register('living-hell', { mount: mount, unmount: unmount });
})(window);
