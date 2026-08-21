// /systems/audio.js - Multi-Bus Audio Pipeline with Safe Autoplay Unlocking
(function(global) {
  var soundRegistry = {};
  var activeLoops = {};
  var audioUnlocked = false;
  var masterVolume = 0.8;
  var isDucked = false;

  function handleFirstGesture() {
    if (audioUnlocked) return;
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      audioUnlocked = true;
      console.log('[GameAudio] AudioContext unlocked successfully.');
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    } catch(e) {}
  }
  window.addEventListener('pointerdown', handleFirstGesture, { once: true });
  window.addEventListener('keydown', handleFirstGesture, { once: true });

  global.GameAudio = {
    registerPack: function(pack) {
      if (!pack || !pack.items) return;
      for (var i = 0; i < pack.items.length; i++) {
        var item = pack.items[i];
        soundRegistry[item.id] = item;
      }
    },

    play: function(id, options) {
      var def = soundRegistry[id];
      if (!def) return null;
      // Missing/empty paths are a no-op: the SFX manifest ships silent by
      // default so gameplay never blocks on an absent asset.
      if (!def.path) return null;

      var url = def.path;
      var audio = new Audio(url);
      var baseGain = (def.gain != null ? def.gain : 1.0) * masterVolume;
      if (isDucked && def.tags && def.tags.indexOf('music') !== -1) {
        baseGain *= 0.3; // -10 dB ducking
      }

      audio.volume = Math.max(0, Math.min(1, (options && options.volume != null ? options.volume : baseGain)));
      audio.loop = !!def.loop;

      var promise = audio.play();
      if (promise !== undefined) {
        promise.catch(function(err) {
          // Cleanly intercept interrupted playback warnings
          if (err.name !== 'AbortError') {
            console.warn('[GameAudio Guard] Playback prevented for:', id, err.message);
          }
        });
      }

      if (def.loop) {
        activeLoops[id] = audio;
      }
      return audio;
    },

    stop: function(id) {
      if (activeLoops[id]) {
        try {
          activeLoops[id].pause();
          activeLoops[id].currentTime = 0;
        } catch(e) {}
        delete activeLoops[id];
      }
    },

    setDucking: function(duck) {
      isDucked = !!duck;
      for (var id in activeLoops) {
        var def = soundRegistry[id];
        if (def && def.tags && def.tags.indexOf('music') !== -1) {
          var targetGain = (def.gain || 1.0) * masterVolume * (isDucked ? 0.3 : 1.0);
          activeLoops[id].volume = Math.max(0, Math.min(1, targetGain));
        }
      }
    }
  };

  // Wire automatic ducking on narrative dialogue triggers
  global.eventBus.subscribe('dialogue.start', function() { global.GameAudio.setDucking(true); });
  global.eventBus.subscribe('dialogue.end', function() { global.GameAudio.setDucking(false); });
})(window);
