// npcs.js — NPCs com modelo player.gltf + animação idle + skin NPC

const NPCs = (() => {

  var _scene = function() { return Engine.getScene(); };
  var npcs   = [];
  var nearestNPC = null;
  var DIST = 5;

  // Cada NPC usa a skin da pasta npcs/ aplicada no modelo player.gltf
  var DEFS = [
    {
      key: 'npc_missoes', skin: 'assets/npcs/npc_missoes.png',
      label: 'Missões', labelColor: '#ffd740',
      x: 0, z: -5
    },
    {
      key: 'npc_carros', skin: 'assets/npcs/npc_carros.png',
      label: 'Carros', labelColor: '#00e5ff',
      x: 72, z: -62
    },
    {
      key: 'npc_cores', skin: 'assets/npcs/npc_cores.png',
      label: 'Decoração', labelColor: '#ff80ab',
      x: 62, z: 22
    },
  ];

  function init() {
    DEFS.forEach(spawnNPC);
    Engine.onTick(tick);
  }

  function spawnNPC(def) {
    var root = new THREE.Group();
    root.position.set(def.x, 0, def.z);
    _scene().add(root);

    var entry = {
      key:   def.key,
      label: def.label,
      x: def.x, z: def.z,
      root:  root,
      mixer: null,
      idleAction: null,
    };

    // Carrega o mesmo modelo do jogador
    var loader = new THREE.GLTFLoader();
    loader.load(
      'assets/models/player.gltf',
      function(gltf) {
        var model = gltf.scene;

        // Alinha base do modelo com Y=0
        var bbox = new THREE.Box3().setFromObject(model);
        model.position.y = -bbox.min.y;

        model.traverse(function(c) {
          if (!c.isMesh) return;
          c.castShadow = true;
          c.receiveShadow = true;
        });

        root.add(model);

        // Aplica skin PNG do NPC
        var tex = new THREE.TextureLoader().load(def.skin);
        tex.flipY = false;
        tex.encoding = THREE.sRGBEncoding;
        model.traverse(function(c) {
          if (c.isMesh) {
            c.material = new THREE.MeshLambertMaterial({ map: tex, side: THREE.FrontSide });
          }
        });

        // Animação idle em loop
        if (gltf.animations && gltf.animations.length > 0) {
          entry.mixer = new THREE.AnimationMixer(model);
          var idleClip = THREE.AnimationClip.findByName(gltf.animations, 'idle')
                      || gltf.animations[0];
          entry.idleAction = entry.mixer.clipAction(idleClip);
          entry.idleAction.setLoop(THREE.LoopRepeat, Infinity);
          entry.idleAction.play();

          Engine.onTick(function(dt) {
            if (entry.mixer) entry.mixer.update(dt);
          });
        }
      },
      null,
      function() {
        // Fallback: corpo caixa simples
        var body = new THREE.Mesh(
          new THREE.BoxGeometry(0.8, 1.8, 0.4),
          new THREE.MeshLambertMaterial({ color: 0x888888 })
        );
        body.position.y = 0.9;
        root.add(body);
      }
    );

    // Label flutuante acima do NPC
    var lbl = makeLabel(def.label, def.labelColor);
    lbl.position.set(0, 2.6, 0);
    root.add(lbl);

    // Bobbing da label
    var phase = Math.random() * Math.PI * 2;
    Engine.onTick(function(dt) {
      phase += dt * 1.4;
      lbl.position.y = 2.6 + Math.sin(phase) * 0.08;
    });

    npcs.push(entry);
  }

  function makeLabel(text, color) {
    var c = document.createElement('canvas');
    c.width = 220; c.height = 52;
    var ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.beginPath();
    ctx.roundRect(2, 2, 216, 48, 9);
    ctx.fill();
    ctx.fillStyle = color || '#fff';
    ctx.font = 'bold 21px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(text, 110, 35);
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(c),
      transparent: true,
      depthTest: false,
    }));
    sp.scale.set(2.6, 0.62, 1);
    return sp;
  }

  // ── TICK ─────────────────────────────────────────
  function tick() {
    if (typeof Player === 'undefined') return;
    var pp = Player.getPosition();
    nearestNPC = null;
    var best = DIST;

    npcs.forEach(function(npc) {
      var dx = pp.x - npc.x;
      var dz = pp.z - npc.z;
      var d  = Math.sqrt(dx * dx + dz * dz);

      // Vira o NPC para o jogador quando perto
      if (d < DIST * 2.5) {
        npc.root.rotation.y = Math.atan2(dx, dz);
      }

      if (d < best) { best = d; nearestNPC = npc; }
    });

    var prompt = document.getElementById('interact-prompt');
    if (!prompt) return;
    if (nearestNPC) {
      prompt.textContent = '[E] Falar com ' + nearestNPC.label;
      prompt.style.display = 'block';
    } else {
      prompt.style.display = 'none';
    }
  }

  function interactNearest() {
    if (nearestNPC) { ShopUI.open(nearestNPC.key); return true; }
    return false;
  }

  return { init, interactNearest };
})();