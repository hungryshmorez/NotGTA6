// /systems/game.js - Core Survival Simulation, Debt Engine & Asymmetric HEAT
(function(global) {
  global.GameManager = {
    init: function() {
      global.eventBus.subscribe('player.action.submitted', this.processTurn.bind(this));
      global.eventBus.subscribe('shop.purchase.item', this.processPurchase.bind(this));
      global.eventBus.subscribe('debt.payment.made', this.processDebtPayment.bind(this));
      global.eventBus.subscribe('econ.wallet.change', this.processWalletChange.bind(this));
    },

    processTurn: function(actionText) {
      var stats = global.saveState.get('global');

      // 1. Passive Needs Consumption
      stats.water = Math.max(0, stats.water - 2);
      stats.hunger = Math.max(0, stats.hunger - 2);

      // Critical dehydration/starvation penalty
      if (stats.water === 0 || stats.hunger === 0) {
        stats.health = Math.max(0, stats.health - 5);
        global.eventBus.publish('ui.toast', '⚠️ Extreme exhaustion is draining your health!');
        global.GameAudio.play('ui_error');
      }

      // 2. Asymmetric Police HEAT Mechanics
      if (stats.heat > 0) {
        var calmTurns = global.saveState.get('slices.uls.calmTurns', 0) + 1;
        if (calmTurns >= 4) {
          // Heat only decays if player actively stays in safe districts
          var curDistrict = global.saveState.get('player.district');
          if (curDistrict === 'industrial' || curDistrict === 'market') {
            stats.heat = Math.max(0, stats.heat - 3);
            calmTurns = 0;
            global.eventBus.publish('ui.toast', '⭐ Heat subsided slightly in the back-alleys.');
          }
        }
        global.saveState.set('slices.uls.calmTurns', calmTurns);
      }

      // 3. Time Advancement
      stats.hour += 1;
      if (stats.hour >= 24) {
        stats.hour = 0;
        stats.day += 1;
        this.processDailyCycle();
      }

      global.saveState.set('global', stats);
      global.eventBus.publish('player.stats.updated', stats);

      // 4. Trigger Backrooms Anomaly Evaluator
      if (global.BackroomsBridge) {
        global.BackroomsBridge.evaluateNoclip(actionText);
      }
    },

    processDailyCycle: function() {
      var debt = global.saveState.get('global.debt', 50000);
      if (debt <= 0) return;
      var interest = Math.ceil(debt * 0.015); // 1.5% daily interest
      global.saveState.set('global.debt', debt + interest);
      global.eventBus.publish('ui.toast', '📅 A new day dawns. Syndicate interest added: +$' + interest);
    },

    processPurchase: function(item) {
      var money = global.saveState.get('global.money', 0);
      if (money >= item.price) {
        global.saveState.set('global.money', money - item.price);
        var stats = global.saveState.get('global');
        if (item.waterBonus) stats.water = Math.min(100, stats.water + item.waterBonus);
        if (item.hungerBonus) stats.hunger = Math.min(100, stats.hunger + item.hungerBonus);
        if (item.healthBonus) stats.health = Math.min(100, stats.health + item.healthBonus);
        if (item.sanityBonus) stats.sanity = Math.min(100, stats.sanity + item.sanityBonus);
        global.saveState.set('global', stats);

        global.GameAudio.play('cash');
        global.eventBus.publish('player.stats.updated', stats);
        global.eventBus.publish('ui.toast', 'Purchased ' + item.name);
      } else {
        global.GameAudio.play('ui_error');
        global.eventBus.publish('ui.toast', 'Insufficient funds!');
      }
    },

    processDebtPayment: function(amount) {
      var money = global.saveState.get('global.money', 0);
      var debt = global.saveState.get('global.debt', 50000);
      var pay = Math.min(amount, money);
      if (pay > 0) {
        global.saveState.set('global.money', money - pay);
        global.saveState.set('global.debt', Math.max(0, debt - pay));
        global.GameAudio.play('cash');
        global.eventBus.publish('ui.toast', 'Paid $' + pay + ' toward Syndicate Debt!');
        global.eventBus.publish('player.stats.updated', global.saveState.get('global'));
        if (debt - pay <= 0) {
          global.eventBus.publish('game.victory.debt_cleared');
        }
      }
    },

    // Cross-realm wallet adjustment: { delta, reason }
    processWalletChange: function(change) {
      if (!change || typeof change.delta !== 'number') return;
      var money = global.saveState.get('global.money', 0);
      var next = Math.max(0, money + change.delta);
      global.saveState.set('global.money', next);
      global.eventBus.publish('player.stats.updated', global.saveState.get('global'));
      if (change.delta > 0) global.GameAudio.play('cash');
    }
  };
})(window);
