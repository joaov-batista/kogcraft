// main.js — Orquestrador principal

const Main = (() => {

  window.addEventListener('DOMContentLoaded', function() {
    UI.init();
  });

  // name = nome visivel no jogo (acima da cabeca)
  // skin = id da skin escolhida (um, dois, tres...)
  async function startGame(uid, name, skin, coins) {
    UI.showLoading();
    UI.setLoadProgress(0.1);

    Engine.init();
    UI.setLoadProgress(0.2);

    Input.init();
    UI.setLoadProgress(0.3);

    World.init();
    UI.setLoadProgress(0.5);

    Players.init();
    UI.setLoadProgress(0.6);

    // Carrega modelo + aplica skin escolhida
    Player.init(skin, name);
    UI.setLoadProgress(0.75);

    // Presença no Firebase com nome e skin
    FirebaseManager.startPresence(uid, skin, name);
    UI.setLoadProgress(0.85);

    // Chat usa o nome do jogador
    ChatSystem.init(name);
    UI.setLoadProgress(0.9);

    // HUD mostra o nome
    UI.setPlayerName(name);
    UI.setCoins(coins);

    Engine.onTick(function() {
      FirebaseManager.updatePosition(
        Player.getPosition(),
        Player.getRotation(),
        Player.getCurrentAnim()
      );
    });

    UI.setLoadProgress(1);
    setTimeout(function() { UI.hideLoading(); }, 400);
  }

  return { startGame };
})();