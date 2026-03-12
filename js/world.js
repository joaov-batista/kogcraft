// ═══════════════════════════════════════════════
//  WORLD.JS — Cidade KOG: terreno, ruas, casas
// ═══════════════════════════════════════════════

const World = (() => {

  const scene = () => Engine.getScene();

  // Mapeamento de dono por casa (índice 0-9)
  const HOUSE_OWNERS = [
    'joao','edson','rafa','leo','brisa',
    'taiana','eduarda','gabriella','kat','debora'
  ];

  // Cores por jogador
  const PLAYER_COLORS = {
    joao:      0x4fc3f7, edson:    0xef5350, rafa:      0x66bb6a,
    leo:       0xffa726, brisa:    0xab47bc, taiana:    0xec407a,
    eduarda:   0x26c6da, gabriella:0x8d6e63, kat:       0xd4e157,
    debora:    0xff7043,
  };

  // Materiais reutilizáveis
  const MAT = {
    road:    new THREE.MeshLambertMaterial({ color: 0x444455 }),
    sidewalk:new THREE.MeshLambertMaterial({ color: 0x8899aa }),
    grass:   new THREE.MeshLambertMaterial({ color: 0x4caf50 }),
    roof:    new THREE.MeshLambertMaterial({ color: 0xc62828 }),
    wall:    new THREE.MeshLambertMaterial({ color: 0xfff9c4 }),
    window:  new THREE.MeshLambertMaterial({ color: 0x90caf9, transparent: true, opacity: 0.7 }),
    door:    new THREE.MeshLambertMaterial({ color: 0x6d4c41 }),
    fence:   new THREE.MeshLambertMaterial({ color: 0xbcaaa4 }),
    stripe:  new THREE.MeshLambertMaterial({ color: 0xffffff }),
    tree_t:  new THREE.MeshLambertMaterial({ color: 0x2e7d32 }),
    tree_s:  new THREE.MeshLambertMaterial({ color: 0x5d4037 }),
    track:   new THREE.MeshLambertMaterial({ color: 0x37474f }),
    sand:    new THREE.MeshLambertMaterial({ color: 0xf9a825 }),
    goal:    new THREE.MeshLambertMaterial({ color: 0xffffff }),
    field:   new THREE.MeshLambertMaterial({ color: 0x388e3c }),
  };

  function box(w, h, d, mat, x, y, z, rx=0, ry=0) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, 0);
    m.castShadow = true; m.receiveShadow = true;
    scene().add(m);
    Physics.registerCollider(m);
    return m;
  }

  function flat(w, d, mat, x, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, d), mat);
    m.position.set(x, 0, z);
    m.receiveShadow = true;
    scene().add(m);
    return m; // sem colisão vertical para chão
  }

  function init() {
    buildGround();
    buildRoads();
    buildHouses();
    buildTrees();
    buildRaceTrack();
    buildSoccerField();
    buildLamps();
    buildFountain();
  }

  // ── CHÃO BASE ────────────────────────────────
  function buildGround() {
    const geo = new THREE.PlaneGeometry(300, 300);
    const mat = new THREE.MeshLambertMaterial({ color: 0x4caf50 });
    const ground = new THREE.Mesh(geo, mat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene().add(ground);
  }

  // ── RUAS ─────────────────────────────────────
  function buildRoads() {
    // Rua principal H  (z=0)
    flat(160, 10, MAT.road, 0, 0);
    // Rua principal V  (x=0)
    flat(10, 160, MAT.road, 0, 0);

    // Calçadas
    flat(160, 2, MAT.sidewalk, 0, -6);
    flat(160, 2, MAT.sidewalk, 0,  6);
    flat(2, 160, MAT.sidewalk, -6, 0);
    flat(2, 160, MAT.sidewalk,  6, 0);

    // Listras brancas (faixas de pedestres)
    for (let i = -4; i <= 4; i += 2) {
      flat(0.8, 5, MAT.stripe, i, 7.5);
      flat(0.8, 5, MAT.stripe, i,-7.5);
      flat(5, 0.8, MAT.stripe, 7.5, i);
      flat(5, 0.8, MAT.stripe,-7.5, i);
    }
  }

  // ── CASAS ────────────────────────────────────
  function buildHouses() {
    // 5 casas lado norte, 5 lado sul
    // Layout: x de -40 a +40, z = ±20
    const positions = [
      [-40,-20], [-20,-20], [0,-20], [20,-20], [40,-20],
      [-40, 20], [-20, 20], [0, 20], [20, 20], [40, 20],
    ];

    positions.forEach(([x, z], i) => {
      buildHouse(x, z, HOUSE_OWNERS[i], PLAYER_COLORS[HOUSE_OWNERS[i]]);
    });
  }

  function buildHouse(x, z, owner, color) {
    const wallMat = new THREE.MeshLambertMaterial({ color: 0xfff9c4 });
    const accentMat = new THREE.MeshLambertMaterial({ color });

    // Base / chão da casa
    flat(12, 10, accentMat, x, z + (z < 0 ? -1 : 1));

    // Paredes
    box(10, 4, 8, wallMat, x, 2.2, z);

    // Teto (pirâmide aproximada com box inclinado)
    const roofMat = new THREE.MeshLambertMaterial({ color });
    const roof = new THREE.Mesh(new THREE.ConeGeometry(7.5, 3, 4), roofMat);
    roof.rotation.y = Math.PI / 4;
    roof.position.set(x, 5.5, z);
    roof.castShadow = true;
    scene().add(roof);

    // Porta
    box(1.2, 2.2, 0.15, MAT.door, x, 1.1, z + (z < 0 ? -4.1 : 4.1));

    // Janelas
    box(1.4, 1, 0.1, MAT.window, x - 2.5, 2.5, z + (z < 0 ? -4.1 : 4.1));
    box(1.4, 1, 0.1, MAT.window, x + 2.5, 2.5, z + (z < 0 ? -4.1 : 4.1));

    // Cerca
    buildFence(x, z);

    // Nome do dono acima da porta (sprite texto)
    addNameTag(owner, x, 7.5, z);
  }

  function buildFence(x, z) {
    const sign = z < 0 ? -1 : 1;
    // Lateral
    for (let i = -5; i <= 5; i += 2) {
      box(0.2, 1, 0.2, MAT.fence, x + i, 0.5, z + sign * 5.5);
    }
    box(10, 0.2, 0.15, MAT.fence, x, 1, z + sign * 5.5);
  }

  function addNameTag(name, x, y, z) {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#00000088';
    ctx.roundRect(0, 0, 256, 64, 10);
    ctx.fill();
    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 28px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(name.toUpperCase(), 128, 42);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(x, y, z);
    sprite.scale.set(4, 1, 1);
    Engine.getScene().add(sprite);
  }

  // ── ÁRVORES ──────────────────────────────────
  function buildTrees() {
    const spots = [
      [-50,-50],[-30,-50],[30,-50],[50,-50],
      [-50, 50],[-30, 50],[30, 50],[50, 50],
      [-60,  0],[ 60,  0],[ 0,-60],[ 0, 60],
      [-15,-15],[ 15,-15],[-15, 15],[15,  15],
    ];
    for (const [x, z] of spots) addTree(x, z);
  }

  function addTree(x, z) {
    // Tronco
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.35, 2, 6),
      MAT.tree_s
    );
    trunk.position.set(x, 1, z);
    trunk.castShadow = true;
    scene().add(trunk);
    Physics.registerCollider(trunk);

    // Copa (3 esferas empilhadas)
    const sizes = [[1.4, 2.5], [1.1, 3.8], [0.8, 4.8]];
    for (const [r, y] of sizes) {
      const top = new THREE.Mesh(
        new THREE.IcosahedronGeometry(r, 0),
        MAT.tree_t
      );
      top.position.set(x, y, z);
      top.castShadow = true;
      scene().add(top);
    }
  }

  // ── PISTA DE CORRIDA ─────────────────────────
  function buildRaceTrack() {
    // Reta principal: x de -70 a 70, z = -80
    flat(150, 12, MAT.track, 0, -80);
    // Listras laterais
    flat(150, 0.5, MAT.stripe, 0, -74.5);
    flat(150, 0.5, MAT.stripe, 0, -85.5);
    // Linha de largada
    for (let i = -5; i <= 5; i += 2) {
      flat(1.5, 0.8, MAT.stripe, i * 3, -80);
    }
    // Barreiras
    for (let x = -75; x <= 75; x += 5) {
      box(4, 0.8, 0.8, new THREE.MeshLambertMaterial({ color: 0xe53935 }), x, 0.5, -74);
      box(4, 0.8, 0.8, new THREE.MeshLambertMaterial({ color: 0xe53935 }), x, 0.5, -86);
    }
    // Tribuna (arquibancada simples)
    box(30, 3, 4, new THREE.MeshLambertMaterial({ color: 0x546e7a }), 0, 1.6, -70);
  }

  // ── QUADRA DE FUTEBOL ─────────────────────────
  function buildSoccerField() {
    const cx = 0, cz = 80;
    // Grama
    const field = new THREE.Mesh(new THREE.BoxGeometry(40, 0.2, 25), MAT.field);
    field.position.set(cx, 0, cz);
    field.receiveShadow = true;
    scene().add(field);

    // Linhas (stripe branca)
    flat(40, 0.25, MAT.stripe, cx, cz - 12.4);
    flat(40, 0.25, MAT.stripe, cx, cz + 12.4);
    flat(0.25, 25, MAT.stripe, cx - 19.9, cz);
    flat(0.25, 25, MAT.stripe, cx + 19.9, cz);
    flat(0.25, 25, MAT.stripe, cx, cz);

    // Gols
    buildGoal(cx - 21, cz);
    buildGoal(cx + 21, cz, true);

    // Traves (postes)
    buildFieldWalls(cx, cz);

    // Placa "QUADRA"
    addNameTag('⚽ QUADRA', cx, 3, cz - 14);
  }

  function buildGoal(x, z, flip = false) {
    const d = flip ? -1 : 1;
    box(0.15, 2.4, 6, MAT.goal, x, 1.2, z);             // poste traseiro
    box(0.15, 0.15, 6, MAT.goal, x + d * 1.5, 2.4, z);  // barra
    box(1.5, 2.4, 0.15, MAT.goal, x + d * 0.75, 1.2, z - 3); // lateral
    box(1.5, 2.4, 0.15, MAT.goal, x + d * 0.75, 1.2, z + 3); // lateral
  }

  function buildFieldWalls(cx, cz) {
    // Muros ao redor da quadra
    box(40, 1.5, 0.3, MAT.fence, cx, 0.75, cz - 13);
    box(40, 1.5, 0.3, MAT.fence, cx, 0.75, cz + 13);
    box(0.3, 1.5, 25, MAT.fence, cx - 20, 0.75, cz);
    box(0.3, 1.5, 25, MAT.fence, cx + 20, 0.75, cz);
  }

  // ── POSTES ───────────────────────────────────
  function buildLamps() {
    const spots = [
      [-20,-5],[20,-5],[-20,5],[20,5],
      [-20,-75],[20,-75],[-20,-85],[20,-85],
    ];
    for (const [x, z] of spots) buildLamp(x, z);
  }

  function buildLamp(x, z) {
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x607d8b });
    box(0.2, 5, 0.2, poleMat, x, 2.5, z);
    // luz pontual
    const light = new THREE.PointLight(0xfffbe0, 0.8, 18);
    light.position.set(x, 5.5, z);
    scene().add(light);
    // Cúpula
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 6, 4),
      new THREE.MeshLambertMaterial({ color: 0xffffe0, emissive: 0xffff88 })
    );
    cap.position.set(x, 5.5, z);
    scene().add(cap);
  }

  // ── FONTE CENTRAL ─────────────────────────────
  function buildFountain() {
    const baseMat = new THREE.MeshLambertMaterial({ color: 0x90a4ae });
    const waterMat = new THREE.MeshLambertMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.75 });

    // Base
    box(4, 0.5, 4, baseMat, 0, 0.25, 0);
    // Borda
    const geo = new THREE.TorusGeometry(2, 0.2, 6, 12);
    const torus = new THREE.Mesh(geo, baseMat);
    torus.rotation.x = Math.PI / 2;
    torus.position.set(0, 0.6, 0);
    scene().add(torus);
    // Água
    const water = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.2, 12), waterMat);
    water.position.set(0, 0.6, 0);
    scene().add(water);
    // Pilar central
    box(0.4, 2, 0.4, baseMat, 0, 1.25, 0);
  }

  // Retorna lista de owners para outros módulos
  function getHouseOwners() { return HOUSE_OWNERS; }
  function getPlayerColor(name) { return PLAYER_COLORS[name] || 0xffffff; }

  return { init, getHouseOwners, getPlayerColor };
})();