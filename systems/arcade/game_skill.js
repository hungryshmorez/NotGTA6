// /systems/arcade/game_skill.js - Quick skill challenges
// type: 'lockpick' (stop the needle in the zone, N pins), 'pickpocket'
// (one precise stop), 'hack' (repeat a flashed arrow sequence).
// Resolves { win, score }.
(function(global) {
  function needleGame(opts) {
    var pins = opts.pins || (opts.type === 'pickpocket' ? 1 : 3);
    var S = {
      pos: 0, dir: 1, speed: opts.speed || 1.15,
      zoneC: 0.5, zoneW: opts.zoneW || 0.22,
      pin: 0, done: 0, over: false, win: false, msg: '', msgT: 0
    };
    var apiRef = null;

    function newZone() {
      S.zoneW = Math.max(0.1, (opts.zoneW || 0.22) - S.pin * 0.03);
      S.zoneC = 0.2 + Math.random() * 0.6;
      S.speed = (opts.speed || 1.15) + S.pin * 0.2;
      S.pos = Math.random(); S.dir = Math.random() < 0.5 ? 1 : -1;
    }

    function lock() {
      if (S.over) return;
      var inZone = Math.abs(S.pos - S.zoneC) <= S.zoneW / 2;
      if (inZone) { S.done++; S.msg = 'PIN SET'; apiRef.sfx('ui_confirm'); }
      else { S.msg = 'SLIP!'; apiRef.sfx('ui_error'); }
      S.msgT = 0.6; S.pin++;
      if (S.pin >= pins) { end(); } else { newZone(); }
    }
    function end() {
      S.over = true; S.win = S.done >= Math.ceil(pins * 0.6);
      setTimeout(function() { apiRef.finish({ win: S.win, score: S.done }); }, 800);
    }

    return {
      start: function(api) {
        apiRef = api; newZone();
        api.setTitle(opts.title || (opts.type === 'pickpocket' ? '✋ PICKPOCKET' : '🔓 LOCKPICK'));
        api.setHint('Stop the needle in the <b>green zone</b> — <b>Space</b> / tap');
        api.addButton('STOP', api.width / 2 - 60, api.height - 74, 120, 58, null, lock);
      },
      keydown: function(k) { if (k === 'space' || k === 'a' || k === 'enter') lock(); },
      pointer: function(x, y, down) { /* button handles taps */ },
      update: function(dt) {
        if (S.over) return;
        S.pos += S.dir * S.speed * dt;
        if (S.pos > 1) { S.pos = 1; S.dir = -1; }
        if (S.pos < 0) { S.pos = 0; S.dir = 1; }
        if (S.msgT > 0) S.msgT -= dt;
      },
      draw: function(g, api) {
        var w = api.width, h = api.height, bx = w * 0.1, bw = w * 0.8, by = h * 0.45, bh = 40;
        g.fillStyle = '#0a0e18'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#141a28'; g.fillRect(bx, by, bw, bh);
        // zone
        g.fillStyle = 'rgba(0,255,136,0.5)';
        g.fillRect(bx + bw * (S.zoneC - S.zoneW / 2), by, bw * S.zoneW, bh);
        // needle
        g.fillStyle = '#00f0ff'; g.fillRect(bx + bw * S.pos - 2, by - 10, 4, bh + 20);
        // pins
        g.fillStyle = '#e6edf8'; g.font = 'bold 14px sans-serif'; g.textAlign = 'center';
        g.fillText('Pin ' + Math.min(S.pin + 1, pins) + ' / ' + pins + '   ·   set: ' + S.done, w / 2, by - 30);
        if (S.msgT > 0) { g.fillStyle = S.msg === 'PIN SET' ? '#00ff88' : '#ff0055';
          g.font = 'bold 24px sans-serif'; g.fillText(S.msg, w / 2, by + bh + 44); }
        if (S.over) { g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(0,0,w,h);
          g.fillStyle = S.win ? '#00ff88' : '#ff0055'; g.font = 'bold 30px sans-serif';
          g.fillText(S.win ? 'CRACKED!' : 'JAMMED', w / 2, h / 2); }
      },
      stop: function() {}
    };
  }

  function sequenceGame(opts) {
    var len = opts.len || 5;
    var seq = [];
    var arrows = ['up', 'down', 'left', 'right'];
    for (var i = 0; i < len; i++) seq.push(arrows[Math.floor(Math.random() * 4)]);
    var S = { phase: 'show', idx: 0, showT: 0, cur: 0, over: false, win: false, wrong: false, msgT: 0 };
    var apiRef = null;
    var glyph = { up: '▲', down: '▼', left: '◀', right: '▶' };

    function press(dir) {
      if (S.over || S.phase !== 'input') return;
      if (dir === seq[S.cur]) { S.cur++; apiRef.sfx('ui_click');
        if (S.cur >= seq.length) { S.over = true; S.win = true; done(); } }
      else { S.over = true; S.win = false; S.wrong = true; apiRef.sfx('ui_error'); done(); }
    }
    function done() { setTimeout(function() { apiRef.finish({ win: S.win, score: S.cur }); }, 700); }

    return {
      start: function(api) {
        apiRef = api;
        api.setTitle(opts.title || '💻 HACK — repeat the sequence');
        api.setHint('Watch, then repeat with <b>arrows</b> / on-screen pad');
        var b = 52, x = api.width / 2, y = api.height - b * 2 - 20;
        api.addButton('▲', x - b/2, y, b, b, null, function(){ press('up'); });
        api.addButton('◀', x - b/2 - b - 6, y + b + 6, b, b, null, function(){ press('left'); });
        api.addButton('▼', x - b/2, y + b + 6, b, b, null, function(){ press('down'); });
        api.addButton('▶', x - b/2 + b + 6, y + b + 6, b, b, null, function(){ press('right'); });
      },
      keydown: function(k) {
        if (k === 'arrowup') press('up'); else if (k === 'arrowdown') press('down');
        else if (k === 'arrowleft') press('left'); else if (k === 'arrowright') press('right');
      },
      update: function(dt) {
        if (S.phase === 'show') {
          S.showT += dt;
          if (S.showT > 0.6) { S.showT = 0; S.idx++; if (S.idx >= seq.length) { S.phase = 'input'; } }
        }
      },
      draw: function(g, api) {
        var w = api.width, h = api.height;
        g.fillStyle = '#0a0e18'; g.fillRect(0, 0, w, h);
        g.textAlign = 'center';
        if (S.phase === 'show') {
          g.fillStyle = '#00f0ff'; g.font = 'bold 60px sans-serif';
          g.fillText(glyph[seq[Math.min(S.idx, seq.length - 1)]], w / 2, h * 0.4);
          g.fillStyle = '#8896ab'; g.font = '14px sans-serif'; g.fillText('memorize…', w / 2, h * 0.4 + 40);
        } else {
          g.fillStyle = '#e6edf8'; g.font = '15px sans-serif'; g.fillText('Your turn:', w / 2, h * 0.22);
          var s = '';
          for (var i = 0; i < seq.length; i++) s += (i < S.cur ? glyph[seq[i]] : '•') + ' ';
          g.fillStyle = '#00ff88'; g.font = 'bold 30px sans-serif'; g.fillText(s, w / 2, h * 0.32);
        }
        if (S.over) { g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(0,0,w,h);
          g.fillStyle = S.win ? '#00ff88' : '#ff0055'; g.font = 'bold 30px sans-serif';
          g.fillText(S.win ? 'ACCESS GRANTED' : 'LOCKED OUT', w / 2, h / 2); }
      },
      stop: function() {}
    };
  }

  function factory(opts) {
    opts = opts || {};
    return opts.type === 'hack' ? sequenceGame(opts) : needleGame(opts);
  }

  if (global.Arcade) global.Arcade.register('skill', factory);
  global.ArcadeSkill = factory;
})(window);
