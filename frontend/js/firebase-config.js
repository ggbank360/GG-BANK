/**
 * GG BANK - Firebase Client Configuration & Database Sync Engine
 * Project: gg-techcore
 */

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAyfF49hVKbrpjpgynAWm7a0z33lUofv_U",
  authDomain: "gg-techcore.firebaseapp.com",
  databaseURL: "https://gg-techcore-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "gg-techcore",
  storageBucket: "gg-techcore.firebasestorage.app",
  messagingSenderId: "880101841073",
  appId: "1:880101841073:web:8efdef0da8b63bc85c2a90",
  measurementId: "G-Q89J26XCGW"
};

// Initialize Firebase SDK instances
let firebaseApp = null;
let firebaseAuth = null;
let firestoreDb = null;
let firebaseAnalytics = null;
let isFirebaseLive = false;

function initFirebase() {
  try {
    if (typeof firebase !== 'undefined') {
      if (!firebase.apps.length) {
        firebaseApp = firebase.initializeApp(firebaseConfig);
      } else {
        firebaseApp = firebase.app();
      }
      
      if (firebase.auth) {
        firebaseAuth = firebase.auth();
      }
      
      if (firebase.firestore) {
        firestoreDb = firebase.firestore();
        isFirebaseLive = true;
      }

      if (firebase.analytics) {
        firebaseAnalytics = firebase.analytics();
      }
      console.log("🔥 GG BANK: Connected to Firebase Project [gg-techcore]");
    }
  } catch (error) {
    console.warn("GG BANK: Firebase connection notice:", error.message);
  }
}

initFirebase();

// Compatibility references requested by user
const app = firebaseApp;
const analytics = firebaseAnalytics;

// Direct Firestore Database Helpers with Auto-Sync
async function saveToFirestore(collection, docId, data) {
  if (!firestoreDb) return false;
  try {
    const cleanData = { ...data, lastSyncedAt: new Date().toISOString() };
    if (docId) {
      await firestoreDb.collection(collection).doc(String(docId)).set(cleanData, { merge: true });
    } else {
      await firestoreDb.collection(collection).add(cleanData);
    }
    console.log(`🔥 [Firestore] Synced to ${collection}/${docId}`);
    return true;
  } catch (err) {
    console.warn(`Firestore save warning (${collection}):`, err.message);
    return false;
  }
}

async function getFromFirestore(collection, docId) {
  if (!firestoreDb) return null;
  try {
    const doc = await firestoreDb.collection(collection).doc(String(docId)).get();
    if (doc.exists) {
      return doc.data();
    }
    return null;
  } catch (err) {
    console.warn(`Firestore get warning (${collection}):`, err.message);
    return null;
  }
}

async function testFirebaseConnection() {
  if (!firestoreDb) {
    return {
      status: 'LOCAL_MODE',
      connected: false,
      message: 'Firebase SDK not active in window. Operating in high-performance local database mode.'
    };
  }
  const startTime = Date.now();
  try {
    // Perform test ping on system_health
    const testRef = firestoreDb.collection('system_health').doc('ping');
    await testRef.set({
      appName: 'GG BANK',
      projectId: 'gg-techcore',
      timestamp: new Date().toISOString(),
      status: 'ONLINE'
    }, { merge: true });
    
    const latency = Date.now() - startTime;
    return {
      status: 'LIVE_FIRESTORE',
      connected: true,
      latencyMs: latency,
      projectId: 'gg-techcore',
      message: `Successfully connected to Cloud Firestore (Latency: ${latency}ms)!`
    };
  } catch (err) {
    return {
      status: 'PERMISSION_OR_OFFLINE',
      connected: false,
      error: err.message,
      message: `Firebase connection test: ${err.message}`
    };
  }
}

async function getAllFromFirestore(collection) {
  if (!firestoreDb) return [];
  try {
    const snap = await firestoreDb.collection(collection).get();
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.warn(`Firestore getAll warning (${collection}):`, err.message);
    return [];
  }
}

async function inspectDatabaseCollections() {
  const collections = ['users', 'accounts', 'transactions', 'loans', 'officers', 'notifications', 'audit_logs'];
  const results = {};
  let totalDocs = 0;

  for (const col of collections) {
    let fireCount = 0;
    let localCount = 0;

    // Check Firestore
    if (firestoreDb) {
      try {
        const snap = await firestoreDb.collection(col).get();
        fireCount = snap.size;
      } catch (e) {
        fireCount = 0;
      }
    }

    // Check Local
    try {
      const localKey = 'gg_' + col;
      const data = JSON.parse(localStorage.getItem(localKey) || '[]');
      localCount = data.length;
    } catch (e) {
      localCount = 0;
    }

    results[col] = {
      firestore: fireCount,
      local: localCount,
      activeSync: fireCount > 0 || localCount > 0
    };
    totalDocs += Math.max(fireCount, localCount);
  }

  return {
    isOnline: !!firestoreDb,
    projectId: 'gg-techcore',
    totalStoredRecords: totalDocs,
    collections: results,
    timestamp: new Date().toISOString()
  };
}

// Global window assignments for both legacy and modular patterns
window.firebaseConfig = firebaseConfig;
window.firebaseApp = firebaseApp;
window.app = firebaseApp;
window.firebaseAuth = firebaseAuth;
window.firestoreDb = firestoreDb;
window.firebaseAnalytics = firebaseAnalytics;
window.analytics = firebaseAnalytics;
window.isFirebaseLive = isFirebaseLive;
window.saveToFirestore = saveToFirestore;
window.getFromFirestore = getFromFirestore;
window.getAllFromFirestore = getAllFromFirestore;
window.testFirebaseConnection = testFirebaseConnection;
window.inspectDatabaseCollections = inspectDatabaseCollections;
