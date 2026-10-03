/**
 * GG BANK - Transfer Management Controller (admin-transfers.js)
 * Manages only transfer operations, sender/receiver verification, and receipts.
 */

let allTransfers = [];
let filteredTransfers = [];
let currentPage = 1;
const PAGE_SIZE = 10;

document.addEventListener('DOMContentLoaded', async () => {
  const admin = AdminCommon.init('transfers');
  if (!admin) return;

  await loadTransfers();
  setupEventListeners();
  window.__adminRefreshData = loadTransfers;
});

async function loadTransfers() {
  AdminCommon.renderLoading('adminTransferTableBody', 'Loading transfer records...');
  try {
    const res = await API.request('/admin/transfers');
    allTransfers = res.data || [];
    applyFilters();
  } catch (err) {
    AdminCommon.renderError('adminTransferTableBody', 'Failed to load transfers: ' + err.message, loadTransfers);
  }
}

function setupEventListeners() {
  const searchInput = document.getElementById('transferSearchInput');
  const dateFilter = document.getElementById('transferDateFilter');

  if (searchInput) searchInput.addEventListener('input', () => { currentPage = 1; applyFilters(); });
  if (dateFilter) dateFilter.addEventListener('change', () => { currentPage = 1; applyFilters(); });
}

function applyFilters() {
  const query = (document.getElementById('transferSearchInput')?.value || '').toLowerCase().trim();
  const period = document.getElementById('transferDateFilter')?.value || 'ALL';

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfWeek = now.getTime() - 7 * 86400000;
  const startOfMonth = now.getTime() - 30 * 86400000;

  filteredTransfers = allTransfers.filter(t => {
    const matchesQuery = !query ||
      (t.transactionId && t.transactionId.toLowerCase().includes(query)) ||
      (t.senderAccount && t.senderAccount.includes(query)) ||
      (t.receiverAccount && t.receiverAccount.includes(query)) ||
      (t.description && t.description.toLowerCase().includes(query));

    let matchesDate = true;
    if (period !== 'ALL' && t.createdAt) {
      const tTime = new Date(t.createdAt).getTime();
      if (period === 'TODAY') matchesDate = tTime >= startOfToday;
      else if (period === 'WEEK') matchesDate = tTime >= startOfWeek;
      else if (period === 'MONTH') matchesDate = tTime >= startOfMonth;
    }

    return matchesQuery && matchesDate;
  });

  renderTable();
}

function renderTable() {
  const tbody = document.getElementById('adminTransferTableBody');
  if (!tbody) return;

  if (filteredTransfers.length === 0) {
    AdminCommon.renderEmpty('adminTransferTableBody', 'No transfer records found matching criteria.', 'fa-right-left');
    updatePagination(0);
    return;
  }

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginated = filteredTransfers.slice(startIndex, startIndex + PAGE_SIZE);

  tbody.innerHTML = paginated.map(t => `
    <tr>
      <td>
        <span style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-cyan); font-size: 0.85rem;">
          ${t.transactionId}
        </span>
      </td>
      <td>
        <span style="font-family: var(--font-mono); font-weight: 700; color: #fff; font-size: 0.92rem;">
          ${t.senderAccount}
        </span>
      </td>
      <td>
        <span style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-cyan); font-size: 0.92rem;">
          ${t.receiverAccount}
        </span>
      </td>
      <td>
        <span style="font-family: var(--font-mono); font-weight: 800; color: #a78bfa; font-size: 0.95rem;">
          ₹${(t.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      </td>
      <td style="font-size: 0.82rem; color: var(--text-secondary);">
        ${t.createdAt ? new Date(t.createdAt).toLocaleString() : 'N/A'}
      </td>
      <td>
        <span style="font-family: var(--font-mono); font-size: 0.85rem; color: var(--text-muted);">
          ₹${(t.balanceAfter || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      </td>
      <td><span class="badge badge-success" style="font-size: 0.72rem;">COMPLETED</span></td>
      <td style="text-align: right;">
        <button class="btn btn-secondary btn-sm" onclick="viewTransferDetails('${t.transactionId}')" title="View Transfer Details">
          <i class="fa-solid fa-eye"></i> View
        </button>
      </td>
    </tr>
  `).join('');

  updatePagination(filteredTransfers.length);
}

function updatePagination(totalCount) {
  const summary = document.getElementById('transferCountSummary');
  const container = document.getElementById('transferPaginationBtns');
  if (!summary || !container) return;

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;
  summary.textContent = `Showing ${(currentPage - 1) * PAGE_SIZE + (totalCount > 0 ? 1 : 0)} to ${Math.min(currentPage * PAGE_SIZE, totalCount)} of ${totalCount} transfers`;

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

function viewTransferDetails(transactionId) {
  const t = allTransfers.find(item => item.transactionId === transactionId);
  if (!t) return;

  const body = document.getElementById('transferModalBody');
  if (!body) return;

  body.innerHTML = `
    <div style="background: var(--bg-surface); padding: 14px; border-radius: var(--radius-md); text-align: center; margin-bottom: 8px;">
      <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Transfer Value</div>
      <div style="font-size: 1.6rem; font-weight: 800; color: #a78bfa; font-family: var(--font-mono); margin-top: 4px;">
        ₹${(t.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </div>
      <span class="badge badge-success" style="margin-top: 6px;">Status: COMPLETED</span>
    </div>

    <div style="display: flex; justify-content: space-between;">
      <span style="color: var(--text-muted);">Transfer ID:</span>
      <strong style="font-family: var(--font-mono); color: #fff;">${t.transactionId}</strong>
    </div>

    <div style="display: flex; justify-content: space-between;">
      <span style="color: var(--text-muted);">Sender Account:</span>
      <strong style="font-family: var(--font-mono); color: #fff;">${t.senderAccount}</strong>
    </div>

    <div style="display: flex; justify-content: space-between;">
      <span style="color: var(--text-muted);">Receiver Account:</span>
      <strong style="font-family: var(--font-mono); color: var(--accent-cyan);">${t.receiverAccount}</strong>
    </div>

    <div style="display: flex; justify-content: space-between;">
      <span style="color: var(--text-muted);">Description:</span>
      <span style="color: #fff; text-align: right; max-width: 220px;">${t.description || 'Interbank Transfer'}</span>
    </div>

    <div style="display: flex; justify-content: space-between;">
      <span style="color: var(--text-muted);">Timestamp:</span>
      <span style="color: var(--text-secondary);">${t.createdAt ? new Date(t.createdAt).toLocaleString() : 'N/A'}</span>
    </div>
  `;

  document.getElementById('transferDetailsModal').classList.add('active');
}

function exportTransfersCsv() {
  const exportData = filteredTransfers.map(t => ({
    'Transfer ID': t.transactionId,
    'Sender Account': t.senderAccount,
    'Receiver Account': t.receiverAccount,
    'Amount (INR)': t.amount,
    'Date': t.createdAt ? new Date(t.createdAt).toLocaleString() : 'N/A',
    'Balance After': t.balanceAfter,
    'Description': t.description,
    'Status': 'COMPLETED'
  }));

  AdminCommon.exportCSV(exportData, 'GG_BANK_Transfers.csv');
}
