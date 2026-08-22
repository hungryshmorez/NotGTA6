// /assets-loader.js - Central Asset Ingestion & Initialization Engine
// Registers all data-driven sound packs into GameAudio and exposes a small
// helper for resolving image/audio URLs through the CDN normalizer. Scripts
// are already loaded via <script> tags in index.html; this wires their
// payloads into the runtime in the correct order.
(function(global) {
  global.AssetsLoader = {
    init: function() {
      // 1. Register SFX packs.
      if (global.GameAudio && global.SFX_PAYLOAD && global.SFX_PAYLOAD.sfx_packs) {
        for (var i = 0; i < global.SFX_PAYLOAD.sfx_packs.length; i++) {
          global.GameAudio.registerPack(global.SFX_PAYLOAD.sfx_packs[i]);
        }
      }
      // 2. Normalize remote SFX paths through the CDN resolver, but leave
      //    locally-bundled files (assets/…) alone so they load from the site.
      if (global.ULSConfig && global.SFX_PAYLOAD && global.SFX_PAYLOAD.sfx_packs) {
        global.SFX_PAYLOAD.sfx_packs.forEach(function(pack) {
          (pack.items || []).forEach(function(item) {
            if (item.path && !/^(assets\/|\.\/|\/)/.test(item.path)) {
              item.path = global.ULSConfig.resolve(item.path);
            }
          });
        });
      }
      console.log('[AssetsLoader] Manifests ingested.');
    },

    image: function(path) {
      return global.ULSConfig ? global.ULSConfig.resolve(path) : path;
    }
  };
})(window);
