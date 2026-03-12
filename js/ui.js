// ui.js

const UI = (() => {

  const SKINS = [
    { id:'um',     label:'Skin 1'  },
    { id:'dois',   label:'Skin 2'  },
    { id:'tres',   label:'Skin 3'  },
    { id:'quatro', label:'Skin 4'  },
    { id:'cinco',  label:'Skin 5'  },
    { id:'seis',   label:'Skin 6'  },
    { id:'sete',   label:'Skin 7'  },
    { id:'oito',   label:'Skin 8'  },
    { id:'nove',   label:'Skin 9'  },
    { id:'dez',    label:'Skin 10' },
    { id:'onze',   label:'Skin 11' },
  ];

  let skin     = SKINS[0].id;
  let paused   = false;
  let paf      = null; // preview animation frame
  let pScene, pCam, pRenderer, pModel, pMixer, pClock;
  let rotY = 0, drag = false, lastX = 0;

  // ── INIT ──────────────────────────────────────────
  function init() {
    renderLogin();
    bindPauseButtons();
  }

  // ══════════════════════════════════════════════════
  //  LOGIN
  // ══════════════════════════════════════════════════
  function renderLogin(msgText, msgOk) {
    skin = SKINS[0].id;
    stopPreview();
    var box = document.getElementById('auth-box');

    box.innerHTML = `
      <p class="auth-title">🏙 KOG City</p>
      <p class="auth-sub">Escolha sua skin e entre</p>

      <div class="login-layout">

        <!-- Coluna esquerda: preview + grade -->
        <div class="login-left">
          <canvas id="preview-canvas" width="155" height="195"></canvas>
          <p class="preview-label" id="skin-label">Skin 1</p>
          <p class="preview-hint">← arraste para girar →</p>
          <div class="skin-grid" id="skin-grid"></div>
        </div>

        <!-- Coluna direita: form -->
        <div class="login-right">
          <input type="email"    id="l-email" placeholder="Email"  autocomplete="email"/>
          <input type="password" id="l-pass"  placeholder="Senha"  autocomplete="current-password"/>
          <button class="btn btn-cyan" id="btn-login">Entrar</button>
          <p class="auth-msg${msgOk ? ' ok' : ''}" id="auth-msg">${msgText||''}</p>
          <p class="auth-footer">Não tem conta?
            <a id="go-reg">Criar conta</a>
          </p>
        </div>
      </div>
    `;

    buildGrid();
    setTimeout(initPreview, 60);

    document.getElementById('btn-login').addEventListener('click', doLogin);
    document.getElementById('go-reg').addEventListener('click', renderRegister);
    document.getElementById('l-pass').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') doLogin();
    });
  }

  async function doLogin() {
    var email = g('l-email'), pass = g('l-pass');
    if (!email || !pass) { msg('Preencha email e senha.'); return; }
    msg('Entrando...');
    try {
      var user    = await FirebaseManager.login(email, pass);
      var profile = await FirebaseManager.getProfile(user.uid);
      // Salva skin escolhida agora
      await FirebaseManager.saveSkin(user.uid, skin);
      var name = profile && profile.name ? profile.name : skin;
      enterGame(user, name, skin, profile ? (profile.coins||0) : 0);
    } catch(e) { msg(fmtErr(e.code)); }
  }

  // ══════════════════════════════════════════════════
  //  CADASTRO
  // ══════════════════════════════════════════════════
  function renderRegister() {
    stopPreview();
    var box = document.getElementById('auth-box');

    box.innerHTML = `
      <p class="auth-title">🏙 KOG City</p>
      <p class="auth-sub">Criar nova conta</p>

      <input type="text"     id="r-name"  placeholder="Nickname (aparece no jogo)" maxlength="16" autocomplete="off"/>
      <input type="email"    id="r-email" placeholder="Email" autocomplete="email"/>
      <input type="password" id="r-pass"  placeholder="Senha (mín. 6 caracteres)" autocomplete="new-password"/>

      <button class="btn btn-pink" id="btn-reg">Criar conta</button>
      <p class="auth-msg" id="auth-msg"></p>

      <p class="auth-footer"><a id="go-login">← Voltar ao login</a></p>
    `;

    document.getElementById('btn-reg').addEventListener('click', doRegister);
    document.getElementById('go-login').addEventListener('click', function() { renderLogin(); });
    document.getElementById('r-pass').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') doRegister();
    });
  }

  async function doRegister() {
    var name  = g('r-name');
    var email = g('r-email');
    var pass  = g('r-pass');
    if (!name)           { msg('Digite seu nickname.'); return; }
    if (!email)          { msg('Digite seu email.'); return; }
    if (pass.length < 6) { msg('Senha mínima: 6 caracteres.'); return; }
    msg('Criando conta...');
    try {
      await FirebaseManager.register(email, pass, 'um', name);
      // Vai para o login com mensagem de sucesso
      renderLogin('Conta criada! Faça login para entrar.', true);
    } catch(e) { msg(fmtErr(e.code)); }
  }

  // ── helpers de form ────────────────────────────────
  function g(id)  { var e=document.getElementById(id); return e ? e.value.trim() : ''; }
  function msg(t, ok) {
    var e = document.getElementById('auth-msg');
    if (!e) return;
    e.textContent = t;
    if (ok) e.classList.add('ok'); else e.classList.remove('ok');
  }
  function fmtErr(code) {
    return ({
      'auth/user-not-found':       'Usuário não encontrado.',
      'auth/wrong-password':       'Senha incorreta.',
      'auth/email-already-in-use': 'Email já cadastrado.',
      'auth/invalid-email':        'Email inválido.',
      'auth/weak-password':        'Senha fraca.',
      'auth/invalid-credential':   'Email ou senha incorretos.',
    })[code] || ('Erro: ' + code);
  }

  // ── entrar no jogo ─────────────────────────────────
  function enterGame(user, name, skinId, coins) {
    stopPreview();
    document.getElementById('screen-login').classList.add('hidden');
    document.getElementById('screen-game').classList.remove('hidden');
    Main.startGame(user.uid, name, skinId, coins);
  }

  // ── GRADE DE SKINS ─────────────────────────────────
  function buildGrid() {
    var grid = document.getElementById('skin-grid');
    if (!grid) return;
    grid.innerHTML = '';
    SKINS.forEach(function(s) {
      var card = document.createElement('div');
      card.className = 'skin-card' + (s.id === skin ? ' selected' : '');

      var cv = document.createElement('canvas');
      cv.width = 28; cv.height = 28;
      renderFace(cv, s.id);

      var lbl = document.createElement('span');
      lbl.textContent = s.label;

      card.appendChild(cv); card.appendChild(lbl);
      card.addEventListener('click', function() {
        document.querySelectorAll('.skin-card').forEach(function(c){ c.classList.remove('selected'); });
        card.classList.add('selected');
        skin = s.id;
        var el = document.getElementById('skin-label');
        if (el) el.textContent = s.label;
        applyPreviewSkin(s.id);
      });
      grid.appendChild(card);
    });
  }

  function renderFace(canvas, skinId) {
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1a1f35';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    var img = new Image();
    img.onload = function() {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 8, 8, 8, 8, 0, 0, canvas.width, canvas.height);
    };
    img.src = 'assets/skins/' + skinId + '.png';
  }

  // ── PREVIEW 3D ─────────────────────────────────────
  function initPreview() {
    var canvas = document.getElementById('preview-canvas');
    if (!canvas) return;

    pScene = new THREE.Scene();
    pScene.background = new THREE.Color(0x151826);

    pCam = new THREE.PerspectiveCamera(44, canvas.clientWidth / canvas.clientHeight, 0.1, 50);
    pCam.position.set(0, 1.15, 2.9);
    pCam.lookAt(0, 0.9, 0);

    pRenderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    pRenderer.setSize(canvas.clientWidth, canvas.clientHeight);
    pRenderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    pRenderer.outputEncoding = THREE.sRGBEncoding;
    pRenderer.shadowMap.enabled = true;

    pScene.add(new THREE.AmbientLight(0xffffff, 0.6));
    var key = new THREE.DirectionalLight(0xffffff, 1.0);
    key.position.set(2, 4, 3); pScene.add(key);
    var fill = new THREE.DirectionalLight(0x8899ff, 0.3);
    fill.position.set(-2, 1, -2); pScene.add(fill);

    // Chão
    var floor = new THREE.Mesh(new THREE.CircleGeometry(0.95, 32),
      new THREE.MeshLambertMaterial({ color: 0x1e2440 }));
    floor.rotation.x = -Math.PI/2; pScene.add(floor);

    // Anel neon
    var ring = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.032, 8, 48),
      new THREE.MeshLambertMaterial({ color:0x00e5ff, emissive:0x00e5ff, emissiveIntensity:0.8 }));
    ring.rotation.x = -Math.PI/2; ring.position.y = 0.003; pScene.add(ring);

    pClock = new THREE.Clock();

    // Drag
    canvas.addEventListener('mousedown',  function(e){ drag=true; lastX=e.clientX; });
    window.addEventListener('mouseup',    function(){ drag=false; });
    window.addEventListener('mousemove',  function(e){ if(!drag) return; rotY+=(e.clientX-lastX)*0.013; lastX=e.clientX; });
    canvas.addEventListener('touchstart', function(e){ drag=true; lastX=e.touches[0].clientX; e.preventDefault(); }, { passive:false });
    window.addEventListener('touchend',   function(){ drag=false; });
    window.addEventListener('touchmove',  function(e){ if(!drag) return; rotY+=(e.touches[0].clientX-lastX)*0.013; lastX=e.touches[0].clientX; });

    function loop() {
      paf = requestAnimationFrame(loop);
      var dt = pClock.getDelta();
      if (!drag) rotY += dt * 0.6;
      if (pModel) pModel.rotation.y = rotY;
      if (pMixer) pMixer.update(dt);
      pRenderer.render(pScene, pCam);
    }
    loop();
    loadPreviewModel(skin);
  }

  function loadPreviewModel(skinId) {
    if (pModel) { pScene.remove(pModel); pModel=null; }
    if (pMixer) { pMixer.stopAllAction(); pMixer=null; }

    new THREE.GLTFLoader().load('assets/models/player.gltf',
      function(gltf) {
        pModel = gltf.scene;
        // Pé no chão
        var bbox = new THREE.Box3().setFromObject(pModel);
        pModel.position.y = -bbox.min.y;
        pModel.scale.set(0.88, 0.88, 0.88);
        pModel.traverse(function(c){ if(c.isMesh) c.castShadow=true; });
        pScene.add(pModel);
        if (gltf.animations.length) {
          pMixer = new THREE.AnimationMixer(pModel);
          var idle = gltf.animations.find(function(a){ return a.name==='idle'; }) || gltf.animations[0];
          pMixer.clipAction(idle).setLoop(THREE.LoopRepeat, Infinity).play();
        }
        applyPreviewSkin(skinId);
      }, null, function(){}
    );
  }

  function applyPreviewSkin(id) {
    if (!pModel) { skin=id; return; }
    new THREE.TextureLoader().load('assets/skins/'+id+'.png', function(tex){
      tex.magFilter=THREE.NearestFilter; tex.minFilter=THREE.NearestFilter;
      tex.flipY=false; tex.encoding=THREE.sRGBEncoding;
      pModel.traverse(function(c){
        if (!c.isMesh) return;
        c.material = new THREE.MeshLambertMaterial({ map:tex, side:THREE.FrontSide });
      });
    });
  }

  function stopPreview() {
    if (paf) { cancelAnimationFrame(paf); paf=null; }
    drag = false;
  }

  // ── HUD ───────────────────────────────────────────
  function setPlayerName(n) { var e=document.getElementById('hud-name');   if(e) e.textContent=n; }
  function setCoins(n)      { var e=document.getElementById('coin-count'); if(e) e.textContent=n; }

  // ── PAUSE ─────────────────────────────────────────
  function bindPauseButtons() {
    document.getElementById('btn-resume')?.addEventListener('click', togglePause);
    document.getElementById('btn-logout')?.addEventListener('click', async function(){
      await FirebaseManager.logout(); location.reload();
    });
  }

  function togglePause() {
    paused = !paused;
    Engine.setPaused(paused);
    document.getElementById('menu-pause').classList.toggle('hidden', !paused);
  }

  // ── LOADING ───────────────────────────────────────
  function showLoading() {
    var ov = document.createElement('div');
    ov.id = 'loading-overlay';
    ov.innerHTML = '<h2>KOG CITY</h2><div class="loading-bar-wrap"><div class="loading-bar" id="load-bar"></div></div><p style="color:var(--muted);font-size:12px;margin-top:8px">Carregando...</p>';
    document.body.appendChild(ov);
  }
  function setLoadProgress(p) { var b=document.getElementById('load-bar'); if(b) b.style.width=(p*100)+'%'; }
  function hideLoading() {
    var ov=document.getElementById('loading-overlay');
    if(ov){ ov.style.transition='opacity .4s'; ov.style.opacity='0'; setTimeout(function(){ ov.remove(); },400); }
  }

  return { init, setPlayerName, setCoins, togglePause, showLoading, setLoadProgress, hideLoading };
})();