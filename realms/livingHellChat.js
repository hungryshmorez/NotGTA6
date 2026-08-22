// /realms/livingHellChat.js - Living Hell House "Chat Control"
// The signature mechanic: while you're in the house, the paying audience runs
// the show. Every turn the chat can spend to mess with you — TTS taunts, EMP
// blackouts, temperature swings, stink bombs — or send help (food, tips). It's
// relentless and it can grind you down or even kill you. On-vibe, not comedic.
(function(global) {
  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  // Weighted audience "toys". apply(stats) mutates and returns a toast string.
  var EVENTS = [
    { w: 3, apply: function(s) { var n = -rand(4, 9); s.sanity = clamp(s.sanity + n);
        return '💬 [TTS $' + rand(2, 20) + '] a wall of distorted voices screams your name — you flinch (' + n + ' sanity)'; } },
    { w: 2, apply: function(s) { var n = rand(20, 120); if (global.Economy) global.Economy.adjust(n, 'audience superchat');
        return '💬 superchat $' + n + ': "don\'t you dare die before payout"'; } },
    { w: 1, apply: function(s) { s.sanity = clamp(s.sanity - rand(3, 6));
        return '💬 CHAT triggered the EMP — every light in the house dies at once. Something moves in the dark.'; } },
    { w: 1, apply: function(s) { s.health = clamp(s.health - rand(3, 7)); s.water = clamp(s.water - rand(4, 8));
        return '💬 CHAT cranked the house to 110°F. Sweat stings your eyes.'; } },
    { w: 1, apply: function(s) { s.health = clamp(s.health - rand(4, 8));
        return '💬 CHAT dropped the thermostat to freezing. Your fingers go numb.'; } },
    { w: 1, apply: function(s) { s.sanity = clamp(s.sanity - rand(4, 8));
        return '💬 CHAT dropped a stink bomb through the vent in your room.'; } },
    { w: 2, apply: function(s) { s.hunger = clamp(s.hunger + rand(15, 30));
        return '💬 the chat ordered you a pizza. You devour it before they can take it back.'; } },
    { w: 1, apply: function(s) { s.sanity = clamp(s.sanity + rand(6, 12)); s.water = clamp(s.water + rand(8, 14));
        return '💬 a viewer sent Almond Water. It steadies you — for now.'; } },
    { w: 2, apply: function(s) { s.sanity = clamp(s.sanity - rand(2, 5));
        return '💬 CHAT is voting on your next punishment. The poll is climbing.'; } }
  ];

  function clamp(v) { return Math.max(0, Math.min(100, v)); }

  function pick() {
    var total = 0, i;
    for (i = 0; i < EVENTS.length; i++) total += EVENTS[i].w;
    var r = Math.random() * total;
    for (i = 0; i < EVENTS.length; i++) { r -= EVENTS[i].w; if (r <= 0) return EVENTS[i]; }
    return EVENTS[0];
  }

  function fire() {
    if (!global.RealmRouter || global.RealmRouter.getActiveRealm() !== 'living-hell') return;
    if (global.Arcade && global.Arcade.isOpen()) return; // don't interrupt a live challenge
    if (Math.random() > 0.65) return; // ~65% of turns the chat acts
    if (global.DeathWatch) global.DeathWatch.setCause('the audience');
    var stats = global.saveState.get('global');
    var msg = pick().apply(stats);
    global.saveState.set('global', stats);
    global.eventBus.publish('player.stats.updated', stats); // DeathWatch may fire
    global.eventBus.publish('ui.toast', msg);
  }

  // Every action inside the house gives the chat a chance to strike.
  global.eventBus.subscribe('player.action.submitted', fire);
})(window);
