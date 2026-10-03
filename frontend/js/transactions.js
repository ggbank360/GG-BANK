/**
 * GG BANK - Transactions & Ledger Controller (transactions.js)
 * "Secure Banking. Smarter Future."
 * Provides multi-filter search, date range, pagination, detail modal, and PDF statement/receipt.
 */

let allTransactions = [];
let filteredTransactions = [];
let currentAccount = null;
let currentUser = null;
let currentPage = 1;
const pageSize = 8;

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = Auth.requireCustomer();
  if (!currentUser) return;

  try {
    const accRes = await API.request(`/accounts/user/${currentUser.userId}`);
    currentAccount = accRes.data || { accountNumber: '10018849201', balance: 65450.00, accountType: 'Savings' };

    const txnRes = await API.request(`/transactions/account/${currentAccount.accountNumber}`);
    allTransactions = txnRes.data || [];
    filteredTransactions = [...allTransactions];

    setupFilterListeners();
    renderPaginatedTransactions();

    // Statement Download
    const downloadBtn = document.getElementById('btnDownloadStatement');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        if (window.StatementGenerator) {
          StatementGenerator.generatePDF(currentUser, currentAccount, allTransactions);
        } else {
          Utils.showToast('Generating official PDF statement...', 'info');
        }
      });
    }

  } catch (err) {
    Utils.showToast(err.message, 'error', 'Error Loading Transactions');
  }
});

function setupFilterListeners() {
  const searchInput = document.getElementById('txnSearchInput');
  const catFilter = document.getElementById('txnCategoryFilter');
  const flowFilter = document.getElementById('txnFlowFilter');
  const statusFilter = document.getElementById('txnStatusFilter');
  const dateFrom = document.getElementById('txnDateFrom');
  const dateTo = document.getElementById('txnDateTo');
  const resetBtn = document.getElementById('btnResetFilters');

  const applyFilters = () => {
    const q = (searchInput ? searchInput.value : '').toLowerCase().trim();
    const cat = catFilter ? catFilter.value : 'ALL';
    const flow = flowFilter ? flowFilter.value : 'ALL';
    const status = statusFilter ? statusFilter.value : 'ALL';
    const fromVal = dateFrom ? dateFrom.value : '';
    const toVal = dateTo ? dateTo.value : '';

    filteredTransactions = allTransactions.filter(t => {
      // Search text
      const matchSearch = !q ||
        t.transactionId.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.category && t.category.toLowerCase().includes(q)) ||
        (t.receiverAccount && t.receiverAccount.toLowerCase().includes(q)) ||
        (t.senderAccount && t.senderAccount.toLowerCase().includes(q));

      // Category
      const matchCategory = cat === 'ALL' || (t.category && t.category.toLowerCase() === cat.toLowerCase());

      // Income / Expense Flow
      const isCredit = t.type === 'DEPOSIT' || t.type === 'LOAN_DISBURSEMENT';
      let matchFlow = true;
      if (flow === 'INCOME') matchFlow = isCredit;
      else if (flow === 'EXPENSE') matchFlow = !isCredit;

      // Status
      const matchStatus = status === 'ALL' || (t.status && t.status.toUpperCase() === status.toUpperCase());

      // Date Range
      let matchDate = true;
      if (t.createdAt) {
        const txnDate = new Date(t.createdAt);
        if (fromVal) {
          const fromDate = new Date(fromVal);
          fromDate.setHours(0, 0, 0, 0);
          if (txnDate < fromDate) matchDate = false;
        }
        if (toVal && matchDate) {
          const toDate = new Date(toVal);
          toDate.setHours(23, 59, 59, 999);
          if (txnDate > toDate) matchDate = false;
        }
      }

      return matchSearch && matchCategory && matchFlow && matchStatus && matchDate;
    });

    currentPage = 1;
    renderPaginatedTransactions();
  };

  if (searchInput) searchInput.addEventListener('input', applyFilters);
  if (catFilter) catFilter.addEventListener('change', applyFilters);
  if (flowFilter) flowFilter.addEventListener('change', applyFilters);
  if (statusFilter) statusFilter.addEventListener('change', applyFilters);
  if (dateFrom) dateFrom.addEventListener('change', applyFilters);
  if (dateTo) dateTo.addEventListener('change', applyFilters);

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (catFilter) catFilter.value = 'ALL';
      if (flowFilter) flowFilter.value = 'ALL';
      if (statusFilter) statusFilter.value = 'ALL';
      if (dateFrom) dateFrom.value = '';
      if (dateTo) dateTo.value = '';
      applyFilters();
    });
  }
}

