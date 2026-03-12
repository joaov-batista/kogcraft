// minigames.js — Corrida e Futebol

const Minigames = (() => {

  // ── CORRIDA ─────────────────────────────────
  // Largada x=-60, z=-65 | Chegada x=+60, z=-65
  // Precisa estar no carro na largada para iniciar

  var race = {
    active:  false,
    started: false,
    startTime: 0,
    countdown: 0,
    finished: false,
    bestTime: null,
  };

  var RACE_START_X = -60, RACE_START_Z = -65;
  var RACE_END_X   =  60, RACE_END_Z   = -65;
  var RACE_TRIGGER = 5; // distância para acionar

  function updateCarPos(x, z) {
    if (!Cars.isInCar()) return;

    // Chegou na largada
    var dsx = x - RACE_START_X, dsz = z - RACE_START_Z;
    if (!race.active && !race.started && Math.sqrt(dsx*dsx+dsz*dsz) < RACE_TRIGGER) {
      startRaceCountdown();
    }

    // Chegou na chegada (após iniciar)
    if (race.started && !race.finished) {
      var dex = x - RACE_END_X, dez = z - RACE_END_Z;
      if (Math.sqrt(dex*dex+dez*dez) < RACE_TRIGGER) {
        finishRace();
      }
    }
  }

  function startRaceCountdown() {
    if (race.active) return;
    race.active    = true;
    race.started   = false;
    race.finished  = false;
    race.countdown = 3;
    showRaceHUD('🏁 Prepare-se!');

    var cd = 3;
    var iv = setInterval(function() {
      cd--;
      if (cd > 0) {
        showRaceHUD(cd + '...');
      } else {
        clearInterval(iv);
        showRaceHUD('🚦 VAI!');
        race.started   = true;
        race.startTime = performance.now();
        setTimeout(function() { hideRaceMsg(); }, 1000);
      }
    }, 1000);
  }

  function finishRace() {
    race.finished = true;
    race.started  = false;
    race.active   = false;
    var elapsed = ((performance.now() - race.startTime) / 1000).toFixed(2);
    var reward  = 200;
    if (!race.bestTime || parseFloat(elapsed) < parseFloat(race.bestTime)) {
      race.bestTime = elapsed;
      reward = 350;
    }
    GameState.addCoins(reward);
    showRaceHUD('🏆 ' + elapsed + 's! +' + reward + '🪙');
    setTimeout(function() { hideRaceMsg(); race.finished = false; }, 4000);
  }

  function showRaceHUD(msg) {
    var el = document.getElementById('race-msg');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
  }
  function hideRaceMsg() {
    var el = document.getElementById('race-msg');
    if (el) el.style.display = 'none';
  }

  // ── FUTEBOL ──────────────────────────────────
  // Bola no centro z=67.5, gols em x=-26 e x=+26
  // Jogador empurra a bola ao chegar perto

  var ball = {
    x: 0, z: 67.5,
    vx: 0, vz: 0,
    mesh: null,
    score: [0, 0], // esquerda, direita
  };

  var GOAL_L_X = -26, GOAL_R_X = 26;
  var GOAL_Z_MIN = 64.5, GOAL_Z_MAX = 70.5;
  var BALL_PUSH  = 8;
  var BALL_FRICTION = 0.92;
  var BALL_RADIUS   = 0.5;

  function initBall() {
    // A bola já existe como Mesh no world (decorativa)
    // Encontramos pelo raycasting ou simplesmente criamos outra
    var bMesh = new THREE.Mesh(
      new THREE.SphereGeometry(BALL_RADIUS, 8, 8),
      new THREE.MeshLambertMaterial({ color:0xffffff })
    );
    bMesh.position.set(0, BALL_RADIUS, 67.5);
    bMesh.castShadow = true;
    Engine.getScene().add(bMesh);
    ball.mesh = bMesh;

    // Placar
    updateScoreDisplay();
    Engine.onTick(tickBall);
  }

  function tickBall(dt) {
    if (!ball.mesh) return;

    // Mostra placar quando jogador está perto da quadra
    if (typeof Player !== 'undefined') {
      var pp = Player.getPosition();
      var sc = document.getElementById('soccer-score');
      if (sc) sc.style.display = (pp.z > 45 && pp.z < 95) ? 'block' : 'none';

      // Empurra bola quando perto
      if (pp.z > 48 && pp.z < 88) {
        var dx = ball.x - pp.x, dz = ball.z - pp.z;
        var d  = Math.sqrt(dx*dx+dz*dz);
        if (d < 1.8 && d > 0.01) {
          ball.vx += (dx/d) * BALL_PUSH * dt * 3;
          ball.vz += (dz/d) * BALL_PUSH * dt * 3;
        }
      }
    }

    // Física simples
    ball.vx *= BALL_FRICTION;
    ball.vz *= BALL_FRICTION;
    ball.x  += ball.vx * dt;
    ball.z  += ball.vz * dt;

    // Limites do campo
    if (ball.x < -24) { ball.x = -24; ball.vx *= -0.6; }
    if (ball.x >  24) { ball.x =  24; ball.vx *= -0.6; }
    if (ball.z < 51)  { ball.z = 51;  ball.vz *= -0.6; }
    if (ball.z > 84)  { ball.z = 84;  ball.vz *= -0.6; }

    ball.mesh.position.set(ball.x, BALL_RADIUS, ball.z);
    // Rola visualmente
    ball.mesh.rotation.z += ball.vx * dt * 0.5;
    ball.mesh.rotation.x += ball.vz * dt * 0.5;

    // Gol?
    if (ball.z > GOAL_Z_MIN && ball.z < GOAL_Z_MAX) {
      if (ball.x < GOAL_L_X) { goal(1); }
      if (ball.x > GOAL_R_X) { goal(0); }
    }
  }

  function goal(team) {
    ball.score[team]++;
    updateScoreDisplay();
    ShopUI.showToast('⚽ GOL! ' + ball.score[0] + ' x ' + ball.score[1]);
    // Reseta bola
    ball.x = 0; ball.z = 67.5; ball.vx = 0; ball.vz = 0;
    // Moedas para o time que fez gol
    if (team === 0 || team === 1) GameState.addCoins(50);
  }

  function updateScoreDisplay() {
    var el = document.getElementById('soccer-score');
    if (el) el.textContent = '⚽ ' + ball.score[0] + ' x ' + ball.score[1];
  }

  // ── INIT ─────────────────────────────────────
  function init() {
    initBall();
  }

  return { init, updateCarPos };
})();