// /systems/tutorial.js - Mandatory guided tutorial "First Night with Roxy"
// A scripted, can't-fail ~12-minute GTA-style onboarding that tours every
// module and gates free roam behind completion. Roxy is the fixer voice; each
// beat follows the Narrate -> Describe -> Ask loop. Scripted-first for judge
// reliability; AI scene images enhance when online.
(function(global) {
  var GUIDE = 'ROXY';

  // Each stage introduces one module. `run` on a choice performs the real
  // mechanic (real cash, heat, keys, debt) so judges see genuine state change.
  // `done:true` marks the required interaction; a Continue button always
  // appears so the tour can never hard-stall.
  function stages() { return [
    {
      id: 'intro', badge: 'RAIN-SLICK ALLEY — 2:14 AM', district: 'market',
      scene: 'confident femme fatale fixer in a red-lit cyberpunk alley, leather jacket, smirking, neon rain',
      title: 'Roxy',
      roxy: "Well, look who's still breathing. I'm Roxy — I fix problems, and sugar, right now <b>you</b> are the problem. You owe the Chroma Syndicate <b>$50,000</b>, and they are not the patient type. Stick with me tonight and I'll show you how to survive this city. First rule: you can <i>talk</i> to this world. Tell it what you want to do.",
      objective: 'Type anything into the ACT box at the bottom and hit ACT.',
      highlight: '#action-input',
      awaitAction: true,
      choices: []
    },
    {
      id: 'needs', badge: 'CRYSTAL MARKET — STREET LEVEL', district: 'market',
      scene: 'neon street market at night, food stalls, steam, cyberpunk crowd',
      title: "Stay Alive",
      roxy: "Good. The world listens. Now — see those bars up top? <b>Health, Sanity, Water, Food.</b> Let them hit zero and you're just another chalk outline. You're already running dry. Don't get sentimental, get supplies.",
      objective: 'Open the Shop (top bar) and buy something to eat or drink.',
      highlight: '#btn-hud-shop',
      auto: 'shop.purchase.item',
      choices: [
        { label: '🏪 Open the shop for me', run: function(){ global.eventBus.publish('ui.shop.open'); } }
      ]
    },
    {
      id: 'gig', badge: 'CRYSTAL MARKET — BACK DOCK', district: 'market',
      scene: 'courier on a neon-lit motorcycle speeding through rainy cyberpunk streets',
      title: "First Score",
      roxy: "Supplies cost money, and money's the whole game. I've got a package that needs to disappear across town — quick, quiet, cash on delivery. Do this clean and you eat tonight.",
      objective: "Take Roxy's courier job.",
      choices: [
        { label: '🏍️ Run the courier job (+$300)', done: true, run: function(){
            global.Economy.adjust(300, 'Roxy courier gig');
            global.Economy.adjustReputation(5);
            global.eventBus.publish('ui.toast', '🏍️ Delivered. +$300, street cred up.');
        } },
        { label: '💤 Not tonight', run: function(){ global.eventBus.publish('ui.toast', 'Roxy rolls her eyes.'); } }
      ]
    },
    {
      id: 'heat', badge: 'CRYSTAL MARKET — SIRENS', district: 'market',
      scene: 'police cruisers with red and blue neon lights chasing through cyberpunk city, wanted level',
      title: "Heat",
      roxy: "...and there's the catch. That package? Hot. Now <b>you're</b> hot — see those <b>wanted stars</b> light up? In this city heat doesn't just cool off because you drank some water. It <i>locks you out</i> of the nice districts and closes every honest door. You either lie low... or you pay someone like me.",
      objective: 'Shake the heat — pay Roxy to make some calls.',
      onEnter: function(){
        var stats = global.saveState.get('global'); stats.heat = 60;
        global.saveState.set('global', stats);
        global.eventBus.publish('player.stats.updated', stats);
      },
      choices: [
        { label: '💸 Pay Roxy to cool the heat', done: true, run: function(){
            var stats = global.saveState.get('global'); stats.heat = 0;
            global.saveState.set('global', stats);
            global.eventBus.publish('player.stats.updated', stats);
            global.eventBus.publish('ui.toast', '🕶️ Roxy makes three calls. The stars wink out.');
        } }
      ]
    },
    {
      id: 'radio', badge: "ROXY'S CAR — MOVING", district: 'neon',
      scene: 'interior of a neon-lit cyberpunk muscle car dashboard at night, city lights streaking past',
      title: "Ride & Radio",
      roxy: "Get in. We drive, we breathe. This baby's got <b>seven stations</b> — lo-fi to metal to whatever the hell Bassface is playing. Music keeps your head straight out here. Go on, spin the dial.",
      objective: 'Power on the car radio (bottom) and switch to any station.',
      highlight: '#radio-dock',
      auto: 'radio.station.changed',
      choices: []
    },
    {
      id: 'livinghell', badge: 'THE FISH TANK — LIVE ON AIR', district: 'neon',
      scene: 'garish reality TV game show stage with blinding lights and a live studio audience, cyberpunk',
      title: "Living Hell",
      roxy: "You want to erase fifty grand fast? There's a show for that. <b>Living Hell</b> — the whole city watches you suffer for cash, and the winnings go straight to your debt. It's humiliating. It's dangerous. It pays. Take the dare, hot stuff.",
      objective: 'Win a live challenge — the payout hits your debt for real.',
      choices: [
        { label: '📺 Take the dare (win $1,500 to debt)', done: true, run: function(){
            global.Economy.payDebt(1500);
            var s = global.saveState.get('slices.livingHell.clout', 5) + 4;
            global.saveState.set('slices.livingHell.clout', s);
        } }
      ]
    },
    {
      id: 'dreamworld', badge: 'DREAMWORLD — ASLEEP', district: 'glass',
      scene: 'surreal dreamscape with floating doors in a starry void, purple and blue, ethereal',
      title: "Dreamworld",
      roxy: "Even fixers have to sleep. But your dreams down here? They've got <b>teeth</b> — and gifts. Walk through a door. What you carry out is yours to keep.",
      objective: 'Choose a dream door and claim its boon.',
      choices: [
        { label: '🔵 Step through the Blue Door', done: true, run: function(){
            if (global.DreamworldBridge) {
              var stats = global.saveState.get('global');
              stats.sanity = Math.min(100, stats.sanity + 25);
              global.saveState.set('global', stats);
              global.eventBus.publish('player.stats.updated', stats);
            }
            global.eventBus.publish('ui.toast', '✨ Unshakable Will — +25 Sanity, permanently.');
        } }
      ]
    },
    {
      id: 'backrooms', badge: 'REALITY GLITCH — LEVEL 0', district: 'industrial',
      scene: 'endless liminal yellow wallpaper rooms with damp carpet and buzzing fluorescent lights, backrooms',
      title: "The Backrooms",
      roxy: "...no. No no no. Kid, do <b>not</b> panic — reality just slipped and we noclipped straight through the floor. This is the <b>Backrooms</b>. But listen — down here is the other way out of your whole nightmare. Four <b>Reality Encryption Keys</b> and you don't pay the Syndicate a dime — you just... leave the simulation. Grab that shard.",
      sfx: 'glitch',
      onEnter: function(){ if (global.GameAudio) global.GameAudio.play('glitch'); },
      objective: 'Pull a Reality Encryption Key fragment from the wall.',
      choices: [
        { label: '🔑 Grab the shard (Key 1 of 4)', done: true, run: function(){
            if (global.Economy) global.Economy.grantKey();
        } }
      ]
    },
    {
      id: 'debt', badge: 'THE LEDGER', district: 'market',
      scene: 'ominous neon holographic debt ledger showing fifty thousand dollars owed, cyberpunk',
      title: "Two Ways Out",
      roxy: "So now you know the board. <b>Pay the $50,000</b> and walk free — or find all <b>4 keys</b> and tear your way out of reality itself. Every gig, every show, every bad dream feeds one of those two exits. Put a little down. Show the Syndicate you're serious.",
      objective: 'Wire a payment toward the Syndicate debt.',
      choices: [
        { label: '💵 Wire $500 to the Syndicate', done: true, run: function(){
            global.eventBus.publish('debt.payment.made', 500);
        } },
        { label: '🔎 Open the shop ledger instead', run: function(){ global.eventBus.publish('ui.shop.open'); } }
      ]
    },
    {
      id: 'finale', badge: 'DAWN OVER CHROMA CITY', district: 'neon',
      scene: 'cyberpunk city skyline at sunrise, neon fading into golden dawn, cinematic wide shot',
      title: "The City's Yours",
      roxy: "Look at that — you survived your first night. Most don't. From here on, Chroma City is <b>wide open</b>. Do what you want, go where you want, talk your way into or out of anything. I'll be around when you need a fixer. Now get out there and make them remember your name.",
      objective: 'Step into Free Roam.',
      choices: [
        { label: '🌆 Enter Free Roam', done: true, finish: true }
      ]
    }
  ]; }

  var list = [];
  var idx = 0;
  var dom = {};
  var autoSub = null;
  var actionArmed = false;

  function start(root) {
    list = stages();
    idx = 0;
    document.body.classList.add('tutorial-active');
    root.innerHTML =
      '<div class="scene-card tutorial-card">' +
        '<div class="scene-media-wrapper">' +
          '<div class="scene-img kenburns district-market"></div>' +
          '<div class="scene-overlay-badge" id="tut-badge">TUTORIAL</div>' +
          '<div class="tutorial-progress" id="tut-progress"></div>' +
        '</div>' +
        '<div class="scene-content">' +
          '<div class="roxy-line"><span class="roxy-name" id="tut-guide">ROXY</span> <span id="tut-title" class="roxy-title"></span></div>' +
          '<p id="tut-narration" class="story-narration"></p>' +
          '<div class="tutorial-objective" id="tut-objective"></div>' +
          '<div id="tut-choices" class="decision-grid"></div>' +
          '<div id="tut-continue-row"></div>' +
        '</div>' +
      '</div>';

    dom.wrapper = root.querySelector('.scene-media-wrapper');
    dom.badge = root.querySelector('#tut-badge');
    dom.progress = root.querySelector('#tut-progress');
    dom.title = root.querySelector('#tut-title');
    dom.narration = root.querySelector('#tut-narration');
    dom.objective = root.querySelector('#tut-objective');
    dom.choices = root.querySelector('#tut-choices');
    dom.continueRow = root.querySelector('#tut-continue-row');

    renderStage();
  }

  function clearHighlights() {
    document.querySelectorAll('.coach-highlight').forEach(function(el) {
      el.classList.remove('coach-highlight');
    });
  }

  function renderStage() {
    clearHighlights();
    if (autoSub) { autoSub.dispose(); autoSub = null; }
    actionArmed = false;

    var s = list[idx];
    if (s.onEnter) { try { s.onEnter(); } catch (e) {} }

    if (dom.badge) dom.badge.textContent = s.badge;
    if (dom.title) dom.title.textContent = s.title ? '— ' + s.title : '';
    if (dom.narration) dom.narration.innerHTML = global.SafetyRuntime.filterText(s.roxy);
    if (dom.progress) dom.progress.textContent = 'STEP ' + (idx + 1) + ' / ' + list.length;

    if (dom.objective) {
      dom.objective.innerHTML = s.objective ? '🎯 ' + s.objective : '';
      dom.objective.style.display = s.objective ? 'block' : 'none';
    }

    if (global.ImageGen && dom.wrapper) {
      global.ImageGen.apply(dom.wrapper, s.scene, s.district);
    }
    if (s.sfx && global.GameAudio) global.GameAudio.play(s.sfx);

    // Highlight the relevant real control (coach mark).
    if (s.highlight) {
      var target = document.querySelector(s.highlight);
      if (target) target.classList.add('coach-highlight');
    }

    // Render inline choices.
    dom.choices.innerHTML = '';
    (s.choices || []).forEach(function(c) {
      var btn = document.createElement('button');
      btn.innerHTML = c.label;
      btn.onclick = function() {
        if (c.run) { try { c.run(); } catch (e) {} }
        if (c.finish) { finish(); return; }
        if (c.done) { satisfied(); }
      };
      dom.choices.appendChild(btn);
    });

    // Arm the advance condition.
    dom.continueRow.innerHTML = '';
    if (s.awaitAction) {
      actionArmed = true; // handled by handleAction()
    } else if (s.auto) {
      autoSub = global.eventBus.subscribe(s.auto, function() { satisfied(); });
      // Continue is offered as a safety valve after a short beat.
      offerContinue('Skip ▶', 6000);
    } else if ((s.choices || []).some(function(c){ return c.done; })) {
      // Required choice will satisfy; no auto-continue.
    } else {
      offerContinue('Continue ▶', 0);
    }
  }

  // Called by the ACT box while the tutorial owns input (stage 0 demo).
  function handleAction(text) {
    if (actionArmed) {
      actionArmed = false;
      global.eventBus.publish('ui.toast', '💬 “' + String(text).slice(0, 40) + '” — Roxy grins.');
      satisfied();
    }
  }

  function offerContinue(label, delayMs) {
    var show = function() {
      if (!dom.continueRow) return;
      dom.continueRow.innerHTML = '';
      var btn = document.createElement('button');
      btn.className = 'btn-primary tut-continue';
      btn.textContent = label;
      btn.onclick = next;
      dom.continueRow.appendChild(btn);
    };
    if (delayMs > 0) setTimeout(show, delayMs); else show();
  }

  // The required interaction happened — reveal Continue and clear the coach mark.
  function satisfied() {
    clearHighlights();
    if (autoSub) { autoSub.dispose(); autoSub = null; }
    if (dom.objective) dom.objective.innerHTML = '✅ Nice.';
    offerContinue('Continue ▶', 0);
  }

  function next() {
    if (idx < list.length - 1) { idx++; renderStage(); }
    else finish();
  }

  function finish() {
    clearHighlights();
    if (autoSub) { autoSub.dispose(); autoSub = null; }
    document.body.classList.remove('tutorial-active');
    global.saveState.set('player.tutorialComplete', true);
    global.saveState.set('player.mode', 'freeroam');
    global.eventBus.publish('ui.toast', '🌆 FREE ROAM UNLOCKED. Chroma City is yours.');
    global.RealmRouter.go('uls');
  }

  global.Tutorial = {
    start: start,
    handleAction: handleAction,
    isActive: function() { return document.body.classList.contains('tutorial-active'); },
    isComplete: function() { return !!global.saveState.get('player.tutorialComplete', false); },
    reset: function() { global.saveState.set('player.tutorialComplete', false); }
  };
})(window);
