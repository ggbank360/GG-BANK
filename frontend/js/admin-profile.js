/**
 * GG BANK - Admin Profile Controller (admin-profile.js)
 * Manages Admin credentials, profile editing, and password updating.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const admin = AdminCommon.init('profile');
  if (!admin) return;

  await loadAdminProfile();
  setupProfileForms();
});

async function loadAdminProfile() {
  try {
    const res = await API.request('/admin/profile');
    const admin = res.data || {};

    const nameEl = document.getElementById('adminProfNameDisplay');
    const idEl = document.getElementById('adminProfIdDisplay');
    const emailEl = document.getElementById('adminProfEmailDisplay');

    if (nameEl) nameEl.textContent = admin.name || 'Administrator';
    if (idEl) idEl.textContent = admin.userId || 'usr-admin-999';
    if (emailEl) emailEl.textContent = admin.email || 'admin@ggbank.com';

    document.getElementById('profNameInput').value = admin.name || '';
    document.getElementById('profPhoneInput').value = admin.phone || '9000000000';
    document.getElementById('profAddressInput').value = admin.address || 'GG BANK Headquarters, Financial Tower';

  } catch (err) {
    console.error('Failed to load profile:', err);
  }
}

function setupProfileForms() {
  // 1. Profile Details Form
  const profileForm = document.getElementById('adminProfileForm');
  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btnSaveAdminProfile');

      const payload = {
        name: document.getElementById('profNameInput').value.trim(),
        phone: document.getElementById('profPhoneInput').value.trim(),
        address: document.getElementById('profAddressInput').value.trim()
      };

      Utils.setLoading(btn, true, 'Saving...');
      try {
        const res = await API.request('/admin/profile', 'PUT', payload);
        Utils.showToast('Profile information saved successfully!', 'success');
        if (res.data && res.data.name) {
          document.getElementById('adminProfNameDisplay').textContent = res.data.name;
          const user = Auth.getCurrentUser();
          if (user) {
            user.name = res.data.name;
            localStorage.setItem('gg_current_user', JSON.stringify(user));
          }
        }
      } catch (err) {
        Utils.showToast(err.message || 'Failed to update profile', 'error');
      } finally {
        Utils.setLoading(btn, false);
      }
    });
  }

  // 2. Password Change Form
  const passForm = document.getElementById('adminPasswordForm');
  if (passForm) {
    passForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const curr = document.getElementById('profCurrentPass').value;
      const newP = document.getElementById('profNewPass').value;
      const conf = document.getElementById('profConfirmPass').value;
      const btn = document.getElementById('btnChangeAdminPass');

      if (newP !== conf) {
        Utils.showToast('New passwords do not match. Please verify and re-enter.', 'warning');
        return;
      }

      Utils.setLoading(btn, true, 'Changing...');
      try {
        await API.request('/admin/profile/password', 'PUT', {
          currentPassword: curr,
          newPassword: newP
        });
        Utils.showToast('Master password changed successfully!', 'success');
        passForm.reset();
      } catch (err) {
        Utils.showToast(err.message || 'Failed to change password', 'error');
      } finally {
        Utils.setLoading(btn, false);
      }
    });
  }
}
