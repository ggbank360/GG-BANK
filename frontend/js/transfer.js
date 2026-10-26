/**
 * GG BANK - Universal Fund Transfer Controller (transfer.js)
 * Supports both Instant UPI ID Transfer and 12-Digit Account / IFSC Transfer
 */

let currentAccount = null;
let savedBeneficiaries = [];
let pendingTransfer = null;
let currentTransferMode = 'UPI'; // 'UPI' or 'ACCOUNT'
let verifiedPayeeName = '';

document.addEventListener('DOMContentLoaded', async () => {
  const user = Auth.requireCustomer();
  if (!user) return;

  document.querySelectorAll('.customer-name-display').forEach(el => el.textContent = user.name);

  try {
    const accRes = await API.request(`/accounts/user/${user.userId}`);
    currentAccount = accRes.data || { 
      accountId: 'acc-' + user.userId,
      accountNumber: '100188492019', 
      balance: 65450.00,
      upiId: (user.email ? user.email.split('@')[0] : 'user') + '@ggbank'
    };

    // Load active UPI ID from user / account
    loadMyUpiId(user, currentAccount);

    const benRes = await API.request('/beneficiaries');
    savedBeneficiaries = benRes.data || [];

    setupBeneficiariesDropdown();
    setupTransferForms();
    updateLiveCalculations();

    // Auto-populate from URL query params (from QR scanner or link)
    const urlParams = new URLSearchParams(window.location.search);
    const targetTo = urlParams.get('to') || urlParams.get('account') || urlParams.get('upi') || urlParams.get('email');
    const targetName = urlParams.get('name');
    const targetAmount = urlParams.get('amount');
    const targetIfsc = urlParams.get('ifsc');

    if (targetTo) {
      if (targetTo.includes('@')) {
        switchTransferMode('UPI');
        const upiInp = document.getElementById('transferUpiId');
        if (upiInp) upiInp.value = targetTo;
        if (targetName) {
          const nameInp = document.getElementById('transferUpiPayeeName');
          if (nameInp) nameInp.value = decodeURIComponent(targetName);
        }
        if (targetAmount) {
          const amtInp = document.getElementById('transferUpiAmount');
          if (amtInp) amtInp.value = targetAmount;
        }
        verifyRecipientUpi();
      } else {
        switchTransferMode('ACCOUNT');
        const accInp = document.getElementById('transferAccNumber');
        const confInp = document.getElementById('transferConfirmAccNumber');
        if (accInp) accInp.value = targetTo;
        if (confInp) confInp.value = targetTo;
        if (targetName) {
          const nameInp = document.getElementById('transferBenName');
          if (nameInp) nameInp.value = decodeURIComponent(targetName);
        }
        if (targetIfsc) {
          const ifscInp = document.getElementById('transferIfsc');
          if (ifscInp) ifscInp.value = targetIfsc;
        }
        if (targetAmount) {
          const amtInp = document.getElementById('transferAmount');
          if (amtInp) amtInp.value = targetAmount;
        }
      }
      updateLiveCalculations();
    }

  } catch (err) {
    Utils.showToast(err.message, 'error');
  }
});

function loadMyUpiId(user, account) {
  const customHandle = localStorage.getItem(`gg_custom_upi_${user.userId}`) || 
                       (account.upiId || ((user.email ? user.email.split('@')[0] : 'customer') + '@ggbank'));
  
  const myUpiEl = document.getElementById('myActiveUpiId');
  if (myUpiEl) myUpiEl.textContent = customHandle;

  const myAccEl = document.getElementById('myLinkedAccNum');
  if (myAccEl && account.accountNumber) {
    const last4 = account.accountNumber.slice(-4);
    myAccEl.textContent = `100188••••${last4}`;
  }
}

function copyMyUpiId() {
  const myUpiEl = document.getElementById('myActiveUpiId');
  if (myUpiEl) {
    const text = myUpiEl.textContent.trim();
    navigator.clipboard.writeText(text).then(() => {
      Utils.showToast(`UPI ID ${text} copied to clipboard!`, 'success');
    }).catch(() => {
      Utils.showToast('Copied to clipboard!', 'info');
    });
  }
}

