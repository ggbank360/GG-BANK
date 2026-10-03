/**
 * GG BANK - Admin Common Infrastructure (admin-common.js)
 * Manages shared Admin Navigation, Sidebar Rendering, Topbar, Auth Guards,
 * Confirmation Modals, Dynamic Badge Counters, Search/Filters, and Export Engines.
 */

const AdminCommon = {
  currentAdmin: null,

  // Initialize Admin Page
  init(activePageKey) {
    // 1. Enforce Admin Authentication
    this.currentAdmin = Auth.requireAuth('ADMIN');
    if (!this.currentAdmin) {
      window.location.href = 'admin-login.html';
      return null;
    }

    // 2. Render Shared Sidebar & Topbar
    this.renderSidebar(activePageKey);
    this.renderTopbar();
    this.updateLiveBadges();

    // 3. Theme init
    const savedTheme = localStorage.getItem('gg_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    return this.currentAdmin;
  },

  // Navigation Items Definition
  navItems: [
    { key: 'dashboard', title: 'Dashboard', url: 'admin-dashboard.html', icon: 'fa-solid fa-gauge-high' },
    { key: 'customers', title: 'Customers', url: 'customers.html', icon: 'fa-solid fa-users-gear' },
    { key: 'accounts', title: 'Accounts', url: 'accounts.html', icon: 'fa-solid fa-vault' },
    { key: 'officers', title: 'Bank Officers', url: 'officers.html', icon: 'fa-solid fa-user-tie' },
    { key: 'transactions', title: 'Transactions', url: 'admin-transactions.html', icon: 'fa-solid fa-money-bill-transfer' },
    { key: 'deposits', title: 'Deposits', url: 'admin-deposits.html', icon: 'fa-solid fa-circle-dollar-to-slot' },
    { key: 'withdrawals', title: 'Withdrawals', url: 'admin-withdrawals.html', icon: 'fa-solid fa-money-bill-trend-up' },
    { key: 'transfers', title: 'Transfers', url: 'admin-transfers.html', icon: 'fa-solid fa-right-left' },
    { key: 'loans', title: 'Loans', url: 'admin-loans.html', icon: 'fa-solid fa-hand-holding-dollar', badgeId: 'navLoanBadge' },
    { key: 'reports', title: 'Reports', url: 'admin-reports.html', icon: 'fa-solid fa-file-invoice' },
    { key: 'notifications', title: 'Notifications', url: 'admin-notifications.html', icon: 'fa-solid fa-bell', badgeId: 'navNotifBadge' },
    { key: 'audit-logs', title: 'Audit Logs', url: 'audit-logs.html', icon: 'fa-solid fa-shield-halved' },
    { key: 'profile', title: 'Profile', url: 'admin-profile.html', icon: 'fa-solid fa-id-badge' },
    { key: 'settings', title: 'Settings', url: 'admin-settings.html', icon: 'fa-solid fa-gears' }
  ],

  renderSidebar(activePageKey) {
    const sidebarEl = document.querySelector('.sidebar.admin-sidebar');
    if (!sidebarEl) return;

    // Detect active key from current path if not specified
    if (!activePageKey) {
      const currentPath = window.location.pathname.split('/').pop() || 'admin-dashboard.html';
      const matched = this.navItems.find(item => item.url === currentPath);
      activePageKey = matched ? matched.key : 'dashboard';
    }

    let menuHtml = `
      <div class="sidebar-header">
        <a href="admin-dashboard.html" class="brand-logo">
          <div class="logo-icon" style="background: linear-gradient(135deg, #ff3b57 0%, #00f0ff 100%);">AD</div>
          <div class="brand-info">
            <span class="brand-title">GG BANK</span>
            <span class="brand-subtitle" style="color: #ff3b57; font-weight: 700;">Admin Control</span>
          </div>
        </a>
      </div>

      <ul class="nav-menu">
        <div class="nav-section-title">Core Banking Operations</div>
    `;

    this.navItems.forEach((item, index) => {
      if (index === 8) {
        menuHtml += `<div class="nav-section-title" style="margin-top: 14px;">Surveillance & System</div>`;
      }
      const isActive = item.key === activePageKey ? 'active' : '';
      const badgeHtml = item.badgeId ? `<span class="badge-count" id="${item.badgeId}" style="display:none;">0</span>` : '';
      
      menuHtml += `
        <li class="nav-item ${isActive}">
          <a href="${item.url}" class="nav-link">
            <i class="${item.icon}"></i>
            <span>${item.title}</span>
            ${badgeHtml}
          </a>
        </li>
      `;
    });

    menuHtml += `
        <li class="nav-item">
          <a href="#" onclick="AdminCommon.logout(event)" class="nav-link" style="color: var(--danger);">
            <i class="fa-solid fa-arrow-right-from-bracket"></i>
            <span>Logout</span>
          </a>
        </li>
      </ul>

      <div class="sidebar-footer">
        <div class="user-mini-card" style="border-color: rgba(255, 59, 87, 0.3);">
          <div class="user-avatar" style="background: var(--danger);">AD</div>
          <div class="user-details">
            <span class="user-name">${this.currentAdmin ? this.currentAdmin.name : 'Administrator'}</span>
            <span class="user-role" style="color: var(--danger);">Super Admin</span>
          </div>
        </div>
      </div>
    `;

    sidebarEl.innerHTML = menuHtml;
  },

  renderTopbar(customTitle) {
    const topbarEl = document.querySelector('.topbar');
    if (!topbarEl) return;

    const pageTitle = customTitle || 'Administration Management Portal';

    topbarEl.innerHTML = `
      <div class="topbar-left">
        <button class="mobile-menu-btn" onclick="document.querySelector('.sidebar').classList.toggle('mobile-open')">
          <i class="fa-solid fa-bars"></i>
        </button>
        <div class="greeting-text">
          GG BANK Admin &bull; <span>${this.currentAdmin ? this.currentAdmin.name : 'Administrator'}</span>
        </div>
      </div>

      <div class="topbar-right">
        <div class="live-db-pill" onclick="AdminCommon.checkDatabaseConnection()" id="adminDbStatusPill" title="Click to test live backend/database connection" style="display: inline-flex; align-items: center; gap: 6px; background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.3); padding: 5px 12px; border-radius: 20px; font-size: 0.78rem; color: var(--accent-cyan); cursor: pointer;">
          <i class="fa-solid fa-database"></i> <span>Live Banking System</span>
        </div>

        <button class="btn btn-success btn-sm" onclick="AdminCommon.openDirectDepositModal()">
          <i class="fa-solid fa-circle-plus"></i> Treasury Deposit
        </button>

        <span class="badge badge-danger" style="padding: 6px 12px; font-size: 0.78rem;">
          <i class="fa-solid fa-shield"></i> SUPER ADMIN
        </span>

        <a href="#" onclick="AdminCommon.logout(event)" class="btn btn-secondary btn-sm" style="color: var(--danger);">
          <i class="fa-solid fa-arrow-right-from-bracket"></i> Logout
        </a>
      </div>
    `;
  },

  // Update Notification & Loan Badges across the portal
  async updateLiveBadges() {
    try {
      const statsRes = await API.request('/admin/dashboard');
      if (statsRes && statsRes.data) {
        const pendingLoans = statsRes.data.pendingLoans || 0;
        const loanBadge = document.getElementById('navLoanBadge');
        if (loanBadge) {
          loanBadge.textContent = pendingLoans;
          loanBadge.style.display = pendingLoans > 0 ? 'inline-block' : 'none';
        }
      }

      const notifRes = await API.request('/admin/notifications');
      if (notifRes && notifRes.data) {
        const unreadCount = notifRes.data.filter(n => !n.read).length;
        const notifBadge = document.getElementById('navNotifBadge');
        if (notifBadge) {
          notifBadge.textContent = unreadCount;
          notifBadge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
        }
      }
    } catch (e) {
      // Non-blocking
    }
  },

  // Universal Confirmation Modal
  confirmModal({ title, message, confirmText = 'Confirm', confirmClass = 'btn-primary', onConfirm, onCancel }) {
    let modal = document.getElementById('adminUniversalConfirmModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'modal-backdrop';
      modal.id = 'adminUniversalConfirmModal';
      modal.innerHTML = `
        <div class="modal-card" style="max-width: 460px;">
          <div class="modal-header">
            <h3 class="modal-title" id="confirmModalTitle">Confirm Action</h3>
            <button class="modal-close-btn" id="confirmModalCloseX">&times;</button>
          </div>
          <div style="padding: 18px 0; font-size: 0.95rem; color: var(--text-secondary);" id="confirmModalBody">
            Are you sure you want to perform this operation?
          </div>
          <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 10px; padding-top: 14px; border-top: 1px solid var(--border-color-subtle);">
            <button type="button" class="btn btn-secondary" id="confirmModalCancelBtn">Cancel</button>
            <button type="button" class="btn ${confirmClass}" id="confirmModalOkBtn">${confirmText}</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    document.getElementById('confirmModalTitle').textContent = title || 'Confirm Action';
    document.getElementById('confirmModalBody').innerHTML = message || 'Are you sure you want to proceed?';
    
    const okBtn = document.getElementById('confirmModalOkBtn');
    okBtn.className = `btn ${confirmClass}`;
    okBtn.textContent = confirmText;

    const closeModal = () => {
      modal.classList.remove('active');
      if (typeof onCancel === 'function') onCancel();
    };

    document.getElementById('confirmModalCloseX').onclick = closeModal;
    document.getElementById('confirmModalCancelBtn').onclick = closeModal;

    okBtn.onclick = async () => {
      okBtn.disabled = true;
      okBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processing...`;
      try {
        if (typeof onConfirm === 'function') {
          await onConfirm();
        }
        modal.classList.remove('active');
      } catch (err) {
        Utils.showToast(err.message || 'Operation failed', 'error');
      } finally {
        okBtn.disabled = false;
        okBtn.textContent = confirmText;
      }
    };

    modal.classList.add('active');
  },

  // State Rendering Helpers
  renderLoading(containerId, message = 'Loading records...') {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = `
      <tr>
        <td colspan="100%" style="text-align: center; padding: 48px 20px; color: var(--accent-cyan);">
          <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 2rem; margin-bottom: 12px; display: inline-block;"></i>
          <div style="font-size: 0.95rem; font-weight: 600; color: var(--text-primary);">${message}</div>
        </td>
      </tr>
    `;
  },

  renderEmpty(containerId, message = 'No records found.', icon = 'fa-folder-open') {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = `
      <tr>
        <td colspan="100%" style="text-align: center; padding: 48px 20px; color: var(--text-muted);">
          <i class="fa-solid ${icon}" style="font-size: 2.2rem; margin-bottom: 12px; opacity: 0.6; display: inline-block;"></i>
          <div style="font-size: 0.95rem; font-weight: 600; color: var(--text-secondary);">${message}</div>
        </td>
      </tr>
    `;
  },

  renderError(containerId, message = 'Unable to load data. Please try again.', retryCallback) {
    const el = document.getElementById(containerId);
    if (!el) return;
    window.__adminRetryFn = retryCallback;
    el.innerHTML = `
      <tr>
        <td colspan="100%" style="text-align: center; padding: 48px 20px; color: var(--danger);">
          <i class="fa-solid fa-triangle-exclamation" style="font-size: 2.2rem; margin-bottom: 12px; display: inline-block;"></i>
          <div style="font-size: 0.95rem; font-weight: 600; margin-bottom: 12px;">${message}</div>
          <button class="btn btn-secondary btn-sm" onclick="if(window.__adminRetryFn) window.__adminRetryFn()">
            <i class="fa-solid fa-rotate-right"></i> Retry
          </button>
        </td>
      </tr>
    `;
  },

  // Direct Treasury Deposit Modal
  openDirectDepositModal(prefillAcc = '') {
    let modal = document.getElementById('adminTreasuryDepositModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'modal-backdrop';
      modal.id = 'adminTreasuryDepositModal';
      modal.innerHTML = `
        <div class="modal-card" style="max-width: 500px;">
          <div class="modal-header">
            <h3 class="modal-title"><i class="fa-solid fa-circle-dollar-to-slot" style="color: var(--success);"></i> Treasury Direct Deposit</h3>
            <button class="modal-close-btn" onclick="document.getElementById('adminTreasuryDepositModal').classList.remove('active')">&times;</button>
          </div>
          <form id="adminDirectDepositForm" style="display: flex; flex-direction: column; gap: 16px; margin-top: 10px;">
            <div class="form-group">
              <label class="form-label" for="admDepAccount">Beneficiary 12-Digit Account No *</label>
              <input type="text" id="admDepAccount" class="form-control" placeholder="100188492019" required maxlength="12" inputmode="numeric">
            </div>
            <div class="form-group">
              <label class="form-label" for="admDepAmount">Credit Amount (₹) *</label>
              <input type="number" id="admDepAmount" class="form-control" placeholder="50000" required min="1" step="0.01">
            </div>
            <div class="form-group">
              <label class="form-label" for="admDepCategory">Deposit Channel / Type</label>
              <select id="admDepCategory" class="form-control">
                <option value="Direct Cash Credit">Direct Cash Credit</option>
                <option value="Treasury Wire Clearance">Treasury Wire Clearance</option>
                <option value="Interbank Settlement">Interbank Settlement</option>
                <option value="Admin Correction Adjustment">Admin Correction Adjustment</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="admDepRemarks">Audit Remarks</label>
              <input type="text" id="admDepRemarks" class="form-control" placeholder="Authorized Treasury Credit by Admin">
            </div>
            <div class="modal-footer" style="margin-top: 8px; display: flex; justify-content: flex-end; gap: 10px;">
              <button type="button" class="btn btn-secondary" onclick="document.getElementById('adminTreasuryDepositModal').classList.remove('active')">Cancel</button>
              <button type="submit" class="btn btn-success" id="btnSubmitAdminDeposit">
                <i class="fa-solid fa-check"></i> Execute Credit
              </button>
            </div>
          </form>
        </div>
      `;
      document.body.appendChild(modal);

      document.getElementById('adminDirectDepositForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const acc = document.getElementById('admDepAccount').value.trim();
        const amt = parseFloat(document.getElementById('admDepAmount').value);
        const cat = document.getElementById('admDepCategory').value;
        const remarks = document.getElementById('admDepRemarks').value.trim();
        const btn = document.getElementById('btnSubmitAdminDeposit');

        if (!/^\d{12}$/.test(acc)) {
          Utils.showToast('Please provide a valid 12-digit account number', 'warning');
          return;
        }

        Utils.setLoading(btn, true, 'Crediting...');
        try {
          await API.request('/admin/deposits/credit', 'POST', {
            accountNumber: acc,
            amount: amt,
            paymentMethod: cat,
            description: remarks || `Treasury credit of ₹${amt.toLocaleString('en-IN')}`
          });
          Utils.showToast(`Successfully credited ₹${amt.toLocaleString('en-IN')} to ${acc}`, 'success');
          modal.classList.remove('active');
          document.getElementById('adminDirectDepositForm').reset();
          // Reload current page data if listener exists
          if (window.__adminRefreshData) window.__adminRefreshData();
          AdminCommon.updateLiveBadges();
        } catch (err) {
          Utils.showToast(err.message || 'Deposit failed', 'error');
        } finally {
          Utils.setLoading(btn, false);
        }
      });
    }

    if (prefillAcc) {
      document.getElementById('admDepAccount').value = prefillAcc;
    }
    modal.classList.add('active');
  },

  // Test live DB connection
  async checkDatabaseConnection() {
    const pill = document.getElementById('adminDbStatusPill');
    if (!pill) return;
    pill.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Testing Connection...</span>`;
    try {
      await API.request('/admin/dashboard');
      pill.innerHTML = `<i class="fa-solid fa-circle-check" style="color: var(--success);"></i> <span>Connected (Live & Secure)</span>`;
      pill.style.borderColor = 'rgba(0, 230, 118, 0.4)';
      Utils.showToast('Backend and Database connection verified!', 'success');
    } catch (e) {
      pill.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="color: var(--warning);"></i> <span>Academic Offline Engine Active</span>`;
      Utils.showToast('Operating on local Academic Engine (Demo Mode Active)', 'info');
    }
  },

  // Universal Export to CSV
  exportCSV(data, filename, headers) {
    if (!data || !data.length) {
      Utils.showToast('No data available to export.', 'warning');
      return;
    }

    const headerKeys = Object.keys(headers || data[0]);
    const headerLabels = headers ? Object.values(headers) : headerKeys;

    let csvContent = headerLabels.join(',') + '\n';

    data.forEach(item => {
      const row = headerKeys.map(key => {
        let val = item[key] !== undefined && item[key] !== null ? item[key] : '';
        val = String(val).replace(/"/g, '""');
        if (String(val).includes(',') || String(val).includes('\n')) {
          val = `"${val}"`;
        }
        return val;
      });
      csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename || 'GG_BANK_Export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    Utils.showToast(`Exported ${filename || 'CSV file'} successfully!`, 'success');
  },

  // Universal Export to Excel (CSV compatible format)
  exportExcel(data, filename, headers) {
    const fn = (filename || 'GG_BANK_Report').replace(/\.csv$/i, '') + '.xls';
    this.exportCSV(data, fn, headers);
  },

  // Universal Export to PDF using jsPDF + AutoTable
  exportPDF(title, headers, rows, filename) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      Utils.showToast('PDF generator library not loaded. Falling back to CSV export.', 'info');
      this.exportCSV(rows, filename ? filename.replace(/\.pdf$/i, '.csv') : 'report.csv');
      return;
    }

    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      // Title & Header Branding
      doc.setFillColor(7, 13, 30);
      doc.rect(0, 0, 210, 28, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.text('GG BANK - Secure Banking Management', 14, 14);
      doc.setFontSize(10);
      doc.setTextColor(0, 240, 255);
      doc.text(title || 'Official Banking System Report', 14, 22);

      doc.setTextColor(100, 116, 139);
      doc.setFontSize(8);
      doc.text(`Generated on: ${new Date().toLocaleString()} | Super Admin Control`, 14, 34);

      // AutoTable
      doc.autoTable({
        startY: 38,
        head: [headers],
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: [16, 30, 66], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 3 }
      });

      doc.save(filename || 'GG_BANK_Report.pdf');
      Utils.showToast(`Exported ${filename || 'PDF'} successfully!`, 'success');
    } catch (err) {
      console.error('PDF Generation Error:', err);
      Utils.showToast('Error generating PDF: ' + err.message, 'error');
    }
  },

  // Secure Admin Logout
  logout(e) {
    if (e) e.preventDefault();
    localStorage.removeItem('gg_current_user');
    localStorage.removeItem('gg_current_account');
    localStorage.removeItem('gg_auth_token');
    if (window.firebaseAuth) {
      firebaseAuth.signOut().catch(() => {});
    }
    Utils.showToast('Administrator session ended securely.', 'info');
    setTimeout(() => {
      window.location.href = 'admin-login.html';
    }, 400);
  }
};

window.AdminCommon = AdminCommon;
