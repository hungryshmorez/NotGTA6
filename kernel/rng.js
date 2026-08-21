// /kernel/rng.js - Deterministic PRNG (Mulberry32) for reproducible runs
(function(global) {
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function() {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var seed = (Date.now() & 0xffffffff) >>> 0;
  var gen = mulberry32(seed);

  global.RNG = {
    seed: function(s) {
      seed = (s >>> 0);
      gen = mulberry32(seed);
    },
    getSeed: function() { return seed; },
    // Float in [0, 1)
    next: function() { return gen(); },
    // Integer in [min, max] inclusive
    int: function(min, max) {
      return Math.floor(gen() * (max - min + 1)) + min;
    },
    // Random element from an array
    pick: function(arr) {
      if (!arr || !arr.length) return null;
      return arr[Math.floor(gen() * arr.length)];
    },
    // True with probability p
    chance: function(p) { return gen() < p; }
  };
})(window);
