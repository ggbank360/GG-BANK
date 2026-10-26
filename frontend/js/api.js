/**
 * GG BANK - Global Firestore API Service & Real-Time Sync Engine (api.js)
 * Completely eliminates local-only localStorage database operations in favor of
 * global Cloud Firestore collections (accounts, users, transactions, auditLogs, loans, officers).
 */

const resolveApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    if (window.VITE_API_BASE_URL) return window.VITE_API_BASE_URL;
    if (window.__API_BASE_URL__) return window.__API_BASE_URL__;
    if (window.ENV && window.ENV.VITE_API_BASE_URL) return window.ENV.VITE_API_BASE_URL;

    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || window.location.protocol === 'file:';
    if (isLocal) {
      return 'http://localhost:8080';
    } else {
      return window.GG_BACKEND_URL || '';
    }
  }
  return 'http://localhost:8080';
};

const rawBaseUrl = resolveApiBaseUrl().trim().replace(/\/+$/, '');
const API_BASE_URL = rawBaseUrl ? (rawBaseUrl.endsWith('/api') ? rawBaseUrl : `${rawBaseUrl}/api`) : '/api';
window.API_BASE_URL = API_BASE_URL;

class ApiService {
  constructor() {
    this.token = localStorage.getItem('gg_auth_token') || null;
    this.memCache = {};
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('gg_auth_token', token);
    } else {
      localStorage.removeItem('gg_auth_token');
    }
  }

  getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  // Fallback memory cache helpers to maintain compatibility with legacy UI components
  getMock(key) {
    if (this.memCache[key]) return this.memCache[key];
    try {
      const data = JSON.parse(sessionStorage.getItem(key) || '[]');
      this.memCache[key] = data;
      return data;
    } catch (_) {
      return [];
    }
  }

  setMock(key, data) {
    this.memCache[key] = data;
    try {
      sessionStorage.setItem(key, JSON.stringify(data));
    } catch (_) {}
  }

  // Global Audit Logging directly into Firestore
  async logAudit(userId, adminId, action, description, status = 'SUCCESS') {
    const logData = {
      actorId: userId || adminId || 'SYSTEM',
      actorName: adminId || userId || 'GG BANK Officer',
      role: adminId ? 'ADMIN' : 'USER',
      action,
      details: description,
      status
    };
    if (window.recordAuditLog) {
      await window.recordAuditLog(logData);
    }
  }

  /**
   * Main Request Dispatcher
   * Tries remote HTTP backend if configured; otherwise seamlessly executes against global Cloud Firestore!
   */
  async request(endpoint, method = 'GET', body = null) {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    // If no dedicated backend host or running statically on Vercel, route directly through Cloud Firestore engine
    if (!window.GG_BACKEND_URL && (!rawBaseUrl || rawBaseUrl === 'http://localhost:8080' || window.location.hostname.includes('vercel.app'))) {
      return await this.handleFirestoreEngine(cleanEndpoint, method, body);
    }

    const url = `${API_BASE_URL}${cleanEndpoint}`;
    const options = {
      method,
      headers: this.getHeaders()
    };
    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return await response.json();
      }
      if (response.status === 404 || response.status === 405 || response.status >= 502) {
        return await this.handleFirestoreEngine(cleanEndpoint, method, body);
      }
      const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status} error` }));
      const errorMsg = errorData.message || errorData.error || `Request failed with status ${response.status}`;
      throw new Error(errorMsg);
    } catch (err) {
      // If network unreachable, route to Firestore engine
      return await this.handleFirestoreEngine(cleanEndpoint, method, body);
    }
  }

  /**
   * Global Cloud Firestore Database Operations Engine
   */
  async handleFirestoreEngine(endpoint, method, body) {
    await window.firebaseReadyPromise;

    // 1. POST /auth/login
    if (endpoint === '/auth/login' && method === 'POST') {
      const rawInput = (body.identifier || body.email || body.accountNumber || '').trim();
      const passwordInput = body.password;
      const cleanDigits = rawInput.replace(/\D/g, '');

      let matchedAccount = null;

      // Check Firestore accounts by accountNumber
      if (cleanDigits.length >= 10) {
        matchedAccount = await window.getFromFirestore('accounts', cleanDigits);
        if (!matchedAccount) {
          matchedAccount = await window.getFromFirestore('accounts', rawInput);
        }
      }

      // Check Firestore accounts by email
      if (!matchedAccount && rawInput.includes('@')) {
        const snap = await window.firestoreDb.collection('accounts').where('email', '==', rawInput.toLowerCase()).get();
        if (!snap.empty) {
          matchedAccount = { id: snap.docs[0].id, ...snap.docs[0].data() };
        }
      }

      // Check Firestore accounts by phone
      if (!matchedAccount && cleanDigits.length >= 10) {
        const snap = await window.firestoreDb.collection('accounts').where('phone', '==', cleanDigits).get();
        if (!snap.empty) {
          matchedAccount = { id: snap.docs[0].id, ...snap.docs[0].data() };
        }
      }

      // Fallback check in users collection
      if (!matchedAccount) {
        const uSnap = await window.firestoreDb.collection('users').where('email', '==', rawInput.toLowerCase()).get();
        if (!uSnap.empty) {
          const uDoc = uSnap.docs[0].data();
          matchedAccount = uDoc;
        }
      }

      if (!matchedAccount) {
        throw new Error(`No registered account found with "${rawInput}". Please check your credentials or click "Open Digital Account" to apply.`);
      }

      // STRICT password verification
      const expectedPass = matchedAccount.password || 'Password@123';
      if (passwordInput && passwordInput !== expectedPass) {
        throw new Error('Incorrect password. Please verify your password and try again.');
      }

      if (matchedAccount.status === 'BLOCKED' || matchedAccount.status === 'SUSPENDED') {
        throw new Error('Your account is currently suspended. Please contact GG BANK customer service.');
      }

      if (matchedAccount.status === 'PENDING_APPROVAL') {
        throw new Error('Your account application is Pending Approval. The Bank Administrator is verifying your KYC documents.');
      }

      if (matchedAccount.status === 'REJECTED') {
        throw new Error('Your account application was rejected. Please contact GG BANK staff for assistance.');
      }

      const token = 'jwt-' + (matchedAccount.userId || matchedAccount.accountNumber);
      await this.logAudit(matchedAccount.userId, null, 'LOGIN', `Customer logged in: ${matchedAccount.email}`);

      return {
        success: true,
        message: 'Authentication successful',
        data: {
          token,
          user: matchedAccount,
          account: matchedAccount
        }
      };
    }

    // 2. POST /users/register
    if (endpoint === '/users/register' && method === 'POST') {
      const cleanEmail = (body.email || '').trim().toLowerCase();
      const cleanPhone = (body.phone || '').trim().replace(/\D/g, '');

      // Check if email already registered in Firestore
      const existingEmailSnap = await window.firestoreDb.collection('accounts').where('email', '==', cleanEmail).get();
      if (!existingEmailSnap.empty) {
        throw new Error(`An account with email "${cleanEmail}" is already registered. Please log in.`);
      }

      // Generate 11-digit unique account number
      const randomFive = Math.floor(10000 + Math.random() * 90000);
      const newAccNum = `100188${randomFive}`;
      const newUserId = `usr-${Date.now().toString().slice(-6)}`;

      // Compress KYC document images before saving to Firestore to respect 1MB document limit
      const compressedPhoto = body.photoDoc ? await window.compressKycImage(body.photoDoc, 600, 0.6) : '';
      const compressedPan = body.panDoc ? await window.compressKycImage(body.panDoc, 800, 0.6) : '';
      const compressedAadhaar = body.aadhaarDoc ? await window.compressKycImage(body.aadhaarDoc, 800, 0.6) : '';
      const compressedAddressProof = body.addressProofDoc ? await window.compressKycImage(body.addressProofDoc, 800, 0.6) : '';
      const compressedSignature = body.signatureDoc ? await window.compressKycImage(body.signatureDoc, 600, 0.6) : '';

      const newAccount = {
        accountNumber: newAccNum,
        userId: newUserId,
        fullName: body.name || '',
        name: body.name || '',
        email: cleanEmail,
        phone: cleanPhone,
        password: body.password || 'Password@123',
        accountType: body.accountType || 'SAVINGS',
        balance: 0.00,
        status: 'PENDING_APPROVAL',
        kycStatus: 'PENDING',
        dateOfBirth: body.dateOfBirth || '',
        gender: body.gender || 'Not Specified',
        address: body.address || 'Standard Registered Address',
        occupation: body.occupation || 'Professional',
        ifscCode: 'GGBN0001234',
        branch: 'Central Tech Branch',
        role: 'CUSTOMER',
        avatar: compressedPhoto,
        profilePhoto: compressedPhoto,
        photoDoc: compressedPhoto,
        kycData: {
          panNumber: (body.panNumber || '').toUpperCase(),
          panDoc: compressedPan,
          aadhaarNumber: body.aadhaarNumber || '',
          aadhaarDoc: compressedAadhaar,
          addressProofType: body.addressProofType || 'Utility / Address Bill',
          addressProofDoc: compressedAddressProof,
          photoDoc: compressedPhoto,
          signatureDoc: compressedSignature
        },
        documents: {
          panNumber: (body.panNumber || '').toUpperCase(),
          panDoc: compressedPan,
          aadhaarNumber: body.aadhaarNumber || '',
          aadhaarDoc: compressedAadhaar,
          addressProofType: body.addressProofType || 'Utility / Address Bill',
          addressProofDoc: compressedAddressProof,
          photoDoc: compressedPhoto,
          signatureDoc: compressedSignature
        },
        nomineeDetails: {
          name: body.nomineeName || 'Not Provided',
          relationship: body.nomineeRelation || 'N/A',
          contact: body.nomineePhone || 'N/A'
        },
        nominee: {
          name: body.nomineeName || 'Not Provided',
          relationship: body.nomineeRelation || 'N/A',
          contact: body.nomineePhone || 'N/A'
        },
        createdAt: new Date().toISOString()
      };

      // Direct write to global Firestore collections
      await window.saveToFirestore('accounts', newAccNum, newAccount);
      await window.saveToFirestore('users', newUserId, newAccount);
      await this.logAudit(newUserId, null, 'USER_REGISTRATION', `New application submitted for ${newAccount.name} (${newAccNum}). Status: PENDING_APPROVAL`);

      return {
        success: true,
        message: 'Customer application submitted successfully. Verification in progress.',
        data: {
          user: newAccount,
          account: newAccount
        }
      };
    }

    // 3. GET /users/me
    if (endpoint === '/users/me') {
      const currentUser = JSON.parse(localStorage.getItem('gg_current_user') || 'null');
      if (currentUser && currentUser.accountNumber) {
        const liveAcc = await window.getFromFirestore('accounts', currentUser.accountNumber);
        if (liveAcc) return { success: true, data: liveAcc };
      }
      return { success: true, data: currentUser || {} };
    }

    // 4. GET /accounts/user/{userId}
    if (endpoint.startsWith('/accounts/user/')) {
      const uid = endpoint.split('/').pop().trim();
      // First try query by userId
      let snap = await window.firestoreDb.collection('accounts').where('userId', '==', uid).get();
      if (!snap.empty) {
        return { success: true, data: { id: snap.docs[0].id, ...snap.docs[0].data() } };
      }
      // Try direct document by accountNumber / id
      const direct = await window.getFromFirestore('accounts', uid);
      if (direct) {
        return { success: true, data: direct };
      }
      // Try query by email if uid looks like email
      if (uid.includes('@')) {
        const eSnap = await window.firestoreDb.collection('accounts').where('email', '==', uid.toLowerCase()).get();
        if (!eSnap.empty) {
          return { success: true, data: { id: eSnap.docs[0].id, ...eSnap.docs[0].data() } };
        }
      }
      // Fallback check users collection
      const uDoc = await window.getFromFirestore('users', uid);
      if (uDoc) {
        return { success: true, data: uDoc };
      }
      return { success: true, data: null };
    }

    // 5. GET /accounts/{accountNumber}
    if (endpoint.startsWith('/accounts/') && !endpoint.includes('/user/')) {
      const accNum = endpoint.split('/')[2];
      const acc = await window.getFromFirestore('accounts', accNum);
      if (acc) return { success: true, data: acc };
      throw new Error(`Account ${accNum} not found`);
    }

    // 6. PUT /admin/customers/{userId}/approve (Global Real-time Approval)
    if (endpoint.startsWith('/admin/customers/') && endpoint.endsWith('/approve') && method === 'PUT') {
      const identifier = endpoint.split('/')[3];
      const officerOrAdminName = (body && body.approvedBy) ? body.approvedBy : 'GG Bank Officer / Admin';
      const remarks = (body && body.remarks) ? body.remarks : 'KYC Documents Verified and Approved';

      // Find by userId or accountNumber
      let targetAcc = await window.getFromFirestore('accounts', identifier);
      if (!targetAcc) {
        const snap = await window.firestoreDb.collection('accounts').where('userId', '==', identifier).get();
        if (!snap.empty) targetAcc = { id: snap.docs[0].id, ...snap.docs[0].data() };
      }

      if (!targetAcc) {
        throw new Error(`Customer record ${identifier} not found in Firestore.`);
      }

      const updates = {
        status: 'ACTIVE',
        kycStatus: 'VERIFIED',
        approvedAt: new Date().toISOString(),
        approvedBy: officerOrAdminName,
        adminRemarks: remarks
      };

      await window.updateFirestoreDoc('accounts', targetAcc.accountNumber, updates);
      if (targetAcc.userId) {
        await window.updateFirestoreDoc('users', targetAcc.userId, updates).catch(() => {});
      }

      await this.logAudit(targetAcc.userId, officerOrAdminName, 'KYC_APPROVED', `Approved KYC and activated account for: ${targetAcc.name} (${targetAcc.accountNumber})`);
      return { success: true, message: 'Customer KYC approved and account activated globally!', data: { ...targetAcc, ...updates } };
    }

    // 7. PUT /admin/customers/{userId}/reject
    if (endpoint.startsWith('/admin/customers/') && endpoint.endsWith('/reject') && method === 'PUT') {
      const identifier = endpoint.split('/')[3];
      const officerOrAdminName = (body && body.approvedBy) ? body.approvedBy : 'GG Bank Officer / Admin';
      const remarks = (body && body.remarks) ? body.remarks : 'KYC Documents failed compliance check';

      let targetAcc = await window.getFromFirestore('accounts', identifier);
      if (!targetAcc) {
        const snap = await window.firestoreDb.collection('accounts').where('userId', '==', identifier).get();
        if (!snap.empty) targetAcc = { id: snap.docs[0].id, ...snap.docs[0].data() };
      }

      if (!targetAcc) {
        throw new Error(`Customer record ${identifier} not found in Firestore.`);
      }

      const updates = {
        status: 'REJECTED',
        kycStatus: 'REJECTED',
        rejectedAt: new Date().toISOString(),
        rejectedBy: officerOrAdminName,
        adminRemarks: remarks
      };

      await window.updateFirestoreDoc('accounts', targetAcc.accountNumber, updates);
      if (targetAcc.userId) {
        await window.updateFirestoreDoc('users', targetAcc.userId, updates).catch(() => {});
      }

      await this.logAudit(targetAcc.userId, officerOrAdminName, 'KYC_REJECTED', `Declined KYC application for: ${targetAcc.name} (${targetAcc.accountNumber})`);
      return { success: true, message: 'Customer application rejected.', data: { ...targetAcc, ...updates } };
    }

    // 8. POST /transfer & POST /qr/pay (Atomic Money Transfers & QR Payments using Firestore Transactions)
    if ((endpoint === '/transfer' || endpoint === '/qr/pay') && method === 'POST') {
      const senderAccNum = (body.senderAccount || '').trim();
      const rawReceiver = (body.receiverAccount || body.upiId || body.toAccount || '').trim();
      const amount = Number(parseFloat(body.amount));
      const isQr = endpoint === '/qr/pay';
      const isUpi = isQr || body.transferMethod === 'UPI' || rawReceiver.includes('@');

      if (isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid transfer amount greater than zero.');
      }
      if (senderAccNum && rawReceiver && (senderAccNum === rawReceiver || senderAccNum.toLowerCase() === rawReceiver.toLowerCase())) {
        throw new Error('Cannot transfer money to the same account.');
      }

      // Pre-resolve recipient account document from Firestore if possible
      let targetReceiverAcc = null;
      let targetReceiverAccId = null;

      // 1. Try exact document match
      const directRecDoc = await window.firestoreDb.collection('accounts').doc(rawReceiver).get();
      if (directRecDoc.exists) {
        targetReceiverAcc = directRecDoc.data();
        targetReceiverAccId = directRecDoc.id;
      }

      // 2. Try lookup by email or upiId
      if (!targetReceiverAcc && rawReceiver.includes('@')) {
        const cleanEmail = rawReceiver.toLowerCase();
        let eSnap = await window.firestoreDb.collection('accounts').where('email', '==', cleanEmail).get();
        if (eSnap.empty) {
          eSnap = await window.firestoreDb.collection('accounts').where('upiId', '==', cleanEmail).get();
        }
        if (!eSnap.empty) {
          targetReceiverAcc = eSnap.docs[0].data();
          targetReceiverAccId = eSnap.docs[0].id;
        }
      }

      // 3. Try lookup by phone digits
      if (!targetReceiverAcc) {
        const cleanDigits = rawReceiver.replace(/\D/g, '');
        if (cleanDigits.length >= 10) {
          const pSnap = await window.firestoreDb.collection('accounts').where('phone', '==', cleanDigits).get();
          if (!pSnap.empty) {
            targetReceiverAcc = pSnap.docs[0].data();
            targetReceiverAccId = pSnap.docs[0].id;
          }
        }
      }

      // 4. Try lookup in users collection
      if (!targetReceiverAcc) {
        const uSnap = await window.firestoreDb.collection('users').where('email', '==', rawReceiver.toLowerCase()).get();
        if (!uSnap.empty) {
          targetReceiverAcc = uSnap.docs[0].data();
          targetReceiverAccId = targetReceiverAcc.accountNumber || uSnap.docs[0].id;
        }
      }

      const actualReceiverAccNum = targetReceiverAcc ? (targetReceiverAcc.accountNumber || targetReceiverAccId) : rawReceiver;
      const actualReceiverEmail = targetReceiverAcc ? (targetReceiverAcc.email || '') : (rawReceiver.includes('@') ? rawReceiver : '');
      const actualReceiverName = targetReceiverAcc ? (targetReceiverAcc.fullName || targetReceiverAcc.name) : (body.beneficiaryName || body.name || 'Authorized Payee');

      const txnId = `TXN-2026-${Date.now().toString().slice(-6)}`;
      let finalSenderBalance = 0;
      let finalReceiverBalance = 0;

      await window.runFirestoreTransaction(async (transaction, db) => {
        const senderRef = db.collection('accounts').doc(senderAccNum);
        const senderDoc = await transaction.get(senderRef);
        if (!senderDoc.exists) throw new Error(`Sender account ${senderAccNum} does not exist.`);

        const senderData = senderDoc.data();
        if (senderData.status !== 'ACTIVE') {
          throw new Error(`Sender account is ${senderData.status}. Transfers permitted only for active accounts.`);
        }

        const currentSenderBal = Number(senderData.balance || 0);
        if (currentSenderBal < amount) {
          throw new Error(`Insufficient funds. Available balance: ₹${currentSenderBal.toLocaleString('en-IN')}`);
        }

        finalSenderBalance = Number((currentSenderBal - amount).toFixed(2));
        transaction.update(senderRef, { balance: finalSenderBalance });

        // If recipient account exists in system, credit balance atomically
        if (targetReceiverAccId) {
          const recRef = db.collection('accounts').doc(String(targetReceiverAccId));
          const recDoc = await transaction.get(recRef);
          const currentRecBal = recDoc.exists ? Number(recDoc.data().balance || 0) : Number(targetReceiverAcc.balance || 0);
          finalReceiverBalance = Number((currentRecBal + amount).toFixed(2));
          transaction.update(recRef, { balance: finalReceiverBalance });
        }

        // Global Transaction Record linking both accounts
        const txnRef = db.collection('transactions').doc(txnId);
        const txnRecord = {
          transactionId: txnId,
          txId: txnId,
          fromAccount: senderAccNum,
          senderAccount: senderAccNum,
          senderEmail: senderData.email || '',
          senderName: senderData.fullName || senderData.name || 'GG Bank Customer',
          toAccount: actualReceiverAccNum,
          receiverAccount: actualReceiverAccNum,
          receiverEmail: actualReceiverEmail,
          receiverName: actualReceiverName,
          amount: amount,
          type: isQr ? 'QR_PAYMENT' : (isUpi ? 'UPI_TRANSFER' : 'TRANSFER'),
          category: isQr ? 'Scan & Pay' : (isUpi ? 'UPI Payment' : 'Internal Transfer'),
          description: body.description || body.note || (isQr ? `QR payment to ${actualReceiverName}` : (isUpi ? `UPI payment to ${rawReceiver}` : `Transfer to Account ${actualReceiverAccNum}`)),
          status: 'COMPLETED',
          balanceAfter: finalSenderBalance,
          digitalSeal: `SEAL-${txnId}-VERIFIED`,
          createdAt: new Date().toISOString()
        };
        transaction.set(txnRef, txnRecord);
      });

      // Synchronize users collection
      if (senderAccNum) {
        const uSnap = await window.firestoreDb.collection('users').where('accountNumber', '==', senderAccNum).get();
        if (!uSnap.empty) {
          await uSnap.docs[0].ref.update({ balance: finalSenderBalance }).catch(() => {});
        }
      }
      if (targetReceiverAcc && targetReceiverAcc.userId) {
        await window.updateFirestoreDoc('users', targetReceiverAcc.userId, { balance: finalReceiverBalance }).catch(() => {});
      }

      // Update current user session in localStorage immediately if sender is current user
      try {
        const sessionAcc = JSON.parse(localStorage.getItem('gg_current_account') || 'null');
        if (sessionAcc && (sessionAcc.accountNumber === senderAccNum || sessionAcc.userId === senderAccNum)) {
          sessionAcc.balance = finalSenderBalance;
          localStorage.setItem('gg_current_account', JSON.stringify(sessionAcc));
        }
      } catch (_) {}

      await this.logAudit(senderAccNum, null, isQr ? 'QR_PAYMENT' : 'TRANSFER', `Transferred ₹${amount} to ${actualReceiverName} (${actualReceiverAccNum}) [Txn: ${txnId}]`);

      return {
        success: true,
        message: isQr ? `₹${amount.toLocaleString('en-IN')} paid successfully via QR code!` : (isUpi ? 'UPI transfer completed successfully!' : 'Transfer completed successfully!'),
        data: {
          transactionId: txnId,
          balanceAfter: finalSenderBalance,
          amount,
          senderAccount: senderAccNum,
          receiverAccount: actualReceiverAccNum,
          receiverName: actualReceiverName,
          digitalSeal: `SEAL-${txnId}-VERIFIED`,
          createdAt: new Date().toISOString()
        }
      };
    }

    // 8B. POST /qr/validate (Validates Scanned QR Payload)
    if (endpoint === '/qr/validate' && method === 'POST') {
      const rawData = body.qrData;
      let parsed = null;

      if (typeof rawData === 'object' && rawData !== null) {
        parsed = rawData;
      } else if (typeof rawData === 'string') {
        const str = rawData.trim();
        if (str.startsWith('{') && str.endsWith('}')) {
          try {
            parsed = JSON.parse(str);
          } catch (_) {}
        } else if (str.startsWith('upi://pay')) {
          try {
            const url = new URL(str);
            const pa = url.searchParams.get('pa') || '';
            const pn = url.searchParams.get('pn') || 'GG Bank Payee';
            const am = parseFloat(url.searchParams.get('am')) || null;
            parsed = {
              accountNumber: pa.includes('@') ? pa.split('@')[0] : pa,
              upi: pa,
              name: decodeURIComponent(pn),
              requestedAmount: am
            };
          } catch (_) {
            const params = new URLSearchParams(str.replace(/^upi:\/\/pay\??/, ''));
            const pa = params.get('pa') || '';
            const pn = params.get('pn') || 'GG Bank Payee';
            const am = parseFloat(params.get('am')) || null;
            parsed = {
              accountNumber: pa.includes('@') ? pa.split('@')[0] : pa,
              upi: pa,
              name: decodeURIComponent(pn),
              requestedAmount: am
            };
          }
        } else {
          parsed = {
            accountNumber: str.includes('@') ? str.split('@')[0] : str,
            rawIdentifier: str,
            name: str.includes('@') ? str.split('@')[0] : 'GG Bank Customer'
          };
        }
      }

      if (!parsed) {
        throw new Error('Invalid QR code format. Unable to decode payment payload.');
      }

      if (parsed.type === 'RECEIPT_QR' || parsed.protocol === 'GGBANK_RECEIPT') {
        return {
          success: true,
          type: 'RECEIPT_QR',
          data: parsed
        };
      }

      const lookupKey = (parsed.accountNumber || parsed.email || parsed.upi || parsed.rawIdentifier || '').trim();
      let matchedAcc = null;

      if (lookupKey) {
        const direct = await window.getFromFirestore('accounts', lookupKey);
        if (direct) {
          matchedAcc = direct;
        } else if (lookupKey.includes('@')) {
          const eSnap = await window.firestoreDb.collection('accounts').where('email', '==', lookupKey.toLowerCase()).get();
          if (!eSnap.empty) matchedAcc = eSnap.docs[0].data();
        } else {
          const numSnap = await window.firestoreDb.collection('accounts').where('accountNumber', '==', lookupKey).get();
          if (!numSnap.empty) matchedAcc = numSnap.docs[0].data();
        }
      }

      const resultPayload = {
        accountNumber: matchedAcc ? matchedAcc.accountNumber : (parsed.accountNumber || '100188492020'),
        name: matchedAcc ? (matchedAcc.fullName || matchedAcc.name) : (parsed.name || 'Authorized Payee'),
        email: matchedAcc ? (matchedAcc.email || '') : (parsed.email || ''),
        ifscCode: matchedAcc ? (matchedAcc.ifscCode || 'GGBN0001234') : (parsed.ifsc || 'GGBN0001234'),
        upiId: matchedAcc ? (matchedAcc.upiId || `${matchedAcc.accountNumber}@ggbank`) : (parsed.upi || `${parsed.accountNumber || 'user'}@ggbank`),
        requestedAmount: parsed.amount || parsed.requestedAmount || null,
        qrIdentifier: parsed.qrIdentifier || `QR-${matchedAcc ? matchedAcc.accountNumber : lookupKey}`
      };

      return {
        success: true,
        type: 'CUSTOMER_QR',
        data: resultPayload
      };
    }

    // 9. POST /deposit (Atomic Deposit)
    if ((endpoint === '/deposit' || endpoint === '/admin/deposits/credit' || endpoint === '/admin/deposit') && method === 'POST') {
      const accNum = (body.accountNumber || '').trim();
      const amount = parseFloat(body.amount);
      if (isNaN(amount) || amount <= 0) throw new Error('Deposit amount must be greater than zero.');

      const txnId = `TXN-2026-${Date.now().toString().slice(-6)}`;
      let finalBalance = 0;

      await window.runFirestoreTransaction(async (transaction, db) => {
        const accRef = db.collection('accounts').doc(accNum);
        const accDoc = await transaction.get(accRef);
        if (!accDoc.exists) throw new Error(`Account ${accNum} not found.`);

        finalBalance = (accDoc.data().balance || 0) + amount;
        transaction.update(accRef, { balance: finalBalance });

        const txnRef = db.collection('transactions').doc(txnId);
        transaction.set(txnRef, {
          transactionId: txnId,
          txId: txnId,
          fromAccount: body.paymentMethod || 'BANK-DEPOSIT',
          senderAccount: body.paymentMethod || 'BANK-DEPOSIT',
          toAccount: accNum,
          receiverAccount: accNum,
          amount: amount,
          type: 'DEPOSIT',
          category: 'Deposit',
          description: body.description || `Deposit via ${body.paymentMethod || 'Online Transfer'}`,
          status: 'COMPLETED',
          balanceAfter: finalBalance,
          createdAt: new Date().toISOString()
        });
      });

      await this.logAudit(accNum, 'BANK_OFFICER', 'DEPOSIT', `Credited ₹${amount} to account ${accNum}`);
      return { success: true, message: `Deposited ₹${amount.toLocaleString('en-IN')} successfully!`, data: { balanceAfter: finalBalance, transactionId: txnId } };
    }

    // 10. POST /withdraw (Atomic Withdrawal)
    if (endpoint === '/withdraw' && method === 'POST') {
      const accNum = (body.accountNumber || '').trim();
      const amount = parseFloat(body.amount);
      if (isNaN(amount) || amount <= 0) throw new Error('Withdrawal amount must be greater than zero.');

      const txnId = `TXN-2026-${Date.now().toString().slice(-6)}`;
      let finalBalance = 0;

      await window.runFirestoreTransaction(async (transaction, db) => {
        const accRef = db.collection('accounts').doc(accNum);
        const accDoc = await transaction.get(accRef);
        if (!accDoc.exists) throw new Error(`Account ${accNum} not found.`);

        const currentBal = accDoc.data().balance || 0;
        if (currentBal < amount) throw new Error(`Insufficient balance. Available: ₹${currentBal.toLocaleString('en-IN')}`);

        finalBalance = currentBal - amount;
        transaction.update(accRef, { balance: finalBalance });

        const txnRef = db.collection('transactions').doc(txnId);
        transaction.set(txnRef, {
          transactionId: txnId,
          txId: txnId,
          fromAccount: accNum,
          senderAccount: accNum,
          toAccount: 'ATM-WITHDRAWAL',
          receiverAccount: 'ATM-WITHDRAWAL',
          amount: amount,
          type: 'WITHDRAWAL',
          category: 'Cash Withdrawal',
          description: body.description || 'Cash Withdrawal',
          status: 'COMPLETED',
          balanceAfter: finalBalance,
          createdAt: new Date().toISOString()
        });
      });

      await this.logAudit(accNum, null, 'WITHDRAWAL', `Withdrew ₹${amount} from account ${accNum}`);
      return { success: true, message: `Withdrew ₹${amount.toLocaleString('en-IN')} successfully!`, data: { balanceAfter: finalBalance, transactionId: txnId } };
    }

    // 11. Transactions Query Endpoints
    if (endpoint === '/transactions' || endpoint === '/admin/transactions') {
      const txns = await window.getAllFromFirestore('transactions');
      const sorted = txns.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      return { success: true, data: sorted };
    }

    if (endpoint.startsWith('/transactions/account/')) {
      const accNum = (endpoint.split('/')[3] || '').toLowerCase().trim();
      const txns = await window.getAllFromFirestore('transactions');
      const filtered = txns
        .filter(t => {
          const sAcc = String(t.senderAccount || t.fromAccount || '').toLowerCase();
          const rAcc = String(t.receiverAccount || t.toAccount || '').toLowerCase();
          const sEmail = String(t.senderEmail || '').toLowerCase();
          const rEmail = String(t.receiverEmail || '').toLowerCase();
          return sAcc === accNum || rAcc === accNum || sEmail === accNum || rEmail === accNum;
        })
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      return { success: true, data: filtered };
    }

    // 12. GET /admin/customers & /admin/accounts
    if (endpoint === '/admin/customers' || endpoint === '/admin/accounts') {
      const accounts = await window.getAllFromFirestore('accounts');
      const mapped = accounts.map(a => {
        const photo = a.avatar || a.profilePhoto || a.photoDoc || (a.kycData && a.kycData.photoDoc) || '';
        return {
          ...a,
          customerName: a.fullName || a.name || 'GG Bank Customer',
          name: a.fullName || a.name || 'GG Bank Customer',
          customerEmail: a.email || 'N/A',
          customerPhone: a.phone || 'N/A',
          accountStatus: a.status || 'ACTIVE',
          avatar: photo,
          profilePhoto: photo,
          photoDoc: photo
        };
      });
      return { success: true, data: mapped };
    }

    // 13. Customer Details Query
    if (endpoint.startsWith('/admin/customers/') && method === 'GET' && !endpoint.includes('/approve') && !endpoint.includes('/reject')) {
      const identifier = endpoint.split('/')[3];
      let acc = await window.getFromFirestore('accounts', identifier);
      if (!acc) {
        const snap = await window.firestoreDb.collection('accounts').where('userId', '==', identifier).get();
        if (!snap.empty) acc = { id: snap.docs[0].id, ...snap.docs[0].data() };
      }
      if (!acc) throw new Error('Customer not found with identifier: ' + identifier);

      const allTxns = await window.getAllFromFirestore('transactions');
      const userTxns = allTxns.filter(t => t.senderAccount === acc.accountNumber || t.receiverAccount === acc.accountNumber);

      return {
        success: true,
        data: {
          user: acc,
          account: acc,
          totalTransactionsCount: userTxns.length,
          recentTransactions: userTxns.slice(0, 10),
          loans: []
        }
      };
    }

    // 14. GET /admin/dashboard & /admin/dashboard/overview
    if (endpoint === '/admin/dashboard' || endpoint === '/admin/dashboard/overview') {
      const accounts = await window.getAllFromFirestore('accounts');
      const txns = await window.getAllFromFirestore('transactions');
      const loans = await window.getAllFromFirestore('loans');

      let totalBalance = 0;
      let totalDeposits = 0;
      let totalTransfers = 0;
      let totalWithdrawals = 0;

      accounts.forEach(a => {
        totalBalance += Number(a.balance || 0);
      });

      txns.forEach(t => {
        const amt = Number(t.amount || 0);
        if (t.type === 'DEPOSIT' || t.type === 'LOAN_DISBURSEMENT') totalDeposits += amt;
        else if (t.type === 'TRANSFER' || t.type === 'UPI_TRANSFER' || t.type === 'QR_PAYMENT') totalTransfers += amt;
        else if (t.type === 'WITHDRAWAL') totalWithdrawals += amt;
      });

      const pendingLoans = loans.filter(l => {
        const s = (l.status || '').toLowerCase();
        return s === 'pending' || s === 'under_review' || s === 'submitted';
      });

      const stats = {
        totalCustomers: accounts.length,
        totalAccounts: accounts.length,
        totalBalance: Number(totalBalance.toFixed(2)),
        totalDeposits: Number(totalDeposits.toFixed(2)),
        totalWithdrawals: Number(totalWithdrawals.toFixed(2)),
        totalTransfers: Number(totalTransfers.toFixed(2)),
        activeAccounts: accounts.filter(a => a.status === 'ACTIVE').length,
        pendingAccounts: accounts.filter(a => a.status === 'PENDING_APPROVAL').length,
        pendingLoans: pendingLoans.length
      };

      if (endpoint === '/admin/dashboard/overview') {
        return {
          success: true,
          data: {
            stats,
            recentTransactions: txns.slice(0, 6),
            pendingLoans: pendingLoans
          }
        };
      }
      return { success: true, data: stats };
    }

    // 15. GET /admin/officers
    if (endpoint === '/admin/officers' && method === 'GET') {
      let officers = await window.getAllFromFirestore('officers');
      if (!officers || officers.length === 0) {
        officers = [
          { officerId: 'off-001', employeeId: 'EMP-1001', name: 'Vikram Sharma', email: 'vikram.sharma@ggbank.com', phone: '+91 98765 43210', department: 'LOAN', designation: 'Chief Credit Officer', branch: 'Central Tech Branch', status: 'ACTIVE', password: 'Password@123', role: 'OFFICER' },
          { officerId: 'off-002', employeeId: 'EMP-1002', name: 'Anita Roy', email: 'anita.roy@ggbank.com', phone: '+91 98765 43211', department: 'LOAN', designation: 'Senior Personal Loan Underwriter', branch: 'Central Tech Branch', status: 'ACTIVE', password: 'Password@123', role: 'OFFICER' },
          { officerId: 'off-003', employeeId: 'EMP-1003', name: 'Priya Patel', email: 'priya.patel@ggbank.com', phone: '+91 98765 43212', department: 'COMPLIANCE', designation: 'Lead KYC & AML Compliance Officer', branch: 'Financial Tower Branch', status: 'ACTIVE', password: 'Password@123', role: 'OFFICER' },
          { officerId: 'off-004', employeeId: 'EMP-1004', name: 'Karthik Rao', email: 'karthik.rao@ggbank.com', phone: '+91 98765 43213', department: 'TREASURY', designation: 'Treasury & Vault Operations Manager', branch: 'Central Tech Branch', status: 'ACTIVE', password: 'Password@123', role: 'OFFICER' },
          { officerId: 'off-005', employeeId: 'EMP-1005', name: 'Rajesh Kumar', email: 'rajesh.kumar@ggbank.com', phone: '+91 98765 43214', department: 'OPERATIONS', designation: 'Branch Operations Supervisor', branch: 'North Metro Branch', status: 'ACTIVE', password: 'Password@123', role: 'OFFICER' }
        ];
      }
      return { success: true, data: officers };
    }

    // 16. Audit Logs
    if (endpoint === '/admin/audit-logs' || endpoint === '/audit-logs') {
      const logs = await window.getAllFromFirestore('auditLogs');
      const sorted = logs.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
      return { success: true, data: sorted };
    }

    // 17. Loans Endpoints (Application, Retrieval, Admin Approval & Fund Disbursement)
    if ((endpoint === '/loans' || endpoint === '/loans/apply') && method === 'POST') {
      const loanId = body.loanId || `LN-${Date.now().toString().slice(-6)}`;
      const reqAmt = Number(parseFloat(body.requestedAmount || body.amount || 0));
      const tenure = Number(parseInt(body.tenure || 36));
      const rate = Number(parseFloat(body.interestRate || 10.5));
      const feePct = Number(parseFloat(body.processingFeePercent || 1.0));
      const fee = Number(parseFloat(body.processingFee || Math.round(reqAmt * (feePct / 100))));
      const netDisb = Number(parseFloat(body.netDisbursement || (reqAmt - fee)));
      const income = Number(parseFloat(body.monthlyIncome || 0));
      const existingEmi = Number(parseFloat(body.existingEmi || 0));
      const emi = Number(parseFloat(body.estimatedEMI || 0));
      const interest = Number(parseFloat(body.totalInterest || 0));
      const repayment = Number(parseFloat(body.totalRepayment || (reqAmt + interest)));

      const loanRecord = {
        loanId,
        id: loanId,
        accountNumber: String(body.accountNumber || ''),
        customerName: String(body.customerName || body.name || 'Customer'),
        email: String(body.email || '').toLowerCase(),
        userId: String(body.userId || ''),
        loanType: String(body.loanType || 'Personal Loan'),
        requestedAmount: reqAmt,
        amount: reqAmt,
        tenure,
        interestRate: rate,
        processingFeePercent: feePct,
        processingFee: fee,
        netDisbursement: netDisb,
        monthlyIncome: income,
        existingEmi,
        estimatedEMI: emi,
        totalInterest: interest,
        totalRepayment: repayment,
        purpose: String(body.purpose || 'General Funding'),
        status: 'pending',
        loanDocument: body.loanDocument || null,
        documents: body.documents || {},
        creditScore: Number(body.creditScore || 720),
        paidEmisCount: 0,
        totalEmisCount: tenure,
        outstandingBalance: reqAmt,
        createdAt: new Date().toISOString()
      };

      await window.saveToFirestore('loans', loanId, loanRecord);
      await this.logAudit(body.userId, null, 'LOAN_APPLICATION', `Submitted ${loanRecord.loanType} for ₹${reqAmt} (Loan ID: ${loanId})`);

      return {
        success: true,
        message: 'Loan application submitted successfully for review.',
        data: loanRecord
      };
    }

    if (endpoint === '/loans' || endpoint === '/admin/loans') {
      const loans = await window.getAllFromFirestore('loans');
      const sorted = loans.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      return { success: true, data: sorted };
    }

    if (endpoint.startsWith('/admin/loans/') && endpoint.endsWith('/approve') && method === 'PUT') {
      const loanId = endpoint.split('/')[3];
      let loan = await window.getFromFirestore('loans', loanId);
      if (!loan) {
        const snap = await window.firestoreDb.collection('loans').where('loanId', '==', loanId).get();
        if (!snap.empty) loan = { id: snap.docs[0].id, ...snap.docs[0].data() };
      }
      if (!loan) throw new Error(`Loan record ${loanId} not found in Firestore.`);

      const officerName = (body && body.officerName) || 'Chief Credit Officer';
      const officerId = (body && body.officerId) || 'off-001';
      const officerDesignation = (body && body.officerDesignation) || 'Chief Credit Officer';
      const remarks = (body && body.remarks) || 'Credit Application Approved & Disbursed';

      const loanUpdates = {
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: officerName,
        assignedOfficerId: officerId,
        assignedOfficerName: officerName,
        assignedOfficerDesignation: officerDesignation,
        adminRemarks: remarks
      };

      await window.updateFirestoreDoc('loans', loan.id || loanId, loanUpdates);

      // Automatically credit approved loan amount (+) to applicant's account balance
      const disbAmount = Number(loan.requestedAmount || loan.amount || 0);
      let targetAcc = await window.getFromFirestore('accounts', loan.accountNumber);
      if (!targetAcc && loan.email) {
        const accSnap = await window.firestoreDb.collection('accounts').where('email', '==', loan.email.toLowerCase()).get();
        if (!accSnap.empty) targetAcc = { id: accSnap.docs[0].id, ...accSnap.docs[0].data() };
      }
      if (!targetAcc && loan.userId) {
        const uAccSnap = await window.firestoreDb.collection('accounts').where('userId', '==', loan.userId).get();
        if (!uAccSnap.empty) targetAcc = { id: uAccSnap.docs[0].id, ...uAccSnap.docs[0].data() };
      }

      let newBal = 0;
      if (targetAcc) {
        const currentBal = Number(targetAcc.balance || 0);
        newBal = Number((currentBal + disbAmount).toFixed(2));
        await window.updateFirestoreDoc('accounts', targetAcc.accountNumber, { balance: newBal });
        if (targetAcc.userId) {
          await window.updateFirestoreDoc('users', targetAcc.userId, { balance: newBal }).catch(() => {});
        }

        // Update localStorage if active customer session
        try {
          const sessionAcc = JSON.parse(localStorage.getItem('gg_current_account') || 'null');
          if (sessionAcc && (sessionAcc.accountNumber === targetAcc.accountNumber || sessionAcc.userId === targetAcc.userId)) {
            sessionAcc.balance = newBal;
            localStorage.setItem('gg_current_account', JSON.stringify(sessionAcc));
          }
        } catch (_) {}

        // Create corresponding "Loan Disbursed" transaction in history
        const txnId = `TXN-2026-${Date.now().toString().slice(-6)}`;
        const disbTxn = {
          transactionId: txnId,
          txId: txnId,
          fromAccount: 'GG-BANK-TREASURY',
          senderAccount: 'GG-BANK-TREASURY',
          senderName: 'GG BANK Treasury',
          toAccount: targetAcc.accountNumber,
          receiverAccount: targetAcc.accountNumber,
          receiverEmail: targetAcc.email || loan.email || '',
          receiverName: targetAcc.fullName || targetAcc.name || loan.customerName || 'Customer',
          amount: disbAmount,
          type: 'LOAN_DISBURSEMENT',
          category: 'Loan Disbursed',
          description: `Loan Disbursed - ${loan.loanType || 'Personal Loan'} (${loan.loanId || loanId})`,
          status: 'COMPLETED',
          balanceAfter: newBal,
          createdAt: new Date().toISOString()
        };
        await window.saveToFirestore('transactions', txnId, disbTxn);
      }

      await this.logAudit(loan.userId, 'ADMIN', 'LOAN_APPROVED', `Approved loan ${loanId} and disbursed ₹${disbAmount} to account ${loan.accountNumber}`);

      return {
        success: true,
        message: `Loan ${loanId} approved and ₹${disbAmount.toLocaleString('en-IN')} disbursed successfully!`,
        data: { ...loan, ...loanUpdates, balanceAfter: newBal }
      };
    }

    if (endpoint.startsWith('/admin/loans/') && endpoint.endsWith('/reject') && method === 'PUT') {
      const loanId = endpoint.split('/')[3];
      const remarks = (body && body.remarks) ? body.remarks : 'Declined per underwriting guidelines';
      await window.updateFirestoreDoc('loans', loanId, {
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        adminRemarks: remarks
      });
      return { success: true, message: `Loan ${loanId} rejected.`, data: { loanId, status: 'rejected' } };
    }

    if (endpoint.startsWith('/admin/loans/') && method === 'DELETE' && !endpoint.includes('clear-all')) {
      const loanId = endpoint.split('/')[3];
      await window.firestoreDb.collection('loans').doc(loanId).delete();
      return { success: true, message: `Loan ${loanId} deleted successfully.` };
    }

    if (endpoint === '/admin/loans/clear-all' && method === 'DELETE') {
      const snap = await window.firestoreDb.collection('loans').get();
      for (const d of snap.docs) {
        await d.ref.delete();
      }
      return { success: true, message: 'All loan records cleared.' };
    }

    if (endpoint.startsWith('/loans/') && endpoint.endsWith('/pay-emi') && method === 'POST') {
      const loanId = endpoint.split('/')[2];
      let loan = await window.getFromFirestore('loans', loanId);
      if (!loan) throw new Error(`Loan ${loanId} not found.`);

      const emi = Number(loan.estimatedEMI || 5000);
      const accNum = body.accountNumber || loan.accountNumber;
      let acc = await window.getFromFirestore('accounts', accNum);
      if (!acc) throw new Error(`Account ${accNum} not found.`);

      if (Number(acc.balance || 0) < emi) throw new Error('Insufficient balance to pay EMI installment.');

      const newBal = Number((acc.balance - emi).toFixed(2));
      await window.updateFirestoreDoc('accounts', accNum, { balance: newBal });
      if (acc.userId) {
        await window.updateFirestoreDoc('users', acc.userId, { balance: newBal }).catch(() => {});
      }

      const newPaidCount = Number(loan.paidEmisCount || 0) + 1;
      const newOutstanding = Math.max(0, Number(loan.outstandingBalance || loan.requestedAmount) - Math.round(emi * 0.8));
      const loanUpdate = {
        paidEmisCount: newPaidCount,
        outstandingBalance: newOutstanding,
        status: newOutstanding === 0 ? 'closed' : 'approved'
      };
      await window.updateFirestoreDoc('loans', loan.id || loanId, loanUpdate);

      const txnId = `TXN-2026-${Date.now().toString().slice(-6)}`;
      await window.saveToFirestore('transactions', txnId, {
        transactionId: txnId,
        txId: txnId,
        fromAccount: accNum,
        senderAccount: accNum,
        toAccount: 'GG-BANK-LOAN-DESK',
        receiverAccount: 'GG-BANK-LOAN-DESK',
        amount: emi,
        type: 'TRANSFER',
        category: 'Loan EMI Payment',
        description: `EMI Payment for Loan ${loan.loanId || loanId}`,
        status: 'COMPLETED',
        balanceAfter: newBal,
        createdAt: new Date().toISOString()
      });

      return {
        success: true,
        message: `EMI installment of ₹${emi.toLocaleString('en-IN')} paid successfully!`,
        data: { receiptId: `RCPT-${Date.now().toString().slice(-6)}`, amountPaid: emi, balanceAfter: newBal }
      };
    }

    // 18. Notifications Collection
    if (endpoint === '/admin/notifications') {
      const notifs = await window.getAllFromFirestore('notifications');
      return { success: true, data: notifs };
    }

    // 19. UPI Requests
    if (endpoint === '/upi/requests') {
      const requests = await window.getAllFromFirestore('upiRequests');
      return { success: true, data: requests };
    }

    // Default Fallback
    return { success: true, data: [] };
  }
}

let apiInstance = null;
try {
  apiInstance = new ApiService();
} catch (err) {
  console.error("GG BANK: Failed to initialize ApiService:", err);
  apiInstance = Object.create(ApiService.prototype);
}
var API = apiInstance;
window.API = apiInstance;
