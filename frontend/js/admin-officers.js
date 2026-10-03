/**
 * GG BANK - Bank Officers Controller (admin-officers.js)
 * Manages Officer Roster, KPI metrics, Add/Edit modals, and Status Controls.
 */

let allOfficers = [];
let filteredOfficers = [];
let currentPage = 1;
const PAGE_SIZE = 8;

document.addEventListener('DOMContentLoaded', async () => {
  const admin = AdminCommon.init('officers');
  if (!admin) return;

  await loadOfficers();
  setupEventListeners();
  window.__adminRefreshData = loadOfficers;
});

async function loadOfficers() {
  AdminCommon.renderLoading('adminOfficersTableBody', 'Loading bank officer roster...');
  try {
    const res = await API.request('/admin/officers');
    allOfficers = res.data || [];
    applyFilters();
  } catch (err) {
    AdminCommon.renderError('adminOfficersTableBody', 'Failed to load officers: ' + err.message, loadOfficers);
  }
}

function setupEventListeners() {
  const searchInput = document.getElementById('officerSearchInput');
  const deptFilter = document.getElementById('officerDeptFilter');
  const statusFilter = document.getElementById('officerStatusFilter');

  if (searchInput) searchInput.addEventListener('input', () => { currentPage = 1; applyFilters(); });
  if (deptFilter) deptFilter.addEventListener('change', () => { currentPage = 1; applyFilters(); });
  if (statusFilter) statusFilter.addEventListener('change', () => { currentPage = 1; applyFilters(); });

  // Add Officer Form
  const addForm = document.getElementById('addOfficerForm');
  if (addForm) {
    addForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btnAddOfficerSubmit');

      const empId = document.getElementById('addOffEmployeeId') ? document.getElementById('addOffEmployeeId').value.trim().toUpperCase() : '';
      const pass = document.getElementById('addOffPassword') ? document.getElementById('addOffPassword').value : '';

      const payload = {
        employeeId: empId,
        name: document.getElementById('addOffName').value.trim(),
        email: document.getElementById('addOffEmail').value.trim(),
        phone: document.getElementById('addOffPhone').value.trim(),
        department: document.getElementById('addOffDept').value,
        designation: document.getElementById('addOffDesignation').value.trim(),
        branch: document.getElementById('addOffBranch').value,
        password: pass || 'Password@123',
        status: 'ACTIVE'
      };

      Utils.setLoading(btn, true, 'Registering...');
      try {
        await API.request('/admin/officers', 'POST', payload);
        Utils.showToast(`Officer account (${payload.employeeId}) created successfully!`, 'success');
        document.getElementById('addOfficerModal').classList.remove('active');
        addForm.reset();
        await loadOfficers();
      } catch (err) {
        Utils.showToast(err.message || 'Failed to add officer', 'error');
      } finally {
        Utils.setLoading(btn, false);
      }
    });
  }

  // Edit Officer Form
  const editForm = document.getElementById('editOfficerForm');
  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('editOffId').value;
      const btn = document.getElementById('btnEditOfficerSubmit');

      const payload = {
        name: document.getElementById('editOffName').value.trim(),
        email: document.getElementById('editOffEmail').value.trim(),
        phone: document.getElementById('editOffPhone').value.trim(),
        department: document.getElementById('editOffDept').value,
        designation: document.getElementById('editOffDesignation').value.trim(),
        branch: document.getElementById('editOffBranch').value,
        status: document.getElementById('editOffStatus').value
      };

      Utils.setLoading(btn, true, 'Saving...');
      try {
        await API.request(`/admin/officers/${id}`, 'PUT', payload);
        Utils.showToast('Officer profile updated successfully!', 'success');
        document.getElementById('editOfficerModal').classList.remove('active');
        await loadOfficers();
      } catch (err) {
        Utils.showToast(err.message || 'Failed to update officer', 'error');
      } finally {
        Utils.setLoading(btn, false);
      }
    });
  }
}

