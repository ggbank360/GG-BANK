/**
 * GG BANK - Deposit & Fund Addition Controller (deposit.js)
 * "Secure Banking. Smarter Future."
 * Handles:
 * 1. Receiving funds via Money Transfer from another person
 * 2. Cash Deposit at Bank Branch / Admin Treasury Credits
 * 3. Instant Payment Gateway top-up with real-time balance recalculation
 */

let currentAccount = null;
let currentUser = null;
let pendingDeposit = null;
let isSubmitting = false;

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = Auth.requireCustomer();
  if (!currentUser) return;

  // Set customer names
  document.querySelectorAll('.customer-name-display').forEach(el => {
    el.textContent = currentUser.name || 'Customer';
  });
  const initials = currentUser.name ? currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'CU';
  document.querySelectorAll('.customer-avatar-display').forEach(el => {
    el.textContent = initials;
  });

  try {
    const accRes = await API.request(`/accounts/user/${currentUser.userId}`);
    currentAccount = accRes.data || { 
      accountNumber: currentUser.accountNumber || '10018849201', 
      balance: 10000.00, 
      accountType: 'Savings' 
    };

    updateAllDisplays();
    setupForms();
    await loadRecentAdminDeposits();

  } catch (err) {
    console.error('Deposit init error:', err);
    Utils.showToast(err.message || 'Error loading account details', 'error');
  }
});

function updateAllDisplays() {
  if (!currentAccount) return;

  const accNum = currentAccount.accountNumber || '10018849201';
  const curBal = Number(currentAccount.balance) || 0;
  const ifsc = currentAccount.ifscCode || 'GGBN0001234';

  // Balances
  const balEl = document.getElementById('depCurrentBalance');
  if (balEl) balEl.textContent = Utils.formatCurrency(curBal);

  const prevBalEl = document.getElementById('depCurrentBalancePreview');
  if (prevBalEl) prevBalEl.textContent = Utils.formatCurrency(curBal);

  // Pills and Shareable values
  const accPill = document.getElementById('accPillVal');
  if (accPill) accPill.textContent = accNum;

  const ifscPill = document.getElementById('ifscPillVal');
  if (ifscPill) ifscPill.textContent = ifsc;

  const shareAcc = document.getElementById('shareAccNum');
  if (shareAcc) shareAcc.textContent = Utils.formatAccountNumber(accNum);

  const shareIfsc = document.getElementById('shareIfsc');
  if (shareIfsc) shareIfsc.textContent = ifsc;

  const shareUpi = document.getElementById('shareUpi');
  if (shareUpi) shareUpi.textContent = `${accNum}@ggbank`;

  recalcGatewayPreview();
}

function recalcGatewayPreview() {
  const amountInput = document.getElementById('depositAmount');
  const previewAmountEl = document.getElementById('depAmountPreview');
  const previewNewBalEl = document.getElementById('depNewBalancePreview');

  const curBal = currentAccount ? Number(currentAccount.balance) || 0 : 0;
  const depositVal = amountInput ? (parseFloat(amountInput.value) || 0) : 0;

  if (previewAmountEl) previewAmountEl.textContent = `+${Utils.formatCurrency(depositVal)}`;
  if (previewNewBalEl) previewNewBalEl.textContent = Utils.formatCurrency(curBal + depositVal);
}

function setDepositAmount(amount) {
  const amountInput = document.getElementById('depositAmount');
  if (amountInput) {
    const curVal = parseFloat(amountInput.value) || 0;
    amountInput.value = curVal + amount;
    recalcGatewayPreview();
  }
}

function switchDepositTab(tabName) {
  ['transfer', 'admin', 'gateway'].forEach(t => {
    const btn = document.getElementById(`tabBtn${t.charAt(0).toUpperCase() + t.slice(1)}`);
    const content = document.getElementById(`tabContent${t.charAt(0).toUpperCase() + t.slice(1)}`);
    if (btn) btn.classList.toggle('active', t === tabName);
    if (content) content.style.display = (t === tabName) ? 'block' : 'none';
  });

  if (tabName === 'admin') {
    loadRecentAdminDeposits();
  }
}

function copyText(elementId, label = 'Information') {
  const el = document.getElementById(elementId);
  if (!el) return;
  const text = el.textContent.replace(/\s+/g, '');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      Utils.showToast(`${label} copied to clipboard: ${text}`, 'success');
    }).catch(() => {
      fallbackCopy(text, label);
    });
  } else {
    fallbackCopy(text, label);
  }
}

function fallbackCopy(text, label) {
  const ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
  Utils.showToast(`${label} copied to clipboard!`, 'success');
}

