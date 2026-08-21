// /systems/objectives.js - Dynamic Multi-Tier Objective Evaluator
// Recomputes the active objective set on every stat change and broadcasts it
// via objectives.updated for any UI that wants to render a quest log.
(function(global) {
  function evaluate() {
    var g = global.saveState.get('global') || {};
    var debt = g.debt != null ? g.debt : 50000;
    var keys = g.keysCollected || 0;
    var list = [];

    // Primary victory tracks (mutually satisfiable).
    list.push({
      id: 'pay_debt',
      text: 'Clear the $50,000 Syndicate Debt (remaining: $' + debt.toLocaleString('en-US') + ')',
      status: debt <= 0 ? 'complete' : 'active'
    });
    list.push({
      id: 'collect_keys',
      text: 'Collect 4 Reality Encryption Keys (' + keys + '/4)',
      status: keys >= 4 ? 'complete' : 'active'
    });

    // Survival guard-rails surface as failable objectives.
    if (g.health <= 0) {
      list.push({ id: 'survive', text: 'Stay alive', status: 'failed' });
    } else if (g.water <= 20 || g.hunger <= 20) {
      list.push({ id: 'survive', text: 'Restock water and food before you collapse', status: 'active' });
    }

    if ((g.heat || 0) >= 70) {
      list.push({ id: 'lose_heat', text: 'Shake the heat — lie low or pay a fixer', status: 'active' });
    }

    global.eventBus.publish('objectives.updated', list);
    return list;
  }

  global.Objectives = {
    init: function() {
      global.eventBus.subscribe('player.stats.updated', evaluate);
      global.eventBus.subscribe('state.reset', evaluate);
      evaluate();
    },
    current: evaluate
  };
})(window);
