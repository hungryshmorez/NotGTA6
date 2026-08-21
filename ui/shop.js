// /ui/shop.js - Item Vendor Modal & Inventory Bridge
(function(global) {
  var CATALOG = [
    { id: 'water',   name: 'Bottled Water',   price: 8,   waterBonus: 40,  emoji: '💧' },
    { id: 'noodles', name: 'Noodle Cart Bowl', price: 12,  hungerBonus: 45, emoji: '🍜' },
    { id: 'medkit',  name: 'Street Medkit',   price: 60,  healthBonus: 50, emoji: '🩹' },
    { id: 'tea',     name: 'Rooftop Sanity Tea', price: 45, sanityBonus: 40, emoji: '🍵' },
    { id: 'combo',   name: 'Diner Combo Plate', price: 30, hungerBonus: 30, waterBonus: 20, emoji: '🍔' }
  ];

  var overlay = null;

  function fmt(n) { return (n || 0).toLocaleString('en-US'); }

  function render() {
    var money = global.saveState.get('global.money', 0);
    var debt = global.saveState.get('global.debt', 50000);

    overlay = document.createElement('div');
    overlay.className = 'uls-modal-overlay';
    var rows = CATALOG.map(function(item) {
      var effects = [];
      if (item.healthBonus) effects.push('+' + item.healthBonus + ' HP');
      if (item.sanityBonus) effects.push('+' + item.sanityBonus + ' SAN');
      if (item.waterBonus) effects.push('+' + item.waterBonus + ' H2O');
      if (item.hungerBonus) effects.push('+' + item.hungerBonus + ' FOOD');
      return '<div class="shop-row" data-id="' + item.id + '">' +
        '<span class="shop-emoji">' + item.emoji + '</span>' +
        '<span class="shop-name">' + item.name + '</span>' +
        '<span class="shop-fx">' + effects.join(' · ') + '</span>' +
        '<button class="shop-buy" data-id="' + item.id + '">$' + item.price + '</button>' +
        '</div>';
    }).join('');

    overlay.innerHTML =
      '<div class="uls-modal">' +
        '<div class="modal-head">' +
          '<h3>🏪 Crystal Market Vendor</h3>' +
          '<button class="modal-close" id="shop-close">✕</button>' +
        '</div>' +
        '<div class="modal-wallet">Cash: $' + fmt(money) + '</div>' +
        '<div class="shop-list">' + rows + '</div>' +
        '<div class="modal-debt">' +
          '<span>Syndicate Debt: $' + fmt(debt) + '</span>' +
          '<div class="debt-pay-row">' +
            '<input type="number" id="debt-amount" min="1" placeholder="Amount" />' +
            '<button id="debt-pay-btn" class="btn-primary">Pay Debt</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    overlay.querySelector('#shop-close').onclick = close;
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) close();
    });

    overlay.querySelectorAll('.shop-buy').forEach(function(btn) {
      btn.onclick = function() {
        var id = btn.getAttribute('data-id');
        var item = CATALOG.filter(function(i) { return i.id === id; })[0];
        if (item) global.eventBus.publish('shop.purchase.item', item);
        refreshWallet();
      };
    });

    var payBtn = overlay.querySelector('#debt-pay-btn');
    payBtn.onclick = function() {
      var input = overlay.querySelector('#debt-amount');
      var amt = parseInt(input.value, 10);
      if (amt > 0) {
        global.eventBus.publish('debt.payment.made', amt);
        input.value = '';
        refreshWallet();
      }
    };
  }

  function refreshWallet() {
    if (!overlay) return;
    var money = global.saveState.get('global.money', 0);
    var debt = global.saveState.get('global.debt', 50000);
    var w = overlay.querySelector('.modal-wallet');
    var d = overlay.querySelector('.modal-debt span');
    if (w) w.textContent = 'Cash: $' + fmt(money);
    if (d) d.textContent = 'Syndicate Debt: $' + fmt(debt);
  }

  function close() {
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    overlay = null;
  }

  global.eventBus.subscribe('ui.shop.open', function() {
    if (overlay) return; // already open
    render();
  });

  global.UIShop = { open: render, close: close, catalog: CATALOG };
})(window);