function setupForms() {
  const amountInput = document.getElementById('depositAmount');
  if (amountInput) {
    ['input', 'change', 'keyup', 'paste'].forEach(ev => {
      amountInput.addEventListener(ev, recalcGatewayPreview);
    });
  }

  // 1. SIMULATE INCOMING TRANSFER FORM (Method 1)
  const simTransferForm = document.getElementById('simulateTransferForm');
  if (simTransferForm) {
    simTransferForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const sender = document.getElementById('simSenderName').value.trim() || 'External Sender';
      const amount = parseFloat(document.getElementById('simAmount').value);
      const btn = document.getElementById('btnSimulateTransfer');

      if (isNaN(amount) || amount <= 0) {
        Utils.showToast('Please specify a valid transfer amount.', 'warning');
        return;
      }

      Utils.setLoading(btn, true, 'Processing Transfer...');
      try {
        const accNum = currentAccount ? currentAccount.accountNumber : '10018849201';
        
        // Execute credit into account via API deposit with Sender details
        const res = await API.request('/deposit', 'POST', {
          accountNumber: accNum,
          amount: amount,
          paymentMethod: 'P2P Interbank Transfer',
          description: `Incoming Transfer from ${sender} (IMPS Credit)`
        });

        if (currentAccount) {
          currentAccount.balance = Number(currentAccount.balance) + amount;
          localStorage.setItem('gg_current_account', JSON.stringify(currentAccount));
        }

        Utils.showToast(`Received ₹${amount.toLocaleString('en-IN')} from ${sender}!`, 'success', 'Transfer Received');
        updateAllDisplays();
        await loadRecentAdminDeposits();

      } catch (err) {
        Utils.showToast(err.message || 'Transfer simulation failed', 'error');
      } finally {
        Utils.setLoading(btn, false, '<i class="fa-solid fa-paper-plane"></i> Send to My Account');
      }
    });
  }

  // 2. SIMULATE ADMIN / BRANCH DEPOSIT FORM (Method 2)
  const simAdminForm = document.getElementById('simulateAdminDepositForm');
  if (simAdminForm) {
    simAdminForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const channel = document.getElementById('simAdminChannel').value;
      const amount = parseFloat(document.getElementById('simAdminAmount').value);
      const remarks = document.getElementById('simAdminRemarks').value.trim() || 'Branch Cash Counter Deposit';
      const btn = document.getElementById('btnSimulateAdminDeposit');

      if (isNaN(amount) || amount <= 0) {
        Utils.showToast('Please specify a valid deposit amount.', 'warning');
        return;
      }

      Utils.setLoading(btn, true, 'Crediting Treasury...');
      try {
        const accNum = currentAccount ? currentAccount.accountNumber : '10018849201';

        await API.request('/admin/deposits/credit', 'POST', {
          accountNumber: accNum,
          amount: amount,
          paymentMethod: channel,
          description: `${remarks} (Admin Credit)`
        });

        if (currentAccount) {
          currentAccount.balance = Number(currentAccount.balance) + amount;
          localStorage.setItem('gg_current_account', JSON.stringify(currentAccount));
        }

        Utils.showToast(`Branch cash credit of ₹${amount.toLocaleString('en-IN')} approved by Administrator!`, 'success', 'Treasury Deposit Complete');
        updateAllDisplays();
        await loadRecentAdminDeposits();

      } catch (err) {
        Utils.showToast(err.message || 'Admin deposit failed', 'error');
      } finally {
        Utils.setLoading(btn, false, '<i class="fa-solid fa-circle-check"></i> Execute Admin Deposit');
      }
    });
  }

  // 3. PAYMENT GATEWAY FORM (Method 3)
  const gatewayForm = document.getElementById('depositFundsForm');
  const modal = document.getElementById('depositConfirmModal');
  const confirmBtn = document.getElementById('btnConfirmDeposit');

  if (gatewayForm) {
    gatewayForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const amount = parseFloat(amountInput.value);
      const method = document.getElementById('depositMethod').value;
      const desc = document.getElementById('depositDesc').value.trim();

      if (isNaN(amount) || amount <= 0) {
        Utils.showToast('Please enter a valid deposit amount greater than zero.', 'warning', 'Invalid Amount');
        return;
      }

      pendingDeposit = {
        accountNumber: currentAccount ? currentAccount.accountNumber : '10018849201',
        amount: amount,
        paymentMethod: method,
        description: desc || `Self-Deposit via ${method}`
      };

      const curBal = currentAccount ? Number(currentAccount.balance) || 0 : 0;
      document.getElementById('modalDepAmount').textContent = `+${Utils.formatCurrency(amount)}`;
      document.getElementById('modalDepMethod').textContent = method;
      document.getElementById('modalDepAccount').textContent = Utils.formatAccountNumber(pendingDeposit.accountNumber);
      document.getElementById('modalDepNewBal').textContent = Utils.formatCurrency(curBal + amount);

      modal.classList.add('active');
    });
  }

  if (confirmBtn) {
    confirmBtn.addEventListener('click', async () => {
      if (!pendingDeposit) return;
      if (isSubmitting) return;

      isSubmitting = true;
      confirmBtn.disabled = true;
      Utils.setLoading(confirmBtn, true, 'Authorizing Gateway...');

      try {
        const res = await API.request('/deposit', 'POST', pendingDeposit);
        const txn = res.data || {
          transactionId: 'TXN-2026-' + Math.floor(100000 + Math.random() * 900000),
          amount: pendingDeposit.amount
        };

        if (currentAccount) {
          currentAccount.balance = Number(currentAccount.balance) + pendingDeposit.amount;
          localStorage.setItem('gg_current_account', JSON.stringify(currentAccount));
        }

        Utils.showToast('Gateway deposit successfully credited to your account!', 'success', 'Transaction Successful');
        modal.classList.remove('active');
        showDepositSuccess(txn);
        updateAllDisplays();

      } catch (err) {
        Utils.showToast(err.message || 'Deposit gateway processing failed', 'error');
      } finally {
        isSubmitting = false;
        confirmBtn.disabled = false;
        Utils.setLoading(confirmBtn, false, 'Confirm & Deposit');
      }
    });
  }

  // Close modals
  document.querySelectorAll('[data-modal-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      modal.classList.remove('active');
    });
  });
}

