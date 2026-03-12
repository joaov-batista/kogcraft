// player.js — Jogador local com câmera F1/F3 e espada 3D
// CÂMERA:
//   F1 = primeira pessoa
//   F3 = terceira pessoa (padrão)
// CONTROLES:
//   WASD mover | Shift correr | Q agachar | Espaço pular
//   F/Clique atacar | G chute | E interagir | 1/2/3 slots

const Player = (() => {

  const WALK_SPEED  = 6;
  const RUN_SPEED   = 13;
  const CROUCH_SPD  = 3;
  const JUMP_VEL    = 9;
  const SENSITIVITY = 0.0022;

  // Câmera terceira pessoa
  const CAM3_DIST   = 6;
  const CAM3_H      = 2.0;
  const CAM3_PITCH_MIN = -0.2;
  const CAM3_PITCH_MAX =  1.1;
  // Câmera primeira pessoa
  const CAM1_H      = 1.65; // altura dos olhos

  let root, model, mixer;
  let anims = {}, curAnim = null, actionPlaying = false;
  let loaded    = false;
  let skinId    = 'um';
  let displayName = 'jogador';
  let camYaw    = 0;
  let camPitch  = 0.25;
  let camMode   = 3; // 1 = first person, 3 = third person
  let mouseAttack = false;

  // Espada 3D (visível em F1)
  let sword3D = null;

  const body = {
    position: new THREE.Vector3(0, 0, 5),
    velocity: new THREE.Vector3(),
    onGround: true,
    radius: 0.35,
    height: 1.75,
  };

  // ── INIT ────────────────────────────────────────
  function init(skin, name) {
    skinId      = skin || 'um';
    displayName = (name && name.trim()) ? name.trim() : skinId;

    // Tecla F alterna câmera (mas F1/F3 do teclado real são Function keys — usamos KeyF + Digit1/3)
    document.addEventListener('keydown', function(e) {
      if (e.code === 'F1') { e.preventDefault(); camMode = 1; updateSwordVisibility(); }
      if (e.code === 'F3') { e.preventDefault(); camMode = 3; updateSwordVisibility(); }
    });

    document.getElementById('game-canvas').addEventListener('mousedown', function(e) {
      if (e.button === 0 && Input.isLocked()) mouseAttack = true;
    });

    new THREE.GLTFLoader().load('assets/models/player.gltf',
      function(gltf) {
        model = gltf.scene;
        model.traverse(function(c) {
          if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; }
        });

        var bbox = new THREE.Box3().setFromObject(model);
        model.position.y = -bbox.min.y;

        root = new THREE.Group();
        root.add(model);
        Engine.getScene().add(root);

        mixer = new THREE.AnimationMixer(model);
        gltf.animations.forEach(function(clip) {
          anims[clip.name] = mixer.clipAction(clip);
        });
        mixer.addEventListener('finished', function() {
          actionPlaying = false;
          goIdle();
        });

        buildSword3D();
        addNameTag();
        applySkin(skinId);
        goIdle();
        loaded = true;
        Engine.onTick(tick);
      },
      null,
      function(e) { console.error('player.gltf erro:', e); }
    );
  }

  // ── ESPADA 3D (primeira pessoa) ─────────────────
  function buildSword3D() {
    var g = new THREE.Group();

    // Lâmina
    var bladeMat = new THREE.MeshStandardMaterial({
      color: 0xd0e8ff, metalness: 0.95, roughness: 0.05,
      emissive: 0x334466, emissiveIntensity: 0.18,
    });
    // Cabo
    var gripMat = new THREE.MeshStandardMaterial({ color: 0x6d4c41, metalness:0.1, roughness:0.8 });
    var guardMat= new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness:0.8, roughness:0.2 });

    // Lâmina principal (caixa fina e longa)
    var blade = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.72, 0.012), bladeMat);
    blade.position.y = 0.38; g.add(blade);

    // Brilho na lâmina (aresta)
    var edge = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.72, 0.018), 
      new THREE.MeshStandardMaterial({ color:0xffffff, emissive:0xaaccff, emissiveIntensity:0.6, metalness:1, roughness:0 }));
    edge.position.set(0.028, 0.38, 0); g.add(edge);

    // Guarda (cross-guard)
    var guard = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.04), guardMat);
    guard.position.y = 0.02; g.add(guard);

    // Cabo
    var grip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.25, 7), gripMat);
    grip.position.y = -0.135; g.add(grip);

    // Pomo (esfera)
    var pommel = new THREE.Mesh(new THREE.SphereGeometry(0.035, 7, 5), guardMat);
    pommel.position.y = -0.265; g.add(pommel);

    // Posicionada como se estivesse na mão direita (HUD fixo na câmera)
    g.position.set(0.32, -0.22, -0.45);
    g.rotation.set(-0.12, 0.18, 0.08);
    g.scale.setScalar(1.1);

    sword3D = g;
    Engine.getCamera().add(g); // filho da câmera → segue câmera em F1
    g.visible = false; // começa em F3
  }

  function updateSwordVisibility() {
    if (sword3D) sword3D.visible = (camMode === 1);
    if (model)   model.visible   = (camMode === 3);
  }

  // ── SKIN ────────────────────────────────────────
  function applySkin(id) {
    skinId = id;
    if (!model) return;
    new THREE.TextureLoader().load('assets/skins/' + id + '.png', function(tex) {
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.flipY     = false;
      tex.encoding  = THREE.sRGBEncoding;
      model.traverse(function(c) {
        if (!c.isMesh) return;
        c.material = new THREE.MeshLambertMaterial({ map: tex });
      });
    });
  }

  // ── NAMETAG ─────────────────────────────────────
  function addNameTag() {
    var c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    var ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.beginPath(); ctx.roundRect(4,10,248,44,8); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(displayName, 128, 42);
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(c), transparent:true, depthTest:false
    }));
    sp.scale.set(2.5, 0.6, 1);
    sp.position.y = 2.5;
    root.add(sp);
  }

  // ── ANIMAÇÕES ───────────────────────────────────
  function goIdle()          { _play('idle', true); }
  function playLoop(name)    { if (!actionPlaying && curAnim !== name) _play(name, true); }
  function playOnce(name)    {
    if (actionPlaying) return;
    if (!anims[name]) return;
    actionPlaying = true; _play(name, false);
  }
  function _play(name, loop) {
    var next = anims[name] || anims['idle'];
    if (!next) return;
    if (curAnim && curAnim !== name && anims[curAnim]) anims[curAnim].fadeOut(0.12);
    next.reset().fadeIn(0.12);
    next.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    next.clampWhenFinished = !loop;
    next.play();
    curAnim = name;
  }

  // ── TICK ────────────────────────────────────────
  function tick(dt) {
    if (!loaded) return;
    if (Cars.isInCar()) { mouseAttack = false; return; }
    updateCamera();
    updateMovement(dt);
    root.position.copy(body.position);
    mixer.update(dt);
    mouseAttack = false;

    // Atualiza indicadores de câmera
    var ind = document.getElementById('cam-mode-indicator');
    var ch  = document.getElementById('crosshair');
    if (ind) ind.textContent = camMode === 1 ? '📷 F1 — 1ª Pessoa' : '📷 F3 — 3ª Pessoa';
    if (ch)  ch.style.display = camMode === 1 ? 'block' : 'none';
  }

  // ── CÂMERA ──────────────────────────────────────
  function updateCamera() {
    var m = Input.consumeMouse();
    if (Input.isLocked()) {
      camYaw   -= m.dx * SENSITIVITY;
      camPitch -= m.dy * SENSITIVITY;
      camPitch  = Math.max(CAM3_PITCH_MIN, Math.min(CAM3_PITCH_MAX, camPitch));
    }
    var p   = body.position;
    var cam = Engine.getCamera();

    if (camMode === 1) {
      // ── PRIMEIRA PESSOA ──
      var eyeY = p.y + CAM1_H;
      cam.position.set(
        p.x - Math.sin(camYaw) * 0.1,
        eyeY,
        p.z - Math.cos(camYaw) * 0.1
      );
      cam.rotation.order = 'YXZ';
      cam.rotation.y = camYaw;
      cam.rotation.x = -camPitch;
      // Esconde o corpo do jogador em F1
      if (model) model.visible = false;
    } else {
      // ── TERCEIRA PESSOA ──
      var dist = CAM3_DIST;
      cam.position.x = p.x + Math.sin(camYaw) * Math.cos(camPitch) * dist;
      cam.position.y = p.y + CAM3_H + Math.sin(camPitch) * dist;
      cam.position.z = p.z + Math.cos(camYaw) * Math.cos(camPitch) * dist;
      cam.lookAt(p.x, p.y + 1.2, p.z);
      if (model) model.visible = true;
    }
  }

  // ── MOVIMENTO ───────────────────────────────────
  function updateMovement(dt) {
    var running   = Input.isDown('ShiftLeft') || Input.isDown('ShiftRight');
    var crouching = Input.isDown('KeyQ');
    var iz = 0, ix = 0;
    if (Input.isDown('KeyW') || Input.isDown('ArrowUp'))   iz =  1;
    if (Input.isDown('KeyS') || Input.isDown('ArrowDown')) iz = -1;
    if (Input.isDown('KeyA') || Input.isDown('ArrowLeft')) ix = -1;
    if (Input.isDown('KeyD') || Input.isDown('ArrowRight'))ix =  1;
    var hasInput = iz !== 0 || ix !== 0;
    var spd = running ? RUN_SPEED : crouching ? CROUCH_SPD : WALK_SPEED;

    if (hasInput) {
      var fwdX = -Math.sin(camYaw), fwdZ = -Math.cos(camYaw);
      var rgtX =  Math.cos(camYaw), rgtZ = -Math.sin(camYaw);
      var mx = fwdX*iz + rgtX*ix, mz = fwdZ*iz + rgtZ*ix;
      var len = Math.sqrt(mx*mx+mz*mz);
      if (len > 0) { mx/=len; mz/=len; }
      body.velocity.x = mx*spd; body.velocity.z = mz*spd;
      var ty = Math.atan2(mx, mz) + Math.PI;
      var d = ty - root.rotation.y;
      while (d >  Math.PI) d -= Math.PI*2;
      while (d < -Math.PI) d += Math.PI*2;
      root.rotation.y += d * Math.min(1, dt*16);
    } else {
      body.velocity.x *= 0.75;
      body.velocity.z *= 0.75;
    }

    if (Input.isDown('Space') && body.onGround) {
      body.velocity.y = JUMP_VEL;
      body.onGround = false;
      actionPlaying = false;
      playOnce('jump');
    }

    var wasOnGround = body.onGround;
    Physics.step(body, dt);
    if (!wasOnGround && body.onGround) { actionPlaying = false; goIdle(); }

    root.scale.y = crouching ? 0.65 : 1;

    if (!actionPlaying) {
      if (!body.onGround)   playLoop('fall');
      else if (hasInput)    playLoop(running ? 'run' : crouching ? 'crouch' : 'walk');
      else                  goIdle();
    }
    if (body.onGround && !actionPlaying) {
      if (mouseAttack || Input.isDown('KeyF')) playOnce('punch');
      else if (Input.isDown('KeyG'))           playOnce('kick');
    }
  }

  function getPosition()    { return body.position.clone(); }
  function getRotation()    { return root ? root.rotation.y : 0; }
  function getCurrentAnim() { return curAnim || 'idle'; }
  function getSkin()        { return skinId; }
  function getName()        { return displayName; }
  function getCamYaw()      { return camYaw; }
  function getCamMode()     { return camMode; }
  function setVisible(v)    { if (root) root.visible = v; }
  function teleport(pos)    { body.position.copy(pos); body.velocity.set(0,0,0); }

  return { init, applySkin, getPosition, getRotation, getCurrentAnim,
           getSkin, getName, getCamYaw, getCamMode, setVisible, teleport };
})();