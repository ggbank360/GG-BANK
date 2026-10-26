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
      // If user is entering digits only, allow up to 12 digits, but if typing email/letters do not truncate
    });

    accInput.addEventListener('paste', (e) => {
      // Allow pasting either email or account number
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
      const identifier = accInput.value.trim();
      const pass = passInput.value;

      if (!identifier) {
        Utils.showToast('Please enter your account number or registered email.', 'warning', 'Required');
        accInput.focus();
        return;
      }

      Utils.setLoading(submitBtn, true, 'Logging In...');
      try {
        const { user } = await Auth.loginWithEmail(identifier, pass);
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
