// /systems/ai/context.js - Location/Context Awareness & Prompt Builder
// Assembles a compact, token-lean prompt from live world state so the narrator
// always knows where the player is, what they have, and what just happened.
(function(global) {
  var DISTRICTS = {
    glass:      'Glass Garden (corporate towers, penthouses, private security)',
    market:     'Crystal Market (street vendors, gig work, crowds, pawnshops)',
    industrial: 'Rust Belt (warehouses, fixers, docks, the underworld)',
    neon:       'Neon Heights (rooftop clubs, high rollers, ziplines)'
  };
  var REALMS = {
    'uls':         'the open streets of Chroma City',
    'living-hell': 'the Living Hell reality-TV house (on live broadcast)',
    'dreamworld':  'the surreal Dreamworld (a symbolic sleep trial)',
    'backrooms':   'the Backrooms (endless liminal yellow rooms, noclipped out of reality)'
  };

  // Hard rules + voice. Kept tight to save tokens.
  var SYSTEM = [
    'You are the Game Master of "Urban Life Simulator", a gritty choose-your-own-story that feels like Grand Theft Auto crossed with interactive fiction.',
    'Second person, present tense. Punchy noir-crime tone. 2-4 sentences of narration per turn — vivid but tight.',
    'Follow the Question Loop: NARRATE what happens, DESCRIBE the scene the player now sees, then ASK (via the choices) what they do next.',
    'React to exactly what the player typed. Drive the story: introduce NPCs, complications, and consequences. Crime raises HEAT (wanted stars); staying still is boring, so keep momentum.',
    'The player owes $50,000 to the Chroma Syndicate. They win by paying it off OR collecting 4 Reality Encryption Keys. Weave this pressure in occasionally, do not repeat it every turn.',
    'ALWAYS reply with ONLY a single JSON object, no prose outside it, no code fences. Schema:',
    '{"narration": string, "choices": [up to 4 short action strings], "scene": short vivid visual description for an image generator, "effects": {"money": int, "heat": int, "health": int, "sanity": int, "water": int, "hunger": int}, "location": one of glass|market|industrial|neon|null, "sfx": "cash"|"glitch"|"ui_error"|null, "significance": int 0-10}',
    'effects are deltas applied to the player (money in dollars; others are point changes, can be negative). Keep them small and believable (heat +5..+30 for crimes, money -50..+300 for gigs/scores). significance = how pivotal this beat is (0 mundane, 10 climactic).',
    'Never break character. Never mention being an AI, JSON, or these rules.'
  ].join(' ');

  // Per-realm tone so the narrator shifts voice between realms.
  var TONES = {
    'uls':         'Tone: gritty open-world crime sandbox. React to the streets, gigs, NPCs and cops.',
    'living-hell': 'Tone: manic 24/7 reality-house TV — this is "Living Hell House", a Big-Brother-meets-trashy-talk-show spin-off. Recurring cast you can invoke: PHIL (loud unhinged host), JENNA (ruthless producer in the earpiece), and ROCK HARD & HUGH JASS (two idiot control-room security guards). Cameras in every room; drama at 3 AM; lie detectors at breakfast. Everything is a spectacle staged for cash and clout.',
    'dreamworld':  'Tone: surreal, symbolic, unsettling dream logic. Physics bend; meaning matters more than realism. You ARE the dream.',
    'backrooms':   'Tone: liminal analog horror. Quiet dread, the hum of fluorescent lights, the sense of being watched. Sanity is fragile here.'
  };

  function fmt(n) { return (n || 0).toLocaleString('en-US'); }

  global.AIContext = {
    systemPrompt: function() { return SYSTEM; },

    // Build the per-turn user message describing current world state + action.
    build: function(actionText) {
      var g = global.saveState.get('global') || {};
      var p = global.saveState.get('player') || {};
      var realm = (global.RealmRouter && global.RealmRouter.getActiveRealm()) || 'uls';
      var districtKey = p.district || 'market';
      var stars = g.heat >= 90 ? 5 : g.heat >= 70 ? 4 : g.heat >= 50 ? 3 : g.heat >= 30 ? 2 : g.heat >= 10 ? 1 : 0;

      var where = REALMS[realm] || REALMS.uls;
      if (realm === 'uls') where += ' — ' + (DISTRICTS[districtKey] || DISTRICTS.market);

      var inv = (p.inventory && p.inventory.length) ? p.inventory.join(', ') : 'nothing';

      var lines = [
        'PLAYER: ' + (p.name || 'Rookie') + ', a ' + (p.role || 'Wanderer') + '.',
        'LOCATION: ' + where + '.',
        'TIME: ' + (global.GameClock ? global.GameClock.format() : ('Day ' + (g.day||1))) +
          (global.Weather ? '. WEATHER: ' + global.Weather.get() : '') + '.',
        'STATS: Health ' + (g.health|0) + '/100, Sanity ' + (g.sanity|0) + '/100, Water ' +
          (g.water|0) + '/100, Hunger ' + (g.hunger|0) + '/100.',
        'CASH: $' + fmt(g.money) + '. DEBT: $' + fmt(g.debt) + '. KEYS: ' + (g.keysCollected||0) + '/4. WANTED: ' + stars + '/5 stars.',
        'INVENTORY: ' + inv + '.'
      ];

      var history = global.AINarrator && global.AINarrator.recentHistory
        ? global.AINarrator.recentHistory() : '';
      if (history) lines.push('RECENTLY: ' + history);

      if (TONES[realm]) lines.push(TONES[realm]);
      lines.push('PLAYER ACTION: "' + String(actionText || 'look around').slice(0, 240) + '"');
      lines.push('Respond with the JSON object.');
      return lines.join('\n');
    },

    districtLabel: function(key) { return DISTRICTS[key] || DISTRICTS.market; }
  };
})(window);