function switchTransferMode(mode) {
  currentTransferMode = mode;
  const tabUpi = document.getElementById('tabBtnUpi');
  const tabAcc = document.getElementById('tabBtnAccount');
  const formUpi = document.getElementById('upiTransferForm');
  const formAcc = document.getElementById('moneyTransferForm');

  if (mode === 'UPI') {
    tabUpi?.classList.add('active');
    tabAcc?.classList.remove('active');
    if (formUpi) formUpi.style.display = 'block';
    if (formAcc) formAcc.style.display = 'none';
  } else {
    tabAcc?.classList.add('active');
    tabUpi?.classList.remove('active');
    if (formAcc) formAcc.style.display = 'block';
    if (formUpi) formUpi.style.display = 'none';
  }

  updateLiveCalculations();
}

function appendUpiSuffix(suffix) {
  const input = document.getElementById('transferUpiId');
  if (!input) return;
  let val = input.value.trim();
  if (val.includes('@')) {
    val = val.split('@')[0];
  }
  input.value = (val || 'payee') + suffix;
  onUpiInputChange();
  verifyRecipientUpi();
}

function onUpiInputChange() {
  const badge = document.getElementById('upiVerifiedBadge');
  if (badge) badge.style.display = 'none';
  verifiedPayeeName = '';
}

function verifyRecipientUpi() {
  const input = document.getElementById('transferUpiId');
  const payeeInput = document.getElementById('transferUpiPayeeName');
  const badge = document.getElementById('upiVerifiedBadge');
  const badgeText = document.getElementById('upiVerifiedNameText');
  const upiId = (input?.value || '').trim().toLowerCase();

  if (!upiId || !upiId.includes('@')) {
    Utils.showToast('Please enter a valid UPI ID (e.g. name@okaxis or 9876543210@upi)', 'warning');
    input?.focus();
    return;
  }

  // Check if internal GG Bank user
  const users = API ? API.getMock('gg_users') : [];
  const handlePart = upiId.split('@')[0];
  const matchedUser = users.find(u => 
    (u.email && u.email.toLowerCase().startsWith(handlePart)) ||
    (u.phone && u.phone.includes(handlePart)) ||
    (u.userId && u.userId.includes(handlePart))
  );

  if (matchedUser) {
    verifiedPayeeName = matchedUser.name;
    if (payeeInput) payeeInput.value = matchedUser.name;
    if (badgeText) badgeText.textContent = `Verified: ${matchedUser.name}`;
    if (badge) badge.style.display = 'inline-flex';
    Utils.showToast(`UPI ID verified for ${matchedUser.name} (GG Bank Account Holder)`, 'success');
  } else {
    // Standard VPA Resolution simulation
    const simulatedName = handlePart.replace(/[^a-zA-Z]/g, ' ')
      .trim()
      .split(' ')
      .filter(Boolean)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ') || 'Authorized Payee';

    verifiedPayeeName = simulatedName;
    if (payeeInput && !payeeInput.value) payeeInput.value = simulatedName;
    if (badgeText) badgeText.textContent = `Verified: ${simulatedName}`;
    if (badge) badge.style.display = 'inline-flex';
    Utils.showToast(`Verified UPI VPA: ${simulatedName}`, 'success');
  }
}

function setQuickAmount(amt) {
  if (currentTransferMode === 'UPI') {
    const input = document.getElementById('transferUpiAmount');
    if (input) {
      const current = parseFloat(input.value) || 0;
      input.value = current + amt;
      updateLiveCalculations();
    }
  } else {
    const input = document.getElementById('transferAmount');
    if (input) {
      const current = parseFloat(input.value) || 0;
      input.value = current + amt;
      updateLiveCalculations();
    }
  }
}

