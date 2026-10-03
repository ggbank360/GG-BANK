/**
 * GG BANK - Banking Officer Workspace Controller (officer-dashboard.js)
 * Full Officer Dashboard: 10 KPIs, Assigned Loans, KYC Queue, Transactions, Alerts.
 * Officers see loans assigned to them by Admin during loan approval.
 */

let currentOfficer = null;
let allLoans = [];
let assignedLoans = [];
let allCustomers = [];
let allTransactions = [];
let allNotifications = [];
let allUpiRequests = [];
let filteredAssignedLoans = [];

let activeOfficerModalCustomer = null;
let activeOfficerModalDocType = 'ALL';

// ─────────────────────────────────────────────
// Bootstrap
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const user = Auth.getCurrentUser();
  if (!user) {
    window.location.href = 'officer-login.html';
    return;
  }

  currentOfficer = user;
  initOfficerUi(currentOfficer);

  await loadOfficerData();
  window.__adminRefreshData = loadOfficerData;
});

// ─────────────────────────────────────────────
// UI Initialisation
// ─────────────────────────────────────────────
function initOfficerUi(officer) {
  const name        = officer.name        || 'Banking Officer';
  const role        = officer.designation || officer.role || 'Credit Officer';
  const branch      = officer.branch      || 'Central Tech Branch';
  const officerId   = officer.userId      || officer.officerId || officer.employeeId || 'off-001';
  const department  = (officer.department || '').toUpperCase();

  const sName       = document.getElementById('officerSidebarName');
  const sRole       = document.getElementById('officerSidebarRole');
  const topName     = document.getElementById('officerTopbarGreeting');
  const branchBadge = document.getElementById('officerBranchBadge');
  const pageDesc    = document.getElementById('officerPageDesc');
  const avatarEl    = document.getElementById('officerAvatarInitials');

  if (sName)      sName.textContent  = name;
  if (sRole) {
    const deptLabel = department === 'LOAN' ? 'Loan Officer' :
                      department === 'ACCOUNT_MANAGEMENT' ? 'Account Manager' :
                      department === 'TREASURY' ? 'Treasury Officer' : role;
    sRole.textContent  = deptLabel;
  }
  if (topName)    topName.textContent = `${name} (${role})`;
  if (branchBadge) branchBadge.innerHTML = `<i class="fa-solid fa-building"></i> ${branch}`;
  
  if (pageDesc) {
    if (department === 'LOAN') {
      pageDesc.textContent = `${name} — Loan & Credit Underwriting Desk: Review loan applications, inspect applicant credit history, and manage assigned credit cases for ${branch}.`;
    } else if (department === 'ACCOUNT_MANAGEMENT') {
      pageDesc.textContent = `${name} — Account Management & KYC Operations: Verify customer-uploaded documents, approve custom UPI handles, and supervise accounts for ${branch}.`;
    } else {
      pageDesc.textContent = `${name} — Manage assigned cases, KYC verifications, custom UPI handles, and customer operations for ${branch}.`;
    }
  }

  if (avatarEl) {
    const initials = name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
    avatarEl.textContent = initials;
  }

  // Auto-switch to department-specific default view
  if (department === 'ACCOUNT_MANAGEMENT') {
    switchOfficerSection('kycQueueSection');
  } else if (department === 'LOAN') {
    switchOfficerSection('assignedLoansSection');
  }
}

// ─────────────────────────────────────────────
// Main Data Load
// ─────────────────────────────────────────────
async function loadOfficerData() {
  try {
    const [loanRes, custRes, txnRes, notifRes, upiRes] = await Promise.all([
      API.request('/admin/loans'),
      API.request('/admin/customers'),
      API.request('/admin/transactions'),
      API.request('/admin/notifications'),
      API.request('/upi/requests')
    ]);

    allLoans         = loanRes.data  || [];
    allCustomers     = custRes.data  || [];
    allTransactions  = txnRes.data   || [];
    allNotifications = notifRes.data || [];
    allUpiRequests   = upiRes.data   || [];

    // Filter loans assigned to THIS officer
    const myId = currentOfficer ? (currentOfficer.userId || currentOfficer.officerId || currentOfficer.employeeId) : null;
    if (myId) {
      assignedLoans = allLoans.filter(l =>
        l.assignedOfficerId === myId ||
        (l.assignedOfficerName && currentOfficer.name && l.assignedOfficerName.toLowerCase().includes(currentOfficer.name.toLowerCase()))
      );
      // Fallback: if no loans directly assigned to this officer, show all pending/review loans
      if (assignedLoans.length === 0) {
        assignedLoans = allLoans.filter(l => l.status === 'PENDING' || l.status === 'UNDER_REVIEW' || l.status === 'SUBMITTED');
        if (assignedLoans.length === 0) assignedLoans = allLoans;
      }
    } else {
      assignedLoans = allLoans; // fallback: show all
    }
    filteredAssignedLoans = [...assignedLoans];

    updateOfficerKpis();
    renderAssignedLoans();
    renderKycQueue();
    renderUpiApprovals();
    renderTransactions();
    renderAlerts();
    renderOfficerCustomers();
    renderProfileEditRequests();

  } catch (err) {
    console.error('Failed to load officer workspace:', err);
    Utils.showToast('Failed to load workspace: ' + (err.message || 'Unknown error'), 'error');
  }
}

// ─────────────────────────────────────────────
// 10-KPI Update
// ─────────────────────────────────────────────
function updateOfficerKpis() {
  const today = new Date();
  const todayStr = today.toDateString();

  // 1. Customers assigned (all)
  const totalCustomers = allCustomers.length;

  // 2. New account applications (PENDING_APPROVAL)
  const newApplications = allCustomers.filter(c =>
    (c.status === 'PENDING_APPROVAL' || c.accountStatus === 'PENDING_APPROVAL')
  ).length;

  // 3. Pending KYC
  const pendingKyc = allCustomers.filter(c =>
    c.status === 'PENDING_APPROVAL' || c.kycStatus === 'PENDING_REVIEW'
  ).length;

  // 4. Pending assigned loans
  const pendingAssigned = assignedLoans.filter(l =>
    l.status === 'PENDING' || l.status === 'UNDER_REVIEW'
  ).length;

  // 5. Pending transactions requiring review
  const pendingTxns = allTransactions.filter(t => t.status === 'PENDING').length;

  // 6. Today's deposits
  const todayDeposits = allTransactions.filter(t =>
    t.type === 'DEPOSIT' && new Date(t.createdAt).toDateString() === todayStr
  );
  const todayDepositAmt = todayDeposits.reduce((s, t) => s + (t.amount || 0), 0);

  // 7. Today's withdrawals
  const todayWithdrawals = allTransactions.filter(t =>
    t.type === 'WITHDRAWAL' && new Date(t.createdAt).toDateString() === todayStr
  );
  const todayWithdrawalAmt = todayWithdrawals.reduce((s, t) => s + (t.amount || 0), 0);

  // 8. Today's transfers
  const todayTransfers = allTransactions.filter(t =>
    t.type === 'TRANSFER' && new Date(t.createdAt).toDateString() === todayStr
  );
  const todayTransferAmt = todayTransfers.reduce((s, t) => s + (t.amount || 0), 0);

  // 9. Pending service requests (loan EMIs overdue, loan applications, KYC pending)
  const serviceRequests = pendingKyc + pendingAssigned;

  // 10. Unread alerts
  const unreadAlerts = allNotifications.filter(n => !n.read).length;

  // ── Render ──
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  set('kpi1TotalCustomers', totalCustomers);
  set('kpi2NewApplications', newApplications);
  set('kpi3PendingKyc', pendingKyc);
  set('kpi4PendingLoans', pendingAssigned);
  set('kpi5PendingTxns', pendingTxns);
  set('kpi6TodayDeposits', '₹' + todayDepositAmt.toLocaleString('en-IN'));
  set('kpi6DepositCount', todayDeposits.length + ' transaction' + (todayDeposits.length !== 1 ? 's' : ''));
  set('kpi7TodayWithdrawals', '₹' + todayWithdrawalAmt.toLocaleString('en-IN'));
  set('kpi7WithdrawalCount', todayWithdrawals.length + ' transaction' + (todayWithdrawals.length !== 1 ? 's' : ''));
  set('kpi8TodayTransfers', '₹' + todayTransferAmt.toLocaleString('en-IN'));
  set('kpi8TransferCount', todayTransfers.length + ' transaction' + (todayTransfers.length !== 1 ? 's' : ''));
  set('kpi9ServiceRequests', serviceRequests);
  set('kpi10Alerts', unreadAlerts);

  // Sidebar/tab badges
  set('tabAssignedCount', assignedLoans.length);
  set('tabKycCount', pendingKyc);
  set('tabAlertCount', unreadAlerts);

  const navAssigned = document.getElementById('navAssignedLoanBadge');
  if (navAssigned) {
    navAssigned.textContent = pendingAssigned;
    navAssigned.style.display = pendingAssigned > 0 ? 'inline-block' : 'none';
  }
  const navAlert = document.getElementById('navAlertBadge');
  if (navAlert) {
    navAlert.textContent = unreadAlerts;
    navAlert.style.display = unreadAlerts > 0 ? 'inline-block' : 'none';
  }
}

// ─────────────────────────────────────────────
// Assigned Loans Render
// ─────────────────────────────────────────────
function filterAssignedLoans() {
  const filterVal = document.getElementById('assignedLoanFilter')?.value || 'ALL';
  if (filterVal === 'ALL') {
    filteredAssignedLoans = [...assignedLoans];
  } else {
    filteredAssignedLoans = assignedLoans.filter(l => (l.status || '').toUpperCase() === filterVal);
  }
  renderAssignedLoans();
}

