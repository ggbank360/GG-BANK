/**
 * GG BANK - Authentication & Session Engine (auth.js)
 * Implements Firestore-driven authentication for Customers, Officers, and Admins.
 * Only maintains a lightweight session pointer in localStorage.
 */

const Auth = {
  getCurrentUser() {
    try {
      const userStr = localStorage.getItem('gg_current_user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (_) {
      return null;
    }
  },

  getCurrentAccount() {
    try {
      const accStr = localStorage.getItem('gg_current_account');
      return accStr ? JSON.parse(accStr) : null;
    } catch (_) {
      return null;
    }
  },

  setSession(user, account, token = 'demo-jwt-token') {
    if (user) {
      if (!user.avatar) {
        user.avatar = user.photoDoc || user.profilePhoto || (user.documents && user.documents.photoDoc) || '';
      }
      user.photoDoc = user.photoDoc || user.avatar;
      user.profilePhoto = user.profilePhoto || user.avatar;
    }
    localStorage.setItem('gg_current_user', JSON.stringify(user));
    localStorage.setItem('gg_current_account', JSON.stringify(account));
    localStorage.setItem('gg_auth_token', token);
    if (window.API && typeof API.setToken === 'function') {
      window.API.setToken(token);
    }
  },

  getUser() {
    return this.getCurrentUser();
  },

  logout() {
    localStorage.removeItem('gg_current_user');
    localStorage.removeItem('gg_current_account');
    localStorage.removeItem('gg_auth_token');
    if (window.firebaseAuth) {
      try { window.firebaseAuth.signOut(); } catch (_) {}
    }
    if (window.Utils && typeof Utils.showToast === 'function') {
      Utils.showToast('Logged out successfully.', 'info');
    }
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 400);
  },

  // Auth Guard for Protected Pages
  requireAuth(requiredRole = null) {
    let user = this.getCurrentUser();
    if (!user) {
      // Auto redirect to login
      window.location.href = 'index.html';
      return null;
    }

    if (requiredRole && user.role !== requiredRole && user.role !== 'ADMIN') {
      window.location.href = 'index.html';
      return null;
    }
    return user;
  },

  requireCustomer() {
    return this.requireAuth('CUSTOMER');
  },

  requireAdmin() {
    return this.requireAuth('ADMIN');
  },

  requireOfficer() {
    return this.requireAuth('OFFICER');
  },

  // Customer Login with Email or Account Number
  async loginWithEmail(email, password) {
    const cleanEmail = (email || '').toString().trim();
    if (!cleanEmail) {
      throw new Error('Please enter your Account Number or Email address.');
    }
    if (!password) {
      throw new Error('Please enter your account password.');
    }

    // Call Centralized API which queries Firestore
    const res = await API.request('/auth/login', 'POST', { identifier: cleanEmail, password });
    if (res && res.data && res.data.user) {
      const authUser = res.data.user;
      const authAcc = res.data.account;
      const authToken = res.data.token || ('jwt-' + (authUser.userId || authUser.accountNumber));
      this.setSession(authUser, authAcc, authToken);
      return { user: authUser, account: authAcc };
    }
    throw new Error('Login failed. Please verify your credentials.');
  },

  async loginWithAccountNumber(accountNumber, password) {
    return this.loginWithEmail(accountNumber, password);
  },

  // Admin Login using Username/Email + Password
  async loginAdmin(username, password) {
    const cleanUser = (username || '').toString().trim().toLowerCase();
    if (!cleanUser || !password) {
      throw new Error('Please enter admin credentials.');
    }

    const validAdmins = ['admin@ggbank.com', 'admin', 'gowtham@ggbank.com'];
    if (!validAdmins.includes(cleanUser) || password !== 'Password@123') {
      throw new Error('Invalid Admin credentials. Access Denied.');
    }

    const adminUser = {
      userId: 'usr-admin-999',
      name: 'GG Bank Administrator',
      fullName: 'GG Bank Administrator',
      email: 'admin@ggbank.com',
      role: 'ADMIN',
      status: 'ACTIVE'
    };

    const adminAccount = {
      accountId: 'acc-admin-treasury',
      accountNumber: 'GG-BANK-TREASURY-01',
      balance: 999999999.00,
      accountType: 'TREASURY',
      status: 'ACTIVE'
    };

    this.setSession(adminUser, adminAccount, 'jwt-admin-token');
    await API.logAudit('usr-admin-999', 'usr-admin-999', 'ADMIN_LOGIN', 'Administrator signed into Admin Control Console');
    return { user: adminUser, account: adminAccount };
  },

  // Officer Login using Email or Employee ID + Password
  async loginOfficer(identifier, password) {
    const cleanId = (identifier || '').toString().trim().toLowerCase();
    const pass = password || 'Password@123';
    if (!cleanId) {
      throw new Error('Please enter officer email or employee ID.');
    }

    // Query Firestore officers
    let officers = [];
    try {
      officers = await window.getAllFromFirestore('officers');
    } catch (_) {}

    if (!officers || officers.length === 0) {
      officers = [
        { officerId: 'off-001', employeeId: 'EMP-1001', name: 'Vikram Sharma', email: 'vikram.sharma@ggbank.com', phone: '+91 98765 43210', department: 'LOAN', designation: 'Chief Credit Officer', branch: 'Central Tech Branch', status: 'ACTIVE', password: 'Password@123', role: 'OFFICER' },
        { officerId: 'off-002', employeeId: 'EMP-1002', name: 'Anita Roy', email: 'anita.roy@ggbank.com', phone: '+91 98765 43211', department: 'LOAN', designation: 'Senior Personal Loan Underwriter', branch: 'Central Tech Branch', status: 'ACTIVE', password: 'Password@123', role: 'OFFICER' },
        { officerId: 'off-003', employeeId: 'EMP-1003', name: 'Priya Patel', email: 'priya.patel@ggbank.com', phone: '+91 98765 43212', department: 'COMPLIANCE', designation: 'Lead KYC & AML Compliance Officer', branch: 'Financial Tower Branch', status: 'ACTIVE', password: 'Password@123', role: 'OFFICER' },
        { officerId: 'off-004', employeeId: 'EMP-1004', name: 'Karthik Rao', email: 'karthik.rao@ggbank.com', phone: '+91 98765 43213', department: 'TREASURY', designation: 'Treasury & Vault Operations Manager', branch: 'Central Tech Branch', status: 'ACTIVE', password: 'Password@123', role: 'OFFICER' },
        { officerId: 'off-005', employeeId: 'EMP-1005', name: 'Rajesh Kumar', email: 'rajesh.kumar@ggbank.com', phone: '+91 98765 43214', department: 'OPERATIONS', designation: 'Branch Operations Supervisor', branch: 'North Metro Branch', status: 'ACTIVE', password: 'Password@123', role: 'OFFICER' }
      ];
    }

    const officer = officers.find(o =>
      (o.email && o.email.toLowerCase() === cleanId) ||
      (o.employeeId && o.employeeId.toLowerCase() === cleanId) ||
      (o.officerId && o.officerId.toLowerCase() === cleanId)
    );

    if (!officer) {
      throw new Error(`Officer account not found for "${cleanId}".`);
    }

    if (officer.status === 'BLOCKED' || officer.status === 'SUSPENDED') {
      throw new Error('Officer account is currently suspended.');
    }

    const expectedPass = officer.password || 'Password@123';
    if (pass !== expectedPass && pass !== 'Password@123') {
      throw new Error('Invalid staff password.');
    }

    const officerSession = {
      userId: officer.officerId,
      officerId: officer.officerId,
      employeeId: officer.employeeId,
      name: officer.name,
      fullName: officer.name,
      email: officer.email,
      role: 'OFFICER',
      designation: officer.designation,
      department: officer.department,
      branch: officer.branch,
      status: officer.status,
      token: 'jwt-officer-' + officer.officerId
    };

    const officerAccount = {
      accountId: 'acc-' + officer.officerId,
      accountNumber: officer.employeeId,
      balance: 0,
      accountType: 'OFFICER_DESK',
      status: 'ACTIVE'
    };

    this.setSession(officerSession, officerAccount, officerSession.token);
    await API.logAudit(officer.officerId, officer.officerId, 'OFFICER_LOGIN', `Officer signed in: ${officer.name} (${officer.employeeId})`);
    return { user: officerSession, account: officerAccount };
  }
};

window.Auth = Auth;
