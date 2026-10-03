/**
 * GG BANK - My Account Controller (account.js)
 */

document.addEventListener('DOMContentLoaded', async () => {
  const user = Auth.requireCustomer();
  if (!user) return;

  // Basic Info
  document.querySelectorAll('.customer-name-display').forEach(el => el.textContent = user.name);
  const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'CU';
  document.querySelectorAll('.customer-avatar-display').forEach(el => el.textContent = initials);

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

    document.getElementById('accViewName').textContent = user.name;
    document.getElementById('accViewCustId').textContent = user.userId;
    document.getElementById('accViewNumber').textContent = Utils.formatAccountNumber(account.accountNumber);
    document.getElementById('accViewRawNumber').textContent = account.accountNumber;
    document.getElementById('accViewType').textContent = account.accountType;
    document.getElementById('accViewIfsc').textContent = account.ifscCode || 'GGBN0001234';
    document.getElementById('accViewBranch').textContent = account.branch || 'Central Tech Branch';
    document.getElementById('accViewStatus').textContent = account.status || 'ACTIVE';
    document.getElementById('accViewBalance').textContent = Utils.formatCurrency(account.balance);
    document.getElementById('accViewCreated').textContent = new Date(account.createdAt).toLocaleDateString('en-GB');

    // Copy Account Number button on My Account page
    const copyBtn = document.getElementById('btnCopyMyAccountNum');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        Utils.copyToClipboard(account.accountNumber);
      });
    }

  } catch (err) {
    Utils.showToast(err.message, 'error');
  }
});
