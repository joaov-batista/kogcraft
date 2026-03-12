// ═══════════════════════════════════════════════
//  ENGINE.JS — Three.js setup + game loop
// ═══════════════════════════════════════════════

const Engine = (() => {

  let scene, camera, renderer, clock;
  let animCallbacks = [];
  let paused = false;

  function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 40, 120);

    // Camera — terceira pessoa, controlada pelo player
    camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 500);
    camera.position.set(0, 2, 5);

    // Renderer
    const canvas = document.getElementById('game-canvas');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    // Clock
    clock = new THREE.Clock();

    // Luz ambiente
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);

    // Sol
    const sun = new THREE.DirectionalLight(0xfffbe0, 1.4);
    sun.position.set(60, 80, 40);
    sun.castShadow = true;
    sun.shadow.mapSize.width  = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near   = 1;
    sun.shadow.camera.far    = 300;
    sun.shadow.camera.left   = -80;
    sun.shadow.camera.right  =  80;
    sun.shadow.camera.top    =  80;
    sun.shadow.camera.bottom = -80;
    sun.shadow.bias = -0.001;
    scene.add(sun);

    // Luz de preenchimento
    const fill = new THREE.DirectionalLight(0xadd8e6, 0.4);
    fill.position.set(-30, 20, -20);
    scene.add(fill);

    // Resize
    window.addEventListener('resize', () => {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
    });

    loop();
  }

  function loop() {
    requestAnimationFrame(loop);
    if (paused) return;
    const dt = Math.min(clock.getDelta(), 0.05); // cap 50ms
    for (const cb of animCallbacks) cb(dt);
    renderer.render(scene, camera);
  }

  function onTick(cb)    { animCallbacks.push(cb); }
  function setPaused(v)  { paused = v; if (!v) clock.getDelta(); }
  function getScene()    { return scene; }
  function getCamera()   { return camera; }
  function getRenderer() { return renderer; }
  function getClock()    { return clock; }

  return { init, onTick, setPaused, getScene, getCamera, getRenderer, getClock };
})();