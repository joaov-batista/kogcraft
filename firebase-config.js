// ═══════════════════════════════════════════════
//  FIREBASE-CONFIG.JS — KOG City
// ═══════════════════════════════════════════════
//  ⚠️  NÃO use "import" aqui — o projeto usa
//  Firebase via CDN (compat), não ES Modules!
// ═══════════════════════════════════════════════

const firebaseConfig = {
  apiKey:            "AIzaSyANSiQboEi_g68MwL3lp65f0eXUJY9ErLo",
  authDomain:        "kog-city.firebaseapp.com",
  projectId:         "kog-city",
  storageBucket:     "kog-city.firebasestorage.app",
  messagingSenderId: "1048429203750",
  appId:             "1:1048429203750:web:96f25bf1459cf08f3cf1e7"
};

firebase.initializeApp(firebaseConfig);

const DB   = firebase.firestore();
const AUTH = firebase.auth();