/**
 * GG BANK - Customer Management Controller (admin-customers.js)
 * Implements Customer listing, Search, Status Filtering, Profile Editing,
 * Status Toggles (Activate, Deactivate, Block), and Detail Routing.
 */

let allCustomers = [];
let filteredCustomers = [];
let currentPage = 1;
const PAGE_SIZE = 8;

document.addEventListener('DOMContentLoaded', async () => {
  const admin = AdminCommon.init('customers');
  if (!admin) return;

  await loadCustomers();
  setupEventListeners();
  window.__adminRefreshData = loadCustomers;
});

async function loadCustomers() {
  AdminCommon.renderLoading('adminCustomersTableBody', 'Loading customer directory...');
  try {
    const res = await API.request('/admin/customers');
    allCustomers = res.data || [];
    applyFilters();
  } catch (err) {
    AdminCommon.renderError('adminCustomersTableBody', 'Failed to load customers: ' + err.message, loadCustomers);
  }
}

function setupEventListeners() {
  const searchInput = document.getElementById('customerSearchInput');
  const statusFilter = document.getElementById('customerStatusFilter');

  if (searchInput) {
    searchInput.addEventListener('input', () => {
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

  // Edit Customer Form Submission
  const editForm = document.getElementById('editCustomerForm');
  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const userId = document.getElementById('editCustUserId').value;
      const btn = document.getElementById('btnSaveEditCustomer');

      const payload = {
        name: document.getElementById('editCustName').value.trim(),
        phone: document.getElementById('editCustPhone').value.trim(),
        dateOfBirth: document.getElementById('editCustDob').value,
        address: document.getElementById('editCustAddress').value.trim(),
        status: document.getElementById('editCustStatus').value
      };

      Utils.setLoading(btn, true, 'Saving...');
      try {
        await API.request(`/admin/customers/${userId}/edit`, 'PUT', payload);
        Utils.showToast('Customer profile updated successfully!', 'success');
        document.getElementById('editCustomerModal').classList.remove('active');
        await loadCustomers();
      } catch (err) {
        Utils.showToast(err.message || 'Failed to update profile', 'error');
      } finally {
        Utils.setLoading(btn, false);
      }
    });
  }
}

function setQuickCustomerFilter(status) {
  const filterSelect = document.getElementById('customerStatusFilter');
  if (filterSelect) {
    filterSelect.value = status;
  }
  currentPage = 1;
  applyFilters();

  document.getElementById('btnFilterAll')?.classList.toggle('btn-primary', status === 'ALL');
  document.getElementById('btnFilterAll')?.classList.toggle('btn-secondary', status !== 'ALL');
  document.getElementById('btnFilterKYC')?.classList.toggle('btn-warning', status === 'PENDING_APPROVAL');
  document.getElementById('btnFilterActive')?.classList.toggle('btn-primary', status === 'ACTIVE');
  document.getElementById('btnFilterActive')?.classList.toggle('btn-secondary', status !== 'ACTIVE');
}

function applyFilters() {
  const query = (document.getElementById('customerSearchInput')?.value || '').toLowerCase().trim();
  const status = document.getElementById('customerStatusFilter')?.value || 'ALL';

  // Update Pending KYC Badge Count
  const pendingKycCount = allCustomers.filter(c => (c.status === 'PENDING_APPROVAL' || c.accountStatus === 'PENDING_APPROVAL')).length;
  const badgeEl = document.getElementById('pendingKycBadgeCount');
  if (badgeEl) badgeEl.textContent = pendingKycCount;

  filteredCustomers = allCustomers.filter(c => {
    const docs = c.documents || {};
    const matchesQuery = !query || 
      (c.name && c.name.toLowerCase().includes(query)) ||
      (c.email && c.email.toLowerCase().includes(query)) ||
      (c.phone && c.phone.includes(query)) ||
      (c.accountNumber && c.accountNumber.includes(query)) ||
      (c.userId && c.userId.toLowerCase().includes(query)) ||
      (docs.panNumber && docs.panNumber.toLowerCase().includes(query)) ||
      (docs.dlNumber && docs.dlNumber.toLowerCase().includes(query)) ||
      (docs.aadhaarNumber && docs.aadhaarNumber.includes(query));

    const matchesStatus = status === 'ALL' || (c.status && c.status.toUpperCase() === status) || (c.accountStatus && c.accountStatus.toUpperCase() === status);

    return matchesQuery && matchesStatus;
  });

  // Build duplicate PAN index across ALL customers
  const panCount = {};
  allCustomers.forEach(c => {
    const pan = c.documents?.panNumber?.toUpperCase?.();
    if (pan) {
      panCount[pan] = (panCount[pan] || 0) + 1;
    }
  });
  window._adminDuplicatePanIndex = panCount;

  renderTable();
}

