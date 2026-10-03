/**
 * GG BANK - Customer Details & Comprehensive History Dossier (customer-details.js)
 * Displays Customer KYC, Approval History, Submitted Documents (PAN, DL, Aadhaar),
 * Full Transaction Statement Ledger, Loan History, and Audit Timeline.
 */

let currentUserId = null;
let customerData = null;

document.addEventListener('DOMContentLoaded', async () => {
  const admin = AdminCommon.init('customers');
  if (!admin) return;

  const urlParams = new URLSearchParams(window.location.search);
  currentUserId = urlParams.get('id') || 'usr-gowtham-101';

  await loadCustomerDetails();
});

async function loadCustomerDetails() {
  const container = document.getElementById('customerDetailsContent');
  if (!container) return;

  container.innerHTML = `
    <div style="text-align: center; padding: 60px 20px; color: var(--accent-cyan);">
      <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 2.2rem; margin-bottom: 14px;"></i>
      <div style="font-size: 1rem; font-weight: 600; color: var(--text-primary);">Loading customer dossier & historical records...</div>
    </div>
  `;

  try {
    const res = await API.request(`/admin/customers/${currentUserId}`);
    customerData = res.data || {};
    renderCustomerDossier(customerData);
  } catch (err) {
    container.innerHTML = `
      <div class="card" style="text-align: center; padding: 40px; border-color: var(--danger);">
        <i class="fa-solid fa-triangle-exclamation" style="font-size: 2.5rem; color: var(--danger); margin-bottom: 14px;"></i>
        <h3 style="color: var(--text-primary); margin-bottom: 8px;">Customer Dossier Unavailable</h3>
        <p style="color: var(--text-secondary); margin-bottom: 18px;">${err.message || 'Customer not found.'}</p>
        <a href="customers.html" class="btn btn-secondary"><i class="fa-solid fa-arrow-left"></i> Return to Directory</a>
      </div>
    `;
  }
}