function renderAssignedLoans() {
  const container = document.getElementById('assignedLoansContainer');
  const badge = document.getElementById('assignedLoansBadge');
  if (!container) return;

  if (badge) badge.textContent = `${filteredAssignedLoans.length} Cases`;

  if (filteredAssignedLoans.length === 0) {
    if (assignedLoans.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 48px 20px; color: var(--text-muted);">
          <i class="fa-solid fa-inbox" style="font-size: 2.8rem; margin-bottom: 14px; opacity: 0.5; display: block;"></i>
          <div style="font-size: 1.05rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">No Loans Assigned</div>
          <div style="font-size: 0.85rem;">Loans assigned to you by the Admin will appear here after approval.</div>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-muted);">
          <i class="fa-solid fa-filter" style="font-size: 2rem; margin-bottom: 10px;"></i>
          <div>No loans match the selected filter.</div>
        </div>
      `;
    }
    return;
  }

  container.innerHTML = filteredAssignedLoans.map(l => {
    const status = l.status || 'PENDING';
    let statusClass = 'status-pending';
    let badgeClass  = 'badge-warning';

    if (status === 'ACTIVE' || status === 'APPROVED') {
      statusClass = 'status-active'; badgeClass = 'badge-success';
    } else if (status === 'UNDER_REVIEW') {
      statusClass = 'status-review'; badgeClass = 'badge-info';
    } else if (status === 'CLOSED' || status === 'COMPLETED') {
      statusClass = 'status-closed'; badgeClass = 'badge-secondary';
    } else if (status === 'REJECTED') {
      badgeClass = 'badge-danger';
    }

    const appliedDate = l.createdAt ? new Date(l.createdAt).toLocaleDateString('en-IN') : 'N/A';
    const approvedDate = l.approvedAt || l.disbursedAt
      ? new Date(l.approvedAt || l.disbursedAt).toLocaleDateString('en-IN')
      : 'Pending';
    const emi  = (l.estimatedEMI || 0).toLocaleString('en-IN');
    const amt  = (l.requestedAmount || 0).toLocaleString('en-IN');
    const bal  = (l.outstandingBalance !== undefined ? l.outstandingBalance : l.requestedAmount || 0).toLocaleString('en-IN');
    const paid = l.paidEmisCount || 0;
    const total= l.totalEmisCount || l.tenure || 0;

    const progress = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

    // Customer Loan Application History
    const custAccount = l.accountNumber;
    const custId = l.userId || l.customerId;
    const customerPastLoans = allLoans.filter(loan =>
      (custAccount && loan.accountNumber === custAccount) ||
      (custId && (loan.userId === custId || loan.customerId === custId)) ||
      (l.customerName && loan.customerName && loan.customerName.toLowerCase() === l.customerName.toLowerCase())
    );
    const totalCustomerApplied = customerPastLoans.length;
    const activeCustomerLoans = customerPastLoans.filter(x => x.status === 'ACTIVE' || x.status === 'APPROVED').length;
    const closedCustomerLoans = customerPastLoans.filter(x => x.status === 'CLOSED' || x.status === 'COMPLETED').length;

    return `
      <div class="assigned-loan-card ${statusClass}">
        <div class="loan-card-header">
          <div>
            <div style="font-family: var(--font-mono); font-size: 0.78rem; color: var(--accent-cyan);">
              ${l.loanId} ${l.applicationRef ? '<span style="color: var(--text-muted);">← ' + l.applicationRef + '</span>' : ''}
            </div>
            <div style="font-size: 1.1rem; font-weight: 800; color: #fff; margin-top: 2px;">
              ${l.loanType}
            </div>
            <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 2px;">
              Account: <span style="font-family: var(--font-mono);">${l.accountNumber}</span>
              ${l.customerName ? ' &bull; ' + l.customerName : ''}
            </div>
          </div>
          <div style="text-align: right;">
            <span class="badge ${badgeClass}">${status}</span>
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 4px;">Applied: ${appliedDate}</div>
            ${status === 'ACTIVE' || status === 'APPROVED' ? `<div style="font-size: 0.72rem; color: var(--success);">Disbursed: ${approvedDate}</div>` : ''}
          </div>
        </div>

        <!-- Customer Total Applied Loans Badge -->
        <div style="background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: var(--radius-sm); padding: 8px 12px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
          <div style="font-size: 0.8rem; color: #fff;">
            <i class="fa-solid fa-clock-rotate-left" style="color: var(--accent-cyan); margin-right: 6px;"></i>
            Customer Loan History: <strong style="color: var(--accent-cyan); font-family: var(--font-mono); font-size: 0.88rem;">${totalCustomerApplied} Total Applied</strong>
            <span style="color: var(--text-muted); font-size: 0.75rem; margin-left: 6px;">(${activeCustomerLoans} active &bull; ${closedCustomerLoans} repaid)</span>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="viewAssignedLoanDetails('${l.loanId}')" style="padding: 3px 8px; font-size: 0.72rem;">
            <i class="fa-solid fa-list-check"></i> Inspect History
          </button>
        </div>

        <div class="loan-meta-grid">
          <div class="loan-meta-item">
            <div class="lmi-label">Principal</div>
            <div class="lmi-val" style="color: var(--accent-cyan);">₹${amt}</div>
          </div>
          <div class="loan-meta-item">
            <div class="lmi-label">Monthly EMI</div>
            <div class="lmi-val" style="color: var(--warning);">₹${emi}/mo</div>
          </div>
          <div class="loan-meta-item">
            <div class="lmi-label">Outstanding</div>
            <div class="lmi-val" style="color: ${l.outstandingBalance === 0 ? 'var(--success)' : 'var(--text-primary)'};">₹${bal}</div>
          </div>
          <div class="loan-meta-item">
            <div class="lmi-label">Tenure</div>
            <div class="lmi-val">${l.tenure || 0} Months</div>
          </div>
          <div class="loan-meta-item">
            <div class="lmi-label">Interest Rate</div>
            <div class="lmi-val">${l.interestRate || 0}% p.a.</div>
          </div>
          <div class="loan-meta-item">
            <div class="lmi-label">EMI Progress</div>
            <div class="lmi-val">${paid}/${total}</div>
          </div>
        </div>

        ${(status === 'ACTIVE' || status === 'APPROVED') && total > 0 ? `
          <div style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--text-muted); margin-bottom: 4px;">
              <span>Repayment Progress</span>
              <span>${progress}%</span>
            </div>
            <div style="height: 5px; background: rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden;">
              <div style="height: 100%; width: ${progress}%; background: linear-gradient(90deg, var(--accent-cyan), #10b981); border-radius: 4px; transition: width 0.5s ease;"></div>
            </div>
          </div>
        ` : ''}

        ${l.purpose ? `
          <div style="font-size: 0.8rem; color: var(--text-secondary); background: rgba(0,0,0,0.15); padding: 6px 10px; border-radius: var(--radius-sm); margin-bottom: 12px;">
            <strong style="color: var(--text-muted);">Purpose:</strong> ${l.purpose}
          </div>
        ` : ''}

        ${l.adminRemarks ? `
          <div style="font-size: 0.78rem; color: var(--text-muted); padding: 4px 0; margin-bottom: 8px;">
            <i class="fa-solid fa-note-sticky" style="color: var(--accent-cyan); margin-right: 4px;"></i>
            ${l.adminRemarks}
          </div>
        ` : ''}

        <div style="display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; border-top: 1px solid var(--border-color-subtle); padding-top: 12px; margin-top: 4px;">
          <button class="btn btn-secondary btn-sm" onclick="viewAssignedLoanDetails('${l.loanId}')">
            <i class="fa-solid fa-eye"></i> View Dossier & History
          </button>
          ${(status === 'ACTIVE' || status === 'APPROVED') && l.nextEmiDueDate ? `
            <span style="display: flex; align-items: center; gap: 6px; font-size: 0.78rem; color: var(--warning); background: rgba(245,158,11,0.1); padding: 4px 10px; border-radius: var(--radius-sm); border: 1px solid rgba(245,158,11,0.25);">
              <i class="fa-solid fa-calendar-days"></i> Next EMI: ${l.nextEmiDueDate}
            </span>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// ─────────────────────────────────────────────
// Assigned Loan Detail Modal
// ─────────────────────────────────────────────
function viewAssignedLoanDetails(loanId) {
  const l = assignedLoans.find(loan => loan.loanId === loanId) || allLoans.find(loan => loan.loanId === loanId);
  if (!l) return;

  const body = document.getElementById('officerLoanDetailBody');
  if (!body) return;

  const status = l.status || 'PENDING';
  const badgeClass = status === 'ACTIVE' || status === 'APPROVED' ? 'badge-success'
                    : status === 'REJECTED' ? 'badge-danger'
                    : status === 'UNDER_REVIEW' ? 'badge-info'
                    : 'badge-warning';

  // Calculate customer's complete lifetime loan history
  const customerAccount = l.accountNumber;
  const customerUserId = l.userId || l.customerId;
  const custLoans = allLoans.filter(loan =>
    (customerAccount && loan.accountNumber === customerAccount) ||
    (customerUserId && (loan.userId === customerUserId || loan.customerId === customerUserId)) ||
    (l.customerName && loan.customerName && loan.customerName.toLowerCase() === l.customerName.toLowerCase())
  );
  const totalApplied = custLoans.length;
  const activeCount = custLoans.filter(x => x.status === 'ACTIVE' || x.status === 'APPROVED').length;
  const closedCount = custLoans.filter(x => x.status === 'CLOSED' || x.status === 'COMPLETED').length;
  const pendingCount = custLoans.filter(x => x.status === 'PENDING' || x.status === 'UNDER_REVIEW').length;
  const rejectedCount = custLoans.filter(x => x.status === 'REJECTED').length;

  body.innerHTML = `
    <div style="background: var(--bg-surface); padding: 16px; border-radius: var(--radius-md); text-align: center; margin-bottom: 8px;">
      <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Loan Principal</div>
      <div style="font-size: 1.8rem; font-weight: 800; color: var(--accent-cyan); font-family: var(--font-mono); margin-top: 4px;">
        ₹${(l.requestedAmount || 0).toLocaleString('en-IN')}
      </div>
      <span class="badge ${badgeClass}" style="margin-top: 6px;">Status: ${status}</span>
    </div>

    <!-- Lifetime Applied Loans by Customer Section -->
    <div style="background: rgba(56, 189, 248, 0.05); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: var(--radius-md); padding: 14px; margin-bottom: 12px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 6px;">
        <strong style="color: var(--accent-cyan); font-size: 0.88rem;">
          <i class="fa-solid fa-clock-rotate-left"></i> Customer Lifetime Loan Applications
        </strong>
        <span class="badge badge-info" style="font-size: 0.72rem;">
          ${totalApplied} Application${totalApplied === 1 ? '' : 's'} Total
        </span>
      </div>

      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; text-align: center; margin-bottom: 10px; font-size: 0.78rem;">
        <div style="background: rgba(0,0,0,0.3); padding: 6px; border-radius: 4px;">
          <div style="color: var(--text-muted); font-size: 0.68rem;">TOTAL APPLIED</div>
          <strong style="color: #fff; font-size: 1rem;">${totalApplied}</strong>
        </div>
        <div style="background: rgba(0,0,0,0.3); padding: 6px; border-radius: 4px;">
          <div style="color: var(--success); font-size: 0.68rem;">ACTIVE</div>
          <strong style="color: var(--success); font-size: 1rem;">${activeCount}</strong>
        </div>
        <div style="background: rgba(0,0,0,0.3); padding: 6px; border-radius: 4px;">
          <div style="color: var(--text-secondary); font-size: 0.68rem;">CLOSED/REPAID</div>
          <strong style="color: #fff; font-size: 1rem;">${closedCount}</strong>
        </div>
        <div style="background: rgba(0,0,0,0.3); padding: 6px; border-radius: 4px;">
          <div style="color: var(--warning); font-size: 0.68rem;">PENDING/REV</div>
          <strong style="color: var(--warning); font-size: 1rem;">${pendingCount}</strong>
        </div>
      </div>

      ${custLoans.length > 0 ? `
        <div style="max-height: 140px; overflow-y: auto; background: rgba(0,0,0,0.2); border-radius: 4px; padding: 4px;">
          <table style="width: 100%; font-size: 0.74rem; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 1px solid rgba(255,255,255,0.08); color: var(--text-muted);">
                <th style="text-align: left; padding: 4px 6px;">Loan ID</th>
                <th style="text-align: left; padding: 4px 6px;">Type</th>
                <th style="text-align: left; padding: 4px 6px;">Amount</th>
                <th style="text-align: left; padding: 4px 6px;">Status</th>
                <th style="text-align: right; padding: 4px 6px;">Date</th>
              </tr>
            </thead>
            <tbody>
              ${custLoans.map(cl => `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.03); ${cl.loanId === l.loanId ? 'background: rgba(56,189,248,0.12); font-weight: 600;' : ''}">
                  <td style="padding: 4px 6px; font-family: var(--font-mono); color: var(--accent-cyan);">${cl.loanId}</td>
                  <td style="padding: 4px 6px; color: #fff;">${cl.loanType}</td>
                  <td style="padding: 4px 6px; font-family: var(--font-mono);">₹${(cl.requestedAmount || 0).toLocaleString('en-IN')}</td>
                  <td style="padding: 4px 6px;"><span class="badge ${cl.status === 'ACTIVE' || cl.status === 'APPROVED' ? 'badge-success' : cl.status === 'REJECTED' ? 'badge-danger' : 'badge-warning'}" style="font-size: 0.62rem;">${cl.status || 'PENDING'}</span></td>
                  <td style="padding: 4px 6px; text-align: right; color: var(--text-muted);">${cl.createdAt ? new Date(cl.createdAt).toLocaleDateString('en-IN') : 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}
    </div>

    ${[
      ['Loan ID / Ref', `<span style="font-family: var(--font-mono);">${l.loanId}</span>`],
      ['Application Ref', l.applicationRef ? `<span style="font-family: var(--font-mono);">${l.applicationRef}</span>` : 'N/A'],
      ['Applicant Account', `<span style="font-family: var(--font-mono);">${l.accountNumber}</span>`],
      ['Customer Name', l.customerName || 'N/A'],
      ['Loan Type', `<strong>${l.loanType}</strong>`],
      ['Monthly Income', `₹${(l.monthlyIncome || 0).toLocaleString('en-IN')}`],
      ['Tenure & Interest', `${l.tenure || 0} Months @ ${l.interestRate || 0}% p.a.`],
      ['Estimated Monthly EMI', `<strong style="color: var(--warning); font-family: var(--font-mono);">₹${(l.estimatedEMI || 0).toLocaleString('en-IN')}</strong>`],
      ['Outstanding Balance', `<strong style="font-family: var(--font-mono);">₹${(l.outstandingBalance !== undefined ? l.outstandingBalance : l.requestedAmount || 0).toLocaleString('en-IN')}</strong>`],
      ['Total Repayment', `<span style="font-family: var(--font-mono);">₹${(l.totalRepayment || 0).toLocaleString('en-IN')}</span>`],
      ['EMIs Paid', `${l.paidEmisCount || 0} / ${l.totalEmisCount || l.tenure || 0}`],
      ['Next EMI Due Date', l.nextEmiDueDate || 'N/A'],
      ['Purpose', l.purpose || 'General financing'],
      ['Admin Remarks', l.adminRemarks || 'None'],
      ['Processing Fee', l.processingFee ? `₹${l.processingFee.toLocaleString('en-IN')}` : 'N/A'],
      ['Net Disbursed', l.netDisbursedAmount ? `₹${l.netDisbursedAmount.toLocaleString('en-IN')}` : 'N/A'],
      ['Approved At', l.approvedAt || l.disbursedAt || 'Pending'],
      ['Assigned Officer', l.assignedOfficerName || 'You'],
    ].map(([label, val]) => `
      <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 0.86rem;">
        <span style="color: var(--text-muted);">${label}:</span>
        <span style="color: #fff; text-align: right; max-width: 260px;">${val}</span>
      </div>
    `).join('')}
  `;

  document.getElementById('officerLoanDetailModal').classList.add('active');
}
window.viewAssignedLoanDetails = viewAssignedLoanDetails;

// ─────────────────────────────────────────────
// KYC Queue Render
// ─────────────────────────────────────────────
function renderKycQueue() {
  const tbody = document.getElementById('officerKycQueueBody');
  const badge = document.getElementById('kycQueueBadge');
  if (!tbody) return;

  const pendingKyc = allCustomers.filter(c =>
    c.status === 'PENDING_APPROVAL' || c.kycStatus === 'PENDING_REVIEW'
  );
  if (badge) badge.textContent = `${allCustomers.length} Applications (${pendingKyc.length} Pending)`;

  if (allCustomers.length === 0) {
    AdminCommon.renderEmpty('officerKycQueueBody', 'No customer records in KYC stream.', 'fa-users');
    return;
  }

  tbody.innerHTML = allCustomers.map(c => {
    const status   = c.status || c.accountStatus || 'ACTIVE';
    const isPending = (status === 'PENDING_APPROVAL');
    const docs      = c.documents || {};
    const panNum    = docs.panNumber    || 'ABCDE1234F';
    const aadhaarNum = docs.aadhaarNumber || '2345 6789 0123';

    return `
      <tr>
        <td>
          <strong style="font-family: var(--font-mono); color: var(--accent-cyan);">${c.userId}</strong>
        </td>
        <td>
          <strong style="color: var(--text-primary);">${c.name}</strong>
          <div style="font-size: 0.76rem; color: var(--text-muted);">${c.email}</div>
        </td>
        <td>
          <span style="font-family: var(--font-mono); color: #fff;">${c.accountNumber}</span>
        </td>
        <td>
          <div style="display: flex; gap: 4px; flex-wrap: wrap;">
            <span class="kyc-doc-badge pan" onclick="openOfficerKYCViewer('${c.userId}', 'PAN')" title="Click to View PAN Document">
              <i class="fa-solid fa-id-card"></i> PAN: ${panNum}
            </span>
            <span class="kyc-doc-badge aadhaar" onclick="openOfficerKYCViewer('${c.userId}', 'AADHAAR')" title="Click to View Aadhaar Card">
              <i class="fa-solid fa-fingerprint"></i> Aadhaar: ${aadhaarNum}
            </span>
          </div>
        </td>
        <td>
          <span class="badge ${isPending ? 'badge-warning' : 'badge-success'}">
            ${isPending ? 'PENDING APPROVAL' : status}
          </span>
        </td>
        <td style="text-align: right;">
          <div class="table-action-btns" style="justify-content: flex-end;">
            <button class="btn btn-primary btn-sm" onclick="openOfficerKYCViewer('${c.userId}')" title="View Submitted KYC Documents">
              <i class="fa-solid fa-file-shield"></i> View Docs
            </button>
            ${isPending ? `
              <button class="btn btn-success btn-sm" onclick="officerApproveKYC('${c.userId}', '${c.name}')" title="Approve KYC & Activate Account">
                <i class="fa-solid fa-circle-check"></i> Approve
              </button>
            ` : ''}
            <a href="customer-details.html?id=${c.userId}" class="btn btn-secondary btn-sm" title="View Details">
              <i class="fa-solid fa-eye"></i>
            </a>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ─────────────────────────────────────────────
// Transactions Render
// ─────────────────────────────────────────────
function renderTransactions() {
  const tbody = document.getElementById('officerTxnBody');
  if (!tbody) return;

  const recent = allTransactions.slice(0, 20);

  if (recent.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--text-muted);">No transactions to display.</td></tr>`;
    return;
  }

  tbody.innerHTML = recent.map(t => {
    const typeColorMap = {
      DEPOSIT: 'var(--success)',
      WITHDRAWAL: 'var(--danger)',
      TRANSFER: 'var(--accent-cyan)',
      LOAN_DISBURSEMENT: '#a78bfa',
      LOAN_EMI_PAYMENT: '#f59e0b',
      BILL_PAYMENT: '#fb923c'
    };
    const typeColor = typeColorMap[t.type] || 'var(--text-muted)';
    const statusClass = t.status === 'COMPLETED' ? 'badge-success' : t.status === 'PENDING' ? 'badge-warning' : 'badge-danger';
    const date = t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'N/A';

    return `
      <tr>
        <td><span style="font-family: var(--font-mono); font-size: 0.78rem; color: var(--accent-cyan);">${t.transactionId}</span></td>
        <td><span style="color: ${typeColor}; font-weight: 600; font-size: 0.8rem;">${t.type?.replace(/_/g, ' ')}</span></td>
        <td>
          <div style="font-size: 0.78rem; font-family: var(--font-mono);">
            <span style="color: var(--text-muted);">From:</span> ${t.senderAccount || 'N/A'}<br>
            <span style="color: var(--text-muted);">To:</span> ${t.receiverAccount || 'N/A'}
          </div>
        </td>
        <td><strong style="font-family: var(--font-mono); color: ${typeColor};">₹${(t.amount || 0).toLocaleString('en-IN')}</strong></td>
        <td><span class="badge ${statusClass}" style="font-size: 0.7rem;">${t.status}</span></td>
        <td style="font-size: 0.78rem; color: var(--text-muted);">${date}</td>
      </tr>
    `;
  }).join('');
}

// ─────────────────────────────────────────────
// Alerts Render
// ─────────────────────────────────────────────
function renderAlerts() {
  const container = document.getElementById('officerAlertsContainer');
  if (!container) return;

  if (allNotifications.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--text-muted);">
        <i class="fa-solid fa-bell-slash" style="font-size: 2.2rem; margin-bottom: 12px; display: block;"></i>
        <div style="font-size: 0.9rem;">No system alerts at this time.</div>
      </div>
    `;
    return;
  }

  const typeIconMap = {
    TRANSACTION:  { icon: 'fa-money-bill-transfer', color: '#38bdf8', bg: 'rgba(56,189,248,0.12)' },
    SECURITY:     { icon: 'fa-shield-halved',       color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    BUDGET:       { icon: 'fa-piggy-bank',          color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    SYSTEM:       { icon: 'fa-gear',               color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
    LOAN:         { icon: 'fa-hand-holding-dollar', color: '#fb923c', bg: 'rgba(251,146,60,0.12)'  },
    DEFAULT:      { icon: 'fa-bell',               color: '#e879f9', bg: 'rgba(232,121,249,0.12)' }
  };

  container.innerHTML = allNotifications.map(n => {
    const meta = typeIconMap[n.type] || typeIconMap.DEFAULT;
    const isUnread = !n.read;
    const date = n.createdAt ? new Date(n.createdAt).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '';

    return `
      <div class="alert-item ${isUnread ? 'unread' : ''}" style="cursor: default;">
        <div class="alert-dot" style="background: ${meta.bg}; color: ${meta.color};">
          <i class="fa-solid ${meta.icon}"></i>
        </div>
        <div style="flex: 1; min-width: 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap;">
            <strong style="color: ${isUnread ? '#fff' : 'var(--text-secondary)'}; font-size: 0.9rem;">${n.title}</strong>
            <div style="display: flex; align-items: center; gap: 6px;">
              ${isUnread ? `<span style="width: 7px; height: 7px; background: var(--accent-cyan); border-radius: 50%; flex-shrink: 0;"></span>` : ''}
              <span style="font-size: 0.72rem; color: var(--text-muted); white-space: nowrap;">${date}</span>
            </div>
          </div>
          <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 3px; line-height: 1.4;">${n.message}</div>
          ${n.type ? `<span class="badge badge-secondary" style="font-size: 0.65rem; margin-top: 5px;">${n.type}</span>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

async function markAllAlertsRead() {
  allNotifications.forEach(n => { n.read = true; });
  const notifs = API.getMock('gg_notifications');
  notifs.forEach(n => { n.read = true; });
  API.setMock('gg_notifications', notifs);
  renderAlerts();
  updateOfficerKpis();
  Utils.showToast('All alerts marked as read.', 'success');
}
window.markAllAlertsRead = markAllAlertsRead;

// ─────────────────────────────────────────────
// KYC Viewer (reused from old officer-dashboard)
// ─────────────────────────────────────────────
function openOfficerKYCViewer(userId, initialDoc = 'ALL') {
  const customer = allCustomers.find(c => c.userId === userId);
  if (!customer) return;

  activeOfficerModalCustomer = customer;
  activeOfficerModalDocType = initialDoc;

  const headerEl = document.getElementById('kycDocHolderName');
  if (headerEl) {
    headerEl.textContent = `${customer.name} (${customer.accountNumber || customer.userId})`;
  }

  const actionsEl = document.getElementById('kycModalActionBtns');
  if (actionsEl) {
    const status = customer.status || customer.accountStatus || 'ACTIVE';
    if (status === 'PENDING_APPROVAL') {
      actionsEl.innerHTML = `
        <button type="button" class="btn btn-danger btn-sm" onclick="officerRejectKYC('${customer.userId}', '${customer.name}'); document.getElementById('kycDocViewerModal').classList.remove('active');">
          <i class="fa-solid fa-xmark"></i> Decline
        </button>
        <button type="button" class="btn btn-success btn-sm" onclick="officerApproveKYC('${customer.userId}', '${customer.name}'); document.getElementById('kycDocViewerModal').classList.remove('active');">
          <i class="fa-solid fa-circle-check"></i> Approve KYC & Activate Account
        </button>
      `;
    } else {
      actionsEl.innerHTML = `
        <span class="badge badge-success" style="padding: 6px 12px;"><i class="fa-solid fa-check"></i> Verified & Active Account</span>
      `;
    }
  }

  switchOfficerKYCDoc(initialDoc);
  document.getElementById('kycDocViewerModal')?.classList.add('active');
}

function switchOfficerKYCDoc(docType) {
  activeOfficerModalDocType = docType;
  if (!activeOfficerModalCustomer) return;

  const u    = activeOfficerModalCustomer;
  const docs = u.documents || {};
  const panNum     = docs.panNumber    || 'ABCDE1234F';
  const aadhaarNum = docs.aadhaarNumber || '2345 6789 0123';
  const nominee    = u.nominee || { name: 'Not Provided', relationship: 'N/A', contact: 'N/A' };

  ['All', 'Aadhaar', 'Pan', 'Photo', 'Signature', 'Nominee'].forEach(tab => {
    const el = document.getElementById(`kycTab${tab}`);
    if (el) {
      const isCurrent = (docType.toUpperCase() === tab.toUpperCase());
      el.classList.toggle('btn-primary', isCurrent);
      el.classList.toggle('btn-secondary', !isCurrent);
    }
  });

  const body      = document.getElementById('kycViewerBody');
  const numEl     = document.getElementById('kycModalDocNumber');
  const statusEl  = document.getElementById('kycModalDocStatus');
  const isPending = (u.status === 'PENDING_APPROVAL');

  if (statusEl) {
    statusEl.className  = isPending ? 'badge badge-warning' : 'badge badge-success';
    statusEl.textContent = isPending ? 'PENDING VERIFICATION' : 'VERIFIED';
  }

  const rawAadhaar = docs.aadhaarDoc || docs.aadhaarCard;
  const aadhaarImg = (rawAadhaar && rawAadhaar !== 'null' && rawAadhaar.length > 20)
    ? rawAadhaar
    : (window.Utils && window.Utils.generateAadhaarCard ? window.Utils.generateAadhaarCard(u.name, aadhaarNum, u.dateOfBirth) : '');

  const rawPan = docs.panDoc || docs.panCard;
  const panImg = (rawPan && rawPan !== 'null' && rawPan.length > 20)
    ? rawPan
    : (window.Utils && window.Utils.generatePanCard ? window.Utils.generatePanCard(u.name, panNum, u.dateOfBirth) : '');

  const rawPhoto = docs.photoDoc || docs.photo;
  const photoImg = (rawPhoto && rawPhoto !== 'null' && rawPhoto.length > 20)
    ? rawPhoto
    : (window.Utils && window.Utils.generatePassportPhoto ? window.Utils.generatePassportPhoto(u.name) : '');

  const rawSig = docs.signatureDoc || docs.signature;
  const sigImg = (rawSig && rawSig !== 'null' && rawSig.length > 20)
    ? rawSig
    : (window.Utils && window.Utils.generateSignature ? window.Utils.generateSignature(u.name) : '');

  if (docType === 'ALL') {
    if (numEl) numEl.textContent = 'All 4 KYC Documents + Nominee';
    if (body) {
      body.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; width: 100%; text-align: left;">
          ${[
            { label: 'Aadhaar Card', num: aadhaarNum, img: aadhaarImg, doc: 'AADHAAR', badge: 'UIDAI 12-Digit', badgeClass: 'badge-warning', iconColor: 'var(--warning)', icon: 'fa-fingerprint' },
            { label: 'PAN Card',     num: panNum,     img: panImg,     doc: 'PAN',     badge: 'Income Tax',   badgeClass: 'badge-info',    iconColor: 'var(--accent-cyan)', icon: 'fa-id-card'    },
            { label: 'Passport Photo', num: 'Biometric Photo', img: photoImg, doc: 'PHOTO', badge: 'Biometric', badgeClass: 'badge-success', iconColor: '#10b981', icon: 'fa-camera' },
            { label: 'Signature',    num: 'Official Sign', img: sigImg, doc: 'SIGNATURE', badge: 'Official Sign', badgeClass: 'badge-warning', iconColor: '#f59e0b', icon: 'fa-signature' }
          ].map(item => `
            <div style="background: var(--bg-surface); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color-subtle);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <strong style="color: var(--text-primary); font-size: 0.88rem;"><i class="fa-solid ${item.icon}" style="color: ${item.iconColor};"></i> ${item.label}</strong>
                <span class="badge ${item.badgeClass}" style="font-size: 0.65rem;">${item.badge}</span>
              </div>
              <div style="font-family: var(--font-mono); color: var(--accent-cyan); font-weight: 700; font-size: 0.85rem; margin-bottom: 8px;">${item.num}</div>
              <div style="height: 130px; background: rgba(0,0,0,0.35); border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; overflow: hidden; cursor: pointer; border: 1px dashed rgba(255,255,255,0.15);" onclick="switchOfficerKYCDoc('${item.doc}')">
                <img src="${item.img}" alt="${item.label}" style="max-height: 100%; max-width: 100%; object-fit: contain;">
              </div>
            </div>
          `).join('')}
        </div>
        <div style="margin-top: 14px; width: 100%; background: var(--bg-surface); padding: 14px 18px; border-radius: var(--radius-md); border: 1px solid var(--border-color-subtle); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; text-align: left;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 40px; height: 40px; border-radius: 50%; background: rgba(0,240,255,0.15); display: flex; align-items: center; justify-content: center; color: var(--accent-cyan); font-size: 1.2rem;">
              <i class="fa-solid fa-users"></i>
            </div>
            <div>
              <div style="font-size: 0.76rem; color: var(--text-muted); text-transform: uppercase;">Nominee Registered:</div>
              <strong style="color: #fff; font-size: 0.95rem;">${nominee.name}</strong> <span style="color: var(--accent-cyan); font-size: 0.85rem;">(${nominee.relationship})</span>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 0.8rem; color: var(--text-muted);">Contact:</span>
            <strong style="font-family: var(--font-mono); color: #fff; font-size: 0.9rem;">${nominee.contact}</strong>
            <span class="badge badge-success" style="font-size: 0.7rem;"><i class="fa-solid fa-check"></i> Registered</span>
          </div>
        </div>
      `;
    }
    return;
  }

  let currentDocNum  = aadhaarNum;
  let currentDocData = aadhaarImg;
  let docTitle       = 'Aadhaar Card';

  if (docType === 'PAN')       { currentDocNum = panNum; currentDocData = panImg; docTitle = 'PAN Card'; }
  else if (docType === 'PHOTO') { currentDocNum = 'Passport Photo'; currentDocData = photoImg; docTitle = 'Applicant Passport Photo'; }
  else if (docType === 'SIGNATURE') { currentDocNum = 'Official Signature'; currentDocData = sigImg; docTitle = 'Customer Signature'; }
  else if (docType === 'NOMINEE') { currentDocNum = `${nominee.name} (${nominee.relationship})`; docTitle = 'Account Nominee'; }

  if (numEl) numEl.textContent = currentDocNum;

  if (body) {
    if (docType === 'NOMINEE') {
      body.innerHTML = `
        <div style="background: var(--bg-surface); padding: 24px; border-radius: var(--radius-lg); border: 1px solid var(--border-color-subtle); width: 100%; max-width: 460px; text-align: left;">
          <div style="font-size: 2.5rem; color: var(--accent-cyan); margin-bottom: 10px; text-align: center;"><i class="fa-solid fa-users"></i></div>
          <h4 style="color: #fff; font-size: 1.15rem; margin-bottom: 12px; text-align: center;">Nominee Registration Record</h4>
          <div style="display: flex; flex-direction: column; gap: 10px; font-size: 0.9rem;">
            ${[
              ['Nominee Full Name', `<strong style="color:#fff;">${nominee.name}</strong>`],
              ['Relationship', `<strong style="color:var(--accent-cyan);">${nominee.relationship}</strong>`],
              ['Contact Phone', `<strong style="font-family:var(--font-mono); color:#fff;">${nominee.contact}</strong>`],
              ['Status', `<span class="badge badge-success">REGISTERED</span>`]
            ].map(([k,v]) => `<div style="display:flex;justify-content:space-between;"><span style="color:var(--text-muted);">${k}:</span>${v}</div>`).join('')}
          </div>
        </div>
      `;
    } else {
      body.innerHTML = `
        <div style="position: relative; max-width: 100%; display: flex; flex-direction: column; align-items: center;">
          <img src="${currentDocData}" alt="${docTitle}" style="max-width: 100%; max-height: 380px; border-radius: var(--radius-md); box-shadow: 0 8px 24px rgba(0,0,0,0.5); border: 2px solid rgba(56,189,248,0.4);">
          <div style="font-size: 0.85rem; color: var(--accent-cyan); margin-top: 10px; display: flex; align-items: center; gap: 6px;">
            <i class="fa-solid fa-cloud-arrow-up"></i> ${docTitle} • Verified Document Record
          </div>
        </div>
      `;
    }
  }
}

// ─────────────────────────────────────────────
// KYC Actions
// ─────────────────────────────────────────────
function officerApproveKYC(userId, name) {
  AdminCommon.confirmModal({
    title: 'Approve Customer KYC & Activate Account',
    message: `Confirm KYC verification approval for <strong>${name}</strong> (${userId})? Customer will receive immediate access to Online Banking.`,
    confirmText: 'Approve & Activate Account',
    confirmClass: 'btn-success',
    onConfirm: async () => {
      const officerName = currentOfficer ? currentOfficer.name : 'Credit Officer';
      await API.request(`/admin/customers/${userId}/approve`, 'PUT', {
        approvedBy: officerName,
        remarks: 'KYC Documents Verified and Approved by Officer'
      });
      Utils.showToast(`Customer ${name} approved! Account is active.`, 'success');
      await loadOfficerData();
    }
  });
}

function officerRejectKYC(userId, name) {
  AdminCommon.confirmModal({
    title: 'Decline KYC Application',
    message: `Decline KYC application for <strong>${name}</strong> (${userId})?`,
    confirmText: 'Decline Application',
    confirmClass: 'btn-danger',
    onConfirm: async () => {
      await API.request(`/admin/customers/${userId}/reject`, 'PUT', {
        remarks: 'KYC Documents failed compliance check.'
      });
      Utils.showToast(`Application for ${name} has been rejected.`, 'info');
      await loadOfficerData();
    }
  });
}

// ─────────────────────────────────────────────
// Customer Directory Table
// ─────────────────────────────────────────────
function renderOfficerCustomers() {
  const container = document.getElementById('officerCustomersBody');
  const countBadge = document.getElementById('officerCustomerBadge');
  const tabBadge = document.getElementById('tabCustomerCount');

  if (countBadge) countBadge.textContent = `${allCustomers.length} Customers`;
  if (tabBadge) tabBadge.textContent = allCustomers.length;

  if (!container) return;

  if (allCustomers.length === 0) {
    container.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">No customers found in directory.</td></tr>`;
    return;
  }

  container.innerHTML = allCustomers.map(c => {
    let kycBadge = '<span class="badge badge-success">ACTIVE / VERIFIED</span>';
    if (c.status === 'PENDING_APPROVAL' || c.accountStatus === 'PENDING_APPROVAL') {
      kycBadge = '<span class="badge badge-warning">PENDING KYC</span>';
    } else if (c.status === 'REJECTED') {
      kycBadge = '<span class="badge badge-danger">REJECTED</span>';
    } else if (c.status === 'FROZEN') {
      kycBadge = '<span class="badge badge-warning">FROZEN</span>';
    }

    const initial = (c.name || 'C').charAt(0).toUpperCase();
    const balance = parseFloat(c.balance || (c.account ? c.account.balance : 0) || 0);

    return `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 32px; height: 32px; border-radius: 50%; background: rgba(56, 189, 248, 0.15); color: var(--accent-cyan); font-weight: 700; display: flex; align-items: center; justify-content: center; font-size: 0.85rem;">${initial}</div>
            <div>
              <div style="font-weight: 600; color: #fff;">${c.name}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${c.email}</div>
            </div>
          </div>
        </td>
        <td style="font-family: var(--font-mono); font-weight: 600; color: var(--accent-cyan);">${c.accountNumber || '--'}</td>
        <td><span class="badge badge-info" style="font-size: 0.72rem;">${c.accountType || 'SAVINGS'}</span></td>
        <td style="font-family: var(--font-mono); font-weight: 700; color: #fff;">₹${balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        <td>${kycBadge}</td>
        <td style="text-align: right;">
          <button class="btn btn-secondary btn-sm" onclick="openOfficerKYCViewer('${c.userId || c.id}')" title="Inspect Customer KYC Documents" style="padding: 5px 10px; font-size: 0.75rem;">
            <i class="fa-solid fa-file-shield"></i> KYC Docs
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function filterOfficerCustomers() {
  const query = (document.getElementById('officerCustomerSearch')?.value || '').toLowerCase();
  const filtered = allCustomers.filter(c =>
    (c.name || '').toLowerCase().includes(query) ||
    (c.accountNumber || '').includes(query) ||
    (c.email || '').toLowerCase().includes(query)
  );

  const container = document.getElementById('officerCustomersBody');
  if (!container) return;

  if (filtered.length === 0) {
    container.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">No matching customers found.</td></tr>`;
    return;
  }

  container.innerHTML = filtered.map(c => {
    let kycBadge = '<span class="badge badge-success">ACTIVE / VERIFIED</span>';
    if (c.status === 'PENDING_APPROVAL' || c.accountStatus === 'PENDING_APPROVAL') {
      kycBadge = '<span class="badge badge-warning">PENDING KYC</span>';
    } else if (c.status === 'REJECTED') {
      kycBadge = '<span class="badge badge-danger">REJECTED</span>';
    }

    const initial = (c.name || 'C').charAt(0).toUpperCase();
    const balance = parseFloat(c.balance || (c.account ? c.account.balance : 0) || 0);

    return `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 32px; height: 32px; border-radius: 50%; background: rgba(56, 189, 248, 0.15); color: var(--accent-cyan); font-weight: 700; display: flex; align-items: center; justify-content: center; font-size: 0.85rem;">${initial}</div>
            <div>
              <div style="font-weight: 600; color: #fff;">${c.name}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${c.email}</div>
            </div>
          </div>
        </td>
        <td style="font-family: var(--font-mono); font-weight: 600; color: var(--accent-cyan);">${c.accountNumber || '--'}</td>
        <td><span class="badge badge-info" style="font-size: 0.72rem;">${c.accountType || 'SAVINGS'}</span></td>
        <td style="font-family: var(--font-mono); font-weight: 700; color: #fff;">₹${balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        <td>${kycBadge}</td>
        <td style="text-align: right;">
          <button class="btn btn-secondary btn-sm" onclick="openOfficerKYCViewer('${c.userId || c.id}')" title="Inspect Customer KYC Documents" style="padding: 5px 10px; font-size: 0.75rem;">
            <i class="fa-solid fa-file-shield"></i> KYC Docs
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// ─────────────────────────────────────────────
// Unified Section Switcher
// ─────────────────────────────────────────────
function switchOfficerSection(sectionId) {
  if (sectionId === 'overview') {
    document.querySelectorAll('.dashboard-section').forEach(s => s.style.display = 'none');
    const defaultSec = document.getElementById('assignedLoansSection');
    if (defaultSec) defaultSec.style.display = 'block';

    document.querySelectorAll('.section-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('tabBtnAssignedLoans')?.classList.add('active');

    document.querySelectorAll('.sidebar .nav-item').forEach(i => i.classList.remove('active'));
    document.getElementById('navItemDashboard')?.classList.add('active');

    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  // Hide all sections and show target section
  document.querySelectorAll('.dashboard-section').forEach(s => s.style.display = 'none');
  const targetSec = document.getElementById(sectionId);
  if (targetSec) {
    targetSec.style.display = 'block';
  }

  // Sync Section Tabs
  document.querySelectorAll('.section-tab').forEach(t => t.classList.remove('active'));
  if (sectionId === 'assignedLoansSection') document.getElementById('tabBtnAssignedLoans')?.classList.add('active');
  else if (sectionId === 'kycQueueSection') document.getElementById('tabBtnKycQueue')?.classList.add('active');
  else if (sectionId === 'upiApprovalsSection') document.getElementById('tabBtnUpiApprovals')?.classList.add('active');
  else if (sectionId === 'customersSection') document.getElementById('tabBtnCustomers')?.classList.add('active');
  else if (sectionId === 'transactionsSection') document.getElementById('tabBtnTransactions')?.classList.add('active');
  else if (sectionId === 'profileRequestsSection') document.getElementById('tabBtnProfileRequests')?.classList.add('active');
  else if (sectionId === 'alertsSection') document.getElementById('tabBtnAlerts')?.classList.add('active');

  // Sync Sidebar Navigation Items
  document.querySelectorAll('.sidebar .nav-item').forEach(i => i.classList.remove('active'));
  if (sectionId === 'assignedLoansSection') document.getElementById('navItemLoans')?.classList.add('active');
  else if (sectionId === 'kycQueueSection') document.getElementById('navItemKyc')?.classList.add('active');
  else if (sectionId === 'upiApprovalsSection') document.getElementById('navItemUpi')?.classList.add('active');
  else if (sectionId === 'customersSection') document.getElementById('navItemCustomers')?.classList.add('active');
  else if (sectionId === 'transactionsSection') document.getElementById('navItemTxn')?.classList.add('active');
  else if (sectionId === 'alertsSection') document.getElementById('navItemAlerts')?.classList.add('active');

  // Scroll smoothly to target section
  if (targetSec) {
    const offset = 140;
    const bodyRect = document.body.getBoundingClientRect().top;
    const elementRect = targetSec.getBoundingClientRect().top;
    const elementPosition = elementRect - bodyRect;
    const offsetPosition = elementPosition - offset;
    window.scrollTo({ top: offsetPosition > 0 ? offsetPosition : 0, behavior: 'smooth' });
  }
}

// ─────────────────────────────────────────────
// Profile Change Requests Render & Approval Flow
// ─────────────────────────────────────────────
function renderProfileEditRequests() {
  const container = document.getElementById('profileRequestsContainer');
  const badge = document.getElementById('profileRequestsBadge');
  const tabBadge = document.getElementById('tabProfileReqCount');
  if (!container) return;

  let requests = JSON.parse(localStorage.getItem('gg_profile_requests') || '[]');

  // Seed default realistic pending request if none exists
  if (requests.length === 0) {
    requests = [
      {
        requestId: 'REQ-PROF-1002',
        userId: 'usr-gowtham-101',
        accountNumber: '10018849201',
        customerName: 'Sarah Connor',
        currentDetails: {
          name: 'Sarah Connor',
          email: 'sarah.connor@example.com',
          phone: '+91 98401 23456',
          address: '124 Brigade Road, Bengaluru, Karnataka 560025',
          dateOfBirth: '1992-06-15'
        },
        requestedDetails: {
          name: 'Sarah Connor',
          email: 'sarah.connor@example.com',
          phone: '+91 98765 43210',
          address: '45 Tech Boulevard, Whitefield, Bengaluru, Karnataka 560066',
          dateOfBirth: '1992-06-15',
          documents: {
            panCard: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250"><rect width="400" height="250" fill="%230d1b3e"/><text x="20" y="40" fill="%2338bdf8" font-size="16" font-family="sans-serif" font-weight="bold">INCOME TAX DEPT - PAN CARD</text><text x="20" y="90" fill="%23ffffff" font-size="14">SARAH CONNOR</text><text x="20" y="140" fill="%230ea5e9" font-size="18" font-family="monospace">ABCDE1234F</text><text x="20" y="220" fill="%2310b981" font-size="12">VERIFIED IDENTITY</text></svg>',
            aadhaarCard: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250"><rect width="400" height="250" fill="%230f172a"/><text x="20" y="40" fill="%23a855f7" font-size="16" font-family="sans-serif" font-weight="bold">AADHAAR - UIDAI GOVT OF INDIA</text><text x="20" y="90" fill="%23ffffff" font-size="14">SARAH CONNOR</text><text x="20" y="140" fill="%2338bdf8" font-size="18" font-family="monospace">2345 6789 0123</text><text x="20" y="220" fill="%2310b981" font-size="12">BIOMETRICALLY AUTHENTICATED</text></svg>',
            incomeProof: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250"><rect width="400" height="250" fill="%230b152d"/><text x="20" y="40" fill="%2310b981" font-size="16" font-family="sans-serif" font-weight="bold">SALARY SLIP & ITR</text><text x="20" y="90" fill="%23ffffff" font-size="14">Employer: TechCorp Solutions</text><text x="20" y="130" fill="%2394a3b8" font-size="14">Monthly Credit: INR 72,850</text></svg>',
            bankStatement: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250"><rect width="400" height="250" fill="%230d1b3e"/><text x="20" y="40" fill="%2338bdf8" font-size="16" font-family="sans-serif" font-weight="bold">GG BANK - ACCOUNT STATEMENT</text><text x="20" y="90" fill="%23ffffff" font-size="14">Account: 1001 8849 201</text><text x="20" y="130" fill="%2394a3b8" font-size="14">Period: Last 6 Months (Current)</text></svg>'
          }
        },
        status: 'PENDING_OFFICER_APPROVAL',
        submittedAt: new Date(Date.now() - 35 * 60 * 1000).toISOString()
      }
    ];
    localStorage.setItem('gg_profile_requests', JSON.stringify(requests));
  }

  const pending = requests.filter(r => r.status === 'PENDING_OFFICER_APPROVAL');
  if (badge) badge.textContent = `${pending.length} Pending`;
  if (tabBadge) tabBadge.textContent = pending.length;

  if (requests.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--text-muted);">
        <i class="fa-solid fa-clipboard-check" style="font-size: 2.5rem; color: var(--accent-cyan); margin-bottom: 12px;"></i>
        <h4 style="color: #fff; margin-bottom: 6px;">No Profile Edit Requests</h4>
        <p style="font-size: 0.85rem; margin: 0;">All customer profile change requests are up to date.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = requests.map(req => {
    const isPending = req.status === 'PENDING_OFFICER_APPROVAL';
    const cur = req.currentDetails || {};
    const upd = req.requestedDetails || {};
    const docs = upd.documents || {};

    const phoneChanged = cur.phone !== upd.phone;
    const addressChanged = cur.address !== upd.address;
    const nameChanged = cur.name !== upd.name;
    const dobChanged = cur.dateOfBirth !== upd.dateOfBirth;

    return `
      <div class="card" style="padding: 20px; border-left: 4px solid ${isPending ? 'var(--warning)' : 'var(--success)'}; background: var(--bg-card); margin-bottom: 16px;">
        
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; margin-bottom: 16px;">
          <div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <h4 style="font-size: 1.1rem; font-weight: 700; color: #fff; margin: 0;">${req.customerName || 'Customer'}</h4>
              <span class="badge ${isPending ? 'badge-warning' : 'badge-success'}" style="font-size: 0.72rem;">
                ${isPending ? 'PENDING APPROVAL' : req.status}
              </span>
            </div>
            <div style="font-size: 0.8rem; color: var(--text-muted); font-family: var(--font-mono); margin-top: 4px;">
              Account: <strong style="color: var(--accent-cyan);">${req.accountNumber}</strong> &bull; Request Ref: <strong>${req.requestId}</strong> &bull; Submitted: ${new Date(req.submittedAt).toLocaleString('en-IN')}
            </div>
          </div>

          ${isPending ? `
            <div style="display: flex; gap: 10px;">
              <button class="btn btn-success btn-sm" onclick="officerApproveProfileRequest('${req.requestId}')">
                <i class="fa-solid fa-circle-check"></i> Approve Profile Update
              </button>
              <button class="btn btn-danger btn-sm" onclick="officerRejectProfileRequest('${req.requestId}')">
                <i class="fa-solid fa-ban"></i> Reject
              </button>
            </div>
          ` : `
            <span style="font-size: 0.8rem; color: var(--success); font-weight: 600;">
              <i class="fa-solid fa-check-double"></i> Approved by Officer
            </span>
          `}
        </div>

        <!-- Side-by-side details comparison -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; background: rgba(0,0,0,0.2); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color-subtle); margin-bottom: 16px;">
          
          <div>
            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; margin-bottom: 8px;">
              <i class="fa-solid fa-clock-rotate-left"></i> Current Registered Details
            </div>
            <div style="font-size: 0.84rem; display: flex; flex-direction: column; gap: 6px;">
              <div><span style="color: var(--text-muted);">Name:</span> <strong>${cur.name || 'N/A'}</strong></div>
              <div><span style="color: var(--text-muted);">Phone:</span> <strong>${cur.phone || 'N/A'}</strong></div>
              <div><span style="color: var(--text-muted);">Email:</span> <span>${cur.email || 'N/A'}</span></div>
              <div><span style="color: var(--text-muted);">DOB:</span> <span>${cur.dateOfBirth || 'N/A'}</span></div>
              <div><span style="color: var(--text-muted);">Address:</span> <span>${cur.address || 'N/A'}</span></div>
            </div>
          </div>

          <div>
            <div style="font-size: 0.75rem; color: var(--accent-cyan); text-transform: uppercase; font-weight: 700; margin-bottom: 8px;">
              <i class="fa-solid fa-pen-to-square"></i> Requested New Details
            </div>
            <div style="font-size: 0.84rem; display: flex; flex-direction: column; gap: 6px;">
              <div>
                <span style="color: var(--text-muted);">Name:</span> 
                <strong style="${nameChanged ? 'color: var(--accent-cyan); font-weight: 800;' : ''}">${upd.name || 'N/A'}</strong>
                ${nameChanged ? '<span class="badge badge-info" style="font-size:0.65rem; margin-left:4px;">Changed</span>' : ''}
              </div>
              <div>
                <span style="color: var(--text-muted);">Phone:</span> 
                <strong style="${phoneChanged ? 'color: var(--warning); font-weight: 800;' : ''}">${upd.phone || 'N/A'}</strong>
                ${phoneChanged ? '<span class="badge badge-warning" style="font-size:0.65rem; margin-left:4px;">Updated</span>' : ''}
              </div>
              <div><span style="color: var(--text-muted);">Email:</span> <span>${upd.email || 'N/A'}</span></div>
              <div>
                <span style="color: var(--text-muted);">DOB:</span> 
                <span style="${dobChanged ? 'color: var(--accent-cyan); font-weight: 700;' : ''}">${upd.dateOfBirth || 'N/A'}</span>
              </div>
              <div>
                <span style="color: var(--text-muted);">Address:</span> 
                <span style="${addressChanged ? 'color: #38bdf8; font-weight: 700;' : ''}">${upd.address || 'N/A'}</span>
                ${addressChanged ? '<span class="badge badge-info" style="font-size:0.65rem; margin-left:4px;">Relocated</span>' : ''}
              </div>
            </div>
          </div>

        </div>

        <!-- 4 Submitted Proof Documents -->
        <div>
          <div style="font-size: 0.78rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; margin-bottom: 10px;">
            <i class="fa-solid fa-file-shield" style="color: var(--accent-cyan);"></i> Submitted Proof Documents (Customer Uploads)
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
            
            <!-- PAN Card -->
            <div style="background: var(--bg-surface); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-color-subtle); display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-size: 0.82rem; font-weight: 700; color: #fff;"><i class="fa-solid fa-id-card" style="color: var(--accent-cyan);"></i> PAN Card</div>
                <div style="font-size: 0.72rem; color: var(--success);"><i class="fa-solid fa-check"></i> Attached</div>
              </div>
              <button class="btn btn-secondary btn-sm" onclick="openOfficerProofViewer('PAN Card', '${docs.panCard || ''}', '${req.customerName}')" style="font-size: 0.75rem; padding: 4px 10px;">
                <i class="fa-solid fa-eye"></i> View
              </button>
            </div>

            <!-- Aadhaar Card -->
            <div style="background: var(--bg-surface); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-color-subtle); display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-size: 0.82rem; font-weight: 700; color: #fff;"><i class="fa-solid fa-fingerprint" style="color: #a855f7;"></i> Aadhaar / ID</div>
                <div style="font-size: 0.72rem; color: var(--success);"><i class="fa-solid fa-check"></i> Attached</div>
              </div>
              <button class="btn btn-secondary btn-sm" onclick="openOfficerProofViewer('Aadhaar / ID Proof', '${docs.aadhaarCard || ''}', '${req.customerName}')" style="font-size: 0.75rem; padding: 4px 10px;">
                <i class="fa-solid fa-eye"></i> View
              </button>
            </div>

            <!-- Income Proof -->
            <div style="background: var(--bg-surface); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-color-subtle); display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-size: 0.82rem; font-weight: 700; color: #fff;"><i class="fa-solid fa-file-invoice-dollar" style="color: var(--success);"></i> Income Proof</div>
                <div style="font-size: 0.72rem; color: var(--success);"><i class="fa-solid fa-check"></i> Attached</div>
              </div>
              <button class="btn btn-secondary btn-sm" onclick="openOfficerProofViewer('Income Proof', '${docs.incomeProof || ''}', '${req.customerName}')" style="font-size: 0.75rem; padding: 4px 10px;">
                <i class="fa-solid fa-eye"></i> View
              </button>
            </div>

            <!-- Bank Statement -->
            <div style="background: var(--bg-surface); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-color-subtle); display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-size: 0.82rem; font-weight: 700; color: #fff;"><i class="fa-solid fa-building-columns" style="color: #38bdf8;"></i> Bank Statement</div>
                <div style="font-size: 0.72rem; color: var(--success);"><i class="fa-solid fa-check"></i> Attached</div>
              </div>
              <button class="btn btn-secondary btn-sm" onclick="openOfficerProofViewer('Bank Statement', '${docs.bankStatement || ''}', '${req.customerName}')" style="font-size: 0.75rem; padding: 4px 10px;">
                <i class="fa-solid fa-eye"></i> View
              </button>
            </div>

          </div>
        </div>

      </div>
    `;
  }).join('');
}

function openOfficerProofViewer(docTitle, docUrl, customerName) {
  const modal = document.getElementById('kycDocViewerModal');
  const titleEl = document.getElementById('kycViewerTitle');
  const headerEl = document.getElementById('kycDocCustomerHeader');
  const bodyEl = document.getElementById('kycViewerBody');
  const metaBox = document.getElementById('kycDocMetaBox');
  const actionBtns = document.getElementById('kycModalActionBtns');

  if (!modal) return;

  if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-file-shield" style="color: var(--accent-cyan);"></i> ${docTitle} Verification`;
  if (headerEl) headerEl.innerHTML = `Applicant: <strong>${customerName || 'Customer'}</strong> &bull; Document Type: <strong>${docTitle}</strong>`;

  if (bodyEl) {
    if (!docUrl) {
      bodyEl.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 30px;">
          <i class="fa-solid fa-file-circle-question" style="font-size: 3rem; margin-bottom: 12px;"></i>
          <p>No document attached by customer for ${docTitle}.</p>
        </div>
      `;
    } else if (docUrl.startsWith('data:image/') || docUrl.includes('.jpg') || docUrl.includes('.png')) {
      bodyEl.innerHTML = `
        <div style="text-align: center; width: 100%;">
          <img src="${docUrl}" alt="${docTitle}" style="max-width: 100%; max-height: 420px; border-radius: var(--radius-sm); border: 1px solid var(--border-color-subtle); box-shadow: 0 4px 20px rgba(0,0,0,0.5);" />
        </div>
      `;
    } else {
      bodyEl.innerHTML = `
        <div style="text-align: center; padding: 30px;">
          <i class="fa-solid fa-file-pdf" style="font-size: 3.5rem; color: var(--danger); margin-bottom: 12px;"></i>
          <h4 style="color: #fff; margin-bottom: 8px;">${docTitle}</h4>
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 16px;">PDF Document stored in banking records.</p>
          <a href="${docUrl}" target="_blank" class="btn btn-primary btn-sm">
            <i class="fa-solid fa-arrow-up-right-from-square"></i> Open Full Document
          </a>
        </div>
      `;
    }
  }

  if (metaBox) {
    document.getElementById('kycModalDocNumber').textContent = 'VERIFIED-DOC-2026';
    document.getElementById('kycModalDocStatus').textContent = 'AUTHENTICATED';
  }

  if (actionBtns) {
    actionBtns.innerHTML = `
      <button class="btn btn-success btn-sm" onclick="Utils.showToast('${docTitle} verified successfully.', 'success'); document.getElementById('kycDocViewerModal').classList.remove('active');">
        <i class="fa-solid fa-check"></i> Mark Verified
      </button>
    `;
  }

  modal.classList.add('active');
}

function officerApproveProfileRequest(requestId) {
  let requests = JSON.parse(localStorage.getItem('gg_profile_requests') || '[]');
  const req = requests.find(r => r.requestId === requestId);
  if (!req) return;

  // Apply updates to the customer record
  const upd = req.requestedDetails;
  const user = Auth.getCurrentUser();

  // Update in allCustomers list
  const cust = allCustomers.find(c => c.userId === req.userId || c.accountNumber === req.accountNumber);
  if (cust) {
    cust.name = upd.name;
    cust.phone = upd.phone;
    cust.email = upd.email;
    cust.address = upd.address;
    cust.dateOfBirth = upd.dateOfBirth;
  }

  // Update in local users mock
  let localUsers = JSON.parse(localStorage.getItem('gg_users') || '[]');
  const uIdx = localUsers.findIndex(u => u.userId === req.userId || u.accountNumber === req.accountNumber);
  if (uIdx !== -1) {
    localUsers[uIdx].name = upd.name;
    localUsers[uIdx].phone = upd.phone;
    localUsers[uIdx].email = upd.email;
    localUsers[uIdx].address = upd.address;
    localUsers[uIdx].dateOfBirth = upd.dateOfBirth;
    localStorage.setItem('gg_users', JSON.stringify(localUsers));
  }

  // Update current session user if it's the same customer
  if (user && user.userId === req.userId) {
    user.name = upd.name;
    user.phone = upd.phone;
    user.email = upd.email;
    user.address = upd.address;
    user.dateOfBirth = upd.dateOfBirth;
    localStorage.setItem('gg_current_user', JSON.stringify(user));
  }

  // Mark request as APPROVED
  req.status = 'APPROVED';
  req.approvedAt = new Date().toISOString();
  req.approvedBy = currentOfficer ? currentOfficer.name : 'Banking Operations Officer';
  localStorage.setItem('gg_profile_requests', JSON.stringify(requests));

  // Add notification to customer
  let notifs = JSON.parse(localStorage.getItem('gg_notifications') || '[]');
  notifs.unshift({
    notificationId: 'notif-' + Date.now(),
    userId: req.userId,
    title: 'Profile Update Approved',
    category: 'Security',
    message: `Your requested profile changes have been verified and approved by Officer ${req.approvedBy}.`,
    read: false,
    createdAt: new Date().toISOString()
  });
  localStorage.setItem('gg_notifications', JSON.stringify(notifs));

  Utils.showToast(`Profile change request ${requestId} approved successfully! Customer records updated.`, 'success');
  renderProfileEditRequests();
}

function officerRejectProfileRequest(requestId) {
  const reason = prompt('Please enter the reason for rejecting this profile change request:', 'Incomplete address documentation or unverifiable details.');
  if (reason === null) return;

  let requests = JSON.parse(localStorage.getItem('gg_profile_requests') || '[]');
  const req = requests.find(r => r.requestId === requestId);
  if (!req) return;

  req.status = 'REJECTED';
  req.rejectionReason = reason;
  req.rejectedAt = new Date().toISOString();
  req.rejectedBy = currentOfficer ? currentOfficer.name : 'Banking Operations Officer';
  localStorage.setItem('gg_profile_requests', JSON.stringify(requests));

  // Add notification to customer
  let notifs = JSON.parse(localStorage.getItem('gg_notifications') || '[]');
  notifs.unshift({
    notificationId: 'notif-' + Date.now(),
    userId: req.userId,
    title: 'Profile Update Rejected',
    category: 'Security',
    message: `Your requested profile update was rejected: ${reason}`,
    read: false,
    createdAt: new Date().toISOString()
  });
  localStorage.setItem('gg_notifications', JSON.stringify(notifs));

  Utils.showToast(`Request ${requestId} rejected. Customer notified.`, 'warning');
  renderProfileEditRequests();
}

// ─────────────────────────────────────────────
// Logout
// ─────────────────────────────────────────────
function logoutOfficer(e) {
  if (e) e.preventDefault();
  localStorage.removeItem('gg_current_user');
  localStorage.removeItem('gg_auth_token');
  Utils.showToast('Signed out.', 'info');
  setTimeout(() => { window.location.href = 'officer-login.html'; }, 400);
}

// ─────────────────────────────────────────────
// Custom UPI ID Approvals Desk
// ─────────────────────────────────────────────
function renderUpiApprovals() {
  const tbody = document.getElementById('officerUpiRequestsBody');
  const badge = document.getElementById('officerUpiBadgeCount');
  const tabBadge = document.getElementById('tabUpiReqCount');
  const navBadge = document.getElementById('navUpiBadge');
  if (!tbody) return;

  const pendingList = allUpiRequests.filter(r => r.status === 'PENDING');
  if (badge) badge.textContent = pendingList.length + ' Pending';
  if (tabBadge) tabBadge.textContent = pendingList.length;
  if (navBadge) {
    navBadge.textContent = pendingList.length;
    navBadge.style.display = pendingList.length > 0 ? 'inline-block' : 'none';
  }

  if (allUpiRequests.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 30px;"><i class="fa-solid fa-at" style="font-size: 2rem; opacity: 0.4; margin-bottom: 8px; display: block;"></i>No custom UPI ID requests in queue.</td></tr>';
    return;
  }

  tbody.innerHTML = allUpiRequests.map(r => {
    const isPending = r.status === 'PENDING';
    const statusClass = r.status === 'APPROVED' ? 'badge-success' : r.status === 'REJECTED' ? 'badge-danger' : 'badge-warning';
    const dateStr = r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN') : 'N/A';

    return `
      <tr>
        <td><strong style="font-family: var(--font-mono); color: var(--accent-cyan); font-size: 0.8rem;">${r.requestId}</strong></td>
        <td>
          <strong style="color: var(--text-primary); font-size: 0.85rem;">${r.customerName || 'Customer'}</strong>
          <div style="font-size: 0.72rem; color: var(--text-muted);">${r.userId || ''}</div>
        </td>
        <td><span style="font-family: var(--font-mono); color: #fff; font-size: 0.82rem;">${r.accountNumber}</span></td>
        <td><span style="font-family: var(--font-mono); color: var(--text-muted); font-size: 0.8rem;">${r.currentUpiId || 'Default'}</span></td>
        <td>
          <strong style="font-family: var(--font-mono); color: var(--warning); font-size: 0.88rem; background: rgba(245,158,11,0.12); padding: 3px 8px; border-radius: 4px; border: 1px solid rgba(245,158,11,0.25);">
            ${r.requestedUpiId || r.requestedHandle}
          </strong>
        </td>
        <td style="font-size: 0.78rem; color: var(--text-muted);">${dateStr}</td>
        <td><span class="badge ${statusClass}">${r.status}</span></td>
        <td style="text-align: right;">
          ${isPending ? `
            <div style="display: flex; gap: 6px; justify-content: flex-end;">
              <button class="btn btn-success btn-sm" onclick="officerApproveUpi('${r.requestId}')" title="Approve & Activate Custom Handle">
                <i class="fa-solid fa-circle-check"></i> Approve
              </button>
              <button class="btn btn-danger btn-sm" onclick="officerRejectUpi('${r.requestId}')" title="Reject Request">
                <i class="fa-solid fa-ban"></i> Reject
              </button>
            </div>
          ` : `
            <span style="font-size: 0.75rem; color: var(--text-muted);">Decided by ${r.approvedBy || r.rejectedBy || 'Officer'}</span>
          `}
        </td>
      </tr>
    `;
  }).join('');
}

async function officerApproveUpi(requestId) {
  try {
    const res = await API.request('/upi/requests/' + requestId + '/approve', {
      method: 'POST',
      body: { officerName: currentOfficer ? currentOfficer.name : 'Banking Officer' }
    });
    if (res.success) {
      Utils.showToast(res.message || 'Custom UPI ID approved and activated!', 'success');
      await loadOfficerData();
    } else {
      Utils.showToast(res.message || 'Failed to approve UPI ID.', 'danger');
    }
  } catch (err) {
    Utils.showToast(err.message || 'Error approving UPI ID.', 'danger');
  }
}

async function officerRejectUpi(requestId) {
  const reason = prompt('Please enter the reason for rejecting this custom UPI handle:', 'Handle unavailable or does not meet institutional naming guidelines.');
  if (reason === null) return;

  try {
    const res = await API.request('/upi/requests/' + requestId + '/reject', {
      method: 'POST',
      body: {
        reason: reason.trim() || 'Declined by banking officer',
        officerName: currentOfficer ? currentOfficer.name : 'Banking Officer'
      }
    });
    if (res.success) {
      Utils.showToast(res.message || 'Custom UPI request rejected.', 'warning');
      await loadOfficerData();
    } else {
      Utils.showToast(res.message || 'Failed to reject UPI ID.', 'danger');
    }
  } catch (err) {
    Utils.showToast(err.message || 'Error rejecting UPI ID.', 'danger');
  }
}

// ─────────────────────────────────────────────
// Expose globally
// ─────────────────────────────────────────────
window.openOfficerKYCViewer        = openOfficerKYCViewer;
window.switchOfficerKYCDoc         = switchOfficerKYCDoc;
window.officerApproveKYC           = officerApproveKYC;
window.officerRejectKYC            = officerRejectKYC;
window.filterAssignedLoans         = filterAssignedLoans;
window.renderOfficerCustomers      = renderOfficerCustomers;
window.filterOfficerCustomers      = filterOfficerCustomers;
window.switchOfficerSection        = switchOfficerSection;
window.loadOfficerData             = loadOfficerData;
window.logoutOfficer               = logoutOfficer;
window.renderProfileEditRequests   = renderProfileEditRequests;
window.openOfficerProofViewer      = openOfficerProofViewer;
window.officerApproveProfileRequest = officerApproveProfileRequest;
window.officerRejectProfileRequest = officerRejectProfileRequest;

// Officer Desk Exports
window.renderUpiApprovals           = renderUpiApprovals;
window.officerApproveUpi            = officerApproveUpi;
window.officerRejectUpi             = officerRejectUpi;

