/**
 * GG BANK - Loan Management Controller (admin-loans.js)
 * Implements Loan Review Cards, Search, Filters, Approval/Rejection Workflow,
 * and Fund Disbursement.
 */

let allLoans = [];
let filteredLoans = [];

document.addEventListener('DOMContentLoaded', async () => {
  const admin = AdminCommon.init('loans');
  if (!admin) return;

  await loadLoans();
  setupEventListeners();
  window.__adminRefreshData = loadLoans;
});

async function loadLoans() {
  const container = document.getElementById('adminLoansContainer');
  if (container) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--accent-cyan);">
        <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 2.2rem; margin-bottom: 14px;"></i>
        <div style="font-size: 1rem; font-weight: 600; color: var(--text-primary);">Loading loan portfolio...</div>
      </div>
    `;
  }

  try {
    const res = await API.request('/admin/loans');
    allLoans = res.data || [];
    applyFilters();
  } catch (err) {
    if (container) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--danger);">
          <i class="fa-solid fa-triangle-exclamation" style="font-size: 2.2rem; margin-bottom: 12px;"></i>
          <div style="font-size: 1rem; font-weight: 600; margin-bottom: 12px;">Failed to load loans: ${err.message}</div>
          <button class="btn btn-secondary btn-sm" onclick="loadLoans()">
            <i class="fa-solid fa-rotate-right"></i> Retry
          </button>
        </div>
      `;
    }
  }
}

function setupEventListeners() {
  const searchInput = document.getElementById('loanSearchInput');
  const statusFilter = document.getElementById('loanStatusFilter');

  if (searchInput) searchInput.addEventListener('input', applyFilters);
  if (statusFilter) statusFilter.addEventListener('change', applyFilters);
}

function applyFilters() {
  const query = (document.getElementById('loanSearchInput')?.value || '').toLowerCase().trim();
  const status = document.getElementById('loanStatusFilter')?.value || 'ALL';

  filteredLoans = allLoans.filter(l => {
    const matchesQuery = !query ||
      (l.loanId && l.loanId.toLowerCase().includes(query)) ||
      (l.accountNumber && l.accountNumber.includes(query)) ||
      (l.customerName && l.customerName.toLowerCase().includes(query)) ||
      (l.loanType && l.loanType.toLowerCase().includes(query)) ||
      (l.purpose && l.purpose.toLowerCase().includes(query));

    let matchesStatus = false;
    const loanStatus = (l.status || '').toUpperCase();
    if (status === 'ALL') {
      matchesStatus = true;
    } else if (status === 'PENDING' || status === 'UNDER_REVIEW') {
      matchesStatus = (loanStatus === 'PENDING' || loanStatus === 'UNDER_REVIEW' || loanStatus === 'SUBMITTED');
    } else if (status === 'APPROVED' || status === 'ACTIVE') {
      matchesStatus = (loanStatus === 'APPROVED' || loanStatus === 'ACTIVE');
    } else {
      matchesStatus = (loanStatus === status);
    }

    return matchesQuery && matchesStatus;
  });

  renderLoans();
}

