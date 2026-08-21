// /kernel/time.js - 24-Hour Day/Night Game Clock
(function(global) {
  function phaseFor(hour) {
    if (hour >= 5 && hour < 8) return 'dawn';
    if (hour >= 8 && hour < 18) return 'day';
    if (hour >= 18 && hour < 21) return 'dusk';
    return 'night';
  }

  global.GameClock = {
    getHour: function() { return global.saveState.get('global.hour', 8); },
    getDay: function() { return global.saveState.get('global.day', 1); },
    getPhase: function() { return phaseFor(this.getHour()); },
    isNight: function() {
      var p = this.getPhase();
      return p === 'night' || p === 'dusk';
    },
    format: function() {
      var h = this.getHour();
      var suffix = h >= 12 ? 'PM' : 'AM';
      var hr12 = h % 12; if (hr12 === 0) hr12 = 12;
      return 'Day ' + this.getDay() + ' — ' + (hr12 < 10 ? '0' + hr12 : hr12) + ':00 ' + suffix;
    }
  };

  // Broadcast phase transitions so realms/ambient can react.
  var lastPhase = null;
  global.eventBus.subscribe('player.stats.updated', function() {
    var phase = global.GameClock.getPhase();
    if (phase !== lastPhase) {
      lastPhase = phase;
      global.eventBus.publish('time.phase.changed', { phase: phase, hour: global.GameClock.getHour() });
    }
  });
})(window);
