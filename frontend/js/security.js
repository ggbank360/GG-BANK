/**
 * GG BANK - Security Center Controller (security.js)
 * Implements 2FA status management, password update, and session login audits.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const user = Auth.requireCustomer();
  if (!user) return;

  document.querySelectorAll('.customer-name-display').forEach(el => el.textContent = user.name || 'Customer');

  const emailTextEl = document.getElementById('secEmailText');
  if (emailTextEl) emailTextEl.textContent = user.email || 'customer@ggbank.com';

  // 2FA Toggle logic
  const toggle2FA = document.getElementById('toggle2FA');
  const status2FAText = document.getElementById('sec2faStatusText');
  const saved2FA = localStorage.getItem('gg_2fa_enabled') !== 'false';

  if (toggle2FA) {
    toggle2FA.checked = saved2FA;
    update2FADisplay(saved2FA);

    toggle2FA.addEventListener('change', () => {
      const isEnabled = toggle2FA.checked;
      localStorage.setItem('gg_2fa_enabled', isEnabled);
      update2FADisplay(isEnabled);
      Utils.showToast(
        isEnabled ? 'Two-Factor Authentication (OTP) enabled.' : 'Two-Factor Authentication disabled.',
        isEnabled ? 'success' : 'warning'
      );
    });
  }

  function update2FADisplay(enabled) {
    if (!status2FAText) return;
    if (enabled) {
      status2FAText.innerHTML = '<i class="fa-solid fa-shield-halved" style="color: var(--accent);"></i> Enabled (OTP)';
      status2FAText.style.color = 'var(--accent)';
    } else {
      status2FAText.innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="color: var(--danger);"></i> Disabled';
      status2FAText.style.color = 'var(--danger)';
    }
  }

  // Change Password Form
  const pwdForm = document.getElementById('secChangePasswordForm');
  const btnUpdatePwd = document.getElementById('btnUpdatePassword');

  if (pwdForm) {
    pwdForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const curr = document.getElementById('secCurrentPassword').value;
      const newP = document.getElementById('secNewPassword').value;
      const conf = document.getElementById('secConfirmPassword').value;

      if (newP !== conf) {
        Utils.showToast('New passwords do not match. Please verify.', 'error');
        return;
      }

      if (newP.length < 8) {
        Utils.showToast('New password must be at least 8 characters long.', 'warning');
        return;
      }

      Utils.setLoading(btnUpdatePwd, true, 'Updating Credentials...');
      try {
        await new Promise(r => setTimeout(r, 600)); // Simulated secure hash update
        Utils.showToast('Password updated successfully. Next login will require new credentials.', 'success');
        pwdForm.reset();
      } catch (err) {
        Utils.showToast(err.message || 'Failed to update password.', 'error');
      } finally {
        Utils.setLoading(btnUpdatePwd, false, 'Update Password');
      }
    });
  }

  // Login Activity & Device Management
  renderLoginActivity();

  const btnSignOutAll = document.getElementById('btnSignOutAllSessions');
  if (btnSignOutAll) {
    btnSignOutAll.addEventListener('click', () => {
      Utils.showToast('All other active sessions have been invalidated.', 'success');
      const list = document.getElementById('loginActivityList');
      if (list) {
        // Keep only current session
        list.querySelectorAll('.session-item:not(.current-session)').forEach(el => el.remove());
      }
    });
  }
});

function renderLoginActivity() {
  const container = document.getElementById('loginActivityList');
  if (!container) return;

  const activities = [
    {
      device: 'Windows PC (x64)',
      browser: 'Chrome 129.0 / Antigravity IDE',
      date: 'Today, ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      ip: '127.0.0.1 (Localhost)',
      location: 'Bengaluru, India',
      isCurrent: true
    },
    {
      device: 'Samsung Galaxy S24 Ultra',
      browser: 'GG Bank Mobile App 2.4',
      date: 'Yesterday, 10:45 PM',
      ip: '192.168.1.104 (Wi-Fi)',
      location: 'Bengaluru, India',
      isCurrent: false
    },
    {
      device: 'Apple MacBook Pro M3',
      browser: 'Safari 18.1',
      date: '28 Sep 2026, 04:12 PM',
      ip: '103.21.244.18',
      location: 'Mumbai, India',
      isCurrent: false
    }
  ];

  container.innerHTML = activities.map(a => `
    <div class="session-item ${a.isCurrent ? 'current-session' : ''}" style="background: var(--surface-secondary); padding: 14px; border-radius: 8px; border: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; gap: 12px;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="width: 36px; height: 36px; border-radius: 6px; background: rgba(14, 165, 233, 0.15); color: var(--accent); display: flex; align-items: center; justify-content: center; font-size: 1.1rem;">
          <i class="fa-solid ${a.device.includes('PC') || a.device.includes('Mac') ? 'fa-laptop' : 'fa-mobile-screen'}"></i>
        </div>
        <div>
          <div style="font-size: 0.9rem; font-weight: 700; color: #ffffff; display: flex; align-items: center; gap: 8px;">
            ${a.device}
            ${a.isCurrent ? '<span style="font-size: 0.7rem; background: rgba(16, 185, 129, 0.2); color: var(--success); padding: 2px 6px; border-radius: 4px; font-weight: 600;">Current Session</span>' : ''}
          </div>
          <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 2px;">
            ${a.browser} &bull; ${a.ip} &bull; ${a.location}
          </div>
        </div>
      </div>
      <div style="text-align: right; font-size: 0.75rem; color: var(--text-muted); white-space: nowrap;">
        ${a.date}
      </div>
    </div>
  `).join('');
}
