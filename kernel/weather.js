// /kernel/weather.js - Atmospheric Rotation & Ambient Engine
(function(global) {
  var CONDITIONS = ['clear', 'overcast', 'rain', 'storm', 'fog', 'smog'];
  var current = 'clear';

  function roll() {
    var r = (global.RNG ? global.RNG.next() : Math.random());
    // Weighted toward moody, cyberpunk weather.
    var next;
    if (r < 0.34) next = 'clear';
    else if (r < 0.52) next = 'overcast';
    else if (r < 0.72) next = 'rain';
    else if (r < 0.82) next = 'storm';
    else if (r < 0.92) next = 'fog';
    else next = 'smog';
    if (next !== current) {
      current = next;
      global.eventBus.publish('weather.changed', { condition: current });
    }
  }

  global.Weather = {
    get: function() { return current; },
    isWet: function() { return current === 'rain' || current === 'storm'; },
    describe: function() {
      switch (current) {
        case 'rain': return 'Rain streaks the neon into long smears on the asphalt.';
        case 'storm': return 'Thunder rolls between the towers; the gutters run black.';
        case 'fog': return 'A low fog swallows the streetlights whole.';
        case 'smog': return 'Industrial smog hangs thick and acrid over the district.';
        case 'overcast': return 'A flat grey lid presses down on Chroma City.';
        default: return 'The sky is clear and cold above the skyline.';
      }
    }
  };

  // Rotate weather each new in-game day.
  global.eventBus.subscribe('time.phase.changed', function(data) {
    if (data && data.phase === 'dawn') roll();
  });
})(window);
