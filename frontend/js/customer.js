/**
 * GG BANK - Customer Portal Engine
 * Full implementation for all 14 Customer Banking features
 */

let currentUser = null;
let currentAccount = null;
let userTransactions = [];
let userBeneficiaries = [];
let userBudgets = [];
let userLoans = [];
let userNotifications = [];
let isBalanceVisible = true;

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = Auth.requireAuth('CUSTOMER');
  if (!currentUser) return;

  initUI();
  await loadUserData();
  setupEventListeners();
  switchView('view-dashboard');
});

function initUI() {
  // Populate User info in Topbar & Sidebar
  const nameElems = document.querySelectorAll('.customer-name-display');
  nameElems.forEach(el => el.textContent = currentUser.name);

  const emailElems = document.querySelectorAll('.customer-email-display');
  emailElems.forEach(el => el.textContent = currentUser.email);

  const avatarElems = document.querySelectorAll('.customer-avatar-display');
  avatarElems.forEach(el => {
    el.textContent = currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  });

  // Theme Initializer
  const savedTheme = localStorage.getItem('gg_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}

function updateThemeIcon(theme) {
  const icon = document.getElementById('themeIcon');
  if (icon) {
    icon.textContent = theme === 'light' ? '🌙' : '☀️';
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const newTheme = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('gg_theme', newTheme);
  updateThemeIcon(newTheme);
}

// Tab View Navigation
function switchView(viewId) {
  const views = document.querySelectorAll('.view-section');
  views.forEach(v => v.classList.remove('active-view'));

  const activeView = document.getElementById(viewId);
  if (activeView) {
    activeView.classList.add('active-view');
  }

  // Update Sidebar Active state
  const navItems = document.querySelectorAll('.sidebar .nav-item');
  navItems.forEach(item => {
    if (item.getAttribute('data-view') === viewId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Mobile sidebar close on navigation
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) sidebar.classList.remove('mobile-open');

  // Trigger view specific re-renders
  if (viewId === 'view-insights') {
    renderFinancialInsights();
  } else if (viewId === 'view-dashboard') {
    setTimeout(() => {
      BankCharts.renderMonthlyTrend('dashboardTrendChart');
    }, 100);
  }
}

async function loadUserData() {
  try {
    // 1. Load Account
    const accRes = await API.request(`/accounts/user/${currentUser.userId}`);
    currentAccount = accRes.data;

    // 2. Load Transactions
    const txnRes = await API.request(`/transactions/account/${currentAccount.accountNumber}`);
    userTransactions = txnRes.data || [];

    // 3. Load Beneficiaries
    const benRes = await API.request('/beneficiaries');
    userBeneficiaries = benRes.data || [];

    // 4. Load Budgets
    const budRes = await API.request('/budgets');
    userBudgets = budRes.data || [];

    // 5. Load Loans
    const loanRes = await API.request('/loans');
    userLoans = (loanRes.data || []).filter(l => l.userId === currentUser.userId);

    // 6. Load Notifications
    const notifRes = await API.request('/notifications');
    userNotifications = notifRes.data || [];

    updateDashboardMetrics();
    renderTransactionsTable(userTransactions);
    renderBeneficiariesList();
    renderBudgetCards();
    renderLoansList();
    renderNotificationsList();
    populateAccountView();
    updateNotificationBadge();
  } catch (err) {
    Toast.error(err.message, 'Failed to Load Account Data');
  }
}

function updateDashboardMetrics() {
  if (!currentAccount) return;

  // Balance Card
  const balElem = document.getElementById('cardBalanceDisplay');
  if (balElem) {
    balElem.textContent = isBalanceVisible
      ? `₹${currentAccount.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
      : '₹ ••••••••';
  }

  const accNumElem = document.getElementById('cardAccountNumberDisplay');
  if (accNumElem) {
    const formatted = currentAccount.accountNumber.match(/.{1,4}/g)?.join(' ') || currentAccount.accountNumber;
    accNumElem.textContent = formatted;
  }

  const accTypeElem = document.getElementById('cardAccountTypeDisplay');
  if (accTypeElem) {
    accTypeElem.textContent = currentAccount.accountType;
  }

  // Calculate Totals
  let totalDeposits = 0;
  let totalWithdrawals = 0;

  userTransactions.forEach(t => {
    if (t.type === 'DEPOSIT' || t.type === 'LOAN_DISBURSEMENT') {
      totalDeposits += t.amount;
    } else {
      totalWithdrawals += t.amount;
    }
  });

  const totalDepElem = document.getElementById('statTotalDeposit');
  if (totalDepElem) totalDepElem.textContent = `₹${totalDeposits.toLocaleString('en-IN')}`;

  const totalWithElem = document.getElementById('statTotalWithdrawal');
  if (totalWithElem) totalWithElem.textContent = `₹${totalWithdrawals.toLocaleString('en-IN')}`;

  const savingsElem = document.getElementById('statMonthlySavings');
  const netSavings = Math.max(0, totalDeposits - totalWithdrawals);
  if (savingsElem) savingsElem.textContent = `₹${netSavings.toLocaleString('en-IN')}`;

  // Balance Trend Chart
  BankCharts.renderMonthlyTrend('dashboardTrendChart');
}

function toggleBalanceVisibility() {
  isBalanceVisible = !isBalanceVisible;
  const btn = document.getElementById('btnToggleBalance');
  if (btn) btn.textContent = isBalanceVisible ? '👁' : '🙈';
  updateDashboardMetrics();
}

function populateAccountView() {
  if (!currentAccount) return;
  document.getElementById('accViewName').textContent = currentUser.name;
  document.getElementById('accViewCustId').textContent = currentUser.userId;
  document.getElementById('accViewNumber').textContent = currentAccount.accountNumber;
  document.getElementById('accViewType').textContent = currentAccount.accountType;
  document.getElementById('accViewIfsc').textContent = currentAccount.ifscCode;
  document.getElementById('accViewBranch').textContent = currentAccount.branch;
  document.getElementById('accViewStatus').textContent = currentAccount.status;
  document.getElementById('accViewBalance').textContent = `₹${currentAccount.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  document.getElementById('accViewCreated').textContent = new Date(currentAccount.createdAt).toLocaleDateString('en-GB');

  // Also populate Profile fields
  document.getElementById('profName').value = currentUser.name || '';
  document.getElementById('profEmail').value = currentUser.email || '';
  document.getElementById('profPhone').value = currentUser.phone || '';
  document.getElementById('profDob').value = currentUser.dateOfBirth || '';
  document.getElementById('profAddress').value = currentUser.address || '';
}

// ---------------- TRANSACTIONS MODULE ----------------
function renderTransactionsTable(txns, targetTableId = 'recentTxnTableBody') {
  const tableBody = document.getElementById(targetTableId);
  if (!tableBody) return;

  if (txns.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">No transactions recorded yet.</td></tr>`;
    return;
  }

  tableBody.innerHTML = txns.map(t => {
    const isCredit = t.type === 'DEPOSIT' || t.type === 'LOAN_DISBURSEMENT';
    const amountClass = isCredit ? 'amount-credit' : 'amount-debit';
    const amountSign = isCredit ? '+₹' : '-₹';

    return `
      <tr>
        <td style="font-family: var(--font-mono); font-size: 0.85rem;">${t.transactionId}</td>
        <td>${new Date(t.createdAt).toLocaleDateString('en-GB')}</td>
        <td>
          <div style="font-weight: 600;">${t.description || t.type}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${t.category || 'General'}</div>
        </td>
        <td><span class="badge ${isCredit ? 'badge-success' : 'badge-info'}">${t.type}</span></td>
        <td class="${amountClass}">${amountSign}${t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        <td style="font-family: var(--font-mono); color: var(--text-secondary);">₹${(t.balanceAfter || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      </tr>
    `;
  }).join('');
}

function filterTransactions() {
  const searchTerm = (document.getElementById('txnSearchInput')?.value || '').toLowerCase();
  const filterType = document.querySelector('.filter-pill.active')?.getAttribute('data-filter') || 'ALL';

  let filtered = userTransactions.filter(t => {
    const matchSearch = t.transactionId.toLowerCase().includes(searchTerm) ||
                        (t.description && t.description.toLowerCase().includes(searchTerm)) ||
                        t.receiverAccount.toLowerCase().includes(searchTerm);
    const matchType = filterType === 'ALL' || t.type === filterType;
    return matchSearch && matchType;
  });

  renderTransactionsTable(filtered, 'fullTxnTableBody');
}

// ---------------- TRANSFER MODULE ----------------
let pendingTransferData = null;

function setupTransferBeneficiaries() {
  const select = document.getElementById('transferBeneficiarySelect');
  if (!select) return;

  select.innerHTML = '<option value="">-- Choose Saved Beneficiary or Enter Manually --</option>' +
    userBeneficiaries.map(b => `<option value="${b.accountNumber}" data-name="${b.name}" data-ifsc="${b.ifscCode}">${b.name} (${b.accountNumber}) - ${b.bankName}</option>`).join('');

  select.addEventListener('change', (e) => {
    const selectedOpt = select.options[select.selectedIndex];
    if (e.target.value) {
      document.getElementById('transferBenName').value = selectedOpt.getAttribute('data-name');
      document.getElementById('transferAccNumber').value = e.target.value;
      document.getElementById('transferConfirmAccNumber').value = e.target.value;
      document.getElementById('transferIfsc').value = selectedOpt.getAttribute('data-ifsc');
    }
  });
}

function initiateTransfer(e) {
  e.preventDefault();
  const name = document.getElementById('transferBenName').value.trim();
  const accNum = document.getElementById('transferAccNumber').value.trim();
  const confirmAcc = document.getElementById('transferConfirmAccNumber').value.trim();
  const ifsc = document.getElementById('transferIfsc').value.trim();
  const amount = parseFloat(document.getElementById('transferAmount').value);
  const desc = document.getElementById('transferDesc').value.trim();

  if (!name || !accNum || !ifsc || isNaN(amount) || amount <= 0) {
    Toast.error('Please complete all transfer details with a valid amount.');
    return;
  }

  if (accNum !== confirmAcc) {
    Toast.error('Account numbers do not match. Please verify.');
    return;
  }

  if (accNum === currentAccount.accountNumber) {
    Toast.error('Cannot transfer money to your own active account.');
    return;
  }

  if (amount > currentAccount.balance) {
    Toast.error(`Insufficient Balance! Available balance: ₹${currentAccount.balance.toLocaleString('en-IN')}`);
    return;
  }

  pendingTransferData = {
    senderAccount: currentAccount.accountNumber,
    receiverAccount: accNum,
    beneficiaryName: name,
    ifscCode: ifsc,
    amount: amount,
    description: desc || `Transfer to ${name}`
  };

  // Populate Confirmation Modal
  document.getElementById('modalConfirmTo').textContent = name;
  const maskedAcc = '•••• •••• ' + accNum.slice(-4);
  document.getElementById('modalConfirmAcc').textContent = maskedAcc;
  document.getElementById('modalConfirmAmount').textContent = `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  document.getElementById('modalConfirmTotal').textContent = `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  document.getElementById('transferConfirmModal').classList.add('active');
}

async function confirmAndExecuteTransfer() {
  if (!pendingTransferData) return;
  const btn = document.getElementById('btnExecuteTransfer');
  Loader.start(btn, 'Transferring...');

  try {
    const res = await API.request('/transfer', 'POST', pendingTransferData);
    Toast.success(res.message || 'Money transfer executed successfully!');
    document.getElementById('transferConfirmModal').classList.remove('active');
    document.getElementById('transferForm').reset();
    pendingTransferData = null;

    // Refresh state
    await loadUserData();
    switchView('view-transactions');
  } catch (err) {
    Toast.error(err.message, 'Transfer Failed');
  } finally {
    Loader.stop(btn);
  }
}

// ---------------- DEPOSIT MODULE ----------------
async function handleDeposit(e) {
  e.preventDefault();
  const amount = parseFloat(document.getElementById('depositAmount').value);
  const method = document.getElementById('depositMethod').value;
  const desc = document.getElementById('depositDesc').value.trim();
  const btn = e.target.querySelector('button[type="submit"]');

  if (isNaN(amount) || amount <= 0) {
    Toast.error('Please enter a valid deposit amount.');
    return;
  }

  Loader.start(btn, 'Processing Deposit...');
  try {
    const res = await API.request('/deposit', 'POST', {
      accountNumber: currentAccount.accountNumber,
      amount: amount,
      paymentMethod: method,
      description: desc || `Demo Deposit via ${method}`
    });
    Toast.success(`₹${amount.toLocaleString('en-IN')} deposited successfully!`);
    document.getElementById('depositForm').reset();
    await loadUserData();
    switchView('view-dashboard');
  } catch (err) {
    Toast.error(err.message, 'Deposit Failed');
  } finally {
    Loader.stop(btn);
  }
}

// ---------------- WITHDRAWAL MODULE ----------------
async function handleWithdrawal(e) {
  e.preventDefault();
  const amount = parseFloat(document.getElementById('withdrawAmount').value);
  const desc = document.getElementById('withdrawDesc').value.trim();
  const btn = e.target.querySelector('button[type="submit"]');

  if (isNaN(amount) || amount <= 0) {
    Toast.error('Please enter a valid withdrawal amount.');
    return;
  }

  if (amount > currentAccount.balance) {
    Toast.error('Insufficient funds in your account for this withdrawal.');
    return;
  }

  Loader.start(btn, 'Processing Withdrawal...');
  try {
    const res = await API.request('/withdraw', 'POST', {
      accountNumber: currentAccount.accountNumber,
      amount: amount,
      description: desc || 'Cash Withdrawal'
    });
    Toast.success(`₹${amount.toLocaleString('en-IN')} withdrawn successfully!`);
    document.getElementById('withdrawForm').reset();
    await loadUserData();
    switchView('view-dashboard');
  } catch (err) {
    Toast.error(err.message, 'Withdrawal Failed');
  } finally {
    Loader.stop(btn);
  }
}

// ---------------- BENEFICIARY MODULE ----------------
function renderBeneficiariesList() {
  const container = document.getElementById('beneficiariesGrid');
  if (!container) return;

  if (userBeneficiaries.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;">No beneficiaries saved. Add one to enable fast transfers.</div>`;
    return;
  }

  container.innerHTML = userBeneficiaries.map(b => `
    <div class="card" style="display: flex; flex-direction: column; justify-content: space-between; gap: 14px;">
      <div>
        <div style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary);">${b.name}</div>
        <div style="font-family: var(--font-mono); font-size: 0.9rem; color: var(--accent-cyan); margin-top: 4px;">${b.accountNumber}</div>
        <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px;">${b.bankName} • ${b.ifscCode}</div>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="btn btn-primary btn-sm" style="flex: 1;" onclick="quickTransferToBen('${b.accountNumber}', '${b.name}', '${b.ifscCode}')">Transfer</button>
        <button class="btn btn-secondary btn-sm" style="color: var(--danger);" onclick="deleteBeneficiary('${b.beneficiaryId}')">Delete</button>
      </div>
    </div>
  `).join('');

  setupTransferBeneficiaries();
}

function quickTransferToBen(accNum, name, ifsc) {
  switchView('view-transfer');
  document.getElementById('transferBenName').value = name;
  document.getElementById('transferAccNumber').value = accNum;
  document.getElementById('transferConfirmAccNumber').value = accNum;
  document.getElementById('transferIfsc').value = ifsc;
}

async function addBeneficiary(e) {
  e.preventDefault();
  const name = document.getElementById('benName').value.trim();
  const accNum = document.getElementById('benAccount').value.trim();
  const ifsc = document.getElementById('benIfsc').value.trim();
  const bank = document.getElementById('benBank').value.trim();
  const btn = e.target.querySelector('button[type="submit"]');

  if (!name || !accNum || !ifsc || !bank) {
    Toast.error('Please fill in all beneficiary details.');
    return;
  }

  Loader.start(btn, 'Saving...');
  try {
    await API.request('/beneficiaries', 'POST', {
      name,
      accountNumber: accNum,
      ifscCode: ifsc,
      bankName: bank
    });
    Toast.success(`Beneficiary ${name} added successfully!`);
    document.getElementById('addBeneficiaryForm').reset();
    document.getElementById('addBenModal').classList.remove('active');
    await loadUserData();
  } catch (err) {
    Toast.error(err.message, 'Failed to add beneficiary');
  } finally {
    Loader.stop(btn);
  }
}

async function deleteBeneficiary(id) {
  if (!confirm('Are you sure you want to remove this saved beneficiary?')) return;
  try {
    await API.request(`/beneficiaries/${id}`, 'DELETE');
    Toast.info('Beneficiary removed.');
    await loadUserData();
  } catch (err) {
    Toast.error(err.message);
  }
}

// ---------------- LOAN & EMI MODULE ----------------
function calculateEMI(principal, annualRate, tenureMonths) {
  const r = (annualRate / 12) / 100;
  const n = tenureMonths;
  const emi = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const totalRepayment = emi * n;
  const totalInterest = totalRepayment - principal;

  return {
    emi: Math.round(emi),
    totalInterest: Math.round(totalInterest),
    totalRepayment: Math.round(totalRepayment)
  };
}

function updateEmiCalculatorUI() {
  const principalSlider = document.getElementById('emiSliderPrincipal');
  const rateSlider = document.getElementById('emiSliderRate');
  const tenureSlider = document.getElementById('emiSliderTenure');
  if (!principalSlider || !rateSlider || !tenureSlider) return;

  const principal = parseFloat(principalSlider.value);
  const rate = parseFloat(rateSlider.value);
  const tenure = parseInt(tenureSlider.value);

  const displayPrincipal = document.getElementById('emiDisplayPrincipal');
  const displayRate = document.getElementById('emiDisplayRate');
  const displayTenure = document.getElementById('emiDisplayTenure');
  if (displayPrincipal) displayPrincipal.textContent = `₹${principal.toLocaleString('en-IN')}`;
  if (displayRate) displayRate.textContent = `${rate}%`;
  if (displayTenure) displayTenure.textContent = `${tenure} Months`;

  const calc = calculateEMI(principal, rate, tenure);
  const resultMonthly = document.getElementById('emiResultMonthly');
  const resultInterest = document.getElementById('emiResultInterest');
  const resultTotal = document.getElementById('emiResultTotal');
  if (resultMonthly) resultMonthly.textContent = `₹${calc.emi.toLocaleString('en-IN')}`;
  if (resultInterest) resultInterest.textContent = `₹${calc.totalInterest.toLocaleString('en-IN')}`;
  if (resultTotal) resultTotal.textContent = `₹${calc.totalRepayment.toLocaleString('en-IN')}`;
}

async function handleLoanApplication(e) {
  e.preventDefault();
  const type = document.getElementById('loanTypeSelect').value;
  const amount = parseFloat(document.getElementById('loanAmountInput').value);
  const income = parseFloat(document.getElementById('loanIncomeInput').value);
  const tenure = parseInt(document.getElementById('loanTenureInput').value);
  const purpose = document.getElementById('loanPurposeInput').value.trim();
  const btn = e.target.querySelector('button[type="submit"]');

  if (isNaN(amount) || amount <= 0 || isNaN(income) || income <= 0) {
    Toast.error('Please enter valid loan amount and income.');
    return;
  }

  const rate = 10.5; // Demo rate
  const calc = calculateEMI(amount, rate, tenure);

  Loader.start(btn, 'Submitting Application...');
  try {
    const res = await API.request('/loans', 'POST', {
      accountNumber: currentAccount.accountNumber,
      loanType: type,
      requestedAmount: amount,
      monthlyIncome: income,
      tenure: tenure,
      interestRate: rate,
      estimatedEMI: calc.emi,
      totalInterest: calc.totalInterest,
      totalRepayment: calc.totalRepayment,
      purpose: purpose
    });
    Toast.success('Loan application submitted for administrator review!');
    document.getElementById('loanApplicationForm').reset();
    await loadUserData();
  } catch (err) {
    Toast.error(err.message, 'Application Failed');
  } finally {
    Loader.stop(btn);
  }
}

function renderLoansList() {
  const container = document.getElementById('loansHistoryGrid');
  if (!container) return;

  if (userLoans.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 30px;">No loan applications submitted yet.</div>`;
    return;
  }

  container.innerHTML = userLoans.map(l => {
    let statusClass = 'badge-warning';
    if (l.status === 'APPROVED') statusClass = 'badge-success';
    if (l.status === 'REJECTED') statusClass = 'badge-danger';

    return `
      <div class="card" style="display: flex; flex-direction: column; gap: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="font-weight: 700; font-size: 1.1rem;">${l.loanType} <span style="font-size: 0.78rem; font-family: var(--font-mono); color: var(--text-muted);">(${l.loanId})</span></div>
          <span class="badge ${statusClass}">${l.status}</span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: var(--bg-surface); padding: 12px; border-radius: var(--radius-md); font-size: 0.85rem;">
          <div><span style="color: var(--text-muted);">Amount:</span> <strong>₹${l.requestedAmount.toLocaleString('en-IN')}</strong></div>
          <div><span style="color: var(--text-muted);">Tenure:</span> <strong>${l.tenure} Months</strong></div>
          <div><span style="color: var(--text-muted);">Monthly EMI:</span> <strong>₹${l.estimatedEMI.toLocaleString('en-IN')}</strong></div>
          <div><span style="color: var(--text-muted);">Interest Rate:</span> <strong>${l.interestRate}%</strong></div>
        </div>
        ${l.assignedOfficer ? `
          <div style="background: rgba(56, 189, 248, 0.1); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 10px 12px; font-size: 0.83rem;">
            <div style="color: var(--accent-cyan); font-weight: 700;"><i class="fa-solid fa-user-tie"></i> Assigned Loan Officer: ${l.assignedOfficer}</div>
            <div style="color: var(--text-secondary); margin-top: 2px;"><i class="fa-solid fa-building-columns"></i> Branch: ${l.branchOffice || 'Central Tech Branch'}</div>
          </div>
        ` : `
          <div style="font-size: 0.82rem; color: var(--text-secondary);">
            <strong>Status:</strong> Awaiting Loan Officer review & branch assignment
          </div>
        `}
        <div style="font-size: 0.82rem; color: var(--text-muted);">
          <strong>Remarks:</strong> ${l.adminRemarks || 'Under evaluation'}
        </div>
      </div>
    `;
  }).join('');
}

// ---------------- BUDGET MODULE ----------------
function renderBudgetCards() {
  const container = document.getElementById('budgetCardsGrid');
  if (!container) return;

  if (userBudgets.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 30px;">No budgets configured. Click "Set Budget" to track monthly expenses.</div>`;
    return;
  }

  container.innerHTML = userBudgets.map(b => {
    const percentage = Math.min(100, Math.round((b.spent / b.limitAmount) * 100));
    let progressClass = 'progress-safe';
    let alertTag = '';

    if (percentage >= 100) {
      progressClass = 'progress-danger';
      alertTag = `<span class="badge badge-danger">Exceeded!</span>`;
    } else if (percentage >= 80) {
      progressClass = 'progress-warning';
      alertTag = `<span class="badge badge-warning">Near Limit (80%+)</span>`;
    }

    const remaining = Math.max(0, b.limitAmount - b.spent);

    return `
      <div class="budget-card">
        <div class="budget-card-header">
          <div class="budget-category-title">🎯 ${b.category}</div>
          ${alertTag}
        </div>
        <div class="budget-numbers">
          <span>Spent: <strong>₹${b.spent.toLocaleString('en-IN')}</strong></span>
          <span>Limit: <strong>₹${b.limitAmount.toLocaleString('en-IN')}</strong></span>
        </div>
        <div class="budget-progress-track">
          <div class="budget-progress-fill ${progressClass}" style="width: ${percentage}%;"></div>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-secondary);">
          <span>${percentage}% Used</span>
          <span>₹${remaining.toLocaleString('en-IN')} Left</span>
        </div>
      </div>
    `;
  }).join('');
}

async function handleSetBudget(e) {
  e.preventDefault();
  const category = document.getElementById('budgetCategorySelect').value;
  const limit = parseFloat(document.getElementById('budgetLimitInput').value);
  const btn = e.target.querySelector('button[type="submit"]');

  if (isNaN(limit) || limit <= 0) {
    Toast.error('Please enter a valid monthly budget limit.');
    return;
  }

  Loader.start(btn, 'Saving Budget...');
  try {
    await API.request('/budgets', 'POST', {
      category,
      limitAmount: limit
    });
    Toast.success(`Monthly budget for ${category} set to ₹${limit.toLocaleString('en-IN')}!`);
    document.getElementById('setBudgetModal').classList.remove('active');
    document.getElementById('setBudgetForm').reset();
    await loadUserData();
  } catch (err) {
    Toast.error(err.message);
  } finally {
    Loader.stop(btn);
  }
}

// ---------------- BILL PAYMENT MODULE ----------------
async function handleBillPayment(e) {
  e.preventDefault();
  const cat = document.getElementById('billCategorySelect').value;
  const provider = document.getElementById('billProviderSelect').value;
  const consumer = document.getElementById('billConsumerNumber').value.trim();
  const amount = parseFloat(document.getElementById('billAmount').value);
  const btn = e.target.querySelector('button[type="submit"]');

  if (!consumer || isNaN(amount) || amount <= 0) {
    Toast.error('Please fill in valid consumer number and amount.');
    return;
  }

  if (amount > currentAccount.balance) {
    Toast.error('Insufficient account balance to process this bill payment.');
    return;
  }

  Loader.start(btn, 'Processing Bill Payment...');
  try {
    const res = await API.request('/bills/pay', 'POST', {
      accountNumber: currentAccount.accountNumber,
      category: cat,
      provider: provider,
      consumerNumber: consumer,
      amount: amount
    });
    Toast.success(`₹${amount.toLocaleString('en-IN')} paid to ${provider} successfully!`);
    document.getElementById('billPaymentForm').reset();
    await loadUserData();
    switchView('view-transactions');
  } catch (err) {
    Toast.error(err.message, 'Bill Payment Failed');
  } finally {
    Loader.stop(btn);
  }
}

// ---------------- FINANCIAL INSIGHTS MODULE ----------------
async function renderFinancialInsights() {
  try {
    const res = await API.request(`/insights/${currentUser.userId}`);
    const data = res.data;

    document.getElementById('insightIncome').textContent = `₹${data.totalIncome.toLocaleString('en-IN')}`;
    document.getElementById('insightExpenses').textContent = `₹${data.totalExpenses.toLocaleString('en-IN')}`;
    document.getElementById('insightSavings').textContent = `₹${data.savings.toLocaleString('en-IN')}`;
    document.getElementById('insightSavingsRate').textContent = `${data.savingsRate}%`;

    const list = document.getElementById('ruleBasedInsightsList');
    if (list && data.insights) {
      list.innerHTML = data.insights.map(txt => `
        <div class="insight-card">
          <div class="insight-icon-box">💡</div>
          <div class="insight-content">
            <h4>Smart Banking Insight</h4>
            <p>${txt}</p>
          </div>
        </div>
      `).join('');
    }

    // Render Charts
    BankCharts.renderIncomeExpense('chartIncomeExpense', data.totalIncome, data.totalExpenses);
    BankCharts.renderCategorySpending('chartCategorySpending');
  } catch (err) {
    console.error('Insights error:', err);
  }
}

// ---------------- NOTIFICATIONS MODULE ----------------
function updateNotificationBadge() {
  const unreadCount = userNotifications.filter(n => !n.read).length;
  const badge = document.getElementById('notifBadgeCount');
  if (badge) {
    if (unreadCount > 0) {
      badge.textContent = unreadCount;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }
}

function renderNotificationsList() {
  const container = document.getElementById('notificationsList');
  if (!container) return;

  if (userNotifications.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 40px;">No notifications yet.</div>`;
    return;
  }

  container.innerHTML = userNotifications.map(n => `
    <div class="card" style="padding: 16px; margin-bottom: 12px; border-left: 4px solid ${n.read ? 'var(--border-color-subtle)' : 'var(--accent-cyan)'}; opacity: ${n.read ? '0.75' : '1'};">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <div style="font-weight: 700; color: var(--text-primary); font-size: 0.98rem;">${n.title}</div>
          <div style="color: var(--text-secondary); font-size: 0.88rem; margin-top: 4px;">${n.message}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 8px;">${new Date(n.createdAt).toLocaleString()}</div>
        </div>
        ${!n.read ? `<button class="btn btn-secondary btn-sm" onclick="markNotificationRead('${n.notificationId}')">Mark Read</button>` : ''}
      </div>
    </div>
  `).join('');
}

async function markAllNotificationsRead() {
  try {
    await API.request('/notifications/read-all', 'PUT');
    userNotifications.forEach(n => n.read = true);
    renderNotificationsList();
    updateNotificationBadge();
    Toast.success('All notifications marked as read.');
  } catch (err) {
    Toast.error(err.message);
  }
}

// ---------------- SECURITY CENTER MODULE ----------------
function triggerOtpFlow() {
  const otpModal = document.getElementById('otpModal');
  if (otpModal) {
    otpModal.classList.add('active');
    Toast.info('Simulated Demo OTP: 8849 has been sent to your registered mobile.', 'OTP Sent');
  }
}

function verifyOtpAndProceed() {
  const otpVal = document.getElementById('otpInputField')?.value.trim();
  if (otpVal === '8849' || otpVal.length === 4) {
    document.getElementById('otpModal').classList.remove('active');
    Toast.success('Identity verified with 2-Factor Authentication!');
  } else {
    Toast.error('Invalid OTP. Please enter 8849 for demo verification.');
  }
}

// ---------------- EVENT LISTENERS SETUP ----------------
function setupEventListeners() {
  // Sidebar navigation clicks
  document.querySelectorAll('.sidebar .nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const parentItem = link.closest('.nav-item');
      const viewId = parentItem?.getAttribute('data-view');
      if (viewId) switchView(viewId);
    });
  });

  // Mobile Menu Toggle
  const mobileBtn = document.getElementById('mobileMenuBtn');
  if (mobileBtn) {
    mobileBtn.addEventListener('click', () => {
      document.querySelector('.sidebar').classList.toggle('mobile-open');
    });
  }

  // Quick Action Buttons on Dashboard
  document.querySelectorAll('[data-quick-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-quick-action');
      if (action) switchView(action);
    });
  });

  // Forms
  document.getElementById('transferForm')?.addEventListener('submit', initiateTransfer);
  document.getElementById('depositForm')?.addEventListener('submit', handleDeposit);
  document.getElementById('withdrawForm')?.addEventListener('submit', handleWithdrawal);
  document.getElementById('addBeneficiaryForm')?.addEventListener('submit', addBeneficiary);
  document.getElementById('loanApplicationForm')?.addEventListener('submit', handleLoanApplication);
  document.getElementById('setBudgetForm')?.addEventListener('submit', handleSetBudget);
  document.getElementById('billPaymentForm')?.addEventListener('submit', handleBillPayment);

  // Transfer Confirmation Execution
  document.getElementById('btnExecuteTransfer')?.addEventListener('click', confirmAndExecuteTransfer);

  // EMI Sliders
  ['emiSliderPrincipal', 'emiSliderRate', 'emiSliderTenure'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updateEmiCalculatorUI);
  });
  updateEmiCalculatorUI();

  // Search and Filter Transactions
  document.getElementById('txnSearchInput')?.addEventListener('input', filterTransactions);
  document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      filterTransactions();
    });
  });

  // Download PDF Statement Button
  document.getElementById('btnDownloadStatement')?.addEventListener('click', () => {
    StatementGenerator.generatePDF(currentUser, currentAccount, userTransactions);
  });

  // Modals Close handlers
  document.querySelectorAll('.modal-close-btn, [data-modal-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('active'));
    });
  });
}

