/**
 * GG BANK - Centralized Firebase Modular Configuration & Global Firestore Database Engine
 * Project: gg-techcore
 * Provides global real-time synchronization across Customer, Officer, and Admin portals.
 */

// Production Firebase Configuration
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

let firebaseApp = null;
let firebaseAuth = null;
let firestoreDb = null;
let isFirebaseLive = false;

// Dynamic SDK Script Loader to guarantee Firebase v10 is always available on all pages
function loadScriptAsync(src) {
  return new Promise((resolve, reject) => {
    // Check if script already in document
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.getAttribute('data-loaded') === 'true') {
        return resolve();
      }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', (e) => reject(e));
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = false; // Preserve sequential loading order
    script.onload = () => {
      script.setAttribute('data-loaded', 'true');
      resolve();
    };
    script.onerror = (err) => reject(new Error(`Failed to load Firebase SDK script: ${src}`));
    document.head.appendChild(script);
  });
}

// Global Promise that resolves once Firebase & Firestore are fully connected
window.firebaseReadyPromise = (async function setupFirebase() {
  try {
    if (typeof firebase === 'undefined' || !firebase.firestore) {
      console.log("🔥 GG BANK: Loading Firebase Modular v10 SDK scripts...");
      await loadScriptAsync('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
      await Promise.all([
        loadScriptAsync('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth-compat.js'),
        loadScriptAsync('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js')
      ]);
    }

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

    // Attach to global window object
    window.firebaseApp = firebaseApp;
    window.app = firebaseApp;
    window.firebaseAuth = firebaseAuth;
    window.auth = firebaseAuth;
    window.firestoreDb = firestoreDb;
    window.db = firestoreDb;
    window.isFirebaseLive = isFirebaseLive;

    console.log("🔥 GG BANK: Connected to Cloud Firestore [gg-techcore] globally!");

    // Seed initial demo data in Firestore if database is brand new
    await seedInitialFirestoreData();

    return { app: firebaseApp, db: firestoreDb, auth: firebaseAuth };
  } catch (err) {
    console.error("🔥 GG BANK: Firebase Initialization Error:", err);
    if (window.Utils && typeof Utils.showToast === 'function') {
      Utils.showToast("Database connection notice: " + err.message, "warning");
    }
    throw err;
  }
})();

/**
 * Client-Side HTML5 Canvas Image Compression Helper (Requirement 3)
 * Resizes and compresses uploaded KYC documents/photos to JPEG max 800px width,
 * quality 0.6, keeping payload size well under 100 KB to comfortably fit Firestore 1 MB document limit.
 */
async function compressKycImage(fileOrDataUrl, maxWidth = 800, quality = 0.6) {
  if (!fileOrDataUrl) return '';

  // If already a small SVG or tiny string, return as is
  if (typeof fileOrDataUrl === 'string') {
    if (fileOrDataUrl.startsWith('data:image/svg') || fileOrDataUrl.length < 50000) {
      return fileOrDataUrl;
    }
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width || 800;
        let height = img.height || 600;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(fileOrDataUrl);
      img.src = fileOrDataUrl;
    });
  }

  // If a File or Blob was uploaded
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width || 800;
        let height = img.height || 600;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      img.onerror = () => resolve(e.target.result);
      img.src = e.target.result;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(fileOrDataUrl);
  });
}
window.compressKycImage = compressKycImage;

/**
 * Centralized Firestore Database Operations
 * Strictly NO silent try/catch fallbacks to localStorage.
 */

// Save or Update Document in Firestore
async function saveToFirestore(collectionName, docId, data) {
  await window.firebaseReadyPromise;
  if (!firestoreDb) {
    const errMsg = "Firestore is not connected. Operation aborted.";
    console.error(errMsg);
    if (window.Utils && typeof Utils.showToast === 'function') Utils.showToast(errMsg, 'error');
    throw new Error(errMsg);
  }

  try {
    const payload = {
      ...data,
      lastUpdatedAt: firebase.firestore.FieldValue ? firebase.firestore.FieldValue.serverTimestamp() : new Date().toISOString()
    };
    
    if (docId) {
      await firestoreDb.collection(collectionName).doc(String(docId)).set(payload, { merge: true });
      console.log(`🔥 [Firestore] Written to ${collectionName}/${docId}`);
      return true;
    } else {
      const docRef = await firestoreDb.collection(collectionName).add(payload);
      console.log(`🔥 [Firestore] Created ${collectionName}/${docRef.id}`);
      return docRef.id;
    }
  } catch (err) {
    console.error(`🔥 [Firestore Error] Failed to save ${collectionName}/${docId}:`, err);
    if (window.Utils && typeof Utils.showToast === 'function') {
      Utils.showToast(`Database Error (${collectionName}): ${err.message}`, 'error');
    }
    throw err;
  }
}

