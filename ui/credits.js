// /ui/credits.js - Dynamic Contributor & Tool Roll Overlay + Victory Screen
(function(global) {
  var overlay = null;

  function show(title, subtitle) {
    if (overlay) close();
    overlay = document.createElement('div');
    overlay.className = 'uls-modal-overlay victory-overlay';
    overlay.innerHTML =
      '<div class="uls-modal victory-modal">' +
        '<h2 class="victory-title">' + title + '</h2>' +
        '<p class="victory-sub">' + subtitle + '</p>' +
        '<div class="credits-roll">' +
          '<p>URBAN LIFE SIMULATOR</p>' +
          '<p>Multi-Realm Universe</p>' +
          '<p>— ULS City Hub · Living Hell · Dreamworld · The Backrooms —</p>' +
          '<p>Event-driven narrative simulation engine</p>' +
        '</div>' +
        '<button id="victory-restart" class="btn-primary">New Game +</button>' +
      '</div>';
    document.body.appendChild(overlay);
    overlay.querySelector('#victory-restart').onclick = function() {
      global.saveState.reset();
      close();
      window.location.reload();
    };
  }

  function close() {
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    overlay = null;
  }

  global.eventBus.subscribe('game.victory.debt_cleared', function() {
    show('DEBT CLEARED', 'The Chroma Syndicate is paid in full. You are free — for now.');
  });
  global.eventBus.subscribe('game.victory.escape', function() {
    show('REALITY UNLOCKED', 'Four keys turn at once. You noclip permanently out of the simulation.');
  });

  global.UICredits = { show: show, close: close };
})(window);
