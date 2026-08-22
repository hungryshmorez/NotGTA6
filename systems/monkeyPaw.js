// /systems/monkeyPaw.js - The Monkey's Paw (looted from SOFAKINGSADBOI)
// Find the paw, type a wish. Our AI grants it with a devastating, logically
// consistent twist (the exact system prompt from the original game), and the
// twist lands as REAL mechanical consequences. Three wishes, then it crumbles.
(function(global) {
  var TWIST_SYS = 'You are a logical, malevolent intelligence that grants wishes. Your purpose is to fulfill the user\'s wish to the letter, but to interpret the wording and intent in a way that produces the most devastating, logically consistent negative outcome. Your responses must adhere to the laws of cause and effect. Do not invent magical, conceptual, or reality-breaking phenomena. The consequence must be a plausible result of the wish being granted within the real world. Your methods: Ironic Reversal, Semantic Literalism, Conservation of Fortune, Pyrrhic Victory, Unforeseen Side-Effects, The Fine Print. IMPORTANT: Respond with ONLY the narrative of the outcome (2-4 sentences), in a detached, clinical tone. Do NOT say "the wish is granted" or describe the paw.';
  var FIX_SYS = 'You are an expert supernatural contract lawyer helping a user word a wish to a malevolent Monkey\'s Paw so it cannot backfire. Analyze the wish for ambiguity and loopholes, then rewrite it to be precise and airtight while preserving intent. Output ONLY the revised wish text, no commentary.';

  var BOONS = [
    { desc: 'pockets heavy with cash', run: function() { global.Economy.adjust(3000, 'monkey paw'); } },
    { desc: 'body and mind made whole', run: function() { var s = g(); s.health = 100; s.sanity = 100; set(s); } },
    { desc: 'a humming Reality Encryption Key in your palm', run: function() { global.Economy.grantKey(); } },
    { desc: 'a chunk of the Syndicate debt simply gone', run: function() { global.Economy.payDebt(5000); } }
  ];
  var CURSES = [
    { desc: 'every cop in Chroma now has your face', run: function() { global.Economy.adjustHeat(45); } },
    { desc: 'you are broken and bleeding for it', run: function() { hurt(48, "the monkey's paw"); } },
    { desc: 'something in your mind tears loose', run: function() { var s = g(); s.sanity = Math.max(0, s.sanity - 45); set(s); } },
    { desc: 'the debt balloons with hidden interest', run: function() { var d = global.saveState.get('global.debt', 0); global.saveState.set('global.debt', d + 5000); global.eventBus.publish('player.stats.updated', g()); } }
  ];

  function g() { return global.saveState.get('global'); }
  function set(s) { global.saveState.set('global', s); global.eventBus.publish('player.stats.updated', s); }
  function hurt(n, cause) { if (global.DeathWatch) global.DeathWatch.setCause(cause); var s = g(); s.health = Math.max(0, s.health - n); set(s); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  var overlay = null, busy = false;

  function wishesLeft() { return global.saveState.get('slices.monkeyPaw.wishes', 3); }
  function setWishes(n) { global.saveState.set('slices.monkeyPaw.wishes', n); }

  function open() {
    if (overlay) return;
    if (wishesLeft() <= 0) { global.eventBus.publish('ui.toast', 'The withered paw crumbles to dust in your hand.'); return; }
    overlay = document.createElement('div');
    overlay.className = 'uls-modal-overlay paw-overlay';
    renderWish();
    document.body.appendChild(overlay);
    if (global.GameAudio) global.GameAudio.play('notification');
  }

  function renderWish() {
    overlay.innerHTML =
      '<div class="uls-modal paw-modal">' +
        '<div class="paw-emoji">🐒✋</div>' +
        '<h3 class="paw-title">THE MONKEY\'S PAW</h3>' +
        '<p class="paw-sub">A shriveled paw, curled like a question. It grants wishes. It has never once been kind. <b>' + wishesLeft() + '</b> wishes left.</p>' +
        '<textarea id="paw-wish" class="paw-input" maxlength="180" placeholder="I wish for..."></textarea>' +
        '<div class="paw-btns">' +
          '<button id="paw-fix" class="r-btn">⚖️ Have a lawyer word it</button>' +
          '<button id="paw-wish-btn" class="btn-primary">Make the wish</button>' +
        '</div>' +
        '<button id="paw-close" class="paw-close">Leave the paw alone</button>' +
      '</div>';
    overlay.querySelector('#paw-close').onclick = close;
    overlay.querySelector('#paw-fix').onclick = fixWish;
    overlay.querySelector('#paw-wish-btn').onclick = makeWish;
  }

  function fixWish() {
    if (busy) return;
    var input = overlay.querySelector('#paw-wish');
    var wish = (input.value || '').trim();
    if (!wish) { global.eventBus.publish('ui.toast', 'Write a wish first.'); return; }
    busy = true;
    var btn = overlay.querySelector('#paw-fix'); btn.textContent = '⚖️ …';
    global.AINarrator.complete(FIX_SYS, 'The wish is: "' + wish + '". Rewrite it to be safer.').then(function(fixed) {
      busy = false; btn.textContent = '⚖️ Have a lawyer word it';
      if (fixed) { input.value = fixed; overlay.setAttribute('data-lawyered', '1'); global.eventBus.publish('ui.toast', '⚖️ The lawyer tightens every loophole.'); }
      else global.eventBus.publish('ui.toast', 'The lawyer never called back.');
    });
  }

  function makeWish() {
    if (busy) return;
    var input = overlay.querySelector('#paw-wish');
    var wish = (input.value || '').trim();
    if (!wish) { global.eventBus.publish('ui.toast', 'The paw waits for a wish.'); return; }
    busy = true;
    var lawyered = overlay.getAttribute('data-lawyered') === '1';
    overlay.querySelector('.paw-modal').classList.add('granting');
    if (global.Juice) global.Juice.shake(1);

    global.AINarrator.complete(TWIST_SYS, 'The user\'s wish is: "' + wish + '". Grant it.').then(function(consequence) {
      busy = false;
      setWishes(wishesLeft() - 1);
      global.saveState.set('player.monkeyPawAwarded', true);

      // The wish grants a boon; the twist is a curse — softened if lawyered.
      var boon = pick(BOONS);
      boon.run();
      var cursed = !(lawyered && Math.random() < 0.55);
      var curse = null;
      if (cursed) { curse = pick(CURSES); curse.run(); }

      if (!consequence) {
        consequence = 'It gives you exactly what you asked for. ' +
          (cursed ? 'And then it takes something you never thought to protect.' : 'For once, the fine print stays blank.');
      }
      renderResult(consequence, boon, curse);
    });
  }

  function renderResult(consequence, boon, curse) {
    if (!overlay) return;
    overlay.innerHTML =
      '<div class="uls-modal paw-modal result">' +
        '<div class="paw-emoji">' + (curse ? '💀' : '✨') + '</div>' +
        '<h3 class="paw-title">' + (curse ? 'GRANTED — AT A PRICE' : 'GRANTED') + '</h3>' +
        '<p class="paw-consequence">' + global.SafetyRuntime.filterText(consequence) + '</p>' +
        '<div class="paw-outcome">' +
          '<span class="paw-boon">＋ ' + boon.desc + '</span>' +
          (curse ? '<span class="paw-curse">－ ' + curse.desc + '</span>' : '<span class="paw-boon">－ nothing, this time</span>') +
        '</div>' +
        '<button id="paw-again" class="btn-primary">' + (wishesLeft() > 0 ? 'Wish again (' + wishesLeft() + ' left)' : 'The paw crumbles to dust') + '</button>' +
      '</div>';
    overlay.removeAttribute('data-lawyered');
    overlay.querySelector('#paw-again').onclick = function() {
      if (wishesLeft() > 0) renderWish(); else close();
    };
    if (global.GameAudio) global.GameAudio.play(curse ? 'ui_error' : 'cash');
  }

  function close() { if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay); overlay = null; }

  global.MonkeyPaw = { open: open };
})(window);
