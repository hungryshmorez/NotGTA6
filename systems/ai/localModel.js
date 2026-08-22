// /systems/ai/localModel.js - Optional in-browser LLM via WebLLM (WebGPU)
// Downloaded on demand after the player accepts the prompt. Runs fully offline,
// no key, no server. Requires a WebGPU-capable browser; degrades gracefully.
(function(global) {
  var engine = null;
  var loading = false;

  function webgpuAvailable() {
    return typeof navigator !== 'undefined' && !!navigator.gpu;
  }

  global.LocalModel = {
    isSupported: webgpuAvailable,
    isReady: function() { return !!engine; },
    isLoading: function() { return loading; },

    // Kick off the (large, one-time) model download + load.
    download: function() {
      if (engine || loading) return Promise.resolve(!!engine);
      if (!webgpuAvailable()) {
        global.eventBus.publish('ui.toast', '⚠️ Local model needs a WebGPU browser (Chrome/Edge).');
        return Promise.resolve(false);
      }
      loading = true;
      var modelId = global.AIConfig.get('local.modelId');
      global.eventBus.publish('ui.toast', '⬇️ Downloading local model… this happens once.');

      // Dynamic import keeps WebLLM out of the initial page load entirely.
      return import('https://esm.run/@mlc-ai/web-llm')
        .then(function(webllm) {
          return webllm.CreateMLCEngine(modelId, {
            initProgressCallback: function(p) {
              global.eventBus.publish('ai.local.progress', p);
            }
          });
        })
        .then(function(e) {
          engine = e;
          loading = false;
          global.AIConfig.set('local.ready', true);
          global.AIConfig.set('defaultProvider', 'local');
          global.eventBus.publish('ui.toast', '✅ Local model ready. Narration now runs offline.');
          return true;
        })
        .catch(function(err) {
          loading = false;
          console.warn('[LocalModel] load failed', err);
          global.eventBus.publish('ui.toast', '⚠️ Local model failed to load. Staying on the free cloud narrator.');
          return false;
        });
    },

    chat: function(messages) {
      if (!engine) return Promise.reject(new Error('local model not ready'));
      return engine.chat.completions.create({
        messages: messages,
        temperature: 0.9,
        max_tokens: 500
      }).then(function(res) {
        return res && res.choices && res.choices[0] && res.choices[0].message
          ? res.choices[0].message.content : '';
      });
    }
  };
})(window);
