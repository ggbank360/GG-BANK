/**
 * GG BANK - Account Management Controller (admin-accounts.js)
 * Implements Account listing, Search, Type/Status Filters, and Status Actions.
 */

let allAccounts = [];
let filteredAccounts = [];
let currentPage = 1;
const PAGE_SIZE = 8;

document.addEventListener('DOMContentLoaded', async () => {
  const admin = AdminCommon.init('accounts');
  if (!admin) return;

  await loadAccounts();
  setupEventListeners();
  window.__adminRefreshData = loadAccounts;
});

async function loadAccounts() {
  AdminCommon.renderLoading('adminAccountsTableBody', 'Loading bank account portfolios...');
  try {
    const res = await API.request('/admin/accounts');
    allAccounts = res.data || [];
    applyFilters();
  } catch (err) {
    AdminCommon.renderError('adminAccountsTableBody', 'Failed to load accounts: ' + err.message, loadAccounts);
  }
}

function setupEventListeners() {
  const searchInput = document.getElementById('accountSearchInput');
  const typeFilter = document.getElementById('accountTypeFilter');
  const statusFilter = document.getElementById('accountStatusFilter');

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      currentPage = 1;
      applyFilters();
    });
  }

  if (typeFilter) {
    typeFilter.addEventListener('change', () => {
      currentPage = 1;
      applyFilters();
    });
  }

  if (statusFilter) {
    statusFilter.addEventListener('change', () => {
      currentPage = 1;
      applyFilters();
    });
  }
}

function applyFilters() {
  const query = (document.getElementById('accountSearchInput')?.value || '').toLowerCase().trim();
  const type = document.getElementById('accountTypeFilter')?.value || 'ALL';
  const status = document.getElementById('accountStatusFilter')?.value || 'ALL';

  filteredAccounts = allAccounts.filter(a => {
    const matchesQuery = !query ||
      (a.accountNumber && a.accountNumber.includes(query)) ||
      (a.customerName && a.customerName.toLowerCase().includes(query)) ||
      (a.ifscCode && a.ifscCode.toLowerCase().includes(query)) ||
      (a.branch && a.branch.toLowerCase().includes(query));

    const matchesType = type === 'ALL' || (a.accountType && a.accountType.toUpperCase() === type);
    const matchesStatus = status === 'ALL' || (a.status && a.status.toUpperCase() === status);

    return matchesQuery && matchesType && matchesStatus;
  });

  renderTable();
}

