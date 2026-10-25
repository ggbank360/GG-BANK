/**
 * GG BANK - Account Created Success Controller (account-created.js)
 * Manages the mandatory post-registration success screen, copy action, and PDF download
 */

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const paramAccNum = urlParams.get('accountNumber');

  let accountData = null;
  const stored = sessionStorage.getItem('gg_new_account_created');
  if (stored) {
    try {
      accountData = JSON.parse(stored);
    } catch (e) {}
  }

  if (!accountData) {
    accountData = {
      name: 'Valued Customer',
      accountNumber: paramAccNum || '12345678901',
      accountType: 'Savings Account',
      balance: 0.00,
      createdDate: new Date().toLocaleDateString('en-GB')
    };
  }

  const accNumber = accountData.accountNumber || paramAccNum || '12345678901';

  // Populate UI elements
  const accNumDisplay = document.getElementById('createdAccountNumberDisplay');
  if (accNumDisplay) {
    accNumDisplay.textContent = accNumber;
  }

  const nameDisplay = document.getElementById('createdCustomerNameDisplay');
  if (nameDisplay) {
    nameDisplay.textContent = accountData.name;
  }

  const typeDisplay = document.getElementById('createdAccountTypeDisplay');
  if (typeDisplay) {
    typeDisplay.textContent = accountData.accountType;
  }

  const balanceDisplay = document.getElementById('createdInitialBalanceDisplay');
  if (balanceDisplay) {
    balanceDisplay.textContent = '₹0.00';
  }

  const statusDisplay = document.getElementById('createdAccountStatusDisplay');
  if (statusDisplay) {
    statusDisplay.textContent = accountData.status || 'PENDING ADMIN APPROVAL';
  }

  // Render applicant avatar if profile photo was uploaded
  const avatarEl = document.getElementById('createdCustomerAvatar');
  if (avatarEl && typeof Utils !== 'undefined' && Utils.renderUserAvatar) {
    Utils.renderUserAvatar(avatarEl, accountData);
  }

  // 1. COPY ACCOUNT NUMBER BUTTON
  const copyBtn = document.getElementById('btnCopyAccountNumber');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      await Utils.copyToClipboard(accNumber, 'Account number copied successfully: ' + accNumber);
    });
  }

  // 2. DOWNLOAD ACCOUNT DETAILS PDF BUTTON
  const downloadBtn = document.getElementById('btnDownloadAccountDetails');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      Utils.downloadAccountDetailsPDF(accountData);
    });
  }

  // 3. GO TO LOGIN BUTTON (Prefills 11-digit account number)
  const loginBtn = document.getElementById('btnGoToLogin');
  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      window.location.href = `login.html?accountNumber=${accNumber}`;
    });
  }

  // Real-Time Approval Listener on Account Created Page
  if (typeof window.listenToFirestoreDoc === 'function' && accNumber) {
    window.listenToFirestoreDoc('accounts', accNumber, (liveAcc) => {
      if (liveAcc && liveAcc.status === 'ACTIVE') {
        if (statusDisplay) {
          statusDisplay.textContent = 'ACTIVE (APPROVED)';
          statusDisplay.style.color = 'var(--success, #10b981)';
        }
        Utils.showToast('🎉 Your Account has been Approved by Bank Administration!', 'success');
        if (loginBtn) {
          loginBtn.innerHTML = '<i class="fa-solid fa-arrow-right"></i> Account Active — Enter Banking';
          loginBtn.className = 'btn btn-success btn-block btn-lg';
          loginBtn.onclick = () => {
            Auth.setSession(liveAcc, liveAcc);
            window.location.href = 'dashboard.html';
          };
        }
      }
    });
  }
});
