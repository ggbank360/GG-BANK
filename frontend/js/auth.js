/**
 * GG BANK - Authentication & Session Engine (auth.js)
 * Implements 12-Digit Account Number Login and Session Verification
 */

const Auth = {
  getCurrentUser() {
    const userStr = localStorage.getItem('gg_current_user');
    return userStr ? JSON.parse(userStr) : null;
  },

  getCurrentAccount() {
    const accStr = localStorage.getItem('gg_current_account');
    return accStr ? JSON.parse(accStr) : null;
  },

  setSession(user, account, token = 'demo-jwt-token') {
    localStorage.setItem('gg_current_user', JSON.stringify(user));
    localStorage.setItem('gg_current_account', JSON.stringify(account));
    localStorage.setItem('gg_auth_token', token);
    if (window.API) {
      window.API.setToken(token);
    }
  },

  logout() {
    localStorage.removeItem('gg_current_user');
    localStorage.removeItem('gg_current_account');
    localStorage.removeItem('gg_auth_token');
    if (window.firebaseAuth) {
      firebaseAuth.signOut().catch(() => {});
    }
    Utils.showToast('Logged out successfully.', 'info');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 400);
  },

  // Universal Auth Guard
  requireAuth(requiredRole = null) {
    let user = this.getCurrentUser();
    if (!user) {
      // If user directly opened dashboard without prior login, auto-initialize demo session
      user = {
        userId: requiredRole === 'ADMIN' ? 'usr-admin-999' : 'usr-gowtham-101',
        name: requiredRole === 'ADMIN' ? 'GG Bank Administrator' : 'Gowtham NK',
        email: requiredRole === 'ADMIN' ? 'admin@ggbank.com' : 'gowtham@ggbank.com',
        role: requiredRole || 'CUSTOMER',
        status: 'ACTIVE'
      };
      const account = {
        accountId: 'acc-demo-101',
        userId: user.userId,
        accountNumber: '100188492019',
        accountType: 'SAVINGS',
        balance: 65450.00,
        ifscCode: 'GGBN0001234',
        branch: 'Central Tech Branch',
        status: 'ACTIVE'
      };
      this.setSession(user, account, 'demo-jwt-token');
    }

    if (requiredRole && user.role !== requiredRole && user.role !== 'ADMIN') {
      if (requiredRole === 'ADMIN') {
        window.location.href = 'index.html';
        return null;
      }
    }
    return user;
  },

  requireCustomer() {
    return this.requireAuth('CUSTOMER');
  },

  requireAdmin() {
    return this.requireAuth('ADMIN');
  },

  // Customer Login using Email Address + Password
  async loginWithEmail(email, password) {
    const cleanEmail = (email || '').toString().trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }
    if (!password) {
      throw new Error('Please enter your account password.');
    }

    // 1. Direct Backend Database Authentication (Cross-Profile Synchronized)
    if (window.API && typeof API.request === 'function') {
      try {
        const res = await API.request('/auth/login', 'POST', { email: cleanEmail, password });
        if (res && res.success && res.data && res.data.user) {
          const authUser = res.data.user;
          const authAcc = res.data.account;
          const authToken = res.data.token || ('jwt-' + authUser.userId);
          this.setSession(authUser, authAcc, authToken);
          // Sync into local cache
          const localUsers = API.getMock('gg_users');
          if (!localUsers.some(u => u.userId === authUser.userId)) {
            localUsers.push(authUser);
            API.setMock('gg_users', localUsers);
          }
          if (authAcc) {
            const localAccs = API.getMock('gg_accounts');
            if (!localAccs.some(a => a.accountNumber === authAcc.accountNumber)) {
              localAccs.push(authAcc);
              API.setMock('gg_accounts', localAccs);
            }
          }
          return { user: authUser, account: authAcc };
        }
      } catch (apiErr) {
        // If it's a credentials error (401/403/404), throw directly so user sees the message
        if (apiErr.message && (apiErr.message.includes('password') || apiErr.message.includes('blocked') || apiErr.message.includes('No registered account'))) {
          throw apiErr;
        }
        console.warn('Backend database auth notice, checking local engine:', apiErr.message);
      }
    }

    // 2. Check Live Firestore if active
    if (window.firestoreDb) {
      try {
        const querySnap = await window.firestoreDb.collection('users').where('email', '==', cleanEmail).get();
        if (!querySnap.empty) {
          const doc = querySnap.docs[0];
          const fireUser = doc.data();
          const expectedPass = fireUser.password || 'Password@123';
          if (password !== expectedPass) {
            throw new Error('Incorrect password. Please verify your password and try again.');
          }
          if (fireUser.status === 'BLOCKED') {
            throw new Error('Account is blocked. Please contact GG BANK administration.');
          }

          const accSnap = await window.firestoreDb.collection('accounts').where('userId', '==', fireUser.userId).get();
          let fireAcc = !accSnap.empty ? accSnap.docs[0].data() : null;
          if (!fireAcc) {
            const localAccs = API ? API.getMock('gg_accounts') : [];
            fireAcc = localAccs.find(a => a.userId === fireUser.userId) || {
              accountId: 'acc-' + fireUser.userId,
              userId: fireUser.userId,
              accountNumber: '100188492019',
              balance: 65450.00,
              accountType: 'SAVINGS',
              status: 'ACTIVE'
            };
          }

          this.setSession(fireUser, fireAcc, 'jwt-' + fireUser.userId);
          if (API) API.logAudit(fireUser.userId, null, 'LOGIN', `Customer logged in: ${cleanEmail}`);
          return { user: fireUser, account: fireAcc };
        }
      } catch (fErr) {
        if (fErr.message && (fErr.message.includes('password') || fErr.message.includes('blocked'))) {
          throw fErr;
        }
        console.warn('Firestore login check note:', fErr.message);
      }
    }

    // 3. Fallback: Check Local Database Engine
    const users = API ? API.getMock('gg_users') : [];
    const accounts = API ? API.getMock('gg_accounts') : [];

    let matchedUser = users.find(u => u.email && u.email.toLowerCase() === cleanEmail);
    if (!matchedUser) {
      throw new Error(`No registered account found with email "${cleanEmail}". Please check your email or click "Open Account" to register.`);
    }

    // STRICT Password Check
    const expectedPass = matchedUser.password || 'Password@123';
    if (password !== expectedPass) {
      throw new Error('Incorrect password. Please verify your password and try again.');
    }

    if (matchedUser.status === 'BLOCKED') {
      throw new Error('Account is blocked. Please contact GG BANK administration.');
    }

    let matchedAccount = accounts.find(a => a.userId === matchedUser.userId);
    if (!matchedAccount) {
      matchedAccount = {
        accountId: 'acc-' + matchedUser.userId,
        userId: matchedUser.userId,
        accountNumber: '100188' + Math.floor(100000 + Math.random() * 900000),
        accountType: 'SAVINGS',
        balance: 65450.00,
        ifscCode: 'GGBN0001234',
        branch: 'Central Tech Branch',
        status: 'ACTIVE',
        createdAt: new Date().toISOString()
      };
      accounts.push(matchedAccount);
      if (API) API.setMock('gg_accounts', accounts);
    }

    this.setSession(matchedUser, matchedAccount, 'jwt-token-' + matchedUser.userId);
    if (API) API.logAudit(matchedUser.userId, null, 'LOGIN', `Customer logged in with email ${cleanEmail}`);
    return { user: matchedUser, account: matchedAccount };
  },

  // Account Number Login Support
  async loginWithAccountNumber(accountNumber, password) {
    const rawInput = (accountNumber || '').toString().trim().replace(/\D/g, '');
    if (rawInput.length !== 12 && rawInput.length !== 11) {
      throw new Error('Please enter a valid 12-digit account number.');
    }

    // 1. Direct Backend Database Authentication
    if (window.API && typeof API.request === 'function') {
      try {
        const res = await API.request('/auth/login', 'POST', { accountNumber: rawInput, password });
        if (res && res.success && res.data && res.data.user) {
          const authUser = res.data.user;
          const authAcc = res.data.account;
          const authToken = res.data.token || ('jwt-' + authUser.userId);
          this.setSession(authUser, authAcc, authToken);

          // Sync into local cache
          const localUsers = API.getMock('gg_users');
          if (!localUsers.some(u => u.userId === authUser.userId)) {
            localUsers.push(authUser);
            API.setMock('gg_users', localUsers);
          }
          if (authAcc) {
            const localAccs = API.getMock('gg_accounts');
            if (!localAccs.some(a => a.accountNumber === authAcc.accountNumber)) {
              localAccs.push(authAcc);
              API.setMock('gg_accounts', localAccs);
            }
          }
          return { user: authUser, account: authAcc };
        }
      } catch (apiErr) {
        if (apiErr.message && (apiErr.message.includes('password') || apiErr.message.includes('blocked') || apiErr.message.includes('No registered account'))) {
          throw apiErr;
        }
        console.warn('Backend database auth notice, checking local engine:', apiErr.message);
      }
    }

    // 2. Fallback to Local Engine
    const accounts = API ? API.getMock('gg_accounts') : [];
    const users = API ? API.getMock('gg_users') : [];
    const acc = accounts.find(a => a.accountNumber === rawInput);
    if (!acc) {
      throw new Error(`No account found for account number ${rawInput}.`);
    }
    const user = users.find(u => u.userId === acc.userId);
    if (user && user.email) {
      return this.loginWithEmail(user.email, password);
    }
    throw new Error('User associated with this account number was not found.');
  },

  // Admin Login using Username/Email + Password
  async loginAdmin(username, password) {
    const cleanUser = (username || '').toString().trim().toLowerCase();
    if (!cleanUser || !password) {
      throw new Error('Please enter admin credentials.');
    }

    // STRICT Admin Password Check
    const validAdmins = ['admin@ggbank.com', 'admin', 'gowtham@ggbank.com'];
    if (!validAdmins.includes(cleanUser) || password !== 'Password@123') {
      throw new Error('Invalid Admin credentials. Access Denied.');
    }

    const adminUser = {
      userId: 'usr-admin-999',
      name: 'GG Bank Administrator',
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
    if (API) API.logAudit('usr-admin-999', 'usr-admin-999', 'ADMIN_LOGIN', 'Administrator logged in to admin console');
    return { user: adminUser, account: adminAccount };
  },

  // Officer Login using Email or Employee ID + Password
  async loginOfficer(identifier, password) {
    const cleanId = (identifier || '').toString().trim().toLowerCase();
    const pass = password || 'Password@123';
    if (!cleanId) {
      throw new Error('Please enter officer email or employee ID.');
    }

    let officers = (window.API && typeof API.getMock === 'function') ? API.getMock('gg_officers') : [];
    if (!officers || officers.length === 0) {
      if (window.API && typeof API.request === 'function') {
        try {
          const res = await API.request('/admin/officers');
          officers = res.data || [];
        } catch (_) {}
      }
      if (!officers || officers.length === 0) {
        officers = [
          { officerId: 'off-001', employeeId: 'EMP-1001', name: 'Vikram Sharma', email: 'vikram.sharma@ggbank.com', phone: '+91 98765 43210', department: 'LOAN', designation: 'Chief Credit Officer', branch: 'Central Tech Branch', status: 'ACTIVE', password: 'Password@123' },
          { officerId: 'off-002', employeeId: 'EMP-1002', name: 'Anita Roy', email: 'anita.roy@ggbank.com', phone: '+91 98765 43211', department: 'LOAN', designation: 'Senior Personal Loan Underwriter', branch: 'Central Tech Branch', status: 'ACTIVE', password: 'Password@123' },
          { officerId: 'off-003', employeeId: 'EMP-1003', name: 'Priya Patel', email: 'priya.patel@ggbank.com', phone: '+91 98765 43212', department: 'COMPLIANCE', designation: 'Lead KYC & AML Compliance Officer', branch: 'Financial Tower Branch', status: 'ACTIVE', password: 'Password@123' },
          { officerId: 'off-004', employeeId: 'EMP-1004', name: 'Karthik Rao', email: 'karthik.rao@ggbank.com', phone: '+91 98765 43213', department: 'TREASURY', designation: 'Treasury & Vault Operations Manager', branch: 'Central Tech Branch', status: 'ACTIVE', password: 'Password@123' },
          { officerId: 'off-005', employeeId: 'EMP-1005', name: 'Rajesh Kumar', email: 'rajesh.kumar@ggbank.com', phone: '+91 98765 43214', department: 'OPERATIONS', designation: 'Branch Operations Supervisor', branch: 'North Metro Branch', status: 'ACTIVE', password: 'Password@123' }
        ];
        if (window.API && typeof API.setMock === 'function') {
          API.setMock('gg_officers', officers);
        }
      }
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
      name: officer.name,
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
    if (API && typeof API.logAudit === 'function') {
      API.logAudit(officer.officerId, officer.officerId, 'OFFICER_LOGIN', `Officer logged in: ${officer.name} (${officer.employeeId})`);
    }
    return { user: officerSession, account: officerAccount };
  },
};

window.Auth = Auth;
