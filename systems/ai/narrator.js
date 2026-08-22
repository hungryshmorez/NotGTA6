// /systems/ai/narrator.js - Tiered AI narration router
// Routes each turn to the cheapest capable provider, escalating to a
// bring-your-own-key model only for high-significance beats. Always resolves
// to a valid response object via a scripted fallback, so the story never stalls
// even offline or when a provider fails.
(function(global) {
  var history = [];          // [{ action, narration }]
  var MAX_HISTORY = 6;
  var inFlight = false;

  // ---- Provider calls (all OpenAI-compatible chat completions) ----

  function chatCompletion(url, apiKey, model, messages, timeoutMs) {
    var controller = new AbortController();
    var to = setTimeout(function() { controller.abort(); }, timeoutMs || 30000);
    var headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = 'Bearer ' + apiKey;

    return fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.9,
        max_tokens: 500,
        response_format: { type: 'json_object' }
      }),
      signal: controller.signal
    }).then(function(res) {
      clearTimeout(to);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).then(function(data) {
      var msg = data && data.choices && data.choices[0] && data.choices[0].message;
      return (msg && msg.content) ? msg.content : '';
    });
  }

  function callPollinations(messages) {
    var model = global.AIConfig.get('textModel', 'openai');
    return chatCompletion('https://text.pollinations.ai/openai', '', model, messages);
  }

  function callBYOK(messages) {
    var endpoint = global.AIConfig.get('byok.endpoint');
    var key = global.AIConfig.get('byok.apiKey');
    var model = global.AIConfig.get('byok.model', 'claude');
    return chatCompletion(endpoint, key, model, messages, 45000);
  }

  function callLocal(messages) {
    if (global.LocalModel && global.LocalModel.isReady()) {
      return global.LocalModel.chat(messages);
    }
    return Promise.reject(new Error('local model not ready'));
  }

  function dispatch(provider, messages) {
    if (provider === 'byok') return callBYOK(messages);
    if (provider === 'local') return callLocal(messages);
    return callPollinations(messages);
  }

  // ---- Response parsing ----

  function extractJSON(text) {
    if (!text) return null;
    var s = String(text).trim();
    // Strip code fences if a model added them despite instructions.
    s = s.replace(/^```(?:json)?/i, '').replace(/```$/,'').trim();
    // Grab the outermost JSON object.
    var start = s.indexOf('{');
    var end = s.lastIndexOf('}');
    if (start === -1 || end === -1 || end < start) return null;
    try { return JSON.parse(s.slice(start, end + 1)); }
    catch (e) { return null; }
  }

  function normalize(obj, actionText) {
    obj = obj || {};
    var eff = obj.effects || {};
    return {
      narration: String(obj.narration || '').trim() ||
        global.SafetyRuntime.filterText('You take it in and press on.'),
      choices: Array.isArray(obj.choices) ? obj.choices.filter(Boolean).slice(0, 4).map(String) : [],
      scene: String(obj.scene || obj.narration || '').slice(0, 300),
      effects: {
        money: eff.money | 0, heat: eff.heat | 0, health: eff.health | 0,
        sanity: eff.sanity | 0, water: eff.water | 0, hunger: eff.hunger | 0
      },
      location: ['glass', 'market', 'industrial', 'neon'].indexOf(obj.location) !== -1 ? obj.location : null,
      sfx: ['cash', 'glitch', 'ui_error'].indexOf(obj.sfx) !== -1 ? obj.sfx : null,
      significance: Math.max(0, Math.min(10, obj.significance | 0)),
      _fallback: false
    };
  }

  // ---- Scripted fallback (offline / provider failure) ----

  var CRIME_CUES = ['steal', 'rob', 'shoot', 'jack', 'mug', 'break in', 'heist', 'attack', 'hotwire', 'fight', 'punch'];
  var FALLBACK_LINES = [
    'The city breathes neon and exhaust around you. Somewhere a siren winds up and dies.',
    'Rain ticks off a busted gutter. A dealer clocks you, then looks away.',
    'The street keeps moving whether you do or not. A drone hums past overhead.',
    'Your reflection warps in a puddle of streetlight. The Syndicate clock is always ticking.'
  ];

  function scriptedFallback(actionText) {
    var txt = String(actionText || '').toLowerCase();
    var isCrime = CRIME_CUES.some(function(c) { return txt.indexOf(c) !== -1; });
    var line = FALLBACK_LINES[Math.floor(Math.random() * FALLBACK_LINES.length)];
    var narration = global.SafetyRuntime.filterText('You ' +
      (actionText ? String(actionText).slice(0, 60) : 'look around') + '. ' + line);
    return {
      narration: narration,
      choices: ['Look around', 'Head to the market', 'Find a gig', 'Lie low'],
      scene: 'gritty cyberpunk city street, ' +
        (global.Weather ? global.Weather.get() : 'night') + ', neon reflections',
      effects: isCrime ? { money: 0, heat: 12, health: 0, sanity: 0, water: 0, hunger: 0 }
                       : { money: 0, heat: 0, health: 0, sanity: 0, water: 0, hunger: 0 },
      location: null,
      sfx: isCrime ? 'ui_error' : null,
      significance: 2,
      _fallback: true
    };
  }

  // ---- Public API ----

  global.AINarrator = {
    isBusy: function() { return inFlight; },

    recentHistory: function() {
      if (!history.length) return '';
      return history.slice(-2).map(function(h) {
        return h.narration.slice(0, 120);
      }).join(' … ');
    },

    // Estimate significance before we know the model's own rating, so BYOK
    // routing can trigger on obviously pivotal actions (keeps tokens lean).
    preSignificance: function(actionText) {
      var txt = String(actionText || '').toLowerCase();
      var big = ['heist', 'kill', 'boss', 'syndicate', 'escape', 'key', 'raid', 'deal of a lifetime'];
      return big.some(function(w) { return txt.indexOf(w) !== -1; }) ? 8 : 3;
    },

    // Main entry: returns a Promise<responseObject>. Never rejects.
    narrate: function(actionText) {
      if (inFlight) return Promise.resolve(scriptedFallback(actionText));
      inFlight = true;

      var messages = [
        { role: 'system', content: global.AIContext.systemPrompt() },
        { role: 'user', content: global.AIContext.build(actionText) }
      ];
      var provider = global.AIConfig.providerForSignificance(this.preSignificance(actionText));

      var self = this;
      return dispatch(provider, messages)
        .then(function(raw) {
          var parsed = extractJSON(raw);
          if (!parsed) throw new Error('unparseable response');
          return normalize(parsed, actionText);
        })
        .catch(function(err) {
          console.warn('[AINarrator] ' + provider + ' failed, using fallback:', err.message);
          // One retry on the free provider before giving up to scripted mode.
          if (provider !== 'pollinations') {
            return callPollinations(messages)
              .then(function(raw) {
                var parsed = extractJSON(raw);
                return parsed ? normalize(parsed, actionText) : scriptedFallback(actionText);
              })
              .catch(function() { return scriptedFallback(actionText); });
          }
          return scriptedFallback(actionText);
        })
        .then(function(resp) {
          inFlight = false;
          history.push({ action: actionText, narration: resp.narration });
          if (history.length > MAX_HISTORY) history.shift();
          resp._provider = provider;
          return resp;
        });
    },

    reset: function() { history = []; },

    // Raw text completion for features that need free-form prose (e.g. the
    // Monkey's Paw), not the game JSON contract. Resolves to '' on failure.
    complete: function(system, user) {
      var messages = [{ role: 'system', content: system }, { role: 'user', content: user }];
      var provider = (global.AIConfig.hasKey() && global.AIConfig.get('byok.enabled')) ? 'byok'
        : (global.AIConfig.get('defaultProvider') === 'local' && global.LocalModel && global.LocalModel.isReady()) ? 'local'
        : 'pollinations';
      return dispatch(provider, messages)
        .then(function(raw) { return String(raw || '').trim(); })
        .catch(function() {
          if (provider !== 'pollinations') return callPollinations(messages).then(function(r){ return String(r||'').trim(); }).catch(function(){ return ''; });
          return '';
        });
    }
  };

  global.eventBus.subscribe('state.reset', function() { history = []; });
})(window);
