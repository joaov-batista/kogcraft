// chat.js — Chat global em tempo real
// Mensagens somem apos 10s se chat fechado
// Maximo 8 mensagens visiveis ao mesmo tempo

const ChatSystem = (() => {

  let isOpen      = false;
  let unsubChat   = null;
  let playerName  = '';
  const MAX_MSGS  = 8;       // maximo de mensagens visiveis
  const FADE_MS   = 10000;   // some apos 10s com chat fechado
  let msgTimers   = [];      // timers de fade por mensagem

  function init(name) {
    playerName = name;

    var input = document.getElementById('chat-input');
    input.addEventListener('keydown', function(e) {
      e.stopPropagation();
      if (e.code === 'Enter') {
        var txt = input.value.trim();
        if (txt) send(txt);
        input.value = '';
        close();
      }
      if (e.code === 'Escape') {
        input.value = '';
        close();
      }
    });

    // Escuta mensagens novas do Firestore
    unsubChat = DB.collection('chat')
      .orderBy('ts', 'asc')
      .limitToLast(MAX_MSGS)
      .onSnapshot(function(snap) {
        snap.docChanges().forEach(function(change) {
          if (change.type === 'added') {
            var d = change.doc.data();
            addMessage(d.name, d.text, d.system || false);
          }
        });
      });

    addMessage('sistema', 'Bem-vindo! Pressione T para o chat.', true);
  }

  async function send(text) {
    try {
      await DB.collection('chat').add({
        name:   playerName,
        text:   text,
        ts:     firebase.firestore.FieldValue.serverTimestamp(),
        system: false,
      });
    } catch(e) {
      console.error('Erro chat:', e);
    }
  }

  function addMessage(name, text, system) {
    var box = document.getElementById('chat-messages');

    // Remove mensagens antigas que passaram do limite
    while (box.children.length >= MAX_MSGS) {
      var oldest = box.firstChild;
      if (oldest) {
        clearFadeTimer(oldest);
        box.removeChild(oldest);
      }
    }

    // Cria elemento
    var el = document.createElement('div');
    el.className = 'chat-msg' + (system ? ' system' : '');
    if (!system) {
      el.innerHTML = '<span class="msg-name">' + esc(name) + ':</span> ' + esc(text);
    } else {
      el.textContent = text;
    }
    el.style.transition = 'opacity 0.5s';
    el.style.opacity    = '1';
    box.appendChild(el);
    box.scrollTop = box.scrollHeight;

    // Agenda fade se chat fechado
    scheduleFade(el);
  }

  function scheduleFade(el) {
    // Cancela timer anterior do elemento se existir
    clearFadeTimer(el);

    if (!isOpen) {
      var timer = setTimeout(function() {
        el.style.opacity = '0';
        setTimeout(function() {
          if (el.parentNode) el.parentNode.removeChild(el);
        }, 500);
      }, FADE_MS);
      el._fadeTimer = timer;
      msgTimers.push({ el: el, timer: timer });
    }
  }

  function clearFadeTimer(el) {
    if (el._fadeTimer) {
      clearTimeout(el._fadeTimer);
      el._fadeTimer = null;
    }
  }

  function open() {
    if (isOpen) return;
    isOpen = true;
    Input.setChatMode(true);
    document.getElementById('chat-input-row').classList.remove('hidden');
    document.getElementById('chat-input').focus();

    // Mostra todas as mensagens e cancela os fades
    var box = document.getElementById('chat-messages');
    Array.from(box.children).forEach(function(el) {
      clearFadeTimer(el);
      el.style.opacity = '1';
    });
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    Input.setChatMode(false);
    document.getElementById('chat-input-row').classList.add('hidden');

    // Reagenda fade em todas as mensagens visiveis
    var box = document.getElementById('chat-messages');
    Array.from(box.children).forEach(function(el) {
      scheduleFade(el);
    });
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  return { init, open, close };
})();