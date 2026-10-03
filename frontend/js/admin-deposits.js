/**
 * GG BANK - Deposit Management Controller (admin-deposits.js)
 * Manages only deposit records, treasury credits, search, filters, and receipts.
 */

let allDeposits = [];
let filteredDeposits = [];
let currentPage = 1;
const PAGE_SIZE = 10;

document.addEventListener('DOMContentLoaded', async () => {
  const admin = AdminCommon.init('deposits');
  if (!admin) return;

  await loadDeposits();
  setupEventListeners();
  window.__adminRefreshData = loadDeposits;
});

async function loadDeposits() {
  AdminCommon.renderLoading('adminDepositTableBody', 'Loading deposit records...');
  try {
    const res = await API.request('/admin/deposits');
    allDeposits = res.data || [];
    applyFilters();
  } catch (err) {
    AdminCommon.renderError('adminDepositTableBody', 'Failed to load deposits: ' + err.message, loadDeposits);
  }
}

function setupEventListeners() {
  const searchInput = document.getElementById('depositSearchInput');
  const dateFilter = document.getElementById('depositDateFilter');

  if (searchInput) searchInput.addEventListener('input', () => { currentPage = 1; applyFilters(); });
  if (dateFilter) dateFilter.addEventListener('change', () => { currentPage = 1; applyFilters(); });
}

function applyFilters() {
  const query = (document.getElementById('depositSearchInput')?.value || '').toLowerCase().trim();
  const period = document.getElementById('depositDateFilter')?.value || 'ALL';

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfWeek = now.getTime() - 7 * 86400000;
  const startOfMonth = now.getTime() - 30 * 86400000;

  filteredDeposits = allDeposits.filter(d => {
    const matchesQuery = !query ||
      (d.transactionId && d.transactionId.toLowerCase().includes(query)) ||
      (d.receiverAccount && d.receiverAccount.includes(query)) ||
      (d.description && d.description.toLowerCase().includes(query)) ||
      (d.senderAccount && d.senderAccount.toLowerCase().includes(query));

    let matchesDate = true;
    if (period !== 'ALL' && d.createdAt) {
      const tTime = new Date(d.createdAt).getTime();
      if (period === 'TODAY') matchesDate = tTime >= startOfToday;
      else if (period === 'WEEK') matchesDate = tTime >= startOfWeek;
      else if (period === 'MONTH') matchesDate = tTime >= startOfMonth;
    }

    return matchesQuery && matchesDate;
  });

  renderTable();
}

function renderTable() {
  const tbody = document.getElementById('adminDepositTableBody');
  if (!tbody) return;

  if (filteredDeposits.length === 0) {
    AdminCommon.renderEmpty('adminDepositTableBody', 'No deposit records found matching criteria.', 'fa-circle-dollar-to-slot');
    updatePagination(0);
    return;
  }

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginated = filteredDeposits.slice(startIndex, startIndex + PAGE_SIZE);

  tbody.innerHTML = paginated.map(d => `
    <tr>
      <td>
        <span style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-cyan); font-size: 0.85rem;">
          ${d.transactionId}
        </span>
      </td>
      <td>
        <span style="font-family: var(--font-mono); font-weight: 700; color: #fff; font-size: 0.92rem;">
          ${d.receiverAccount}
        </span>
      </td>
      <td>
        <span style="font-family: var(--font-mono); font-weight: 800; color: var(--success); font-size: 0.95rem;">
          +₹${(d.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      </td>
      <td>
        <span class="badge" style="background: rgba(0, 230, 118, 0.15); color: var(--success); font-size: 0.75rem;">
          ${d.senderAccount || 'Treasury Direct'}
        </span>
      </td>
      <td style="font-size: 0.82rem; color: var(--text-secondary);">
        ${d.createdAt ? new Date(d.createdAt).toLocaleString() : 'N/A'}
      </td>
      <td>
        <span style="font-family: var(--font-mono); font-size: 0.85rem; color: var(--text-muted);">
          ₹${(d.balanceAfter || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      </td>
      <td><span class="badge badge-success" style="font-size: 0.72rem;">COMPLETED</span></td>
      <td style="text-align: right;">
        <button class="btn btn-secondary btn-sm" onclick="viewDepositDetails('${d.transactionId}')" title="View Deposit Receipt">
          <i class="fa-solid fa-eye"></i> View
        </button>
      </td>
    </tr>
  `).join('');

  updatePagination(filteredDeposits.length);
}

function updatePagination(totalCount) {
  const summary = document.getElementById('depositCountSummary');
  const container = document.getElementById('depositPaginationBtns');
  if (!summary || !container) return;

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;
  summary.textContent = `Showing ${(currentPage - 1) * PAGE_SIZE + (totalCount > 0 ? 1 : 0)} to ${Math.min(currentPage * PAGE_SIZE, totalCount)} of ${totalCount} deposits`;

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

function viewDepositDetails(transactionId) {
  const d = allDeposits.find(item => item.transactionId === transactionId);
  if (!d) return;

  const body = document.getElementById('depositModalBody');
  if (!body) return;

  body.innerHTML = `
    <div style="background: var(--bg-surface); padding: 14px; border-radius: var(--radius-md); text-align: center; margin-bottom: 8px;">
      <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Deposit Credit Value</div>
      <div style="font-size: 1.6rem; font-weight: 800; color: var(--success); font-family: var(--font-mono); margin-top: 4px;">
        +₹${(d.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </div>
      <span class="badge badge-success" style="margin-top: 6px;">Status: COMPLETED</span>
    </div>

    <div style="display: flex; justify-content: space-between;">
      <span style="color: var(--text-muted);">Deposit ID:</span>
      <strong style="font-family: var(--font-mono); color: #fff;">${d.transactionId}</strong>
    </div>

    <div style="display: flex; justify-content: space-between;">
      <span style="color: var(--text-muted);">Beneficiary Account:</span>
      <strong style="font-family: var(--font-mono); color: var(--accent-cyan);">${d.receiverAccount}</strong>
    </div>

    <div style="display: flex; justify-content: space-between;">
      <span style="color: var(--text-muted);">Payment Channel:</span>
      <span style="color: #fff;">${d.senderAccount || 'Direct Treasury'}</span>
    </div>

    <div style="display: flex; justify-content: space-between;">
      <span style="color: var(--text-muted);">Remarks:</span>
      <span style="color: #fff; text-align: right; max-width: 220px;">${d.description || 'Admin Cash Deposit'}</span>
    </div>

    <div style="display: flex; justify-content: space-between;">
      <span style="color: var(--text-muted);">Timestamp:</span>
      <span style="color: var(--text-secondary);">${d.createdAt ? new Date(d.createdAt).toLocaleString() : 'N/A'}</span>
    </div>
  `;

  document.getElementById('depositDetailsModal').classList.add('active');
}

function exportDepositsCsv() {
  const exportData = filteredDeposits.map(d => ({
    'Deposit ID': d.transactionId,
    'Beneficiary Account': d.receiverAccount,
    'Amount (INR)': d.amount,
    'Channel': d.senderAccount,
    'Date': d.createdAt ? new Date(d.createdAt).toLocaleString() : 'N/A',
    'Balance After': d.balanceAfter,
    'Remarks': d.description,
    'Status': 'COMPLETED'
  }));

  AdminCommon.exportCSV(exportData, 'GG_BANK_Deposits.csv');
}