function applyFilters() {
  const query = (document.getElementById('officerSearchInput')?.value || '').toLowerCase().trim();
  const dept = document.getElementById('officerDeptFilter')?.value || 'ALL';
  const status = document.getElementById('officerStatusFilter')?.value || 'ALL';

  filteredOfficers = allOfficers.filter(o => {
    const matchesQuery = !query ||
      (o.name && o.name.toLowerCase().includes(query)) ||
      (o.email && o.email.toLowerCase().includes(query)) ||
      (o.employeeId && o.employeeId.toLowerCase().includes(query)) ||
      (o.designation && o.designation.toLowerCase().includes(query)) ||
      (o.branch && o.branch.toLowerCase().includes(query));

    const matchesDept = dept === 'ALL' || (o.department && o.department.toUpperCase() === dept);
    const matchesStatus = status === 'ALL' || (o.status && o.status.toUpperCase() === status);

    return matchesQuery && matchesDept && matchesStatus;
  });

  updateMetrics();
  renderTable();
}

function updateMetrics() {
  const totalEl = document.getElementById('metricTotalOfficers');
  const activeEl = document.getElementById('metricActiveOfficers');
  const leaveEl = document.getElementById('metricLeaveOfficers');
  const casesEl = document.getElementById('metricAssignedCases');

  let activeCount = 0;
  let leaveCount = 0;
  let totalCases = 0;

  allOfficers.forEach(o => {
    if (o.status === 'ACTIVE') activeCount++;
    if (o.status === 'ON_LEAVE') leaveCount++;
    totalCases += (o.assignedCases || 0);
  });

  if (totalEl) totalEl.textContent = allOfficers.length;
  if (activeEl) activeEl.textContent = activeCount;
  if (leaveEl) leaveEl.textContent = leaveCount;
  if (casesEl) casesEl.textContent = totalCases;
}

