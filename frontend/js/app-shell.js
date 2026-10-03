/**
 * GG BANK - Universal Application Shell Engine (app-shell.js)
 * "Secure Banking. Smarter Future."
 * Provides unified desktop/mobile navigation, global search, notification center syncing,
 * accessible focus, theme persistence, and modal controls across all GG Bank pages.
 */

const AppShell = {
  init() {
    this.ensureSession();
    this.enhanceNavigation();
    this.initGlobalSearch();
    this.initMobileBottomNav();
    this.initNotificationsBadge();
    this.initThemeToggle();
    this.initKeyboardShortcuts();
  },

  ensureSession() {
    // If auth helper is present, verify/normalize current user & account
    if (window.Auth) {
      const user = Auth.getCurrentUser();
      if (user) {
        document.querySelectorAll('.customer-name-display').forEach(el => el.textContent = user.name || 'Customer');
        document.querySelectorAll('.customer-email-display').forEach(el => el.textContent = user.email || '');
        const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'CU';
        document.querySelectorAll('.customer-avatar-display').forEach(el => el.textContent = initials);
      }
    }
  },

  enhanceNavigation() {
    const rawPath = window.location.pathname.split('/').pop() || 'dashboard.html';
    const currentPath = (rawPath.split('?')[0].split('#')[0] || 'dashboard.html').toLowerCase();
    const isDashboard = currentPath === '' || currentPath === 'dashboard.html' || currentPath === 'index.html';

    // Highlight active link in sidebar (cleanly clear all items first to avoid duplicate active items)
    document.querySelectorAll('.sidebar .nav-menu .nav-item, .sidebar .nav-list .nav-item').forEach(item => {
      const link = item.querySelector('a');
      if (!link) return;
      item.classList.remove('active');
      link.classList.remove('active');

      const href = link.getAttribute('href');
      if (href) {
        const cleanHref = (href.split('?')[0].split('#')[0] || '').toLowerCase();
        if ((isDashboard && cleanHref === 'dashboard.html') || (!isDashboard && cleanHref === currentPath)) {
          item.classList.add('active');
          link.classList.add('active');
        }
      }
    });

    // Auto-close sidebar on mobile when any navigation link is touched/clicked
    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
      link.addEventListener('click', () => {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) sidebar.classList.remove('mobile-open');
      });
    });

    // Mobile sidebar toggle handler
    const mobileBtn = document.getElementById('mobileMenuBtn') || document.querySelector('.mobile-menu-btn');
    const sidebar = document.querySelector('.sidebar');
    if (mobileBtn && sidebar) {
      mobileBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        sidebar.classList.toggle('mobile-open');
      };
      // Close on outside click
      document.addEventListener('click', (e) => {
        if (sidebar.classList.contains('mobile-open') && !sidebar.contains(e.target) && !mobileBtn.contains(e.target)) {
          sidebar.classList.remove('mobile-open');
        }
      });
    }
  },

  initGlobalSearch() {
    // Inject search bar into topbar if missing
    const topbar = document.querySelector('.topbar');
    if (!topbar) return;

    let searchContainer = topbar.querySelector('.topbar-search-container');
    if (!searchContainer) {
      searchContainer = document.createElement('div');
      searchContainer.className = 'topbar-search-container';
      searchContainer.innerHTML = `
        <i class="fa-solid fa-magnifying-glass topbar-search-icon"></i>
        <input type="search" id="globalSearchInput" class="topbar-search-input" placeholder="Search transactions, bills, loans, payees... (/)" autocomplete="off" aria-label="Global search">
        <span class="topbar-search-shortcut">/</span>
        <div id="searchResultsDropdown" class="search-results-dropdown" role="listbox"></div>
      `;
      const leftCol = topbar.querySelector('.topbar-left');
      if (leftCol && leftCol.nextSibling) {
        topbar.insertBefore(searchContainer, leftCol.nextSibling);
      } else {
        topbar.appendChild(searchContainer);
      }
    }

    const input = document.getElementById('globalSearchInput');
    const dropdown = document.getElementById('searchResultsDropdown');
    if (!input || !dropdown) return;

    input.addEventListener('input', (e) => {
      const query = e.target.value.trim().toLowerCase();
      if (!query || query.length < 2) {
        dropdown.classList.remove('active');
        dropdown.innerHTML = '';
        return;
      }
      this.executeGlobalSearch(query, dropdown);
    });

    input.addEventListener('focus', () => {
      if (input.value.trim().length >= 2) dropdown.classList.add('active');
    });

    document.addEventListener('click', (e) => {
      if (!searchContainer.contains(e.target)) {
        dropdown.classList.remove('active');
      }
    });
  },

  async executeGlobalSearch(query, dropdown) {
    const results = {
      pages: [],
      transactions: [],
      beneficiaries: [],
      bills: [],
      loans: []
    };

    // 1. Pages Search
    const pagesIndex = [
      { title: 'Dashboard', desc: 'Accounts overview, balances & recent activity', url: 'dashboard.html', icon: 'fa-house' },
      { title: 'My Accounts', desc: '11-digit account directory, KYC & status', url: 'accounts.html', icon: 'fa-id-card' },
      { title: 'Fund Transfer', desc: 'Instant money transfer with IFSC verification', url: 'transfer.html', icon: 'fa-paper-plane' },
      { title: 'Scan & Pay (QR Banking)', desc: 'Camera QR scanner, My QR receiver & verified receipts', url: 'qr-pay.html', icon: 'fa-qrcode' },
      { title: 'Bill Payments', desc: 'Electricity, Water, Mobile, Internet & Gas utilities', url: 'bill-payments.html', icon: 'fa-receipt' },
      { title: 'Saved Beneficiaries', desc: 'Manage verified payees and bank accounts', url: 'beneficiaries.html', icon: 'fa-users' },
      { title: 'Transaction Ledger', desc: 'Complete history, filters & PDF statements', url: 'transactions.html', icon: 'fa-list-check' },
      { title: 'Monthly Budget', desc: 'Category-wise spending limits & tracking', url: 'budget.html', icon: 'fa-wallet' },
      { title: 'Financial Insights', desc: 'Smart analytics, spending breakdown & trend charts', url: 'financial-insights.html', icon: 'fa-chart-pie' },
      { title: 'Loans & EMI', desc: 'Apply for personal/home loans & calculate EMI', url: 'loans.html', icon: 'fa-hand-holding-dollar' },
      { title: 'Notification Center', desc: 'Security, transaction & banking alerts', url: 'notifications.html', icon: 'fa-bell' },
      { title: 'Security Center', desc: '2FA authentication, sessions & password', url: 'security.html', icon: 'fa-shield-halved' },
      { title: 'User Profile', desc: 'Personal information, address & documents', url: 'profile.html', icon: 'fa-user-gear' }
    ];

    pagesIndex.forEach(p => {
      if (p.title.toLowerCase().includes(query) || p.desc.toLowerCase().includes(query)) {
        results.pages.push(p);
      }
    });

    // 2. Transactions Search
    const txns = window.API ? (window.API.getMock('gg_transactions') || []) : [];
    txns.forEach(t => {
      const matchDesc = (t.description || '').toLowerCase().includes(query);
      const matchCat = (t.category || '').toLowerCase().includes(query);
      const matchType = (t.type || '').toLowerCase().includes(query);
      const matchId = (t.transactionId || '').toLowerCase().includes(query);
      const matchSender = (t.senderAccount || '').toLowerCase().includes(query);
      const matchReceiver = (t.receiverAccount || '').toLowerCase().includes(query);

      if (matchDesc || matchCat || matchType || matchId || matchSender || matchReceiver) {
        results.transactions.push(t);
      }
    });

    // 3. Beneficiaries Search
    const beneficiaries = window.API ? (window.API.getMock('gg_beneficiaries') || []) : [];
    beneficiaries.forEach(b => {
      if ((b.name || '').toLowerCase().includes(query) || (b.accountNumber || '').includes(query)) {
        results.beneficiaries.push(b);
      }
    });

    // 4. Bills Search
    const billPresets = [
      { name: 'BESCOM Electricity Bill', category: 'Electricity', icon: 'fa-bolt', url: 'bill-payments.html' },
      { name: 'BWSSB Water Supply', category: 'Water', icon: 'fa-faucet-drip', url: 'bill-payments.html' },
      { name: 'ACT Fibernet Broadband', category: 'Internet', icon: 'fa-wifi', url: 'bill-payments.html' },
      { name: 'Airtel Postpaid Mobile', category: 'Mobile', icon: 'fa-mobile-screen-button', url: 'bill-payments.html' },
      { name: 'Indane Piped Gas', category: 'Gas', icon: 'fa-fire-burner', url: 'bill-payments.html' }
    ];
    billPresets.forEach(b => {
      if (b.name.toLowerCase().includes(query) || b.category.toLowerCase().includes(query)) {
        results.bills.push(b);
      }
    });

    // 5. Loans Search
    const loans = window.API ? (window.API.getMock('gg_loans') || []) : [];
    loans.forEach(l => {
      if ((l.loanType || '').toLowerCase().includes(query) || (l.purpose || '').toLowerCase().includes(query) || (l.loanId || '').toLowerCase().includes(query)) {
        results.loans.push(l);
      }
    });

    // Render Dropdown Content
    let html = '';
    let totalMatches = results.pages.length + results.transactions.length + results.beneficiaries.length + results.bills.length + results.loans.length;

    if (totalMatches === 0) {
      dropdown.innerHTML = `
        <div style="padding: 24px 16px; text-align: center; color: var(--text-muted);">
          <i class="fa-solid fa-magnifying-glass" style="font-size: 1.5rem; margin-bottom: 8px; opacity: 0.5;"></i>
          <div style="font-size: 0.9rem; font-weight: 600; color: var(--text-secondary);">No results found for "${query}"</div>
          <div style="font-size: 0.78rem; margin-top: 4px;">Try searching for electricity, salary, transfer, loans, or profile</div>
        </div>
      `;
      dropdown.classList.add('active');
      return;
    }

    if (results.pages.length > 0) {
      html += `<div class="search-group-title"><i class="fa-solid fa-compass"></i> Navigation Pages</div>`;
      results.pages.slice(0, 4).forEach(p => {
        html += `
          <a href="${p.url}" class="search-result-item">
            <div class="search-result-icon"><i class="fa-solid ${p.icon}"></i></div>
            <div class="search-result-info">
              <div class="search-result-primary">${p.title}</div>
              <div class="search-result-secondary">${p.desc}</div>
            </div>
            <i class="fa-solid fa-chevron-right" style="color: var(--text-muted); font-size: 0.75rem;"></i>
          </a>
        `;
      });
    }

    if (results.transactions.length > 0) {
      html += `<div class="search-group-title"><i class="fa-solid fa-clock-rotate-left"></i> Transactions</div>`;
      results.transactions.slice(0, 5).forEach(t => {
        const isCredit = t.type === 'DEPOSIT' || t.type === 'LOAN_DISBURSEMENT';
        const sign = isCredit ? '+' : '-';
        const badgeColor = isCredit ? 'var(--success)' : 'var(--danger)';
        html += `
          <a href="transactions.html" class="search-result-item">
            <div class="search-result-icon" style="color: ${badgeColor};"><i class="fa-solid ${isCredit ? 'fa-arrow-down' : 'fa-arrow-up'}"></i></div>
            <div class="search-result-info">
              <div class="search-result-primary">${t.description || t.type}</div>
              <div class="search-result-secondary">${t.category} • ${t.transactionId}</div>
            </div>
            <span class="search-result-badge" style="color: ${badgeColor};">${sign}₹${parseFloat(t.amount).toLocaleString('en-IN')}</span>
          </a>
        `;
      });
    }

    if (results.bills.length > 0) {
      html += `<div class="search-group-title"><i class="fa-solid fa-bolt"></i> Bill Payments</div>`;
      results.bills.forEach(b => {
        html += `
          <a href="${b.url}" class="search-result-item">
            <div class="search-result-icon"><i class="fa-solid ${b.icon}"></i></div>
            <div class="search-result-info">
              <div class="search-result-primary">${b.name}</div>
              <div class="search-result-secondary">Utility Category: ${b.category}</div>
            </div>
            <span class="btn btn-primary btn-sm" style="padding: 4px 10px; font-size: 0.75rem;">Pay Now</span>
          </a>
        `;
      });
    }

    if (results.beneficiaries.length > 0) {
      html += `<div class="search-group-title"><i class="fa-solid fa-users"></i> Payees</div>`;
      results.beneficiaries.slice(0, 3).forEach(b => {
        html += `
          <a href="transfer.html" class="search-result-item">
            <div class="search-result-icon"><i class="fa-solid fa-user-check"></i></div>
            <div class="search-result-info">
              <div class="search-result-primary">${b.name}</div>
              <div class="search-result-secondary">A/C: ${b.accountNumber} • ${b.bankName || 'GG BANK'}</div>
            </div>
            <span class="btn btn-secondary btn-sm" style="padding: 4px 10px; font-size: 0.75rem;">Transfer</span>
          </a>
        `;
      });
    }

    if (results.loans.length > 0) {
      html += `<div class="search-group-title"><i class="fa-solid fa-hand-holding-dollar"></i> Loans</div>`;
      results.loans.slice(0, 2).forEach(l => {
        html += `
          <a href="loans.html" class="search-result-item">
            <div class="search-result-icon"><i class="fa-solid fa-landmark"></i></div>
            <div class="search-result-info">
              <div class="search-result-primary">${l.loanType} (${l.status})</div>
              <div class="search-result-secondary">${l.loanId} • Purpose: ${l.purpose}</div>
            </div>
            <span class="search-result-badge" style="color: var(--accent);">₹${parseFloat(l.requestedAmount).toLocaleString('en-IN')}</span>
          </a>
        `;
      });
    }

    dropdown.innerHTML = html;
    dropdown.classList.add('active');
  },

  initMobileBottomNav() {
    // Inject mobile bottom nav bar if not existing
    if (!document.querySelector('.mobile-bottom-nav')) {
      const currentPath = window.location.pathname.split('/').pop() || 'dashboard.html';
      const bottomNav = document.createElement('nav');
      bottomNav.className = 'mobile-bottom-nav';
      bottomNav.setAttribute('aria-label', 'Mobile bottom navigation');

      bottomNav.innerHTML = `
        <a href="dashboard.html" class="bottom-nav-link ${currentPath === 'dashboard.html' ? 'active' : ''}">
          <i class="fa-solid fa-house"></i>
          <span>Home</span>
        </a>
        <a href="transfer.html" class="bottom-nav-link ${currentPath === 'transfer.html' || currentPath === 'bill-payments.html' ? 'active' : ''}">
          <i class="fa-solid fa-paper-plane"></i>
          <span>Payments</span>
        </a>
        <a href="financial-insights.html" class="bottom-nav-link ${currentPath === 'financial-insights.html' || currentPath === 'budget.html' ? 'active' : ''}">
          <i class="fa-solid fa-chart-pie"></i>
          <span>Insights</span>
        </a>
        <a href="profile.html" class="bottom-nav-link ${currentPath === 'profile.html' || currentPath === 'security.html' ? 'active' : ''}">
          <i class="fa-solid fa-user-gear"></i>
          <span>Profile</span>
        </a>
      `;
      document.body.appendChild(bottomNav);
    }
  },

  initNotificationsBadge() {
    const notifs = window.API ? (window.API.getMock('gg_notifications') || []) : [];
    const unreadCount = notifs.filter(n => !n.read).length;

    document.querySelectorAll('#notifBadgeCount, .notification-indicator').forEach(el => {
      if (unreadCount > 0) {
        el.textContent = unreadCount;
        el.style.display = 'inline-flex';
      } else {
        el.style.display = 'none';
      }
    });
  },

  initThemeToggle() {
    const savedTheme = localStorage.getItem('gg_theme') || 'dark';
    if (savedTheme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    }

    const toggleBtn = document.getElementById('themeToggleBtn');
    if (toggleBtn) {
      const icon = toggleBtn.querySelector('#themeIcon') || toggleBtn;
      icon.textContent = savedTheme === 'light' ? '🌙' : '☀️';

      toggleBtn.onclick = (e) => {
        e.preventDefault();
        const isCurrentLight = document.documentElement.getAttribute('data-theme') === 'light';
        const nextTheme = isCurrentLight ? 'dark' : 'light';
        if (nextTheme === 'light') {
          document.documentElement.setAttribute('data-theme', 'light');
          icon.textContent = '🌙';
        } else {
          document.documentElement.removeAttribute('data-theme');
          icon.textContent = '☀️';
        }
        localStorage.setItem('gg_theme', nextTheme);
      };
    }
  },

  initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // '/' or Ctrl+K to focus search
      if ((e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        const searchInput = document.getElementById('globalSearchInput');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }

      // Escape to close search dropdown
      if (e.key === 'Escape') {
        const dropdown = document.getElementById('searchResultsDropdown');
        if (dropdown) dropdown.classList.remove('active');
      }
    });
  }
};

// Auto-run on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  AppShell.init();
});

window.AppShell = AppShell;
