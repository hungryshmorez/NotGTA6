// /systems/events.js - Random street encounters (the fun engine)
// While you're out in the city, the world jumps you: muggings, hustles, cops,
// the Syndicate collector, street races. Most funnel into a mini-game or a real
// risk/reward gamble, so the loop stops being "read a paragraph, press a button".
(function(global) {
  var eventOpen = false;
  var turnsSince = 0;

  function money() { return global.saveState.get('global.money', 0); }
  function toast(t) { global.eventBus.publish('ui.toast', t); }
  function narrate(t) { if (global.Story && global.Story.isMounted()) global.Story.turn(t); else toast(t); }
  function loseHealth(n, cause) {
    if (global.DeathWatch) global.DeathWatch.setCause(cause || 'the streets');
    var s = global.saveState.get('global'); s.health = Math.max(0, s.health - n);
    global.saveState.set('global', s); global.eventBus.publish('player.stats.updated', s);
  }

  // Each event: { weight, when()?, build() -> {emoji,title,text,choices:[{label,run}]} }
  var EVENTS = [
    { weight: 3, build: function() { return {
      emoji: '🔪', title: 'MUGGED',
      text: 'Two guys peel off a wall and box you into the alley, blades out. "Wallet. Now."',
      choices: [
        { label: '🥊 Fight them off', run: function() {
            global.ArcadeHooks.fight({ enemyName: 'Alley Muggers', difficulty: 1.2, damage: 16,
              reward: 90, rep: 6, healthLoss: 28, heatOnLoss: 0,
              winText: 'drop both muggers and lift their roll', loseText: 'get worked over and robbed in the alley' }); } },
        { label: '💸 Hand over your cash', run: function() {
            var take = Math.floor(money() * 0.35); if (take > 0) global.Economy.adjust(-take, 'mugged');
            narrate('hand over $' + take + ' and back away slow, heart hammering'); } },
        { label: '🏃 Bolt', run: function() {
            if (Math.random() < 0.55) narrate('sprint out of the alley, lungs burning, but you keep your cash');
            else { loseHealth(15, 'alley muggers'); var t = Math.floor(money() * 0.2); global.Economy.adjust(-t, 'mugged'); narrate('trip as they catch you — a boot to the ribs and -$' + t); } } }
      ]}; } },

    { weight: 3, build: function() { var cash = 60 + Math.floor(Math.random() * 180); return {
      emoji: '💼', title: 'DROPPED WALLET',
      text: 'A fat wallet sits in the gutter, cards spilling out. No owner in sight. The street cam might be watching.',
      choices: [
        { label: '💰 Pocket it ($' + cash + ')', run: function() { global.Economy.adjust(cash, 'found wallet'); global.Economy.adjustHeat(6); narrate('scoop the wallet and melt into the crowd, $' + cash + ' richer'); } },
        { label: '🫡 Turn it in', run: function() { global.Economy.adjustReputation(8); narrate('hand the wallet to a beat cop — the street respects that'); } }
      ]}; } },

    { weight: 3, build: function() { return {
      emoji: '🎲', title: 'FOLLOW THE QUEEN',
      text: 'A hustler snaps three cards on a crate. "Double your money, friend. Just find the queen. Hundred to play."',
      choices: [
        { label: '🃏 Play ($100 stake)', run: function() {
            if (money() < 100) { toast('Not enough cash to play.'); return; }
            global.Economy.adjust(-100, 'shell game');
            global.Arcade.play('skill', { type: 'pickpocket', title: 'FOLLOW THE QUEEN' }).then(function(res) {
              if (res.win) { global.Economy.adjust(300, 'shell game win'); narrate('slap the middle card — the QUEEN. Doubled up, net +$200'); }
              else narrate('flip the card... nothing. The queen was never on the table'); }); } },
        { label: '🚶 Walk away', run: function() {} }
      ]}; } },

    { weight: 2, when: function() { return global.saveState.get('global.heat', 0) >= 10; }, build: function() { return {
      emoji: '🚔', title: 'COP STOP',
      text: 'A cruiser rolls up, spotlight blinding you against the wall. "Hands where I can see \'em."',
      choices: [
        { label: '💵 Bribe ($150)', run: function() { if (money() < 150) { toast('No cash to bribe.'); return; } global.Economy.adjust(-150, 'bribe'); global.Economy.adjustHeat(-30); narrate('fold $150 into a handshake — the cruiser rolls on'); } },
        { label: '🚗 Peel out', run: function() { global.ArcadeHooks.drive({ mode: 'chase', difficulty: 1.3 }); } },
        { label: '🧊 Play it cool', run: function() { if (Math.random() < 0.5) { global.Economy.adjustHeat(-10); narrate('keep your mouth shut and your story straight — they wave you off'); } else { global.Economy.adjustHeat(12); narrate('one wrong word and you\'re on the hood getting searched'); } } }
      ]}; } },

    { weight: 2, when: function() { return global.saveState.get('global.debt', 0) > 0 && global.saveState.get('global.day', 1) >= 2; }, build: function() { return {
      emoji: '💀', title: 'SYNDICATE COLLECTOR',
      text: 'A black car eases to the curb. A Chroma enforcer gets out, cracking his knuckles. "Boss wants a good-faith payment. $500. Today."',
      choices: [
        { label: '💵 Pay $500', run: function() { global.eventBus.publish('debt.payment.made', 500); narrate('peel off $500 for the enforcer — the debt ticks down and he nods'); } },
        { label: '🥊 Tell him to get lost', run: function() {
            global.ArcadeHooks.fight({ enemyName: 'Syndicate Enforcer', difficulty: 1.9, damage: 24,
              rep: 12, healthLoss: 45, heatOnLoss: 0,
              winText: 'leave the enforcer in the gutter — word travels, and the Syndicate backs off tonight', loseText: 'the enforcer breaks you across the hood as a message' }).then(function(res) { if (!res.win) global.Economy.adjustHeat(20); }); } }
      ]}; } },

    { weight: 2, build: function() { return {
      emoji: '🏁', title: 'STREET RACE',
      text: 'A tuned-up ghost of a car pulls level, engine snarling. The driver grins. "Race for pinks. Three hundred says you can\'t keep up."',
      choices: [
        { label: '🏎️ Race for $300', run: function() { global.ArcadeHooks.drive({ mode: 'gig', reward: 300, goalTime: 16, difficulty: 1.4 }); } },
        { label: '🚶 Not tonight', run: function() {} }
      ]}; } },

    { weight: 2, build: function() { return {
      emoji: '🌌', title: 'REALITY FLICKER',
      text: 'The streetlights stutter. For a heartbeat the wall isn\'t there — just endless yellow hallway humming behind it. Then it\'s back. Mostly.',
      choices: [
        { label: '👁️ Touch the wall', run: function() { var s = global.saveState.get('global'); s.sanity = Math.max(0, s.sanity - 8); global.saveState.set('global', s); global.eventBus.publish('player.stats.updated', s); if (Math.random() < 0.5 && global.RealmRouter.isRegistered('backrooms')) { global.saveState.set('slices.backrooms.glitchedOnce', true); global.eventBus.publish('ui.toast', '⚠️ The wall gives way...'); setTimeout(function(){ global.RealmRouter.go('backrooms'); }, 900); } else narrate('press your palm to the cold wall — it\'s solid again, but your skin crawls'); } },
        { label: '🙈 Look away fast', run: function() { narrate('you look away and keep walking. Some doors you don\'t open'); } }
      ]}; } }
  ];

  function pick() {
    var pool = EVENTS.filter(function(e) { return !e.when || e.when(); });
    var total = 0, i; for (i = 0; i < pool.length; i++) total += pool[i].weight;
    var r = Math.random() * total;
    for (i = 0; i < pool.length; i++) { r -= pool[i].weight; if (r <= 0) return pool[i]; }
    return pool[0];
  }

  function show(ev) {
    eventOpen = true;
    var overlay = document.createElement('div');
    overlay.className = 'encounter-overlay';
    var choicesHtml = ev.choices.map(function(c, i) {
      return '<button class="enc-choice" data-i="' + i + '">' + c.label + '</button>';
    }).join('');
    overlay.innerHTML =
      '<div class="encounter-card">' +
        '<div class="enc-emoji">' + ev.emoji + '</div>' +
        '<div class="enc-title">' + ev.title + '</div>' +
        '<p class="enc-text">' + global.SafetyRuntime.filterText(ev.text) + '</p>' +
        '<div class="enc-choices">' + choicesHtml + '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    if (global.Juice) global.Juice.shake(1);

    overlay.querySelectorAll('.enc-choice').forEach(function(btn) {
      btn.onclick = function() {
        var idx = parseInt(btn.getAttribute('data-i'), 10);
        close(overlay);
        try { ev.choices[idx].run(); } catch (e) { console.error('[Events]', e); }
      };
    });
  }

  function close(overlay) {
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    eventOpen = false;
  }

  function maybeFire() {
    if (eventOpen) return;
    if (global.Arcade && global.Arcade.isOpen()) return;
    if (global.Tutorial && global.Tutorial.isActive()) return;
    if (!global.RealmRouter || global.RealmRouter.getActiveRealm() !== 'uls') return;
    turnsSince++;
    var chance = turnsSince >= 5 ? 1 : 0.42;      // guarantees one at least every 5 turns
    if (turnsSince < 2 || Math.random() > chance) return;
    turnsSince = 0;
    var ev = pick().build();
    show(ev);
  }

  global.CityEvents = {
    init: function() { global.eventBus.subscribe('player.action.submitted', maybeFire); },
    fire: function() { if (!eventOpen) show(pick().build()); } // dev/testing
  };
})(window);
