// gamestate.js — Estado global do jogador
const GameState = (() => {

  var state = {
    uid:        '',
    name:       '',
    skin:       'um',
    coins:      0,
    house:      null,   // índice da casa reivindicada
    cars:       ['mustang'], // carros desbloqueados
    activeCar:  'mustang',
    houseColors: { wall:'#f5e6c8', roof:'#c0392b', window:'#90caf9', garage:'#546e7a', flower:'#ff4081' },
    missions:   { kills:0, target:10, rewarded:false },
    nitroColors:['#00e5ff'],
    activeNitroColor: '#00e5ff',
    carUpgrades: { speed:0, nitro:10 },
  };

  function init(uid, name, skin, coins) {
    state.uid   = uid;
    state.name  = name;
    state.skin  = skin;
    state.coins = coins || 0;
  }

  function addCoins(n) {
    state.coins += n;
    UI.setCoins(state.coins);
    FirebaseManager.addCoins && FirebaseManager.addCoins(state.uid, n);
  }

  function spendCoins(n) {
    if (state.coins < n) return false;
    state.coins -= n;
    UI.setCoins(state.coins);
    return true;
  }

  function addMobKill() {
    state.missions.kills++;
    checkMission();
  }

  function checkMission() {
    if (!state.missions.rewarded && state.missions.kills >= state.missions.target) {
      state.missions.rewarded = true;
      addCoins(500);
      ShopUI.showToast('🎯 Missão completa! +500🪙');
    }
  }

  function ownsCar(key) { return state.cars.indexOf(key) !== -1; }

  function unlockCar(key) {
    if (!ownsCar(key)) state.cars.push(key);
  }

  function setHouseColor(part, color) {
    state.houseColors[part] = color;
  }

  function get()       { return state; }
  function getCoins()  { return state.coins; }

  return { init, get, getCoins, addCoins, spendCoins, addMobKill, ownsCar, unlockCar, setHouseColor };
})();