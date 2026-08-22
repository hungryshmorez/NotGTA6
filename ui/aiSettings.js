// /ui/aiSettings.js - AI narrator & image settings, local-model download prompt
(function(global) {
  var overlay = null;

  function cfg() { return global.AIConfig; }

  function localStatus() {
    if (!global.LocalModel) return 'unavailable';
    if (global.LocalModel.isReady()) return 'ready';
    if (global.LocalModel.isLoading()) return 'downloading…';
    if (!global.LocalModel.isSupported()) return 'needs WebGPU browser';
    return 'not downloaded';
  }

  function render() {
    overlay = document.createElement('div');
    overlay.className = 'uls-modal-overlay';
    var c = cfg();
    overlay.innerHTML =
      '<div class="uls-modal ai-modal">' +
        '<div class="modal-head"><h3>⚙️ AI Narrator</h3><button class="modal-close" id="ai-close">✕</button></div>' +

        '<div class="ai-section">' +
          '<div class="ai-lbl">Narrator engine</div>' +
          '<label class="ai-radio"><input type="radio" name="ai-mode" value="pollinations" ' +
            (c.get('defaultProvider') !== 'local' ? 'checked' : '') + '> ' +
            '<span><b>Free cloud</b> — Pollinations. No key, works instantly for everyone.</span></label>' +
          '<label class="ai-radio"><input type="radio" name="ai-mode" value="local" ' +
            (c.get('defaultProvider') === 'local' ? 'checked' : '') + '> ' +
            '<span><b>Local model</b> — runs in your browser, offline &amp; free. <em id="ai-local-status">' +
            localStatus() + '</em></span></label>' +
          '<div id="ai-local-download-row" class="ai-download-row"></div>' +
          '<div id="ai-local-progress" class="ai-progress"></div>' +
        '</div>' +

        '<div class="ai-section">' +
          '<div class="ai-lbl">Bring your own key <span class="ai-hint">(premium — used only for pivotal story beats)</span></div>' +
          '<div id="ai-key-gate"></div>' +
          '<div id="ai-key-fields" style="display:none;">' +
            '<label class="ai-field"><span>Endpoint</span><input type="text" id="ai-endpoint" value="' +
              escapeAttr(c.get('byok.endpoint')) + '"></label>' +
            '<label class="ai-field"><span>API key</span><input type="password" id="ai-key" placeholder="sk-… / pk-…" value="' +
              escapeAttr(c.get('byok.apiKey')) + '"></label>' +
            '<label class="ai-field"><span>Model</span><input type="text" id="ai-model" value="' +
              escapeAttr(c.get('byok.model')) + '"></label>' +
            '<label class="ai-field"><span>Use key when beat significance ≥</span>' +
              '<input type="number" id="ai-threshold" min="0" max="10" value="' + (c.get('byok.significanceThreshold')) + '"></label>' +
            '<label class="ai-check"><input type="checkbox" id="ai-key-enabled" ' + (c.get('byok.enabled') ? 'checked' : '') + '> ' +
              '<span>Enable premium key for high-stakes moments</span></label>' +
          '</div>' +
        '</div>' +

        '<div class="ai-section">' +
          '<div class="ai-lbl">Scene images <span class="ai-hint">(free, keyless, no tokens)</span></div>' +
          '<label class="ai-check"><input type="checkbox" id="ai-img-enabled" ' + (c.get('image.enabled') ? 'checked' : '') + '> ' +
            '<span>Generate a scene image each turn (Ken Burns animated)</span></label>' +
          '<label class="ai-field"><span>Image key (optional)</span><input type="password" id="ai-img-key" placeholder="optional" value="' +
            escapeAttr(c.get('image.apiKey')) + '"></label>' +
        '</div>' +

        '<button id="ai-save" class="btn-primary ai-save">Save</button>' +
      '</div>';
    document.body.appendChild(overlay);
    wire();
  }

  function escapeAttr(s) { return String(s == null ? '' : s).replace(/"/g, '&quot;'); }

  function renderDownloadRow() {
    var row = overlay.querySelector('#ai-local-download-row');
    if (!row) return;
    row.innerHTML = '';
    if (global.LocalModel && !global.LocalModel.isReady() && global.LocalModel.isSupported()) {
      var btn = document.createElement('button');
      btn.className = 'r-btn active';
      btn.textContent = global.LocalModel.isLoading() ? 'Downloading…' : '⬇️ Download local model (one-time)';
      btn.disabled = global.LocalModel.isLoading();
      btn.onclick = function() { global.LocalModel.download(); };
      row.appendChild(btn);
    }
  }

  // The local-model offer that appears BEFORE key entry, per design.
  function renderKeyGate() {
    var gate = overlay.querySelector('#ai-key-gate');
    var fields = overlay.querySelector('#ai-key-fields');
    if (!gate) return;
    var alreadyOffered = cfg().get('local.offered', false) || (global.LocalModel && global.LocalModel.isReady());

    if (!alreadyOffered) {
      gate.innerHTML =
        '<div class="ai-offer">' +
          '<p>Before you spend money on a key — want the <b>free local model</b> instead? ' +
          'It runs offline in your browser, no key, no cost.</p>' +
          '<div class="ai-offer-btns">' +
            '<button id="ai-offer-yes" class="btn-primary">Download local model</button>' +
            '<button id="ai-offer-no" class="r-btn">No, I\'ll use my own key</button>' +
          '</div>' +
        '</div>';
      gate.querySelector('#ai-offer-yes').onclick = function() {
        cfg().set('local.offered', true);
        if (global.LocalModel) global.LocalModel.download();
        gate.innerHTML = '';
        fields.style.display = 'block';
      };
      gate.querySelector('#ai-offer-no').onclick = function() {
        cfg().set('local.offered', true);
        gate.innerHTML = '';
        fields.style.display = 'block';
      };
    } else {
      gate.innerHTML = '';
      fields.style.display = 'block';
    }
  }

  function wire() {
    overlay.querySelector('#ai-close').onclick = close;
    overlay.addEventListener('click', function(e) { if (e.target === overlay) close(); });

    renderDownloadRow();
    renderKeyGate();

    overlay.querySelectorAll('input[name="ai-mode"]').forEach(function(r) {
      r.onchange = function() {
        if (r.value === 'local' && r.checked) {
          if (global.LocalModel && !global.LocalModel.isReady()) global.LocalModel.download();
        }
      };
    });

    overlay.querySelector('#ai-save').onclick = function() {
      var c = cfg();
      var mode = (overlay.querySelector('input[name="ai-mode"]:checked') || {}).value || 'pollinations';
      c.set('defaultProvider', mode === 'local' ? 'local' : 'pollinations');

      c.set('byok.endpoint', overlay.querySelector('#ai-endpoint').value.trim());
      c.set('byok.apiKey', overlay.querySelector('#ai-key').value.trim());
      c.set('byok.model', overlay.querySelector('#ai-model').value.trim() || 'claude');
      c.set('byok.significanceThreshold', parseInt(overlay.querySelector('#ai-threshold').value, 10) || 7);
      c.set('byok.enabled', overlay.querySelector('#ai-key-enabled').checked);

      c.set('image.enabled', overlay.querySelector('#ai-img-enabled').checked);
      c.set('image.apiKey', overlay.querySelector('#ai-img-key').value.trim());

      global.eventBus.publish('ui.toast', '⚙️ AI settings saved.');
      close();
    };

    // Live progress for local model download.
    global.eventBus.subscribe('ai.local.progress', function(p) {
      var el = overlay && overlay.querySelector('#ai-local-progress');
      var st = overlay && overlay.querySelector('#ai-local-status');
      if (el && p) el.textContent = p.text || '';
      if (st) st.textContent = localStatus();
      renderDownloadRow();
    });
  }

  function close() {
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    overlay = null;
  }

  global.eventBus.subscribe('ui.ai.open', function() { if (!overlay) render(); });
  global.AISettings = { open: render, close: close };
})(window);
