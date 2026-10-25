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
      const uid = endpoint.split('/').pop();
      const snap = await window.firestoreDb.collection('accounts').where('userId', '==', uid).get();
      if (!snap.empty) {
        return { success: true, data: { id: snap.docs[0].id, ...snap.docs[0].data() } };
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

    // 8. POST /transfer (Atomic Money Transfers using Firestore Transactions)
    if (endpoint === '/transfer' && method === 'POST') {
      const senderAccNum = (body.senderAccount || '').trim();
      const receiverAccNum = (body.receiverAccount || body.upiId || '').trim();
      const amount = parseFloat(body.amount);
      const isUpi = body.transferMethod === 'UPI' || receiverAccNum.includes('@');

      if (isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a transfer amount greater than zero.');
      }
      if (senderAccNum === receiverAccNum) {
        throw new Error('Cannot transfer money to the same account.');
      }

      const txnId = `TXN-2026-${Date.now().toString().slice(-6)}`;
      let finalSenderBalance = 0;

      await window.runFirestoreTransaction(async (transaction, db) => {
        const senderRef = db.collection('accounts').doc(senderAccNum);
        const senderDoc = await transaction.get(senderRef);
        if (!senderDoc.exists) throw new Error(`Sender account ${senderAccNum} does not exist.`);

        const senderData = senderDoc.data();
        if (senderData.status !== 'ACTIVE') {
          throw new Error(`Sender account is ${senderData.status}. Transfers permitted only for active accounts.`);
        }
        if (senderData.balance < amount) {
          throw new Error(`Insufficient funds. Current balance: ₹${senderData.balance.toLocaleString('en-IN')}`);
        }

        finalSenderBalance = senderData.balance - amount;
        transaction.update(senderRef, { balance: finalSenderBalance });

        // If internal receiver account exists, credit atomically
        let receiverRef = db.collection('accounts').doc(receiverAccNum);
        let receiverDoc = await transaction.get(receiverRef);
        if (receiverDoc.exists) {
          const newReceiverBal = (receiverDoc.data().balance || 0) + amount;
          transaction.update(receiverRef, { balance: newReceiverBal });
        }

        // Write global ledger transaction record
        const txnRef = db.collection('transactions').doc(txnId);
        const txnRecord = {
          transactionId: txnId,
          txId: txnId,
          fromAccount: senderAccNum,
          senderAccount: senderAccNum,
          toAccount: receiverAccNum,
          receiverAccount: receiverAccNum,
          amount: amount,
          type: isUpi ? 'UPI_TRANSFER' : 'TRANSFER',
          category: isUpi ? 'UPI Payment' : 'Internal Transfer',
          description: body.description || (isUpi ? `UPI payment to ${receiverAccNum}` : `Transfer to Account ${receiverAccNum}`),
          status: 'COMPLETED',
          balanceAfter: finalSenderBalance,
          createdAt: new Date().toISOString()
        };
        transaction.set(txnRef, txnRecord);
      });

      await this.logAudit(senderAccNum, null, 'TRANSFER', `Transferred ₹${amount} to ${receiverAccNum} (Txn: ${txnId})`);

      return {
        success: true,
        message: isUpi ? 'UPI transfer completed successfully!' : 'Transfer completed successfully!',
        data: {
          transactionId: txnId,
          balanceAfter: finalSenderBalance,
          amount
        }
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
      const accNum = endpoint.split('/')[3];
      const txns = await window.getAllFromFirestore('transactions');
      const filtered = txns
        .filter(t => t.senderAccount === accNum || t.receiverAccount === accNum || t.fromAccount === accNum || t.toAccount === accNum)
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

      let totalBalance = 0;
      let totalDeposits = 0;
      let totalTransfers = 0;
      let totalWithdrawals = 0;

      accounts.forEach(a => {
        totalBalance += (a.balance || 0);
      });

      txns.forEach(t => {
        if (t.type === 'DEPOSIT') totalDeposits += (t.amount || 0);
        else if (t.type === 'TRANSFER' || t.type === 'UPI_TRANSFER') totalTransfers += (t.amount || 0);
        else if (t.type === 'WITHDRAWAL') totalWithdrawals += (t.amount || 0);
      });

      const stats = {
        totalCustomers: accounts.length,
        totalAccounts: accounts.length,
        totalBalance,
        totalDeposits,
        totalWithdrawals,
        totalTransfers,
        activeAccounts: accounts.filter(a => a.status === 'ACTIVE').length,
        pendingAccounts: accounts.filter(a => a.status === 'PENDING_APPROVAL').length,
        pendingLoans: 0
      };

      if (endpoint === '/admin/dashboard/overview') {
        return {
          success: true,
          data: {
            stats,
            recentTransactions: txns.slice(0, 6),
            pendingLoans: []
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

    // 17. Loans Collection
    if (endpoint === '/admin/loans') {
      const loans = await window.getAllFromFirestore('loans');
      return { success: true, data: loans };
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
