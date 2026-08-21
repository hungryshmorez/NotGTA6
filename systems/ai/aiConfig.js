// /systems/ai/aiConfig.js - AI provider settings (persisted per browser)
// Tiered narration strategy:
//   - 'pollinations' : keyless, free, default. Anyone can play instantly.
//   - 'local'        : WebLLM model downloaded on demand (offered via prompt).
//   - 'byok'         : bring-your-own OpenAI-compatible key. Reserved for the
//                      highest-significance story beats to keep token usage lean.
// Settings live in their own localStorage key (not the save file) so they
// survive New Game+ and never bloat the save payload.
(function(global) {
  var KEY = 'uls_ai_config_v1';

  var DEFAULTS = {
    defaultProvider: 'pollinations', // pollinations | local
    textModel: 'openai',             // pollinations text model id
    // Bring-your-own-key (premium). Used only when premium is enabled AND a
    // turn's significance clears the threshold — this is the "optimal
    // circumstances only" routing the design calls for.
    byok: {
      enabled: false,
      endpoint: 'https://gen.pollinations.ai/v1/chat/completions',
      apiKey: '',
      model: 'claude',
      significanceThreshold: 7 // 0-10; only beats >= this route to the key
    },
    local: {
      offered: false,   // has the download prompt been shown?
      ready: false,     // is the model downloaded & loaded?
      modelId: 'Llama-3.2-3B-Instruct-q4f16_1-MLC'
    },
    // Image generation (free/keyless by default; key optional for higher tiers).
    image: {
      provider: 'pollinations',
      model: 'flux',
      apiKey: '',
      enabled: true
    },
    // Optional BYOK cinematic video on pivotal beats only.
    video: {
      enabled: false,
      apiKey: '',
      model: 'wan'
    }
  };

  function deepMerge(base, over) {
    var out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
    for (var k in over) {
      if (!over.hasOwnProperty(k)) continue;
      if (over[k] && typeof over[k] === 'object' && !Array.isArray(over[k]) &&
          base[k] && typeof base[k] === 'object') {
        out[k] = deepMerge(base[k], over[k]);
      } else {
        out[k] = over[k];
      }
    }
    return out;
  }

  var config = JSON.parse(JSON.stringify(DEFAULTS));
  try {
    var raw = localStorage.getItem(KEY);
    if (raw) config = deepMerge(DEFAULTS, JSON.parse(raw));
  } catch (e) { /* fall back to defaults */ }

  global.AIConfig = {
    all: function() { return config; },

    get: function(path, fallback) {
      var keys = path.split('.');
      var cur = config;
      for (var i = 0; i < keys.length; i++) {
        if (cur == null || !(keys[i] in cur)) return fallback;
        cur = cur[keys[i]];
      }
      return cur;
    },

    set: function(path, value) {
      var keys = path.split('.');
      var cur = config;
      for (var i = 0; i < keys.length - 1; i++) {
        if (!cur[keys[i]] || typeof cur[keys[i]] !== 'object') cur[keys[i]] = {};
        cur = cur[keys[i]];
      }
      cur[keys[keys.length - 1]] = value;
      this.persist();
      global.eventBus.publish('ai.config.changed', { path: path, value: value });
    },

    persist: function() {
      try { localStorage.setItem(KEY, JSON.stringify(config)); }
      catch (e) { console.warn('[AIConfig] persist failed', e); }
    },

    // True if a usable bring-your-own-key is configured & enabled.
    hasKey: function() {
      return !!(config.byok.enabled && config.byok.apiKey);
    },

    // Decide which provider a turn should use given its narrative significance.
    // Honors "premium key only in optimal circumstances".
    providerForSignificance: function(significance) {
      if (this.hasKey() && significance >= config.byok.significanceThreshold) {
        return 'byok';
      }
      if (config.defaultProvider === 'local' && config.local.ready) {
        return 'local';
      }
      return 'pollinations';
    }
  };
})(window);
