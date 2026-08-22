// /systems/arcade/game_move.js - Walk-around district navigation
// Top-down explorable plaza: move your avatar (WASD / arrows / drag / on-screen
// pad) and step onto a hotspot, then ENTER to trigger it. Resolves
// { win:true, hotspot } so the caller can open the shop, drive a gig, etc.
(function(global) {
  function factory(opts) {
    var S = {
      px: 0, py: 0, r: 12, speed: 190,
      spots: [], near: null, over: false,
      joyO: null, joyV: { x: 0, y: 0 }
    };
    var apiRef = null;

    function layout(api) {
      var w = api.width, h = api.height;
      S.px = w / 2; S.py = h / 2;
      S.spots = [
        { id: 'shop',   label: '🏪 Shop',    x: w * 0.2,  y: h * 0.28, col: '#ffb800' },
        { id: 'gig',    label: '🏍️ Gigs',    x: w * 0.8,  y: h * 0.28, col: '#00f0ff' },
        { id: 'fixer',  label: '🕵️ Fixer',   x: w * 0.2,  y: h * 0.72, col: '#ff5577' },
        { id: 'tv',     label: '📺 Studio',  x: w * 0.8,  y: h * 0.72, col: '#ff0055' },
        { id: 'bed',    label: '🛏️ Home',    x: w * 0.5,  y: h * 0.16, col: '#9a7bff' },
        { id: 'leave',  label: '🚪 Streets', x: w * 0.5,  y: h * 0.86, col: '#8896ab' }
      ];
    }

    function nearest() {
      var best = null, bd = 52;
      S.spots.forEach(function(s) {
        var d = Math.hypot(s.x - S.px, s.y - S.py);
        if (d < bd) { bd = d; best = s; }
      });
      return best;
    }

    function enter() {
      if (S.over) return;
      var n = S.near;
      if (!n) return;
      S.over = true;
      apiRef.sfx('ui_confirm');
      setTimeout(function() { apiRef.finish({ win: true, hotspot: n.id }); }, 200);
    }

    return {
      start: function(api) {
        apiRef = api; layout(api);
        api.setTitle('🚶 EXPLORE — walk up to a spot and ENTER');
        api.setHint('Move: <b>WASD</b>/<b>arrows</b>/drag · <b>E</b>/ENTER to interact');
        var b = 48, y = api.height - b * 3 - 16, x = 16;
        api.addButton('▲', x + b, y, b, b, 'w', null);
        api.addButton('◀', x, y + b, b, b, 'a', null);
        api.addButton('▼', x + b, y + b, b, b, 's', null);
        api.addButton('▶', x + b * 2, y + b, b, b, 'd', null);
        api.addButton('ENTER', api.width - 108, api.height - b - 16, 92, b, null, enter);
      },
      keydown: function(k) { if (k === 'e' || k === 'space') enter(); },
      pointer: function(x, y, down) {
        if (down) { S.joyO = { x: x, y: y }; }
        else { S.joyO = null; S.joyV = { x: 0, y: 0 }; }
      },
      update: function(dt, api) {
        if (S.over) return;
        var vx = 0, vy = 0;
        if (api.keys.a || api.keys.arrowleft) vx -= 1;
        if (api.keys.d || api.keys.arrowright) vx += 1;
        if (api.keys.w || api.keys.arrowup) vy -= 1;
        if (api.keys.s || api.keys.arrowdown) vy += 1;
        // Drag joystick (only when dragging away from the on-screen pad area)
        if (S.joyO && api.pointer.down) {
          var dx = api.pointer.x - S.joyO.x, dy = api.pointer.y - S.joyO.y;
          var m = Math.hypot(dx, dy);
          if (m > 8) { vx += dx / m; vy += dy / m; }
        }
        var mag = Math.hypot(vx, vy);
        if (mag > 0) { vx /= mag; vy /= mag;
          S.px += vx * S.speed * dt; S.py += vy * S.speed * dt; }
        S.px = Math.max(S.r, Math.min(api.width - S.r, S.px));
        S.py = Math.max(S.r + 30, Math.min(api.height - S.r, S.py));
        S.near = nearest();
      },
      draw: function(g, api) {
        var w = api.width, h = api.height;
        g.fillStyle = '#0c1120'; g.fillRect(0, 0, w, h);
        // Tiled floor
        g.strokeStyle = 'rgba(0,240,255,0.08)';
        for (var x = 0; x < w; x += 48) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
        for (var y = 0; y < h; y += 48) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }

        // Hotspots
        S.spots.forEach(function(s) {
          var isNear = S.near === s;
          g.fillStyle = s.col; g.globalAlpha = isNear ? 1 : 0.8;
          g.beginPath(); g.arc(s.x, s.y, isNear ? 20 : 16, 0, Math.PI * 2); g.fill();
          g.globalAlpha = 1;
          g.fillStyle = isNear ? '#fff' : '#c9d4e6'; g.font = (isNear ? 'bold ' : '') + '13px sans-serif';
          g.textAlign = 'center'; g.fillText(s.label, s.x, s.y - 26);
          if (isNear) { g.strokeStyle = '#fff'; g.lineWidth = 2;
            g.beginPath(); g.arc(s.x, s.y, 26, 0, Math.PI * 2); g.stroke(); }
        });

        // Player
        g.fillStyle = '#00f0ff';
        g.beginPath(); g.arc(S.px, S.py, S.r, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#031018'; g.beginPath(); g.arc(S.px, S.py - 3, 4, 0, Math.PI * 2); g.fill();

        if (S.near) { g.fillStyle = '#00f0ff'; g.font = 'bold 14px sans-serif'; g.textAlign = 'center';
          g.fillText('▶ ENTER: ' + S.near.label, w / 2, 22); }
      },
      stop: function() {}
    };
  }

  if (global.Arcade) global.Arcade.register('move', factory);
  global.ArcadeMove = factory;
})(window);
