/**
 * GG BANK - Withdrawal Management Controller (admin-withdrawals.js)
 * Manages only withdrawal records, search, filters, and receipt modal.
 */

let allWithdrawals = [];
let filteredWithdrawals = [];
let currentPage = 1;
const PAGE_SIZE = 10;

document.addEventListener('DOMContentLoaded', async () => {
  const admin = AdminCommon.init('withdrawals');
  if (!admin) return;

  await loadWithdrawals();
  setupEventListeners();
  window.__adminRefreshData = loadWithdrawals;
});

async function loadWithdrawals() {
  AdminCommon.renderLoading('adminWithdrawalTableBody', 'Loading withdrawal records...');
  try {
    const res = await API.request('/admin/withdrawals');
    allWithdrawals = res.data || [];
    applyFilters();
  } catch (err) {
    AdminCommon.renderError('adminWithdrawalTableBody', 'Failed to load withdrawals: ' + err.message, loadWithdrawals);
  }
}

function setupEventListeners() {
  const searchInput = document.getElementById('withdrawalSearchInput');
  const dateFilter = document.getElementById('withdrawalDateFilter');

  if (searchInput) searchInput.addEventListener('input', () => { currentPage = 1; applyFilters(); });
  if (dateFilter) dateFilter.addEventListener('change', () => { currentPage = 1; applyFilters(); });
}

function applyFilters() {
  const query = (document.getElementById('withdrawalSearchInput')?.value || '').toLowerCase().trim();
  const period = document.getElementById('withdrawalDateFilter')?.value || 'ALL';

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfWeek = now.getTime() - 7 * 86400000;
  const startOfMonth = now.getTime() - 30 * 86400000;

  filteredWithdrawals = allWithdrawals.filter(w => {
    const matchesQuery = !query ||
      (w.transactionId && w.transactionId.toLowerCase().includes(query)) ||
      (w.senderAccount && w.senderAccount.includes(query)) ||
      (w.description && w.description.toLowerCase().includes(query)) ||
      (w.receiverAccount && w.receiverAccount.toLowerCase().includes(query));

    let matchesDate = true;
    if (period !== 'ALL' && w.createdAt) {
      const tTime = new Date(w.createdAt).getTime();
      if (period === 'TODAY') matchesDate = tTime >= startOfToday;
      else if (period === 'WEEK') matchesDate = tTime >= startOfWeek;
      else if (period === 'MONTH') matchesDate = tTime >= startOfMonth;
    }

    return matchesQuery && matchesDate;
  });

  renderTable();
}

function renderTable() {
  const tbody = document.getElementById('adminWithdrawalTableBody');
  if (!tbody) return;

  if (filteredWithdrawals.length === 0) {
    AdminCommon.renderEmpty('adminWithdrawalTableBody', 'No withdrawal records found matching criteria.', 'fa-money-bill-trend-up');
    updatePagination(0);
    return;
  }

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginated = filteredWithdrawals.slice(startIndex, startIndex + PAGE_SIZE);

  tbody.innerHTML = paginated.map(w => `
    <tr>
      <td>
        <span style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-cyan); font-size: 0.85rem;">
          ${w.transactionId}
        </span>
      </td>
      <td>
        <span style="font-family: var(--font-mono); font-weight: 700; color: #fff; font-size: 0.92rem;">
          ${w.senderAccount}
        </span>
      </td>
      <td>
        <span style="font-family: var(--font-mono); font-weight: 800; color: var(--danger); font-size: 0.95rem;">
          -₹${(w.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      </td>
      <td>
        <span style="color: var(--text-secondary); font-size: 0.85rem;">
          ${w.receiverAccount || 'Self / Cash ATM'}
        </span>
      </td>
      <td style="font-size: 0.82rem; color: var(--text-secondary);">
        ${w.createdAt ? new Date(w.createdAt).toLocaleString() : 'N/A'}
      </td>
      <td>
        <span style="font-family: var(--font-mono); font-size: 0.85rem; color: var(--text-muted);">
          ₹${(w.balanceAfter || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      </td>
      <td><span class="badge badge-success" style="font-size: 0.72rem;">COMPLETED</span></td>
      <td style="text-align: right;">
        <button class="btn btn-secondary btn-sm" onclick="viewWithdrawalDetails('${w.transactionId}')" title="View Withdrawal Details">
          <i class="fa-solid fa-eye"></i> View
        </button>
      </td>
    </tr>
  `).join('');

  updatePagination(filteredWithdrawals.length);
}

function updatePagination(totalCount) {
  const summary = document.getElementById('withdrawalCountSummary');
  const container = document.getElementById('withdrawalPaginationBtns');
  if (!summary || !container) return;

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;
  summary.textContent = `Showing ${(currentPage - 1) * PAGE_SIZE + (totalCount > 0 ? 1 : 0)} to ${Math.min(currentPage * PAGE_SIZE, totalCount)} of ${totalCount} withdrawals`;

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

function viewWithdrawalDetails(transactionId) {
  const w = allWithdrawals.find(item => item.transactionId === transactionId);
  if (!w) return;

  const body = document.getElementById('withdrawalModalBody');
  if (!body) return;

  body.innerHTML = `
    <div style="background: var(--bg-surface); padding: 14px; border-radius: var(--radius-md); text-align: center; margin-bottom: 8px;">
      <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Withdrawal Amount</div>
      <div style="font-size: 1.6rem; font-weight: 800; color: var(--danger); font-family: var(--font-mono); margin-top: 4px;">
        -₹${(w.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </div>
      <span class="badge badge-success" style="margin-top: 6px;">Status: COMPLETED</span>
    </div>

    <div style="display: flex; justify-content: space-between;">
      <span style="color: var(--text-muted);">Withdrawal ID:</span>
      <strong style="font-family: var(--font-mono); color: #fff;">${w.transactionId}</strong>
    </div>

    <div style="display: flex; justify-content: space-between;">
      <span style="color: var(--text-muted);">Debited Account:</span>
      <strong style="font-family: var(--font-mono); color: var(--accent-cyan);">${w.senderAccount}</strong>
    </div>

    <div style="display: flex; justify-content: space-between;">
      <span style="color: var(--text-muted);">Channel / Recipient:</span>
      <span style="color: #fff;">${w.receiverAccount || 'Self / ATM'}</span>
    </div>

    <div style="display: flex; justify-content: space-between;">
      <span style="color: var(--text-muted);">Reason / Description:</span>
      <span style="color: #fff; text-align: right; max-width: 220px;">${w.description || 'Cash Withdrawal'}</span>
    </div>

    <div style="display: flex; justify-content: space-between;">
      <span style="color: var(--text-muted);">Timestamp:</span>
      <span style="color: var(--text-secondary);">${w.createdAt ? new Date(w.createdAt).toLocaleString() : 'N/A'}</span>
    </div>
  `;

  document.getElementById('withdrawalDetailsModal').classList.add('active');
}

function exportWithdrawalsCsv() {
  const exportData = filteredWithdrawals.map(w => ({
    'Withdrawal ID': w.transactionId,
    'Source Account': w.senderAccount,
    'Debit Amount (INR)': w.amount,
    'Channel': w.receiverAccount,
    'Date': w.createdAt ? new Date(w.createdAt).toLocaleString() : 'N/A',
    'Balance After': w.balanceAfter,
    'Description': w.description,
    'Status': 'COMPLETED'
  }));

  AdminCommon.exportCSV(exportData, 'GG_BANK_Withdrawals.csv');
}
