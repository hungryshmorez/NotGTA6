// /kernel/eventBus.js - Hardened Pub/Sub with Disposable Tokens & Error Isolation
(function(global) {
  var registry = {};
  var wildcardListeners = [];

  global.eventBus = {
    publish: function(topic, payload) {
      if (!topic) return;
      var subscribers = registry[topic] ? registry[topic].slice() : [];
      for (var i = 0; i < subscribers.length; i++) {
        try {
          subscribers[i](payload);
        } catch (err) {
          console.error('[EventBus Exception] Topic: "' + topic + '"', err);
        }
      }
      for (var j = 0; j < wildcardListeners.length; j++) {
        try {
          wildcardListeners[j]({ topic: topic, payload: payload });
        } catch (e) {}
      }
    },

    subscribe: function(topic, callback) {
      if (typeof callback !== 'function') return { dispose: function() {} };

      if (topic === '*') {
        wildcardListeners.push(callback);
        return {
          dispose: function() {
            wildcardListeners = wildcardListeners.filter(function(cb) { return cb !== callback; });
          }
        };
      }

      if (!registry[topic]) registry[topic] = [];
      registry[topic].push(callback);

      return {
        dispose: function() {
          if (!registry[topic]) return;
          registry[topic] = registry[topic].filter(function(cb) { return cb !== callback; });
          if (registry[topic].length === 0) delete registry[topic];
        }
      };
    },

    clearAll: function() {
      registry = {};
      wildcardListeners = [];
    }
  };
})(window);
