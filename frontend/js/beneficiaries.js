/**
 * GG BANK - Beneficiaries Controller (beneficiaries.js)
 */

let savedBeneficiaries = [];
let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = Auth.requireCustomer();
  if (!currentUser) return;

  document.querySelectorAll('.customer-name-display').forEach(el => el.textContent = currentUser.name);

  await loadBeneficiaries();
  setupAddBeneficiaryModal();
});

async function loadBeneficiaries() {
  try {
    const res = await API.request('/beneficiaries');
    savedBeneficiaries = res.data || [];
    renderBeneficiariesGrid(savedBeneficiaries);
  } catch (err) {
    Utils.showToast(err.message, 'error');
  }
}

function renderBeneficiariesGrid(bens) {
  const container = document.getElementById('beneficiariesGrid');
  if (!container) return;

  if (bens.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;">No saved beneficiaries found. Click "Add New Beneficiary" to get started.</div>`;
    return;
  }

  container.innerHTML = bens.map(b => `
    <div class="card" style="display: flex; flex-direction: column; justify-content: space-between; gap: 14px;">
      <div>
        <div style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary);">${b.name}</div>
        <div style="font-family: var(--font-mono); font-size: 0.95rem; color: var(--accent-cyan); margin-top: 4px; font-weight: 700;">
          ${Utils.formatAccountNumber(b.accountNumber)}
        </div>
        <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px;">${b.bankName} • ${b.ifscCode}</div>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="btn btn-primary btn-sm" style="flex: 1;" onclick="quickTransfer('${b.accountNumber}')">Transfer</button>
        <button class="btn btn-secondary btn-sm" style="color: var(--danger);" onclick="deleteBeneficiary('${b.beneficiaryId}')">Delete</button>
      </div>
    </div>
  `).join('');
}

function quickTransfer(accountNumber) {
  window.location.href = `transfer.html?to=${accountNumber}`;
}

async function deleteBeneficiary(id) {
  if (!confirm('Are you sure you want to remove this saved beneficiary?')) return;
  try {
    await API.request(`/beneficiaries/${id}`, 'DELETE');
    Utils.showToast('Beneficiary removed.', 'info');
    await loadBeneficiaries();
  } catch (err) {
    Utils.showToast(err.message, 'error');
  }
}

function setupAddBeneficiaryModal() {
  const modal = document.getElementById('addBenModal');
  const form = document.getElementById('addBeneficiaryForm');
  const accInput = document.getElementById('benAccount');

  if (accInput) {
    accInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 12);
    });
  }

  const openBtn = document.getElementById('btnOpenAddBenModal');
  if (openBtn && modal) {
    openBtn.addEventListener('click', () => modal.classList.add('active'));
  }

  if (form && modal) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('benName').value.trim();
      const accNum = accInput.value.trim();
      const ifsc = document.getElementById('benIfsc').value.trim();
      const bank = document.getElementById('benBank').value.trim();

      if (accNum.length !== 12) {
        Utils.showToast('Beneficiary account number must be exactly 12 digits.', 'error');
        accInput.focus();
        return;
      }

      try {
        await API.request('/beneficiaries', 'POST', {
          name,
          accountNumber: accNum,
          ifscCode: ifsc,
          bankName: bank
        });
        Utils.showToast(`Beneficiary ${name} added successfully!`, 'success');
        modal.classList.remove('active');
        form.reset();
        await loadBeneficiaries();
      } catch (err) {
        Utils.showToast(err.message, 'error');
      }
    });
  }

  document.querySelectorAll('[data-modal-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (modal) modal.classList.remove('active');
    });
  });
}

window.quickTransfer = quickTransfer;
window.deleteBeneficiary = deleteBeneficiary;