function renderTable() {
  const tbody = document.getElementById('adminOfficersTableBody');
  if (!tbody) return;

  if (filteredOfficers.length === 0) {
    AdminCommon.renderEmpty('adminOfficersTableBody', 'No bank officers found matching criteria.', 'fa-user-slash');
    updatePagination(0);
    return;
  }

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginated = filteredOfficers.slice(startIndex, startIndex + PAGE_SIZE);

  tbody.innerHTML = paginated.map(o => {
    const status = o.status || 'ACTIVE';
    let badgeClass = 'badge-success';
    if (status === 'ON_LEAVE') badgeClass = 'badge-warning';
    if (status === 'SUSPENDED') badgeClass = 'badge-danger';

    let deptColor = 'var(--accent-cyan)';
    if (o.department === 'LOAN') deptColor = 'var(--warning)';
    else if (o.department === 'COMPLIANCE') deptColor = '#3b82f6';
    else if (o.department === 'TREASURY') deptColor = 'var(--success)';

    return `
      <tr>
        <td>
          <span style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-cyan); font-size: 0.85rem;">
            ${o.employeeId || 'EMP-1000'}
          </span>
        </td>
        <td>
          <div style="font-weight: 700; color: var(--text-primary);">${o.name}</div>
          <div style="font-size: 0.76rem; color: var(--text-muted);">${o.email} &bull; ${o.phone || ''}</div>
        </td>
        <td>
          <span class="badge" style="background: rgba(255, 255, 255, 0.08); color: ${deptColor}; font-size: 0.75rem;">
            ${o.department || 'GENERAL'}
          </span>
        </td>
        <td style="font-size: 0.88rem; color: #fff; font-weight: 600;">${o.designation || 'Banking Officer'}</td>
        <td style="font-size: 0.85rem; color: var(--text-secondary);">${o.branch || 'Central Tech Branch'}</td>
        <td>
          <span style="font-family: var(--font-mono); font-weight: 700; color: #fff; font-size: 0.9rem;">
            ${o.assignedCases || 0} cases
          </span>
        </td>
        <td><span class="badge ${badgeClass}">${status}</span></td>
        <td style="text-align: right;">
          <div class="table-action-btns" style="justify-content: flex-end;">
            <!-- Edit Officer Button -->
            <button class="btn btn-secondary btn-sm" onclick="openEditOfficerModal('${o.officerId}')" title="Edit Officer Details">
              <i class="fa-solid fa-user-pen"></i> Edit
            </button>

            <!-- Status Controls -->
            ${status !== 'ACTIVE' ? `
              <button class="btn btn-success btn-sm" onclick="toggleOfficerStatus('${o.officerId}', 'ACTIVE', '${o.name}')" title="Activate Officer">
                <i class="fa-solid fa-circle-check"></i>
              </button>
            ` : ''}

            ${status === 'ACTIVE' ? `
              <button class="btn btn-warning btn-sm" onclick="toggleOfficerStatus('${o.officerId}', 'ON_LEAVE', '${o.name}')" title="Mark On Leave">
                <i class="fa-solid fa-pause"></i>
              </button>
            ` : ''}

            ${status !== 'SUSPENDED' ? `
              <button class="btn btn-danger btn-sm" onclick="toggleOfficerStatus('${o.officerId}', 'SUSPENDED', '${o.name}')" title="Suspend Officer">
                <i class="fa-solid fa-ban"></i>
              </button>
            ` : ''}

            <button class="btn btn-secondary btn-sm" onclick="deleteOfficerRecord('${o.officerId}', '${o.name}')" title="Delete Officer" style="color: var(--danger);">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  updatePagination(filteredOfficers.length);
}

function updatePagination(totalCount) {
  const summary = document.getElementById('officerCountSummary');
  const container = document.getElementById('officerPaginationBtns');
  if (!summary || !container) return;

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;
  summary.textContent = `Showing ${(currentPage - 1) * PAGE_SIZE + (totalCount > 0 ? 1 : 0)} to ${Math.min(currentPage * PAGE_SIZE, totalCount)} of ${totalCount} officers`;

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

function openAddOfficerModal() {
  document.getElementById('addOfficerForm').reset();
  document.getElementById('addOfficerModal').classList.add('active');
}

function openEditOfficerModal(officerId) {
  const o = allOfficers.find(item => item.officerId === officerId);
  if (!o) return;

  document.getElementById('editOffId').value = o.officerId;
  document.getElementById('editOffName').value = o.name || '';
  document.getElementById('editOffEmail').value = o.email || '';
  document.getElementById('editOffPhone').value = o.phone || '';
  document.getElementById('editOffDept').value = o.department || 'LOAN';
  document.getElementById('editOffDesignation').value = o.designation || '';
  document.getElementById('editOffBranch').value = o.branch || 'Central Tech Branch';
  document.getElementById('editOffStatus').value = o.status || 'ACTIVE';

  document.getElementById('editOfficerModal').classList.add('active');
}

function toggleOfficerStatus(officerId, newStatus, officerName) {
  let confirmClass = 'btn-primary';
  if (newStatus === 'ACTIVE') confirmClass = 'btn-success';
  if (newStatus === 'ON_LEAVE') confirmClass = 'btn-warning';
  if (newStatus === 'SUSPENDED') confirmClass = 'btn-danger';

  AdminCommon.confirmModal({
    title: `Officer Status: ${newStatus}`,
    message: `Are you sure you want to update status of officer <strong>${officerName}</strong> to <strong style="color: var(--accent-cyan);">${newStatus}</strong>?`,
    confirmText: `Confirm ${newStatus}`,
    confirmClass: confirmClass,
    onConfirm: async () => {
      await API.request(`/admin/officers/${officerId}/status`, 'PUT', { status: newStatus });
      Utils.showToast(`Officer ${officerName} status set to ${newStatus}`, 'success');
      await loadOfficers();
    }
  });
}

function deleteOfficerRecord(officerId, officerName) {
  AdminCommon.confirmModal({
    title: 'Remove Officer Record?',
    message: `Are you sure you want to remove Banking Officer <strong>${officerName}</strong> from active personnel?`,
    confirmText: 'Remove Officer',
    confirmClass: 'btn-danger',
    onConfirm: async () => {
      await API.request(`/admin/officers/${officerId}`, 'DELETE');
      Utils.showToast(`Officer ${officerName} removed.`, 'info');
      await loadOfficers();
    }
  });
}

function exportOfficersCsv() {
  const exportData = filteredOfficers.map(o => ({
    'Employee ID': o.employeeId,
    'Name': o.name,
    'Email': o.email,
    'Phone': o.phone,
    'Department': o.department,
    'Designation': o.designation,
    'Branch': o.branch,
    'Active Cases': o.assignedCases || 0,
    'Status': o.status
  }));

  AdminCommon.exportCSV(exportData, 'GG_BANK_Officers.csv');
}

function updateDesignationPlaceholder(dept) {
  const input = document.getElementById('addOffDesignation');
  if (!input) return;
  if (dept === 'LOAN') input.value = 'Loan Underwriting Officer';
  else if (dept === 'ACCOUNT_MANAGEMENT') input.value = 'Account Management & KYC Officer';
  else if (dept === 'TREASURY') input.value = 'Treasury & Cash Operations Officer';
  else if (dept === 'OPERATIONS') input.value = 'Branch Operations Officer';
}
window.updateDesignationPlaceholder = updateDesignationPlaceholder;