async function loadRecentAdminDeposits() {
  const container = document.getElementById('adminDepositsListContainer');
  if (!container || !currentAccount) return;

  try {
    const txns = (window.API ? window.API.getMock('gg_transactions') : [])
      .filter(t => t.receiverAccount === currentAccount.accountNumber && (t.type === 'DEPOSIT' || t.category === 'Admin Deposit' || t.type === 'TRANSFER'))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 6);

    if (txns.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; color: var(--text-secondary); padding: 18px; font-size: 0.85rem;">
          No incoming deposit or credit records found for this account yet.
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="table-responsive">
        <table class="data-table" style="font-size: 0.85rem;">
          <thead>
            <tr>
              <th>Txn Reference</th>
              <th>Date &amp; Time</th>
              <th>Channel / Source</th>
              <th>Description</th>
              <th>Credit Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${txns.map(t => `
              <tr>
                <td><strong style="font-family: var(--font-mono, monospace); color: var(--accent);">${t.transactionId}</strong></td>
                <td style="color: var(--text-secondary);">${new Date(t.createdAt).toLocaleString()}</td>
                <td><span class="badge badge-info" style="font-size: 0.72rem;">${t.type}</span></td>
                <td>${t.description || 'Deposit Credit'}</td>
                <td style="font-family: var(--font-mono, monospace); font-weight: 700; color: var(--success); font-size: 0.95rem;">
                  +₹${(t.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td><span class="badge badge-success"><i class="fa-solid fa-check"></i> CREDITED</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

  } catch (err) {
    container.innerHTML = `
      <div style="text-align: center; color: var(--text-secondary); padding: 12px; font-size: 0.82rem;">
        Unable to load recent deposits list.
      </div>
    `;
  }
}

function showDepositSuccess(txn) {
  document.getElementById('depositFormCard').style.display = 'none';
  const successCard = document.getElementById('depositSuccessScreen');
  if (!successCard) return;

  document.getElementById('depSuccessAmount').textContent = `+${Utils.formatCurrency(txn.amount)}`;
  document.getElementById('depSuccessTxnId').textContent = txn.transactionId;
  document.getElementById('depSuccessAccount').textContent = Utils.formatAccountNumber(currentAccount ? currentAccount.accountNumber : '10018849201');
  document.getElementById('depSuccessNewBal').textContent = Utils.formatCurrency(currentAccount ? currentAccount.balance : 0);

  successCard.style.display = 'block';
}

function resetDepositForm() {
  document.getElementById('depositSuccessScreen').style.display = 'none';
  document.getElementById('depositFormCard').style.display = 'block';
  document.getElementById('depositFundsForm').reset();
  recalcGatewayPreview();
}

window.switchDepositTab = switchDepositTab;
window.copyText = copyText;
window.setDepositAmount = setDepositAmount;
window.resetDepositForm = resetDepositForm;
