/**
 * GG BANK - Admin Management Portal Engine
 * Full implementation for:
 * 1. Customer Moderation, Full Data Editing & Customer Account Deletion
 * 2. Admin Direct Account Deposit / Treasury Credits
 * 3. Branch Offices & Loan Officers Directory (Editable & Stored in DB)
 * 4. Loan Approvals with Branch & Officer Assignment
 * 5. Global Ledger Surveillance, Audit Logs & CSV Exports
 * 6. Spacious, Structured Dashboard Views & Live Health Checks
 */

let currentAdmin = null;
let allCustomers = [];
let allTransactions = [];
let allLoans = [];
let allAuditLogs = [];
let allOffices = [];
let selectedEditUserId = null;
let selectedEditOfficeId = null;
let selectedApproveLoanId = null;

document.addEventListener('DOMContentLoaded', async () => {
  currentAdmin = Auth.requireAuth('ADMIN');
  if (!currentAdmin) return;

  initAdminUI();
  await loadAdminData();
  setupAdminEventListeners();
  switchAdminView('view-admin-dashboard');
});

function initAdminUI() {
  document.querySelectorAll('.admin-name-display').forEach(el => el.textContent = currentAdmin.name);
  
  // Theme Initializer
  const savedTheme = localStorage.getItem('gg_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
}

function switchAdminView(viewId) {
  const views = document.querySelectorAll('.view-section');
  views.forEach(v => v.classList.remove('active-view'));

  const activeView = document.getElementById(viewId);
  if (activeView) {
    activeView.classList.add('active-view');
  }

  // Update Nav
  const navItems = document.querySelectorAll('.sidebar .nav-item');
  navItems.forEach(item => {
    if (item.getAttribute('data-view') === viewId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  const sidebar = document.querySelector('.sidebar');
  if (sidebar) sidebar.classList.remove('mobile-open');

  if (viewId === 'view-admin-dashboard') {
    setTimeout(() => {
      if (window.BankCharts && document.getElementById('adminGrowthChart')) {
        BankCharts.renderAdminGrowth('adminGrowthChart');
      }
    }, 100);
  }
}

async function loadAdminData() {
  try {
    // 1. Stats
    const statsRes = await API.request('/admin/stats');
    updateAdminStats(statsRes.data);

    // 2. Customers
    const custRes = await API.request('/admin/customers');
    allCustomers = custRes.data || [];
    renderCustomersTable(allCustomers);
    renderAccountsTable(allCustomers);

    // 3. Transactions
    const txnRes = await API.request('/admin/transactions');
    allTransactions = txnRes.data || [];
    renderAdminTransactionsTable(allTransactions);

    // 4. Loans
    const loanRes = await API.request('/loans');
    allLoans = loanRes.data || [];
    renderAdminLoans(allLoans);
    renderDashboardPendingLoans(allLoans);

    // 5. Offices
    const offRes = await API.request('/admin/offices');
    allOffices = offRes.data || [];
    renderOfficesGrid(allOffices);

    // 6. Audit Logs
    const auditRes = await API.request('/admin/audit-logs');
    allAuditLogs = auditRes.data || [];
    renderAuditLogs(allAuditLogs);
    renderDashboardRecentAudits(allAuditLogs);

  } catch (err) {
    Toast.error(err.message, 'Failed to load administrator data');
  }
}

function updateAdminStats(stats) {
  if (!stats) return;
  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setEl('kpiTotalCustomers', stats.totalCustomers || 0);
  setEl('kpiTotalAccounts', stats.totalAccounts || 0);
  setEl('kpiTotalDeposits', `₹${(stats.totalDeposits || 0).toLocaleString('en-IN')}`);
  setEl('kpiTotalTransfers', `₹${(stats.totalTransfers || 0).toLocaleString('en-IN')}`);
  setEl('kpiPendingLoans', stats.pendingLoans || 0);
  setEl('kpiActiveAccounts', stats.activeAccounts || 0);
  setEl('kpiBlockedAccounts', stats.blockedAccounts || 0);

  const pendingBadge = document.getElementById('adminLoanPendingBadge');
  if (pendingBadge) pendingBadge.textContent = stats.pendingLoans || 0;

  if (window.BankCharts) {
    if (document.getElementById('adminGrowthChart')) {
      BankCharts.renderAdminGrowth('adminGrowthChart');
    }
  }
}

// ---------------- DASHBOARD PREVIEWS ----------------
function renderDashboardPendingLoans(loans) {
  const container = document.getElementById('dashPendingLoansList');
  if (!container) return;

  const pending = loans.filter(l => ['PENDING', 'UNDER_REVIEW', 'SUBMITTED'].includes((l.status || '').toUpperCase()));
  if (pending.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 24px;">No pending loan applications awaiting review.</div>`;
    return;
  }

  container.innerHTML = pending.slice(0, 3).map(l => `
    <div style="background: var(--bg-surface); padding: 14px 16px; border-radius: var(--radius-md); border-left: 4px solid var(--warning); display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
      <div>
        <div style="font-weight: 700; color: var(--text-primary); font-size: 0.95rem;">${l.loanType} <span style="font-size: 0.78rem; font-family: var(--font-mono); color: var(--text-muted);">(${l.loanId})</span></div>
        <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 2px;">Applicant: ${l.customerName || l.accountNumber} (${l.accountNumber}) &bull; Requested: <strong style="color: var(--accent-cyan);">₹${l.requestedAmount.toLocaleString('en-IN')}</strong></div>
      </div>
      <button class="btn btn-warning btn-sm" onclick="switchAdminView('view-admin-loans')"><i class="fa-solid fa-arrow-right"></i> Review</button>
    </div>
  `).join('');
}

function renderDashboardRecentAudits(logs) {
  const container = document.getElementById('dashRecentAuditList');
  if (!container) return;

  if (logs.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 24px;">No audit trail events logged yet.</div>`;
    return;
  }

  container.innerHTML = logs.slice(0, 4).map(l => `
    <div style="background: var(--bg-surface); padding: 10px 14px; border-radius: var(--radius-md); display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 0.84rem;">
      <div>
        <span class="badge badge-info" style="font-size: 0.7rem; margin-right: 6px;">${l.action}</span>
        <span style="color: var(--text-primary);">${l.description}</span>
      </div>
      <span style="color: var(--text-muted); font-size: 0.76rem; font-family: var(--font-mono);">${new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
    </div>
  `).join('');
}

// ---------------- CUSTOMER MANAGEMENT, EDITING & DELETION ----------------
function renderCustomersTable(customers) {
  const tableBody = document.getElementById('adminCustomersTableBody');
  if (!tableBody) return;

  if (customers.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">No customers registered in the system.</td></tr>`;
    return;
  }

  tableBody.innerHTML = customers.map(c => {
    let statusBadge = 'badge-success';
    if (c.status === 'BLOCKED') statusBadge = 'badge-danger';
    if (c.status === 'INACTIVE') statusBadge = 'badge-warning';

    return `
      <tr>
        <td style="font-family: var(--font-mono); font-size: 0.85rem;">${c.userId}</td>
        <td>
          <div style="font-weight: 700; color: var(--text-primary);">${c.name}</div>
          <div style="font-size: 0.78rem; color: var(--text-muted);">${c.email}</div>
        </td>
        <td style="font-family: var(--font-mono); font-weight: 700;">${c.accountNumber || 'N/A'}</td>
        <td>${c.accountType || 'SAVINGS'}</td>
        <td style="font-weight: 700; font-family: var(--font-mono); color: var(--accent-cyan);">₹${(c.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        <td><span class="badge ${statusBadge}">${c.status}</span></td>
        <td>
          <div class="table-action-btns">
            <button class="btn btn-primary btn-sm" onclick="openEditCustomerModal('${c.userId}')" title="Edit Customer Details"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
            <button class="btn btn-secondary btn-sm" onclick="openCustomerDetailModal('${c.userId}')" title="View KYC Profile"><i class="fa-solid fa-id-card"></i> KYC</button>
            ${c.status === 'ACTIVE'
              ? `<button class="btn btn-warning btn-sm" onclick="updateCustomerStatus('${c.userId}', 'BLOCKED')" title="Block Customer Access"><i class="fa-solid fa-ban"></i> Block</button>`
              : `<button class="btn btn-success btn-sm" onclick="updateCustomerStatus('${c.userId}', 'ACTIVE')" title="Reactivate Customer"><i class="fa-solid fa-check"></i> Activate</button>`
            }
            <button class="btn btn-danger btn-sm" onclick="deleteCustomer('${c.userId}')" title="Permanently Delete Customer"><i class="fa-solid fa-trash"></i> Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderAccountsTable(customers) {
  const tableBody = document.getElementById('adminAccountsTableBody');
  if (!tableBody) return;

  tableBody.innerHTML = customers.map(c => `
    <tr>
      <td style="font-family: var(--font-mono); font-weight: 700;">${c.accountNumber || 'N/A'}</td>
      <td>${c.name}</td>
      <td>${c.accountType || 'SAVINGS'}</td>
      <td style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-cyan);">₹${(c.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      <td><span class="badge ${c.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}">${c.status}</span></td>
      <td>${new Date(c.createdAt || Date.now()).toLocaleDateString('en-GB')}</td>
      <td>
        <div class="table-action-btns">
          <button class="btn btn-success btn-sm" onclick="openAdminDepositModal('${c.accountNumber}')" title="Direct Deposit Funds"><i class="fa-solid fa-circle-plus"></i> Credit Funds</button>
          <button class="btn btn-secondary btn-sm" onclick="openEditCustomerModal('${c.userId}')" title="Edit Account Details"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteCustomer('${c.userId}')" title="Delete Account Record"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openCustomerDetailModal(userId) {
  const customer = allCustomers.find(c => c.userId === userId);
  if (!customer) return;

  document.getElementById('kycModalName').textContent = customer.name;
  document.getElementById('kycModalId').textContent = customer.userId;
  document.getElementById('kycModalEmail').textContent = customer.email;
  document.getElementById('kycModalPhone').textContent = customer.phone;
  document.getElementById('kycModalDob').textContent = customer.dateOfBirth || 'N/A';
  document.getElementById('kycModalAddress').textContent = customer.address || 'N/A';
  document.getElementById('kycModalAccount').textContent = customer.accountNumber || 'N/A';
  document.getElementById('kycModalBalance').textContent = `₹${(customer.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  document.getElementById('kycModalStatus').textContent = customer.status;

  document.getElementById('customerKycModal').classList.add('active');
}

function openEditCustomerModal(userId) {
  const customer = allCustomers.find(c => c.userId === userId);
  if (!customer) return;

  selectedEditUserId = userId;
  document.getElementById('editCustName').value = customer.name || '';
  document.getElementById('editCustEmail').value = customer.email || '';
  document.getElementById('editCustPhone').value = customer.phone || '';
  document.getElementById('editCustDob').value = customer.dateOfBirth || '2000-01-01';
  document.getElementById('editCustAddress').value = customer.address || '';
  document.getElementById('editCustAccountType').value = customer.accountType || 'SAVINGS';
  document.getElementById('editCustBalance').value = customer.balance !== undefined ? customer.balance : 0;
  document.getElementById('editCustStatus').value = customer.status || 'ACTIVE';

  document.getElementById('editCustomerModal').classList.add('active');
}

async function handleSaveCustomerEdit(e) {
  e.preventDefault();
  if (!selectedEditUserId) return;

  const btn = e.target.querySelector('button[type="submit"]');
  Loader.start(btn, 'Saving Changes...');

  const payload = {
    name: document.getElementById('editCustName').value.trim(),
    email: document.getElementById('editCustEmail').value.trim(),
    phone: document.getElementById('editCustPhone').value.trim(),
    dateOfBirth: document.getElementById('editCustDob').value,
    address: document.getElementById('editCustAddress').value.trim(),
    accountType: document.getElementById('editCustAccountType').value,
    balance: parseFloat(document.getElementById('editCustBalance').value),
    status: document.getElementById('editCustStatus').value
  };

  try {
    const res = await API.request(`/admin/customers/${selectedEditUserId}`, 'PUT', payload);
    Toast.success(res.message || 'Customer details updated successfully!');
    document.getElementById('editCustomerModal').classList.remove('active');
    await loadAdminData();
  } catch (err) {
    Toast.error(err.message, 'Update Failed');
  } finally {
    Loader.stop(btn);
  }
}

async function updateCustomerStatus(userId, newStatus) {
  if (!confirm(`Are you sure you want to set this customer's status to ${newStatus}?`)) return;

  try {
    const res = await API.request(`/admin/customers/${userId}/status`, 'PUT', { status: newStatus });
    Toast.success(res.message);
    await loadAdminData();
  } catch (err) {
    Toast.error(err.message);
  }
}

// Permanently Delete Customer Account
async function deleteCustomer(userId) {
  const customer = allCustomers.find(c => c.userId === userId);
  const name = customer ? customer.name : userId;
  if (!confirm(`⚠️ Are you sure you want to PERMANENTLY DELETE customer "${name}" and all associated account records? This action cannot be undone.`)) {
    return;
  }

  try {
    const res = await API.request(`/admin/customers/${userId}`, 'DELETE');
    Toast.success(res.message || `Customer ${name} deleted successfully!`);
    await loadAdminData();
  } catch (err) {
    Toast.error(err.message, 'Delete Failed');
  }
}

// ---------------- ADMIN DEPOSIT / CREDIT TOOL ----------------
function openAdminDepositModal(prefilledAccount = '') {
  document.getElementById('adminDepositAccount').value = prefilledAccount || '';
  document.getElementById('adminDepositAmount').value = '';
  document.getElementById('adminDepositDesc').value = 'Official Bank Deposit credited by Administrator';
  document.getElementById('adminDepositModal').classList.add('active');
}

async function handleAdminDepositSubmit(e) {
  e.preventDefault();
  const accNum = document.getElementById('adminDepositAccount').value.trim();
  const amount = parseFloat(document.getElementById('adminDepositAmount').value);
  const desc = document.getElementById('adminDepositDesc').value.trim();
  const btn = e.target.querySelector('button[type="submit"]');

  if (!accNum || isNaN(amount) || amount <= 0) {
    Toast.error('Please enter a valid account number and deposit amount.');
    return;
  }

  Loader.start(btn, 'Crediting Funds...');
  try {
    const res = await API.request('/admin/deposit', 'POST', {
      accountNumber: accNum,
      amount: amount,
      description: desc
    });
    Toast.success(res.message || `₹${amount.toLocaleString('en-IN')} deposited to ${accNum}!`);
    document.getElementById('adminDepositModal').classList.remove('active');
    document.getElementById('adminDepositForm').reset();
    await loadAdminData();
  } catch (err) {
    Toast.error(err.message, 'Deposit Failed');
  } finally {
    Loader.stop(btn);
  }
}

// ---------------- BRANCH OFFICES & LOAN OFFICERS MANAGEMENT ----------------
function renderOfficesGrid(offices) {
  const container = document.getElementById('adminOfficesGrid');
  if (!container) return;

  if (offices.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 30px;">No branch offices registered. Click "Add Branch Office" above.</div>`;
    return;
  }

  container.innerHTML = offices.map(o => `
    <div class="card" style="display: flex; flex-direction: column; justify-content: space-between; gap: 14px;">
      <div>
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary);">${o.branchName}</h3>
            <div style="font-size: 0.8rem; color: var(--accent-cyan); font-family: var(--font-mono);">${o.branchCode} &bull; IFSC: ${o.ifscCode}</div>
          </div>
          <span class="badge badge-info">${o.city}</span>
        </div>

        <div style="font-size: 0.84rem; color: var(--text-secondary); margin: 10px 0;">
          <div><i class="fa-solid fa-location-dot"></i> ${o.address}</div>
          <div><i class="fa-solid fa-phone"></i> ${o.phone}</div>
          <div><i class="fa-solid fa-user-shield"></i> <strong>Manager:</strong> ${o.managerName}</div>
        </div>

        <div style="background: var(--bg-surface); padding: 10px; border-radius: var(--radius-md); font-size: 0.82rem;">
          <div style="font-weight: 700; color: var(--accent-cyan); margin-bottom: 4px;"><i class="fa-solid fa-user-tie"></i> Loan Officers:</div>
          <div style="color: var(--text-primary); line-height: 1.4;">${o.loanOfficers || 'General Loan Officers'}</div>
        </div>
      </div>

      <div style="display: flex; gap: 8px; border-top: 1px solid var(--border-color-subtle); padding-top: 12px;">
        <button class="btn btn-secondary btn-sm" style="flex: 1;" onclick="openEditOfficeModal('${o.officeId}')"><i class="fa-solid fa-pen-to-square"></i> Edit Office</button>
        <button class="btn btn-danger btn-sm" onclick="deleteOffice('${o.officeId}')"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>
  `).join('');
}

function openAddOfficeModal() {
  selectedEditOfficeId = null;
  document.getElementById('officeModalTitle').textContent = 'Add Bank Branch Office';
  document.getElementById('officeForm').reset();
  document.getElementById('officeModal').classList.add('active');
}

function openEditOfficeModal(officeId) {
  const office = allOffices.find(o => o.officeId === officeId);
  if (!office) return;

  selectedEditOfficeId = officeId;
  document.getElementById('officeModalTitle').textContent = 'Edit Branch Office & Officers';
  document.getElementById('officeBranchName').value = office.branchName || '';
  document.getElementById('officeBranchCode').value = office.branchCode || '';
  document.getElementById('officeIfsc').value = office.ifscCode || '';
  document.getElementById('officeCity').value = office.city || '';
  document.getElementById('officeAddress').value = office.address || '';
  document.getElementById('officePhone').value = office.phone || '';
  document.getElementById('officeManager').value = office.managerName || '';
  document.getElementById('officeLoanOfficers').value = office.loanOfficers || '';

  document.getElementById('officeModal').classList.add('active');
}

async function handleOfficeFormSubmit(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  Loader.start(btn, 'Saving Office...');

  const payload = {
    branchName: document.getElementById('officeBranchName').value.trim(),
    branchCode: document.getElementById('officeBranchCode').value.trim(),
    ifscCode: document.getElementById('officeIfsc').value.trim(),
    city: document.getElementById('officeCity').value.trim(),
    address: document.getElementById('officeAddress').value.trim(),
    phone: document.getElementById('officePhone').value.trim(),
    managerName: document.getElementById('officeManager').value.trim(),
    loanOfficers: document.getElementById('officeLoanOfficers').value.trim()
  };

  try {
    if (selectedEditOfficeId) {
      await API.request(`/admin/offices/${selectedEditOfficeId}`, 'PUT', payload);
      Toast.success('Branch office updated successfully!');
    } else {
      await API.request('/admin/offices', 'POST', payload);
      Toast.success('New branch office created successfully!');
    }
    document.getElementById('officeModal').classList.remove('active');
    await loadAdminData();
  } catch (err) {
    Toast.error(err.message, 'Save Failed');
  } finally {
    Loader.stop(btn);
  }
}

async function deleteOffice(officeId) {
  if (!confirm('Are you sure you want to remove this branch office?')) return;
  try {
    await API.request(`/admin/offices/${officeId}`, 'DELETE');
    Toast.info('Branch office removed.');
    await loadAdminData();
  } catch (err) {
    Toast.error(err.message);
  }
}

// ---------------- LOAN APPROVAL WITH OFFICER & BRANCH ASSIGNMENT ----------------
function renderAdminLoans(loans) {
  const container = document.getElementById('adminLoansGrid');
  if (!container) return;

  if (loans.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 30px;">No loan applications in the system.</div>`;
    return;
  }

  container.innerHTML = loans.map(l => {
    const isPending = ['PENDING', 'UNDER_REVIEW', 'SUBMITTED'].includes((l.status || '').toUpperCase());
    let statusClass = 'status-pending';
    let badgeClass = 'badge-warning';
    if (l.status === 'APPROVED' || l.status === 'ACTIVE') { statusClass = 'status-approved'; badgeClass = 'badge-success'; }
    else if (l.status === 'REJECTED') { statusClass = 'status-rejected'; badgeClass = 'badge-danger'; }
    else if (l.status === 'UNDER_REVIEW') { statusClass = 'status-pending'; badgeClass = 'badge-info'; }

    return `
      <div class="loan-review-card ${statusClass}">
        <div class="loan-header-row">
          <div class="loan-type-tag">${l.loanType} <span style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono);">(${l.loanId})</span></div>
          <span class="badge ${badgeClass}">${l.status}</span>
        </div>
        <div style="font-size: 0.85rem; color: var(--accent-cyan); font-weight: 600; margin-bottom: 8px;">
          <i class="fa-solid fa-user"></i> ${l.customerName || 'Customer'} <span style="color: var(--text-muted); font-weight: normal;">(${l.accountNumber})</span>
        </div>
        <div class="loan-detail-grid">
          <div class="loan-detail-item">
            <div class="label">Requested Amount</div>
            <div class="val" style="color: var(--accent-cyan); font-size: 1.1rem;">₹${l.requestedAmount.toLocaleString('en-IN')}</div>
          </div>
          <div class="loan-detail-item">
            <div class="label">Applicant Income</div>
            <div class="val">₹${(l.monthlyIncome || 0).toLocaleString('en-IN')}/mo</div>
          </div>
          <div class="loan-detail-item">
            <div class="label">Tenure & Rate</div>
            <div class="val">${l.tenure} Mos @ ${l.interestRate}%</div>
          </div>
          <div class="loan-detail-item">
            <div class="label">Estimated EMI</div>
            <div class="val">₹${(l.estimatedEMI || 0).toLocaleString('en-IN')}</div>
          </div>
        </div>
        <div style="font-size: 0.85rem; color: var(--text-secondary); margin: 6px 0;">
          <strong>Purpose:</strong> ${l.purpose || 'Not specified'}
        </div>
        ${(l.assignedOfficer || l.assignedOfficerName) ? `
          <div style="background: rgba(56, 189, 248, 0.1); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 8px 12px; font-size: 0.82rem; margin-top: 6px;">
            <div style="color: var(--accent-cyan); font-weight: 700;"><i class="fa-solid fa-user-tie"></i> Assigned Officer: ${l.assignedOfficer || l.assignedOfficerName}</div>
            <div style="color: var(--text-secondary);"><i class="fa-solid fa-building-columns"></i> Branch: ${l.branchOffice || 'Central Tech Branch'}</div>
          </div>
        ` : ''}
        <div class="loan-actions-row">
          ${isPending ? `
            <button class="btn btn-danger btn-sm" onclick="rejectLoan('${l.loanId}')">Reject</button>
            <button class="btn btn-success btn-sm" onclick="openApproveLoanModal('${l.loanId}')"><i class="fa-solid fa-user-check"></i> Assign Officer & Approve</button>
          ` : `
            <span style="font-size: 0.8rem; color: var(--text-muted); font-style: italic;">Remarks: ${l.adminRemarks || 'Processed'}</span>
          `}
        </div>
      </div>
    `;
  }).join('');
}

function openApproveLoanModal(loanId) {
  const loan = allLoans.find(l => l.loanId === loanId);
  if (!loan) return;

  selectedApproveLoanId = loanId;
  document.getElementById('approveLoanIdDisplay').textContent = loan.loanId;
  document.getElementById('approveLoanAmountDisplay').textContent = `₹${loan.requestedAmount.toLocaleString('en-IN')}`;
  document.getElementById('approveLoanApplicantAccount').textContent = loan.accountNumber;

  // Populate branch offices in dropdown
  const branchSelect = document.getElementById('approveBranchOfficeSelect');
  if (branchSelect) {
    branchSelect.innerHTML = allOffices.map(o => `<option value="${o.branchName}">${o.branchName} (${o.city})</option>`).join('');
  }

  // Populate loan officers from first branch
  updateLoanOfficerOptions();

  document.getElementById('approveLoanModal').classList.add('active');
}

function updateLoanOfficerOptions() {
  const branchSelect = document.getElementById('approveBranchOfficeSelect');
  const officerSelect = document.getElementById('approveLoanOfficerSelect');
  if (!branchSelect || !officerSelect) return;

  const selectedBranchName = branchSelect.value;
  const office = allOffices.find(o => o.branchName === selectedBranchName) || allOffices[0];

  if (office && office.loanOfficers) {
    const officersList = office.loanOfficers.split(',').map(s => s.trim());
    officerSelect.innerHTML = officersList.map(name => `<option value="${name}">${name}</option>`).join('');
  } else {
    officerSelect.innerHTML = '<option value="Vikram Sharma (Senior Credit Officer)">Vikram Sharma (Senior Credit Officer)</option>';
  }
}

async function handleApproveLoanSubmit(e) {
  e.preventDefault();
  if (!selectedApproveLoanId) return;

  const branchOffice = document.getElementById('approveBranchOfficeSelect').value;
  const assignedOfficer = document.getElementById('approveLoanOfficerSelect').value;
  const remarks = document.getElementById('approveLoanRemarks').value.trim() || 'Approved and assigned by Administrator';
  const btn = e.target.querySelector('button[type="submit"]');

  Loader.start(btn, 'Disbursing Loan...');
  try {
    const res = await API.request(`/admin/loans/${selectedApproveLoanId}/approve`, 'PUT', {
      branchOffice,
      assignedOfficer,
      remarks
    });
    Toast.success(res.message || 'Loan approved and assigned successfully!');
    document.getElementById('approveLoanModal').classList.remove('active');
    await loadAdminData();
  } catch (err) {
    Toast.error(err.message, 'Approval Failed');
  } finally {
    Loader.stop(btn);
  }
}

async function rejectLoan(loanId) {
  const remarks = prompt('Enter rejection reason:', 'Income criteria not met');
  if (remarks === null) return;

  try {
    const res = await API.request(`/admin/loans/${loanId}/reject`, 'PUT', { remarks });
    Toast.info(res.message || 'Loan application rejected.');
    await loadAdminData();
  } catch (err) {
    Toast.error(err.message);
  }
}

// ---------------- TRANSACTION MONITORING ----------------
function renderAdminTransactionsTable(txns) {
  const tableBody = document.getElementById('adminGlobalTxnTableBody');
  if (!tableBody) return;

  if (txns.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">No global transactions recorded.</td></tr>`;
    return;
  }

  tableBody.innerHTML = txns.map(t => `
    <tr>
      <td style="font-family: var(--font-mono); font-size: 0.85rem;">${t.transactionId}</td>
      <td>${new Date(t.createdAt).toLocaleString()}</td>
      <td style="font-family: var(--font-mono);">${t.senderAccount}</td>
      <td style="font-family: var(--font-mono); font-weight: 700;">${t.receiverAccount}</td>
      <td><span class="badge badge-info">${t.type}</span></td>
      <td style="font-weight: 700; font-family: var(--font-mono); color: var(--accent-cyan);">₹${t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      <td><span class="badge badge-success">${t.status}</span></td>
    </tr>
  `).join('');
}

// ---------------- AUDIT LOGS ----------------
function renderAuditLogs(logs) {
  const tableBody = document.getElementById('adminAuditLogsTableBody');
  if (!tableBody) return;

  if (logs.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">No audit logs recorded.</td></tr>`;
    return;
  }

  tableBody.innerHTML = logs.map(l => `
    <tr>
      <td style="font-family: var(--font-mono); font-size: 0.85rem;">${l.logId}</td>
      <td>${new Date(l.timestamp).toLocaleString()}</td>
      <td><span class="badge badge-info">${l.action}</span></td>
      <td style="color: var(--text-primary); font-size: 0.88rem;">${l.description}</td>
      <td style="font-family: var(--font-mono); font-size: 0.82rem; color: var(--text-muted);">${l.userId || l.adminId || 'SYSTEM'}</td>
      <td>
        <span class="badge ${l.status === 'SUCCESS' ? 'badge-success' : 'badge-danger'}">${l.status}</span>
      </td>
    </tr>
  `).join('');
}

// ---------------- EXPORTS ----------------
function exportTransactionsCSV() {
  const rows = [
    ['Transaction ID', 'Date', 'Sender Account', 'Receiver Account', 'Type', 'Amount', 'Status']
  ];
  allTransactions.forEach(t => {
    rows.push([t.transactionId, t.createdAt, t.senderAccount, t.receiverAccount, t.type, t.amount, t.status]);
  });
  if (window.StatementGenerator) {
    StatementGenerator.exportCSV('GG_BANK_Global_Ledger.csv', rows);
  }
}

function exportAuditLogsCSV() {
  const rows = [
    ['Log ID', 'Timestamp', 'Action', 'Description', 'Actor ID', 'Status']
  ];
  allAuditLogs.forEach(l => {
    rows.push([l.logId, l.timestamp, l.action, l.description, l.userId || l.adminId, l.status]);
  });
  if (window.StatementGenerator) {
    StatementGenerator.exportCSV('GG_BANK_Audit_Logs.csv', rows);
  }
}

// ---------------- EVENT LISTENERS SETUP ----------------
function setupAdminEventListeners() {
  // Sidebar navigation
  document.querySelectorAll('.sidebar .nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const viewId = item.getAttribute('data-view');
      if (viewId) switchAdminView(viewId);
    });
  });

  // Forms
  document.getElementById('editCustomerForm')?.addEventListener('submit', handleSaveCustomerEdit);
  document.getElementById('adminDepositForm')?.addEventListener('submit', handleAdminDepositSubmit);
  document.getElementById('officeForm')?.addEventListener('submit', handleOfficeFormSubmit);
  document.getElementById('approveLoanForm')?.addEventListener('submit', handleApproveLoanSubmit);
  document.getElementById('approveBranchOfficeSelect')?.addEventListener('change', updateLoanOfficerOptions);

  // Customer search
  document.getElementById('adminCustomerSearch')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allCustomers.filter(c => 
      c.name.toLowerCase().includes(term) ||
      c.email.toLowerCase().includes(term) ||
      (c.accountNumber && c.accountNumber.includes(term))
    );
    renderCustomersTable(filtered);
  });

  // Modal close handlers
  document.querySelectorAll('.modal-close-btn, [data-modal-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('active'));
    });
  });
}

