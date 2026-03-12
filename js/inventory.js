// inventory.js — Toolbox 3 slots (hotbar)
// Slot 0: Espada (sempre presente)
// Slot 1-2: Livres

const Inventory = (() => {

  var slots   = ['sword', null, null];
  var active  = 0;

  var ICONS = {
    sword: '🗡️',
    null:  '',
  };
  var NAMES = {
    sword: 'Espada',
  };

  function init() {
    render();
    // Teclas 1,2,3 trocam o slot ativo
    document.addEventListener('keydown', function(e) {
      if (e.code === 'Digit1') setActive(0);
      if (e.code === 'Digit2') setActive(1);
      if (e.code === 'Digit3') setActive(2);
    });
  }

  function setActive(idx) {
    active = idx;
    render();
  }

  function getActive() { return slots[active]; }

  function addItem(id, slotIdx) {
    // Nunca remove a espada
    if (slotIdx === 0) return;
    if (slotIdx !== undefined) { slots[slotIdx] = id; }
    else {
      // Primeiro slot vazio
      for (var i = 1; i < slots.length; i++) {
        if (!slots[i]) { slots[i] = id; break; }
      }
    }
    render();
  }

  function render() {
    var el = document.getElementById('hotbar');
    if (!el) return;
    el.innerHTML = '';
    slots.forEach(function(item, i) {
      var s = document.createElement('div');
      s.className = 'hotbar-slot' + (i === active ? ' active' : '');
      s.innerHTML = '<div class="hb-icon">' + (ICONS[item] || '') + '</div>'
                  + '<div class="hb-label">' + (NAMES[item] || '') + '</div>';
      s.addEventListener('click', function() { setActive(i); });
      el.appendChild(s);
    });
  }

  function isHoldingSword() { return slots[active] === 'sword'; }

  return { init, getActive, addItem, isHoldingSword };
})();