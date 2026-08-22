// /ui/devHarness.js - Floating dev/test harness (looted concept from the
// canonical ULS's ?dev=1 panel). Opens with ?dev=1 in the URL or Ctrl+Shift+D.
// Lets you jump realms, launch every mini-game, and set stats — ideal for
// demoing the whole game fast without grinding through it.
(function(global) {
  var panel = null;

  function b(label, fn) { return { label: label, fn: fn }; }

  function stats() { return global.saveState.get('global'); }
  function setStat(k, v) {
    var s = stats(); s[k] = v; global.saveState.set('global', s);
    global.eventBus.publish('player.stats.updated', s);
  }

  function groups() {
    return [
      { title: 'Realms', btns: [
        b('🏙️ City',        function(){ go('uls'); }),
        b('📺 Living Hell',  function(){ go('living-hell'); }),
        b('💤 Dreamworld',   function(){ go('dreamworld'); }),
        b('🟨 Backrooms',    function(){ go('backrooms'); })
      ]},
      { title: 'Mini-games', btns: [
        b('🥊 Fight',   function(){ global.ArcadeHooks.fight({ enemyName: 'Dev Dummy' }); }),
        b('🏍️ Courier', function(){ global.ArcadeHooks.drive({ mode: 'gig', reward: 80 }); }),
        b('🚔 Chase',   function(){ global.ArcadeHooks.drive({ mode: 'chase' }); }),
        b('🚶 Walk',    function(){ global.ArcadeHooks.explore(); }),
        b('🔓 Lockpick',function(){ global.ArcadeHooks.skill({ type: 'lockpick', pins: 3, reward: 60 }); }),
        b('💻 Hack',    function(){ global.ArcadeHooks.skill({ type: 'hack', len: 5, reward: 100 }); })
      ]},
      { title: 'Stats', btns: [
        b('+$500',       function(){ global.Economy.adjust(500, 'dev'); }),
        b('+Heat',       function(){ global.Economy.adjustHeat(30); }),
        b('-Heat',       function(){ global.Economy.adjustHeat(-100); }),
        b('Full Heal',   function(){ var s=stats(); s.health=100; s.sanity=100; s.water=100; s.hunger=100; global.saveState.set('global',s); global.eventBus.publish('player.stats.updated', s); }),
        b('☠️ Kill',     function(){ if(global.DeathWatch) global.DeathWatch.setCause('the dev harness'); setStat('health', 0); }),
        b('+Key',        function(){ global.Economy.grantKey(); }),
        b('Pay $2k debt',function(){ global.eventBus.publish('debt.payment.made', 2000); global.Economy.adjust(2000,'dev'); global.eventBus.publish('debt.payment.made', 2000); })
      ]},
      { title: 'Flags', btns: [
        b('🎲 Random Event', function(){ if (global.CityEvents) global.CityEvents.fire(); }),
        b('🐒 Monkey Paw', function(){ if (global.MonkeyPaw) global.MonkeyPaw.open(); }),
        b('✅ Skip Tutorial', function(){ global.saveState.set('player.tutorialComplete', true); document.body.classList.remove('tutorial-active'); go('uls'); }),
        b('🔊 Test SFX',      function(){ global.GameAudio.play('ui_click'); }),
        b('📻 Radio Ad',      function(){ if(global.RadioAds) global.RadioAds.play(); }),
        b('♻️ Reset Save',    function(){ global.saveState.reset(); location.reload(); })
      ]}
    ];
  }

  function go(realm) {
    document.body.classList.remove('tutorial-active');
    if (global.RealmRouter.isRegistered(realm)) global.RealmRouter.go(realm);
  }

  function build() {
    panel = document.createElement('div');
    panel.id = 'dev-harness';
    var html = '<div class="dev-head"><b>DEV HARNESS</b><button id="dev-close">✕</button></div>';
    groups().forEach(function(g) {
      html += '<div class="dev-group"><span class="dev-title">' + g.title + '</span><div class="dev-btns"></div></div>';
    });
    panel.innerHTML = html;
    document.body.appendChild(panel);
    panel.querySelector('#dev-close').onclick = toggle;

    var mounts = panel.querySelectorAll('.dev-btns');
    groups().forEach(function(g, i) {
      g.btns.forEach(function(btn) {
        var el = document.createElement('button');
        el.className = 'dev-btn';
        el.textContent = btn.label;
        el.onclick = btn.fn;
        mounts[i].appendChild(el);
      });
    });
  }

  function toggle() {
    if (panel) { panel.parentNode.removeChild(panel); panel = null; }
    else build();
  }

  global.DevHarness = {
    init: function() {
      window.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) { e.preventDefault(); toggle(); }
      });
      try { if (/[?&]dev=1/.test(location.search)) setTimeout(build, 400); } catch (e) {}
    },
    toggle: toggle
  };
})(window);
