/**
 * GG BANK - Money Transfer Controller (transfer.js)
 * Enforces 11-digit recipient validation & confirmation modal flow
 */

let currentAccount = null;
let savedBeneficiaries = [];
let pendingTransfer = null;

document.addEventListener('DOMContentLoaded', async () => {
  const user = Auth.requireCustomer();
  if (!user) return;

  document.querySelectorAll('.customer-name-display').forEach(el => el.textContent = user.name);

  try {
    const accRes = await API.request(`/accounts/user/${user.userId}`);
    currentAccount = accRes.data || { accountNumber: '12345678901', balance: 25450.00 };

    const benRes = await API.request('/beneficiaries');
    savedBeneficiaries = benRes.data || [];

    setupBeneficiariesDropdown();
    setupTransferForm();

  } catch (err) {
    Utils.showToast(err.message, 'error');
  }
});

function setupBeneficiariesDropdown() {
  const select = document.getElementById('transferBeneficiarySelect');
  if (!select) return;

  select.innerHTML = '<option value="">-- Choose Saved Beneficiary or Enter Manually --</option>' +
    savedBeneficiaries.map(b => `<option value="${b.accountNumber}" data-name="${b.name}" data-ifsc="${b.ifscCode}">${b.name} (${Utils.formatAccountNumber(b.accountNumber)}) - ${b.bankName}</option>`).join('');

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

function setupTransferForm() {
  const form = document.getElementById('moneyTransferForm');
  const accInput = document.getElementById('transferAccNumber');
  const confirmAccInput = document.getElementById('transferConfirmAccNumber');
  const modal = document.getElementById('transferConfirmModal');
  const confirmBtn = document.getElementById('btnExecuteTransfer');

  // Restrict to 11-digit numeric
  [accInput, confirmAccInput].forEach(inp => {
    if (inp) {
      inp.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 12);
      });
    }
  });

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('transferBenName').value.trim();
      const accNum = accInput.value.trim();
      const confirmAcc = confirmAccInput.value.trim();
      const ifsc = document.getElementById('transferIfsc').value.trim();
      const amount = parseFloat(document.getElementById('transferAmount').value);
      const desc = document.getElementById('transferDesc').value.trim();

      if (accNum.length !== 12) {
        Utils.showToast('Recipient account number must contain exactly 12 digits.', 'error', 'Validation Error');
        accInput.focus();
        return;
      }

      if (accNum !== confirmAcc) {
        Utils.showToast('Account numbers do not match. Please re-enter.', 'error');
        confirmAccInput.focus();
        return;
      }

      if (accNum === currentAccount.accountNumber) {
        Utils.showToast('Cannot transfer funds to your own active account.', 'error');
        return;
      }

      if (isNaN(amount) || amount <= 0) {
        Utils.showToast('Please enter a valid transfer amount.', 'error');
        return;
      }

      if (amount > currentAccount.balance) {
        Utils.showToast(`Insufficient balance! Available balance is ${Utils.formatCurrency(currentAccount.balance)}.`, 'error');
        return;
      }

      // Prepare confirmation modal
      pendingTransfer = {
        senderAccount: currentAccount.accountNumber,
        receiverAccount: accNum,
        beneficiaryName: name,
        ifscCode: ifsc,
        amount: amount,
        description: desc || `Transfer to ${name}`
      };

      document.getElementById('modalConfirmTo').textContent = name;
      document.getElementById('modalConfirmAcc').textContent = Utils.formatAccountNumber(accNum);
      document.getElementById('modalConfirmAmount').textContent = Utils.formatCurrency(amount);
      document.getElementById('modalConfirmTotal').textContent = Utils.formatCurrency(amount);

      modal.classList.add('active');
    });
  }

  if (confirmBtn) {
    confirmBtn.addEventListener('click', async () => {
      if (!pendingTransfer) return;
      Utils.setLoading(confirmBtn, true, 'Transferring Funds...');

      try {
        const res = await API.request('/transfer', 'POST', pendingTransfer);
        Utils.showToast('Money transfer completed successfully!', 'success', 'Transfer Success');
        modal.classList.remove('active');
        form.reset();

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
