// mobs.js — Mobs inimigos (zona z=-130..-85)
const Mobs = (() => {

  var _scene = function() { return Engine.getScene(); };
  var mobs   = [];

  var TYPES = [
    { id:'alien',   src:'assets/npcs/alien.png',   color:0x00ff88, hp:3, coins:15, name:'Alien'    },
    { id:'android', src:'assets/npcs/android.png', color:0x4488ff, hp:4, coins:20, name:'Android'  },
    { id:'ghost',   src:'assets/npcs/ghost.png',   color:0xccccff, hp:2, coins:12, name:'Fantasma' },
    { id:'ninja',   src:'assets/npcs/ninja.png',   color:0x444444, hp:5, coins:25, name:'Ninja'    },
  ];

  // Pontos de spawn na zona de mobs
  var SPAWNS = [
    [-58,-92],[-38,-100],[-12,-95],[12,-108],[38,-97],[60,-110],
    [-52,-115],[-22,-103],[22,-118],[50,-102],
  ];

  var HIT_DIST    = 2.8;
  var AGGRO_DIST  = 14;

  function init() {
    SPAWNS.forEach(function(sp, i) {
      spawnMob(TYPES[i % TYPES.length], sp[0], sp[1]);
    });
    Engine.onTick(tick);
  }

  function spawnMob(type, x, z) {
    var g = new THREE.Group();

    // Sprite frontal
    var tex  = new THREE.TextureLoader().load(type.src);
    var mats = Array(6).fill(null).map(function(_, i) {
      return i === 4
        ? new THREE.MeshLambertMaterial({ map: tex })
        : new THREE.MeshLambertMaterial({ color: type.color });
    });
    var body = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 0.5), mats);
    body.position.y = 1; body.castShadow = true; g.add(body);

    // HP bar
    var bar = makeHPBar(type.hp, type.hp);
    bar.position.y = 2.6; g.add(bar);

    g.position.set(x, 0, z);
    _scene().add(g);

    mobs.push({
      g: g, body: body, bar: bar,
      type: type,
      hp: type.hp,
      alive: true,
      hitCd: 0,
      spawnX: x, spawnZ: z,
      roamT: Math.random()*3, roamDX: 0, roamDZ: 0,
    });
  }

  function makeHPBar(hp, max) {
    var c = document.createElement('canvas');
    c.width = 80; c.height = 12;
    var ctx = c.getContext('2d');
    drawHP(ctx, hp, max);
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(c), transparent: true, depthTest: false
    }));
    sp.scale.set(1.4, 0.22, 1);
    sp._c = c; sp._ctx = ctx; sp._max = max;
    return sp;
  }

  function drawHP(ctx, hp, max) {
    ctx.clearRect(0,0,80,12);
    ctx.fillStyle = '#222'; ctx.fillRect(0,0,80,12);
    var pct = hp / max;
    ctx.fillStyle = pct > 0.5 ? '#4caf50' : pct > 0.25 ? '#ff9800' : '#e53935';
    ctx.fillRect(1, 1, Math.round(pct*78), 10);
  }

  function tick(dt) {
    if (typeof Player === 'undefined') return;
    var pp = Player.getPosition();
    mobs.forEach(function(mob) {
      if (!mob.alive) return;
      if (mob.hitCd > 0) mob.hitCd -= dt;

      var dx = pp.x - mob.g.position.x;
      var dz = pp.z - mob.g.position.z;
      var dist = Math.sqrt(dx*dx + dz*dz);

      if (dist < AGGRO_DIST) {
        // Persegue
        mob.g.position.x += (dx/dist)*2.5*dt;
        mob.g.position.z += (dz/dist)*2.5*dt;
        mob.g.rotation.y  = Math.atan2(dx, dz);
      } else {
        // Patrulha
        mob.roamT -= dt;
        if (mob.roamT <= 0) {
          mob.roamT = 2 + Math.random()*3;
          var a = Math.random()*Math.PI*2;
          mob.roamDX = Math.cos(a)*1.5;
          mob.roamDZ = Math.sin(a)*1.5;
        }
        mob.g.position.x += mob.roamDX*dt;
        mob.g.position.z += mob.roamDZ*dt;
        // Mantém na zona
        if (mob.g.position.z > -86)  mob.g.position.z = -86;
        if (mob.g.position.z < -128) mob.g.position.z = -128;
      }
    });
  }

  // Chamado pelo player ao atacar
  function tryHit(playerPos) {
    var hit = false;
    mobs.forEach(function(mob) {
      if (!mob.alive || mob.hitCd > 0) return;
      var dx = playerPos.x - mob.g.position.x;
      var dz = playerPos.z - mob.g.position.z;
      if (Math.sqrt(dx*dx+dz*dz) > HIT_DIST) return;

      mob.hp--;
      mob.hitCd = 0.5;
      drawHP(mob.bar._ctx, mob.hp, mob.bar._max);
      mob.bar.material.map.needsUpdate = true;

      // Flash
      mob.body.material.forEach && mob.body.material.forEach(function(m) {
        if (m.emissive) m.emissive.setHex(0xff0000);
      });
      setTimeout(function() {
        if (!mob.body.material.forEach) return;
        mob.body.material.forEach(function(m) { if(m.emissive) m.emissive.setHex(0); });
      }, 180);

      if (mob.hp <= 0) killMob(mob);
      hit = true;
    });
    return hit;
  }

  function killMob(mob) {
    mob.alive = false;
    _scene().remove(mob.g);
    GameState.addCoins(mob.type.coins);
    GameState.addMobKill();
    floatText(mob.g.position, '+' + mob.type.coins + '🪙');
    // Respawn 15s
    setTimeout(function() {
      mob.hp = mob.type.hp; mob.alive = true;
      mob.g.position.set(mob.spawnX, 0, mob.spawnZ);
      _scene().add(mob.g);
      drawHP(mob.bar._ctx, mob.hp, mob.bar._max);
      mob.bar.material.map.needsUpdate = true;
    }, 15000);
  }

  function floatText(pos, text) {
    var c = document.createElement('canvas');
    c.width = 120; c.height = 40;
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#ffd740';
    ctx.font = 'bold 26px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(text, 60, 30);
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(c), transparent: true, depthTest: false
    }));
    sp.scale.set(2.2, 0.6, 1);
    sp.position.copy(pos); sp.position.y += 2.5;
    _scene().add(sp);
    var t = 0;
    function ft(dt) {
      t += dt; sp.position.y += dt*1.5;
      sp.material.opacity = Math.max(0, 1 - t/1.5);
      if (t > 1.5) { _scene().remove(sp); Engine.removeTick(ft); }
    }
    Engine.onTick(ft);
  }

  return { init, tryHit };
})();