// /systems/juice.js - Game feel: floating combat text, screen shake, bursts
// Diffs player stats on every update and reacts with punchy feedback so every
// action LANDS instead of just changing a number. No call sites to touch — it
// watches the same player.stats.updated everything already publishes.
(function(global) {
  var last = null;
  var layer = null;

  function ensureLayer() {
    if (layer) return layer;
    layer = document.createElement('div');
    layer.id = 'juice-layer';
    document.body.appendChild(layer);
    return layer;
  }

  // Floating text that rises and fades near the top-center of the screen.
  function popup(text, kind, big) {
    var l = ensureLayer();
    var el = document.createElement('div');
    el.className = 'juice-pop ' + (kind || '') + (big ? ' big' : '');
    el.textContent = text;
    var jitter = (Math.random() * 60 - 30);
    el.style.setProperty('--jx', jitter + 'px');
    l.appendChild(el);
    setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el); }, 1300);
  }

  function shake(intensity) {
    var vp = document.getElementById('app-viewport');
    if (!vp) return;
    vp.classList.remove('shake-sm', 'shake-lg');
    void vp.offsetWidth; // restart animation
    vp.classList.add(intensity >= 2 ? 'shake-lg' : 'shake-sm');
    setTimeout(function() { vp.classList.remove('shake-sm', 'shake-lg'); }, 500);
  }

  function burst(emoji, n) {
    var l = ensureLayer();
    for (var i = 0; i < (n || 8); i++) {
      var p = document.createElement('div');
      p.className = 'juice-particle';
      p.textContent = emoji;
      var ang = Math.random() * Math.PI * 2;
      var dist = 60 + Math.random() * 120;
      p.style.setProperty('--tx', Math.cos(ang) * dist + 'px');
      p.style.setProperty('--ty', (Math.sin(ang) * dist - 40) + 'px');
      p.style.setProperty('--rot', (Math.random() * 360) + 'deg');
      l.appendChild(p);
      (function(node){ setTimeout(function(){ if (node.parentNode) node.parentNode.removeChild(node); }, 900); })(p);
    }
  }

  function flashMeter(cls, good) {
    var bar = document.getElementById('bar-' + cls);
    if (!bar) return;
    var wrap = bar.parentNode;
    wrap.classList.remove('flash-good', 'flash-bad');
    void wrap.offsetWidth;
    wrap.classList.add(good ? 'flash-good' : 'flash-bad');
    setTimeout(function() { wrap.classList.remove('flash-good', 'flash-bad'); }, 500);
  }

  function react(stats) {
    if (!stats) return;
    if (!last) { last = snapshot(stats); return; }
    var s = snapshot(stats);

    var dMoney = s.money - last.money;
    if (dMoney > 0) { popup('+$' + dMoney.toLocaleString('en-US'), 'cash'); burst('💵', Math.min(12, 4 + Math.floor(dMoney / 40))); if (global.GameAudio) global.GameAudio.play('cash'); }
    else if (dMoney < 0) { popup('-$' + Math.abs(dMoney).toLocaleString('en-US'), 'spend'); }

    var dDebt = s.debt - last.debt;
    if (dDebt < 0) { popup('DEBT -$' + Math.abs(dDebt).toLocaleString('en-US'), 'debt', true); }

    var dHealth = s.health - last.health;
    if (dHealth < 0) { popup(dHealth + ' ❤', 'dmg', dHealth <= -15); flashMeter('hp', false); if (dHealth <= -12) shake(dHealth <= -30 ? 2 : 1); }
    else if (dHealth > 0) { flashMeter('hp', true); }

    var dSan = s.sanity - last.sanity;
    if (dSan < -3) { popup(dSan + ' 🧠', 'san'); flashMeter('san', false); }
    else if (dSan > 3) { flashMeter('san', true); }

    var dHeat = s.heat - last.heat;
    if (dHeat >= 8) { popup('+ HEAT 🔥', 'heat', dHeat >= 25); if (dHeat >= 25) shake(1); }
    else if (dHeat <= -20) { popup('HEAT ↓', 'cool'); }

    if (s.keys > last.keys) { popup('🔑 KEY ' + s.keys + '/4', 'key', true); burst('✨', 12); }

    last = s;
  }

  function snapshot(st) {
    return { money: st.money||0, debt: st.debt!=null?st.debt:50000, health: st.health||0,
             sanity: st.sanity||0, heat: st.heat||0, keys: st.keysCollected||0 };
  }

  global.Juice = {
    init: function() {
      last = snapshot(global.saveState.get('global') || {}); // seed baseline so the first change already pops
      global.eventBus.subscribe('player.stats.updated', react);
      global.eventBus.subscribe('state.reset', function() { last = snapshot(global.saveState.get('global') || {}); });
      // Explicit one-off effects anyone can trigger.
      global.eventBus.subscribe('juice.popup', function(d) { if (d) popup(d.text, d.kind, d.big); });
      global.eventBus.subscribe('juice.shake', function(d) { shake((d && d.intensity) || 1); });
    },
    popup: popup, shake: shake, burst: burst
  };
})(window);
