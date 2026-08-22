// /ui/radioAds.js - Parody commercial breaks on the car radio
// When the station/track changes on a powered radio, occasionally runs a short
// in-world "commercial break" as a text ticker on the radio widget (music keeps
// playing underneath). Uses the looted parody ad copy in data/radio_ads.js.
(function(global) {
  var lastAdAt = 0;
  var COOLDOWN_MS = 45000;   // at most one ad per ~45s
  var CHANCE = 0.4;          // 40% of eligible station changes
  var running = false;

  function widget() { return document.querySelector('.uls-radio-widget'); }

  function runAd() {
    var w = widget();
    if (!w || running) return;
    var ads = global.RADIO_ADS;
    if (!ads || !ads.length) return;
    var ad = ads[Math.floor(Math.random() * ads.length)];
    running = true;
    lastAdAt = Date.now();

    var banner = document.createElement('div');
    banner.className = 'radio-ad';
    w.appendChild(banner);
    if (global.GameAudio) global.GameAudio.play('radio_tune_sweep');

    var lines = ['📻 COMMERCIAL BREAK — ' + ad.brand].concat(ad.lines);
    var i = 0;
    function step() {
      if (i >= lines.length) {
        banner.classList.remove('show');
        setTimeout(function() { if (banner.parentNode) banner.parentNode.removeChild(banner); running = false; }, 400);
        return;
      }
      banner.textContent = lines[i];
      banner.classList.add('show');
      i++;
      setTimeout(step, i === 1 ? 1400 : 1800);
    }
    step();
  }

  global.eventBus.subscribe('radio.station.changed', function() {
    if (running) return;
    if (Date.now() - lastAdAt < COOLDOWN_MS) return;
    if (Math.random() > CHANCE) return;
    // Small delay so the ad reads as a break after the track loads.
    setTimeout(runAd, 600);
  });

  global.RadioAds = { play: runAd };
})(window);
