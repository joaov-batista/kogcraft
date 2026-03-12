window.addEventListener('load', () => {
  setTimeout(() => {
    const loader = new THREE.GLTFLoader();
    loader.load('assets/models/player.gltf', gltf => {
      gltf.scene.traverse(c => {
        if (c.isMesh) {
          console.log(
            'MESH:', c.name,
            '| UV:', c.geometry.attributes.uv ? 'SIM' : 'NÃO',
            '| Material:', c.material.name,
            '| Textura:', c.material.map ? c.material.map.image?.src : 'nenhuma'
          );
        }
      });
    });
  }, 1000);
});