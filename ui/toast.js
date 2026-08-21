// /ui/toast.js - Non-intrusive floating notification stack
(function(global) {
  var container = null;

  function ensureContainer() {
    if (container) return container;
    container = document.createElement('div');
    container.id = 'toast-stack';
    container.className = 'toast-stack';
    document.body.appendChild(container);
    return container;
  }

  function push(message) {
    if (!message) return;
    var c = ensureContainer();
    var toast = document.createElement('div');
    toast.className = 'toast-item';
    toast.textContent = String(message);
    c.appendChild(toast);

    // Force reflow so the entrance transition fires, then schedule teardown.
    requestAnimationFrame(function() { toast.classList.add('show'); });
    setTimeout(function() {
      toast.classList.remove('show');
      setTimeout(function() {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 350);
    }, 3200);

    // Cap the stack so a burst of events never floods the screen.
    while (c.children.length > 5) {
      c.removeChild(c.firstChild);
    }
  }

  global.eventBus.subscribe('ui.toast', push);
  global.UIToast = { push: push };
})(window);
