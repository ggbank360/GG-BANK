/**
 * GG BANK - Customer Dashboard Controller (dashboard.js)
 * "Secure Banking. Smarter Future."
 * Redesigned for premium fintech aesthetics, modern transaction cards, and instant action flows.
 */

let isBalanceVisible = true;
let activeAccount = null;
let activeTransactions = [];
let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = Auth.requireCustomer();
  if (!currentUser) return;

  initDashboardLayout(currentUser);
  await loadDashboardData(currentUser);
});

function initDashboardLayout(user) {
  // Dynamic time-based greeting (Requirement 5)
  const hour = new Date().getHours();
  let timeGreeting = 'Good morning';
  if (hour >= 12 && hour < 17) {
    timeGreeting = 'Good afternoon';
  } else if (hour >= 17) {
    timeGreeting = 'Good evening';
  }

  const firstName = user.name ? user.name.split(' ')[0] : 'Customer';
  const greetingEl = document.getElementById('userGreetingHeading');
  if (greetingEl) {
    greetingEl.textContent = `${timeGreeting}, ${user.name} 👋`;
  }

  document.querySelectorAll('.customer-name-display').forEach(el => el.textContent = user.name);
  document.querySelectorAll('.customer-email-display').forEach(el => el.textContent = user.email || '');

  const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'CU';
  document.querySelectorAll('.customer-avatar-display').forEach(el => el.textContent = initials);

  // Toggle Balance Visibility
  const toggleBtn = document.getElementById('btnToggleBalance');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      isBalanceVisible = !isBalanceVisible;
      toggleBtn.innerHTML = isBalanceVisible ? '<i class="fa-solid fa-eye"></i>' : '<i class="fa-solid fa-eye-slash"></i>';
      updateBalanceDisplay();
    });
  }
}

async function loadDashboardData(user) {
  try {
    // 1. Fetch Account Details
    const accRes = await API.request(`/accounts/user/${user.userId}`);
    activeAccount = accRes.data || {
      accountId: 'acc-gowtham-101',
      userId: user.userId,
      accountNumber: '10018849201',
      accountType: 'Savings',
      balance: 65450.00,
      ifscCode: 'GGBN0001234',
      branch: 'Central Tech Branch',
      status: 'ACTIVE'
    };

    localStorage.setItem('gg_current_account', JSON.stringify(activeAccount));

    // 2. Fetch Transactions
    const txnRes = await API.request(`/transactions/account/${activeAccount.accountNumber}`);
    activeTransactions = txnRes.data || [];

    updateBalanceDisplay();
    updateDashboardMetrics();
    renderRecentTransactions(activeTransactions.slice(0, 5));

    // 3. Fetch Linked UPI ID
    await loadDashboardUpiData();

    // Render Trend Chart
    if (window.BankCharts) {
      BankCharts.renderMonthlyTrend('dashboardTrendChart');
    }
  } catch (err) {
    Utils.showToast(err.message, 'error', 'Error Loading Dashboard');
  }
}

function updateBalanceDisplay() {
  const balElem = document.getElementById('cardBalanceDisplay');
  const availElem = document.getElementById('cardAvailableBalance');
  const accNumElem = document.getElementById('cardAccountNumberDisplay');
  const accTypeElem = document.getElementById('cardAccountTypeDisplay');

  if (activeAccount) {
    const formattedAmount = Utils.formatCurrency(activeAccount.balance);
    const maskedAmount = '₹ ••••••••';

    if (balElem) balElem.textContent = isBalanceVisible ? formattedAmount : maskedAmount;
    if (availElem) availElem.textContent = isBalanceVisible ? formattedAmount : maskedAmount;

    // Show Savings •••• 9201 as requested in Requirement 5
    if (accNumElem) {
      const numStr = (activeAccount.accountNumber || '10018849201').toString();
      const lastFour = numStr.slice(-4);
      accNumElem.textContent = `${activeAccount.accountType || 'Savings'} •••• ${lastFour}`;
    }

    if (accTypeElem) {
      accTypeElem.textContent = activeAccount.accountType || 'Savings';
    }
  }
}

