// ═══════════════════════════════════════════════
//  FIREBASE.JS — Auth + presença + posição
// ═══════════════════════════════════════════════

const FirebaseManager = (() => {

  let presenceRef = null;
  let unsubPresence = null;
  let lastUpdate = 0;

  // ── AUTH ──────────────────────────────────────
  async function login(email, password) {
    const cred = await AUTH.signInWithEmailAndPassword(email, password);
    return cred.user;
  }

  async function register(email, password, skin, name) {
    const cred = await AUTH.createUserWithEmailAndPassword(email, password);
    await DB.collection('users').doc(cred.user.uid).set({
      skin,
      name: name || skin,
      coins: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    return cred.user;
  }

  async function logout() {
    await setOffline();
    await AUTH.signOut();
  }

  // ── PERFIL ────────────────────────────────────
  async function getProfile(uid) {
    const doc = await DB.collection('users').doc(uid).get();
    return doc.exists ? doc.data() : null;
  }

  async function saveSkin(uid, skin) {
    await DB.collection('users').doc(uid).update({ skin });
  }

  async function addCoins(uid, amount) {
    await DB.collection('users').doc(uid).update({
      coins: firebase.firestore.FieldValue.increment(amount),
    });
  }

  // ── PRESENÇA ──────────────────────────────────
  function startPresence(uid, skin, name) {
    presenceRef = DB.collection('presence').doc(uid);
    presenceRef.set({
      uid, skin, name: name || skin,
      x: 5, y: 0, z: 5, ry: 0,
      anim: 'idle',
      online: true,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    unsubPresence = DB.collection('presence')
      .where('online', '==', true)
      .onSnapshot(snap => {
        snap.docChanges().forEach(change => {
          const data = change.doc.data();
          if (data.uid === uid) return;
          if (change.type === 'removed' || !data.online) {
            Players.remove(data.uid);
          } else {
            Players.upsert(data.uid, data);
          }
        });
      });

    window.addEventListener('beforeunload', setOffline);
  }

  function updatePosition(pos, ry, anim) {
    if (!presenceRef) return;
    const now = Date.now();
    if (now - lastUpdate < 100) return;
    lastUpdate = now;
    presenceRef.update({
      x: +pos.x.toFixed(2), y: +pos.y.toFixed(2), z: +pos.z.toFixed(2),
      ry: +ry.toFixed(3), anim,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    }).catch(() => {});
  }

  async function setOffline() {
    if (presenceRef) await presenceRef.update({ online: false }).catch(() => {});
  }

  function stopListening() {
    if (unsubPresence) unsubPresence();
  }

  return { login, register, logout, getProfile, saveSkin, addCoins, startPresence, updatePosition, setOffline, stopListening };
})();