async function checkDatabaseConnection() {
  const badge = document.getElementById('dbStatusBadge');
  if (badge) badge.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Testing Firebase...';
  
  if (window.testFirebaseConnection) {
    const result = await window.testFirebaseConnection();
    if (result.connected) {
      Toast.success(`✅ Live connection to Firebase Firestore active (${result.latencyMs}ms latency)`, 'Database Online');
      if (badge) badge.innerHTML = `<i class="fa-solid fa-circle-check" style="color: var(--success);"></i> <span>Firebase Firestore Live (${result.latencyMs}ms)</span>`;
    } else {
      Toast.info(`Database synced: ${result.message}`, 'Database Status');
      if (badge) badge.innerHTML = `<i class="fa-solid fa-circle-check" style="color: var(--accent-cyan);"></i> <span>Database Ready: gg-bank-fc100</span>`;
    }
  }
}

// Global exports
window.switchAdminView = switchAdminView;
window.openCustomerDetailModal = openCustomerDetailModal;
window.openEditCustomerModal = openEditCustomerModal;
window.openAdminDepositModal = openAdminDepositModal;
window.openAddOfficeModal = openAddOfficeModal;
window.openEditOfficeModal = openEditOfficeModal;
window.deleteOffice = deleteOffice;
window.openApproveLoanModal = openApproveLoanModal;
window.updateCustomerStatus = updateCustomerStatus;
window.deleteCustomer = deleteCustomer;
window.rejectLoan = rejectLoan;
window.checkDatabaseConnection = checkDatabaseConnection;
window.exportTransactionsCSV = exportTransactionsCSV;
window.exportAuditLogsCSV = exportAuditLogsCSV;
window.logout = () => Auth.logout();