function renderLoans() {
  const container = document.getElementById('adminLoansContainer');
  if (!container) return;

  if (filteredLoans.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-muted); background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-color-subtle);">
        <i class="fa-solid fa-folder-open" style="font-size: 2.5rem; margin-bottom: 14px; opacity: 0.6;"></i>
        <div style="font-size: 1.05rem; font-weight: 600; color: var(--text-secondary);">No loan applications found matching criteria.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = filteredLoans.map(l => {
    const rawStatus = (l.status || 'PENDING').toUpperCase();
    let status = rawStatus;
    let statusBorder = 'status-pending';
    let badgeClass = 'badge-warning';

    if (rawStatus === 'APPROVED' || rawStatus === 'ACTIVE') {
      statusBorder = 'status-approved';
      badgeClass = 'badge-success';
      status = rawStatus === 'ACTIVE' ? 'ACTIVE / DISBURSED' : 'APPROVED';
    } else if (rawStatus === 'REJECTED') {
      statusBorder = 'status-rejected';
      badgeClass = 'badge-danger';
    } else if (rawStatus === 'CLOSED' || rawStatus === 'COMPLETED') {
      statusBorder = 'status-completed';
      badgeClass = 'badge-info';
    } else if (rawStatus === 'UNDER_REVIEW' || rawStatus === 'SUBMITTED' || rawStatus === 'PENDING') {
      statusBorder = 'status-pending';
      badgeClass = 'badge-warning';
      status = rawStatus === 'UNDER_REVIEW' ? 'UNDER REVIEW' : 'PENDING REVIEW';
    }

    const appliedDate = l.createdAt ? new Date(l.createdAt).toLocaleDateString() : 'N/A';
    const procFee = l.processingFee || Math.round((l.requestedAmount || 0) * 0.01);
    const netDisb = l.netDisbursement || ((l.requestedAmount || 0) - procFee);

    return `
      <div class="loan-review-card ${statusBorder}">
        <!-- Header -->
        <div class="loan-header-row">
          <div>
            <div class="loan-type-tag">${l.loanType}</div>
            <div style="font-size: 0.78rem; font-family: var(--font-mono); color: var(--accent-cyan); margin-top: 2px;">
              REF: ${l.loanId} &bull; Applied: ${appliedDate}
            </div>
          </div>
          <span class="badge ${badgeClass}">${status}</span>
        </div>

        <!-- Detail Grid -->
        <div class="loan-detail-grid">
          <div class="loan-detail-item">
            <div class="label">Applicant Name</div>
            <div class="val" style="font-weight: 800; color: #fff;">${l.customerName || 'Customer'}</div>
          </div>

          <div class="loan-detail-item">
            <div class="label">Requested Amount</div>
            <div class="val" style="color: var(--accent-cyan); font-size: 1.1rem; font-family: var(--font-mono);">
              ₹${(l.requestedAmount || 0).toLocaleString('en-IN')}
            </div>
          </div>

          <div class="loan-detail-item">
            <div class="label">Net Disbursement</div>
            <div class="val" style="color: var(--success); font-family: var(--font-mono); font-weight: 700;">
              ₹${netDisb.toLocaleString('en-IN')} <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: normal;">(Fee: ₹${procFee.toLocaleString('en-IN')})</span>
            </div>
          </div>

          <div class="loan-detail-item">
            <div class="label">Applicant Account</div>
            <div class="val" style="font-family: var(--font-mono);">${l.accountNumber}</div>
          </div>

          <div class="loan-detail-item">
            <div class="label">Tenure & Rate</div>
            <div class="val">${l.tenure || 24} Mos @ ${l.interestRate || 10.5}%</div>
          </div>

          <div class="loan-detail-item">
            <div class="label">Monthly Income</div>
            <div class="val">₹${(l.monthlyIncome || 0).toLocaleString('en-IN')}</div>
          </div>

          <div class="loan-detail-item">
            <div class="label">Estimated EMI</div>
            <div class="val" style="color: var(--warning); font-family: var(--font-mono);">
              ₹${(l.estimatedEMI || 0).toLocaleString('en-IN')}/mo
            </div>
          </div>
        </div>

        <!-- Dedicated Assigned Loan Officer Badge Strip -->
        <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.25); padding: 8px 12px; border-radius: var(--radius-sm); font-size: 0.82rem;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-user-tie" style="color: var(--accent-cyan);"></i>
            <span>Assigned Officer: <strong style="color: #fff;">${l.assignedOfficerName || 'Vikram Sharma'}</strong> <span style="color: var(--accent-cyan); font-size: 0.76rem;">(${l.assignedOfficerDesignation || 'Chief Credit Officer'})</span></span>
          </div>
          <button class="btn btn-secondary btn-sm" style="padding: 2px 8px; font-size: 0.72rem;" onclick="openAssignOfficerModal('${l.loanId}')">
            <i class="fa-solid fa-user-pen"></i> Reassign
          </button>
        </div>

        ${l.purpose ? `
          <div style="font-size: 0.82rem; color: var(--text-secondary); background: rgba(0,0,0,0.2); padding: 8px 12px; border-radius: var(--radius-sm);">
            <strong style="color: var(--text-muted);">Purpose:</strong> ${l.purpose}
          </div>
        ` : ''}

        <!-- Actions -->
        <div class="loan-actions-row" style="display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap;">
          <button class="btn btn-primary btn-sm" onclick="openLoanDocViewer('${l.loanId}')" title="View Uploaded Supporting Documents">
            <i class="fa-solid fa-file-shield"></i> View Documents
          </button>

          <button class="btn btn-secondary btn-sm" onclick="viewLoanDetails('${l.loanId}')">
            <i class="fa-solid fa-eye"></i> Dossier
          </button>

          ${(status === 'PENDING' || status === 'UNDER_REVIEW') ? `
            <button class="btn btn-danger btn-sm" onclick="handleLoanAction('${l.loanId}', 'REJECT')">
              <i class="fa-solid fa-xmark"></i> Reject
            </button>
            <button class="btn btn-success btn-sm" onclick="openLoanApprovalModal('${l.loanId}')">
              <i class="fa-solid fa-stamp"></i> Assign Officer & Approve
            </button>
          ` : ''}

          <button class="btn btn-secondary btn-sm" style="color: var(--danger);" onclick="deleteLoan('${l.loanId}')" title="Delete Loan Record">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function deleteLoan(loanId) {
  AdminCommon.confirmModal({
    title: 'Delete Loan Application',
    message: `Are you sure you want to delete loan application record <strong style="font-family: var(--font-mono); color: var(--danger);">${loanId}</strong>?`,
    confirmText: 'Delete Record',
    confirmClass: 'btn-danger',
    onConfirm: async () => {
      await API.request(`/admin/loans/${loanId}`, 'DELETE');
      Utils.showToast(`Loan application ${loanId} deleted.`, 'success');
      await loadLoans();
      AdminCommon.updateLiveBadges();
    }
  });
}

function handleClearAllLoans() {
  AdminCommon.confirmModal({
    title: 'Clear All Loan Applications',
    message: 'WARNING: Are you sure you want to remove ALL loan applications from the system? This action cannot be undone.',
    confirmText: 'Clear All Loans',
    confirmClass: 'btn-danger',
    onConfirm: async () => {
      await API.request('/admin/loans/clear-all', 'DELETE');
      Utils.showToast('All loan application records have been cleared.', 'success');
      await loadLoans();
      AdminCommon.updateLiveBadges();
    }
  });
}

window.deleteLoan = deleteLoan;
window.handleClearAllLoans = handleClearAllLoans;

function handleLoanAction(loanId, actionType) {
  const loan = allLoans.find(l => l.loanId === loanId);
  if (!loan) return;

  if (actionType === 'APPROVE') {
    openLoanApprovalModal(loanId);
  } else if (actionType === 'REJECT') {
    AdminCommon.confirmModal({
      title: 'Decline Loan Application?',
      message: `
        Are you sure you want to decline loan request <strong>${loan.loanId}</strong> for account ${loan.accountNumber}?
      `,
      confirmText: 'Confirm Rejection',
      confirmClass: 'btn-danger',
      onConfirm: async () => {
        await API.request(`/admin/loans/${loanId}/reject`, 'PUT', { remarks: 'Declined per bank debt-to-income policy guidelines' });
        Utils.showToast(`Loan application ${loanId} rejected.`, 'info');
        await loadLoans();
        AdminCommon.updateLiveBadges();
      }
    });
  }
}

function openLoanApprovalModal(loanId) {
  const loan = allLoans.find(l => l.loanId === loanId);
  if (!loan) return;

  const idInput = document.getElementById('approveLoanId');
  if (idInput) idInput.value = loanId;
  const refEl = document.getElementById('approveLoanRef');
  if (refEl) refEl.textContent = `${loan.loanType} - ${loan.loanId}`;
  const amtEl = document.getElementById('approveLoanAmount');
  if (amtEl) amtEl.textContent = `₹${(loan.requestedAmount || 0).toLocaleString('en-IN')}`;
  const accEl = document.getElementById('approveLoanAccount');
  if (accEl) accEl.textContent = loan.accountNumber;

  // ─── Dynamically populate officers from mock database ───
  const select = document.getElementById('assignLoanOfficerSelect');
  if (select) {
    const officers = API.getMock('gg_officers').filter(o => o.status === 'ACTIVE' || o.status === 'ON_LEAVE');
    const currentOfficerId = loan.assignedOfficerId || '';
    select.innerHTML = officers.map(o => `
      <option value="${o.officerId}"
        data-name="${o.name}"
        data-desig="${o.designation}"
        ${o.officerId === currentOfficerId ? 'selected' : ''}>
        ${o.name} &bull; ${o.designation} (${o.branch})
      </option>
    `).join('');
    if (!officers.length) {
      select.innerHTML = '<option value="off-001" data-name="Vikram Sharma" data-desig="Chief Credit Officer">Vikram Sharma &bull; Chief Credit Officer (Central Tech Branch)</option>';
    }
  }

  const modal = document.getElementById('loanApprovalModal');
  if (modal) modal.classList.add('active');
}

function closeLoanApprovalModal() {
  const modal = document.getElementById('loanApprovalModal');
  if (modal) modal.classList.remove('active');
}

async function submitLoanApproval(e) {
  if (e) e.preventDefault();
  const loanId = document.getElementById('approveLoanId').value;
  const select = document.getElementById('assignLoanOfficerSelect');
  const selectedOpt = select.options[select.selectedIndex];
  const officerId = select.value;
  const officerName = selectedOpt.getAttribute('data-name') || selectedOpt.textContent.trim();
  const officerDesignation = selectedOpt.getAttribute('data-desig') || 'Credit Underwriting Specialist';
  const remarks = document.getElementById('approveLoanRemarks')?.value || 'Approved by Credit Officer';

  try {
    const btn = document.getElementById('btnConfirmApprove');
    if (btn) btn.disabled = true;

    await API.request(`/admin/loans/${loanId}/approve`, 'PUT', {
      remarks,
      officerId,
      officerName,
      officerDesignation
    });

    Utils.showToast(`Loan ${loanId} approved! Officer ${officerName} assigned & funds disbursed.`, 'success');
    closeLoanApprovalModal();
    await loadLoans();
    AdminCommon.updateLiveBadges();
  } catch (err) {
    Utils.showToast(err.message || 'Failed to approve loan', 'danger');
  } finally {
    const btn = document.getElementById('btnConfirmApprove');
    if (btn) btn.disabled = false;
  }
}

function openAssignOfficerModal(loanId) {
  const loan = allLoans.find(l => l.loanId === loanId);
  if (!loan) return;
  const idInput = document.getElementById('reassignLoanId');
  if (idInput) idInput.value = loanId;

  // Dynamically populate officer dropdown for reassignment
  const select = document.getElementById('reassignOfficerSelect');
  if (select) {
    const officers = API.getMock('gg_officers').filter(o => o.status === 'ACTIVE' || o.status === 'ON_LEAVE');
    const currentOfficerId = loan.assignedOfficerId || '';
    select.innerHTML = officers.map(o => `
      <option value="${o.officerId}"
        data-name="${o.name}"
        data-desig="${o.designation}"
        ${o.officerId === currentOfficerId ? 'selected' : ''}>
        ${o.name} &bull; ${o.designation}
      </option>
    `).join('');
    if (!officers.length) {
      select.innerHTML = '<option value="off-001" data-name="Vikram Sharma" data-desig="Chief Credit Officer">Vikram Sharma &bull; Chief Credit Officer</option>';
    }
  }

  const modal = document.getElementById('reassignOfficerModal');
  if (modal) modal.classList.add('active');
}

function closeAssignOfficerModal() {
  const modal = document.getElementById('reassignOfficerModal');
  if (modal) modal.classList.remove('active');
}

async function submitReassignOfficer(e) {
  if (e) e.preventDefault();
  const loanId = document.getElementById('reassignLoanId').value;
  const select = document.getElementById('reassignOfficerSelect');
  const selectedOpt = select.options[select.selectedIndex];
  const officerId = select.value;
  const officerName = selectedOpt.getAttribute('data-name') || selectedOpt.textContent.trim();
  const officerDesignation = selectedOpt.getAttribute('data-desig') || 'Loan Officer';

  try {
    await API.request(`/admin/loans/${loanId}/assign-officer`, 'PUT', {
      officerId,
      officerName,
      officerDesignation
    });
    Utils.showToast(`Loan Officer reassigned to ${officerName} (${officerDesignation})`, 'success');
    closeAssignOfficerModal();
    await loadLoans();
  } catch (err) {
    Utils.showToast(err.message || 'Failed to reassign officer', 'danger');
  }
}

function viewLoanDetails(loanId) {
  const l = allLoans.find(item => item.loanId === loanId);
  if (!l) return;

  const body = document.getElementById('loanModalBody');
  if (!body) return;

  body.innerHTML = `
    <div style="background: var(--bg-surface); padding: 16px; border-radius: var(--radius-md); text-align: center; margin-bottom: 8px;">
      <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Requested Principal</div>
      <div style="font-size: 1.8rem; font-weight: 800; color: var(--accent-cyan); font-family: var(--font-mono); margin-top: 4px;">
        ₹${(l.requestedAmount || 0).toLocaleString('en-IN')}
      </div>
      <span class="badge ${l.status === 'APPROVED' ? 'badge-success' : (l.status === 'REJECTED' ? 'badge-danger' : 'badge-warning')}" style="margin-top: 6px;">
        Status: ${l.status || 'PENDING'}
      </span>
    </div>

    <div style="display: flex; justify-content: space-between;">
      <span style="color: var(--text-muted);">Loan ID / Ref:</span>
      <strong style="font-family: var(--font-mono); color: #fff;">${l.loanId}</strong>
    </div>

    <div style="display: flex; justify-content: space-between;">
      <span style="color: var(--text-muted);">Applicant Account:</span>
      <strong style="font-family: var(--font-mono); color: #fff;">${l.accountNumber}</strong>
    </div>

    <div style="display: flex; justify-content: space-between;">
      <span style="color: var(--text-muted);">Loan Category:</span>
      <span style="color: #fff; font-weight: 600;">${l.loanType}</span>
    </div>

    <div style="display: flex; justify-content: space-between;">
      <span style="color: var(--text-muted);">Monthly Income:</span>
      <strong style="color: #fff;">₹${(l.monthlyIncome || 0).toLocaleString('en-IN')}</strong>
    </div>

    <div style="display: flex; justify-content: space-between;">
      <span style="color: var(--text-muted);">Tenure & Interest Rate:</span>
      <span style="color: #fff;">${l.tenure || 24} Months @ ${l.interestRate || 10.5}% p.a.</span>
    </div>

    <div style="display: flex; justify-content: space-between;">
      <span style="color: var(--text-muted);">Calculated Monthly EMI:</span>
      <strong style="color: var(--warning); font-family: var(--font-mono);">₹${(l.estimatedEMI || 0).toLocaleString('en-IN')}</strong>
    </div>

    <div style="display: flex; justify-content: space-between;">
      <span style="color: var(--text-muted);">Total Repayment Value:</span>
      <strong style="color: var(--text-primary); font-family: var(--font-mono);">₹${(l.totalRepayment || (l.requestedAmount * 1.15)).toLocaleString('en-IN')}</strong>
    </div>

    <div style="display: flex; justify-content: space-between;">
      <span style="color: var(--text-muted);">Stated Purpose:</span>
      <span style="color: #fff; text-align: right; max-width: 220px;">${l.purpose || 'General personal financing'}</span>
    </div>

    <div style="display: flex; justify-content: space-between;">
      <span style="color: var(--text-muted);">Underwriter Remarks:</span>
      <span style="color: var(--text-secondary); text-align: right; max-width: 220px;">${l.adminRemarks || 'None'}</span>
    </div>
  `;

  document.getElementById('loanDetailsModal').classList.add('active');
}

function exportLoansCsv() {
  const exportData = filteredLoans.map(l => ({
    'Loan ID': l.loanId,
    'Account Number': l.accountNumber,
    'Loan Type': l.loanType,
    'Requested Amount (INR)': l.requestedAmount,
    'Monthly Income': l.monthlyIncome,
    'Tenure (Months)': l.tenure,
    'EMI': l.estimatedEMI,
    'Status': l.status,
    'Applied Date': l.createdAt ? new Date(l.createdAt).toLocaleDateString() : 'N/A'
  }));

  AdminCommon.exportCSV(exportData, 'GG_BANK_Loans.csv');
}

function openLoanDocViewer(loanId) {
  const l = allLoans.find(item => item.loanId === loanId);
  if (!l) return;

  const nameEl = document.getElementById('loanDocApplicantName');
  if (nameEl) nameEl.textContent = `${l.customerName || 'Customer'} (Acc: ${l.accountNumber})`;

  const refEl = document.getElementById('loanDocRefId');
  if (refEl) refEl.textContent = `LOAN REF: ${l.loanId} • ${l.loanType}`;

  const badgeEl = document.getElementById('loanDocTypeBadge');
  if (badgeEl) badgeEl.textContent = l.loanType + ' Proof';

  const body = document.getElementById('loanDocViewerBody');
  const link = document.getElementById('loanDocDownloadLink');

  if (link) {
    if (l.loanDocument && l.loanDocument.startsWith('http')) {
      link.href = l.loanDocument;
      link.style.display = 'inline-flex';
    } else {
      link.style.display = 'none';
    }
  }

  if (body) {
    if (l.loanDocument && (l.loanDocument.startsWith('http') || l.loanDocument.startsWith('data:image'))) {
      body.innerHTML = `
        <div style="position: relative; max-width: 100%;">
          <img src="${l.loanDocument}" alt="Loan Document" style="max-width: 100%; max-height: 380px; border-radius: var(--radius-md); box-shadow: var(--shadow-md); border: 1px solid var(--border-color);">
          <div style="font-size: 0.8rem; color: var(--accent-cyan); margin-top: 10px;">
            <i class="fa-solid fa-cloud-arrow-up"></i> Document Stored in Cloudinary (Secure Banking Repository)
          </div>
        </div>
      `;
    } else {
      body.innerHTML = `
        <div style="background: var(--bg-surface); padding: 30px; border-radius: var(--radius-lg); border: 2px dashed var(--accent-cyan); width: 100%; max-width: 440px;">
          <div style="font-size: 3rem; color: var(--accent-cyan); margin-bottom: 12px;">
            <i class="fa-solid fa-file-invoice-dollar"></i>
          </div>
          <h4 style="color: #fff; font-size: 1.15rem; margin-bottom: 6px;">Verified Financial Documentation</h4>
          <div style="font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 12px;">
            Supporting salary certificates and income proof verified digitally for <strong>${l.customerName || 'Customer'}</strong>.
          </div>
          <div style="font-family: var(--font-mono); font-size: 0.85rem; color: var(--accent-cyan); background: rgba(56, 189, 248, 0.1); padding: 8px 12px; border-radius: var(--radius-sm); margin-bottom: 14px;">
            Document Token: CLD-${l.loanId}-DOC
          </div>
          <span class="badge badge-success"><i class="fa-solid fa-circle-check"></i> Digital Record Authenticated</span>
        </div>
      `;
    }
  }

  document.getElementById('loanDocViewerModal')?.classList.add('active');
}

window.openLoanApprovalModal = openLoanApprovalModal;
window.closeLoanApprovalModal = closeLoanApprovalModal;
window.submitLoanApproval = submitLoanApproval;
window.openAssignOfficerModal = openAssignOfficerModal;
window.closeAssignOfficerModal = closeAssignOfficerModal;
window.submitReassignOfficer = submitReassignOfficer;
window.handleLoanAction = handleLoanAction;
window.viewLoanDetails = viewLoanDetails;
window.exportLoansCsv = exportLoansCsv;
window.openLoanDocViewer = openLoanDocViewer;

