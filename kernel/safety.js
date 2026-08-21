// /kernel/safety.js - Content Sanitization Runtime
(function(global) {
  global.SafetyRuntime = {
    isAdultMode: function() {
      return !!global.saveState.get('player.adultMode', false);
    },

    sanitizeRole: function(roleStr) {
      if (!roleStr) return 'Citizen';
      if (this.isAdultMode()) return String(roleStr).trim();

      var r = String(roleStr).toLowerCase();
      if (r.indexOf('sex worker') !== -1 || r.indexOf('prostitute') !== -1 || r.indexOf('escort') !== -1) {
        return 'Nightlife Performer';
      }
      if (r.indexOf('pimp') !== -1) return 'Nightlife Manager';
      if (r.indexOf('gang leader') !== -1) return 'Crew Lead';
      if (r.indexOf('gang member') !== -1 || r.indexOf('gang') !== -1) return 'Crew Member';
      if (r.indexOf('stripper') !== -1) return 'Exotic Dancer';
      if (r.indexOf('dealer') !== -1 || r.indexOf('drug') !== -1) return 'Street Merchant';

      var words = String(roleStr).trim().split(/\s+/);
      for (var i = 0; i < words.length; i++) {
        words[i] = words[i].charAt(0).toUpperCase() + words[i].slice(1);
      }
      return words.join(' ');
    },

    filterText: function(text) {
      if (!text) return '';
      if (this.isAdultMode()) return String(text);

      var s = String(text);
      s = s.replace(/\b(fuck|fucking|fucker)\b/gi, 'freak');
      s = s.replace(/\b(shit|shitty)\b/gi, 'crud');
      s = s.replace(/\b(bitch|bitches)\b/gi, 'rival');
      s = s.replace(/\b(dick|cock)\b/gi, 'jerk');
      s = s.replace(/\b(asshole|ass)\b/gi, 'clown');
      return s;
    }
  };
})(window);