// Get Document by ID
async function getFromFirestore(collectionName, docId) {
  await window.firebaseReadyPromise;
  if (!firestoreDb) return null;

  try {
    const docSnap = await firestoreDb.collection(collectionName).doc(String(docId)).get();
    if (docSnap.exists) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (err) {
    console.error(`🔥 [Firestore Error] Failed to get ${collectionName}/${docId}:`, err);
    if (window.Utils && typeof Utils.showToast === 'function') {
      Utils.showToast(`Database Read Error: ${err.message}`, 'error');
    }
    throw err;
  }
}

// Get All Documents from a Collection
async function getAllFromFirestore(collectionName) {
  await window.firebaseReadyPromise;
  if (!firestoreDb) return [];

  try {
    const snap = await firestoreDb.collection(collectionName).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error(`🔥 [Firestore Error] Failed to getAll ${collectionName}:`, err);
    if (window.Utils && typeof Utils.showToast === 'function') {
      Utils.showToast(`Database Query Error: ${err.message}`, 'error');
    }
    throw err;
  }
}

// Update specific fields on a document
async function updateFirestoreDoc(collectionName, docId, updates) {
  await window.firebaseReadyPromise;
  if (!firestoreDb) throw new Error("Firestore not initialized");

  try {
    const payload = {
      ...updates,
      lastUpdatedAt: firebase.firestore.FieldValue ? firebase.firestore.FieldValue.serverTimestamp() : new Date().toISOString()
    };
    await firestoreDb.collection(collectionName).doc(String(docId)).update(payload);
    console.log(`🔥 [Firestore] Updated ${collectionName}/${docId}`);
    return true;
  } catch (err) {
    console.error(`🔥 [Firestore Error] Update failed on ${collectionName}/${docId}:`, err);
    if (window.Utils && typeof Utils.showToast === 'function') {
      Utils.showToast(`Update Failed: ${err.message}`, 'error');
    }
    throw err;
  }
}

// Real-Time Document Listener (onSnapshot)
function listenToFirestoreDoc(collectionName, docId, onUpdate, onError) {
  if (!firestoreDb) {
    window.firebaseReadyPromise.then(() => {
      listenToFirestoreDoc(collectionName, docId, onUpdate, onError);
    });
    return () => {};
  }

  const unsubscribe = firestoreDb.collection(collectionName).doc(String(docId)).onSnapshot((snapshot) => {
    if (snapshot.exists) {
      onUpdate({ id: snapshot.id, ...snapshot.data() });
    } else {
      onUpdate(null);
    }
  }, (err) => {
    console.error(`🔥 [Firestore Listener Error] on ${collectionName}/${docId}:`, err);
    if (onError) onError(err);
  });

  return unsubscribe;
}

// Real-Time Collection Listener (onSnapshot)
function listenToFirestoreCollection(collectionName, queryModifiersFn, onUpdate, onError) {
  if (!firestoreDb) {
    window.firebaseReadyPromise.then(() => {
      listenToFirestoreCollection(collectionName, queryModifiersFn, onUpdate, onError);
    });
    return () => {};
  }

  let ref = firestoreDb.collection(collectionName);
  if (typeof queryModifiersFn === 'function') {
    ref = queryModifiersFn(ref);
  }

  const unsubscribe = ref.onSnapshot((snapshot) => {
    const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    onUpdate(list);
  }, (err) => {
    console.error(`🔥 [Firestore Collection Listener Error] on ${collectionName}:`, err);
    if (onError) onError(err);
  });

  return unsubscribe;
}

// Atomic Transaction Runner for Balances and Transfers
async function runFirestoreTransaction(transactionLogicFn) {
  await window.firebaseReadyPromise;
  if (!firestoreDb) throw new Error("Firestore not active for atomic transaction.");

  return firestoreDb.runTransaction(async (transaction) => {
    return await transactionLogicFn(transaction, firestoreDb);
  });
}

// Record Audit Log to Firestore
async function recordAuditLog({ actorId, actorName, role, action, targetId, details, status = 'SUCCESS' }) {
  try {
    await window.firebaseReadyPromise;
    if (!firestoreDb) return;

    const logId = 'LOG-' + Date.now().toString().slice(-6);
    const logData = {
      logId,
      actorId: actorId || 'SYSTEM',
      actorName: actorName || 'GG BANK System',
      role: role || 'USER',
      action: action || 'AUDIT',
      targetId: targetId || null,
      details: details || '',
      status: status || 'SUCCESS',
      timestamp: firebase.firestore.FieldValue ? firebase.firestore.FieldValue.serverTimestamp() : new Date().toISOString()
    };

    await firestoreDb.collection('auditLogs').doc(logId).set(logData);
    console.log(`🔥 [Audit Log] ${action} by ${actorName || actorId}`);
  } catch (err) {
    console.warn("Audit log notice:", err.message);
  }
}

/**
 * Initial Demo Seeding (Seeds Firestore once if accounts collection is empty)
 */
async function seedInitialFirestoreData() {
  try {
    const accountsRef = firestoreDb.collection('accounts');
    const existing = await accountsRef.limit(1).get();
    const needsFullSeed = existing.empty;

    const demoAccounts = [
      {
        accountNumber: "100188492019",
        userId: "usr-gowtham-101",
        fullName: "Gowtham NK",
        name: "Gowtham NK",
        email: "gowtham@ggbank.com",
        phone: "9876543210",
        password: "Password@123",
        accountType: "SAVINGS",
        balance: 65450.00,
        ifscCode: "GGBN0001234",
        branch: "Central Tech Branch",
        status: "ACTIVE",
        kycStatus: "VERIFIED",
        upiId: "gowtham@ggbank",
        dateOfBirth: "2003-05-14",
        address: "42 Cyber City, Tech Park, Bangalore",
        occupation: "Software Engineer",
        role: "CUSTOMER",
        createdAt: new Date().toISOString()
      },
      {
        accountNumber: "100188492020",
        userId: "usr-sarah-102",
        fullName: "Sarah Connor",
        name: "Sarah Connor",
        email: "sarah@ggbank.com",
        phone: "9123456780",
        password: "Password@123",
        accountType: "SAVINGS",
        balance: 32000.00,
        ifscCode: "GGBN0001234",
        branch: "Central Tech Branch",
        status: "ACTIVE",
        kycStatus: "VERIFIED",
        upiId: "sarah@ggbank",
        dateOfBirth: "2001-11-20",
        address: "77 Silicon Boulevard, Chennai",
        occupation: "Product Designer",
        role: "CUSTOMER",
        createdAt: new Date().toISOString()
      },
      {
        accountNumber: "100188492021",
        userId: "usr-saravan-103",
        fullName: "K Saravanapriyan",
        name: "K Saravanapriyan",
        email: "ksaravanapriyan8@gmail.com",
        phone: "9876543219",
        password: "Password@123",
        accountType: "SAVINGS",
        balance: 50000.00,
        ifscCode: "GGBN0001234",
        branch: "Central Tech Branch",
        status: "ACTIVE",
        kycStatus: "VERIFIED",
        upiId: "ksaravanapriyan8@ggbank",
        dateOfBirth: "2000-01-15",
        address: "12 Anna Salai, Chennai, Tamil Nadu",
        occupation: "Technology Consultant",
        role: "CUSTOMER",
        createdAt: new Date().toISOString()
      }
    ];

    const demoOfficers = [
      { officerId: 'off-001', employeeId: 'EMP-1001', name: 'Vikram Sharma', email: 'vikram.sharma@ggbank.com', phone: '+91 98765 43210', department: 'LOAN', designation: 'Chief Credit Officer', branch: 'Central Tech Branch', status: 'ACTIVE', password: 'Password@123', role: 'OFFICER' },
      { officerId: 'off-002', employeeId: 'EMP-1002', name: 'Anita Roy', email: 'anita.roy@ggbank.com', phone: '+91 98765 43211', department: 'LOAN', designation: 'Senior Personal Loan Underwriter', branch: 'Central Tech Branch', status: 'ACTIVE', password: 'Password@123', role: 'OFFICER' },
      { officerId: 'off-003', employeeId: 'EMP-1003', name: 'Priya Patel', email: 'priya.patel@ggbank.com', phone: '+91 98765 43212', department: 'COMPLIANCE', designation: 'Lead KYC & AML Compliance Officer', branch: 'Financial Tower Branch', status: 'ACTIVE', password: 'Password@123', role: 'OFFICER' },
      { officerId: 'off-004', employeeId: 'EMP-1004', name: 'Karthik Rao', email: 'karthik.rao@ggbank.com', phone: '+91 98765 43213', department: 'TREASURY', designation: 'Treasury & Vault Operations Manager', branch: 'Central Tech Branch', status: 'ACTIVE', password: 'Password@123', role: 'OFFICER' },
      { officerId: 'off-005', employeeId: 'EMP-1005', name: 'Rajesh Kumar', email: 'rajesh.kumar@ggbank.com', phone: '+91 98765 43214', department: 'OPERATIONS', designation: 'Branch Operations Supervisor', branch: 'North Metro Branch', status: 'ACTIVE', password: 'Password@123', role: 'OFFICER' }
    ];

    const demoTxns = [
      {
        transactionId: "TXN-2026-908101",
        txId: "TXN-2026-908101",
        fromAccount: "EXTERNAL-DEP",
        senderAccount: "EXTERNAL-DEP",
        toAccount: "100188492019",
        receiverAccount: "100188492019",
        amount: 50000.00,
        type: "CREDIT",
        category: "Salary",
        description: "Monthly Salary Credit",
        status: "COMPLETED",
        balanceAfter: 50000.00,
        createdAt: new Date().toISOString()
      },
      {
        transactionId: "TXN-2026-908102",
        txId: "TXN-2026-908102",
        fromAccount: "100188492019",
        senderAccount: "100188492019",
        toAccount: "100188492020",
        receiverAccount: "100188492020",
        amount: 5000.00,
        type: "TRANSFER",
        category: "Transfer",
        description: "Project Collab Payment",
        status: "COMPLETED",
        balanceAfter: 45000.00,
        createdAt: new Date().toISOString()
      }
    ];

    if (needsFullSeed) {
      console.log("🔥 GG BANK: Seeding default demo accounts to Cloud Firestore...");
      for (const acc of demoAccounts) {
        await accountsRef.doc(acc.accountNumber).set(acc);
        await firestoreDb.collection('users').doc(acc.userId).set(acc);
      }
      for (const off of demoOfficers) {
        await firestoreDb.collection('officers').doc(off.officerId).set(off);
      }
      for (const tx of demoTxns) {
        await firestoreDb.collection('transactions').doc(tx.transactionId).set(tx);
      }
      console.log("🔥 GG BANK: Seeded accounts, officers, and transactions successfully!");
    } else {
      // Ensure ksaravanapriyan8@gmail.com account exists even if other data already exists
      const kAcc = demoAccounts.find(a => a.email === 'ksaravanapriyan8@gmail.com');
      const kCheck = await accountsRef.doc(kAcc.accountNumber).get();
      if (!kCheck.exists) {
        console.log("🔥 GG BANK: Seeding ksaravanapriyan8@gmail.com account to Cloud Firestore...");
        await accountsRef.doc(kAcc.accountNumber).set(kAcc);
        await firestoreDb.collection('users').doc(kAcc.userId).set(kAcc);
      }
    }

    // Ensure admin user and treasury account are in Firestore
    const adminDoc = await firestoreDb.collection('users').doc('usr-admin-999').get();
    if (!adminDoc.exists) {
      const adminData = {
        userId: 'usr-admin-999',
        name: 'GG Bank Administrator',
        fullName: 'GG Bank Administrator',
        email: 'admin@ggbank.com',
        phone: '9000000000',
        password: 'Password@123',
        role: 'ADMIN',
        status: 'ACTIVE',
        accountNumber: 'GG-BANK-TREASURY-01',
        balance: 999999999.00,
        createdAt: new Date().toISOString()
      };
      await firestoreDb.collection('users').doc('usr-admin-999').set(adminData);
      await accountsRef.doc('GG-BANK-TREASURY-01').set(adminData);
    }
  } catch (err) {
    console.warn("Seeding notice:", err.message);
  }
}

// Global window assignments
window.firebaseConfig = firebaseConfig;
window.saveToFirestore = saveToFirestore;
window.getFromFirestore = getFromFirestore;
window.getAllFromFirestore = getAllFromFirestore;
window.updateFirestoreDoc = updateFirestoreDoc;
window.listenToFirestoreDoc = listenToFirestoreDoc;
window.listenToFirestoreCollection = listenToFirestoreCollection;
window.runFirestoreTransaction = runFirestoreTransaction;
window.recordAuditLog = recordAuditLog;