function renderPaginatedTransactions() {
  const tableBody = document.getElementById('fullTxnTableBody');
  const summaryEl = document.getElementById('txnPaginationSummary');
  const paginationBtnsEl = document.getElementById('txnPaginationBtns');
  if (!tableBody) return;

  const total = filteredTransactions.length;
  if (total === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; padding: 48px 16px; color: var(--text-muted);">
          <div class="empty-state" style="padding: 0;">
            <div class="empty-state-icon"><i class="fa-solid fa-filter-circle-xmark"></i></div>
            <div class="empty-state-title">No transactions match your filters</div>
            <div class="empty-state-desc">Try clearing the search query or selecting a broader date range.</div>
          </div>
        </td>
      </tr>
    `;
    if (summaryEl) summaryEl.textContent = 'Showing 0 transactions';
    if (paginationBtnsEl) paginationBtnsEl.innerHTML = '';
    return;
  }

  const totalPages = Math.ceil(total / pageSize);
  if (currentPage > totalPages) currentPage = totalPages;
  const startIndex = (currentPage - 1) * pageSize;
  const pageItems = filteredTransactions.slice(startIndex, startIndex + pageSize);

  tableBody.innerHTML = pageItems.map((t, idx) => {
    const globalIdx = startIndex + idx;
    const isCredit = t.type === 'DEPOSIT' || t.type === 'LOAN_DISBURSEMENT';
    const amountColor = isCredit ? 'var(--success)' : 'var(--danger)';
    const sign = isCredit ? '+' : '-';

    const dateObj = new Date(t.createdAt || Date.now());
    const dateFormatted = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeFormatted = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const statusBadge = (t.status || 'COMPLETED').toUpperCase() === 'COMPLETED'
      ? `<span class="badge badge-success" style="background: rgba(16, 185, 129, 0.15); color: var(--success); border: 1px solid rgba(16, 185, 129, 0.3);">Completed</span>`
      : (t.status || '').toUpperCase() === 'PENDING'
      ? `<span class="badge badge-warning" style="background: rgba(245, 158, 11, 0.15); color: var(--warning); border: 1px solid rgba(245, 158, 11, 0.3);">Pending</span>`
      : `<span class="badge badge-danger" style="background: rgba(239, 68, 68, 0.15); color: var(--danger); border: 1px solid rgba(239, 68, 68, 0.3);">Failed</span>`;

    return `
      <tr style="cursor: pointer;" onclick="openTransactionModal(${globalIdx})">
        <td style="font-family: var(--font-mono); font-size: 0.85rem; font-weight: 600; color: var(--accent);">${t.transactionId}</td>
        <td>
          <div style="font-weight: 600; color: var(--text-primary); font-size: 0.88rem;">${dateFormatted}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${timeFormatted}</div>
        </td>
        <td>
          <div style="font-weight: 600; color: var(--text-primary);">${t.description || t.type}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">Party: ${t.receiverAccount || t.senderAccount || 'Internal'}</div>
        </td>
        <td><span class="badge" style="background: var(--surface-secondary); color: var(--text-secondary);">${t.category || 'General'}</span></td>
        <td><span class="badge ${isCredit ? 'badge-success' : 'badge-info'}">${t.type}</span></td>
        <td style="font-family: var(--font-mono); font-weight: 800; color: ${amountColor};">
          ${sign}${Utils.formatCurrency(t.amount)}
        </td>
        <td style="font-family: var(--font-mono); color: var(--text-secondary);">${Utils.formatCurrency(t.balanceAfter || 0)}</td>
        <td>${statusBadge}</td>
        <td style="text-align: right;">
          <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); openTransactionModal(${globalIdx})" title="View Details">
            <i class="fa-regular fa-eye"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  if (summaryEl) {
    summaryEl.textContent = `Showing ${startIndex + 1} to ${Math.min(startIndex + pageSize, total)} of ${total} transactions`;
  }

  // Render pagination buttons
  if (paginationBtnsEl) {
    let btns = '';
    btns += `<button class="btn btn-secondary btn-sm" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})"><i class="fa-solid fa-chevron-left"></i></button>`;
    for (let p = 1; p <= totalPages; p++) {
      if (p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1)) {
        btns += `<button class="btn ${p === currentPage ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="changePage(${p})">${p}</button>`;
      } else if (p === currentPage - 2 || p === currentPage + 2) {
        btns += `<span style="padding: 4px 6px; color: var(--text-muted);">...</span>`;
      }
    }
    btns += `<button class="btn btn-secondary btn-sm" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})"><i class="fa-solid fa-chevron-right"></i></button>`;
    paginationBtnsEl.innerHTML = btns;
  }
}

function changePage(p) {
  currentPage = p;
  renderPaginatedTransactions();
}

