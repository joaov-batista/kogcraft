// player.js
// REGRA DE ANIMAÇÃO:
//   idle é o estado base. Toda animação termina em idle.
//   idle → walk/run/crouch (se movendo)
//   idle → jump (se pular)
//   idle → punch/kick/wave (se apertar)
//   walk/run/crouch/jump/fall/punch/kick/wave → idle (quando parar/aterrissar/terminar)

const Player = (() => {

  const WALK_SPEED   = 6;
  const RUN_SPEED    = 13;
  const CROUCH_SPEED = 3;
  const JUMP_VEL     = 9;
  const CAM_DIST     = 5;
  const CAM_H        = 1.5;
  const SENSITIVITY  = 0.002;

  let root, model, mixer;
  let anims       = {};
  let loaded      = false;
  let skinId      = 'um';
  let displayName = 'jogador';
  let camYaw      = 0;
  let camPitch    = 0.3;
  let mouseAttack = false;

  // animação tocando agora
  let curAnim = null;

  // Se true, uma ação (punch/kick/wave) está tocando — não interrompe até acabar
  let actionPlaying = false;

  const body = {
    position: new THREE.Vector3(5, 0, 5),
    velocity: new THREE.Vector3(0, 0, 0),
    onGround: true,
    radius: 0.35,
    height: 1.75,
  };

  // ── NAMETAG ─────────────────────────────────────
  function addNameTag() {
    var c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    var ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.beginPath(); ctx.roundRect(4, 10, 248, 44, 8); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(displayName, 128, 42);
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(c), transparent: true, depthTest: false
    }));
    sp.scale.set(2.5, 0.6, 1);
    sp.position.y = 2.4;
    root.add(sp);
  }

  // ── INIT ────────────────────────────────────────
  function init(skin, name) {
    skinId      = skin || 'um';
    displayName = (name && name.trim()) ? name.trim() : skinId;

    document.getElementById('game-canvas').addEventListener('mousedown', function(e) {
      if (e.button === 0 && Input.isLocked()) mouseAttack = true;
    });

    new THREE.GLTFLoader().load('assets/models/player.gltf',
      function(gltf) {
        model = gltf.scene;
        model.traverse(function(c) {
          if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; }
        });

        // Offset fixo: pés em Y=0 do root
        var bbox = new THREE.Box3().setFromObject(model);
        model.position.y = -bbox.min.y;

        root = new THREE.Group();
        root.add(model);
        Engine.getScene().add(root);

        mixer = new THREE.AnimationMixer(model);
        gltf.animations.forEach(function(clip) {
          anims[clip.name] = mixer.clipAction(clip);
          console.log('anim:', clip.name, clip.duration.toFixed(2) + 's');
        });

        // Ouve evento de fim de animação do mixer
        mixer.addEventListener('finished', onAnimFinished);

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
        c.material = new THREE.MeshLambertMaterial({ map: tex, side: THREE.FrontSide });
      });
    });
  }

  // ── ANIMAÇÕES ───────────────────────────────────

  // Evento disparado pelo mixer quando uma animação LoopOnce termina
  function onAnimFinished(e) {
    // Qualquer animação que terminou → vai para idle
    actionPlaying = false;
    goIdle();
  }

  // Vai para idle (sempre loop, nunca bloqueia)
  function goIdle() {
    _play('idle', true);
  }

  // Toca uma animação em loop (walk, run, fall, etc.)
  // Só troca se for diferente da atual E não tiver action rolando
  function playLoop(name) {
    if (actionPlaying) return;
    if (curAnim === name) return;
    _play(name, true);
  }

  // Toca uma animação uma única vez (punch, kick, wave, jump)
  // Quando terminar, o evento 'finished' chama goIdle automaticamente
  function playOnce(name) {
    if (actionPlaying) return;
    var action = anims[name];
    if (!action) return;
    actionPlaying = true;
    _play(name, false);
  }

  // Função interna de troca de animação
  function _play(name, loop) {
    var next = anims[name] || anims['idle'];
    if (!next) return;

    // Fade out da atual
    if (curAnim && curAnim !== name && anims[curAnim]) {
      anims[curAnim].fadeOut(0.15);
    }

    next.reset().fadeIn(0.15);

    if (loop) {
      next.setLoop(THREE.LoopRepeat, Infinity);
      next.clampWhenFinished = false;
    } else {
      next.setLoop(THREE.LoopOnce, 1);
      next.clampWhenFinished = true;
    }

    next.play();
    curAnim = name;
  }

  // ── TICK ────────────────────────────────────────
  function tick(dt) {
    if (!loaded) return;
    updateCamera();
    updateMovement(dt);
    root.position.copy(body.position);
    mixer.update(dt);
    mouseAttack = false;
  }

  // ── CÂMERA ──────────────────────────────────────
  function updateCamera() {
    var m = Input.consumeMouse();
    if (Input.isLocked()) {
      camYaw   -= m.dx * SENSITIVITY;
      camPitch -= m.dy * SENSITIVITY;
      camPitch  = Math.max(-0.15, Math.min(1.0, camPitch));
    }
    var p   = body.position;
    var cam = Engine.getCamera();
    cam.position.x = p.x + Math.sin(camYaw) * Math.cos(camPitch) * CAM_DIST;
    cam.position.y = p.y + CAM_H + Math.sin(camPitch) * CAM_DIST;
    cam.position.z = p.z + Math.cos(camYaw) * Math.cos(camPitch) * CAM_DIST;
    cam.lookAt(p.x, p.y + 1.0, p.z);
  }

  // ── MOVIMENTO ───────────────────────────────────
  function updateMovement(dt) {
    var running   = Input.isDown('ShiftLeft') || Input.isDown('ShiftRight');
    var crouching = Input.isDown('KeyQ');

    var iz = 0, ix = 0;
    if (Input.isDown('KeyW') || Input.isDown('ArrowUp'))    iz =  1;
    if (Input.isDown('KeyS') || Input.isDown('ArrowDown'))  iz = -1;
    if (Input.isDown('KeyA') || Input.isDown('ArrowLeft'))  ix = -1;
    if (Input.isDown('KeyD') || Input.isDown('ArrowRight')) ix =  1;
    var hasInput = (iz !== 0 || ix !== 0);
    var spd = running ? RUN_SPEED : crouching ? CROUCH_SPEED : WALK_SPEED;

    // Velocidade XZ
    if (hasInput) {
      var fwdX = -Math.sin(camYaw), fwdZ = -Math.cos(camYaw);
      var rgtX =  Math.cos(camYaw), rgtZ = -Math.sin(camYaw);
      var mx = fwdX * iz + rgtX * ix;
      var mz = fwdZ * iz + rgtZ * ix;
      var len = Math.sqrt(mx * mx + mz * mz);
      if (len > 0) { mx /= len; mz /= len; }
      body.velocity.x = mx * spd;
      body.velocity.z = mz * spd;
      // Gira o modelo na direção do movimento
      var ty = Math.atan2(mx, mz) + Math.PI;
      var d = ty - root.rotation.y;
      while (d >  Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      root.rotation.y += d * Math.min(1, dt * 16);
    } else {
      body.velocity.x *= 0.75;
      body.velocity.z *= 0.75;
    }

    // Pulo
    if (Input.isDown('Space') && body.onGround) {
      body.velocity.y = JUMP_VEL;
      body.onGround   = false;
      actionPlaying   = false; // cancela qualquer action
      playOnce('jump');        // jump → quando terminar → idle (via onAnimFinished)
    }

    var wasOnGround = body.onGround;
    Physics.step(body, dt);
    var justLanded = !wasOnGround && body.onGround;

    // Aterrissou enquanto o jump/fall ainda tocava → força idle
    if (justLanded) {
      actionPlaying = false;
      goIdle();
    }

    root.scale.y = crouching ? 0.65 : 1;

    // ── Seleciona animação de movimento ─────────────
    // Só atua se não tem action rolando
    if (!actionPlaying) {
      if (!body.onGround) {
        // No ar: fall em loop (não é action, não vai pra idle sozinha)
        playLoop('fall');
      } else if (hasInput) {
        playLoop(running ? 'run' : crouching ? 'crouch' : 'walk');
      } else {
        goIdle();
      }
    }

    // ── Ações pontuais (só no chão) ─────────────────
    if (body.onGround && !actionPlaying) {
      if (mouseAttack || Input.isDown('KeyF')) playOnce('punch');
      else if (Input.isDown('KeyG'))           playOnce('kick');
      else if (Input.isDown('KeyE'))           playOnce('wave');
    }
  }

  function getPosition()    { return body.position.clone(); }
  function getRotation()    { return root ? root.rotation.y : 0; }
  function getCurrentAnim() { return curAnim || 'idle'; }
  function getSkin()        { return skinId; }
  function getName()        { return displayName; }

  return { init, applySkin, getPosition, getRotation, getCurrentAnim, getSkin, getName };
})();