function updateLiveCalculations() {
  const currentBal = currentAccount ? parseFloat(currentAccount.balance || 0) : 0;
  let transferAmt = 0;

  if (currentTransferMode === 'UPI') {
    transferAmt = parseFloat(document.getElementById('transferUpiAmount')?.value) || 0;
    const availEl = document.getElementById('bpAvailableBal');
    const debitEl = document.getElementById('bpDebitAmount');
    const remEl = document.getElementById('bpRemainingBal');

    if (availEl) availEl.textContent = Utils.formatCurrency(currentBal);
    if (debitEl) debitEl.textContent = `-${Utils.formatCurrency(transferAmt)}`;
    if (remEl) {
      const remaining = currentBal - transferAmt;
      remEl.textContent = Utils.formatCurrency(Math.max(0, remaining));
      remEl.style.color = remaining < 0 ? 'var(--danger)' : 'var(--accent-cyan)';
    }
  } else {
    transferAmt = parseFloat(document.getElementById('transferAmount')?.value) || 0;
    const availEl = document.getElementById('bpAccAvailableBal');
    const debitEl = document.getElementById('bpAccDebitAmount');
    const remEl = document.getElementById('bpAccRemainingBal');

    if (availEl) availEl.textContent = Utils.formatCurrency(currentBal);
    if (debitEl) debitEl.textContent = `-${Utils.formatCurrency(transferAmt)}`;
    if (remEl) {
      const remaining = currentBal - transferAmt;
      remEl.textContent = Utils.formatCurrency(Math.max(0, remaining));
      remEl.style.color = remaining < 0 ? 'var(--danger)' : 'var(--accent-cyan)';
    }
  }
}

function setupBeneficiariesDropdown() {
  const select = document.getElementById('transferBeneficiarySelect');
  if (!select) return;

  select.innerHTML = '<option value="">-- Choose Saved Beneficiary or Enter Manually --</option>' +
    savedBeneficiaries.map(b => `<option value="${b.accountNumber}" data-name="${b.name}" data-ifsc="${b.ifscCode}">${b.name} (${Utils.formatAccountNumber(b.accountNumber)}) - ${b.bankName || 'GG Bank'}</option>`).join('');

  select.addEventListener('change', (e) => {
    const opt = select.options[select.selectedIndex];
    if (e.target.value) {
      document.getElementById('transferBenName').value = opt.getAttribute('data-name');
      document.getElementById('transferAccNumber').value = e.target.value;
      document.getElementById('transferConfirmAccNumber').value = e.target.value;
      document.getElementById('transferIfsc').value = opt.getAttribute('data-ifsc');
    }
  });
}

