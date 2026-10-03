/**
 * GG BANK - Admin Dashboard Controller (admin-dashboard.js)
 * Manages Dashboard statistics, 4 Analytics Charts, and Recent Activities.
 */

let growthChart = null;
let txnChart = null;
let depWithChart = null;
let loanChart = null;

document.addEventListener('DOMContentLoaded', async () => {
  const admin = AdminCommon.init('dashboard');
  if (!admin) return;

  await loadDashboardData();
  window.__adminRefreshData = loadDashboardData;
});

async function loadDashboardData() {
  try {
    const res = await API.request('/admin/dashboard/overview');
    const data = res.data || {};
    const stats = data.stats || {};
    const txns = data.recentTransactions || [];
    const pendingLoans = data.pendingLoans || [];

    // 1. Update KPI Cards
    updateKpis(stats);

    // 2. Render Previews
    renderRecentTransactions(txns);
    renderPendingLoans(pendingLoans);

  } catch (err) {
    console.error('Failed to load dashboard data:', err);
    Utils.showToast('Unable to load dashboard data. Retrying...', 'error');
  }
}

function updateKpis(stats) {
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setVal('kpiTotalCustomers', stats.totalCustomers || 0);
  setVal('kpiTotalAccounts', stats.totalAccounts || 0);
  setVal('kpiTotalBalance', `₹${(stats.totalBalance || 0).toLocaleString('en-IN')}`);
  setVal('kpiTotalDeposits', `₹${(stats.totalDeposits || 0).toLocaleString('en-IN')}`);
  setVal('kpiTotalWithdrawals', `₹${(stats.totalWithdrawals || 0).toLocaleString('en-IN')}`);
  setVal('kpiTotalTransfers', `₹${(stats.totalTransfers || 0).toLocaleString('en-IN')}`);
  setVal('kpiPendingLoans', stats.pendingLoans || 0);
  setVal('kpiBlockedAccounts', stats.blockedAccounts || 0);
}

// Global Master Wipe
async function handleClearAllRecords() {
  if (!confirm('CRITICAL ACTION: Are you sure you want to remove ALL accounts, customers, transactions, and loans from the database?')) {
    return;
  }
  try {
    await API.request('/admin/clear-all-data', 'POST');
    Utils.showToast('All database records have been wiped successfully.', 'success');
    await loadDashboardData();
  } catch (err) {
    Utils.showToast(err.message, 'error');
  }
}

// Global Master Reset
async function handleResetDefaultData() {
  if (!confirm('Restore default clean seed accounts, customers, and sample records?')) {
    return;
  }
  try {
    await API.request('/admin/reset-default-data', 'POST');
    Utils.showToast('Default clean records restored successfully.', 'success');
    await loadDashboardData();
  } catch (err) {
    Utils.showToast(err.message, 'error');
  }
}

window.handleClearAllRecords = handleClearAllRecords;
window.handleResetDefaultData = handleResetDefaultData;

function renderRecentTransactions(txns) {
  const container = document.getElementById('dashRecentTxnContainer');
  if (!container) return;

  if (!txns || txns.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 24px;">No recent transactions found.</div>`;
    return;
  }

  container.innerHTML = txns.slice(0, 5).map(t => {
    const isCredit = t.type === 'DEPOSIT' || t.type === 'LOAN_DISBURSEMENT';
    const sign = isCredit ? '+' : '-';
    const color = isCredit ? 'var(--success)' : 'var(--text-primary)';
    return `
      <div style="background: var(--bg-surface); padding: 12px 14px; border-radius: var(--radius-md); display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 36px; height: 36px; border-radius: var(--radius-sm); background: rgba(0, 240, 255, 0.1); color: var(--accent-cyan); display: flex; align-items: center; justify-content: center; font-size: 0.95rem;">
            <i class="${isCredit ? 'fa-solid fa-arrow-down' : 'fa-solid fa-arrow-up'}"></i>
          </div>
          <div>
            <div style="font-weight: 700; font-size: 0.88rem; color: var(--text-primary);">${t.description || t.type}</div>
            <div style="font-size: 0.76rem; color: var(--text-muted); font-family: var(--font-mono);">${t.transactionId} &bull; ${new Date(t.createdAt).toLocaleDateString()}</div>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-weight: 800; font-size: 0.95rem; color: ${color}; font-family: var(--font-mono);">${sign}₹${(t.amount || 0).toLocaleString('en-IN')}</div>
          <span class="badge badge-success" style="font-size: 0.68rem; padding: 2px 6px;">COMPLETED</span>
        </div>
      </div>
    `;
  }).join('');
}

function renderPendingLoans(loans) {
  const container = document.getElementById('dashPendingLoansContainer');
  if (!container) return;

  if (!loans || loans.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 24px;">No pending loan applications awaiting review.</div>`;
    return;
  }

  container.innerHTML = loans.slice(0, 5).map(l => `
    <div style="background: var(--bg-surface); padding: 12px 14px; border-radius: var(--radius-md); border-left: 4px solid var(--warning); display: flex; justify-content: space-between; align-items: center;">
      <div>
        <div style="font-weight: 700; font-size: 0.88rem; color: var(--text-primary);">${l.loanType} <span style="font-size: 0.76rem; color: var(--text-muted); font-family: var(--font-mono);">(${l.loanId})</span></div>
        <div style="font-size: 0.78rem; color: var(--text-secondary);">Applicant: <strong style="color: #fff;">${l.customerName || 'Customer'}</strong> &bull; Acc: ${l.accountNumber} &bull; Requested: <strong style="color: var(--accent-cyan);">₹${(l.requestedAmount || 0).toLocaleString('en-IN')}</strong></div>
      </div>
      <a href="admin-loans.html" class="btn btn-warning btn-sm" style="font-size: 0.75rem; padding: 5px 10px;">
        <i class="fa-solid fa-gavel"></i> Review
      </a>
    </div>
  `).join('');
}
