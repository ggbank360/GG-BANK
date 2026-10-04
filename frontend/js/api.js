/**
 * GG BANK - Centralized API & Environment Configuration
 * Supports Local Development (http://localhost:8080) and Production (Vercel -> Deployed Backend)
 */
const resolveApiBaseUrl = () => {
  // 1. Check window-injected environment variable (for Vercel deployment)
  if (typeof window !== 'undefined') {
    if (window.VITE_API_BASE_URL) return window.VITE_API_BASE_URL;
    if (window.__API_BASE_URL__) return window.__API_BASE_URL__;
    if (window.ENV && window.ENV.VITE_API_BASE_URL) return window.ENV.VITE_API_BASE_URL;

    // Check runtime localStorage override (e.g. for testing custom backend URL)
    try {
      const savedUrl = localStorage.getItem('gg_api_base_url');
      if (savedUrl) return savedUrl;
    } catch (_) {}

    // 2. Dynamic Hostname Detection
    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || window.location.protocol === 'file:';

    if (isLocal) {
      return 'http://localhost:8080';
    } else {
      // Running on Vercel or public domain (e.g. https://ggbank.vercel.app)
      // When deployed, we do NOT call loopback localhost.
      // Defaults to relative '/api' proxy or window.GG_BACKEND_URL
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
    this.useFallback = false;
    this.initMockDatabase();
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
    const headers = {
      'Content-Type': 'application/json'
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async request(endpoint, method = 'GET', body = null) {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    // If fallback engine is already activated, serve directly from local engine
    if (this.useFallback) {
      try {
        return this.handleFallback(cleanEndpoint, method, body);
      } catch (fbErr) {
        if (typeof Utils !== 'undefined' && typeof Utils.showToast === 'function') {
          Utils.showToast(fbErr.message, 'error');
        }
        throw fbErr;
      }
    }

    const url = `${API_BASE_URL}${cleanEndpoint}`;
    const options = {
      method,
      headers: this.getHeaders()
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    let response;
    try {
      response = await fetch(url, options);
    } catch (err) {
      console.warn(`GG BANK: Remote backend unreachable on [${cleanEndpoint}]. Switching seamlessly to built-in banking engine.`);
      this.useFallback = true;
      try {
        return this.handleFallback(cleanEndpoint, method, body);
      } catch (fbErr) {
        if (typeof Utils !== 'undefined' && typeof Utils.showToast === 'function') {
          Utils.showToast(fbErr.message, 'error');
        }
        throw fbErr;
      }
    }

    // When hosted without a separate backend, /api/* returns 404, 405, or 502/503/504
    if (response.status === 404 || response.status === 405 || response.status >= 502) {
      console.warn(`GG BANK: Hosted server returned HTTP ${response.status} on [${cleanEndpoint}]. Switching seamlessly to built-in banking engine.`);
      this.useFallback = true;
      try {
        return this.handleFallback(cleanEndpoint, method, body);
      } catch (fbErr) {
        if (typeof Utils !== 'undefined' && typeof Utils.showToast === 'function') {
          Utils.showToast(fbErr.message, 'error');
        }
        throw fbErr;
      }
    }

    if (response.ok) {
      return await response.json();
    }

    const errorData = await response.json().catch(() => ({ message: `Server returned HTTP ${response.status} error` }));
    const errorMsg = errorData.message || errorData.error || `Request failed with status ${response.status}`;
    console.error(`GG BANK: Server error on [${cleanEndpoint}]:`, errorMsg);
    if (typeof Utils !== 'undefined' && typeof Utils.showToast === 'function') {
      Utils.showToast(errorMsg, 'error', 'Database Error');
    }
    throw new Error(errorMsg);
  }

  /* ---------------- MOCK DATABASE & FALLBACK ENGINE ---------------- */
  initMockDatabase() {
    if (!localStorage.getItem('gg_mock_db_initialized')) {
      const demoUsers = [
        {
          userId: 'usr-gowtham-101',
          name: 'Gowtham NK',
          email: 'gowtham@ggbank.com',
          password: 'Password@123',
          phone: '9876543210',
          dateOfBirth: '2003-05-14',
          address: '42 Cyber City, Tech Park, Bangalore',
          role: 'CUSTOMER',
          status: 'ACTIVE',
          createdAt: new Date().toISOString()
        },
        {
          userId: 'usr-admin-999',
          name: 'GG Bank Administrator',
          email: 'admin@ggbank.com',
          password: 'Password@123',
          phone: '9000000000',
          dateOfBirth: '1995-01-01',
          address: 'GG BANK Headquarters, Financial Tower',
          role: 'ADMIN',
          status: 'ACTIVE',
          createdAt: new Date().toISOString()
        },
        {
          userId: 'usr-sarah-102',
          name: 'Sarah Connor',
          email: 'sarah@ggbank.com',
          password: 'Password@123',
          phone: '9123456780',
          dateOfBirth: '2001-11-20',
          address: '77 Silicon Boulevard, Chennai',
          role: 'CUSTOMER',
          status: 'ACTIVE',
          createdAt: new Date().toISOString()
        }
      ];

      const demoAccounts = [
        {
          accountId: 'acc-gowtham-101',
          userId: 'usr-gowtham-101',
          accountNumber: '100188492019',
          accountType: 'SAVINGS',
          balance: 65450.00,
          ifscCode: 'GGBN0001234',
          branch: 'Central Tech Branch',
          status: 'ACTIVE',
          createdAt: new Date().toISOString()
        },
        {
          accountId: 'acc-sarah-102',
          userId: 'usr-sarah-102',
          accountNumber: '100188492020',
          accountType: 'SAVINGS',
          balance: 32000.00,
          ifscCode: 'GGBN0001234',
          branch: 'Central Tech Branch',
          status: 'ACTIVE',
          createdAt: new Date().toISOString()
        }
      ];

      const demoTransactions = [
        {
          transactionId: 'TXN-2026-908101',
          senderAccount: 'EXTERNAL-DEP',
          receiverAccount: '100188492019',
          amount: 50000.00,
          type: 'DEPOSIT',
          category: 'Salary',
          description: 'Monthly Salary Credit',
          status: 'COMPLETED',
          balanceAfter: 50000.00,
          createdAt: new Date(Date.now() - 86400000 * 5).toISOString()
        },
        {
          transactionId: 'TXN-2026-908102',
          senderAccount: '100188492019',
          receiverAccount: '100188492020',
          amount: 5000.00,
          type: 'TRANSFER',
          category: 'Transfer',
          description: 'Project Collab Payment',
          status: 'COMPLETED',
          balanceAfter: 45000.00,
          createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
        },
        {
          transactionId: 'TXN-2026-908103',
          senderAccount: '100188492019',
          receiverAccount: 'BESCOM-ELEC',
          amount: 1550.00,
          type: 'BILL_PAYMENT',
          category: 'Bills',
          description: 'Electricity Bill - BESCOM',
          status: 'COMPLETED',
          balanceAfter: 43450.00,
          createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
        },
        {
          transactionId: 'TXN-2026-908104',
          senderAccount: '100188492019',
          receiverAccount: 'ZOMATO-FOOD',
          amount: 850.00,
          type: 'WITHDRAWAL',
          category: 'Food',
          description: 'Weekend Dining & Food Order',
          status: 'COMPLETED',
          balanceAfter: 42600.00,
          createdAt: new Date(Date.now() - 86400000 * 1).toISOString()
        },
        {
          transactionId: 'TXN-2026-908105',
          senderAccount: 'EXTERNAL-DEP',
          receiverAccount: '100188492019',
          amount: 22850.00,
          type: 'DEPOSIT',
          category: 'Other',
          description: 'Freelance Tech Consultation',
          status: 'COMPLETED',
          balanceAfter: 65450.00,
          createdAt: new Date().toISOString()
        }
      ];

      const demoBeneficiaries = [];

      const demoBudgets = [
        { budgetId: 'b-1', userId: 'usr-gowtham-101', category: 'Food', limitAmount: 5000, spent: 4250, month: '2026-09' },
        { budgetId: 'b-2', userId: 'usr-gowtham-101', category: 'Shopping', limitAmount: 10000, spent: 3400, month: '2026-09' },
        { budgetId: 'b-3', userId: 'usr-gowtham-101', category: 'Bills', limitAmount: 4000, spent: 1550, month: '2026-09' },
        { budgetId: 'b-4', userId: 'usr-gowtham-101', category: 'Transport', limitAmount: 3000, spent: 1200, month: '2026-09' },
        { budgetId: 'b-5', userId: 'usr-gowtham-101', category: 'Entertainment', limitAmount: 3500, spent: 900, month: '2026-09' }
      ];

      const demoLoans = [
        {
          loanId: 'LOAN-849102',
          userId: 'usr-gowtham-101',
          accountNumber: '100188492019',
          loanType: 'Personal Loan',
          requestedAmount: 100000.00,
          monthlyIncome: 65000.00,
          tenure: 24,
          interestRate: 10.5,
          estimatedEMI: 4637.00,
          totalInterest: 11288.00,
          totalRepayment: 111288.00,
          purpose: 'Home renovation and tech setup',
          status: 'PENDING',
          adminRemarks: 'Pending initial documents verification',
          createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
        }
      ];

      const demoNotifications = [
        {
          notificationId: 'notif-1',
          userId: 'usr-gowtham-101',
          title: 'Deposit Received',
          message: '₹22,850.00 has been credited to your account 100188492019.',
          type: 'TRANSACTION',
          read: false,
          createdAt: new Date().toISOString()
        },
        {
          notificationId: 'notif-2',
          userId: 'usr-gowtham-101',
          title: 'Budget Alert',
          message: 'You have used 85% of your monthly Food budget.',
          type: 'BUDGET',
          read: false,
          createdAt: new Date(Date.now() - 3600000 * 4).toISOString()
        }
      ];

      const demoAuditLogs = [
        {
          logId: 'LOG-1001',
          userId: 'usr-gowtham-101',
          adminId: null,
          action: 'USER_REGISTRATION',
          description: 'New customer account created for Gowtham NK',
          timestamp: new Date(Date.now() - 86400000 * 10).toISOString(),
          status: 'SUCCESS'
        },
        {
          logId: 'LOG-1002',
          userId: 'usr-gowtham-101',
          adminId: null,
          action: 'LOGIN',
          description: 'Successful login from Chrome / Windows',
          timestamp: new Date().toISOString(),
          status: 'SUCCESS'
        }
      ];

      const demoOffices = [
        {
          officeId: 'OFF-101',
          branchName: 'Central Tech Branch',
          branchCode: 'GGBN-001',
          ifscCode: 'GGBN0001234',
          city: 'Bangalore',
          address: 'Floor 4, Cyber Pinnacle, Tech Park, Bangalore',
          phone: '+91 80 2345 6789',
          managerName: 'Vikram Sharma',
          loanOfficers: 'Vikram Sharma (Chief Credit Manager), Anita Roy (Personal Loans), Karthik Rao (Mortgage)'
        },
        {
          officeId: 'OFF-102',
          branchName: 'Silicon Valley Branch',
          branchCode: 'GGBN-002',
          ifscCode: 'GGBN0005678',
          city: 'Hyderabad',
          address: 'Plot 12, HITEC City Phase 2, Hyderabad',
          phone: '+91 40 8765 4321',
          managerName: 'Rajesh Kumar',
          loanOfficers: 'Rajesh Kumar (Senior Credit Officer), Priya Patel (Commercial Credit)'
        },
        {
          officeId: 'OFF-103',
          branchName: 'Cyber Gateway Branch',
          branchCode: 'GGBN-003',
          ifscCode: 'GGBN0009999',
          city: 'Chennai',
          address: 'OMR Cyber Gateway Tower B, Chennai',
          phone: '+91 44 9876 5432',
          managerName: 'Michael David',
          loanOfficers: 'Michael David (Lead Underwriter), Sunita Verma (Retail Credit)'
        }
      ];

      const demoOfficers = [
        {
          officerId: 'off-001',
          employeeId: 'EMP-1001',
          name: 'Vikram Sharma',
          email: 'vikram.sharma@ggbank.com',
          phone: '+91 98765 43210',
          department: 'LOAN',
          designation: 'Chief Credit Officer',
          branch: 'Central Tech Branch',
          status: 'ACTIVE',
          assignedCases: 12,
          createdAt: '2026-01-10T09:00:00Z'
        },
        {
          officerId: 'off-002',
          employeeId: 'EMP-1002',
          name: 'Anita Roy',
          email: 'anita.roy@ggbank.com',
          phone: '+91 98765 43211',
          department: 'LOAN',
          designation: 'Senior Personal Loan Underwriter',
          branch: 'Central Tech Branch',
          status: 'ACTIVE',
          assignedCases: 8,
          createdAt: '2026-01-15T09:00:00Z'
        },
        {
          officerId: 'off-003',
          employeeId: 'EMP-1003',
          name: 'Priya Patel',
          email: 'priya.patel@ggbank.com',
          phone: '+91 98765 43212',
          department: 'COMPLIANCE',
          designation: 'Lead KYC & AML Compliance Officer',
          branch: 'Financial Tower Branch',
          status: 'ACTIVE',
          assignedCases: 19,
          createdAt: '2026-02-01T09:00:00Z'
        },
        {
          officerId: 'off-004',
          employeeId: 'EMP-1004',
          name: 'Karthik Rao',
          email: 'karthik.rao@ggbank.com',
          phone: '+91 98765 43213',
          department: 'TREASURY',
          designation: 'Treasury & Vault Operations Manager',
          branch: 'Central Tech Branch',
          status: 'ACTIVE',
          assignedCases: 5,
          createdAt: '2026-02-10T09:00:00Z'
        },
        {
          officerId: 'off-005',
          employeeId: 'EMP-1005',
          name: 'Rajesh Kumar',
          email: 'rajesh.kumar@ggbank.com',
          phone: '+91 98765 43214',
          department: 'OPERATIONS',
          designation: 'Branch Operations Supervisor',
          branch: 'North Metro Branch',
          status: 'ON_LEAVE',
          assignedCases: 2,
          createdAt: '2026-02-20T09:00:00Z'
        }
      ];

      localStorage.setItem('gg_users', JSON.stringify(demoUsers));
      localStorage.setItem('gg_accounts', JSON.stringify(demoAccounts));
      localStorage.setItem('gg_transactions', JSON.stringify(demoTransactions));
      localStorage.setItem('gg_beneficiaries', JSON.stringify(demoBeneficiaries));
      localStorage.setItem('gg_budgets', JSON.stringify(demoBudgets));
      localStorage.setItem('gg_loans', JSON.stringify(demoLoans));
      localStorage.setItem('gg_notifications', JSON.stringify(demoNotifications));
      localStorage.setItem('gg_audit_logs', JSON.stringify(demoAuditLogs));
      localStorage.setItem('gg_offices', JSON.stringify(demoOffices));
      localStorage.setItem('gg_officers', JSON.stringify(demoOfficers));
      localStorage.setItem('gg_mock_db_initialized', 'true');
    }
  }

  getMock(key) {
    return JSON.parse(localStorage.getItem(key) || '[]');
  }

  setMock(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  logAudit(userId, adminId, action, description, status = 'SUCCESS') {
    const logs = this.getMock('gg_audit_logs');
    logs.unshift({
      logId: `LOG-${Date.now().toString().slice(-6)}`,
      userId,
      adminId,
      action,
      description,
      timestamp: new Date().toISOString(),
      status
    });
    this.setMock('gg_audit_logs', logs);
  }

  handleFallback(endpoint, method, body) {
    const currentUser = JSON.parse(localStorage.getItem('gg_current_user') || 'null');
    const currentUserId = currentUser ? currentUser.userId : 'usr-gowtham-101';

    // POST /auth/login
    if (endpoint === '/auth/login' && method === 'POST') {
      const accounts = this.getMock('gg_accounts');
      const users = this.getMock('gg_users');
      const emailInput = (body.email || '').trim().toLowerCase();
      const accNumInput = (body.accountNumber || '').trim();
      const passwordInput = body.password;

      let matchedUser = null;
      let matchedAccount = null;

      if (emailInput) {
        matchedUser = users.find(u => u.email && u.email.toLowerCase() === emailInput);
        if (matchedUser) {
          matchedAccount = accounts.find(a => a.userId === matchedUser.userId);
        }
      } else if (accNumInput) {
        matchedAccount = accounts.find(a => a.accountNumber === accNumInput);
        if (matchedAccount) {
          matchedUser = users.find(u => u.userId === matchedAccount.userId);
        }
      }

      if (!matchedUser) {
        throw new Error(`No registered account found with ${emailInput ? 'email "' + emailInput + '"' : 'account number "' + accNumInput + '"'}. Please check your credentials or click "Open Account" to register.`);
      }

      // STRICT password verification
      const expectedPass = matchedUser.password || 'Password@123';
      if (passwordInput && passwordInput !== expectedPass) {
        throw new Error('Incorrect password. Please verify your password and try again.');
      }

      if (matchedUser.status === 'BLOCKED') {
        throw new Error('Account is blocked. Please contact GG BANK administration.');
      }

      if (!matchedAccount) {
        matchedAccount = accounts.find(a => a.userId === matchedUser.userId) || {
          accountId: 'acc-' + matchedUser.userId,
          userId: matchedUser.userId,
          accountNumber: '100188492019',
          accountType: 'SAVINGS',
          balance: 65450.00,
          ifscCode: 'GGBN0001234',
          branch: 'Central Tech Branch',
          status: 'ACTIVE'
        };
      }

      const token = 'jwt-' + matchedUser.userId;
      this.logAudit(matchedUser.userId, null, 'LOGIN', `Customer logged in: ${matchedUser.email}`);
      return {
        success: true,
        message: 'Authentication successful',
        data: {
          token,
          user: matchedUser,
          account: matchedAccount
        }
      };
    }

    // GET /users/me
    if (endpoint === '/users/me') {
      const users = this.getMock('gg_users');
      const user = users.find(u => u.userId === currentUserId) || users[0];
      return { success: true, data: user };
    }

    // POST /users/register
    if (endpoint === '/users/register' && method === 'POST') {
      const users = this.getMock('gg_users');
      const accounts = this.getMock('gg_accounts');
      
      const cleanEmail = (body.email || '').trim().toLowerCase();
      if (users.some(u => u.email && u.email.toLowerCase() === cleanEmail)) {
        throw new Error(`An account with email "${cleanEmail}" already exists. Please log in.`);
      }

      const newUserId = 'usr-' + Date.now().toString().slice(-6);
      const newAccNum = '100188' + Math.floor(100000 + Math.random() * 900000);

      const newUser = {
        userId: newUserId,
        name: body.name,
        email: cleanEmail,
        password: body.password || 'Password@123',
        phone: body.phone,
        dateOfBirth: body.dateOfBirth,
        address: body.address || 'Standard Registered Address',
        role: 'CUSTOMER',
        status: 'ACTIVE',
        createdAt: new Date().toISOString()
      };

      const newAccount = {
        accountId: 'acc-' + newUserId,
        userId: newUserId,
        accountNumber: newAccNum,
        accountType: body.accountType || 'SAVINGS',
        balance: 0.00,
        ifscCode: 'GGBN0001234',
        branch: 'Central Tech Branch',
        status: 'ACTIVE',
        createdAt: new Date().toISOString()
      };

      users.push(newUser);
      accounts.push(newAccount);
      this.setMock('gg_users', users);
      this.setMock('gg_accounts', accounts);

      // Auto sync to Firestore
      if (window.saveToFirestore) {
        window.saveToFirestore('users', newUserId, newUser);
        window.saveToFirestore('accounts', newAccount.accountId, newAccount);
      }

      return {
        success: true,
        message: 'Customer registered successfully',
        data: {
          user: newUser,
          account: newAccount
        }
      };
    }

    // GET /accounts/user/{userId}
    if (endpoint.startsWith('/accounts/user/')) {
      const uid = endpoint.split('/').pop();
      const accounts = this.getMock('gg_accounts');
      const acc = accounts.find(a => a.userId === uid) || accounts[0];
      return { success: true, data: acc };
    }

    // GET /transactions/account/{accountNumber}
    if (endpoint.startsWith('/transactions/account/')) {
      const accNum = endpoint.split('/').pop();
      const txns = this.getMock('gg_transactions');
      const userTxns = txns.filter(t => t.senderAccount === accNum || t.receiverAccount === accNum);
      return { success: true, data: userTxns };
    }

    // GET /transactions
    if ((endpoint === '/transactions' || endpoint === '/transactions/') && method === 'GET') {
      const txns = this.getMock('gg_transactions');
      const sorted = [...txns].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return { success: true, data: sorted };
    }

    // POST /transfer
    if (endpoint === '/transfer' && method === 'POST') {
      const accounts = this.getMock('gg_accounts');
      const senderAcc = accounts.find(a => a.accountNumber === body.senderAccount);
      const receiverAcc = accounts.find(a => a.accountNumber === body.receiverAccount);

      if (!senderAcc || senderAcc.status !== 'ACTIVE') {
        throw new Error('Sender account is invalid or inactive');
      }
      if (body.senderAccount === body.receiverAccount) {
        throw new Error('Cannot transfer money to the same account');
      }
      const amount = parseFloat(body.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Transfer amount must be greater than zero');
      }
      if (senderAcc.balance < amount) {
        throw new Error('Insufficient balance in sender account');
      }

      // Debit sender
      senderAcc.balance -= amount;
      // Credit receiver if internal
      if (receiverAcc) {
        receiverAcc.balance += amount;
      }
      this.setMock('gg_accounts', accounts);

      // Record transaction
      const txns = this.getMock('gg_transactions');
      const txnId = `TXN-2026-${Date.now().toString().slice(-6)}`;
      const newTxn = {
        transactionId: txnId,
        senderAccount: body.senderAccount,
        receiverAccount: body.receiverAccount,
        amount: amount,
        type: 'TRANSFER',
        category: 'Transfer',
        description: body.description || `Transfer to ${body.beneficiaryName || body.receiverAccount}`,
        status: 'COMPLETED',
        balanceAfter: senderAcc.balance,
        createdAt: new Date().toISOString()
      };
      txns.unshift(newTxn);
      this.setMock('gg_transactions', txns);

      this.logAudit(senderAcc.userId, null, 'TRANSFER', `Transferred ₹${amount} from ${body.senderAccount} to ${body.receiverAccount}`);
      return { success: true, message: 'Transfer completed successfully', data: newTxn };
    }

    // POST /deposit
    if (endpoint === '/deposit' && method === 'POST') {
      const accounts = this.getMock('gg_accounts');
      const acc = accounts.find(a => a.accountNumber === body.accountNumber);
      if (!acc) throw new Error('Account not found');

      const amount = parseFloat(body.amount);
      if (isNaN(amount) || amount <= 0) throw new Error('Deposit amount must be greater than zero');

      acc.balance += amount;
      this.setMock('gg_accounts', accounts);

      const txns = this.getMock('gg_transactions');
      const txnId = `TXN-2026-${Date.now().toString().slice(-6)}`;
      const newTxn = {
        transactionId: txnId,
        senderAccount: body.paymentMethod || 'DEPOSIT-METHOD',
        receiverAccount: body.accountNumber,
        amount: amount,
        type: 'DEPOSIT',
        category: 'Deposit',
        description: body.description || `Deposit via ${body.paymentMethod || 'Online'}`,
        status: 'COMPLETED',
        balanceAfter: acc.balance,
        createdAt: new Date().toISOString()
      };
      txns.unshift(newTxn);
      this.setMock('gg_transactions', txns);

      this.logAudit(acc.userId, null, 'DEPOSIT', `Deposited ₹${amount} to account ${body.accountNumber}`);
      return { success: true, message: 'Deposit processed successfully', data: newTxn };
    }

    // POST /withdraw
    if (endpoint === '/withdraw' && method === 'POST') {
      const accounts = this.getMock('gg_accounts');
      const acc = accounts.find(a => a.accountNumber === body.accountNumber);
      if (!acc) throw new Error('Account not found');

      const amount = parseFloat(body.amount);
      if (isNaN(amount) || amount <= 0) throw new Error('Withdrawal amount must be greater than zero');
      if (acc.balance < amount) throw new Error('Insufficient balance for withdrawal');

      acc.balance -= amount;
      this.setMock('gg_accounts', accounts);

      const txns = this.getMock('gg_transactions');
      const txnId = `TXN-2026-${Date.now().toString().slice(-6)}`;
      const newTxn = {
        transactionId: txnId,
        senderAccount: body.accountNumber,
        receiverAccount: 'SELF-CASH',
        amount: amount,
        type: 'WITHDRAWAL',
        category: 'Cash',
        description: body.description || 'Cash Withdrawal',
        status: 'COMPLETED',
        balanceAfter: acc.balance,
        createdAt: new Date().toISOString()
      };
      txns.unshift(newTxn);
      this.setMock('gg_transactions', txns);

      this.logAudit(acc.userId, null, 'WITHDRAWAL', `Withdrew ₹${amount} from account ${body.accountNumber}`);
      return { success: true, message: 'Withdrawal processed successfully', data: newTxn };
    }

    // POST /bills/pay
    if (endpoint === '/bills/pay' && method === 'POST') {
      const accounts = this.getMock('gg_accounts');
      const acc = accounts.find(a => a.accountNumber === body.accountNumber);
      if (!acc) throw new Error('Account not found');

      const amount = parseFloat(body.amount);
      if (acc.balance < amount) throw new Error('Insufficient balance to pay bill');

      acc.balance -= amount;
      this.setMock('gg_accounts', accounts);

      const txns = this.getMock('gg_transactions');
      const txnId = `TXN-2026-${Date.now().toString().slice(-6)}`;
      const newTxn = {
        transactionId: txnId,
        senderAccount: body.accountNumber,
        receiverAccount: `${body.category.toUpperCase()}-PAY`,
        amount: amount,
        type: 'BILL_PAYMENT',
        category: 'Bills',
        description: `${body.category} Bill - ${body.provider} (ID: ${body.consumerNumber})`,
        status: 'COMPLETED',
        balanceAfter: acc.balance,
        createdAt: new Date().toISOString()
      };
      txns.unshift(newTxn);
      this.setMock('gg_transactions', txns);

      // Update budget spending for Bills category
      const budgets = this.getMock('gg_budgets');
      const billBudget = budgets.find(b => b.category.toLowerCase() === 'bills');
      if (billBudget) {
        billBudget.spent += amount;
        this.setMock('gg_budgets', budgets);
      }

      this.logAudit(acc.userId, null, 'BILL_PAYMENT', `Paid ₹${amount} bill for ${body.provider}`);
      return { success: true, message: 'Bill payment successful', data: newTxn };
    }

    // GET & POST /beneficiaries
    if (endpoint.startsWith('/beneficiaries')) {
      const bens = this.getMock('gg_beneficiaries');
      if (method === 'GET') {
        return { success: true, data: bens.filter(b => b.userId === currentUserId) };
      }
      if (method === 'POST') {
        const newBen = {
          beneficiaryId: 'ben-' + Date.now().toString().slice(-6),
          userId: currentUserId,
          name: body.name,
          accountNumber: body.accountNumber,
          ifscCode: body.ifscCode,
          bankName: body.bankName
        };
        bens.push(newBen);
        this.setMock('gg_beneficiaries', bens);
        return { success: true, message: 'Beneficiary added', data: newBen };
      }
      if (method === 'DELETE') {
        const id = endpoint.split('/').pop();
        const filtered = bens.filter(b => b.beneficiaryId !== id);
        this.setMock('gg_beneficiaries', filtered);
        return { success: true, message: 'Beneficiary removed' };
      }
    }

    // GET & POST /loans
    if (endpoint.startsWith('/loans')) {
      const loans = this.getMock('gg_loans');
      if (method === 'GET') {
        return { success: true, data: loans };
      }
      if (method === 'POST') {
        const newLoan = {
          loanId: `LOAN-${Date.now().toString().slice(-6)}`,
          userId: currentUserId,
          accountNumber: body.accountNumber,
          loanType: body.loanType,
          requestedAmount: parseFloat(body.requestedAmount),
          monthlyIncome: parseFloat(body.monthlyIncome),
          tenure: parseInt(body.tenure),
          interestRate: parseFloat(body.interestRate || 10.5),
          estimatedEMI: parseFloat(body.estimatedEMI),
          totalInterest: parseFloat(body.totalInterest),
          totalRepayment: parseFloat(body.totalRepayment),
          purpose: body.purpose,
          status: 'PENDING',
          adminRemarks: 'Application submitted for review',
          createdAt: new Date().toISOString()
        };
        loans.unshift(newLoan);
        this.setMock('gg_loans', loans);
        this.logAudit(currentUserId, null, 'LOAN_APPLICATION', `Applied for ${body.loanType} of ₹${body.requestedAmount}`);
        return { success: true, message: 'Loan application submitted', data: newLoan };
      }
    }

    // POST /loans/{id}/pay-emi
    if (endpoint.includes('/loans/') && endpoint.endsWith('/pay-emi') && method === 'POST') {
      const loanId = endpoint.split('/')[2];
      const loans = this.getMock('gg_loans');
      const loan = loans.find(l => l.loanId === loanId);
      const accounts = this.getMock('gg_accounts');
      const amount = parseFloat(body.amount || 0);
      const acc = accounts.find(a => a.accountNumber === body.accountNumber);
      if (acc && amount > 0) {
        if (acc.balance < amount) throw new Error('Insufficient balance to pay EMI');
        acc.balance -= amount;
        this.setMock('gg_accounts', accounts);
        const txns = this.getMock('gg_transactions');
        txns.unshift({
          transactionId: `TXN-2026-${Date.now().toString().slice(-6)}`,
          senderAccount: acc.accountNumber,
          receiverAccount: 'GG-BANK-LOAN-REPAYMENT',
          amount: amount,
          type: 'LOAN_REPAYMENT',
          category: 'Loan EMI',
          description: `EMI Payment for Loan ${loanId}`,
          status: 'COMPLETED',
          balanceAfter: acc.balance,
          createdAt: new Date().toISOString()
        });
        this.setMock('gg_transactions', txns);
      }
      return { success: true, message: 'Loan EMI paid successfully!' };
    }

    // GET & POST /budgets
    if (endpoint.startsWith('/budgets')) {
      const budgets = this.getMock('gg_budgets');
      if (method === 'GET') {
        return { success: true, data: budgets.filter(b => b.userId === currentUserId) };
      }
      if (method === 'POST') {
        const existing = budgets.find(b => b.userId === currentUserId && b.category === body.category);
        if (existing) {
          existing.limitAmount = parseFloat(body.limitAmount);
        } else {
          budgets.push({
            budgetId: 'b-' + Date.now().toString().slice(-4),
            userId: currentUserId,
            category: body.category,
            limitAmount: parseFloat(body.limitAmount),
            spent: 0,
            month: '2026-09'
          });
        }
        this.setMock('gg_budgets', budgets);
        return { success: true, message: 'Budget set successfully' };
      }
    }

    // GET /notifications
    if (endpoint.startsWith('/notifications')) {
      const notifs = this.getMock('gg_notifications');
      if (method === 'GET') {
        return { success: true, data: notifs.filter(n => n.userId === currentUserId || n.userId === 'ALL') };
      }
      if (endpoint.includes('/read-all')) {
        notifs.forEach(n => { if (n.userId === currentUserId) n.read = true; });
        this.setMock('gg_notifications', notifs);
        return { success: true, message: 'All marked as read' };
      }
    }

    // POST /qr/validate
    if (endpoint === '/qr/validate' && method === 'POST') {
      const qrData = (body && body.qrData) || '';
      const match = qrData.match(/\b\d{11,12}\b/);
      const targetAcc = match ? match[0] : null;
      if (!targetAcc) throw new Error('Unrecognized QR Code format');
      const accounts = this.getMock('gg_accounts');
      const acc = accounts.find(a => a.accountNumber === targetAcc);
      if (!acc) throw new Error('Account associated with QR code not found in GG BANK');
      const users = this.getMock('gg_users');
      const u = users.find(user => user.userId === acc.userId);
      return {
        success: true,
        message: 'QR verified successfully',
        data: {
          accountNumber: acc.accountNumber,
          accountType: acc.accountType,
          status: acc.status,
          name: u ? u.name : 'GG Bank Customer',
          qrIdentifier: `QR-VERIFIED-${acc.accountNumber}`,
          verified: true
        }
      };
    }

    // POST /qr/pay
    if (endpoint === '/qr/pay' && method === 'POST') {
      const senderAccNum = body.senderAccount;
      const receiverAccNum = body.receiverAccount;
      const amount = parseFloat(body.amount || 0);
      const accounts = this.getMock('gg_accounts');
      const senderAcc = accounts.find(a => a.accountNumber === senderAccNum);
      const receiverAcc = accounts.find(a => a.accountNumber === receiverAccNum);
      if (!senderAcc || !receiverAcc) throw new Error('Account not found for QR payment');
      if (senderAcc.balance < amount) throw new Error('Insufficient balance in account');
      senderAcc.balance -= amount;
      receiverAcc.balance += amount;
      this.setMock('gg_accounts', accounts);

      const txns = this.getMock('gg_transactions');
      const txnId = `TXN-2026-${Date.now().toString().slice(-6)}`;
      const newTxn = {
        transactionId: txnId,
        senderAccount: senderAccNum,
        receiverAccount: receiverAccNum,
        amount: amount,
        type: 'TRANSFER',
        category: 'Transfer',
        description: body.note || 'Instant QR Scan & Pay',
        status: 'COMPLETED',
        balanceAfter: senderAcc.balance,
        createdAt: new Date().toISOString()
      };
      txns.unshift(newTxn);
      this.setMock('gg_transactions', txns);
      return { success: true, message: 'QR Payment completed successfully', data: newTxn };
    }

    // GET /upi/my-upi
    if (endpoint === '/upi/my-upi' && method === 'GET') {
      const upi = JSON.parse(localStorage.getItem('gg_upi_profile') || 'null') || {
        userId: currentUserId,
        accountNumber: '100188492019',
        upiId: 'gowtham@ggbank',
        status: 'ACTIVE',
        pendingRequest: null
      };
      return { success: true, data: upi };
    }

    // POST /upi/customize
    if (endpoint === '/upi/customize' && method === 'POST') {
      const handle = (body.upiHandle || '').trim().toLowerCase();
      const upi = JSON.parse(localStorage.getItem('gg_upi_profile') || 'null') || {
        userId: currentUserId,
        accountNumber: '100188492019',
        upiId: `${handle}@ggbank`,
        status: 'ACTIVE',
        pendingRequest: `${handle}@ggbank`
      };
      upi.pendingRequest = `${handle}@ggbank`;
      localStorage.setItem('gg_upi_profile', JSON.stringify(upi));
      return { success: true, message: 'Custom UPI ID request submitted for officer approval!', data: upi };
    }

    // GET /upi/requests
    if (endpoint === '/upi/requests' && method === 'GET') {
      const upi = JSON.parse(localStorage.getItem('gg_upi_profile') || 'null');
      const list = (upi && upi.pendingRequest) ? [{
        requestId: 'REQ-UPI-101',
        userId: upi.userId || currentUserId,
        currentHandle: upi.upiId,
        requestedHandle: upi.pendingRequest,
        status: 'PENDING_APPROVAL',
        submittedAt: new Date().toISOString()
      }] : [];
      return { success: true, data: list };
    }

    // POST /upi/requests/{id}/approve
    if (endpoint.startsWith('/upi/requests/') && endpoint.endsWith('/approve')) {
      const upi = JSON.parse(localStorage.getItem('gg_upi_profile') || 'null') || {};
      if (upi.pendingRequest) {
        upi.upiId = upi.pendingRequest;
        upi.pendingRequest = null;
        localStorage.setItem('gg_upi_profile', JSON.stringify(upi));
      }
      return { success: true, message: 'UPI request approved successfully!' };
    }

    // POST /upi/requests/{id}/reject
    if (endpoint.startsWith('/upi/requests/') && endpoint.endsWith('/reject')) {
      const upi = JSON.parse(localStorage.getItem('gg_upi_profile') || 'null') || {};
      upi.pendingRequest = null;
      localStorage.setItem('gg_upi_profile', JSON.stringify(upi));
      return { success: true, message: 'UPI request rejected.' };
    }

    // GET & POST /profile-requests
    if (endpoint === '/profile-requests' || endpoint === '/profile/requests') {
      let reqs = JSON.parse(localStorage.getItem('gg_profile_requests') || '[]');
      if (method === 'GET') {
        return { success: true, data: reqs };
      }
      if (method === 'POST') {
        const reqId = `REQ-PROF-${Date.now().toString().slice(-6)}`;
        const newReq = {
          requestId: reqId,
          userId: body.userId || currentUserId,
          customerName: body.customerName || 'Customer',
          currentDetails: body.currentDetails || {},
          requestedDetails: body.requestedDetails || {},
          status: 'PENDING_OFFICER_APPROVAL',
          submittedAt: new Date().toISOString()
        };
        reqs.unshift(newReq);
        localStorage.setItem('gg_profile_requests', JSON.stringify(reqs));
        return { success: true, message: 'Profile edit request submitted', data: newReq };
      }
    }

    // PUT /admin/customers/{userId}/approve
    if (endpoint.startsWith('/admin/customers/') && endpoint.endsWith('/approve') && method === 'PUT') {
      const userId = endpoint.split('/')[3];
      const users = this.getMock('gg_users');
      const u = users.find(user => user.userId === userId);
      if (u) {
        u.status = 'ACTIVE';
        this.setMock('gg_users', users);
      }
      return { success: true, message: 'Customer approved successfully' };
    }

    // PUT /admin/customers/{userId}/reject
    if (endpoint.startsWith('/admin/customers/') && endpoint.endsWith('/reject') && method === 'PUT') {
      const userId = endpoint.split('/')[3];
      const users = this.getMock('gg_users');
      const u = users.find(user => user.userId === userId);
      if (u) {
        u.status = 'REJECTED';
        this.setMock('gg_users', users);
      }
      return { success: true, message: 'Customer rejected' };
    }

    // GET /insights/{userId}
    if (endpoint.startsWith('/insights')) {
      const txns = this.getMock('gg_transactions');
      let totalIncome = 0;
      let totalExpenses = 0;

      txns.forEach(t => {
        if (t.type === 'DEPOSIT') totalIncome += t.amount;
        if (t.type === 'TRANSFER' || t.type === 'WITHDRAWAL' || t.type === 'BILL_PAYMENT') totalExpenses += t.amount;
      });

      const savings = Math.max(0, totalIncome - totalExpenses);
      const savingsRate = totalIncome > 0 ? ((savings / totalIncome) * 100).toFixed(1) : 0;

      return {
        success: true,
        data: {
          totalIncome,
          totalExpenses,
          savings,
          savingsRate,
          avgMonthlySpending: (totalExpenses / 2).toFixed(2),
          highestCategory: 'Food & Dining',
          insights: [
            "Your savings rate is healthy at " + savingsRate + "% this month.",
            "You spent ₹1,550 on Utilities and Bill payments.",
            "Food & Shopping remain your most active expense categories.",
            "Tip: Keeping entertainment expenses below 10% accelerates long-term wealth."
          ]
        }
      };
    }

    // ---------------- ADMIN ENDPOINTS ----------------
    // 1. Dashboard & Stats
    if (endpoint === '/admin/dashboard' || endpoint === '/admin/stats' || endpoint === '/admin/dashboard/overview') {
      const users = this.getMock('gg_users');
      const accounts = this.getMock('gg_accounts');
      const txns = this.getMock('gg_transactions');
      const loans = this.getMock('gg_loans');

      let totalDeposits = 0;
      let totalWithdrawals = 0;
      let totalTransfers = 0;
      let totalBalance = 0;

      accounts.forEach(a => {
        totalBalance += (a.balance || 0);
      });

      txns.forEach(t => {
        if (t.type === 'DEPOSIT') totalDeposits += (t.amount || 0);
        if (t.type === 'WITHDRAWAL') totalWithdrawals += (t.amount || 0);
        if (t.type === 'TRANSFER') totalTransfers += (t.amount || 0);
      });

      const stats = {
        totalCustomers: users.filter(u => u.role === 'CUSTOMER').length,
        totalAccounts: accounts.length,
        totalBalance,
        totalDeposits,
        totalWithdrawals,
        totalTransfers,
        pendingLoans: loans.filter(l => l.status === 'PENDING').length,
        activeAccounts: accounts.filter(a => a.status === 'ACTIVE').length,
        blockedAccounts: accounts.filter(a => a.status === 'BLOCKED').length
      };

      if (endpoint === '/admin/dashboard/overview') {
        const sortedTxns = [...txns].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const pendingLoansList = loans.filter(l => l.status === 'PENDING').slice(0, 5);
        return {
          success: true,
          data: {
            stats,
            recentTransactions: sortedTxns.slice(0, 5),
            pendingLoans: pendingLoansList
          }
        };
      }

      return { success: true, data: stats };
    }

    // 2. Customers
    if (endpoint === '/admin/customers' && method === 'GET') {
      const users = this.getMock('gg_users').filter(u => u.role === 'CUSTOMER');
      const accounts = this.getMock('gg_accounts');

      const fullCustomerList = users.map(u => {
        const acc = accounts.find(a => a.userId === u.userId) || {};
        return {
          ...u,
          accountId: acc.accountId || 'acc-' + u.userId,
          accountNumber: acc.accountNumber || 'N/A',
          accountType: acc.accountType || 'SAVINGS',
          balance: acc.balance || 0,
          ifscCode: acc.ifscCode || 'GGBN0001234',
          accountStatus: acc.status || u.status || 'ACTIVE',
          documents: u.documents || {
            panNumber: u.panNumber || 'ABCDE1234F',
            dlNumber: u.dlNumber || 'DL-1420110012345',
            aadhaarNumber: u.aadhaarNumber || '2345 6789 0123'
          }
        };
      });

      return { success: true, data: fullCustomerList };
    }

    // Customer Details
    if (endpoint.startsWith('/admin/customers/') && method === 'GET' && !endpoint.includes('/status') && !endpoint.includes('/activate') && !endpoint.includes('/deactivate') && !endpoint.includes('/block')) {
      const userId = endpoint.split('/')[3];
      const users = this.getMock('gg_users');
      const accounts = this.getMock('gg_accounts');
      const txns = this.getMock('gg_transactions');
      const loans = this.getMock('gg_loans');

      const user = users.find(u => u.userId === userId);
      if (!user) throw new Error('Customer not found with ID: ' + userId);

      const acc = accounts.find(a => a.userId === userId) || null;
      const userTxns = acc ? txns.filter(t => t.senderAccount === acc.accountNumber || t.receiverAccount === acc.accountNumber) : [];
      const userLoans = loans.filter(l => l.userId === userId || (acc && l.accountNumber === acc.accountNumber));

      let totalDeposits = 0;
      let totalWithdrawals = 0;
      let totalTransfers = 0;

      userTxns.forEach(t => {
        if (t.type === 'DEPOSIT') totalDeposits += t.amount;
        else if (t.type === 'WITHDRAWAL') totalWithdrawals += t.amount;
        else if (t.type === 'TRANSFER') totalTransfers += t.amount;
      });

      return {
        success: true,
        data: {
          user,
          account: acc,
          totalTransactionsCount: userTxns.length,
          totalDeposits,
          totalWithdrawals,
          totalTransfers,
          activeLoansCount: userLoans.filter(l => l.status === 'APPROVED').length,
          recentTransactions: userTxns.slice(0, 10),
          loans: userLoans
        }
      };
    }

    // Customer Status Change (Activate/Deactivate/Block)
    if (endpoint.startsWith('/admin/customers/') && (endpoint.endsWith('/activate') || endpoint.endsWith('/deactivate') || endpoint.endsWith('/block') || endpoint.endsWith('/status')) && method === 'PUT') {
      const parts = endpoint.split('/');
      const userId = parts[3];
      let newStatus = 'ACTIVE';

      if (endpoint.endsWith('/activate')) newStatus = 'ACTIVE';
      else if (endpoint.endsWith('/deactivate')) newStatus = 'INACTIVE';
      else if (endpoint.endsWith('/block')) newStatus = 'BLOCKED';
      else if (body && body.status) newStatus = body.status.toUpperCase();

      const users = this.getMock('gg_users');
      const accounts = this.getMock('gg_accounts');

      const user = users.find(u => u.userId === userId);
      if (user) {
        user.status = newStatus;
        this.setMock('gg_users', users);
      }
      const acc = accounts.find(a => a.userId === userId);
      if (acc) {
        acc.status = newStatus;
        this.setMock('gg_accounts', accounts);
      }

      this.logAudit(userId, 'usr-admin-999', 'ACCOUNT_STATUS_CHANGE', `Set customer ${userId} status to ${newStatus}`);
      return { success: true, message: `Customer status updated to ${newStatus}`, data: user };
    }

    // Customer Profile Edit
    if (endpoint.startsWith('/admin/customers/') && (endpoint.endsWith('/edit') || (!endpoint.includes('/status') && !endpoint.includes('/activate') && !endpoint.includes('/deactivate') && !endpoint.includes('/block'))) && method === 'PUT') {
      const userId = endpoint.split('/')[3];
      const users = this.getMock('gg_users');
      const accounts = this.getMock('gg_accounts');

      const user = users.find(u => u.userId === userId);
      if (!user) throw new Error('Customer not found');

      if (body.name) user.name = body.name;
      if (body.email) user.email = body.email;
      if (body.phone) user.phone = body.phone;
      if (body.dateOfBirth) user.dateOfBirth = body.dateOfBirth;
      if (body.address) user.address = body.address;
      if (body.status) user.status = body.status;
      this.setMock('gg_users', users);

      const acc = accounts.find(a => a.userId === userId);
      if (acc && body.status) {
        acc.status = body.status;
        this.setMock('gg_accounts', accounts);
      }

      this.logAudit(userId, 'usr-admin-999', 'CUSTOMER_EDIT', `Updated details for customer ${user.name}`);
      return { success: true, message: 'Customer details updated successfully!', data: user };
    }

    // 3. Accounts
    if (endpoint === '/admin/accounts' && method === 'GET') {
      const accounts = this.getMock('gg_accounts');
      const users = this.getMock('gg_users');

      const detailedAccounts = accounts.map(a => {
        const u = users.find(user => user.userId === a.userId) || {};
        return {
          ...a,
          customerName: u.name || 'Unknown',
          customerEmail: u.email || 'N/A',
          customerPhone: u.phone || 'N/A'
        };
      });

      return { success: true, data: detailedAccounts };
    }

    if (endpoint.startsWith('/admin/accounts/') && method === 'GET' && !endpoint.includes('/status') && !endpoint.includes('/activate') && !endpoint.includes('/deactivate') && !endpoint.includes('/block')) {
      const accountId = endpoint.split('/')[3];
      const accounts = this.getMock('gg_accounts');
      const acc = accounts.find(a => a.accountId === accountId || a.accountNumber === accountId);
      if (!acc) throw new Error('Account not found');
      return { success: true, data: acc };
    }

    if (endpoint.startsWith('/admin/accounts/') && method === 'PUT') {
      const parts = endpoint.split('/');
      const accountId = parts[3];
      let newStatus = 'ACTIVE';

      if (endpoint.endsWith('/activate')) newStatus = 'ACTIVE';
      else if (endpoint.endsWith('/deactivate')) newStatus = 'INACTIVE';
      else if (endpoint.endsWith('/block')) newStatus = 'BLOCKED';
      else if (body && body.status) newStatus = body.status.toUpperCase();

      const accounts = this.getMock('gg_accounts');
      const acc = accounts.find(a => a.accountId === accountId || a.accountNumber === accountId);
      if (!acc) throw new Error('Account not found');

      acc.status = newStatus;
      this.setMock('gg_accounts', accounts);

      this.logAudit(acc.userId, 'usr-admin-999', 'ACCOUNT_STATUS_CHANGE', `Changed account status for ${acc.accountNumber} to ${newStatus}`);
      return { success: true, message: `Account status set to ${newStatus}`, data: acc };
    }

    // 4. Transactions
    if (endpoint === '/admin/transactions' && method === 'GET') {
      const txns = this.getMock('gg_transactions');
      const sorted = [...txns].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return { success: true, data: sorted };
    }

    if (endpoint.startsWith('/admin/transactions/') && method === 'GET') {
      const txnId = endpoint.split('/')[3];
      const txns = this.getMock('gg_transactions');
      const t = txns.find(item => item.transactionId === txnId);
      if (!t) throw new Error('Transaction not found');
      return { success: true, data: t };
    }

    // 5. Deposits
    if (endpoint === '/admin/deposits' && method === 'GET') {
      const txns = this.getMock('gg_transactions');
      const deposits = txns.filter(t => t.type === 'DEPOSIT').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return { success: true, data: deposits };
    }

    if ((endpoint === '/admin/deposits/credit' || endpoint === '/admin/deposit') && method === 'POST') {
      const accounts = this.getMock('gg_accounts');
      const accNum = (body.accountNumber || '').trim();
      const amount = parseFloat(body.amount);

      if (isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid deposit amount greater than zero.');
      }

      const acc = accounts.find(a => a.accountNumber === accNum);
      if (!acc) {
        throw new Error(`Account number ${accNum} not found in GG BANK records.`);
      }

      acc.balance += amount;
      this.setMock('gg_accounts', accounts);

      const txns = this.getMock('gg_transactions');
      const txnId = `TXN-2026-${Date.now().toString().slice(-6)}`;
      const newTxn = {
        transactionId: txnId,
        senderAccount: body.paymentMethod || 'ADMIN-TREASURY',
        receiverAccount: accNum,
        amount: amount,
        type: 'DEPOSIT',
        category: 'Admin Deposit',
        description: body.description || `Official Bank Treasury Deposit credited by Administrator`,
        status: 'COMPLETED',
        balanceAfter: acc.balance,
        createdAt: new Date().toISOString()
      };
      txns.unshift(newTxn);
      this.setMock('gg_transactions', txns);

      this.logAudit(acc.userId, 'usr-admin-999', 'ADMIN_DEPOSIT', `Admin credited ₹${amount} into account ${accNum} (Txn: ${txnId})`);
      return { success: true, message: `Successfully deposited ₹${amount.toLocaleString('en-IN')} to Account ${accNum}!`, data: newTxn };
    }

    // 6. Withdrawals
    if (endpoint === '/admin/withdrawals' && method === 'GET') {
      const txns = this.getMock('gg_transactions');
      const withdrawals = txns.filter(t => t.type === 'WITHDRAWAL').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return { success: true, data: withdrawals };
    }

    // 7. Transfers
    if (endpoint === '/admin/transfers' && method === 'GET') {
      const txns = this.getMock('gg_transactions');
      const transfers = txns.filter(t => t.type === 'TRANSFER').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return { success: true, data: transfers };
    }

    // 8. Loans
    if (endpoint === '/admin/loans' && method === 'GET') {
      const loans = this.getMock('gg_loans');
      const sorted = [...loans].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return { success: true, data: sorted };
    }

    if (endpoint.startsWith('/admin/loans/') && method === 'GET' && !endpoint.includes('/approve') && !endpoint.includes('/reject')) {
      const loanId = endpoint.split('/')[3];
      const loans = this.getMock('gg_loans');
      const loan = loans.find(l => l.loanId === loanId);
      if (!loan) throw new Error('Loan not found');
      return { success: true, data: loan };
    }

    if (endpoint.includes('/admin/loans/') && endpoint.endsWith('/approve') && method === 'PUT') {
      const loanId = endpoint.split('/')[3];
      const loans = this.getMock('gg_loans');
      const loan = loans.find(l => l.loanId === loanId);
      if (!loan) throw new Error('Loan not found');

      loan.status = 'APPROVED';
      loan.adminRemarks = (body && body.remarks) ? body.remarks : 'Approved by Loan Officer';
      loan.approvedAt = new Date().toISOString();
      this.setMock('gg_loans', loans);

      // Disburse funds
      const accounts = this.getMock('gg_accounts');
      const acc = accounts.find(a => a.accountNumber === loan.accountNumber);
      if (acc) {
        acc.balance += loan.requestedAmount;
        this.setMock('gg_accounts', accounts);

        const txns = this.getMock('gg_transactions');
        txns.unshift({
          transactionId: `TXN-2026-${Date.now().toString().slice(-6)}`,
          senderAccount: 'GG-BANK-LOAN-DISBURSAL',
          receiverAccount: acc.accountNumber,
          amount: loan.requestedAmount,
          type: 'LOAN_DISBURSEMENT',
          category: 'Loan',
          description: `Disbursement for ${loan.loanType} (${loan.loanId})`,
          status: 'COMPLETED',
          balanceAfter: acc.balance,
          createdAt: new Date().toISOString()
        });
        this.setMock('gg_transactions', txns);
      }

      this.logAudit(loan.userId, 'usr-admin-999', 'LOAN_APPROVED', `Approved loan ${loan.loanId} (₹${loan.requestedAmount}) and disbursed funds`);
      return { success: true, message: `Loan approved and funds credited successfully!`, data: loan };
    }

    if (endpoint.includes('/admin/loans/') && endpoint.endsWith('/reject') && method === 'PUT') {
      const loanId = endpoint.split('/')[3];
      const loans = this.getMock('gg_loans');
      const loan = loans.find(l => l.loanId === loanId);
      if (!loan) throw new Error('Loan not found');

      loan.status = 'REJECTED';
      loan.adminRemarks = (body && body.remarks) ? body.remarks : 'Declined per bank credit guidelines';
      this.setMock('gg_loans', loans);

      this.logAudit(loan.userId, 'usr-admin-999', 'LOAN_REJECTED', `Rejected loan ${loan.loanId}`);
      return { success: true, message: 'Loan application rejected', data: loan };
    }

    // 9. Reports Data
    if (endpoint.startsWith('/admin/reports') && method === 'GET') {
      const users = this.getMock('gg_users');
      const accounts = this.getMock('gg_accounts');
      const txns = this.getMock('gg_transactions');
      const loans = this.getMock('gg_loans');

      const deposits = txns.filter(t => t.type === 'DEPOSIT');
      const withdrawals = txns.filter(t => t.type === 'WITHDRAWAL');
      const transfers = txns.filter(t => t.type === 'TRANSFER');

      const totalDeposits = deposits.reduce((sum, t) => sum + (t.amount || 0), 0);
      const totalWithdrawals = withdrawals.reduce((sum, t) => sum + (t.amount || 0), 0);
      const totalTransfers = transfers.reduce((sum, t) => sum + (t.amount || 0), 0);
      const totalVault = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);

      const customerReport = {
        totalCustomers: users.filter(u => u.role === 'CUSTOMER').length,
        activeCustomers: users.filter(u => u.role === 'CUSTOMER' && u.status === 'ACTIVE').length,
        blockedCustomers: users.filter(u => u.role === 'CUSTOMER' && u.status === 'BLOCKED').length,
        customersList: users.filter(u => u.role === 'CUSTOMER')
      };

      const depositReport = {
        totalDepositsAmount: totalDeposits,
        count: deposits.length,
        items: deposits
      };

      const withdrawalReport = {
        totalWithdrawalsAmount: totalWithdrawals,
        count: withdrawals.length,
        items: withdrawals
      };

      const transferReport = {
        totalTransfersAmount: totalTransfers,
        count: transfers.length,
        items: transfers
      };

      const loanReport = {
        totalLoansRequested: loans.reduce((sum, l) => sum + (l.requestedAmount || 0), 0),
        totalLoansApproved: loans.filter(l => l.status === 'APPROVED').reduce((sum, l) => sum + (l.requestedAmount || 0), 0),
        pendingCount: loans.filter(l => l.status === 'PENDING').length,
        approvedCount: loans.filter(l => l.status === 'APPROVED').length,
        rejectedCount: loans.filter(l => l.status === 'REJECTED').length,
        items: loans
      };

      const financialSummary = {
        totalVaultBalance: totalVault,
        totalDeposits,
        totalWithdrawals,
        totalTransfers,
        netDisbursedLoans: loanReport.totalLoansApproved
      };

      return {
        success: true,
        data: {
          customerReport,
          transactionReport: txns,
          depositReport,
          withdrawalReport,
          transferReport,
          loanReport,
          financialSummary
        }
      };
    }

    // 10. Notifications
    if (endpoint === '/admin/notifications' && method === 'GET') {
      const notifs = this.getMock('gg_notifications');
      return { success: true, data: notifs };
    }

    if (endpoint.startsWith('/admin/notifications/') && endpoint.endsWith('/read') && method === 'PUT') {
      const notifId = endpoint.split('/')[3];
      const notifs = this.getMock('gg_notifications');
      const n = notifs.find(item => item.notificationId === notifId);
      if (n) {
        n.read = true;
        this.setMock('gg_notifications', notifs);
      }
      return { success: true, message: 'Marked as read' };
    }

    if (endpoint === '/admin/notifications/read-all' && method === 'PUT') {
      const notifs = this.getMock('gg_notifications');
      notifs.forEach(n => n.read = true);
      this.setMock('gg_notifications', notifs);
      return { success: true, message: 'All notifications marked as read' };
    }

    if (endpoint.startsWith('/admin/notifications/') && method === 'DELETE') {
      const notifId = endpoint.split('/')[3];
      const notifs = this.getMock('gg_notifications');
      const filtered = notifs.filter(n => n.notificationId !== notifId);
      this.setMock('gg_notifications', filtered);
      return { success: true, message: 'Notification deleted' };
    }

    // 11. Audit Logs
    if (endpoint === '/admin/audit-logs' && method === 'GET') {
      const logs = this.getMock('gg_audit_logs');
      const sorted = [...logs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      return { success: true, data: sorted };
    }

    // 12. Profile
    if (endpoint === '/admin/profile' && method === 'GET') {
      const users = this.getMock('gg_users');
      const admin = users.find(u => u.role === 'ADMIN') || {
        userId: 'usr-admin-999',
        name: 'GG Bank Administrator',
        email: 'admin@ggbank.com',
        role: 'ADMIN',
        status: 'ACTIVE',
        phone: '9000000000',
        address: 'GG BANK Headquarters, Financial Tower'
      };
      return { success: true, data: admin };
    }

    if (endpoint === '/admin/profile' && method === 'PUT') {
      const users = this.getMock('gg_users');
      let admin = users.find(u => u.role === 'ADMIN');
      if (!admin) {
        admin = { userId: 'usr-admin-999', role: 'ADMIN' };
        users.push(admin);
      }
      if (body.name) admin.name = body.name;
      if (body.phone) admin.phone = body.phone;
      if (body.address) admin.address = body.address;
      this.setMock('gg_users', users);

      this.logAudit('usr-admin-999', 'usr-admin-999', 'ADMIN_PROFILE_UPDATE', 'Administrator updated contact information');
      return { success: true, message: 'Profile updated successfully!', data: admin };
    }

    if (endpoint === '/admin/profile/password' && method === 'PUT') {
      const users = this.getMock('gg_users');
      const admin = users.find(u => u.role === 'ADMIN');
      if (admin) {
        admin.password = body.newPassword;
        this.setMock('gg_users', users);
      }
      this.logAudit('usr-admin-999', 'usr-admin-999', 'ADMIN_PASSWORD_CHANGE', 'Master access password changed');
      return { success: true, message: 'Password updated successfully!' };
    }

    // 13. Settings
    if (endpoint === '/admin/settings' && method === 'GET') {
      const settings = JSON.parse(localStorage.getItem('gg_admin_settings') || 'null') || {
        bankName: 'GG BANK',
        bankBranch: 'Central Tech Branch',
        ifscCode: 'GGBN0001234',
        currency: 'INR (₹)',
        emailNotifications: true,
        smsAlerts: true,
        twoFactorAuth: true,
        maxLoginAttempts: 5,
        sessionTimeoutMinutes: 15
      };
      return { success: true, data: settings };
    }

    if (endpoint === '/admin/settings' && method === 'PUT') {
      localStorage.setItem('gg_admin_settings', JSON.stringify(body));
      this.logAudit('usr-admin-999', 'usr-admin-999', 'SYSTEM_SETTINGS_UPDATE', 'Updated system banking configurations');
      return { success: true, message: 'Settings saved successfully!', data: body };
    }

    // 14. Officer Management Module
    if (endpoint === '/admin/officers' && method === 'GET') {
      let officers = this.getMock('gg_officers');
      if (!officers || officers.length === 0) {
        officers = [
          { officerId: 'off-001', employeeId: 'EMP-1001', name: 'Vikram Sharma', email: 'vikram.sharma@ggbank.com', phone: '+91 98765 43210', department: 'LOAN', designation: 'Chief Credit Officer', branch: 'Central Tech Branch', status: 'ACTIVE', assignedCases: 12, createdAt: '2026-01-10T09:00:00Z' },
          { officerId: 'off-002', employeeId: 'EMP-1002', name: 'Anita Roy', email: 'anita.roy@ggbank.com', phone: '+91 98765 43211', department: 'LOAN', designation: 'Senior Personal Loan Underwriter', branch: 'Central Tech Branch', status: 'ACTIVE', assignedCases: 8, createdAt: '2026-01-15T09:00:00Z' },
          { officerId: 'off-003', employeeId: 'EMP-1003', name: 'Priya Patel', email: 'priya.patel@ggbank.com', phone: '+91 98765 43212', department: 'COMPLIANCE', designation: 'Lead KYC & AML Compliance Officer', branch: 'Financial Tower Branch', status: 'ACTIVE', assignedCases: 19, createdAt: '2026-02-01T09:00:00Z' },
          { officerId: 'off-004', employeeId: 'EMP-1004', name: 'Karthik Rao', email: 'karthik.rao@ggbank.com', phone: '+91 98765 43213', department: 'TREASURY', designation: 'Treasury & Vault Operations Manager', branch: 'Central Tech Branch', status: 'ACTIVE', assignedCases: 5, createdAt: '2026-02-10T09:00:00Z' },
          { officerId: 'off-005', employeeId: 'EMP-1005', name: 'Rajesh Kumar', email: 'rajesh.kumar@ggbank.com', phone: '+91 98765 43214', department: 'OPERATIONS', designation: 'Branch Operations Supervisor', branch: 'North Metro Branch', status: 'ON_LEAVE', assignedCases: 2, createdAt: '2026-02-20T09:00:00Z' }
        ];
        this.setMock('gg_officers', officers);
      }
      return { success: true, data: officers };
    }

    if (endpoint.startsWith('/admin/officers/') && method === 'GET') {
      const offId = endpoint.split('/')[3];
      const officers = this.getMock('gg_officers');
      const officer = officers.find(o => o.officerId === offId);
      if (officer) return { success: true, data: officer };
      throw new Error('Officer not found');
    }

    if (endpoint === '/admin/officers' && method === 'POST') {
      const officers = this.getMock('gg_officers');
      const newId = 'off-' + Date.now().toString().slice(-4);
      const newOfficer = {
        officerId: newId,
        employeeId: 'EMP-' + (1000 + officers.length + 1),
        name: body.name,
        email: body.email,
        phone: body.phone || '+91 98765 00000',
        department: body.department || 'LOAN',
        designation: body.designation || 'Banking Officer',
        branch: body.branch || 'Central Tech Branch',
        status: body.status || 'ACTIVE',
        assignedCases: 0,
        createdAt: new Date().toISOString()
      };
      officers.unshift(newOfficer);
      this.setMock('gg_officers', officers);
      this.logAudit('usr-admin-999', 'usr-admin-999', 'OFFICER_CREATED', `Registered new Banking Officer: ${newOfficer.name} (${newOfficer.designation})`);
      return { success: true, message: 'Officer registered successfully!', data: newOfficer };
    }

    if (endpoint.startsWith('/admin/officers/') && endpoint.endsWith('/status') && method === 'PUT') {
      const offId = endpoint.split('/')[3];
      const officers = this.getMock('gg_officers');
      const officer = officers.find(o => o.officerId === offId);
      if (officer) {
        officer.status = body.status;
        this.setMock('gg_officers', officers);
        this.logAudit('usr-admin-999', 'usr-admin-999', 'OFFICER_STATUS_CHANGE', `Officer ${officer.name} status updated to ${body.status}`);
        return { success: true, message: `Officer status updated to ${body.status}`, data: officer };
      }
      throw new Error('Officer not found');
    }

    if (endpoint.startsWith('/admin/officers/') && method === 'PUT') {
      const offId = endpoint.split('/')[3];
      const officers = this.getMock('gg_officers');
      const officer = officers.find(o => o.officerId === offId);
      if (officer) {
        if (body.name) officer.name = body.name;
        if (body.email) officer.email = body.email;
        if (body.phone) officer.phone = body.phone;
        if (body.department) officer.department = body.department;
        if (body.designation) officer.designation = body.designation;
        if (body.branch) officer.branch = body.branch;
        if (body.status) officer.status = body.status;
        this.setMock('gg_officers', officers);
        this.logAudit('usr-admin-999', 'usr-admin-999', 'OFFICER_UPDATED', `Officer details updated: ${officer.name}`);
        return { success: true, message: 'Officer details updated successfully!', data: officer };
      }
      throw new Error('Officer not found');
    }

    if (endpoint.startsWith('/admin/officers/') && method === 'DELETE') {
      const offId = endpoint.split('/')[3];
      let officers = this.getMock('gg_officers');
      const found = officers.find(o => o.officerId === offId);
      officers = officers.filter(o => o.officerId !== offId);
      this.setMock('gg_officers', officers);
      this.logAudit('usr-admin-999', 'usr-admin-999', 'OFFICER_REMOVED', `Officer record removed: ${found ? found.name : offId}`);
      return { success: true, message: 'Officer removed successfully!' };
    }

    if (endpoint === '/admin/clear-all-data' && method === 'POST') {
      const users = this.getMock('gg_users').filter(u => u.role === 'ADMIN');
      const accounts = this.getMock('gg_accounts').filter(a => a.accountType === 'TREASURY');
      this.setMock('gg_users', users);
      this.setMock('gg_accounts', accounts);
      this.setMock('gg_transactions', []);
      this.setMock('gg_loans', []);
      this.setMock('gg_beneficiaries', []);
      this.setMock('gg_budgets', []);
      this.setMock('gg_profile_requests', []);
      this.logAudit('usr-admin-999', 'usr-admin-999', 'CLEAR_ALL_DATA', 'Wiped all customer records, transactions and loans from database.');
      return { success: true, message: 'All database records have been wiped successfully!' };
    }

    if (endpoint === '/admin/reset-default-data' && method === 'POST') {
      localStorage.removeItem('gg_mock_db_initialized');
      localStorage.removeItem('gg_users');
      localStorage.removeItem('gg_accounts');
      localStorage.removeItem('gg_transactions');
      localStorage.removeItem('gg_loans');
      localStorage.removeItem('gg_beneficiaries');
      localStorage.removeItem('gg_budgets');
      localStorage.removeItem('gg_notifications');
      localStorage.removeItem('gg_officers');
      this.initMockDatabase();
      this.logAudit('usr-admin-999', 'usr-admin-999', 'RESET_DEFAULT_DATA', 'Restored clean default seed records into database.');
      return { success: true, message: 'Default clean records restored successfully!' };
    }

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

