/**
 * GG BANK - Transaction Surveillance Controller (admin-transactions.js)
 * Manages Global Ledger, Metrics, Filters (Type, Date), Search, and Receipt Details.
 */

let allTransactions = [];
let filteredTransactions = [];
let currentPage = 1;
const PAGE_SIZE = 10;

document.addEventListener('DOMContentLoaded', async () => {
  const admin = AdminCommon.init('transactions');
  if (!admin) return;

  await loadTransactions();
  setupEventListeners();
  window.__adminRefreshData = loadTransactions;
});

async function loadTransactions() {
  AdminCommon.renderLoading('adminTxnTableBody', 'Loading global transaction records...');
  try {
    const res = await API.request('/admin/transactions');
    allTransactions = res.data || [];
    applyFilters();
  } catch (err) {
    AdminCommon.renderError('adminTxnTableBody', 'Failed to load ledger: ' + err.message, loadTransactions);
  }
}

function setupEventListeners() {
  const searchInput = document.getElementById('txnSearchInput');
  const typeFilter = document.getElementById('txnTypeFilter');
  const dateFilter = document.getElementById('txnDateFilter');

  if (searchInput) searchInput.addEventListener('input', () => { currentPage = 1; applyFilters(); });
  if (typeFilter) typeFilter.addEventListener('change', () => { currentPage = 1; applyFilters(); });
  if (dateFilter) dateFilter.addEventListener('change', () => { currentPage = 1; applyFilters(); });
}

function applyFilters() {
  const query = (document.getElementById('txnSearchInput')?.value || '').toLowerCase().trim();
  const type = document.getElementById('txnTypeFilter')?.value || 'ALL';
  const period = document.getElementById('txnDateFilter')?.value || 'ALL';

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfWeek = now.getTime() - 7 * 86400000;
  const startOfMonth = now.getTime() - 30 * 86400000;

  filteredTransactions = allTransactions.filter(t => {
    const matchesQuery = !query ||
      (t.transactionId && t.transactionId.toLowerCase().includes(query)) ||
      (t.senderAccount && t.senderAccount.toLowerCase().includes(query)) ||
      (t.receiverAccount && t.receiverAccount.toLowerCase().includes(query)) ||
      (t.description && t.description.toLowerCase().includes(query));

    const matchesType = type === 'ALL' || (t.type && t.type.toUpperCase() === type);

    let matchesDate = true;
    if (period !== 'ALL' && t.createdAt) {
      const tTime = new Date(t.createdAt).getTime();
      if (period === 'TODAY') matchesDate = tTime >= startOfToday;
      else if (period === 'WEEK') matchesDate = tTime >= startOfWeek;
      else if (period === 'MONTH') matchesDate = tTime >= startOfMonth;
    }

    return matchesQuery && matchesType && matchesDate;
  });

  updateMetrics();
  renderTable();
}

