// /realms/ulsCity.js - ULS City Hub realm (Chroma City)
// AI-narrated open sandbox. The Story engine owns the scene card; this realm
// supplies the city config (travel bar on, a fixer action to burn HEAT) and
// keeps the scene meta in sync with ambient world changes.
(function(global) {
  function payFixer() {
    var money = global.saveState.get('global.money', 0);
    if (money < 200) {
      global.eventBus.publish('ui.toast', 'Not enough cash for the fixer ($200).');
      global.GameAudio.play('ui_error');
      return 'try to pay a fixer to cool my heat but come up short on cash';
    }
    global.Economy.adjust(-200, 'fixer bribe');
    var stats = global.saveState.get('global');
    stats.heat = Math.max(0, stats.heat - 40);
    global.saveState.set('global', stats);
    global.eventBus.publish('player.stats.updated', stats);
    return 'slip a fixer $200 to make the heat disappear';
  }

  function mount(root) {
    global.Story.mount(root, {
      realm: 'uls',
      showTravel: true,
      actions: [
        { label: '🏍️ Take a courier run', run: function() {
            global.ArcadeHooks.drive({ mode: 'gig', reward: 80, rep: 4, difficulty: 1 });
            return null;
        } },
        { label: '🚗 Make a run for it (lose the cops)', run: function() {
            if (global.saveState.get('global.heat', 0) < 10) {
              return 'gun the engine for a joyride, but there are no cops on me to lose';
            }
            global.ArcadeHooks.drive({ mode: 'chase', difficulty: 1.3 });
            return null;
        } },
        { label: '🥊 Start a street brawl', run: function() {
            global.ArcadeHooks.fight({
              enemyName: 'Street Tough', difficulty: 1, damage: 15,
              reward: 120, rep: 6, healthLoss: 22, heatOnLoss: 8,
              winText: 'win a brutal street brawl and pocket the loser\'s cash',
              loseText: 'lose a street brawl and stagger off bloodied'
            });
            return null; // async: mini-game narrates its own outcome
        } },
        { label: '🔓 Crack a locked storefront', run: function() {
            global.ArcadeHooks.skill({
              type: 'lockpick', pins: 3, reward: 60, perScore: 40, heatOnWin: 12, heatOnLoss: 8,
              winText: 'jimmy the storefront lock and clean out the register',
              loseText: 'snap a pick in the lock and set off the alarm'
            });
            return null;
        } },
        { label: '✋ Pick a pocket', run: function() {
            global.ArcadeHooks.skill({
              type: 'pickpocket', reward: 30, perScore: 40, heatOnLoss: 6,
              winText: 'lift a fat wallet without them feeling a thing',
              loseText: 'get your hand caught mid-dip and have to run'
            });
            return null;
        } },
        { label: '💻 Hack a cash machine', run: function() {
            global.ArcadeHooks.skill({
              type: 'hack', len: 5, reward: 100, perScore: 20, heatOnWin: 10,
              winText: 'crack the ATM firmware and drain a stack of bills',
              loseText: 'trip the ATM lockout and get nothing'
            });
            return null;
        } },
        { label: '🕵️ Pay a fixer to cool the heat ($200)', run: payFixer }
      ]
    });

    global.RealmRouter.bindRealmListener('time.phase.changed', function() { global.Story.refresh(); });
    global.RealmRouter.bindRealmListener('player.stats.updated', function() { global.Story.refresh(); });
  }

  function unmount() {
    if (global.Story && global.Story.unmount) global.Story.unmount();
  }

  global.RealmRouter.register('uls', { mount: mount, unmount: unmount });
})(window);