function updateDashboardMetrics() {
  let totalDeposits = 0;
  let totalWithdrawals = 0;

  activeTransactions.forEach(t => {
    if (t.type === 'DEPOSIT' || t.type === 'LOAN_DISBURSEMENT') {
      totalDeposits += parseFloat(t.amount);
    } else {
      totalWithdrawals += parseFloat(t.amount);
    }
  });

  const totalDepElem = document.getElementById('statTotalDeposit');
  if (totalDepElem) totalDepElem.textContent = Utils.formatCurrency(totalDeposits);

  const totalWithElem = document.getElementById('statTotalWithdrawal');
  if (totalWithElem) totalWithElem.textContent = Utils.formatCurrency(totalWithdrawals);

  const savingsElem = document.getElementById('statMonthlySavings');
  const netSavings = Math.max(0, totalDeposits - totalWithdrawals);
  if (savingsElem) savingsElem.textContent = Utils.formatCurrency(netSavings || (activeAccount ? activeAccount.balance : 65450));
}

// Category Icon Mapping
function getCategoryIcon(category, type) {
  const cat = (category || '').toLowerCase();
  if (cat.includes('salary')) return { icon: 'fa-solid fa-briefcase', cls: 'icon-credit-type' };
  if (cat.includes('food') || cat.includes('dining')) return { icon: 'fa-solid fa-utensils', cls: 'icon-debit-type' };
  if (cat.includes('bill') || cat.includes('elec') || cat.includes('utility')) return { icon: 'fa-solid fa-bolt', cls: 'icon-debit-type' };
  if (cat.includes('transfer')) return { icon: 'fa-solid fa-paper-plane', cls: 'icon-debit-type' };
  if (cat.includes('shopping')) return { icon: 'fa-solid fa-bag-shopping', cls: 'icon-debit-type' };
  if (cat.includes('freelance') || type === 'DEPOSIT') return { icon: 'fa-solid fa-arrow-down-left', cls: 'icon-credit-type' };
  return { icon: 'fa-solid fa-receipt', cls: 'icon-debit-type' };
}