function renderCustomerDossier(data) {
  const container = document.getElementById('customerDetailsContent');
  const actionContainer = document.getElementById('customerActionButtons');
  if (!container) return;

  const u = data.user || {};
  const a = data.account || {};
  const docs = u.documents || {};
  const accNum = a.accountNumber || 'N/A';
  const status = u.status || a.status || 'ACTIVE';

  let statusBadge = 'badge-success';
  if (status === 'INACTIVE') statusBadge = 'badge-warning';
  if (status === 'BLOCKED' || status === 'REJECTED') statusBadge = 'badge-danger';
  if (status === 'PENDING_APPROVAL') statusBadge = 'badge-warning';

  // Action buttons
  if (actionContainer) {
    actionContainer.innerHTML = `
      ${status === 'PENDING_APPROVAL' ? `
        <button class="btn btn-success" onclick="approveCurrentCustomer()">
          <i class="fa-solid fa-circle-check"></i> Approve KYC & Activate
        </button>
      ` : ''}
      <button class="btn btn-primary btn-sm" onclick="openCustomerQrModal('${accNum !== 'N/A' ? accNum : '10018849201'}', '${u.name || 'Customer'}')">
        <i class="fa-solid fa-qrcode"></i> Customer QR Code
      </button>
      <button class="btn btn-success btn-sm" onclick="AdminCommon.openDirectDepositModal('${accNum !== 'N/A' ? accNum : ''}')">
        <i class="fa-solid fa-circle-plus"></i> Treasury Deposit
      </button>
      <a href="admin-transactions.html" class="btn btn-secondary btn-sm">
        <i class="fa-solid fa-money-bill-transfer"></i> Global Ledger
      </a>
      <a href="admin-loans.html" class="btn btn-secondary btn-sm">
        <i class="fa-solid fa-hand-holding-dollar"></i> Loans Hub
      </a>
    `;
  }

  // Transaction Ledger rows
  const txns = data.recentTransactions || [];
  let txnRows = '';
  if (txns.length === 0) {
    txnRows = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">No transaction records found for this account.</td></tr>`;
  } else {
    txnRows = txns.map(t => {
      const isCredit = t.receiverAccount === accNum || t.type === 'DEPOSIT' || t.type === 'LOAN_DISBURSEMENT';
      const amtColor = isCredit ? 'var(--success)' : 'var(--danger)';
      const amtPrefix = isCredit ? '+' : '-';
      const dateStr = t.createdAt ? new Date(t.createdAt).toLocaleString() : 'N/A';

      return `
        <tr>
          <td><strong style="font-family: var(--font-mono); color: var(--accent-cyan); font-size: 0.85rem;">${t.transactionId}</strong></td>
          <td style="font-size: 0.82rem; color: var(--text-secondary);">${dateStr}</td>
          <td><span class="badge" style="background: rgba(56, 189, 248, 0.15); color: var(--accent-cyan);">${t.type}</span></td>
          <td style="font-size: 0.86rem;">${t.description || t.category || 'Banking Operation'}</td>
          <td style="font-family: var(--font-mono); font-weight: 700; color: ${amtColor}; font-size: 0.95rem;">
            ${amtPrefix} ₹${(t.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </td>
          <td><span class="badge badge-success">COMPLETED</span></td>
        </tr>
      `;
    }).join('');
  }

  // Loans list
  const loans = data.loans || [];
  let loanRows = '';
  if (loans.length === 0) {
    loanRows = `<div style="text-align: center; color: var(--text-muted); padding: 20px;">No loan applications associated with this customer.</div>`;
  } else {
    loanRows = loans.map(l => {
      let lBadge = 'badge-warning';
      if (l.status === 'APPROVED') lBadge = 'badge-success';
      if (l.status === 'COMPLETED') lBadge = 'badge-info';
      if (l.status === 'REJECTED') lBadge = 'badge-danger';

      return `
        <div style="background: var(--bg-surface); border: 1px solid var(--border-color-subtle); border-radius: var(--radius-md); padding: 14px; margin-bottom: 12px; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px;">
          <div>
            <div style="font-weight: 700; color: #fff; font-size: 0.95rem;">${l.loanType} &bull; <span style="color: var(--accent-cyan); font-family: var(--font-mono);">${l.loanId}</span></div>
            <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px;">
              Assigned Loan Officer: <strong style="color: var(--accent-cyan);">${l.assignedOfficerName || 'Vikram Sharma'}</strong> (${l.assignedOfficerDesignation || 'Credit Officer'})
            </div>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">
              Applied: ${l.createdAt ? new Date(l.createdAt).toLocaleDateString() : 'N/A'} &bull; EMI: ₹${(l.estimatedEMI || 0).toLocaleString('en-IN')}/mo &bull; Tenure: ${l.tenure} Months
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-family: var(--font-mono); font-weight: 800; color: var(--success); font-size: 1.1rem;">₹${(l.requestedAmount || 0).toLocaleString('en-IN')}</div>
            <span class="badge ${lBadge}" style="margin-top: 4px;">${l.status}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // Audit trail
  const allLogs = (window.API ? window.API.getMock('gg_audit_logs') : []).filter(log => log.userId === currentUserId || log.description.includes(u.name || currentUserId));
  let auditTimeline = '';
  if (allLogs.length === 0) {
    auditTimeline = `<div style="text-align: center; color: var(--text-muted); padding: 16px;">No audit logs recorded for this account.</div>`;
  } else {
    auditTimeline = allLogs.slice(0, 8).map(log => `
      <div style="display: flex; gap: 14px; padding-bottom: 14px; border-bottom: 1px solid var(--border-color-subtle); margin-bottom: 14px;">
        <div style="width: 34px; height: 34px; border-radius: 50%; background: rgba(56, 189, 248, 0.15); color: var(--accent-cyan); display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 0.85rem;">
          <i class="fa-solid fa-clock-rotate-left"></i>
        </div>
        <div>
          <div style="font-weight: 700; color: #fff; font-size: 0.88rem;">${log.action}</div>
          <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 2px;">${log.description}</div>
          <div style="font-size: 0.74rem; color: var(--text-muted); font-family: var(--font-mono); margin-top: 2px;">
            ${log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
          </div>
        </div>
      </div>
    `).join('');
  }

  container.innerHTML = `
    <!-- Top Identity Card -->
    <div class="card" style="margin-bottom: 24px; background: linear-gradient(135deg, rgba(16, 30, 66, 0.9) 0%, rgba(11, 21, 45, 0.95) 100%); border-left: 5px solid var(--accent-cyan);">
      <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 16px;">
        <div style="display: flex; align-items: center; gap: 18px;">
          <div style="width: 64px; height: 64px; border-radius: var(--radius-md); background: linear-gradient(135deg, #0072ff 0%, #00f0ff 100%); display: flex; align-items: center; justify-content: center; font-size: 1.8rem; font-weight: 800; color: #fff;">
            ${(u.name || 'C').substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 style="font-size: 1.35rem; font-weight: 800; color: #fff; margin-bottom: 4px;">${u.name || 'Customer Profile'}</h3>
            <div style="font-size: 0.85rem; color: var(--text-secondary); font-family: var(--font-mono);">
              Customer ID: <strong style="color: var(--accent-cyan);">${u.userId}</strong> &bull; Registered: ${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
            </div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 10px;">
          <span class="badge ${statusBadge}" style="font-size: 0.85rem; padding: 6px 14px;">${status === 'PENDING_APPROVAL' ? 'PENDING APPROVAL' : status}</span>
        </div>
      </div>
    </div>

    <!-- KYC Approval & Verification Banner -->
    <div class="card" style="margin-bottom: 24px; border-left: 4px solid var(--success);">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <div>
          <div style="font-size: 0.78rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">KYC Compliance Status</div>
          <div style="font-size: 1.15rem; font-weight: 800; color: #fff; margin-top: 3px;">
            ${u.kycStatus === 'VERIFIED' ? '✅ Official KYC Documents Verified & Approved' : (status === 'PENDING_APPROVAL' ? '⏳ KYC Verification Pending Admin Review' : 'Active Portfolio')}
          </div>
          <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 2px;">
            ${u.approvedAt ? `Approved on ${new Date(u.approvedAt).toLocaleString()} by <strong>${u.approvedBy || 'GG Bank Administrator'}</strong>` : 'Submitted for authentication'} &bull; Remarks: ${u.adminRemarks || 'Document verification in progress'}
          </div>
        </div>

        <div style="display: flex; gap: 10px;">
          <span class="badge ${u.kycStatus === 'VERIFIED' ? 'badge-success' : 'badge-warning'}" style="padding: 6px 12px;">
            KYC: ${u.kycStatus || 'VERIFIED'}
          </span>
        </div>
      </div>

      <!-- Submitted Documents Cards: PAN Card, Aadhaar / ID Proof, Income Proof, Bank Statement -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-color-subtle);">
        <!-- 1. PAN Card -->
        <div style="background: var(--bg-surface); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color-subtle); display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <strong style="color: var(--accent-cyan); font-size: 0.88rem;"><i class="fa-solid fa-id-card"></i> PAN Card</strong>
              <span class="badge badge-info" style="font-size: 0.7rem;">Income Tax</span>
            </div>
            <div style="font-family: var(--font-mono); font-weight: 700; color: #fff; font-size: 1.05rem; margin: 8px 0;">
              ${docs.panNumber || 'ABCDE1234F'}
            </div>
            <div style="font-size: 0.78rem; color: var(--text-muted);">Verified Govt Identity Card</div>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" onclick="viewKYCDocumentDetails('PAN')" style="margin-top: 12px; width: 100%;">
            <i class="fa-solid fa-eye"></i> View PAN Card
          </button>
        </div>

        <!-- 2. Aadhaar / ID Proof -->
        <div style="background: var(--bg-surface); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color-subtle); display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <strong style="color: var(--warning); font-size: 0.88rem;"><i class="fa-solid fa-fingerprint"></i> Aadhaar / ID Proof</strong>
              <span class="badge badge-warning" style="font-size: 0.7rem;">UIDAI / Govt</span>
            </div>
            <div style="font-family: var(--font-mono); font-weight: 700; color: #fff; font-size: 1.05rem; margin: 8px 0;">
              ${docs.aadhaarNumber || '2345 6789 0123'}
            </div>
            <div style="font-size: 0.78rem; color: var(--text-muted);">Biometrically Verified National ID</div>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" onclick="viewKYCDocumentDetails('AADHAAR')" style="margin-top: 12px; width: 100%;">
            <i class="fa-solid fa-eye"></i> View Aadhaar / ID Proof
          </button>
        </div>

        <!-- 3. Income Proof -->
        <div style="background: var(--bg-surface); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color-subtle); display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <strong style="color: #10b981; font-size: 0.88rem;"><i class="fa-solid fa-file-invoice-dollar"></i> Income Proof</strong>
              <span class="badge badge-success" style="font-size: 0.7rem;">Salary / ITR</span>
            </div>
            <div style="font-family: var(--font-mono); font-weight: 700; color: #fff; font-size: 1.05rem; margin: 8px 0;">
              ${docs.incomeProofDoc ? 'Uploaded Proof' : 'Salary Slip / Form 16'}
            </div>
            <div style="font-size: 0.78rem; color: var(--text-muted);">Income Verification Document</div>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" onclick="viewKYCDocumentDetails('INCOME')" style="margin-top: 12px; width: 100%;">
            <i class="fa-solid fa-eye"></i> View Income Proof
          </button>
        </div>

        <!-- 4. Bank Statement -->
        <div style="background: var(--bg-surface); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color-subtle); display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <strong style="color: #6366f1; font-size: 0.88rem;"><i class="fa-solid fa-file-lines"></i> Bank Statement</strong>
              <span class="badge" style="background: rgba(99, 102, 241, 0.2); color: #818cf8; font-size: 0.7rem;">6 Months</span>
            </div>
            <div style="font-family: var(--font-mono); font-weight: 700; color: #fff; font-size: 1.05rem; margin: 8px 0;">
              ${docs.bankStatementDoc ? 'Uploaded Statement' : 'Official e-Statement'}
            </div>
            <div style="font-size: 0.78rem; color: var(--text-muted);">Bank Statement Records</div>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" onclick="viewKYCDocumentDetails('STATEMENT')" style="margin-top: 12px; width: 100%;">
            <i class="fa-solid fa-eye"></i> View Bank Statement
          </button>
        </div>
      </div>
    </div>

    <!-- 2 Column Section: Personal Profile vs Account Portfolio -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 24px; margin-bottom: 24px;">
      
      <!-- Section 1: Customer Personal Info -->
      <div class="card">
        <h3 class="card-title" style="margin-bottom: 18px; border-bottom: 1px solid var(--border-color-subtle); padding-bottom: 10px;">
          <i class="fa-solid fa-user-check" style="color: #3b82f6;"></i> Personal Profile
        </h3>
        <div style="display: flex; flex-direction: column; gap: 12px; font-size: 0.9rem;">
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">Full Legal Name:</span>
            <strong style="color: #fff;">${u.name || 'N/A'}</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">Registered Email:</span>
            <strong style="color: var(--accent-cyan);">${u.email || 'N/A'}</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">Mobile Number:</span>
            <strong style="color: #fff;">${u.phone || 'N/A'}</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">Date of Birth:</span>
            <strong style="color: #fff;">${u.dateOfBirth || 'N/A'}</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">Residential Address:</span>
            <strong style="color: #fff; text-align: right; max-width: 220px;">${u.address || 'N/A'}</strong>
          </div>
        </div>
      </div>

      <!-- Section 2: Account Information -->
      <div class="card">
        <h3 class="card-title" style="margin-bottom: 18px; border-bottom: 1px solid var(--border-color-subtle); padding-bottom: 10px;">
          <i class="fa-solid fa-vault" style="color: var(--accent-cyan);"></i> Bank Account Details
        </h3>
        <div style="display: flex; flex-direction: column; gap: 12px; font-size: 0.9rem;">
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">Account Number:</span>
            <strong style="font-family: var(--font-mono); color: #fff; font-size: 1.1rem;">${accNum}</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">Account Type:</span>
            <span class="badge" style="background: rgba(56, 189, 248, 0.15); color: var(--accent-cyan);">${a.accountType || 'SAVINGS'}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">Account Balance:</span>
            <strong style="font-family: var(--font-mono); color: var(--success); font-size: 1.25rem;">₹${(a.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">IFSC Code:</span>
            <strong style="font-family: var(--font-mono); color: #fff;">${a.ifscCode || 'GGBN0001234'}</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">Branch:</span>
            <strong style="color: #fff;">${a.branch || 'Central Tech Branch'}</strong>
          </div>
        </div>
      </div>

    </div>

    <!-- Section 3: Historical Transaction Statement Ledger -->
    <div class="card" style="margin-bottom: 24px;">
      <div class="card-header">
        <h3 class="card-title"><i class="fa-solid fa-clock-rotate-left"></i> Transaction History</h3>
        <span style="font-size: 0.82rem; color: var(--text-muted);">${txns.length} Transactions</span>
      </div>
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Transaction ID</th>
              <th>Date & Time</th>
              <th>Type</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${txnRows}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Section 4: Loan Portfolio & History -->
    <div class="card" style="margin-bottom: 24px;">
      <div class="card-header">
        <h3 class="card-title"><i class="fa-solid fa-hand-holding-dollar"></i> Loan History</h3>
        <span style="font-size: 0.82rem; color: var(--text-muted);">${loans.length} Loans</span>
      </div>
      <div>
        ${loanRows}
      </div>
    </div>

    <!-- Section 5: Audit Trail & Operational Timeline -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title"><i class="fa-solid fa-shield-halved"></i> Activity History</h3>
      </div>
      <div>
        ${auditTimeline}
      </div>
    </div>
  `;
}

function viewKYCDocumentDetails(docType = 'PAN') {
  if (!customerData || !customerData.user) return;
  const u = customerData.user;
  const a = customerData.account || {};

  const nameEl = document.getElementById('kycDocHolderName');
  if (nameEl) nameEl.textContent = `${u.name} (${a.accountNumber || u.userId})`;

  const actionsEl = document.getElementById('kycModalActionBtns');
  if (actionsEl) {
    const status = u.status || a.status || 'ACTIVE';
    if (status === 'PENDING_APPROVAL') {
      actionsEl.innerHTML = `
        <button type="button" class="btn btn-danger btn-sm" onclick="rejectCurrentCustomer(); document.getElementById('kycDocViewerModal').classList.remove('active');">
          <i class="fa-solid fa-xmark"></i> Decline Application
        </button>
        <button type="button" class="btn btn-success btn-sm" onclick="approveCurrentCustomer(); document.getElementById('kycDocViewerModal').classList.remove('active');">
          <i class="fa-solid fa-circle-check"></i> Approve KYC & Activate Account
        </button>
      `;
    } else {
      actionsEl.innerHTML = `
        <span class="badge badge-success" style="padding: 6px 12px;"><i class="fa-solid fa-check"></i> Account Verified & Active</span>
      `;
    }
  }

  switchKYCDetailsDoc(docType);
  document.getElementById('kycDocViewerModal')?.classList.add('active');
}

function switchKYCDetailsDoc(docType) {
  if (!customerData || !customerData.user) return;
  const u = customerData.user;
  const docs = u.documents || {};
  const nominee = u.nominee || { name: 'Not Provided', relationship: 'N/A', contact: 'N/A' };

  const panNum = docs.panNumber || 'ABCDE1234F';
  const aadhaarNum = docs.aadhaarNumber || '2345 6789 0123';
  const addressType = docs.addressProofType || 'Utility / Address Bill';

  // Toggle Tab UI
  // Toggle Tab UI
  ['All', 'Pan', 'Aadhaar', 'Income', 'BankStatement', 'Photo', 'Signature', 'Nominee'].forEach(tab => {
    const el = document.getElementById(`kycTab${tab}`);
    if (el) {
      let isCurrent = false;
      if (tab === 'All' && docType === 'ALL') isCurrent = true;
      if (tab === 'Pan' && docType === 'PAN') isCurrent = true;
      if (tab === 'Aadhaar' && docType === 'AADHAAR') isCurrent = true;
      if (tab === 'Income' && docType === 'INCOME') isCurrent = true;
      if (tab === 'BankStatement' && (docType === 'STATEMENT' || docType === 'BANKSTATEMENT')) isCurrent = true;
      if (tab === 'Photo' && docType === 'PHOTO') isCurrent = true;
      if (tab === 'Signature' && docType === 'SIGNATURE') isCurrent = true;
      if (tab === 'Nominee' && docType === 'NOMINEE') isCurrent = true;
      el.classList.toggle('btn-primary', isCurrent);
      el.classList.toggle('btn-secondary', !isCurrent);
    }
  });

  const body = document.getElementById('kycViewerBody');
  const numEl = document.getElementById('kycModalDocNumber');
  const statusEl = document.getElementById('kycModalDocStatus');
  const isPending = (u.status === 'PENDING_APPROVAL');

  if (statusEl) {
    statusEl.className = isPending ? 'badge badge-warning' : 'badge badge-success';
    statusEl.textContent = isPending ? 'PENDING VERIFICATION' : 'VERIFIED';
  }

  // Ensure every document has a valid visual image
  const rawAadhaar = docs.aadhaarDoc || docs.aadhaarCard;
  const aadhaarImg = (rawAadhaar && rawAadhaar !== 'null' && rawAadhaar.length > 20) 
    ? rawAadhaar 
    : (window.Utils && window.Utils.generateAadhaarCard ? window.Utils.generateAadhaarCard(u.name, aadhaarNum, u.dateOfBirth) : '');

  const rawPan = docs.panDoc || docs.panCard;
  const panImg = (rawPan && rawPan !== 'null' && rawPan.length > 20) 
    ? rawPan 
    : (window.Utils && window.Utils.generatePanCard ? window.Utils.generatePanCard(u.name, panNum, u.dateOfBirth) : '');

  const rawIncome = docs.incomeProofDoc || docs.incomeProof;
  const incomeImg = (rawIncome && rawIncome !== 'null' && rawIncome.length > 20)
    ? rawIncome
    : (window.Utils && window.Utils.generateIncomeProof ? window.Utils.generateIncomeProof(u.name) : '');

  const rawStatement = docs.bankStatementDoc || docs.bankStatement;
  const bankStatementImg = (rawStatement && rawStatement !== 'null' && rawStatement.length > 20)
    ? rawStatement
    : (window.Utils && window.Utils.generateBankStatement ? window.Utils.generateBankStatement(u.name, a.accountNumber) : '');

  const rawPhoto = docs.photoDoc || docs.photo;
  const photoImg = (rawPhoto && rawPhoto !== 'null' && rawPhoto.length > 20) 
    ? rawPhoto 
    : (window.Utils && window.Utils.generatePassportPhoto ? window.Utils.generatePassportPhoto(u.name) : '');

  const rawSig = docs.signatureDoc || docs.signature;
  const sigImg = (rawSig && rawSig !== 'null' && rawSig.length > 20) 
    ? rawSig 
    : (window.Utils && window.Utils.generateSignature ? window.Utils.generateSignature(u.name) : '');

  // 1. ALL DOCUMENTS GRID MODE
  if (docType === 'ALL') {
    if (numEl) numEl.textContent = 'All 4 Proof Documents (PAN, Aadhaar, Income, Bank Statement)';

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
            <div style="height: 130px; background: rgba(0,0,0,0.35); border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; overflow: hidden; cursor: pointer; border: 1px dashed rgba(255,255,255,0.15);" onclick="switchKYCDetailsDoc('AADHAAR')" title="Click to enlarge">
              <img src="${aadhaarImg}" alt="Aadhaar" style="max-height: 100%; max-width: 100%; object-fit: contain;">
            </div>
            <div style="text-align: right; margin-top: 6px;">
              <button type="button" class="btn btn-secondary btn-sm" style="font-size: 0.72rem; padding: 2px 8px;" onclick="switchKYCDetailsDoc('AADHAAR')">Inspect Aadhaar <i class="fa-solid fa-magnifying-glass"></i></button>
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
            <div style="height: 130px; background: rgba(0,0,0,0.35); border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; overflow: hidden; cursor: pointer; border: 1px dashed rgba(255,255,255,0.15);" onclick="switchKYCDetailsDoc('PAN')" title="Click to enlarge">
              <img src="${panImg}" alt="PAN" style="max-height: 100%; max-width: 100%; object-fit: contain;">
            </div>
            <div style="text-align: right; margin-top: 6px;">
              <button type="button" class="btn btn-secondary btn-sm" style="font-size: 0.72rem; padding: 2px 8px;" onclick="switchKYCDetailsDoc('PAN')">Inspect PAN <i class="fa-solid fa-magnifying-glass"></i></button>
            </div>
          </div>

          <!-- 3. Passport Photo -->
          <div style="background: var(--bg-surface); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color-subtle);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <strong style="color: var(--text-primary); font-size: 0.88rem;"><i class="fa-solid fa-camera" style="color: #10b981;"></i> Passport Photo</strong>
              <span class="badge badge-success" style="font-size: 0.65rem;">Biometric</span>
            </div>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 8px;">Applicant Identity Headshot</div>
            <div style="height: 130px; background: rgba(0,0,0,0.35); border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; overflow: hidden; cursor: pointer; border: 1px dashed rgba(255,255,255,0.15);" onclick="switchKYCDetailsDoc('PHOTO')" title="Click to enlarge">
              <img src="${photoImg}" alt="Photo" style="max-height: 100%; max-width: 100%; object-fit: contain; border-radius: 8px;">
            </div>
            <div style="text-align: right; margin-top: 6px;">
              <button type="button" class="btn btn-secondary btn-sm" style="font-size: 0.72rem; padding: 2px 8px;" onclick="switchKYCDetailsDoc('PHOTO')">Inspect Photo <i class="fa-solid fa-magnifying-glass"></i></button>
            </div>
          </div>

          <!-- 4. Signature -->
          <div style="background: var(--bg-surface); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color-subtle);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <strong style="color: var(--text-primary); font-size: 0.88rem;"><i class="fa-solid fa-signature" style="color: #f59e0b;"></i> Signature Specimen</strong>
              <span class="badge badge-warning" style="font-size: 0.65rem;">Official Sign</span>
            </div>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 8px;">Customer Signature Specimen</div>
            <div style="height: 130px; background: rgba(0,0,0,0.35); border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; overflow: hidden; cursor: pointer; border: 1px dashed rgba(255,255,255,0.15);" onclick="switchKYCDetailsDoc('SIGNATURE')" title="Click to enlarge">
              <img src="${sigImg}" alt="Signature" style="max-height: 100%; max-width: 100%; object-fit: contain;">
            </div>
            <div style="text-align: right; margin-top: 6px;">
              <button type="button" class="btn btn-secondary btn-sm" style="font-size: 0.72rem; padding: 2px 8px;" onclick="switchKYCDetailsDoc('SIGNATURE')">Inspect Sign <i class="fa-solid fa-magnifying-glass"></i></button>
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

  // 2. INDIVIDUAL TAB ENLARGED VIEW
  let currentDocNum = aadhaarNum;
  let currentDocData = aadhaarImg;
  let docTitle = 'Aadhaar Card';

  if (docType === 'PAN') {
    currentDocNum = panNum;
    currentDocData = panImg;
    docTitle = 'PAN Card';
  } else if (docType === 'INCOME') {
    currentDocNum = 'Salary Slip / Income Tax Return';
    currentDocData = incomeImg;
    docTitle = 'Income Proof Verification Document';
  } else if (docType === 'STATEMENT' || docType === 'BANKSTATEMENT') {
    currentDocNum = 'Official 6-Month Bank Statement';
    currentDocData = bankStatementImg;
    docTitle = 'Bank Statement Document';
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

function approveCurrentCustomer(direct = false) {
  if (!customerData || !customerData.user) return;
  if (!direct) {
    viewKYCDocumentDetails('ALL');
    return;
  }
  executeApproveCurrentCustomer();
}

async function executeApproveCurrentCustomer() {
  if (!customerData || !customerData.user) return;
  const u = customerData.user;
  try {
    await API.request(`/admin/customers/${u.userId}/approve`, 'PUT', {
      approvedBy: 'GG Bank Administrator',
      remarks: 'KYC Documents Verified and Approved'
    });
    document.getElementById('kycDocViewerModal')?.classList.remove('active');
    Utils.showToast(`Customer ${u.name} approved! Account is now active.`, 'success');
    await loadCustomerDetails();
  } catch (err) {
    Utils.showToast('Approval error: ' + err.message, 'error');
  }
}

function rejectCurrentCustomer() {
  if (!customerData || !customerData.user) return;
  const u = customerData.user;
  const reason = prompt(`Enter reason for declining application for ${u.name}:`, 'Documents invalid or incomplete');
  if (reason === null) return;

  API.request(`/admin/customers/${u.userId}/reject`, 'PUT', {
    remarks: reason || 'KYC Document verification failed compliance check.'
  }).then(async () => {
    document.getElementById('kycDocViewerModal')?.classList.remove('active');
    Utils.showToast(`Application for ${u.name} has been rejected.`, 'info');
    await loadCustomerDetails();
  }).catch(err => {
    Utils.showToast('Rejection error: ' + err.message, 'error');
  });
}

let modalQrAccountNum = '';

function openCustomerQrModal(accountNumber, customerName) {
  modalQrAccountNum = accountNumber;
  document.getElementById('modalQrCustName').textContent = customerName;
  document.getElementById('modalQrCustAcc').textContent = Utils.formatAccountNumber(accountNumber);
  document.getElementById('modalQrCustUpi').textContent = `${accountNumber}@ggbank`;

  const container = document.getElementById('modalQrContainer');
  container.innerHTML = '';

  const payload = {
    protocol: 'GGBANK_PAY',
    version: '1.0',
    type: 'CUSTOMER_QR',
    accountNumber: accountNumber,
    name: customerName,
    ifsc: 'GGBN0001234',
    upi: `${accountNumber}@ggbank`,
    qrIdentifier: `QR-CUST-${accountNumber}`
  };

  if (typeof window.QRCode !== 'undefined') {
    try {
      new QRCode(container, {
        text: JSON.stringify(payload),
        width: 180,
        height: 180,
        colorDark: '#070d1e',
        colorLight: '#ffffff',
        correctLevel: window.QRCode.CorrectLevel ? window.QRCode.CorrectLevel.M : 0
      });
      setTimeout(() => {
        const c = container.querySelector('canvas');
        if (c) c.style.display = 'block';
      }, 50);
    } catch (e) {
      container.innerHTML = `<div style="padding: 20px; font-family: monospace;">A/C: ${accountNumber}</div>`;
    }
  }

  document.getElementById('customerQrModal').classList.add('active');
}

function downloadModalQr() {
  const container = document.getElementById('modalQrContainer');
  if (!container) return;
  const canvas = container.querySelector('canvas');
  const img = container.querySelector('img');
  let dataUrl = '';
  if (canvas) dataUrl = canvas.toDataURL('image/png');
  else if (img && img.src) dataUrl = img.src;

  if (dataUrl) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `GGBank_QR_${modalQrAccountNum || 'Customer'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    Utils.showToast('Customer QR Code downloaded!', 'success');
  }
}

window.approveCurrentCustomer = approveCurrentCustomer;
window.executeApproveCurrentCustomer = executeApproveCurrentCustomer;
window.rejectCurrentCustomer = rejectCurrentCustomer;
window.viewKYCDocumentDetails = viewKYCDocumentDetails;
window.switchKYCDetailsDoc = switchKYCDetailsDoc;
window.openCustomerQrModal = openCustomerQrModal;
window.downloadModalQr = downloadModalQr;

