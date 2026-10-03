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

    // Check Live Firestore if active
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

    // Check Local Database Engine
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

  // Legacy / Direct Account Number Login Support
  async loginWithAccountNumber(accountNumber, password) {
    const rawInput = (accountNumber || '').toString().trim().replace(/\D/g, '');
    if (rawInput.length !== 12) {
      throw new Error('Please enter a valid 12-digit account number.');
    }
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
};

window.Auth = Auth;
