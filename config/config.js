// /config/config.js - URL Normalizer & File Garden CDN Resolver
(function(global) {
  var CDN_BASE = 'https://file.garden/aNQEj1MKyWDQ8eyI/';

  global.ULSConfig = {
    cdnBase: CDN_BASE,
    version: '2.0.0',

    // Normalize any asset path into a fully-qualified, browser-safe URL.
    // - Absolute http(s) / data / blob URLs pass through untouched.
    // - Relative paths are resolved against the File Garden CDN root.
    // - Spaces and unsafe characters in the path segment are encoded.
    resolve: function(path) {
      if (!path) return '';
      var p = String(path).trim();
      if (/^(https?:|data:|blob:)/i.test(p)) return this.encodePath(p);
      p = p.replace(/^\.?\//, '');
      return this.encodePath(CDN_BASE + p);
    },

    // Encode only the path portion of a URL, preserving the origin and any
    // already-encoded sequences so we never double-encode ("%20" -> "%2520").
    encodePath: function(url) {
      try {
        var m = /^([a-z]+:\/\/[^\/]+)(\/.*)?$/i.exec(url);
        if (!m) return url;
        var origin = m[1];
        var rest = m[2] || '';
        var parts = rest.split('/');
        for (var i = 0; i < parts.length; i++) {
          if (/%[0-9a-fA-F]{2}/.test(parts[i])) continue; // already encoded
          parts[i] = encodeURIComponent(parts[i]);
        }
        return origin + parts.join('/');
      } catch (e) {
        return url;
      }
    }
  };
})(window);
