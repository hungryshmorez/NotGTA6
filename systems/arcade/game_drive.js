// /systems/arcade/game_drive.js - Driving / police chase
// Vertical scroller: steer your car, dodge traffic and cop cruisers, grab cash.
// Survive to the goal time to win; too many crashes and you're busted.
// Controls: Arrow / A-D to steer, or drag / on-screen LEFT-RIGHT buttons.
(function(global) {
  function factory(opts) {
    var chase = opts.mode === 'chase';
    var S = {
      px: 0, py: 0, pw: 34, ph: 56,
      targetX: null,
      integrity: 100, cash: 0,
      scroll: 0, speed: 260,
      goalTime: opts.goalTime || 22, t: 0,
      obstacles: [], spawnCd: 0,
      over: false, win: false,
      flash: 0, msg: '', msgT: 0,
      diff: opts.difficulty || 1
    };
    var apiRef = null;

    function reset(api) {
      S.px = api.width / 2; S.py = api.height - 90;
    }

    function spawn(api) {
      var laneX = 40 + Math.random() * (api.width - 80);
      var r = Math.random();
      var type = r < (chase ? 0.4 : 0.22) ? 'cop' : (r < 0.75 ? 'car' : 'cash');
      S.obstacles.push({ x: laneX, y: -60, w: type === 'cash' ? 22 : 32, h: type === 'cash' ? 22 : 54, type: type, vy: 0 });
    }

    function hit(a) {
      return Math.abs(a.x - S.px) < (a.w + S.pw) / 2 - 6 &&
             Math.abs(a.y - S.py) < (a.h + S.ph) / 2 - 6;
    }

    function msg(m) { S.msg = m; S.msgT = 0.8; }

    function endGame(win, busted) {
      if (S.over) return;
      S.over = true; S.win = win;
      setTimeout(function() {
        apiRef.finish({ win: win, score: S.cash, busted: !!busted });
      }, 900);
    }

    return {
      start: function(api) {
        apiRef = api; reset(api);
        api.setTitle(chase ? '🚔 POLICE CHASE — lose them!' : '🏍️ COURIER RUN');
        api.setHint('Steer: <b>← →</b> / <b>A D</b> / drag · dodge cars & cops, grab <b>$</b>');
        var bw = 88, bh = 56, y = api.height - bh - 10;
        api.addButton('◀', 12, y, bw, bh, 'arrowleft', null);
        api.addButton('▶', api.width - bw - 12, y, bw, bh, 'arrowright', null);
      },
      pointer: function(x, y, down) { if (down) S.targetX = x; },
      update: function(dt, api) {
        if (S.over) return;
        S.t += dt;
        S.speed = 240 + S.t * 8 + S.diff * 30;
        S.scroll = (S.scroll + S.speed * dt) % 60;

        // Steering
        var steer = 320;
        if (api.keys.arrowleft || api.keys.a) S.px -= steer * dt;
        if (api.keys.arrowright || api.keys.d) S.px += steer * dt;
        if (S.targetX != null && !api.keys.arrowleft && !api.keys.arrowright) {
          S.px += (S.targetX - S.px) * Math.min(1, dt * 8);
        }
        S.px = Math.max(24, Math.min(api.width - 24, S.px));

        // Spawn
        S.spawnCd -= dt;
        if (S.spawnCd <= 0) { spawn(api); S.spawnCd = Math.max(0.35, 0.9 - S.t * 0.02 - S.diff * 0.1); }

        // Move obstacles
        for (var i = S.obstacles.length - 1; i >= 0; i--) {
          var o = S.obstacles[i];
          o.y += (S.speed + (o.type === 'cop' ? 40 : 0)) * dt;
          if (o.type === 'cop') o.x += Math.sign(S.px - o.x) * 40 * dt; // cops home in
          if (hit(o)) {
            if (o.type === 'cash') { S.cash += 25; msg('+$25'); apiRef.sfx('cash'); }
            else { S.integrity -= o.type === 'cop' ? 28 : 20; S.flash = 0.3; msg('CRASH!'); apiRef.sfx('ui_error');
                   if (S.integrity <= 0) { endGame(false, true); } }
            S.obstacles.splice(i, 1); continue;
          }
          if (o.y > api.height + 60) S.obstacles.splice(i, 1);
        }

        if (S.flash > 0) S.flash -= dt;
        if (S.msgT > 0) S.msgT -= dt;
        if (S.t >= S.goalTime) endGame(true, false);
      },
      draw: function(g, api) {
        var w = api.width, h = api.height;
        // Road
        g.fillStyle = '#0b0e17'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#141a28'; g.fillRect(w * 0.12, 0, w * 0.76, h);
        // Lane dashes
        g.strokeStyle = 'rgba(255,184,0,0.5)'; g.lineWidth = 4; g.setLineDash([26, 34]);
        for (var lx = w * 0.37; lx < w * 0.7; lx += w * 0.26) {
          g.beginPath(); g.moveTo(lx, -60 + S.scroll); g.lineTo(lx, h); g.stroke();
        }
        g.setLineDash([]);

        // Obstacles
        S.obstacles.forEach(function(o) {
          if (o.type === 'cash') { g.fillStyle = '#ffd23f'; g.font = 'bold 22px sans-serif'; g.textAlign = 'center'; g.fillText('$', o.x, o.y + 8); }
          else { g.fillStyle = o.type === 'cop' ? '#2b6bff' : '#8a93a6'; car(g, o.x, o.y, o.w, o.h);
                 if (o.type === 'cop') { g.fillStyle = Math.floor(S.t * 8) % 2 ? '#ff3355' : '#33aaff'; g.fillRect(o.x - 10, o.y - o.h/2, 20, 4); } }
        });

        // Player car
        g.save(); if (S.flash > 0) g.globalAlpha = Math.floor(S.t * 20) % 2 ? 0.4 : 1;
        g.fillStyle = '#00f0ff'; car(g, S.px, S.py, S.pw, S.ph); g.restore();

        // HUD
        g.fillStyle = '#0c0f16'; g.fillRect(12, 12, w * 0.4, 12);
        g.fillStyle = S.integrity > 40 ? '#00ff88' : '#ff0055'; g.fillRect(12, 12, w * 0.4 * (S.integrity / 100), 12);
        g.fillStyle = '#ffd23f'; g.font = 'bold 15px sans-serif'; g.textAlign = 'right';
        g.fillText('$' + S.cash, w - 14, 26);
        // Progress
        g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(12, 30, w - 24, 5);
        g.fillStyle = '#00f0ff'; g.fillRect(12, 30, (w - 24) * Math.min(1, S.t / S.goalTime), 5);

        if (S.msgT > 0) { g.globalAlpha = Math.min(1, S.msgT * 2); g.fillStyle = '#fff'; g.font = 'bold 22px sans-serif'; g.textAlign = 'center'; g.fillText(S.msg, w / 2, h * 0.3); g.globalAlpha = 1; }
        if (S.over) { g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(0, 0, w, h);
          g.fillStyle = S.win ? '#00ff88' : '#ff0055'; g.font = 'bold 34px sans-serif'; g.textAlign = 'center';
          g.fillText(S.win ? 'GOT AWAY!' : 'BUSTED', w / 2, h / 2); }

        function car(gg, x, y, cw, ch) {
          gg.save(); gg.translate(x, y);
          gg.fillRect(-cw/2, -ch/2, cw, ch);
          gg.fillStyle = 'rgba(0,0,0,0.4)'; gg.fillRect(-cw/2 + 4, -ch/2 + 8, cw - 8, 12);
          gg.restore();
        }
      },
      stop: function() {}
    };
  }

  if (global.Arcade) global.Arcade.register('drive', factory);
  global.ArcadeDrive = factory;
})(window);