function renderRecentTransactions(txns) {
  const container = document.getElementById('recentTransactionsList');
  if (!container) return;

  if (txns.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon"><i class="fa-solid fa-receipt"></i></div>
        <div class="empty-state-title">No transactions yet</div>
        <div class="empty-state-desc">Make your first fund transfer to see live records here.</div>
        <a href="transfer.html" class="btn btn-primary btn-sm"><i class="fa-solid fa-paper-plane"></i> Transfer Money</a>
      </div>
    `;
    return;
  }

  container.innerHTML = txns.map((t, idx) => {
    const isCredit = t.type === 'DEPOSIT' || t.type === 'LOAN_DISBURSEMENT';
    const sign = isCredit ? '+' : '-';
    const amountClass = isCredit ? 'txn-amount-positive' : 'txn-amount-negative';
    const iconMeta = getCategoryIcon(t.category, t.type);

    const dateObj = new Date(t.createdAt || Date.now());
    const dateFormatted = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeFormatted = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const statusCls = (t.status || 'COMPLETED').toLowerCase() === 'completed'
      ? 'status-completed'
      : (t.status || '').toLowerCase() === 'pending' ? 'status-pending' : 'status-rejected';

    return `
      <div class="transaction-item-row" onclick="openTransactionModal(${idx})" role="button" tabindex="0" aria-label="Transaction ${t.transactionId}">
        <div class="txn-left-block">
          <div class="txn-category-icon ${iconMeta.cls}">
            <i class="${iconMeta.icon}"></i>
          </div>
          <div class="txn-info-col">
            <span class="txn-merchant-name">${t.description || t.type}</span>
            <span class="txn-category-date">${t.category || 'General'} &bull; ${dateFormatted}, ${timeFormatted}</span>
          </div>
        </div>
        <div class="txn-right-block">
          <span class="txn-amount-display ${amountClass}">${sign}${Utils.formatCurrency(t.amount)}</span>
          <span class="txn-status-badge ${statusCls}">${t.status || 'COMPLETED'}</span>
        </div>
      </div>
    `;
  }).join('');
}

// Transaction Detail Modal
function openTransactionModal(idx) {
  const t = activeTransactions[idx];
  if (!t) return;

  let modal = document.getElementById('transactionDetailModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'transactionDetailModal';
    modal.className = 'modal-backdrop';
    document.body.appendChild(modal);
  }

  const isCredit = t.type === 'DEPOSIT' || t.type === 'LOAN_DISBURSEMENT';
  const sign = isCredit ? '+' : '-';
  const amountColor = isCredit ? 'var(--success)' : 'var(--danger)';
  const dateObj = new Date(t.createdAt || Date.now());

  modal.innerHTML = `
    <div class="modal-card" style="max-width: 520px;">
      <div class="modal-header">
        <h3 class="modal-title"><i class="fa-solid fa-receipt"></i> Transaction Details</h3>
        <button class="modal-close" onclick="closeTransactionModal()">&times;</button>
      </div>
      <div style="text-align: center; margin: 16px 0 24px 0;">
        <div style="font-size: 0.85rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.8px;">Amount</div>
        <div style="font-size: 2.2rem; font-weight: 800; font-family: var(--font-mono); color: ${amountColor}; margin-top: 4px;">
          ${sign}${Utils.formatCurrency(t.amount)}
        </div>
        <span class="badge ${isCredit ? 'badge-success' : 'badge-info'}" style="margin-top: 8px;">${t.status || 'COMPLETED'}</span>
      </div>

      <div class="confirmation-meta-box">
        <div class="confirmation-meta-row">
          <span class="confirmation-label">Transaction ID</span>
          <span class="confirmation-val">${t.transactionId}</span>
        </div>
        <div class="confirmation-meta-row">
          <span class="confirmation-label">Date & Time</span>
          <span class="confirmation-val">${dateObj.toLocaleDateString('en-GB')} at ${dateObj.toLocaleTimeString('en-US')}</span>
        </div>
        <div class="confirmation-meta-row">
          <span class="confirmation-label">Sender</span>
          <span class="confirmation-val">${t.senderAccount || 'Internal / Self'}</span>
        </div>
        <div class="confirmation-meta-row">
          <span class="confirmation-label">Receiver</span>
          <span class="confirmation-val">${t.receiverAccount || activeAccount.accountNumber}</span>
        </div>
        <div class="confirmation-meta-row">
          <span class="confirmation-label">Category</span>
          <span class="confirmation-val">${t.category || 'General'}</span>
        </div>
        <div class="confirmation-meta-row">
          <span class="confirmation-label">Description</span>
          <span class="confirmation-val">${t.description || 'Banking transaction'}</span>
        </div>
        <div class="confirmation-meta-row">
          <span class="confirmation-label">Balance After Transaction</span>
          <span class="confirmation-val" style="color: var(--accent);">${Utils.formatCurrency(t.balanceAfter || activeAccount.balance)}</span>
        </div>
      </div>

      <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 20px;">
        <button class="btn btn-secondary" onclick="downloadSingleReceipt('${t.transactionId}')">
          <i class="fa-solid fa-file-pdf"></i> Download Receipt
        </button>
        <button class="btn btn-primary" onclick="closeTransactionModal()">Done</button>
      </div>
    </div>
  `;

  modal.classList.add('active');
}

function closeTransactionModal() {
  const modal = document.getElementById('transactionDetailModal');
  if (modal) modal.classList.remove('active');
}

function downloadSingleReceipt(txnId) {
  const t = activeTransactions.find(x => x.transactionId === txnId);
  if (!t) return;

  if (typeof window.jspdf === 'undefined' && typeof jsPDF === 'undefined') {
    Utils.showToast('Generating text receipt...', 'info');
    Utils.copyToClipboard(`GG BANK RECEIPT\nTxn ID: ${t.transactionId}\nAmount: ₹${t.amount}\nDate: ${t.createdAt}`, 'Receipt details copied to clipboard.');
    return;
  }

  const { jsPDF } = window.jspdf || window;
  const doc = new jsPDF();

  doc.setFillColor(13, 27, 62);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(14, 165, 233);
  doc.setFontSize(20);
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
  doc.text(`Date & Time: ${new Date(t.createdAt).toLocaleString()}`, 14, 65);
  doc.text(`Account Number: ${activeAccount ? activeAccount.accountNumber : '10018849201'}`, 14, 75);
  doc.text(`Transaction Type: ${t.type}`, 14, 85);
  doc.text(`Category: ${t.category}`, 14, 95);
  doc.text(`Amount: INR ${t.amount}`, 14, 105);
  doc.text(`Status: ${t.status || 'COMPLETED'}`, 14, 115);
  doc.text(`Description: ${t.description || 'N/A'}`, 14, 125);
  doc.text(`Balance Post-Transaction: INR ${t.balanceAfter || activeAccount.balance}`, 14, 135);

  doc.save(`GG_Bank_Receipt_${t.transactionId}.pdf`);
  Utils.showToast('Transaction receipt downloaded successfully.', 'success');
}

window.openTransactionModal = openTransactionModal;
window.closeTransactionModal = closeTransactionModal;
window.downloadSingleReceipt = downloadSingleReceipt;

// ─────────────────────────────────────────────
// UPI ID Management on Dashboard
// ─────────────────────────────────────────────
let dashboardUpiState = null;

async function loadDashboardUpiData() {
  try {
    const res = await API.request('/upi/my-upi');
    dashboardUpiState = res.data;

    const upiDisplay = document.getElementById('dashboardUpiIdDisplay');
    const statusBadge = document.getElementById('dashboardUpiStatusBadge');

    if (upiDisplay) {
      upiDisplay.textContent = dashboardUpiState.upiId || 'gowtham@ggbank';
    }

    if (statusBadge) {
      if (dashboardUpiState.pendingRequest) {
        statusBadge.textContent = 'Pending Officer Approval';
        statusBadge.style.background = 'rgba(245, 158, 11, 0.2)';
        statusBadge.style.color = 'var(--warning)';
      } else {
        statusBadge.textContent = 'Active';
        statusBadge.style.background = 'rgba(16, 185, 129, 0.2)';
        statusBadge.style.color = 'var(--success)';
      }
    }
  } catch (err) {
    console.warn('Could not load UPI data:', err);
  }
}
window.loadDashboardUpiData = loadDashboardUpiData;

function openCustomizeUpiModal() {
  const modal = document.getElementById('customizeUpiModal');
  if (!modal) return;

  const currentUpiInput = document.getElementById('modalCurrentUpiId');
  const handleInput = document.getElementById('customUpiHandleInput');
  const pendingBanner = document.getElementById('modalPendingUpiBanner');
  const pendingText = document.getElementById('modalPendingHandleText');

  if (currentUpiInput && dashboardUpiState) {
    currentUpiInput.value = dashboardUpiState.upiId || 'gowtham@ggbank';
  }

  if (handleInput) {
    handleInput.value = '';
  }

  if (pendingBanner && dashboardUpiState && dashboardUpiState.pendingRequest) {
    pendingBanner.style.display = 'block';
    if (pendingText) pendingText.textContent = dashboardUpiState.pendingRequest.requestedUpiId;
  } else if (pendingBanner) {
    pendingBanner.style.display = 'none';
  }

  modal.classList.add('active');
}
window.openCustomizeUpiModal = openCustomizeUpiModal;

async function handleCustomUpiSubmit(e) {
  if (e) e.preventDefault();
  const handleInput = document.getElementById('customUpiHandleInput');
  const btn = document.getElementById('btnSubmitCustomUpi');
  const rawHandle = (handleInput ? handleInput.value : '').trim().toLowerCase();

  if (!rawHandle || rawHandle.length < 3) {
    Utils.showToast('Please enter a handle with at least 3 characters.', 'warning');
    return;
  }

  Utils.setLoading(btn, true, 'Submitting...');
  try {
    const res = await API.request('/upi/customize', 'POST', { upiHandle: rawHandle });
    Utils.showToast(res.message || 'Custom UPI ID request submitted for officer approval!', 'success');
    document.getElementById('customizeUpiModal').classList.remove('active');
    await loadDashboardUpiData();
  } catch (err) {
    Utils.showToast(err.message || 'Failed to submit custom UPI ID request', 'error');
  } finally {
    Utils.setLoading(btn, false);
  }
}
window.handleCustomUpiSubmit = handleCustomUpiSubmit;
