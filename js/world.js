// world.js — KOG City Map  (refeito limpo)
//
// LAYOUT Z (câmera olha para Z+):
//   z = -130..-90   ZONA DE MOBS
//   z = -85..-52    PISTA DE CORRIDA
//   z = -40..+40    CIDADE
//   z = +48..+90    QUADRA DE FUTEBOL
//
// Todos os PLANOS de chão ficam em Y = 0 (receiveShadow, sem colisão).
// Walls/colisores ficam Y > 0.
// A estrada é um plano em Y = 0.02 (ligeiramente acima do chão-grama).

const World = (() => {

  var _sc = function() { return Engine.getScene(); };

  // ── Casas ───────────────────────────────────
  var houses     = [];   // dados de interação
  var houseParts = [];   // meshes modificáveis

  // ── MATERIAIS REUTILIZÁVEIS ─────────────────
  var _mats = {};
  function mat(hex, alpha) {
    var k = hex + (alpha||1);
    if (_mats[k]) return _mats[k];
    var o = new THREE.MeshLambertMaterial({ color: hex });
    if (alpha && alpha < 1) { o.transparent = true; o.opacity = alpha; }
    _mats[k] = o;
    return o;
  }

  // ── GEOMETRIAS REUTILIZÁVEIS ─────────────────
  var _geos = {};
  function boxGeo(w,h,d) {
    var k = w+'x'+h+'x'+d;
    if (!_geos[k]) _geos[k] = new THREE.BoxGeometry(w,h,d);
    return _geos[k];
  }

  // ── HELPERS ─────────────────────────────────
  // Plano de chão — sem colisão, Y fixo
  function gfloor(w, d, hex, x, z, y) {
    y = y || 0.01;
    var m = new THREE.Mesh(new THREE.PlaneGeometry(w, d),
      new THREE.MeshLambertMaterial({ color: hex }));
    m.rotation.x = -Math.PI/2;
    m.position.set(x, y, z);
    m.receiveShadow = true;
    _sc().add(m);
    return m;
  }

  // Caixa com colisão
  function box(w, h, d, hex, x, y, z, ry, alpha) {
    var m = new THREE.Mesh(boxGeo(w,h,d), mat(hex, alpha));
    m.position.set(x, y, z);
    if (ry) m.rotation.y = ry;
    m.castShadow   = true;
    m.receiveShadow = true;
    _sc().add(m);
    Physics.registerCollider(m);
    return m;
  }

  // Caixa SEM colisão (decoração)
  function deco(w, h, d, hex, x, y, z, ry) {
    var m = new THREE.Mesh(boxGeo(w,h,d), mat(hex));
    m.position.set(x, y, z);
    if (ry) m.rotation.y = ry;
    m.castShadow = true;
    _sc().add(m);
    return m;
  }

  // Cilindro
  function cyl(rt, rb, h, seg, hex, x, y, z) {
    var m = new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg), mat(hex));
    m.position.set(x,y,z);
    m.castShadow = true; m.receiveShadow = true;
    _sc().add(m);
    Physics.registerCollider(m);
    return m;
  }

  // Cone
  function cone(r, h, seg, hex, x, y, z, ry) {
    var m = new THREE.Mesh(new THREE.ConeGeometry(r,h,seg), mat(hex));
    m.position.set(x,y,z);
    if (ry) m.rotation.y = ry;
    m.castShadow = true;
    _sc().add(m);
    return m;
  }

  // Sprite de texto
  function label(text, x, y, z, scaleX, color) {
    scaleX = scaleX || 5; color = color || '#00e5ff';
    var c = document.createElement('canvas');
    c.width = 320; c.height = 64;
    var ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.roundRect(2,2,316,60,10); ctx.fill();
    ctx.fillStyle = color;
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(text, 160, 42);
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(c), transparent:true, depthTest:false
    }));
    sp.scale.set(scaleX, scaleX*0.2, 1);
    sp.position.set(x,y,z);
    _sc().add(sp);
    return sp;
  }

  // Árvore
  function tree(x, z) {
    cyl(0.22, 0.28, 2.8, 6, 0x5d4037, x, 1.4, z);
    cone(1.8, 2.8, 7, 0x2e7d32, x, 4.0, z);
    cone(1.3, 2.2, 7, 0x388e3c, x, 5.4, z);
    cone(0.8, 1.8, 7, 0x43a047, x, 6.5, z);
  }

  // Poste
  function lamp(x, z) {
    cyl(0.07, 0.09, 5.5, 6, 0x607d8b, x, 2.75, z);
    var pt = new THREE.PointLight(0xfffbe0, 0.9, 22);
    pt.position.set(x, 6, z);
    _sc().add(pt);
    var cap = new THREE.Mesh(new THREE.SphereGeometry(0.18,6,4),
      new THREE.MeshLambertMaterial({ color:0xffffcc, emissive:0xffff44, emissiveIntensity:0.7 }));
    cap.position.set(x,6,z); _sc().add(cap);
  }

  // ══════════════════════════════════════════════
  //  INIT
  // ══════════════════════════════════════════════
  function init() {
    buildBaseGround();
    buildCity();
    buildRaceTrack();
    buildMobZone();
    buildSoccer();
  }

  // ── CHÃO BASE (grama) ────────────────────────
  function buildBaseGround() {
    // Um grande plano de grama
    gfloor(500, 500, 0x5aad50, 0, 0, 0);
  }

  // ══════════════════════════════════════════════
  //  CIDADE   z = -40..+40,  x = -100..+100
  // ══════════════════════════════════════════════
  function buildCity() {
    // Grama do bairro (sobre a grama base)
    gfloor(200, 90, 0x62b854, 0, 0, 0.005);

    // ── RUAS (Y = 0.02, acima da grama) ──
    var roadY = 0.02;
    // Rua leste-oeste (z=0)
    gfloor(200, 10, 0x3a3a42, 0, 0, roadY);
    // Rua norte-sul (x=0)
    gfloor(10, 90, 0x3a3a42, 0, 0, roadY);

    // Calçadas (Y = 0.015, entre grama e rua)
    var swY = 0.015;
    gfloor(200, 1.8, 0x9aabb8, 0, -5.9, swY);
    gfloor(200, 1.8, 0x9aabb8, 0,  5.9, swY);
    gfloor(1.8, 90,  0x9aabb8, -5.9, 0, swY);
    gfloor(1.8, 90,  0x9aabb8,  5.9, 0, swY);

    // Faixas de pedestres
    var cwY = 0.025;
    for (var ci = -2; ci <= 2; ci++) {
      gfloor(1.2, 4.5, 0xffffff,  ci*1.4,  8.2, cwY);
      gfloor(1.2, 4.5, 0xffffff,  ci*1.4, -8.2, cwY);
      gfloor(4.5, 1.2, 0xffffff,  8.2, ci*1.4, cwY);
      gfloor(4.5, 1.2, 0xffffff, -8.2, ci*1.4, cwY);
    }

    // Praça central
    gfloor(18, 18, 0x8d9e7a, 0, 0, 0.01);
    buildFountain();

    // Oito casas
    var HXS = [-45, -15, 15, 45];
    HXS.forEach(function(hx, i) {
      buildHouse(hx, -28, i);
      buildHouse(hx,  28, i+4);
    });

    // Árvores da cidade
    [[-68,-18],[-68,0],[-68,18],[68,-18],[68,0],[68,18],
     [-32,-44],[0,-44],[32,-44],[-32,44],[0,44],[32,44],
     [-55,-52],[55,-52],[-55,52],[55,52]].forEach(function(t){ tree(t[0],t[1]); });

    // Postes
    [[-20,-8],[20,-8],[-20,8],[20,8],[-44,-8],[44,-8],[-44,8],[44,8]].forEach(function(l){ lamp(l[0],l[1]); });

    // Label da cidade
    label('🏙 KOG CITY', 0, 4, -42, 6, '#ffd740');
  }

  // ── CASA MODULAR ─────────────────────────────
  function buildHouse(x, z, idx) {
    var dir   = z < 0 ? -1 : 1; // -1=norte, +1=sul
    var front = z + dir*4.5;     // face frontal da casa

    // Lote de grama clara
    gfloor(24, 20, 0x72c85a, x, z + dir*0.5, 0.008);

    // Paredes (4 lados separados — modificáveis)
    var wm = mat(0xf5e6c8);
    var wFront = new THREE.Mesh(boxGeo(10,4,0.22), wm);
    wFront.position.set(x, 2, front);
    wFront.castShadow = true; wFront.receiveShadow = true;
    _sc().add(wFront); Physics.registerCollider(wFront);

    var wBack  = new THREE.Mesh(boxGeo(10,4,0.22), wm);
    wBack.position.set(x, 2, z - dir*4.5);
    wBack.castShadow = true; wBack.receiveShadow = true;
    _sc().add(wBack); Physics.registerCollider(wBack);

    var wLeft  = box(0.22, 4, 9, 0xf5e6c8, x-5, 2, z);
    var wRight = box(0.22, 4, 9, 0xf5e6c8, x+5, 2, z);
    box(10, 0.22, 9, 0xf5e6c8, x, 4.11, z); // teto fechado

    // Telhado cone (4 lados = mais "casa")
    var rm = mat(0xc0392b);
    var roof = new THREE.Mesh(new THREE.ConeGeometry(8, 3.5, 4), rm);
    roof.position.set(x, 6, z);
    roof.rotation.y = Math.PI/4;
    roof.castShadow = true; _sc().add(roof);

    // Porta
    deco(1.4, 2.4, 0.15, 0x6d4c41, x, 1.2, front + dir*0.08);

    // Janelas
    var wim = mat(0x90caf9, 0.8);
    var winL = new THREE.Mesh(boxGeo(1.5,1.1,0.12), wim);
    winL.position.set(x-2.8, 2.6, front + dir*0.1); _sc().add(winL);
    var winR = new THREE.Mesh(boxGeo(1.5,1.1,0.12), wim);
    winR.position.set(x+2.8, 2.6, front + dir*0.1); _sc().add(winR);

    // Cerca
    var fence = mat(0xd7ccc8);
    for (var fi = -4; fi <= 4; fi += 2) {
      deco(0.2, 0.9, 0.2, 0xd7ccc8, x+fi, 0.45, z + dir*5.6);
    }
    deco(9, 0.12, 0.12, 0xd7ccc8, x, 0.9, z + dir*5.6);

    // Flores
    var fl1 = buildFlower(x-1.5, z + dir*5.0);
    var fl2 = buildFlower(x+1.5, z + dir*5.0);

    // Garagem separada ao lado
    var gx = x + (x < 0 ? -7.5 : 7.5);
    var garParts = buildGarage(gx, z, dir);

    // Salva partes modificáveis
    houseParts[idx] = {
      walls:  [wFront, wBack, wLeft, wRight],
      roof:   roof,
      winL:   winL,
      winR:   winR,
      garWall: garParts.wall,
      garRoof: garParts.roof,
      flowers: [fl1, fl2],
    };

    // Dados de interação (ponto de entrada na frente)
    houses.push({
      idx: idx, x: x, z: z, owner: null, nameSprite: null,
      ix: x, iz: z + dir*6.2,
    });
  }

  function buildFlower(x, z) {
    cyl(0.04, 0.04, 0.4, 5, 0x388e3c, x, 0.2, z);
    var petals = new THREE.Mesh(new THREE.SphereGeometry(0.18,7,5), mat(0xff4081));
    petals.position.set(x, 0.44, z); _sc().add(petals);
    return { petals: petals };
  }

  function buildGarage(x, z, dir) {
    gfloor(9, 9, 0x2c2c3a, x, z, 0.009);
    var gWall = box(9, 3.5, 8, 0x546e7a, x, 1.75, z);
    var gRoof = deco(9.4, 0.22, 8.4, 0x37474f, x, 3.62, z);
    // Porta da garagem (abertura na face frontal)
    deco(5.5, 3.0, 0.1, 0x607d8b, x, 1.5, z + dir*4.02);
    return { wall: gWall, roof: gRoof };
  }

  // ── FONTE ────────────────────────────────────
  function buildFountain() {
    box(5.5, 0.55, 5.5, 0x90a4ae, 0, 0.28, 0);
    var torus = new THREE.Mesh(new THREE.TorusGeometry(2.4,0.2,6,18), mat(0x90a4ae));
    torus.rotation.x = Math.PI/2; torus.position.set(0, 0.62, 0); _sc().add(torus);
    var water = new THREE.Mesh(new THREE.CylinderGeometry(2.1,2.1,0.12,18), mat(0x4fc3f7, 0.8));
    water.position.set(0, 0.62, 0); _sc().add(water);
    cyl(0.22,0.22,2,6,0x90a4ae,0,1.35,0);
  }

  // ══════════════════════════════════════════════
  //  PISTA DE CORRIDA   z = -85..-52
  // ══════════════════════════════════════════════
  function buildRaceTrack() {
    var CZ = -68; // centro Z da pista

    // Grama ao redor da pista
    gfloor(220, 48, 0x4a9e40, 0, CZ, 0.005);

    // Asfalto principal — Y=0.02 (acima da grama)
    var trackY = 0.02;
    gfloor(170, 20, 0x2c2c38, 0, CZ, trackY);

    // Linhas laterais brancas
    gfloor(170, 0.45, 0xffffff, 0, CZ-10, trackY+0.001);
    gfloor(170, 0.45, 0xffffff, 0, CZ+10, trackY+0.001);

    // Linha central tracejada
    for (var xi = -82; xi < 82; xi += 8) {
      gfloor(4, 0.3, 0xffffff, xi, CZ, trackY+0.002);
    }

    // Xadrez largada (x=-62) e chegada (x=+62)
    for (var ci = 0; ci < 10; ci++) {
      var even = ci % 2 === 0;
      gfloor(0.65, 2.2, even ? 0xffffff : 0x111111, -62, CZ-4.9+ci*2, trackY+0.003);
      gfloor(0.65, 2.2, even ? 0x111111 : 0xffffff, -62, CZ-3.8+ci*2, trackY+0.003);
      gfloor(0.65, 2.2, even ? 0xffffff : 0x111111,  62, CZ-4.9+ci*2, trackY+0.003);
      gfloor(0.65, 2.2, even ? 0x111111 : 0xffffff,  62, CZ-3.8+ci*2, trackY+0.003);
    }

    // Barreiras (colisão)
    for (var bx = -84; bx <= 84; bx += 5) {
      var red = (Math.floor(bx/5) % 2 === 0);
      box(4.5, 0.85, 0.75, red ? 0xe53935 : 0xffffff, bx, 0.42, CZ-11.5);
      box(4.5, 0.85, 0.75, red ? 0xffffff : 0xe53935, bx, 0.42, CZ+11.5);
    }

    // Arquibancada (sul da pista)
    box(55, 3.5, 4.5, 0x546e7a, 0, 1.75, CZ+16);
    box(55, 2.5, 3.5, 0x4a6070, 0, 3.2,  CZ+18.5);
    box(55, 1.5, 2.5, 0x405565, 0, 4.25, CZ+20.5);

    // Árvores e postes
    for (var tx = -85; tx <= 85; tx += 18) { tree(tx, CZ+24); tree(tx, CZ-24); }
    [[-62,CZ+14],[0,CZ+14],[62,CZ+14],[-62,CZ-14],[0,CZ-14],[62,CZ-14]].forEach(function(l){ lamp(l[0],l[1]); });

    label('🏁 LARGADA', -62, 3.5, CZ-13, 5, '#ffd740');
    label('🏁 CHEGADA',  62, 3.5, CZ-13, 5, '#ffd740');
    label('🏎 PISTA KOG', 0, 2.5, CZ+22, 5, '#00e5ff');
  }

  // ══════════════════════════════════════════════
  //  ZONA DE MOBS   z = -90..-130
  // ══════════════════════════════════════════════
  function buildMobZone() {
    // Chão escuro sobre a grama base
    gfloor(220, 50, 0x1a2e1a, 0, -110, 0.008);

    var stone = 0x4a5568;

    // Placa de entrada
    cyl(0.15,0.15,3.5,5,0x607d8b, -90, 1.75, -90);
    box(8, 2, 0.2, 0x8b0000, -90, 3.5, -90);
    label('⚠ ZONA PERIGOSA', -90, 5.2, -90, 6, '#ff4444');

    // Ruínas (decoração + colisão)
    [[-58,-93],[-35,-106],[-5,-97],[18,-112],[42,-99],[64,-108],[-70,-119]].forEach(function(r) {
      box(3+Math.random()*2, 2.2+Math.random()*2.5, 3, stone,
          r[0], 1.2, r[1]);
    });

    // Árvores sinistras
    var dk = 0x152015, dt = 0x2d1a0e;
    [[-68,-91],[-46,-102],[-20,-96],[10,-111],[34,-98],[55,-107],[72,-94]].forEach(function(t) {
      cyl(0.18,0.26,4.5,5,dt, t[0],2.25,t[1]);
      cone(2.2,4,5,dk, t[0],5.5,t[1]);
    });

    // Névoa escura (pontos de luz vermelhos)
    [[-60,-100],[-30,-115],[0,-105],[30,-120],[60,-100]].forEach(function(l) {
      var pt = new THREE.PointLight(0x880000, 0.8, 18);
      pt.position.set(l[0], 2, l[1]); _sc().add(pt);
    });
  }

  // ══════════════════════════════════════════════
  //  QUADRA DE FUTEBOL   z = +50..+90
  // ══════════════════════════════════════════════
  function buildSoccer() {
    var CZ = 70;

    // Grama ao redor
    gfloor(120, 55, 0x55aa44, 0, CZ, 0.005);

    // Listras do campo
    for (var si = 0; si < 5; si++) {
      gfloor(52, 6.8, si%2===0 ? 0x3a9e3a : 0x338833, 0, CZ-17+si*6.8, 0.01);
    }

    // Linhas (Y = 0.015)
    var ly = 0.015;
    gfloor(52, 0.3, 0xffffff, 0, CZ-17, ly); // linha fundo norte
    gfloor(52, 0.3, 0xffffff, 0, CZ+17, ly); // linha fundo sul
    gfloor(0.3, 34, 0xffffff, -25.8, CZ, ly); // lateral esq
    gfloor(0.3, 34, 0xffffff,  25.8, CZ, ly); // lateral dir
    gfloor(0.3, 34, 0xffffff,  0,    CZ, ly); // meio campo
    gfloor(10,  0.3, 0xffffff, 0, CZ-10, ly); // área norte
    gfloor(0.3, 10,  0xffffff, -5, CZ-15, ly);
    gfloor(0.3, 10,  0xffffff,  5, CZ-15, ly);
    gfloor(10,  0.3, 0xffffff, 0, CZ+10, ly);
    gfloor(0.3, 10,  0xffffff, -5, CZ+15, ly);
    gfloor(0.3, 10,  0xffffff,  5, CZ+15, ly);

    // Círculo central (triângulos em canvas texture)
    var cc = document.createElement('canvas'); cc.width=cc.height=256;
    var cctx = cc.getContext('2d');
    cctx.clearRect(0,0,256,256);
    cctx.strokeStyle = '#fff'; cctx.lineWidth = 5;
    cctx.beginPath(); cctx.arc(128,128,110,0,Math.PI*2); cctx.stroke();
    var circMesh = new THREE.Mesh(new THREE.PlaneGeometry(14,14),
      new THREE.MeshLambertMaterial({ map: new THREE.CanvasTexture(cc), transparent:true }));
    circMesh.rotation.x = -Math.PI/2; circMesh.position.set(0, 0.016, CZ); _sc().add(circMesh);

    // Gols
    buildGoal(-26, CZ, true);
    buildGoal( 26, CZ, false);

    // Muros laterais baixos
    box(52.6, 1.4, 0.28, 0xaaaaaa, 0, 0.7, CZ-17.5);
    box(52.6, 1.4, 0.28, 0xaaaaaa, 0, 0.7, CZ+17.5);
    box(0.28, 1.4, 35,   0xaaaaaa, -26.2, 0.7, CZ);
    box(0.28, 1.4, 35,   0xaaaaaa,  26.2, 0.7, CZ);

    // Arquibancada
    box(55, 3, 4.5, 0x546e7a, 0, 1.5, CZ+21);
    box(55, 2, 3.5, 0x4a6070, 0, 2.8, CZ+23.5);

    // Postes
    lamp(-28, CZ-20); lamp(28, CZ-20); lamp(-28, CZ+20); lamp(28, CZ+20);
    label('⚽ QUADRA KOG', 0, 3.5, CZ+22.5, 5, '#ffffff');
  }

  function buildGoal(x, cz, facingRight) {
    var gm = 0xeeeeee;
    var d = facingRight ? 2 : -2; // profundidade do gol
    // Postes verticais
    box(0.18,3,0.18,gm, x, 1.5, cz-3);
    box(0.18,3,0.18,gm, x, 1.5, cz+3);
    // Travessão
    box(0.18,0.18,6.4,gm, x, 3.1, cz);
    // Rede traseira (visual)
    box(Math.abs(d), 3, 0.08, 0xdddddd, x+d/2, 1.5, cz-3, 0, 0.35);
    box(Math.abs(d), 3, 0.08, 0xdddddd, x+d/2, 1.5, cz+3, 0, 0.35);
    box(0.08, 3, 6.4, 0xdddddd, x+d, 1.5, cz, 0, 0.35);
    box(Math.abs(d), 0.08, 6.4, 0xdddddd, x+d/2, 3.1, cz, 0, 0.35);
  }

  // ── API PÚBLICA ───────────────────────────────
  function getHouses()   { return houses; }

  function claimHouse(idx, playerName) {
    var h = houses[idx];
    if (!h || h.owner) return false;
    h.owner = playerName;
    if (h.nameSprite) _sc().remove(h.nameSprite);
    h.nameSprite = label('🏠 ' + playerName, h.x, 9, h.z, 5.5, '#ffd740');
    return true;
  }

  function setHousePartColor(idx, part, hex) {
    var p = houseParts[idx];
    if (!p) return;
    var c = new THREE.Color().setStyle(hex);
    var apply = function(m) { if (m && m.material && m.material.color) m.material.color.copy(c); };
    if (part === 'wall')   p.walls.forEach(apply);
    if (part === 'roof')   apply(p.roof);
    if (part === 'window') { apply(p.winL); apply(p.winR); }
    if (part === 'garage') { apply(p.garWall); apply(p.garRoof); }
    if (part === 'flower') {
      p.flowers.forEach(function(f) { if (f && f.petals) f.petals.material.color.copy(c); });
    }
  }

  return { init, getHouses, claimHouse, setHousePartColor };
})();