// /realms/livingHell.js - Living Hell (Fish Tank) reality-TV realm — AI narrated
// The narrator plays the show's Director/GM; challenge buttons apply the real
// payout mechanic (winnings wired to debt, failure costs sanity), then the
// outcome is narrated through the Story loop with a fresh scene image.
(function(global) {
  // Themed to "Living Hell House" — the 24/7 reality-house spin-off: lie
  // detectors at breakfast, 3 AM confrontations, cameras in every room.
  var CHALLENGES = [
    { id: 'polygraph', name: 'Lie Detector Breakfast', win: 0.6, payout: 1500, sanityLoss: 20 },
    { id: 'confront',  name: '3 AM Confrontation',     win: 0.55, payout: 1800, sanityLoss: 24 },
    { id: 'foam',      name: 'Backyard Slime Gauntlet', win: 0.7, payout: 900,  sanityLoss: 12 },
    { id: 'confess',   name: 'Diary Room Confessional', win: 0.8, payout: 600,  sanityLoss: 8 }
  ];

  function bumpViewers(delta) {
    var v = global.saveState.get('slices.livingHell.viewers', 12) + delta;
    global.saveState.set('slices.livingHell.viewers', Math.max(0, v));
  }
  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  // Runs the mechanic, returns an action string for the narrator to dramatize.
  function runChallenge(ch) {
    var win = Math.random() < ch.win;
    if (win) {
      global.LivingHellBridge.dispatch({ type: 'lh.payout', amount: ch.payout });
      global.LivingHellBridge.dispatch({ type: 'lh.clout', delta: 3 });
      bumpViewers(rand(20, 120));
      return 'go on live TV and SURVIVE "' + ch.name + '" — the crowd goes wild as $' + ch.payout + ' wires to my Syndicate debt';
    }
    global.LivingHellBridge.dispatch({ type: 'lh.sanity', delta: -ch.sanityLoss });
    global.LivingHellBridge.dispatch({ type: 'lh.clout', delta: 1 });
    bumpViewers(rand(-40, 30));
    return 'attempt "' + ch.name + '" on live TV and FAIL humiliatingly, losing my nerve as the audience jeers';
  }

  function actions() {
    var list = CHALLENGES.map(function(ch) {
      return {
        label: '<b>' + ch.name + '</b> <span class="sub">$' + ch.payout.toLocaleString('en-US') + '</span>',
        run: function() { return runChallenge(ch); }
      };
    });
    // A skill-based cage brawl: win it live for a big payout straight to debt.
    list.push({
      label: '<b>🥊 Cage Brawl</b> <span class="sub">$2,500</span>',
      run: function() {
        global.ArcadeHooks.fight({
          enemyName: 'The Champion', difficulty: 1.8, damage: 18,
          toDebt: 2500, rep: 10, healthLoss: 30, heatOnLoss: 0,
          winText: 'batter the house champion live on air — $2,500 wired straight off my debt as the crowd loses it',
          loseText: 'get knocked out cold in the cage on live TV, humiliated'
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
      opening: "\"WELCOME TO HELL!\" Phil's voice booms over the house PA as the doors seal behind you. Twenty-four hours a day, cameras in every room, " + viewers + " viewers and climbing. Producer Jenna purrs in your earpiece: survive a challenge on live TV and the winnings wipe straight off your Syndicate debt. Rock Hard and Hugh Jass — the world's worst security — pretend to guard the exits. Fail, and the audience feasts on what's left of your mind.",
      openingChoices: ['Play to the cameras', 'Start drama with a housemate', 'Sweet-talk Jenna the producer', 'Scope the house for a blind spot'],
      openingScene: 'garish reality TV game show stage, blinding lights, live studio audience, cyberpunk',
      actions: actions(),
      exit: { label: '🚪 Slip out the eviction window (back to the city)', run: function() {
        global.LivingHellBridge.dispatch({ type: 'lh.exit' });
      } }
    });
  }

  function unmount() { if (global.Story && global.Story.unmount) global.Story.unmount(); }

  global.RealmRouter.register('living-hell', { mount: mount, unmount: unmount });
})(window);
