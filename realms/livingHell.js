// /realms/livingHell.js - Living Hell (Fish Tank) reality-TV realm — AI narrated
// The narrator plays the show's Director/GM; challenge buttons apply the real
// payout mechanic (winnings wired to debt, failure costs sanity), then the
// outcome is narrated through the Story loop with a fresh scene image.
(function(global) {
  var CHALLENGES = [
    { id: 'noodle', name: 'The Spicy Noodle Gauntlet', win: 0.6, payout: 1500, sanityLoss: 20 },
    { id: 'booth',  name: 'Soundproof Isolation Booth', win: 0.5, payout: 3000, sanityLoss: 30 },
    { id: 'foam',   name: 'Foam & Slime Gauntlet',      win: 0.7, payout: 900,  sanityLoss: 12 },
    { id: 'confess',name: 'Diary Room Confession',      win: 0.8, payout: 600,  sanityLoss: 8 }
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
    return CHALLENGES.map(function(ch) {
      return {
        label: '<b>' + ch.name + '</b> <span class="sub">$' + ch.payout.toLocaleString('en-US') + '</span>',
        run: function() { return runChallenge(ch); }
      };
    });
  }

  function mount(root) {
    var viewers = global.saveState.get('slices.livingHell.viewers', 12);
    global.Story.mount(root, {
      realm: 'living-hell',
      badge: '🔴 LIVE — THE FISH TANK',
      districtKey: 'livinghell',
      showTravel: false,
      opening: "The studio lights slam on. " + viewers + " viewers and climbing, all of them hungry to watch you bleed for cash. The Director's voice purrs in your earpiece: pick a challenge, survive it, and the winnings wipe straight off your debt. Fail, and the audience feasts on what's left of your mind.",
      openingChoices: ['Play to the camera', 'Talk trash to the crowd', 'Scan the studio for an angle', 'Stall for time'],
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
