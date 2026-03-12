// players.js — Outros jogadores em tempo real
// Usa sempre assets/models/player.gltf + skin do jogador

const Players = (() => {

  const others     = {};
  const LERP_SPEED = 10;

  function init() {
    Engine.onTick(tick);
  }

  function upsert(uid, data) {
    if (!others[uid]) spawnRemote(uid, data);
    var o = others[uid];
    if (!o) return;
    o.targetPos.set(data.x || 0, data.y || 0, data.z || 0);
    o.targetRotY = data.ry  || 0;
    o.animName   = data.anim || 'idle';
  }

  function remove(uid) {
    var o = others[uid];
    if (!o) return;
    Engine.getScene().remove(o.root);
    delete others[uid];
  }

  function spawnRemote(uid, data) {
    var root  = new THREE.Group();
    var entry = {
      root:       root,
      mixer:      null,
      anims:      {},
      curAnim:    null,
      targetPos:  new THREE.Vector3(data.x || 0, data.y || 0, data.z || 0),
      targetRotY: data.ry  || 0,
      animName:   data.anim || 'idle',
      isFallback: false,
    };
    others[uid] = entry;

    // Carrega o mesmo player.gltf para todos
    var loader = new THREE.GLTFLoader();
    loader.load(
      'assets/models/player.gltf',
      function(gltf) {
        var model = gltf.scene;
        model.traverse(function(c) {
          if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; }
        });
        root.add(model);

        entry.mixer = new THREE.AnimationMixer(model);
        gltf.animations.forEach(function(clip) {
          entry.anims[clip.name] = entry.mixer.clipAction(clip);
        });

        // Aplica skin do jogador remoto
        var skinId = data.skin || 'um';
        applyRemoteSkin(model, skinId);

        // Nametag
        addNameTag(root, data.name || uid.slice(0, 8));
      },
      undefined,
      function() {
        // Fallback simples se nao carregar
        buildFallback(root, data.name || '?');
        entry.isFallback = true;
      }
    );

    root.position.set(data.x || 0, data.y || 0, data.z || 0);
    Engine.getScene().add(root);
  }

  function applyRemoteSkin(model, skinId) {
    new THREE.TextureLoader().load(
      'assets/skins/' + skinId + '.png',
      function(tex) {
        tex.magFilter   = THREE.NearestFilter;
        tex.minFilter   = THREE.NearestFilter;
        tex.flipY       = false;
        tex.encoding    = THREE.sRGBEncoding;
        tex.needsUpdate = true;
        model.traverse(function(c) {
          if (!c.isMesh) return;
          c.material = new THREE.MeshLambertMaterial({
            map:         tex,
            transparent: false,
            side:        THREE.FrontSide,
          });
        });
      }
    );
  }

  function addNameTag(root, name) {
    var canvas = document.createElement('canvas');
    canvas.width  = 256;
    canvas.height = 64;
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 64);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.roundRect(4, 8, 248, 48, 8);
    ctx.fill();
    ctx.fillStyle = '#ffd740';
    ctx.font = 'bold 26px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(name, 128, 44);
    var tex    = new THREE.CanvasTexture(canvas);
    var mat    = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    var sprite = new THREE.Sprite(mat);
    sprite.scale.set(2.5, 0.6, 1);
    sprite.position.y = 2.4;
    root.add(sprite);
  }

  function buildFallback(root, name) {
    var mat = new THREE.MeshLambertMaterial({ color: 0x888888 });
    var sk  = new THREE.MeshLambertMaterial({ color: 0xffcc99 });
    var parts = [
      [new THREE.BoxGeometry(0.5, 0.6, 0.25), mat,  0,    1.1 ],
      [new THREE.BoxGeometry(0.4, 0.4, 0.4),  sk,   0,    1.65],
      [new THREE.BoxGeometry(0.18,0.5, 0.18), mat, -0.34, 1.1 ],
      [new THREE.BoxGeometry(0.18,0.5, 0.18), mat,  0.34, 1.1 ],
      [new THREE.BoxGeometry(0.2, 0.55,0.2),  mat, -0.15, 0.5 ],
      [new THREE.BoxGeometry(0.2, 0.55,0.2),  mat,  0.15, 0.5 ],
    ];
    parts.forEach(function(p) {
      var mesh = new THREE.Mesh(p[0], p[1]);
      mesh.position.set(p[2], p[3], 0);
      mesh.castShadow = true;
      root.add(mesh);
    });
    addNameTag(root, name);
  }

  function playRemoteAnim(entry, name) {
    if (!entry.mixer || entry.curAnim === name) return;
    var action = entry.anims[name] || entry.anims['idle'];
    if (!action) return;
    if (entry.curAnim && entry.anims[entry.curAnim]) entry.anims[entry.curAnim].fadeOut(0.15);
    action.reset().fadeIn(0.15).play();
    entry.curAnim = name;
  }

  function tick(dt) {
    for (var uid in others) {
      var o = others[uid];
      o.root.position.lerp(o.targetPos, Math.min(1, LERP_SPEED * dt));
      o.root.rotation.y += (o.targetRotY - o.root.rotation.y) * Math.min(1, LERP_SPEED * dt);
      if (o.mixer) {
        playRemoteAnim(o, o.animName);
        o.mixer.update(dt);
      }
    }
  }

  return { init, upsert, remove };
})();