// main.js — Inicializa o jogo na ordem certa

const Main = (() => {

  function startGame(uid, name, skin, coins) {
    // 1. Engine + estado
    Engine.init();
    GameState.init(uid, name, skin, coins);

    // 2. Mundo
    World.init();

    // 3. Input
    Input.init();

    // 4. Player
    Player.init(skin, name);

    // 5. Multiplayer
    Players.init();

    // 6. Sistemas do jogo
    Mobs.init();
    Cars.init();
    NPCs.init();
    Minigames.init();

    // 7. UI
    Inventory.init();
    ShopUI.init();
    ChatSystem.init(uid, name);

    // 8. Firebase presença
    FirebaseManager.startPresence(uid, skin, name);

    // 9. HUD
    UI.setPlayerName(name);
    UI.setCoins(coins);

    // 10. Input: tecla E — interação unificada
    document.addEventListener('keydown', function(e) {
      if (e.code !== 'KeyE') return;
      if (!Input.isLocked()) return;

      // Prioridade: NPC > Casa > Carro
      if (NPCs.interactNearest()) return;
      checkHouseInteraction();
      if (Cars.tryEnterExit()) return;
    });

    // Ataque com F/Clique — só com espada e sem carro
    document.addEventListener('keydown', function(e) {
      if (e.code !== 'KeyF') return;
      if (Cars.isInCar()) return;
      if (Inventory.isHoldingSword() || true) { // espada sempre disponível
        Mobs.tryHit(Player.getPosition());
      }
    });
    document.getElementById('game-canvas').addEventListener('mousedown', function(e) {
      if (e.button !== 0) return;
      if (!Input.isLocked()) return;
      if (Cars.isInCar()) return;
      Mobs.tryHit(Player.getPosition());
    });
  }

  // Checa se o jogador está perto de uma casa sem dono
  function checkHouseInteraction() {
    var pp     = Player.getPosition();
    var houses = World.getHouses();
    for (var i = 0; i < houses.length; i++) {
      var h = houses[i];
      if (h.owner) continue;
      var dx = pp.x - h.ix, dz = pp.z - h.iz;
      if (Math.sqrt(dx*dx + dz*dz) < 4) {
        ShopUI.open('claim_house_' + h.idx);
        return;
      }
    }
  }

  return { startGame };
})();