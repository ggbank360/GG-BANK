/**
 * GG BANK - Admin Settings Controller (admin-settings.js)
 * Manages institutional bank settings, IFSC routing, timeouts, and security policies.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const admin = AdminCommon.init('settings');
  if (!admin) return;

  await loadSettings();
  setupSettingsForm();
});

async function loadSettings() {
  try {
    const res = await API.request('/admin/settings');
    const s = res.data || {};

    if (s.bankName) document.getElementById('settingBankName').value = s.bankName;
    if (s.bankBranch) document.getElementById('settingBranch').value = s.bankBranch;
    if (s.ifscCode) document.getElementById('settingIfsc').value = s.ifscCode;
    if (s.currency) document.getElementById('settingCurrency').value = s.currency;
    if (s.sessionTimeoutMinutes) document.getElementById('settingTimeout').value = s.sessionTimeoutMinutes;
    if (s.maxLoginAttempts) document.getElementById('settingMaxAttempts').value = s.maxLoginAttempts;

    document.getElementById('setting2FA').checked = s.twoFactorAuth !== false;
    document.getElementById('settingEmailNotif').checked = s.emailNotifications !== false;
    document.getElementById('settingSmsAlerts').checked = s.smsAlerts !== false;

  } catch (err) {
    console.error('Failed to load settings:', err);
  }
}

function setupSettingsForm() {
  const form = document.getElementById('adminSettingsForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnSaveAdminSettings');

    const payload = {
      bankName: document.getElementById('settingBankName').value.trim(),
      bankBranch: document.getElementById('settingBranch').value.trim(),
      ifscCode: document.getElementById('settingIfsc').value.trim(),
      currency: document.getElementById('settingCurrency').value.trim(),
      sessionTimeoutMinutes: parseInt(document.getElementById('settingTimeout').value) || 15,
      maxLoginAttempts: parseInt(document.getElementById('settingMaxAttempts').value) || 5,
      twoFactorAuth: document.getElementById('setting2FA').checked,
      emailNotifications: document.getElementById('settingEmailNotif').checked,
      smsAlerts: document.getElementById('settingSmsAlerts').checked
    };

    Utils.setLoading(btn, true, 'Saving Settings...');
    try {
      await API.request('/admin/settings', 'PUT', payload);
      Utils.showToast('System configuration saved successfully!', 'success');
    } catch (err) {
      Utils.showToast(err.message || 'Failed to save settings', 'error');
    } finally {
      Utils.setLoading(btn, false);
    }
  });
}
