// /systems/arcade/game_fight.js - Timing brawler
// Enemy telegraphs a windup, then strikes. Block (hold) to chip it, Dodge to
// avoid it entirely, and Attack in the enemy's recovery window for big damage.
// Controls: A / Space = attack, S (hold) = block, D = dodge (+ touch buttons).
(function(global) {
  function factory(opts) {
    var diff = opts.difficulty || 1;
    var S = {
      pHP: 100, eHP: 100, stam: 100,
      phase: 'idle',      // idle | windup | strike | recover
      timer: 0.8,
      pInvuln: 0,         // dodge i-frames
      pAtkCd: 0,
      flash: 0, hitText: '', hitT: 0,
      over: false, win: false,
      enemyName: opts.enemyName || 'Bruiser',
      eDamage: (opts.damage || 16) * (0.85 + 0.3 * diff),
      windup: Math.max(0.45, 0.95 - 0.12 * diff),
      shake: 0
    };
    var apiRef = null;

    function flash(txt) { S.hitText = txt; S.hitT = 0.7; }

    function doAttack() {
      if (S.over || S.pAtkCd > 0 || S.stam < 15) return;
      S.stam -= 15; S.pAtkCd = 0.45;
      apiRef.sfx('ui_click');
      if (S.phase === 'recover') {
        S.eHP -= 24; S.shake = 0.25; flash('CRITICAL! -24'); apiRef.sfx('cash');
      } else if (S.phase === 'windup') {
        S.eHP -= 8; flash('-8'); // interrupt-ish
      } else {
        S.eHP -= 5; flash('-5');
      }
      if (S.eHP <= 0) endGame(true);
    }
    function doDodge() {
      if (S.over || S.stam < 20) return;
      S.stam -= 20; S.pInvuln = 0.45;
      apiRef.sfx('ui_click'); flash('dodge');
    }
    function isBlocking() { return !!(apiRef.keys.s || apiRef.keys.block || apiRef.keys.shift); }

    function resolveStrike() {
      if (S.pInvuln > 0) { flash('DODGED!'); return; }
      if (isBlocking()) {
        var chip = S.eDamage * 0.3;
        S.pHP -= chip; S.stam = Math.max(0, S.stam - 15);
        S.shake = 0.15; flash('blocked -' + Math.round(chip)); apiRef.sfx('ui_error');
      } else {
        S.pHP -= S.eDamage; S.shake = 0.35; flash('HIT! -' + Math.round(S.eDamage)); apiRef.sfx('ui_error');
      }
      if (S.pHP <= 0) endGame(false);
    }

    function endGame(win) {
      if (S.over) return;
      S.over = true; S.win = win;
      setTimeout(function() {
        apiRef.finish({ win: win, score: Math.max(0, Math.round(S.pHP)), enemyHP: Math.max(0, S.eHP) });
      }, 900);
    }

    return {
      start: function(api) {
        apiRef = api;
        api.setTitle('⚔️ FIGHT — ' + S.enemyName);
        api.setHint('<b>A</b>/tap ATK · hold <b>S</b>/BLOCK · <b>D</b>/DODGE — strike when they\'re open!');
        layoutButtons(api);
      },
      keydown: function(k) {
        if (k === 'a' || k === 'space') doAttack();
        else if (k === 'd') doDodge();
      },
      update: function(dt, api) {
        if (S.pAtkCd > 0) S.pAtkCd -= dt;
        if (S.pInvuln > 0) S.pInvuln -= dt;
        if (S.hitT > 0) S.hitT -= dt;
        if (S.shake > 0) S.shake -= dt;
        if (!isBlocking() && S.stam < 100) S.stam = Math.min(100, S.stam + dt * 22);

        if (S.over) return;
        S.timer -= dt;
        if (S.timer <= 0) {
          if (S.phase === 'idle') { S.phase = 'windup'; S.timer = S.windup; }
          else if (S.phase === 'windup') { S.phase = 'strike'; S.timer = 0.12; resolveStrike(); }
          else if (S.phase === 'strike') { S.phase = 'recover'; S.timer = 0.85; }
          else { S.phase = 'idle'; S.timer = 0.5 + Math.random() * 0.6; }
        }
      },
      draw: function(g, api) {
        var w = api.width, h = api.height;
        var sx = S.shake > 0 ? (Math.random() - 0.5) * 12 * S.shake : 0;
        g.save(); g.translate(sx, 0);

        // Background
        g.fillStyle = '#0a0e18'; g.fillRect(-20, 0, w + 40, h);
        g.strokeStyle = 'rgba(0,240,255,0.15)';
        for (var i = 0; i < w; i += 40) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); }

        var floorY = h - 120;
        // Player (left)
        drawFighter(g, w * 0.32, floorY, '#00f0ff', S.pInvuln > 0, isBlocking());
        // Enemy (right), color shifts on windup/strike
        var eColor = S.phase === 'windup' ? '#ffb800' : S.phase === 'strike' ? '#ff0055' : '#ff5577';
        drawFighter(g, w * 0.68, floorY, eColor, false, false, true);

        // Telegraph ring during windup
        if (S.phase === 'windup') {
          var p = 1 - (S.timer / S.windup);
          g.strokeStyle = '#ffb800'; g.lineWidth = 4;
          g.beginPath(); g.arc(w * 0.68, floorY - 40, 34 + p * 14, 0, Math.PI * 2 * p); g.stroke();
        }

        // HP bars
        bar(g, 20, 16, w * 0.4, 16, S.pHP / 100, '#00ff88', 'YOU');
        bar(g, w - 20 - w * 0.4, 16, w * 0.4, 16, S.eHP / 100, '#ff0055', S.enemyName, true);
        // Stamina
        bar(g, 20, 40, w * 0.4, 8, S.stam / 100, '#ffb800', '');

        // Hit text
        if (S.hitT > 0) {
          g.globalAlpha = Math.min(1, S.hitT * 2);
          g.fillStyle = '#fff'; g.font = 'bold 26px sans-serif'; g.textAlign = 'center';
          g.fillText(S.hitText, w / 2, h * 0.4);
          g.globalAlpha = 1;
        }
        if (S.over) {
          g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(-20, 0, w + 40, h);
          g.fillStyle = S.win ? '#00ff88' : '#ff0055';
          g.font = 'bold 40px sans-serif'; g.textAlign = 'center';
          g.fillText(S.win ? 'WINNER' : 'K.O.', w / 2, h / 2);
        }
        g.restore();

        function bar(gg, x, y, bw, bh, pct, col, label, rightAlign) {
          gg.fillStyle = '#0c0f16'; gg.fillRect(x, y, bw, bh);
          gg.fillStyle = col; gg.fillRect(x, y, bw * Math.max(0, pct), bh);
          gg.strokeStyle = 'rgba(255,255,255,0.2)'; gg.strokeRect(x, y, bw, bh);
          if (label) { gg.fillStyle = '#e6edf8'; gg.font = 'bold 11px sans-serif';
            gg.textAlign = rightAlign ? 'right' : 'left';
            gg.fillText(label, rightAlign ? x + bw : x, y - 3); }
        }
        function drawFighter(gg, x, y, color, invuln, blocking, flip) {
          gg.save(); gg.globalAlpha = invuln ? 0.4 : 1;
          gg.fillStyle = color;
          gg.beginPath(); gg.arc(x, y - 66, 16, 0, Math.PI * 2); gg.fill(); // head
          gg.fillRect(x - 12, y - 50, 24, 40); // torso
          gg.fillRect(x - 12, y - 10, 10, 24); gg.fillRect(x + 2, y - 10, 10, 24); // legs
          if (blocking) { gg.strokeStyle = '#00f0ff'; gg.lineWidth = 3;
            gg.beginPath(); gg.arc(x + (flip ? -22 : 22), y - 40, 20, -Math.PI/2, Math.PI/2); gg.stroke(); }
          gg.restore();
        }
      },
      stop: function() {}
    };

    function layoutButtons(api) {
      var w = api.width, h = api.height, bw = 92, bh = 54, y = h - bh - 12;
      api.addButton('DODGE', 12, y, bw, bh, null, doDodge);
      api.addButton('BLOCK', w / 2 - bw / 2, y, bw, bh, 'block', null);
      api.addButton('ATK', w - bw - 12, y, bw, bh, null, doAttack);
    }
  }

  if (global.Arcade) global.Arcade.register('fight', factory);
  global.ArcadeFight = factory;
})(window);
