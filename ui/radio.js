// /ui/radio.js - Car Radio UI with Robust Shuffle Engine & Zero Path Failure
(function(global) {
  var audioElement = new Audio();
  audioElement.preload = 'none';

  var state = {
    powered: false,
    currentStationKey: 'cozy',
    trackIndex: 0,
    volume: 0.75,
    shuffle: true,
    shuffledPlaylist: []
  };

  var dom = {};

  function initDOM(container) {
    container.innerHTML =
      '<div class="uls-radio-widget">' +
        '<div class="radio-lcd">' +
          '<div class="lcd-station" id="radio-display-station">RADIO OFF</div>' +
          '<div class="lcd-track" id="radio-display-track">—</div>' +
          '<div class="lcd-time" id="radio-display-time">00:00 / 00:00</div>' +
        '</div>' +
        '<div class="radio-controls">' +
          '<button id="btn-radio-power" class="r-btn power-btn">PWR</button>' +
          '<button id="btn-radio-prev" class="r-btn">⏮</button>' +
          '<button id="btn-radio-play" class="r-btn">▶/⏸</button>' +
          '<button id="btn-radio-next" class="r-btn">⏭</button>' +
          '<button id="btn-radio-shuffle" class="r-btn active">SHUF</button>' +
          '<input type="range" id="radio-vol-slider" min="0" max="1" step="0.01" value="0.75">' +
        '</div>' +
        '<div class="radio-stations-bar" id="radio-stations-mount"></div>' +
      '</div>';

    dom.stationName = container.querySelector('#radio-display-station');
    dom.trackName = container.querySelector('#radio-display-track');
    dom.timeDisplay = container.querySelector('#radio-display-time');
    dom.powerBtn = container.querySelector('#btn-radio-power');
    dom.playBtn = container.querySelector('#btn-radio-play');
    dom.prevBtn = container.querySelector('#btn-radio-prev');
    dom.nextBtn = container.querySelector('#btn-radio-next');
    dom.shuffleBtn = container.querySelector('#btn-radio-shuffle');
    dom.volSlider = container.querySelector('#radio-vol-slider');
    dom.stationsBar = container.querySelector('#radio-stations-mount');

    bindEvents();
    renderStations();
  }

  function bindEvents() {
    dom.powerBtn.onclick = togglePower;
    dom.playBtn.onclick = togglePlay;
    dom.nextBtn.onclick = nextTrack;
    dom.prevBtn.onclick = prevTrack;
    dom.shuffleBtn.onclick = toggleShuffle;

    dom.volSlider.oninput = function() {
      state.volume = parseFloat(this.value);
      audioElement.volume = state.volume;
    };

    audioElement.ontimeupdate = function() {
      if (!state.powered) return;
      var cur = formatTime(audioElement.currentTime);
      var dur = formatTime(audioElement.duration || 0);
      dom.timeDisplay.textContent = cur + ' / ' + dur;
    };

    audioElement.onended = function() {
      if (state.powered) nextTrack();
    };

    audioElement.onerror = function() {
      if (!state.powered) return;
      console.warn('[CarRadio] Stream interrupted, advancing track.');
      setTimeout(nextTrack, 1000);
    };
  }

  function formatTime(secs) {
    if (isNaN(secs) || secs === 0) return '00:00';
    var m = Math.floor(secs / 60);
    var s = Math.floor(secs % 60);
    return (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
  }

  function getActiveStation() {
    return (global.RADIO_STATIONS && global.RADIO_STATIONS[state.currentStationKey]) || null;
  }

  function shuffleArray(arr) {
    var copy = arr.slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = copy[i];
      copy[i] = copy[j];
      copy[j] = temp;
    }
    return copy;
  }

  function loadCurrentTrack() {
    var station = getActiveStation();
    if (!station || !station.tracks || station.tracks.length === 0) return;

    var list = state.shuffle ? state.shuffledPlaylist : station.tracks;
    if (!list || list.length === 0) list = station.tracks;
    if (state.trackIndex >= list.length) state.trackIndex = 0;
    if (state.trackIndex < 0) state.trackIndex = list.length - 1;

    var track = list[state.trackIndex];
    dom.stationName.textContent = station.name.toUpperCase();
    dom.trackName.textContent = track.title;

    audioElement.src = track.url;
    audioElement.volume = state.volume;
    if (state.powered) {
      audioElement.play().catch(function(e) {});
    }

    global.eventBus.publish('radio.station.changed', { stationKey: station.id, name: station.name });
  }

  function renderStations() {
    if (!global.RADIO_STATIONS || !dom.stationsBar) return;
    dom.stationsBar.innerHTML = '';
    Object.keys(global.RADIO_STATIONS).forEach(function(key) {
      var st = global.RADIO_STATIONS[key];
      var btn = document.createElement('button');
      btn.className = 'st-btn' + (key === state.currentStationKey ? ' active' : '');
      btn.textContent = st.name.split(' ')[0];
      btn.onclick = function() {
        state.currentStationKey = key;
        state.trackIndex = 0;
        state.shuffledPlaylist = shuffleArray(st.tracks);
        document.querySelectorAll('.st-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        loadCurrentTrack();
      };
      dom.stationsBar.appendChild(btn);
    });
  }

  function togglePower() {
    state.powered = !state.powered;
    dom.powerBtn.classList.toggle('active', state.powered);
    if (state.powered) {
      global.GameAudio.play('radio_on_off');
      var st = getActiveStation();
      if (st) state.shuffledPlaylist = shuffleArray(st.tracks);
      loadCurrentTrack();
    } else {
      global.GameAudio.play('radio_off_click');
      audioElement.pause();
      dom.stationName.textContent = 'POWER OFF';
      dom.trackName.textContent = '—';
      dom.timeDisplay.textContent = '00:00 / 00:00';
    }
  }

  function togglePlay() {
    if (!state.powered) return;
    if (audioElement.paused) {
      audioElement.play().catch(function(e) {});
    } else {
      audioElement.pause();
    }
  }

  function nextTrack() {
    if (!state.powered) return;
    global.GameAudio.play('radio_tune_sweep');
    state.trackIndex++;
    loadCurrentTrack();
  }

  function prevTrack() {
    if (!state.powered) return;
    global.GameAudio.play('radio_tune_sweep');
    state.trackIndex--;
    loadCurrentTrack();
  }

  function toggleShuffle() {
    state.shuffle = !state.shuffle;
    dom.shuffleBtn.classList.toggle('active', state.shuffle);
    if (state.shuffle) {
      var st = getActiveStation();
      if (st) state.shuffledPlaylist = shuffleArray(st.tracks);
      state.trackIndex = 0;
    }
  }

  global.UIRadio = {
    mount: function(container) {
      initDOM(container);
    }
  };
})(window);
