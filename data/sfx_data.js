// /data/sfx_data.js - Complete SFX Sound Pack Manifest
// Registered into GameAudio at boot. Paths are optional; when a file is
// absent the audio engine's error guard silently no-ops, so gameplay never
// blocks on a missing asset. Populate `path` with real CDN URLs to enable.
(function(global) {
  global.SFX_PAYLOAD = {
    version: 1,
    sfx_packs: [
      {
        id: 'core_ui',
        items: [
          { id: 'cash',            path: '', gain: 0.9, tags: ['sfx', 'ui'] },
          { id: 'ui_error',        path: '', gain: 0.8, tags: ['sfx', 'ui'] },
          { id: 'ui_click',        path: 'https://file.garden/aNQEj1MKyWDQ8eyI/sfx/%F0%9F%8C%86%20Immersion%20Layers/click.wav', gain: 0.6, tags: ['sfx', 'ui'] },
          { id: 'ui_confirm',      path: '', gain: 0.7, tags: ['sfx', 'ui'] }
        ]
      },
      {
        id: 'radio_hardware',
        items: [
          { id: 'radio_on_off',    path: '', gain: 0.7, tags: ['sfx', 'radio'] },
          { id: 'radio_off_click', path: '', gain: 0.6, tags: ['sfx', 'radio'] },
          { id: 'radio_tune_sweep',path: '', gain: 0.6, tags: ['sfx', 'radio'] }
        ]
      },
      {
        id: 'anomaly',
        items: [
          { id: 'glitch',          path: '', gain: 1.0, tags: ['sfx', 'anomaly'] },
          { id: 'heartbeat',       path: '', gain: 0.8, loop: true, tags: ['sfx', 'anomaly'] }
        ]
      },
      {
        id: 'ambient_loops',
        items: [
          { id: 'city_ambience',   path: '', gain: 0.5, loop: true, tags: ['ambient'] },
          { id: 'rain_loop',       path: '', gain: 0.5, loop: true, tags: ['ambient'] },
          { id: 'backrooms_hum',   path: '', gain: 0.6, loop: true, tags: ['ambient'] }
        ]
      }
    ]
  };
})(window);
