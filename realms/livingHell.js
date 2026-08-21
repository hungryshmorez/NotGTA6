// /realms/livingHell.js - Living Hell (Fish Tank) reality-TV realm
// High-risk, high-yield televised challenges. Payouts route straight to the
// Syndicate debt via the Living Hell bridge. Failure costs sanity.
(function(global) {
  var CHALLENGES = [
    { id: 'noodle', name: 'The Spicy Noodle Gauntlet', win: 0.6, payout: 1500, sanityLoss: 20,
      blurb: 'Devour the ghost-pepper bowl with no milk while chat screams.' },
    { id: 'booth', name: 'Soundproof Isolation Booth', win: 0.5, payout: 3000, sanityLoss: 30,
      blurb: '12 hours in a pitch-black sensory-deprivation cube.' },
    { id: 'foam', name: 'Foam & Slime Gauntlet', win: 0.7, payout: 900, sanityLoss: 12,
      blurb: 'Sprint the backyard obstacle course live on air.' },
    { id: 'confess', name: 'Diary Room Confession', win: 0.8, payout: 600, sanityLoss: 8,
      blurb: 'Bare a dark secret to the Director for viewer clout.' }
  ];

  var el = null;

  function mount(root) {
    var viewers = global.saveState.get('slices.livingHell.viewers', 12);
    var clout = global.saveState.get('slices.livingHell.clout', 5);

    el = document.createElement('div');
    el.className = 'scene-card realm-livinghell';
    el.innerHTML =
      '<div class="scene-media-wrapper">' +
        '<div class="scene-img realm-bg-livinghell"></div>' +
        '<div class="scene-overlay-badge">🔴 LIVE — THE FISH TANK</div>' +
      '</div>' +
      '<div class="scene-content">' +
        '<h2>Living Hell</h2>' +
        '<p>The studio lights blaze. <b id="lh-viewers">' + viewers + '</b> viewers are watching, ' +
          'clout <b id="lh-clout">' + clout + '</b>. Survive a challenge, wire the payout straight ' +
          'to your Syndicate debt. Fail, and the audience feasts on your sanity.</p>' +
        '<div id="lh-challenges" class="decision-grid"></div>' +
        '<button class="fixer-btn" id="lh-exit">🚪 Slip out the eviction window (back to the city)</button>' +
      '</div>';
    root.innerHTML = '';
    root.appendChild(el);

    var mount2 = el.querySelector('#lh-challenges');
    CHALLENGES.forEach(function(ch) {
      var btn = document.createElement('button');
      btn.innerHTML = '<b>' + ch.name + '</b><br><span class="sub">' + ch.blurb +
        ' — $' + ch.payout.toLocaleString('en-US') + '</span>';
      btn.onclick = function() { runChallenge(ch); };
      mount2.appendChild(btn);
    });

    el.querySelector('#lh-exit').onclick = function() {
      global.LivingHellBridge.dispatch({ type: 'lh.exit' });
    };
  }

  function runChallenge(ch) {
    global.eventBus.publish('dialogue.start');
    var win = Math.random() < ch.win;
    if (win) {
      global.LivingHellBridge.dispatch({ type: 'lh.payout', amount: ch.payout });
      global.LivingHellBridge.dispatch({ type: 'lh.clout', delta: 3 });
      bumpViewers(rand(20, 120));
      global.eventBus.publish('ui.toast', '🏆 ' + ch.name + ' — SURVIVED! $' + ch.payout.toLocaleString('en-US') + ' to your debt.');
    } else {
      global.LivingHellBridge.dispatch({ type: 'lh.sanity', delta: -ch.sanityLoss });
      global.LivingHellBridge.dispatch({ type: 'lh.clout', delta: 1 });
      bumpViewers(rand(-40, 30));
      global.eventBus.publish('ui.toast', '💥 ' + ch.name + ' — humiliation on live TV. −' + ch.sanityLoss + ' sanity.');
    }
    setTimeout(function() { global.eventBus.publish('dialogue.end'); }, 600);
    refreshHeader();
  }

  function bumpViewers(delta) {
    var v = global.saveState.get('slices.livingHell.viewers', 12) + delta;
    global.saveState.set('slices.livingHell.viewers', Math.max(0, v));
  }

  function refreshHeader() {
    if (!el) return;
    var v = el.querySelector('#lh-viewers');
    var c = el.querySelector('#lh-clout');
    if (v) v.textContent = global.saveState.get('slices.livingHell.viewers', 12);
    if (c) c.textContent = global.saveState.get('slices.livingHell.clout', 5);
  }

  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  function unmount() { el = null; }

  global.RealmRouter.register('living-hell', { mount: mount, unmount: unmount });
})(window);