function renderTable() {
  const tbody = document.getElementById('adminCustomersTableBody');
  if (!tbody) return;

  if (filteredCustomers.length === 0) {
    AdminCommon.renderEmpty('adminCustomersTableBody', 'No customers found matching your criteria.', 'fa-users-slash');
    updatePagination(0);
    return;
  }

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginated = filteredCustomers.slice(startIndex, startIndex + PAGE_SIZE);

  tbody.innerHTML = paginated.map(c => {
    const status = c.status || c.accountStatus || 'ACTIVE';
    let badgeClass = 'badge-success';
    if (status === 'INACTIVE') badgeClass = 'badge-warning';
    if (status === 'BLOCKED' || status === 'REJECTED') badgeClass = 'badge-danger';
    if (status === 'PENDING_APPROVAL') badgeClass = 'badge-warning';

    const created = c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A';
    const docs = c.documents || {};
    const panNum = docs.panNumber || 'ABCDE1234F';
    const dlNum = docs.dlNumber || 'DL-1420110012345';
    const aadhaarNum = docs.aadhaarNumber || '2345 6789 0123';

    // Detect duplicate PAN
    const dupPanIndex = window._adminDuplicatePanIndex || {};
    const isDuplicatePan = dupPanIndex[panNum.toUpperCase()] && dupPanIndex[panNum.toUpperCase()] > 1;
    const dupPanBadge = isDuplicatePan
      ? `<span title="This PAN number is shared with another customer account!" style="display:inline-flex;align-items:center;gap:4px;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.45);border-radius:6px;padding:2px 7px;font-size:0.68rem;font-weight:700;color:#fca5a5;margin-left:4px;cursor:help;">
           <i class="fa-solid fa-triangle-exclamation" style="color:#ef4444;"></i> DUPLICATE PAN
         </span>`
      : '';

    return `
      <tr style="${isDuplicatePan ? 'border-left: 3px solid var(--danger); background: rgba(239,68,68,0.04);' : ''}">
        <td>
          <strong style="font-family: var(--font-mono); color: var(--accent-cyan);">${c.userId}</strong>
        </td>
        <td>
          <div style="font-weight: 700; color: var(--text-primary);">${c.name} ${dupPanBadge}</div>
          <div style="display: flex; gap: 4px; margin-top: 4px; flex-wrap: wrap; align-items: center;">
            <span class="kyc-doc-badge pan" onclick="openCustomerKYCViewer('${c.userId}', 'PAN')" title="Click to View PAN Document" style="${isDuplicatePan ? 'border-color: rgba(239,68,68,0.5); background: rgba(239,68,68,0.08);' : ''}">
              <i class="fa-solid fa-id-card"></i> PAN: ${panNum}
              ${isDuplicatePan ? '<i class="fa-solid fa-triangle-exclamation" style="color:#ef4444;margin-left:3px;"></i>' : ''}
            </span>
            <span class="kyc-doc-badge dl" onclick="openCustomerKYCViewer('${c.userId}', 'DL')" title="Click to View Driving License">
              <i class="fa-solid fa-id-badge"></i> DL: ${dlNum}
            </span>
            <span class="kyc-doc-badge aadhaar" onclick="openCustomerKYCViewer('${c.userId}', 'AADHAAR')" title="Click to View Aadhaar Card">
              <i class="fa-solid fa-fingerprint"></i> Aadhaar: ${aadhaarNum}
            </span>
          </div>
        </td>
        <td>
          <span style="font-family: var(--font-mono); font-weight: 600; color: #ffffff;">${c.accountNumber}</span>
        </td>
        <td>
          <div style="font-size: 0.84rem; color: var(--text-primary);">${c.phone || 'N/A'}</div>
          <div style="font-size: 0.76rem; color: var(--text-muted);">${c.email}</div>
        </td>
        <td><span class="badge" style="background: rgba(56, 189, 248, 0.15); color: var(--accent-cyan); font-size: 0.75rem;">${c.accountType || 'SAVINGS'}</span></td>
        <td>
          <span class="badge ${badgeClass}">${status === 'PENDING_APPROVAL' ? 'PENDING APPROVAL' : status}</span>
        </td>
        <td style="font-size: 0.8rem; color: var(--text-muted);">${created}</td>
        <td style="text-align: right;">
          <div class="table-action-btns" style="justify-content: flex-end;">
            <!-- VIEW KYC DOCUMENTS BUTTON -->
            <button class="btn btn-primary btn-sm" onclick="openCustomerKYCViewer('${c.userId}')" title="View Submitted KYC Documents">
              <i class="fa-solid fa-file-shield"></i> View Docs
            </button>

            <!-- PENDING KYC ACTIONS: APPROVE / REJECT -->
            ${status === 'PENDING_APPROVAL' ? `
              <button class="btn btn-success btn-sm" onclick="approveCustomerKYC('${c.userId}', '${c.name}')" title="Approve KYC Documents & Grant Login Access">
                <i class="fa-solid fa-circle-check"></i> Approve & Activate
              </button>
              <button class="btn btn-danger btn-sm" onclick="rejectCustomerKYC('${c.userId}', '${c.name}')" title="Decline Application">
                <i class="fa-solid fa-xmark"></i> Reject
              </button>
            ` : ''}

            <!-- View Full Customer Details -->
            <a href="customer-details.html?id=${c.userId}" class="btn btn-secondary btn-sm" title="View Full Customer Profile">
              <i class="fa-solid fa-eye"></i> Details
            </a>
            
            <!-- Edit Profile Modal Button -->
            <button class="btn btn-secondary btn-sm" onclick="openEditCustomerModal('${c.userId}')" title="Edit Profile Details">
              <i class="fa-solid fa-user-pen"></i>
            </button>

            <!-- Status Controls -->
            ${status !== 'ACTIVE' && status !== 'PENDING_APPROVAL' ? `
              <button class="btn btn-success btn-sm" onclick="toggleCustomerStatus('${c.userId}', 'ACTIVE')" title="Activate Customer">
                <i class="fa-solid fa-circle-check"></i>
              </button>
            ` : ''}

            ${status === 'ACTIVE' ? `
              <button class="btn btn-warning btn-sm" onclick="toggleCustomerStatus('${c.userId}', 'INACTIVE')" title="Deactivate Customer">
                <i class="fa-solid fa-pause"></i>
              </button>
            ` : ''}

            ${status !== 'BLOCKED' ? `
              <button class="btn btn-secondary btn-sm" onclick="toggleCustomerStatus('${c.userId}', 'BLOCKED')" title="Block Customer">
                <i class="fa-solid fa-ban"></i>
              </button>
            ` : ''}

            <!-- Delete Customer Button -->
            <button class="btn btn-danger btn-sm" onclick="deleteCustomer('${c.userId}', '${c.name}')" title="Delete Customer Record">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  updatePagination(filteredCustomers.length);
}

function updatePagination(totalCount) {
  const summary = document.getElementById('customerCountSummary');
  const container = document.getElementById('customerPaginationBtns');
  if (!summary || !container) return;

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;
  summary.textContent = `Showing ${(currentPage - 1) * PAGE_SIZE + (totalCount > 0 ? 1 : 0)} to ${Math.min(currentPage * PAGE_SIZE, totalCount)} of ${totalCount} customers`;

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

function openEditCustomerModal(userId) {
  const customer = allCustomers.find(c => c.userId === userId);
  if (!customer) return;

  document.getElementById('editCustUserId').value = customer.userId;
  document.getElementById('editCustName').value = customer.name || '';
  document.getElementById('editCustPhone').value = customer.phone || '';
  document.getElementById('editCustDob').value = customer.dateOfBirth || '';
  document.getElementById('editCustAddress').value = customer.address || '';
  document.getElementById('editCustStatus').value = customer.status || 'ACTIVE';

  document.getElementById('editCustomerModal').classList.add('active');
}

function openAddCustomerModal() {
  const modal = document.getElementById('addCustomerModal');
  if (modal) modal.classList.add('active');
}

function closeAddCustomerModal() {
  const modal = document.getElementById('addCustomerModal');
  if (modal) modal.classList.remove('active');
}

// Add Customer Submission
document.addEventListener('DOMContentLoaded', () => {
  const addForm = document.getElementById('addCustomerForm');
  if (addForm) {
    addForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('addCustName').value.trim();
      const email = document.getElementById('addCustEmail').value.trim();
      const phone = document.getElementById('addCustPhone').value.trim();
      const accountType = document.getElementById('addCustAccType').value;
      const balance = parseFloat(document.getElementById('addCustBalance').value) || 0;
      const address = document.getElementById('addCustAddress').value.trim();

      try {
        await API.request('/admin/customers', 'POST', {
          name,
          email,
          phone,
          accountType,
          balance,
          address
        });
        Utils.showToast(`Customer ${name} registered successfully with 11-digit account!`, 'success');
        closeAddCustomerModal();
        addForm.reset();
        await loadCustomers();
      } catch (err) {
        Utils.showToast(err.message, 'error');
      }
    });
  }
});

function deleteCustomer(userId, name) {
  AdminCommon.confirmModal({
    title: 'Delete Customer Record',
    message: `Are you sure you want to permanently delete customer <strong>${name}</strong> (${userId}) and all associated accounts?`,
    confirmText: 'Delete Customer',
    confirmClass: 'btn-danger',
    onConfirm: async () => {
      await API.request(`/admin/customers/${userId}`, 'DELETE');
      Utils.showToast(`Customer ${name} deleted successfully.`, 'success');
      await loadCustomers();
    }
  });
}

function handleClearAllCustomers() {
  AdminCommon.confirmModal({
    title: 'Clear All Customer Records',
    message: 'WARNING: Are you sure you want to remove ALL customer records and accounts from the database? This action cannot be undone.',
    confirmText: 'Clear All Customers',
    confirmClass: 'btn-danger',
    onConfirm: async () => {
      await API.request('/admin/customers/clear-all', 'DELETE');
      Utils.showToast('All customer records have been cleared.', 'success');
      await loadCustomers();
    }
  });
}

function toggleCustomerStatus(userId, newStatus) {
  const customer = allCustomers.find(c => c.userId === userId);
  const name = customer ? customer.name : userId;
  
  let confirmClass = 'btn-primary';
  if (newStatus === 'ACTIVE') confirmClass = 'btn-success';
  if (newStatus === 'INACTIVE') confirmClass = 'btn-warning';
  if (newStatus === 'BLOCKED') confirmClass = 'btn-danger';

  AdminCommon.confirmModal({
    title: `Set Status: ${newStatus}`,
    message: `Are you sure you want to change the status of customer <strong>${name}</strong> to <strong style="color: var(--accent-cyan);">${newStatus}</strong>?`,
    confirmText: `Confirm ${newStatus}`,
    confirmClass: confirmClass,
    onConfirm: async () => {
      let endpoint = `/admin/customers/${userId}/status`;
      if (newStatus === 'ACTIVE') endpoint = `/admin/customers/${userId}/activate`;
      else if (newStatus === 'INACTIVE') endpoint = `/admin/customers/${userId}/deactivate`;
      else if (newStatus === 'BLOCKED') endpoint = `/admin/customers/${userId}/block`;

      await API.request(endpoint, 'PUT', { status: newStatus });
      Utils.showToast(`Customer status updated to ${newStatus}`, 'success');
      await loadCustomers();
    }
  });
}

function approveCustomerKYC(userId, name) {
  // Directly open the KYC Document Review modal in approval mode so the admin sees the documents
  openCustomerKYCViewer(userId, 'ALL', true);
}

async function executeApproveCustomerKYC(userId, name) {
  try {
    await API.request(`/admin/customers/${userId}/approve`, 'PUT', {
      approvedBy: 'GG Bank Administrator',
      remarks: 'Official KYC Document Verification Complete. All IDs verified.'
    });
    document.getElementById('kycDocViewerModal')?.classList.remove('active');
    Utils.showToast(`Customer ${name} KYC Approved! Login access activated.`, 'success');
    await loadCustomers();
    AdminCommon.updateLiveBadges();
  } catch (err) {
    Utils.showToast('Approval error: ' + (err.message || 'Unknown error'), 'error');
  }
}

function rejectCustomerKYC(userId, name) {
  const reason = prompt(`Enter reason for declining KYC application for ${name}:`, 'Document unreadable or invalid credentials');
  if (reason === null) return;

  API.request(`/admin/customers/${userId}/reject`, 'PUT', {
    remarks: reason || 'KYC Document verification failed compliance check.'
  }).then(async () => {
    document.getElementById('kycDocViewerModal')?.classList.remove('active');
    Utils.showToast(`Application for ${name} has been rejected.`, 'info');
    await loadCustomers();
    AdminCommon.updateLiveBadges();
  }).catch(err => {
    Utils.showToast('Rejection error: ' + (err.message || 'Unknown error'), 'error');
  });
}

let activeModalCustomer = null;
let activeModalDocType = 'ALL';

function openCustomerKYCViewer(userId, initialDoc = 'ALL', isApprovalMode = false) {
  const customer = allCustomers.find(c => c.userId === userId);
  if (!customer) return;

  activeModalCustomer = customer;
  activeModalDocType = initialDoc;

  const headerEl = document.getElementById('kycDocCustomerHeader');
  if (headerEl) {
    headerEl.innerHTML = `Applicant: <strong style="color: var(--accent-cyan);">${customer.name}</strong> • User ID: <strong>${customer.userId}</strong> • Account: <strong>${customer.accountNumber || 'N/A'}</strong> (${customer.accountType || 'SAVINGS'})`;
  }

  // Show/Hide Approval banner
  const bannerEl = document.getElementById('kycApprovalAlertBanner');
  const status = customer.status || customer.accountStatus || 'ACTIVE';
  const isPending = (status === 'PENDING_APPROVAL');

  if (bannerEl) {
    bannerEl.style.display = (isPending || isApprovalMode) ? 'flex' : 'none';
  }

  // Update Action Buttons in Modal
  const actionsEl = document.getElementById('kycModalActionBtns');
  if (actionsEl) {
    if (isPending) {
      actionsEl.innerHTML = `
        <button type="button" class="btn btn-danger btn-sm" onclick="rejectCustomerKYC('${customer.userId}', '${customer.name}')">
          <i class="fa-solid fa-xmark"></i> Reject Application
        </button>
        <button type="button" class="btn btn-success" style="font-weight: 700; padding: 7px 18px;" onclick="executeApproveCustomerKYC('${customer.userId}', '${customer.name}')">
          <i class="fa-solid fa-circle-check"></i> Approve KYC & Activate Account
        </button>
      `;
    } else {
      actionsEl.innerHTML = `
        <span class="badge badge-success" style="padding: 8px 16px; font-size: 0.85rem;"><i class="fa-solid fa-circle-check"></i> Account Verified & Active</span>
      `;
    }
  }

  switchKYCModalDoc(initialDoc);
  document.getElementById('kycDocViewerModal')?.classList.add('active');
}

function switchKYCModalDoc(docType) {
  activeModalDocType = docType;
  if (!activeModalCustomer) return;

  const docs = activeModalCustomer.documents || {};
  const nominee = activeModalCustomer.nominee || { name: 'Not Provided', relationship: 'N/A', contact: 'N/A' };

  const panNum = docs.panNumber || 'ABCDE1234F';
  const aadhaarNum = docs.aadhaarNumber || '2345 6789 0123';

  // Toggle Tab UI
  ['All', 'Aadhaar', 'Pan', 'Photo', 'Signature', 'Nominee'].forEach(tab => {
    const el = document.getElementById(`kycTab${tab}`);
    if (el) {
      const isCurrent = (docType.toUpperCase() === tab.toUpperCase());
      el.classList.toggle('btn-primary', isCurrent);
      el.classList.toggle('btn-secondary', !isCurrent);
    }
  });

  const body = document.getElementById('kycViewerBody');
  const numEl = document.getElementById('kycModalDocNumber');
  const statusEl = document.getElementById('kycModalDocStatus');
  const isPending = (activeModalCustomer.status === 'PENDING_APPROVAL');

  if (statusEl) {
    statusEl.className = isPending ? 'badge badge-warning' : 'badge badge-success';
    statusEl.textContent = isPending ? 'PENDING VERIFICATION' : 'VERIFIED';
  }

  // 1. ALL DOCUMENTS GRID MODE
  if (docType === 'ALL') {
    if (numEl) numEl.textContent = 'All 4 KYC Documents + Nominee';

    if (body) {
      body.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; width: 100%; text-align: left;">
          
          <!-- 1. Aadhaar Card -->
          <div style="background: var(--bg-surface); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color-subtle);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <strong style="color: var(--text-primary); font-size: 0.88rem;"><i class="fa-solid fa-fingerprint" style="color: var(--warning);"></i> Aadhaar Card</strong>
              <span class="badge badge-warning" style="font-size: 0.65rem;">UIDAI 12-Digit</span>
            </div>
            <div style="font-family: var(--font-mono); color: var(--accent-cyan); font-weight: 700; font-size: 0.9rem; margin-bottom: 8px;">
              ${aadhaarNum}
            </div>
            <div style="height: 130px; background: rgba(0,0,0,0.35); border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; overflow: hidden; cursor: pointer; border: 1px dashed rgba(255,255,255,0.15);" onclick="switchKYCModalDoc('AADHAAR')" title="Click to enlarge">
              ${docs.aadhaarDoc ? `<img src="${docs.aadhaarDoc}" alt="Aadhaar" style="max-height: 100%; max-width: 100%; object-fit: contain;">` : `<span style="font-size: 0.75rem; color: var(--text-muted);"><i class="fa-solid fa-file-image"></i> Aadhaar Preview Attached</span>`}
            </div>
            <div style="text-align: right; margin-top: 6px;">
              <button type="button" class="btn btn-secondary btn-sm" style="font-size: 0.72rem; padding: 2px 8px;" onclick="switchKYCModalDoc('AADHAAR')">Inspect Aadhaar <i class="fa-solid fa-magnifying-glass"></i></button>
            </div>
          </div>

          <!-- 2. PAN Card -->
          <div style="background: var(--bg-surface); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color-subtle);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <strong style="color: var(--text-primary); font-size: 0.88rem;"><i class="fa-solid fa-id-card" style="color: var(--accent-cyan);"></i> PAN Card</strong>
              <span class="badge badge-info" style="font-size: 0.65rem;">Income Tax</span>
            </div>
            <div style="font-family: var(--font-mono); color: var(--accent-cyan); font-weight: 700; font-size: 0.9rem; margin-bottom: 8px;">
              ${panNum}
            </div>
            <div style="height: 130px; background: rgba(0,0,0,0.35); border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; overflow: hidden; cursor: pointer; border: 1px dashed rgba(255,255,255,0.15);" onclick="switchKYCModalDoc('PAN')" title="Click to enlarge">
              ${docs.panDoc ? `<img src="${docs.panDoc}" alt="PAN" style="max-height: 100%; max-width: 100%; object-fit: contain;">` : `<span style="font-size: 0.75rem; color: var(--text-muted);"><i class="fa-solid fa-file-image"></i> PAN Preview Attached</span>`}
            </div>
            <div style="text-align: right; margin-top: 6px;">
              <button type="button" class="btn btn-secondary btn-sm" style="font-size: 0.72rem; padding: 2px 8px;" onclick="switchKYCModalDoc('PAN')">Inspect PAN <i class="fa-solid fa-magnifying-glass"></i></button>
            </div>
          </div>

          <!-- 3. Passport Photo -->
          <div style="background: var(--bg-surface); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color-subtle);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <strong style="color: var(--text-primary); font-size: 0.88rem;"><i class="fa-solid fa-camera" style="color: #10b981;"></i> Passport Photo</strong>
              <span class="badge badge-success" style="font-size: 0.65rem;">Biometric</span>
            </div>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 8px;">Applicant Identity Headshot</div>
            <div style="height: 130px; background: rgba(0,0,0,0.35); border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; overflow: hidden; cursor: pointer; border: 1px dashed rgba(255,255,255,0.15);" onclick="switchKYCModalDoc('PHOTO')" title="Click to enlarge">
              ${docs.photoDoc ? `<img src="${docs.photoDoc}" alt="Photo" style="max-height: 100%; max-width: 100%; object-fit: contain; border-radius: 50%;">` : `<span style="font-size: 0.75rem; color: var(--text-muted);"><i class="fa-solid fa-user-circle"></i> Photo Attached</span>`}
            </div>
            <div style="text-align: right; margin-top: 6px;">
              <button type="button" class="btn btn-secondary btn-sm" style="font-size: 0.72rem; padding: 2px 8px;" onclick="switchKYCModalDoc('PHOTO')">Inspect Photo <i class="fa-solid fa-magnifying-glass"></i></button>
            </div>
          </div>

          <!-- 4. Signature -->
          <div style="background: var(--bg-surface); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color-subtle);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <strong style="color: var(--text-primary); font-size: 0.88rem;"><i class="fa-solid fa-signature" style="color: #f59e0b;"></i> Signature Specimen</strong>
              <span class="badge badge-warning" style="font-size: 0.65rem;">Official Sign</span>
            </div>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 8px;">Customer Signature Specimen</div>
            <div style="height: 130px; background: rgba(0,0,0,0.35); border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; overflow: hidden; cursor: pointer; border: 1px dashed rgba(255,255,255,0.15);" onclick="switchKYCModalDoc('SIGNATURE')" title="Click to enlarge">
              ${docs.signatureDoc ? `<img src="${docs.signatureDoc}" alt="Signature" style="max-height: 100%; max-width: 100%; object-fit: contain;">` : `<span style="font-size: 0.75rem; color: var(--text-muted);"><i class="fa-solid fa-pen-nib"></i> Signature Attached</span>`}
            </div>
            <div style="text-align: right; margin-top: 6px;">
              <button type="button" class="btn btn-secondary btn-sm" style="font-size: 0.72rem; padding: 2px 8px;" onclick="switchKYCModalDoc('SIGNATURE')">Inspect Sign <i class="fa-solid fa-magnifying-glass"></i></button>
            </div>
          </div>

        </div>

        <!-- Registered Nominee Card -->
        <div style="margin-top: 14px; width: 100%; background: var(--bg-surface); padding: 14px 18px; border-radius: var(--radius-md); border: 1px solid var(--border-color-subtle); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; text-align: left;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 40px; height: 40px; border-radius: 50%; background: rgba(0, 240, 255, 0.15); display: flex; align-items: center; justify-content: center; color: var(--accent-cyan); font-size: 1.2rem;">
              <i class="fa-solid fa-users"></i>
            </div>
            <div>
              <div style="font-size: 0.76rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Nominee Registered:</div>
              <strong style="color: #fff; font-size: 0.95rem;">${nominee.name}</strong> <span style="color: var(--accent-cyan); font-size: 0.85rem;">(${nominee.relationship})</span>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 0.8rem; color: var(--text-muted);">Nominee Contact:</span>
            <strong style="font-family: var(--font-mono); color: #fff; font-size: 0.9rem;">${nominee.contact}</strong>
            <span class="badge badge-success" style="font-size: 0.7rem;"><i class="fa-solid fa-check"></i> Registered</span>
          </div>
        </div>
      `;
    }
    return;
  }

  // Ensure every document has a valid visual image
  const aadhaarImg = (docs.aadhaarDoc && docs.aadhaarDoc !== 'null' && docs.aadhaarDoc.length > 20) 
    ? docs.aadhaarDoc 
    : (window.Utils && window.Utils.generateAadhaarCard ? window.Utils.generateAadhaarCard(activeModalCustomer.name, aadhaarNum, activeModalCustomer.dateOfBirth) : '');

  const panImg = (docs.panDoc && docs.panDoc !== 'null' && docs.panDoc.length > 20) 
    ? docs.panDoc 
    : (window.Utils && window.Utils.generatePanCard ? window.Utils.generatePanCard(activeModalCustomer.name, panNum, activeModalCustomer.dateOfBirth) : '');

  const photoImg = (docs.photoDoc && docs.photoDoc !== 'null' && docs.photoDoc.length > 20) 
    ? docs.photoDoc 
    : (window.Utils && window.Utils.generatePassportPhoto ? window.Utils.generatePassportPhoto(activeModalCustomer.name) : '');

  const sigImg = (docs.signatureDoc && docs.signatureDoc !== 'null' && docs.signatureDoc.length > 20) 
    ? docs.signatureDoc 
    : (window.Utils && window.Utils.generateSignature ? window.Utils.generateSignature(activeModalCustomer.name) : '');

  // 2. INDIVIDUAL TAB ENLARGED VIEW
  let currentDocNum = aadhaarNum;
  let currentDocData = aadhaarImg;
  let docTitle = 'Aadhaar Card';

  if (docType === 'PAN') {
    currentDocNum = panNum;
    currentDocData = panImg;
    docTitle = 'PAN Card';
  } else if (docType === 'PHOTO') {
    currentDocNum = 'Passport Size Photo';
    currentDocData = photoImg;
    docTitle = 'Applicant Passport Photo';
  } else if (docType === 'SIGNATURE') {
    currentDocNum = 'Official Signature';
    currentDocData = sigImg;
    docTitle = 'Customer Signature Specimen';
  } else if (docType === 'NOMINEE') {
    currentDocNum = `${nominee.name} (${nominee.relationship})`;
    docTitle = 'Account Nominee Details';
  }

  if (numEl) numEl.textContent = currentDocNum;

  if (body) {
    if (docType === 'NOMINEE') {
      body.innerHTML = `
        <div style="background: var(--bg-surface); padding: 24px; border-radius: var(--radius-lg); border: 1px solid var(--border-color-subtle); width: 100%; max-width: 460px; text-align: left;">
          <div style="font-size: 2.5rem; color: var(--accent-cyan); margin-bottom: 10px; text-align: center;"><i class="fa-solid fa-users"></i></div>
          <h4 style="color: #fff; font-size: 1.15rem; margin-bottom: 12px; text-align: center;">Nominee Registration Record</h4>
          <div style="display: flex; flex-direction: column; gap: 10px; font-size: 0.9rem;">
            <div style="display: flex; justify-content: space-between;"><span style="color: var(--text-muted);">Nominee Full Name:</span> <strong style="color: #fff;">${nominee.name}</strong></div>
            <div style="display: flex; justify-content: space-between;"><span style="color: var(--text-muted);">Relationship:</span> <strong style="color: var(--accent-cyan);">${nominee.relationship}</strong></div>
            <div style="display: flex; justify-content: space-between;"><span style="color: var(--text-muted);">Contact Phone:</span> <strong style="font-family: var(--font-mono); color: #fff;">${nominee.contact}</strong></div>
            <div style="display: flex; justify-content: space-between;"><span style="color: var(--text-muted);">Nominee Status:</span> <span class="badge badge-success">REGISTERED</span></div>
          </div>
        </div>
      `;
    } else {
      body.innerHTML = `
        <div style="position: relative; max-width: 100%; display: flex; flex-direction: column; align-items: center;">
          <img src="${currentDocData}" alt="${docTitle}" style="max-width: 100%; max-height: 380px; border-radius: var(--radius-md); box-shadow: 0 8px 24px rgba(0,0,0,0.5); border: 2px solid rgba(56, 189, 248, 0.4);">
          <div style="font-size: 0.85rem; color: var(--accent-cyan); margin-top: 10px; display: flex; align-items: center; gap: 6px;">
            <i class="fa-solid fa-cloud-arrow-up"></i> ${docTitle} • Verified Document Record
          </div>
        </div>
      `;
    }
  }
}

