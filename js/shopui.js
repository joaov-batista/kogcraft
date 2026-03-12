// shopui.js — Interfaces de loja e interação

const ShopUI = (() => {

  var open_key = null;

  // ── ABRIR LOJA ───────────────────────────────
  function open(key) {
    close();
    open_key = key;
    Engine.setPaused(true);
    document.exitPointerLock && document.exitPointerLock();

    var html = '';
    if (key === 'npc_missoes') html = buildMissoes();
    if (key === 'npc_carros')  html = buildCarros();
    if (key === 'npc_cores')   html = buildCores();
    if (key.startsWith('claim_house')) html = buildClaimHouse();

    var overlay = document.getElementById('shop-overlay');
    overlay.innerHTML = html;
    overlay.style.display = 'flex';

    // Botão fechar
    overlay.querySelector('.shop-close').addEventListener('click', close);
  }

  function close() {
    document.getElementById('shop-overlay').style.display = 'none';
    Engine.setPaused(false);
    open_key = null;
  }

  // ── NPC MISSÕES ──────────────────────────────
  function buildMissoes() {
    var st = GameState.get();
    var pct = Math.min(1, st.missions.kills / st.missions.target);
    var done = st.missions.rewarded;
    return `
    <div class="shop-box">
      <div class="shop-header">
        <span>📋 Missões</span>
        <button class="shop-close">✕</button>
      </div>
      <div class="shop-body">
        <div class="mission-card ${done ? 'done' : ''}">
          <div class="mission-title">🗡 Caçador de Mobs</div>
          <div class="mission-desc">Derrote 10 inimigos na zona de perigo.</div>
          <div class="mission-prog">
            <div class="prog-bar"><div class="prog-fill" style="width:${Math.round(pct*100)}%"></div></div>
            <span>${st.missions.kills} / ${st.missions.target}</span>
          </div>
          <div class="mission-reward">${done ? '✅ Concluída! +500🪙' : '🏆 Recompensa: 500🪙'}</div>
        </div>
        <div class="mission-card">
          <div class="mission-title">🏁 Corredor</div>
          <div class="mission-desc">Complete uma corrida na pista. Vá para a largada com seu carro!</div>
          <div class="mission-reward">🏆 Recompensa: 350🪙</div>
        </div>
        <div class="mission-card">
          <div class="mission-title">⚽ Artilheiro</div>
          <div class="mission-desc">Marque um gol na quadra.</div>
          <div class="mission-reward">🏆 Recompensa: 50🪙 por gol</div>
        </div>
      </div>
    </div>`;
  }

  // ── NPC CARROS ───────────────────────────────
  function buildCarros() {
    var st    = GameState.get();
    var defs  = Cars.getDefs();
    var coins = st.coins;
    var cardsHtml = Object.keys(defs).map(function(key) {
      var d     = defs[key];
      var owned = GameState.ownsCar(key);
      return `<div class="car-card ${owned ? 'owned' : ''}">
        <div class="car-icon" style="background:#${d.color.toString(16).padStart(6,'0')}22;border-color:#${d.color.toString(16).padStart(6,'0')}">🚗</div>
        <div class="car-name">${d.name}</div>
        <div class="car-speed">⚡ Vel: ${d.spd}</div>
        ${owned
          ? `<button class="btn-shop btn-equip" data-key="${key}">Usar</button>`
          : `<button class="btn-shop btn-buy" data-key="${key}" data-price="${d.price}" ${coins < d.price ? 'disabled':''}>Comprar — ${d.price}🪙</button>`
        }
      </div>`;
    }).join('');

    return `
    <div class="shop-box wide">
      <div class="shop-header"><span>🚗 Concessionária KOG</span><button class="shop-close">✕</button></div>
      <div class="shop-body">
        <div class="car-grid">${cardsHtml}</div>
        <div class="shop-section-title">🔧 Melhorias</div>
        <div class="upgrade-grid">
          <div class="upgrade-card">
            <div>⚡ +5 Vel.</div>
            <button class="btn-shop btn-buy" data-action="speed" data-price="500" ${coins<500?'disabled':''}>500🪙</button>
          </div>
          <div class="upgrade-card">
            <div>💨 +10s Nitro</div>
            <button class="btn-shop btn-buy" data-action="nitro" data-price="300" ${coins<300?'disabled':''}>300🪙</button>
          </div>
          <div class="upgrade-card">
            <div>🎨 Cor Nitro</div>
            <input type="color" id="nitro-color-pick" value="#00aaff">
            <button class="btn-shop" id="btn-nitro-color" data-price="200" ${coins<200?'disabled':''}>200🪙</button>
          </div>
          <div class="upgrade-card">
            <div>🎨 Cor Carro</div>
            <input type="color" id="car-color-pick" value="#1565c0">
            <button class="btn-shop" id="btn-car-color">Aplicar</button>
          </div>
        </div>
      </div>
    </div>`;
  }

  // ── NPC CORES (casa) ─────────────────────────
  function buildCores() {
    var hc = GameState.get().houseColors;
    return `
    <div class="shop-box">
      <div class="shop-header"><span>🎨 Personalização da Casa</span><button class="shop-close">✕</button></div>
      <div class="shop-body">
        <div class="color-grid">
          ${colorRow('wall',   '🧱 Paredes',  hc.wall,   150)}
          ${colorRow('roof',   '🏠 Telhado',  hc.roof,   200)}
          ${colorRow('window', '🪟 Janelas',  hc.window, 100)}
          ${colorRow('garage', '🏠 Garagem',  hc.garage, 150)}
          ${colorRow('flower', '🌸 Flores',   hc.flower, 80 )}
        </div>
      </div>
    </div>`;
  }

  function colorRow(part, label, current, price) {
    return `<div class="color-row">
      <span class="color-label">${label}</span>
      <input type="color" class="color-pick" data-part="${part}" value="${current}">
      <button class="btn-shop btn-apply-color" data-part="${part}" data-price="${price}">${price}🪙 Aplicar</button>
    </div>`;
  }

  // ── REIVINDICAR CASA ─────────────────────────
  function buildClaimHouse() {
    return `
    <div class="shop-box small">
      <div class="shop-header"><span>🏠 Casa Vazia</span><button class="shop-close">✕</button></div>
      <div class="shop-body" style="text-align:center;padding:24px">
        <p style="font-size:16px;margin-bottom:20px">Esta casa está disponível!<br>Deseja torná-la sua?</p>
        <button class="btn-shop btn-cyan" id="btn-claim-yes" style="width:100%;padding:14px;font-size:16px">✅ Sim, é minha!</button>
      </div>
    </div>`;
  }

  // ── BIND EVENTOS ─────────────────────────────
  function bindEvents() {
    var overlay = document.getElementById('shop-overlay');
    overlay.addEventListener('click', function(e) {
      var t = e.target;

      // Comprar carro
      if (t.classList.contains('btn-buy') && t.dataset.key) {
        var price = parseInt(t.dataset.price);
        if (GameState.spendCoins(price)) {
          Cars.unlockAndSwitch(t.dataset.key);
          open('npc_carros'); // recarrega
        }
      }

      // Equipar carro
      if (t.classList.contains('btn-equip') && t.dataset.key) {
        Cars.unlockAndSwitch(t.dataset.key);
        close();
      }

      // Melhorias
      if (t.dataset.action === 'speed') {
        if (GameState.spendCoins(500)) { Cars.applySpeedUpgrade(5); open('npc_carros'); }
      }
      if (t.dataset.action === 'nitro') {
        if (GameState.spendCoins(300)) { Cars.addNitro(10); open('npc_carros'); }
      }
      if (t.id === 'btn-nitro-color') {
        var nc = document.getElementById('nitro-color-pick').value;
        if (GameState.spendCoins(200)) { Cars.setNitroColor(nc); open('npc_carros'); }
      }
      if (t.id === 'btn-car-color') {
        var cc = document.getElementById('car-color-pick').value;
        Cars.repaintCar(cc);
      }

      // Cores casa
      if (t.classList.contains('btn-apply-color')) {
        var part  = t.dataset.part;
        var price2 = parseInt(t.dataset.price);
        var pick  = overlay.querySelector('.color-pick[data-part="'+part+'"]');
        if (pick && GameState.spendCoins(price2)) {
          var hIdx = GameState.get().house;
          if (hIdx !== null) World.setHousePartColor(hIdx, part, pick.value);
          open('npc_cores');
        }
      }

      // Reivindicar casa
      if (t.id === 'btn-claim-yes') {
        var idx  = open_key.replace('claim_house_', '');
        World.claimHouse(parseInt(idx), GameState.get().name);
        GameState.get().house = parseInt(idx);
        close();
        showToast('🏠 Casa reivindicada!');
      }
    });
  }

  // ── TOAST ────────────────────────────────────
  function showToast(msg) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.style.opacity = '1';
    el.style.display = 'block';
    clearTimeout(el._t);
    el._t = setTimeout(function() {
      el.style.opacity = '0';
      setTimeout(function() { el.style.display = 'none'; }, 400);
    }, 2500);
  }

  function init() {
    bindEvents();
  }

  return { init, open, close, showToast };
})();