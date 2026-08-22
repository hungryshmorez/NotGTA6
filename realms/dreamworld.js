// /realms/dreamworld.js - Dreamworld sleep-trial realm — AI narrated
// The narrator plays the dream itself. Door buttons apply the real boon/curse
// mechanic through the Dreamworld bridge; choosing a door resolves the trial
// and wakes the player in the city. Freeform actions are narrated in-dream.
(function(global) {
  var DOORS = [
    { id: 'red',  label: '🔴 The Red Door <span class="sub">fortune</span>',
      boons: ['lucid_fortune'], curses: [], risk: 0,
      act: 'push through the Red Door into a vault of impossible light' },
    { id: 'blue', label: '🔵 The Blue Door <span class="sub">will</span>',
      boons: ['unshakable_will'], curses: [], risk: 0.25, riskCurse: ['memory_debt'],
      act: 'enter the Blue Door and face the Court of Childhood Regrets' },
    { id: 'gold', label: '🟡 The Gold Door <span class="sub">durability</span>',
      boons: ['clockwork_heart'], curses: [], risk: 0.35, riskCurse: ['hall_of_glass'],
      act: 'step through the Gold Door toward the Clockwork Heart' }
  ];

  function chooseDoor(door) {
    global.eventBus.publish('dialogue.start');
    var boons = door.boons.slice();
    var curses = door.curses.slice();
    if (door.risk && Math.random() < door.risk) {
      boons = [];
      curses = curses.concat(door.riskCurse || []);
    }
    // Resolve after a beat so the narrated line lands first.
    setTimeout(function() {
      global.eventBus.publish('dialogue.end');
      global.DreamworldBridge.resolve({ boons: boons, curses: curses });
    }, 1400);
    return door.act;
  }

  function actions() {
    return DOORS.map(function(d) {
      return { label: d.label, run: function() { return chooseDoor(d); } };
    });
  }

  function mount(root) {
    global.Story.mount(root, {
      realm: 'dreamworld',
      badge: '💤 DREAMWORLD',
      districtKey: 'dreamworld',
      showTravel: false,
      opening: "You drift down a zero-gravity hallway where the walls breathe. Three doors hang in the dark, each humming a different promise. This is a trial, not a rest — what you carry out of the dream is yours to keep. Which door pulls at you?",
      openingChoices: ['Listen to the humming doors', 'Look for a way that isn\'t a door', 'Call out into the dark', 'Try to wake yourself up'],
      openingScene: 'surreal dreamscape, floating doors in a starry void, purple and blue, ethereal, zero gravity',
      actions: actions(),
      exit: null
    });
  }

  function unmount() { if (global.Story && global.Story.unmount) global.Story.unmount(); }

  global.RealmRouter.register('dreamworld', { mount: mount, unmount: unmount });
})(window);