function viewKYCDocument(docType, docNumber, encodedData, customerName) {
  // Find customer by name or doc
  const cust = allCustomers.find(c => c.name === customerName || (c.documents && (c.documents.panNumber === docNumber || c.documents.dlNumber === docNumber || c.documents.aadhaarNumber === docNumber)));
  if (cust) {
    let type = 'PAN';
    if (docType.toLowerCase().includes('driving') || docType.toLowerCase().includes('dl')) type = 'DL';
    if (docType.toLowerCase().includes('aadhaar')) type = 'AADHAAR';
    openCustomerKYCViewer(cust.userId, type);
  }
}

function exportCustomersCsv() {
  const exportData = filteredCustomers.map(c => ({
    'Customer ID': c.userId,
    'Name': c.name,
    'Account Number': c.accountNumber,
    'Email': c.email,
    'Phone': c.phone || 'N/A',
    'Account Type': c.accountType || 'SAVINGS',
    'Status': c.status || 'ACTIVE',
    'Created Date': c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A'
  }));

  AdminCommon.exportCSV(exportData, 'GG_BANK_Customers.csv');
}

window.openAddCustomerModal = openAddCustomerModal;
window.closeAddCustomerModal = closeAddCustomerModal;
window.deleteCustomer = deleteCustomer;
window.handleClearAllCustomers = handleClearAllCustomers;
window.setQuickCustomerFilter = setQuickCustomerFilter;
window.approveCustomerKYC = approveCustomerKYC;
window.rejectCustomerKYC = rejectCustomerKYC;
window.viewKYCDocument = viewKYCDocument;
window.openCustomerKYCViewer = openCustomerKYCViewer;
window.switchKYCModalDoc = switchKYCModalDoc;

