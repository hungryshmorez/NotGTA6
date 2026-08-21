// /bridge/livingHellBridge.js - Living Hell postMessage Protocol Adapter
// Bridges the in-DOM Living Hell realm (or a future sandboxed iframe) to the
// core kernel. Accepts a strict message envelope and translates it into safe
// economy/stat mutations. Origin is validated before any state is touched.
(function(global) {
  var ALLOWED_TYPES = {
    'lh.payout': true,        // { amount } -> applied to debt
    'lh.tip': true,           // { amount } -> cash
    'lh.sanity': true,        // { delta }
    'lh.clout': true,         // { delta }
    'lh.exit': true           // {} -> return to city
  };

  function sameOriginTrusted(event) {
    // In-DOM dispatch has no source window; treat as trusted.
    if (!event || !event.source) return true;
    try { return event.origin === window.location.origin; }
    catch (e) { return false; }
  }

  function apply(msg) {
    if (!msg || !ALLOWED_TYPES[msg.type]) return;
    switch (msg.type) {
      case 'lh.payout':
        if (global.Economy && msg.amount > 0) global.Economy.payDebt(msg.amount | 0);
        break;
      case 'lh.tip':
        if (global.Economy && msg.amount > 0) global.Economy.adjust(msg.amount | 0, 'Living Hell superchat');
        break;
      case 'lh.sanity': {
        var stats = global.saveState.get('global');
        stats.sanity = Math.max(0, Math.min(100, stats.sanity + (msg.delta | 0)));
        global.saveState.set('global', stats);
        global.eventBus.publish('player.stats.updated', stats);
        break;
      }
      case 'lh.clout': {
        var clout = global.saveState.get('slices.livingHell.clout', 5) + (msg.delta | 0);
        global.saveState.set('slices.livingHell.clout', Math.max(0, clout));
        break;
      }
      case 'lh.exit':
        if (global.RealmRouter.isRegistered('uls')) global.RealmRouter.go('uls');
        break;
    }
  }

  global.LivingHellBridge = {
    // Direct in-process dispatch (used by the DOM realm module).
    dispatch: function(msg) { apply(msg); },

    // Optional postMessage listener for a sandboxed iframe implementation.
    attach: function() {
      window.addEventListener('message', function(event) {
        if (!sameOriginTrusted(event)) return;
        var data = event.data;
        if (data && typeof data === 'object' && data.channel === 'living-hell') {
          apply(data);
        }
      });
    }
  };
})(window);
