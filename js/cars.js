// cars.js — Sistema de carros
// Câmera: suave com lerp, distância e altura ajustadas
// Carros: escala normalizada para tamanho correto no mundo

const Cars = (() => {

  var _scene = function() { return Engine.getScene(); };

  var DEFS = {
    mustang:      { model:'assets/models/mustang.gltf',      price:0,    spd:12, name:'Mustang',     color:0x1565c0 },
    porsche911:   { model:'assets/models/porsche911.gltf',   price:2500, spd:16, name:'Porsche 911', color:0xffd600 },
    charger:      { model:'assets/models/charger.gltf',      price:4500, spd:20, name:'Charger',     color:0xb71c1c },
    mustangmach1: { model:'assets/models/mustangmach1.gltf', price:7000, spd:24, name:'Mach 1',      color:0x1b5e20 },
  };

  // Tamanho alvo para normalizar todos os modelos (comprimento ~5 unidades)
  var TARGET_LENGTH = 5.0;

  var carGroup     = null;
  var playerCar    = null;
  var inCar        = false;
  var carYaw       = 0;
  var carVel       = 0;
  var nitroLeft    = 0;
  var nitroColor   = 0x00aaff;
  var particles    = [];
  var exhaustPoint = null;

  // Câmera suavizada
  var camPos = new THREE.Vector3();
  var camTarget = new THREE.Vector3();
  var camInited = false;

  // ── INIT ─────────────────────────────────────────
  function init() {
    spawnPlayerCar('mustang', -52, -22, 0);
    Engine.onTick(tick);
  }

  function spawnPlayerCar(key, x, z, ry) {
    if (carGroup) _scene().remove(carGroup);

    carGroup = new THREE.Group();
    carGroup.position.set(x, 0, z);
    carGroup.rotation.y = ry || 0;
    carGroup._def = DEFS[key];
    playerCar = key;
    camInited = false;

    new THREE.GLTFLoader().load(
      DEFS[key].model,
      function(gltf) {
        var m = gltf.scene;

        // Normaliza escala pelo bbox
        var bbox = new THREE.Box3().setFromObject(m);
        var size = bbox.getSize(new THREE.Vector3());
        var maxDim = Math.max(size.x, size.z); // comprimento/largura do carro
        var scale = TARGET_LENGTH / maxDim;
        m.scale.setScalar(scale);

        // Recalcula bbox após escala para alinhar com o chão
        bbox.setFromObject(m);
        m.position.y = -bbox.min.y;

        m.traverse(function(c) {
          if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; }
        });

        carGroup.add(m);
        carGroup._model = m;

        // Ponto de escapamento
        exhaustPoint = findExhaust(m);
        if (!exhaustPoint) {
          exhaustPoint = new THREE.Object3D();
          exhaustPoint.position.set(0.5, 0.5, -2.5);
          carGroup.add(exhaustPoint);
        }
      },
      null,
      function() {
        // Fallback: caixa grande do tamanho certo
        var fb = new THREE.Mesh(
          new THREE.BoxGeometry(TARGET_LENGTH * 0.46, TARGET_LENGTH * 0.28, TARGET_LENGTH),
          new THREE.MeshLambertMaterial({ color: DEFS[key].color })
        );
        fb.position.y = TARGET_LENGTH * 0.14;
        carGroup.add(fb);
        carGroup._model = fb;
        exhaustPoint = new THREE.Object3D();
        exhaustPoint.position.set(0.5, 0.5, -2.5);
        carGroup.add(exhaustPoint);
      }
    );

    _scene().add(carGroup);
  }

  function findExhaust(m) {
    var found = null;
    m.traverse(function(c) {
      var n = c.name.toLowerCase();
      if (n.includes('exhaust') || n.includes('escape') || n.includes('muffler')) found = c;
    });
    return found;
  }

  // ── ENTRAR / SAIR ────────────────────────────────
  function tryEnterExit() {
    if (inCar) { exitCar(); return true; }
    if (!carGroup) return false;
    var pp = Player.getPosition();
    var dx = pp.x - carGroup.position.x;
    var dz = pp.z - carGroup.position.z;
    if (Math.sqrt(dx * dx + dz * dz) < 5) { enterCar(); return true; }
    return false;
  }

  function enterCar() {
    inCar  = true;
    carYaw = carGroup.rotation.y;
    Player.setVisible(false);
    showCarHUD(true);
  }

  function exitCar() {
    inCar = false;
    carVel = 0;
    Player.setVisible(true);
    showCarHUD(false);
    var off = new THREE.Vector3(
      Math.sin(carYaw + Math.PI / 2) * 4,
      0,
      Math.cos(carYaw + Math.PI / 2) * 4
    );
    Player.teleport(carGroup.position.clone().add(off));
  }

  function showCarHUD(v) {
    var el = document.getElementById('car-hud');
    if (el) el.style.display = v ? 'block' : 'none';
  }

  // ── TICK ─────────────────────────────────────────
  function tick(dt) {
    updateParticles(dt);
    if (!inCar || !carGroup) return;

    var def = carGroup._def;
    var spd = def.spd + GameState.get().carUpgrades.speed;
    var fwd = 0, turn = 0;

    if (Input.isDown('KeyW') || Input.isDown('ArrowUp'))   fwd  =  1;
    if (Input.isDown('KeyS') || Input.isDown('ArrowDown')) fwd  = -0.55;
    if (Input.isDown('KeyA') || Input.isDown('ArrowLeft')) turn =  1;
    if (Input.isDown('KeyD') || Input.isDown('ArrowRight'))turn = -1;

    // Nitro
    var usingNitro = (Input.isDown('ShiftLeft') || Input.isDown('ShiftRight')) && nitroLeft > 0;
    if (usingNitro) { nitroLeft -= dt; spd *= 1.9; emitNitro(); }

    // Inércia suave
    var targetVel = fwd * spd;
    carVel += (targetVel - carVel) * Math.min(1, dt * 3.5);

    // Curva só quando em movimento
    if (Math.abs(carVel) > 0.3 && turn !== 0) {
      carYaw += turn * dt * 2.0 * (carVel > 0 ? 1 : -1);
    }

    carGroup.rotation.y = carYaw;
    carGroup.position.x += Math.sin(carYaw) * carVel * dt;
    carGroup.position.z += Math.cos(carYaw) * carVel * dt;

    // ── CÂMERA SUAVIZADA ──────────────────────────
    var cam  = Engine.getCamera();
    var cp   = carGroup.position;

    // Posição ideal da câmera: atrás e acima do carro
    var CAM_DIST = 12;
    var CAM_H    = 4.5;
    var idealX = cp.x + Math.sin(carYaw) * CAM_DIST;
    var idealY = cp.y + CAM_H;
    var idealZ = cp.z + Math.cos(carYaw) * CAM_DIST;

    if (!camInited) {
      camPos.set(idealX, idealY, idealZ);
      camTarget.copy(cp);
      camInited = true;
    }

    // Lerp suave da câmera
    var lerpSpeed = 6;
    camPos.x += (idealX - camPos.x) * Math.min(1, dt * lerpSpeed);
    camPos.y += (idealY - camPos.y) * Math.min(1, dt * lerpSpeed);
    camPos.z += (idealZ - camPos.z) * Math.min(1, dt * lerpSpeed);

    var lookAtY = cp.y + 1.2;
    camTarget.x += (cp.x - camTarget.x) * Math.min(1, dt * 10);
    camTarget.y += (lookAtY - camTarget.y) * Math.min(1, dt * 10);
    camTarget.z += (cp.z - camTarget.z) * Math.min(1, dt * 10);

    cam.position.copy(camPos);
    cam.lookAt(camTarget);

    // HUD nitro
    var nitroBar = document.getElementById('nitro-bar');
    if (nitroBar) {
      var maxN = GameState.get().carUpgrades.nitro;
      nitroBar.style.width = Math.round((nitroLeft / maxN) * 100) + '%';
    }

    if (typeof Minigames !== 'undefined') {
      Minigames.updateCarPos(carGroup.position.x, carGroup.position.z);
    }
  }

  // ── NITRO PARTÍCULAS ─────────────────────────────
  function emitNitro() {
    if (!exhaustPoint) return;
    var wp = new THREE.Vector3();
    exhaustPoint.getWorldPosition(wp);
    for (var i = 0; i < 3; i++) {
      var p = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 4, 4),
        new THREE.MeshLambertMaterial({
          color: nitroColor, emissive: nitroColor,
          emissiveIntensity: 1, transparent: true
        })
      );
      p.position.copy(wp);
      p._vx = (Math.random() - 0.5) * 0.5;
      p._vy = Math.random() * 0.3;
      p._vz = -Math.cos(carYaw) * 4 + (Math.random() - 0.5);
      p._life = 0.35 + Math.random() * 0.2;
      _scene().add(p);
      particles.push(p);
    }
  }

  function updateParticles(dt) {
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p._life -= dt;
      p.position.x += p._vx * dt;
      p.position.y += p._vy * dt;
      p.position.z += p._vz * dt;
      p.material.opacity = Math.max(0, p._life / 0.5);
      if (p._life <= 0) { _scene().remove(p); particles.splice(i, 1); }
    }
  }

  // ── UPGRADES ─────────────────────────────────────
  function applySpeedUpgrade(amount) {
    GameState.get().carUpgrades.speed += amount;
    ShopUI.showToast('⚡ Velocidade melhorada!');
  }

  function addNitro(seconds) {
    var maxN = GameState.get().carUpgrades.nitro;
    nitroLeft = Math.min(nitroLeft + seconds, maxN);
    ShopUI.showToast('💨 Nitro recarregado!');
  }

  function setNitroColor(hex) {
    nitroColor = parseInt(hex.replace('#', ''), 16);
    GameState.get().activeNitroColor = hex;
    ShopUI.showToast('🎨 Cor do nitro alterada!');
  }

  function unlockAndSwitch(key) {
    GameState.unlockCar(key);
    var cx = carGroup ? carGroup.position.x : -52;
    var cz = carGroup ? carGroup.position.z : -22;
    spawnPlayerCar(key, cx, cz, 0);
    ShopUI.showToast('🚗 ' + DEFS[key].name + ' desbloqueado!');
  }

  function repaintCar(hex) {
    if (!carGroup || !carGroup._model) return;
    var c = new THREE.Color().setStyle(hex);
    carGroup._model.traverse(function(ch) {
      if (ch.isMesh && ch.material && ch.material.color) ch.material.color.copy(c);
    });
  }

  function isInCar()   { return inCar; }
  function getCarPos() { return carGroup ? carGroup.position.clone() : null; }
  function getDefs()   { return DEFS; }
  function refillNitro() { nitroLeft = GameState.get().carUpgrades.nitro; }

  return {
    init, tryEnterExit, applySpeedUpgrade, addNitro, setNitroColor,
    unlockAndSwitch, repaintCar, isInCar, getCarPos, getDefs, refillNitro
  };
})();