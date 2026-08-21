// /systems/imageGen.js - Per-turn scene image generation (free, keyless, zero-token)
// Builds a Pollinations image URL from the scene text with a deterministic seed,
// caches by prompt+seed so repeat scenes never re-fetch, shows a themed gradient
// fallback instantly (with Ken Burns motion), then cross-fades in the generated
// image once it loads. Image generation costs no LLM tokens.
(function(global) {
  var STYLE = ', cinematic still, gritty cyberpunk noir, GTA loading-screen art style, dramatic neon lighting, rain-slick streets, volumetric fog, film grain, highly detailed, wide shot';
  var cache = {}; // sceneHash -> url

  function hash(str) {
    var h = 5381;
    str = String(str);
    for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  function buildUrl(scenePrompt, seed) {
    var cfg = global.AIConfig ? global.AIConfig.all().image : { model: 'flux', apiKey: '' };
    var prompt = String(scenePrompt || 'cyberpunk city street at night').slice(0, 400) + STYLE;
    var url = 'https://image.pollinations.ai/prompt/' + encodeURIComponent(prompt) +
      '?width=768&height=432&nologo=true&seed=' + seed +
      '&model=' + encodeURIComponent(cfg.model || 'flux');
    if (cfg.apiKey) url += '&key=' + encodeURIComponent(cfg.apiKey);
    return url;
  }

  function ensureLayers(wrapper) {
    var img = wrapper.querySelector('.scene-gen-img');
    if (!img) {
      img = document.createElement('img');
      img.className = 'scene-gen-img';
      img.alt = 'scene';
      // Insert behind the overlay badge but above the gradient fallback.
      wrapper.insertBefore(img, wrapper.firstChild);
    }
    return img;
  }

  global.ImageGen = {
    urlFor: buildUrl,

    // Apply a generated image to a scene-media wrapper element.
    // districtKey selects the instant gradient fallback class.
    apply: function(wrapper, scenePrompt, districtKey) {
      if (!wrapper) return;
      var enabled = global.AIConfig ? global.AIConfig.get('image.enabled', true) : true;

      // 1. Instant themed fallback with Ken Burns motion.
      var fallback = wrapper.querySelector('.scene-img');
      if (fallback) {
        fallback.className = 'scene-img kenburns district-' + (districtKey || 'market');
      }
      if (!enabled) return;

      // 2. Deterministic seed => consistent look for the same scene.
      var seed = hash(scenePrompt) % 100000;
      var key = seed + '|' + (scenePrompt || '').slice(0, 64);
      var url = cache[key] || buildUrl(scenePrompt, seed);
      cache[key] = url;

      var img = ensureLayers(wrapper);
      img.classList.remove('loaded');
      wrapper.classList.add('img-loading');

      // 3. Preload, then cross-fade in with Ken Burns.
      var loader = new Image();
      loader.onload = function() {
        img.src = url;
        img.classList.add('loaded', 'kenburns');
        wrapper.classList.remove('img-loading');
      };
      loader.onerror = function() {
        wrapper.classList.remove('img-loading');
        // Keep the animated gradient fallback; no blank card.
      };
      loader.src = url;
    },

    clearCache: function() { cache = {}; }
  };
})(window);
