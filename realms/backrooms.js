// /realms/backrooms.js - The Backrooms liminal scavenge realm — AI narrated
// The narrator plays the maze. Scavenge/exit/distract buttons apply the real
// mechanics (almond water, artifacts, Reality Encryption Key fragments, sanity
// drain, finding the fire exit); outcomes are narrated with a fresh image.
(function(global) {
  var roomsSearched = 0;

  function drainSanity(n) {
    var stats = global.saveState.get('global');
    stats.sanity = Math.max(0, stats.sanity - n);
    global.saveState.set('global', stats);
    global.eventBus.publish('player.stats.updated', stats);
  }

  function searchRoom() {
    roomsSearched++;
    drainSanity(4);
    var roll = Math.random();
    var outcome;
    if (roll < 0.18) {
      global.Economy.grantKey();
      outcome = 'pry back peeling wallpaper and find a humming crystalline shard — a Reality Encryption Key fragment';
    } else if (roll < 0.45) {
      var stats = global.saveState.get('global');
      stats.water = Math.min(100, stats.water + 30);
      stats.sanity = Math.min(100, stats.sanity + 20);
      global.saveState.set('global', stats);
      global.eventBus.publish('player.stats.updated', stats);
      outcome = 'find a sealed flask of Almond Water that steadies my mind and quenches my thirst';
    } else if (roll < 0.7) {
      var cash = 40 + Math.floor(Math.random() * 160);
      global.Economy.adjust(cash, 'backrooms artifact');
      outcome = 'crack a dead terminal for a black-market crypto wallet worth $' + cash;
    } else {
      outcome = 'search a cubicle and find only dust, empty drawers, and the endless hum';
    }
    checkSanity();
    return outcome;
  }

  function distract() {
    drainSanity(1);
    return 'hurl a soda can down a distant corridor to lure whatever is shuffling in the dark away from me';
  }

  function findExit() {
    drainSanity(3);
    var chance = 0.35 + Math.min(0.4, roomsSearched * 0.08);
    if (Math.random() < chance) {
      global.saveState.set('slices.backrooms.glitchedOnce', false);
      global.GameAudio.stop('backrooms_hum');
      setTimeout(function() {
        if (global.RealmRouter.isRegistered('uls')) global.RealmRouter.go('uls');
      }, 1400);
      return 'shove open a heavy fire door and spill out into a rain-soaked city alley — I MADE IT OUT';
    }
    return 'chase a flickering EXIT sign only to find it was a trap, the red neon leading deeper into the maze';
  }

  function checkSanity() {
    if (global.saveState.get('global.sanity', 100) <= 0) {
      global.GameAudio.stop('backrooms_hum');
      global.saveState.set('slices.backrooms.glitchedOnce', false);
      global.eventBus.publish('ui.toast', '🌀 Your mind slips. The Backrooms spit you back into the city.');
      setTimeout(function() {
        if (global.RealmRouter.isRegistered('uls')) global.RealmRouter.go('uls');
      }, 800);
    }
  }

  function mount(root) {
    roomsSearched = 0;
    global.GameAudio.play('backrooms_hum');
    global.Story.mount(root, {
      realm: 'backrooms',
      badge: '🟨 LEVEL 0 — NOCLIP',
      districtKey: 'backrooms',
      showTravel: false,
      opening: "Endless damp yellow carpet. The fluorescent hum presses on the back of your skull like a thumb. You noclipped clean out of reality — and somewhere in this mono-yellow maze is the way back, plus things worth taking. Reality Encryption Key fragments hide in the walls. Move carefully; your sanity is the only fuel you've got.",
      openingChoices: ['Read the graffiti on the wall', 'Listen for the entity', 'Follow the least-wrong corridor', 'Steady your breathing'],
      openingScene: 'endless liminal yellow wallpaper rooms, damp carpet, buzzing fluorescent lights, backrooms',
      actions: [
        { label: '🔦 Search a cubicle', run: searchRoom },
        { label: '🚪 Look for the fire exit', run: findExit },
        { label: '🥤 Throw a soda can (distract)', run: distract }
      ],
      exit: null
    });
  }

  function unmount() {
    global.GameAudio.stop('backrooms_hum');
    if (global.Story && global.Story.unmount) global.Story.unmount();
  }

  global.RealmRouter.register('backrooms', { mount: mount, unmount: unmount });
})(window);
