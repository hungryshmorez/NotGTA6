// /ui/characterCreation.js - Role Customization & Mode Toggle
// Shown once on a fresh save. Captures name, role (sanitized unless adult
// mode is enabled), and the brand-safe content toggle, then seeds player state.
(function(global) {
  var overlay = null;

  function alreadyOnboarded() {
    return !!global.saveState.get('player.onboarded', false);
  }

  function render(onDone) {
    overlay = document.createElement('div');
    overlay.className = 'uls-modal-overlay';
    overlay.innerHTML =
      '<div class="uls-modal cc-modal">' +
        '<div class="modal-head"><h3>Arrival in Chroma</h3></div>' +
        '<p class="cc-intro">The Chroma Syndicate owns your $50,000 debt. Pay it — or tear ' +
          'four Reality Encryption Keys out of the simulation and noclip free.</p>' +
        '<label class="cc-field"><span>Name</span>' +
          '<input type="text" id="cc-name" maxlength="24" value="Rookie" /></label>' +
        '<label class="cc-field"><span>Role</span>' +
          '<input type="text" id="cc-role" maxlength="40" value="Wanderer" placeholder="e.g. Courier, Crew Member, Street Merchant" /></label>' +
        '<div class="cc-roles" id="cc-roles"></div>' +
        '<label class="cc-check"><input type="checkbox" id="cc-adult" /> ' +
          '<span>Adult mode (disables content sanitization)</span></label>' +
        '<button id="cc-start" class="btn-primary cc-start">Enter Chroma City</button>' +
      '</div>';
    document.body.appendChild(overlay);

    // Suggested roles for inspiration (looted concept from the canonical ULS).
    var SUGGESTED = ['Courier', 'Street Merchant', 'Crew Member', 'Hacker', 'Fixer',
      'Bounty Hunter', 'Nightlife Performer', 'Corporate Exec', 'Cab Driver', 'Drifter'];
    var rolesMount = overlay.querySelector('#cc-roles');
    SUGGESTED.forEach(function(role) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'cc-role-chip';
      chip.textContent = role;
      chip.onclick = function() { overlay.querySelector('#cc-role').value = role; };
      rolesMount.appendChild(chip);
    });

    overlay.querySelector('#cc-start').onclick = function() {
      var name = (overlay.querySelector('#cc-name').value || 'Rookie').trim() || 'Rookie';
      var rawRole = (overlay.querySelector('#cc-role').value || 'Wanderer').trim() || 'Wanderer';
      var adult = overlay.querySelector('#cc-adult').checked;

      global.saveState.set('player.adultMode', adult);
      var role = global.SafetyRuntime.sanitizeRole(rawRole);
      global.saveState.set('player.name', name);
      global.saveState.set('player.rawRole', rawRole);
      global.saveState.set('player.role', role);
      global.saveState.set('player.onboarded', true);

      close();
      if (typeof onDone === 'function') onDone();
    };
  }

  function close() {
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    overlay = null;
  }

  global.CharacterCreation = {
    maybeShow: function(onDone) {
      if (alreadyOnboarded()) {
        if (typeof onDone === 'function') onDone();
        return;
      }
      render(onDone);
    },
    force: render
  };
})(window);