function openTransactionModal(idx) {
  const t = filteredTransactions[idx];
  if (!t) return;

  let modal = document.getElementById('txnDetailDrawer');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'txnDetailDrawer';
    modal.className = 'modal-backdrop';
    document.body.appendChild(modal);
  }

  const isCredit = t.type === 'DEPOSIT' || t.type === 'LOAN_DISBURSEMENT';
  const sign = isCredit ? '+' : '-';
  const amountColor = isCredit ? 'var(--success)' : 'var(--danger)';
  const dateObj = new Date(t.createdAt || Date.now());

  modal.innerHTML = `
    <div class="modal-card" style="max-width: 540px;">
      <div class="modal-header">
        <h3 class="modal-title"><i class="fa-solid fa-receipt"></i> Transaction Details</h3>
        <button class="modal-close" onclick="closeTxnDrawer()">&times;</button>
      </div>

      <div style="text-align: center; margin: 16px 0 20px 0;">
        <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.8px;">Settlement Amount</div>
        <div style="font-size: 2.25rem; font-weight: 800; font-family: var(--font-mono); color: ${amountColor}; margin-top: 4px;">
          ${sign}${Utils.formatCurrency(t.amount)}
        </div>
        <span class="badge ${isCredit ? 'badge-success' : 'badge-info'}" style="margin-top: 8px;">${t.status || 'COMPLETED'}</span>
      </div>

      <div class="confirmation-meta-box">
        <div class="confirmation-meta-row">
          <span class="confirmation-label">Transaction ID</span>
          <span class="confirmation-val" style="color: var(--accent);">${t.transactionId}</span>
        </div>
        <div class="confirmation-meta-row">
          <span class="confirmation-label">Date & Time</span>
          <span class="confirmation-val">${dateObj.toLocaleDateString('en-GB')} at ${dateObj.toLocaleTimeString('en-US')}</span>
        </div>
        <div class="confirmation-meta-row">
          <span class="confirmation-label">Sender Account</span>
          <span class="confirmation-val">${t.senderAccount || 'Internal / Self'}</span>
        </div>
        <div class="confirmation-meta-row">
          <span class="confirmation-label">Receiver Account</span>
          <span class="confirmation-val">${t.receiverAccount || (currentAccount ? currentAccount.accountNumber : '10018849201')}</span>
        </div>
        <div class="confirmation-meta-row">
          <span class="confirmation-label">Category</span>
          <span class="confirmation-val">${t.category || 'General'}</span>
        </div>
        <div class="confirmation-meta-row">
          <span class="confirmation-label">Description</span>
          <span class="confirmation-val">${t.description || 'Banking settlement'}</span>
        </div>
        <div class="confirmation-meta-row">
          <span class="confirmation-label">Status</span>
          <span class="confirmation-val" style="color: var(--success);">${t.status || 'COMPLETED'}</span>
        </div>
        <div class="confirmation-meta-row">
          <span class="confirmation-label">Balance Post-Transaction</span>
          <span class="confirmation-val" style="color: #ffffff;">${Utils.formatCurrency(t.balanceAfter || (currentAccount ? currentAccount.balance : 0))}</span>
        </div>
      </div>

      <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 20px;">
        <button class="btn btn-secondary" onclick="downloadReceiptForTxn('${t.transactionId}')">
          <i class="fa-solid fa-file-pdf"></i> Download Receipt
        </button>
        <button class="btn btn-primary" onclick="closeTxnDrawer()">Close</button>
      </div>
    </div>
  `;

  modal.classList.add('active');
}

function closeTxnDrawer() {
  const modal = document.getElementById('txnDetailDrawer');
  if (modal) modal.classList.remove('active');
}

function downloadReceiptForTxn(txnId) {
  const t = allTransactions.find(x => x.transactionId === txnId);
  if (!t) return;

  if (typeof window.jspdf === 'undefined' && typeof jsPDF === 'undefined') {
    Utils.showToast('Generating text receipt...', 'info');
    Utils.copyToClipboard(`GG BANK RECEIPT\nTxn ID: ${t.transactionId}\nAmount: ₹${t.amount}\nDate: ${t.createdAt}`, 'Receipt details copied.');
    return;
  }

  const { jsPDF } = window.jspdf || window;
  const doc = new jsPDF();

  doc.setFillColor(13, 27, 62);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(14, 165, 233);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('GG BANK', 14, 20);

  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.text('"Secure Banking. Smarter Future."', 14, 28);
  doc.text('OFFICIAL TRANSACTION RECEIPT', 130, 22);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.text(`Receipt Reference: ${t.transactionId}`, 14, 55);
  doc.text(`Timestamp: ${new Date(t.createdAt).toLocaleString()}`, 14, 65);
  doc.text(`Account Number: ${currentAccount ? currentAccount.accountNumber : '10018849201'}`, 14, 75);
  doc.text(`Transaction Type: ${t.type}`, 14, 85);
  doc.text(`Category: ${t.category}`, 14, 95);
  doc.text(`Amount: INR ${t.amount}`, 14, 105);
  doc.text(`Status: ${t.status || 'COMPLETED'}`, 14, 115);
  doc.text(`Description: ${t.description || 'N/A'}`, 14, 125);
  doc.text(`Balance Post-Transaction: INR ${t.balanceAfter || (currentAccount ? currentAccount.balance : 0)}`, 14, 135);

  doc.save(`GG_Bank_Receipt_${t.transactionId}.pdf`);
  Utils.showToast('Transaction receipt downloaded successfully.', 'success');
}

window.openTransactionModal = openTransactionModal;
window.closeTxnDrawer = closeTxnDrawer;
window.changePage = changePage;
window.downloadReceiptForTxn = downloadReceiptForTxn;
