/**
 * GG BANK - My Account Controller (account.js)
 */

document.addEventListener('DOMContentLoaded', async () => {
  const user = Auth.requireCustomer();
  if (!user) return;

  // Basic Info
  document.querySelectorAll('.customer-name-display').forEach(el => el.textContent = user.name);
  if (window.Utils && typeof Utils.renderUserAvatar === 'function') {
    Utils.updateAllUserAvatars(user);
  } else {
    const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'CU';
    document.querySelectorAll('.customer-avatar-display').forEach(el => el.textContent = initials);
  }

  try {
    const accRes = await API.request(`/accounts/user/${user.userId}`);
    const account = accRes.data || {
      accountNumber: '12345678901',
      accountType: 'SAVINGS',
      balance: 25450.00,
      ifscCode: 'GGBN0001234',
      branch: 'Central Tech Branch',
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    };

    const upiId = account.upiId || (user.email ? user.email.split('@')[0] + '@ggbank' : account.accountNumber + '@ggbank');
    const phone = account.phone || user.phone || '9876543210';
    const email = account.email || user.email || 'customer@ggbank.com';
    const kycStatus = (account.kycStatus || 'VERIFIED').toUpperCase();

    const nameEl = document.getElementById('accViewName');
    if (nameEl) nameEl.textContent = user.fullName || user.name || account.fullName || account.name;

    const custIdEl = document.getElementById('accViewCustId');
    if (custIdEl) custIdEl.textContent = user.userId || account.userId;

    const numEl = document.getElementById('accViewNumber');
    if (numEl) numEl.textContent = Utils.formatAccountNumber(account.accountNumber);

    const rawNumEl = document.getElementById('accViewRawNumber');
    if (rawNumEl) rawNumEl.textContent = account.accountNumber;

    const upiEl = document.getElementById('accViewUpiId');
    if (upiEl) upiEl.textContent = upiId;

    const phoneEl = document.getElementById('accViewPhone');
    if (phoneEl) phoneEl.textContent = phone;

    const emailEl = document.getElementById('accViewEmail');
    if (emailEl) emailEl.textContent = email;

    const typeEl = document.getElementById('accViewType');
    if (typeEl) typeEl.textContent = (account.accountType || 'SAVINGS') + ' ACCOUNT';

    const ifscEl = document.getElementById('accViewIfsc');
    if (ifscEl) ifscEl.textContent = account.ifscCode || 'GGBN0001234';

    const branchEl = document.getElementById('accViewBranch');
    if (branchEl) branchEl.textContent = account.branch || 'Central Tech Branch, Bengaluru';

    const statusEl = document.getElementById('accViewStatus');
    if (statusEl) statusEl.textContent = account.status || 'ACTIVE';

    const kycEl = document.getElementById('accViewKycStatus');
    if (kycEl) {
      kycEl.innerHTML = `<i class="fa-solid fa-circle-check"></i> KYC ${kycStatus}`;
      kycEl.className = kycStatus === 'VERIFIED' ? 'badge badge-success' : 'badge badge-warning';
    }

    const balEl = document.getElementById('accViewBalance');
    if (balEl) balEl.textContent = Utils.formatCurrency(account.balance);

    const createdEl = document.getElementById('accViewCreated');
    if (createdEl) createdEl.textContent = account.createdAt ? new Date(account.createdAt).toLocaleDateString('en-GB') : 'Active Member';

    // Copy Account Number button on My Account page
    const copyBtn = document.getElementById('btnCopyMyAccountNum');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        Utils.copyToClipboard(account.accountNumber, `Account number ${account.accountNumber} copied to clipboard!`);
      });
    }

    // Copy UPI ID button
    const copyUpiBtn = document.getElementById('btnCopyMyUpiId');
    if (copyUpiBtn) {
      copyUpiBtn.addEventListener('click', () => {
        Utils.copyToClipboard(upiId, `UPI ID ${upiId} copied to clipboard!`);
      });
    }

  } catch (err) {
    Utils.showToast(err.message, 'error');
  }
});
