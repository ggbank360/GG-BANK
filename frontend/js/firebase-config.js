/**
 * GG BANK - Firebase Client Configuration & Database Sync Engine
 * Project: gg-bank-fc100
 */

const firebaseConfig = {
  apiKey: "AIzaSyBcJ9LyBWyqDZjY5bxlui_m_Bq3qx1nxJI",
  authDomain: "ggbank-d6735.firebaseapp.com",
  databaseURL: "https://ggbank-d6735-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ggbank-d6735",
  storageBucket: "ggbank-d6735.firebasestorage.app",
  messagingSenderId: "19675824500",
  appId: "1:19675824500:web:ac34fb072cd7a88653ec21",
  measurementId: "G-1GP5RLN83B"
};

// Initialize Firebase SDK
let firebaseApp = null;
let firebaseAuth = null;
let firestoreDb = null;
let firebaseAnalytics = null;
let isFirebaseLive = false;

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
    console.log("🔥 GG BANK: Connected to Firebase Project [gg-bank-fc100]");
  }
} catch (error) {
  console.warn("GG BANK: Firebase connection notice:", error.message);
}

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
      projectId: 'gg-bank-fc100',
      timestamp: new Date().toISOString(),
      status: 'ONLINE'
    }, { merge: true });
    
    const latency = Date.now() - startTime;
    return {
      status: 'LIVE_FIRESTORE',
      connected: true,
      latencyMs: latency,
      projectId: 'gg-bank-fc100',
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
    projectId: 'gg-bank-fc100',
    totalStoredRecords: totalDocs,
    collections: results,
    timestamp: new Date().toISOString()
  };
}

window.firebaseConfig = firebaseConfig;
window.firebaseApp = firebaseApp;
window.firebaseAuth = firebaseAuth;
window.firestoreDb = firestoreDb;
window.firebaseAnalytics = firebaseAnalytics;
window.isFirebaseLive = isFirebaseLive;
window.saveToFirestore = saveToFirestore;
window.getFromFirestore = getFromFirestore;
window.getAllFromFirestore = getAllFromFirestore;
window.testFirebaseConnection = testFirebaseConnection;
window.inspectDatabaseCollections = inspectDatabaseCollections;

