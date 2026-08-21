// /bridge/backroomsBridge.js - Glitch Noclip Algorithm & Safe Origin Bridge
(function(global) {
  var TARGET_STORYLINE_PROB = 0.25;
  var AVG_TURNS = 20;
  var BASE_PER_TURN = 1 - Math.pow(1 - TARGET_STORYLINE_PROB, 1 / AVG_TURNS); // ~1.4%

  global.BackroomsBridge = {
    evaluateNoclip: function(actionText) {
      var glitched = global.saveState.get('slices.backrooms.glitchedOnce', false);
      if (glitched || global.RealmRouter.getActiveRealm() === 'backrooms') return;

      var turns = global.saveState.get('slices.backrooms.turnsElapsed', 0) + 1;
      global.saveState.set('slices.backrooms.turnsElapsed', turns);

      var p = BASE_PER_TURN * (1 + Math.min(0.5, turns / 40));
      var txt = String(actionText || '').toLowerCase();
      var cues = ['dark', 'hall', 'stair', 'elevator', 'warehouse', 'basement', 'noclip', 'flee', 'panic'];
      for (var i = 0; i < cues.length; i++) {
        if (txt.indexOf(cues[i]) !== -1) { p += 0.012; break; }
      }
      p = Math.min(0.04, p); // 4% clamp

      if (Math.random() < p) {
        global.saveState.set('slices.backrooms.glitchedOnce', true);
        global.eventBus.publish('ui.toast', '⚠️ REALITY GLITCH: The architecture tears open...');
        global.GameAudio.play('glitch');
        setTimeout(function() {
          global.RealmRouter.go('backrooms');
        }, 1200);
      }
    }
  };
})(window);
