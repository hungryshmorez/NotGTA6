// /systems/arcade/arcadeEngine.js - Real-time mini-game harness
// A full-screen canvas overlay that pauses the narrated loop, runs a playable
// game (keyboard + touch/pointer), and resolves a Promise<{win,score,...}> that
// callers turn into economy/stat consequences. Games register a factory and
// implement start/update/draw plus optional input hooks; they call api.finish().
(function(global) {
  var games = {};
  var overlay = null, canvas = null, ctx = null;
  var current = null, api = null;
  var rafId = null, lastT = 0;
  var resolveFn = null;
  var keys = {};
  var pointer = { x: 0, y: 0, down: false };
  var buttons = []; // on-screen touch buttons: {label,x,y,w,h,onpress,held,key}

  function buildOverlay() {
    overlay = document.createElement('div');
    overlay.id = 'arcade-overlay';
    overlay.innerHTML =
      '<div class="arcade-frame">' +
        '<div class="arcade-topbar">' +
          '<span class="arcade-title" id="arcade-title">MINI-GAME</span>' +
          '<span class="arcade-status" id="arcade-status"></span>' +
          '<button class="arcade-forfeit" id="arcade-forfeit">Forfeit ✕</button>' +
        '</div>' +
        '<canvas id="arcade-canvas"></canvas>' +
        '<div class="arcade-hint" id="arcade-hint"></div>' +
      '</div>';
    document.body.appendChild(overlay);
    canvas = overlay.querySelector('#arcade-canvas');
    ctx = canvas.getContext('2d');
    overlay.querySelector('#arcade-forfeit').onclick = function() {
      finish({ win: false, forfeit: true, score: 0 });
    };
    resize();
    window.addEventListener('resize', resize);
    bindInput();
  }

  function resize() {
    if (!canvas) return;
    var frame = overlay.querySelector('.arcade-frame');
    var w = Math.min(frame.clientWidth, 900);
    var h = Math.min(frame.clientHeight - 80, 560);
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (api) { api.width = w; api.height = h; }
  }

  function bindInput() {
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }
  function unbindInput() {
    window.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('keyup', onKeyUp, true);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('resize', resize);
  }

  function onKeyDown(e) {
    if (!overlay) return;
    var k = normKey(e.key);
    keys[k] = true;
    if (['arrowup','arrowdown','arrowleft','arrowright',' '].indexOf(e.key.toLowerCase && e.key.toLowerCase()) !== -1 || k === 'space') {
      e.preventDefault();
    }
    if (current && current.keydown) { try { current.keydown(k, api); } catch (er) {} }
  }
  function onKeyUp(e) {
    var k = normKey(e.key);
    keys[k] = false;
    if (current && current.keyup) { try { current.keyup(k, api); } catch (er) {} }
  }
  function normKey(k) {
    if (k === ' ') return 'space';
    return String(k).toLowerCase();
  }

  function canvasPos(e) {
    var r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function onPointerDown(e) {
    var p = canvasPos(e); pointer.x = p.x; pointer.y = p.y; pointer.down = true;
    var b = hitButton(p.x, p.y);
    if (b) { b.held = true; if (b.key) keys[b.key] = true; if (b.onpress) b.onpress(api); }
    if (current && current.pointer) { try { current.pointer(p.x, p.y, true, api); } catch (er) {} }
  }
  function onPointerMove(e) {
    if (!canvas) return;
    var p = canvasPos(e); pointer.x = p.x; pointer.y = p.y;
  }
  function onPointerUp(e) {
    pointer.down = false;
    buttons.forEach(function(b) { if (b.held) { b.held = false; if (b.key) keys[b.key] = false; } });
    if (current && current.pointer) { var p = canvasPos(e); try { current.pointer(p.x, p.y, false, api); } catch (er) {} }
  }
  function hitButton(x, y) {
    for (var i = 0; i < buttons.length; i++) {
      var b = buttons[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
    }
    return null;
  }

  function drawButtons() {
    buttons.forEach(function(b) {
      ctx.save();
      ctx.globalAlpha = b.held ? 0.9 : 0.55;
      ctx.fillStyle = '#0b1020';
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      roundRect(ctx, b.x, b.y, b.w, b.h, 8); ctx.fill(); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#e6edf8';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2);
      ctx.restore();
    });
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function loop(t) {
    if (!current) return;
    var dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
    lastT = t;
    try {
      if (current.update) current.update(dt, api);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (current.draw) current.draw(ctx, api);
      drawButtons();
    } catch (e) {
      console.error('[Arcade] game error', e);
      finish({ win: false, error: true, score: 0 });
      return;
    }
    rafId = requestAnimationFrame(loop);
  }

  function makeApi() {
    return {
      width: 0, height: 0,
      keys: keys,
      pointer: pointer,
      setTitle: function(t) { var el = overlay.querySelector('#arcade-title'); if (el) el.textContent = t; },
      setStatus: function(s) { var el = overlay.querySelector('#arcade-status'); if (el) el.textContent = s; },
      setHint: function(h) { var el = overlay.querySelector('#arcade-hint'); if (el) el.innerHTML = h; },
      // Register an on-screen touch button (also mappable to a virtual key).
      addButton: function(label, x, y, w, h, key, onpress) {
        buttons.push({ label: label, x: x, y: y, w: w, h: h, key: key || null, onpress: onpress || null, held: false });
      },
      clearButtons: function() { buttons = []; },
      sfx: function(id) { if (global.GameAudio) global.GameAudio.play(id); },
      finish: function(result) { finish(result); },
      roundRect: roundRect
    };
  }

  function finish(result) {
    if (!overlay) return;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    if (current && current.stop) { try { current.stop(); } catch (e) {} }
    unbindInput();
    var r = resolveFn;
    overlay.classList.add('closing');
    var ov = overlay;
    setTimeout(function() { if (ov && ov.parentNode) ov.parentNode.removeChild(ov); }, 250);
    overlay = null; canvas = null; ctx = null; current = null; api = null;
    buttons = []; keys = {};
    global.eventBus.publish('arcade.closed', result || { win: false });
    resolveFn = null;
    if (r) r(result || { win: false, score: 0 });
  }

  global.Arcade = {
    register: function(id, factory) { games[id] = factory; },
    isOpen: function() { return !!overlay; },

    // Open the overlay and run game `id`. Resolves with the game's result.
    play: function(id, opts) {
      if (overlay) return Promise.resolve({ win: false, busy: true });
      var factory = games[id];
      if (!factory) return Promise.resolve({ win: false, missing: true });
      return new Promise(function(resolve) {
        resolveFn = resolve;
        buildOverlay();
        current = factory(opts || {});
        api = makeApi();
        resize();
        if (current.start) { try { current.start(api, opts || {}); } catch (e) { console.error('[Arcade] start error', e); } }
        lastT = performance.now();
        rafId = requestAnimationFrame(loop);
        global.eventBus.publish('arcade.opened', { id: id });
      });
    }
  };
})(window);