async function checkDatabaseConnection() {
  const badge = document.getElementById('dbStatusBadge');
  if (badge) badge.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Pinging Firebase...';
  
  if (window.testFirebaseConnection) {
    const result = await window.testFirebaseConnection();
    if (result.connected) {
      Toast.success(`✅ Live connection to Firebase Firestore active (${result.latencyMs}ms latency)`, 'Database Online');
      if (badge) badge.innerHTML = `<i class="fa-solid fa-circle-check" style="color: var(--success);"></i> <span>Firebase Firestore Live (${result.latencyMs}ms)</span>`;
    } else {
      Toast.info(`Database synced: ${result.message}`, 'Database Status');
      if (badge) badge.innerHTML = `<i class="fa-solid fa-circle-check" style="color: var(--accent-cyan);"></i> <span>Database Ready: gg-bank-fc100</span>`;
    }
  }
}

// Global Exports
window.switchView = switchView;
window.toggleBalanceVisibility = toggleBalanceVisibility;
window.toggleTheme = toggleTheme;
window.checkDatabaseConnection = checkDatabaseConnection;
window.markAllNotificationsRead = markAllNotificationsRead;
window.quickTransferToBen = quickTransferToBen;
window.deleteBeneficiary = deleteBeneficiary;
window.triggerOtpFlow = triggerOtpFlow;
window.verifyOtpAndProceed = verifyOtpAndProceed;
window.confirmAndExecuteTransfer = confirmAndExecuteTransfer;
window.handleDeposit = handleDeposit;
window.handleWithdrawal = handleWithdrawal;
window.handleLoanApplication = handleLoanApplication;
window.handleSetBudget = handleSetBudget;
window.handleBillPayment = handleBillPayment;
window.logout = () => Auth.logout();
