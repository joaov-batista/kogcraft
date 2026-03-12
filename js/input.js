// input.js — Teclado + Mouse
// Agachar: Q | Correr: Shift | Pular: Espaco | Chat: T | Pause: Esc

const Input = (() => {

  const keys = {};
  let mouseDX = 0, mouseDY = 0;
  let locked   = false;
  let chatMode = false;

  // Teclas que o jogo usa — preventDefault impede atalhos do browser
  const GAME_KEYS = new Set([
    'KeyW','KeyA','KeyS','KeyD',
    'KeyQ','KeyF','KeyG','KeyE',
    'Space','ShiftLeft','ShiftRight',
    'ArrowUp','ArrowDown','ArrowLeft','ArrowRight',
    'F1','F3',
  ]);

  function init() {
    document.addEventListener('keydown', function(e) {
      // Bloqueia atalhos perigosos do browser durante o jogo
      if (e.code === 'KeyS' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); return; }
      if (e.code === 'KeyD' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); return; }
      if (e.code === 'KeyR' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); return; }
      if (e.code === 'F5')  { e.preventDefault(); return; }

      if (chatMode) return;

      // Previne comportamento padrão das teclas do jogo (scroll, etc)
      if (GAME_KEYS.has(e.code)) e.preventDefault();

      keys[e.code] = true;

      if (e.code === 'KeyT') {
        ChatSystem.open();
        return;
      }

      if (e.code === 'Escape') {
        if (locked) unlock();
        else UI.togglePause();
      }
    });

    document.addEventListener('keyup', function(e) {
      keys[e.code] = false;
    });

    // Pointer Lock — clique no canvas trava o mouse
    var canvas = document.getElementById('game-canvas');
    canvas.addEventListener('click', function() {
      if (!chatMode) canvas.requestPointerLock();
    });

    document.addEventListener('pointerlockchange', function() {
      locked = document.pointerLockElement === canvas;
    });

    document.addEventListener('mousemove', function(e) {
      if (!locked) return;
      mouseDX += e.movementX;
      mouseDY += e.movementY;
    });
  }

  function consumeMouse() {
    var dx = mouseDX, dy = mouseDY;
    mouseDX = 0; mouseDY = 0;
    return { dx: dx, dy: dy };
  }

  function unlock() {
    document.exitPointerLock();
  }

  function setChatMode(v) {
    chatMode = v;
    if (v) {
      for (var k in keys) keys[k] = false;
      unlock();
    } else {
      var canvas = document.getElementById('game-canvas');
      canvas.requestPointerLock();
    }
  }

  function isDown(code) { return !!keys[code]; }
  function isLocked()   { return locked; }

  return { init, isDown, consumeMouse, isLocked, setChatMode };
})();