function renderTable() {
  const tbody = document.getElementById('adminAccountsTableBody');
  if (!tbody) return;

  if (filteredAccounts.length === 0) {
    AdminCommon.renderEmpty('adminAccountsTableBody', 'No bank accounts found matching criteria.', 'fa-vault');
    updatePagination(0);
    return;
  }

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginated = filteredAccounts.slice(startIndex, startIndex + PAGE_SIZE);

  tbody.innerHTML = paginated.map(a => {
    const status = a.status || 'ACTIVE';
    let badgeClass = 'badge-success';
    if (status === 'INACTIVE') badgeClass = 'badge-warning';
    if (status === 'BLOCKED') badgeClass = 'badge-danger';

    const created = a.createdAt ? new Date(a.createdAt).toLocaleDateString() : 'N/A';

    return `
      <tr>
        <td>
          <span style="font-family: var(--font-mono); font-weight: 700; color: #ffffff; font-size: 0.95rem;">${a.accountNumber}</span>
        </td>
        <td>
          <div style="font-weight: 700; color: var(--text-primary);">${a.customerName || 'N/A'}</div>
          <div style="font-size: 0.76rem; color: var(--text-muted);">${a.customerEmail || ''}</div>
        </td>
        <td>
          <span class="badge" style="background: rgba(56, 189, 248, 0.15); color: var(--accent-cyan);">${a.accountType || 'SAVINGS'}</span>
        </td>
        <td>
          <span style="font-family: var(--font-mono); font-weight: 800; color: var(--success); font-size: 0.95rem;">
            ₹${(a.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </td>
        <td><span style="font-family: var(--font-mono); font-size: 0.82rem; color: var(--text-secondary);">${a.ifscCode || 'GGBN0001234'}</span></td>
        <td style="font-size: 0.85rem; color: var(--text-secondary);">${a.branch || 'Central Tech Branch'}</td>
        <td><span class="badge ${badgeClass}">${status}</span></td>
        <td style="font-size: 0.8rem; color: var(--text-muted);">${created}</td>
        <td style="text-align: right;">
          <div class="table-action-btns" style="justify-content: flex-end;">
            <!-- View Customer Details -->
            <a href="customer-details.html?id=${a.userId}" class="btn btn-secondary btn-sm" title="View Customer Dossier">
              <i class="fa-solid fa-eye"></i>
            </a>

            <!-- Status Toggles -->
            ${status !== 'ACTIVE' ? `
              <button class="btn btn-success btn-sm" onclick="toggleAccountStatus('${a.accountId || a.accountNumber}', 'ACTIVE', '${a.accountNumber}')" title="Activate Account">
                <i class="fa-solid fa-circle-check"></i>
              </button>
            ` : ''}

            ${status === 'ACTIVE' ? `
              <button class="btn btn-warning btn-sm" onclick="toggleAccountStatus('${a.accountId || a.accountNumber}', 'INACTIVE', '${a.accountNumber}')" title="Deactivate Account">
                <i class="fa-solid fa-pause"></i>
              </button>
            ` : ''}

            ${status !== 'BLOCKED' ? `
              <button class="btn btn-secondary btn-sm" onclick="toggleAccountStatus('${a.accountId || a.accountNumber}', 'BLOCKED', '${a.accountNumber}')" title="Block Account">
                <i class="fa-solid fa-ban"></i>
              </button>
            ` : ''}

            <!-- Delete Account Button -->
            <button class="btn btn-danger btn-sm" onclick="deleteAccount('${a.accountId || a.accountNumber}', '${a.accountNumber}')" title="Delete Account Record">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  updatePagination(filteredAccounts.length);
}

function updatePagination(totalCount) {
  const summary = document.getElementById('accountCountSummary');
  const container = document.getElementById('accountPaginationBtns');
  if (!summary || !container) return;

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;
  summary.textContent = `Showing ${(currentPage - 1) * PAGE_SIZE + (totalCount > 0 ? 1 : 0)} to ${Math.min(currentPage * PAGE_SIZE, totalCount)} of ${totalCount} accounts`;

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

function toggleAccountStatus(accountId, newStatus, accountNumber) {
  let confirmClass = 'btn-primary';
  if (newStatus === 'ACTIVE') confirmClass = 'btn-success';
  if (newStatus === 'INACTIVE') confirmClass = 'btn-warning';
  if (newStatus === 'BLOCKED') confirmClass = 'btn-danger';

  AdminCommon.confirmModal({
    title: `Account Status: ${newStatus}`,
    message: `Are you sure you want to change the status of account <strong style="font-family: var(--font-mono); color: #fff;">${accountNumber}</strong> to <strong style="color: var(--accent-cyan);">${newStatus}</strong>?`,
    confirmText: `Confirm ${newStatus}`,
    confirmClass: confirmClass,
    onConfirm: async () => {
      let endpoint = `/admin/accounts/${accountId}/status`;
      if (newStatus === 'ACTIVE') endpoint = `/admin/accounts/${accountId}/activate`;
      else if (newStatus === 'INACTIVE') endpoint = `/admin/accounts/${accountId}/deactivate`;
      else if (newStatus === 'BLOCKED') endpoint = `/admin/accounts/${accountId}/block`;

      await API.request(endpoint, 'PUT', { status: newStatus });
      Utils.showToast(`Account ${accountNumber} status set to ${newStatus}`, 'success');
      await loadAccounts();
    }
  });
}

function deleteAccount(accountId, accountNumber) {
  AdminCommon.confirmModal({
    title: 'Delete Account Record',
    message: `Are you sure you want to delete 11-digit account <strong style="font-family: var(--font-mono); color: var(--danger);">${accountNumber}</strong>? This action will permanently remove this account.`,
    confirmText: 'Delete Account',
    confirmClass: 'btn-danger',
    onConfirm: async () => {
      await API.request(`/admin/accounts/${accountId}`, 'DELETE');
      Utils.showToast(`Account ${accountNumber} deleted successfully.`, 'success');
      await loadAccounts();
    }
  });
}

function handleClearAllAccounts() {
  AdminCommon.confirmModal({
    title: 'Clear All Bank Accounts',
    message: 'WARNING: Are you sure you want to remove ALL bank account records from the system? This action cannot be undone.',
    confirmText: 'Clear All Accounts',
    confirmClass: 'btn-danger',
    onConfirm: async () => {
      await API.request('/admin/accounts/clear-all', 'DELETE');
      Utils.showToast('All bank accounts have been cleared.', 'success');
      await loadAccounts();
    }
  });
}

function openAddAccountModal() {
  const modal = document.getElementById('addAccountModal');
  if (modal) {
    modal.classList.add('active');
    generateRandom11DigitAcc();
  }
}

function closeAddAccountModal() {
  const modal = document.getElementById('addAccountModal');
  if (modal) modal.classList.remove('active');
}

function generateRandom11DigitAcc() {
  const input = document.getElementById('newAccNumber');
  if (input) {
    const random11 = '100188' + Math.floor(10000 + Math.random() * 90000);
    input.value = random11;
  }
}

// Add Account Form submit
document.addEventListener('DOMContentLoaded', () => {
  const addForm = document.getElementById('addAccountForm');
  if (addForm) {
    addForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const customerName = document.getElementById('newAccCustomerName').value.trim();
      const customerEmail = document.getElementById('newAccEmail').value.trim();
      const customerPhone = document.getElementById('newAccPhone').value.trim();
      const accountNumber = document.getElementById('newAccNumber').value.trim();
      const accountType = document.getElementById('newAccType').value;
      const balance = parseFloat(document.getElementById('newAccBalance').value) || 0;
      const branch = document.getElementById('newAccBranch').value;
      const ifscCode = document.getElementById('newAccIfsc').value;

      if (accountNumber.length !== 11) {
        Utils.showToast('Account number must be exactly 11 digits.', 'error');
        return;
      }

      try {
        await API.request('/admin/accounts', 'POST', {
          customerName,
          customerEmail,
          customerPhone,
          accountNumber,
          accountType,
          balance,
          branch,
          ifscCode
        });

        Utils.showToast(`Account ${accountNumber} provisioned successfully!`, 'success');
        closeAddAccountModal();
        addForm.reset();
        await loadAccounts();
      } catch (err) {
        Utils.showToast(err.message, 'error', 'Failed to create account');
      }
    });
  }
});

function exportAccountsCsv() {
  const exportData = filteredAccounts.map(a => ({
    'Account Number': a.accountNumber,
    'Customer Name': a.customerName || 'N/A',
    'Account Type': a.accountType || 'SAVINGS',
    'Balance (INR)': a.balance || 0,
    'IFSC Code': a.ifscCode || 'GGBN0001234',
    'Branch': a.branch || 'Central Tech Branch',
    'Status': a.status || 'ACTIVE',
    'Created Date': a.createdAt ? new Date(a.createdAt).toLocaleDateString() : 'N/A'
  }));

  AdminCommon.exportCSV(exportData, 'GG_BANK_Accounts.csv');
}

window.openAddAccountModal = openAddAccountModal;
window.closeAddAccountModal = closeAddAccountModal;
window.generateRandom11DigitAcc = generateRandom11DigitAcc;
window.deleteAccount = deleteAccount;
window.handleClearAllAccounts = handleClearAllAccounts;
window.changePage = changePage;
window.toggleAccountStatus = toggleAccountStatus;
window.exportAccountsCsv = exportAccountsCsv;

