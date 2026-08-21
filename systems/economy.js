// /systems/economy.js - Cross-Realm Currency & Reward Bridge
// Thin façade over the wallet/debt so realms never poke global state directly.
// All realms route rewards through econ.* events; GameManager owns the mutation.
(function(global) {
  global.Economy = {
    // Grant/deduct cash from any realm. reason is surfaced in logs/toasts.
    adjust: function(delta, reason) {
      global.eventBus.publish('econ.wallet.change', { delta: delta, reason: reason || '' });
    },

    // Apply a payout directly against the Syndicate debt (used by Living Hell).
    payDebt: function(amount) {
      var debt = global.saveState.get('global.debt', 50000);
      var applied = Math.min(amount, debt);
      global.saveState.set('global.debt', Math.max(0, debt - applied));
      global.eventBus.publish('player.stats.updated', global.saveState.get('global'));
      global.eventBus.publish('ui.toast', '💸 $' + applied + ' wired straight to the Syndicate. Debt: $' + Math.max(0, debt - applied));
      if (debt - applied <= 0) {
        global.eventBus.publish('game.victory.debt_cleared');
      }
      return applied;
    },

    // Award a Reality Encryption Key (Backrooms escape path).
    grantKey: function() {
      var keys = global.saveState.get('global.keysCollected', 0);
      if (keys >= 4) return keys;
      keys += 1;
      global.saveState.set('global.keysCollected', keys);
      global.eventBus.publish('player.stats.updated', global.saveState.get('global'));
      global.eventBus.publish('ui.toast', '🔑 Reality Encryption Key acquired (' + keys + '/4).');
      if (keys >= 4) {
        global.eventBus.publish('game.victory.escape');
      }
      return keys;
    },

    getWallet: function() { return global.saveState.get('global.money', 0); },
    getDebt: function() { return global.saveState.get('global.debt', 50000); },

    // Adjust street reputation, clamped to [-100, 100].
    adjustReputation: function(delta) {
      var rep = global.saveState.get('global.reputation', 0);
      rep = Math.max(-100, Math.min(100, rep + delta));
      global.saveState.set('global.reputation', rep);
      return rep;
    },

    // Raise/lower HEAT (0-100), clamped. Positive = more wanted.
    adjustHeat: function(delta) {
      var stats = global.saveState.get('global');
      stats.heat = Math.max(0, Math.min(100, (stats.heat || 0) + delta));
      global.saveState.set('global', stats);
      global.eventBus.publish('player.stats.updated', stats);
      return stats.heat;
    }
  };
})(window);