function setupTransferForms() {
  const upiForm = document.getElementById('upiTransferForm');
  const accForm = document.getElementById('moneyTransferForm');
  const modal = document.getElementById('transferConfirmModal');
  const confirmBtn = document.getElementById('btnExecuteTransfer');

  // 1. UPI Transfer Form Submit
  if (upiForm) {
    upiForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const upiId = document.getElementById('transferUpiId').value.trim().toLowerCase();
      const name = document.getElementById('transferUpiPayeeName').value.trim() || verifiedPayeeName || 'UPI Payee';
      const amount = parseFloat(document.getElementById('transferUpiAmount').value);
      const desc = document.getElementById('transferUpiDesc').value.trim();

      if (!upiId || !upiId.includes('@')) {
        Utils.showToast('Please enter a valid recipient UPI ID (e.g. user@okaxis).', 'error');
        document.getElementById('transferUpiId')?.focus();
        return;
      }

      if (isNaN(amount) || amount <= 0) {
        Utils.showToast('Please enter a valid transfer amount.', 'error');
        return;
      }

      if (currentAccount && amount > currentAccount.balance) {
        Utils.showToast(`Insufficient balance! Available balance is ${Utils.formatCurrency(currentAccount.balance)}.`, 'error');
        return;
      }

      // Check self-transfer via my own UPI ID
      const myUpi = (document.getElementById('myActiveUpiId')?.textContent || '').trim().toLowerCase();
      if (myUpi && myUpi === upiId) {
        Utils.showToast('Cannot transfer funds to your own active UPI ID.', 'error');
        return;
      }

      pendingTransfer = {
        transferMethod: 'UPI',
        senderAccount: currentAccount.accountNumber,
        receiverAccount: upiId,
        upiId: upiId,
        beneficiaryName: name,
        amount: amount,
        description: desc || `UPI Payment to ${name} (${upiId})`
      };

      document.getElementById('modalConfirmHeaderTitle').innerHTML = '<i class="fa-solid fa-bolt" style="color: var(--accent-cyan);"></i> Confirm UPI Instant Transfer';
      document.getElementById('modalConfirmChannel').textContent = 'Instant UPI Fast-Pay';
      document.getElementById('modalConfirmTo').textContent = name;
      document.getElementById('modalConfirmAccLabel').textContent = 'Recipient UPI ID:';
      document.getElementById('modalConfirmAcc').textContent = upiId;
      document.getElementById('modalConfirmAmount').textContent = Utils.formatCurrency(amount);
      document.getElementById('modalConfirmTotal').textContent = Utils.formatCurrency(amount);

      modal.classList.add('active');
    });
  }

  // 2. Bank Account Transfer Form Submit
  const accInput = document.getElementById('transferAccNumber');
  const confirmAccInput = document.getElementById('transferConfirmAccNumber');

  [accInput, confirmAccInput].forEach(inp => {
    if (inp) {
      inp.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 12);
      });
    }
  });

  if (accForm) {
    accForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('transferBenName').value.trim();
      const accNum = accInput.value.trim();
      const confirmAcc = confirmAccInput.value.trim();
      const ifsc = document.getElementById('transferIfsc').value.trim();
      const amount = parseFloat(document.getElementById('transferAmount').value);
      const desc = document.getElementById('transferDesc').value.trim();

      if (accNum.length !== 11) {
        Utils.showToast('Recipient account number must contain 11 digits.', 'error', 'Validation Error');
        accInput.focus();
        return;
      }

      if (accNum !== confirmAcc) {
        Utils.showToast('Account numbers do not match. Please re-enter.', 'error');
        confirmAccInput.focus();
        return;
      }

      if (currentAccount && accNum === currentAccount.accountNumber) {
        Utils.showToast('Cannot transfer funds to your own active account.', 'error');
        return;
      }

      if (isNaN(amount) || amount <= 0) {
        Utils.showToast('Please enter a valid transfer amount.', 'error');
        return;
      }

      if (currentAccount && amount > currentAccount.balance) {
        Utils.showToast(`Insufficient balance! Available balance is ${Utils.formatCurrency(currentAccount.balance)}.`, 'error');
        return;
      }

      pendingTransfer = {
        transferMethod: 'ACCOUNT',
        senderAccount: currentAccount.accountNumber,
        receiverAccount: accNum,
        beneficiaryName: name,
        ifscCode: ifsc,
        amount: amount,
        description: desc || `Transfer to ${name}`
      };

      document.getElementById('modalConfirmHeaderTitle').innerHTML = '<i class="fa-solid fa-paper-plane" style="color: var(--accent-cyan);"></i> Confirm Bank Account Transfer';
      document.getElementById('modalConfirmChannel').textContent = 'NEFT / IMPS Double-Entry Settlement';
      document.getElementById('modalConfirmTo').textContent = name;
      document.getElementById('modalConfirmAccLabel').textContent = 'Recipient Account:';
      document.getElementById('modalConfirmAcc').textContent = Utils.formatAccountNumber(accNum);
      document.getElementById('modalConfirmAmount').textContent = Utils.formatCurrency(amount);
      document.getElementById('modalConfirmTotal').textContent = Utils.formatCurrency(amount);

      modal.classList.add('active');
    });
  }

  // 3. Confirm & Execute Transfer
  if (confirmBtn) {
    confirmBtn.addEventListener('click', async () => {
      if (!pendingTransfer) return;
      Utils.setLoading(confirmBtn, true, 'Processing Transfer...');

      try {
        const res = await API.request('/transfer', 'POST', pendingTransfer);
        const successMsg = pendingTransfer.transferMethod === 'UPI' 
          ? `₹${pendingTransfer.amount} successfully sent to ${pendingTransfer.beneficiaryName} via UPI!`
          : `Money transfer of ₹${pendingTransfer.amount} completed successfully!`;
          
        Utils.showToast(successMsg, 'success', 'Transfer Success');
        modal.classList.remove('active');
        if (upiForm) upiForm.reset();
        if (accForm) accForm.reset();

        setTimeout(() => {
          window.location.href = 'transactions.html';
        }, 800);
      } catch (err) {
        Utils.showToast(err.message, 'error', 'Transfer Failed');
        Utils.setLoading(confirmBtn, false);
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

// Window global exports
window.switchTransferMode = switchTransferMode;
window.appendUpiSuffix = appendUpiSuffix;
window.verifyRecipientUpi = verifyRecipientUpi;
window.setQuickAmount = setQuickAmount;
window.updateLiveCalculations = updateLiveCalculations;
window.copyMyUpiId = copyMyUpiId;
window.onUpiInputChange = onUpiInputChange;
