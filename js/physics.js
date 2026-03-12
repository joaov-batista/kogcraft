// physics.js
// body.position = BASE DOS PÉS (Y=0 é chão do mundo)

const Physics = (() => {

  const GRAVITY    = -22;
  const COLLIDERS  = [];

  function registerCollider(mesh) {
    var box = new THREE.Box3().setFromObject(mesh);
    COLLIDERS.push(box);
  }

  function step(body, dt) {
    // Gravidade só quando no ar
    if (!body.onGround || body.velocity.y > 0) {
      body.velocity.y += GRAVITY * dt;
    }

    // Move vertical
    body.position.y += body.velocity.y * dt;

    // Chão sob o jogador
    var floorY = _floorBelow(body.position.x, body.position.z);

    if (body.position.y <= floorY) {
      body.position.y = floorY;  // snap exato, sem enterrar
      body.velocity.y = 0;
      body.onGround   = true;
    } else {
      body.onGround = false;
    }

    // Move horizontal
    body.position.x += body.velocity.x * dt;
    body.position.z += body.velocity.z * dt;

    _resolveXZ(body);
  }

  // Chão mais alto que esteja abaixo do jogador
  function _floorBelow(x, z) {
    var best = 0;
    for (var i = 0; i < COLLIDERS.length; i++) {
      var b = COLLIDERS[i];
      // Dentro da projeção XZ?
      if (x < b.min.x - 0.05 || x > b.max.x + 0.05) continue;
      if (z < b.min.z - 0.05 || z > b.max.z + 0.05) continue;
      if (b.max.y > best) best = b.max.y;
    }
    return best;
  }

  function _resolveXZ(body) {
    var r = body.radius || 0.3;
    var h = body.height  || 1.8;
    for (var i = 0; i < COLLIDERS.length; i++) {
      var b = COLLIDERS[i];
      // Só paredes: jogador NÃO está em cima nem completamente acima
      if (body.position.y >= b.max.y - 0.1)  continue;
      if (body.position.y + h <= b.min.y)     continue;
      var cx   = Math.max(b.min.x, Math.min(body.position.x, b.max.x));
      var cz   = Math.max(b.min.z, Math.min(body.position.z, b.max.z));
      var dx   = body.position.x - cx;
      var dz   = body.position.z - cz;
      var dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < r && dist > 0.0001) {
        var nx = dx / dist, nz = dz / dist;
        body.position.x = cx + nx * r;
        body.position.z = cz + nz * r;
        var dot = body.velocity.x * nx + body.velocity.z * nz;
        if (dot < 0) {
          body.velocity.x -= dot * nx;
          body.velocity.z -= dot * nz;
        }
      }
    }
  }

  return { step, registerCollider, COLLIDERS };
})();