function updateMetrics() {
  const countEl = document.getElementById('metricTxnCount');
  const depEl = document.getElementById('metricTxnDeposits');
  const withEl = document.getElementById('metricTxnWithdrawals');
  const transEl = document.getElementById('metricTxnTransfers');

  let depositSum = 0;
  let withdrawSum = 0;
  let transferSum = 0;

  filteredTransactions.forEach(t => {
    const amt = parseFloat(t.amount) || 0;
    if (t.type === 'DEPOSIT' || t.type === 'LOAN_DISBURSEMENT') depositSum += amt;
    else if (t.type === 'WITHDRAWAL' || t.type === 'BILL_PAYMENT') withdrawSum += amt;
    else if (t.type === 'TRANSFER') transferSum += amt;
  });

  if (countEl) countEl.textContent = filteredTransactions.length;
  if (depEl) depEl.textContent = `₹${depositSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  if (withEl) withEl.textContent = `₹${withdrawSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  if (transEl) transEl.textContent = `₹${transferSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

function renderTable() {
  const tbody = document.getElementById('adminTxnTableBody');
  if (!tbody) return;

  if (filteredTransactions.length === 0) {
    AdminCommon.renderEmpty('adminTxnTableBody', 'No transactions found matching criteria.', 'fa-receipt');
    updatePagination(0);
    return;
  }

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginated = filteredTransactions.slice(startIndex, startIndex + PAGE_SIZE);

  tbody.innerHTML = paginated.map(t => {
    const isCredit = t.type === 'DEPOSIT' || t.type === 'LOAN_DISBURSEMENT';
    const amountClass = isCredit ? 'amount-credit' : 'amount-debit';
    const amountSign = isCredit ? '+' : '-';

    let typeBadgeClass = 'badge-info';
    if (t.type === 'DEPOSIT') typeBadgeClass = 'badge-success';
    else if (t.type === 'WITHDRAWAL') typeBadgeClass = 'badge-danger';
    else if (t.type === 'TRANSFER') typeBadgeClass = 'badge-purple';
    else if (t.type === 'LOAN_DISBURSEMENT') typeBadgeClass = 'badge-warning';

    const senderDisplay = t.senderAccount ? 
      `<span style="font-family: var(--font-mono); color: #fff; font-size: 0.88rem;">${t.senderAccount}</span>` : 
      `<span style="color: var(--text-muted); font-size: 0.8rem; font-style: italic;">Treasury / Cash</span>`;

    const receiverDisplay = t.receiverAccount ? 
      `<span style="font-family: var(--font-mono); color: var(--accent-cyan); font-size: 0.88rem;">${t.receiverAccount}</span>` : 
      `<span style="color: var(--text-muted); font-size: 0.8rem; font-style: italic;">Self / ATM</span>`;

    return `
      <tr>
        <td>
          <span style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-cyan); font-size: 0.85rem;">
            ${t.transactionId}
          </span>
        </td>
        <td style="font-size: 0.82rem; color: var(--text-secondary); white-space: nowrap;">
          ${t.createdAt ? new Date(t.createdAt).toLocaleString() : 'N/A'}
        </td>
        <td>${senderDisplay}</td>
        <td>${receiverDisplay}</td>
        <td>
          <span class="badge ${typeBadgeClass}" style="font-size: 0.75rem;">${t.type}</span>
        </td>
        <td>
          <span class="${amountClass}" style="font-size: 0.96rem;">
            ${amountSign}₹${(t.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </td>
        <td>
          <span style="font-family: var(--font-mono); font-size: 0.85rem; color: var(--text-muted);">
            ₹${(t.balanceAfter || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </td>
        <td><span class="badge badge-success" style="font-size: 0.72rem;">${t.status || 'COMPLETED'}</span></td>
        <td style="text-align: right;">
          <div style="display: flex; gap: 6px; justify-content: flex-end;">
            <button class="btn btn-secondary btn-sm" onclick="viewTxnDetails('${t.transactionId}')" title="View Transaction Receipt">
              <i class="fa-solid fa-eye"></i>
            </button>
            <button class="btn btn-danger btn-sm" onclick="deleteTransaction('${t.transactionId}')" title="Delete Transaction Record">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  updatePagination(filteredTransactions.length);
}

function deleteTransaction(transactionId) {
  AdminCommon.confirmModal({
    title: 'Delete Transaction Record',
    message: `Are you sure you want to delete transaction record <strong style="font-family: var(--font-mono); color: var(--danger);">${transactionId}</strong>?`,
    confirmText: 'Delete Record',
    confirmClass: 'btn-danger',
    onConfirm: async () => {
      await API.request(`/admin/transactions/${transactionId}`, 'DELETE');
      Utils.showToast(`Transaction ${transactionId} deleted.`, 'success');
      await loadTransactions();
    }
  });
}

function handleClearAllTransactions() {
  AdminCommon.confirmModal({
    title: 'Clear All Transaction Records',
    message: 'WARNING: Are you sure you want to remove ALL transaction records from the system? This action cannot be undone.',
    confirmText: 'Clear All Transactions',
    confirmClass: 'btn-danger',
    onConfirm: async () => {
      await API.request('/admin/transactions/clear-all', 'DELETE');
      Utils.showToast('All transaction records have been cleared.', 'success');
      await loadTransactions();
    }
  });
}

window.deleteTransaction = deleteTransaction;
window.handleClearAllTransactions = handleClearAllTransactions;

function updatePagination(totalCount) {
  const summary = document.getElementById('txnCountSummary');
  const container = document.getElementById('txnPaginationBtns');
  if (!summary || !container) return;

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;
  summary.textContent = `Showing ${(currentPage - 1) * PAGE_SIZE + (totalCount > 0 ? 1 : 0)} to ${Math.min(currentPage * PAGE_SIZE, totalCount)} of ${totalCount} transactions`;

  let btnsHtml = `
    <button class="btn btn-secondary btn-sm" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">
      <i class="fa-solid fa-chevron-left"></i>
    </button>
  `;

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      btnsHtml += `
        <button class="btn ${i === currentPage ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="changePage(${i})">
          ${i}
        </button>
      `;
    } else if (i === currentPage - 2 || i === currentPage + 2) {
      btnsHtml += `<span style="padding: 4px 6px; color: var(--text-muted);">...</span>`;
    }
  }

  btnsHtml += `
    <button class="btn btn-secondary btn-sm" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">
      <i class="fa-solid fa-chevron-right"></i>
    </button>
  `;

  container.innerHTML = btnsHtml;
}

function changePage(page) {
  currentPage = page;
  renderTable();
}

function viewTxnDetails(transactionId) {
  const t = allTransactions.find(item => item.transactionId === transactionId);
  if (!t) return;

  const body = document.getElementById('txnModalBody');
  if (!body) return;

  const isCredit = t.type === 'DEPOSIT' || t.type === 'LOAN_DISBURSEMENT';
  const color = isCredit ? 'var(--success)' : 'var(--danger)';
  const sign = isCredit ? '+' : '-';

  body.innerHTML = `
    <div style="background: var(--bg-surface); padding: 14px; border-radius: var(--radius-md); text-align: center; margin-bottom: 8px;">
      <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Amount Processed</div>
      <div style="font-size: 1.6rem; font-weight: 800; color: ${color}; font-family: var(--font-mono); margin-top: 4px;">
        ${sign}₹${(t.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </div>
      <span class="badge badge-success" style="margin-top: 6px;">Status: ${t.status || 'COMPLETED'}</span>
    </div>

    <div style="display: flex; justify-content: space-between;">
      <span style="color: var(--text-muted);">Transaction ID:</span>
      <strong style="font-family: var(--font-mono); color: #fff;">${t.transactionId}</strong>
    </div>

    <div style="display: flex; justify-content: space-between;">
      <span style="color: var(--text-muted);">Type:</span>
      <span class="badge" style="background: rgba(56, 189, 248, 0.15); color: var(--accent-cyan);">${t.type}</span>
    </div>

    <div style="display: flex; justify-content: space-between;">
      <span style="color: var(--text-muted);">Sender Account:</span>
      <strong style="font-family: var(--font-mono); color: #fff;">${t.senderAccount || 'Treasury / Cash'}</strong>
    </div>

    <div style="display: flex; justify-content: space-between;">
      <span style="color: var(--text-muted);">Receiver Account:</span>
      <strong style="font-family: var(--font-mono); color: var(--accent-cyan);">${t.receiverAccount || 'Self / Cash ATM'}</strong>
    </div>

    <div style="display: flex; justify-content: space-between;">
      <span style="color: var(--text-muted);">Description / Purpose:</span>
      <span style="color: #fff; text-align: right; max-width: 220px;">${t.description || 'Standard Banking Transfer'}</span>
    </div>

    <div style="display: flex; justify-content: space-between;">
      <span style="color: var(--text-muted);">Timestamp:</span>
      <span style="color: var(--text-secondary);">${t.createdAt ? new Date(t.createdAt).toLocaleString() : 'N/A'}</span>
    </div>
  `;

  document.getElementById('txnDetailsModal').classList.add('active');
}

function exportTxnCsv() {
  const exportData = filteredTransactions.map(t => ({
    'Transaction ID': t.transactionId,
    'Timestamp': t.createdAt ? new Date(t.createdAt).toLocaleString() : 'N/A',
    'Sender Account': t.senderAccount || 'Treasury / Cash',
    'Receiver Account': t.receiverAccount || 'Self / Cash ATM',
    'Type': t.type,
    'Amount (INR)': t.amount,
    'Balance After': t.balanceAfter,
    'Description': t.description,
    'Status': t.status || 'COMPLETED'
  }));

  AdminCommon.exportCSV(exportData, 'GG_BANK_Global_Ledger.csv');
}

window.changePage = changePage;
window.viewTxnDetails = viewTxnDetails;
window.exportTxnCsv = exportTxnCsv;

