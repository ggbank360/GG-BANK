/**
 * GG BANK - Customer Login Controller (login.js)
 * Enforces 11-digit numeric restrictions and authentication
 */

document.addEventListener('DOMContentLoaded', () => {
  // If already logged in as Customer, redirect to dashboard
  const user = Auth.getCurrentUser();
  if (user && user.role === 'CUSTOMER') {
    window.location.href = 'dashboard.html';
    return;
  }

  const accInput = document.getElementById('loginAccountNumber');
  const passInput = document.getElementById('loginPassword');
  const togglePass = document.getElementById('toggleLoginPassword');
  const loginForm = document.getElementById('customerLoginForm');
  const submitBtn = document.getElementById('btnLoginSubmit');

  // Check URL params for pre-filled account number (from registration)
  const urlParams = new URLSearchParams(window.location.search);
  const prefilledAcc = urlParams.get('accountNumber');
  if (prefilledAcc && accInput) {
    accInput.value = prefilledAcc.replace(/\D/g, '').slice(0, 12);
  }

  // 1. Strict 11-Digit Numeric Input Enforcement
  if (accInput) {
    accInput.addEventListener('input', (e) => {
      // Remove any non-numeric characters
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 12);
    });

    accInput.addEventListener('keypress', (e) => {
      // Prevent non-number keys (allow control keys)
      if (!/[0-9]/.test(e.key)) {
        e.preventDefault();
      }
    });

    accInput.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasteData = (e.clipboardData || window.clipboardData).getData('text');
      const numericOnly = pasteData.replace(/\D/g, '').slice(0, 12);
      e.target.value = numericOnly;
    });
  }

  // 2. Toggle Password Visibility
  if (togglePass && passInput) {
    togglePass.addEventListener('click', () => {
      const isPassword = passInput.type === 'password';
      passInput.type = isPassword ? 'text' : 'password';
      togglePass.className = isPassword ? 'fa-regular fa-eye-slash input-action-icon' : 'fa-regular fa-eye input-action-icon';
    });
  }

  // 3. Login Submission
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const accNum = accInput.value.trim();
      const pass = passInput.value;

      if (accNum.length !== 12) {
        Utils.showToast('Please enter your complete 12-digit account number.', 'warning', 'Invalid Account Number');
        accInput.focus();
        return;
      }

      Utils.setLoading(submitBtn, true, 'Logging In...');
      try {
        const { user } = await Auth.loginWithAccountNumber(accNum, pass);
        Utils.showToast(`Welcome back, ${user.name}!`, 'success');
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 600);
      } catch (err) {
        Utils.showToast(err.message, 'error', 'Login Failed');
        Utils.setLoading(submitBtn, false);
      }
    });
  }
});
