/**
 * GG BANK - Admin Notifications Controller (admin-notifications.js)
 * Manages administrative alerts, mark as read, delete, and filtering.
 */

let allNotifications = [];
let activeFilter = 'ALL';

document.addEventListener('DOMContentLoaded', async () => {
  const admin = AdminCommon.init('notifications');
  if (!admin) return;

  await loadNotifications();
  window.__adminRefreshData = loadNotifications;
});

async function loadNotifications() {
  const container = document.getElementById('adminNotifsFeedContainer');
  if (container) {
    container.innerHTML = `
      <div style="text-align: center; padding: 60px 20px; color: var(--accent-cyan);">
        <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 2.2rem; margin-bottom: 14px;"></i>
        <div style="font-size: 1rem; font-weight: 600; color: var(--text-primary);">Loading system notifications...</div>
      </div>
    `;
  }

  try {
    const res = await API.request('/admin/notifications');
    allNotifications = res.data || [];
    renderNotifications();
    AdminCommon.updateLiveBadges();
  } catch (err) {
    if (container) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--danger); background: var(--bg-card); border-radius: var(--radius-lg);">
          <i class="fa-solid fa-triangle-exclamation" style="font-size: 2.2rem; margin-bottom: 12px;"></i>
          <div style="font-size: 1rem; font-weight: 600; margin-bottom: 12px;">Failed to load alerts: ${err.message}</div>
          <button class="btn btn-secondary btn-sm" onclick="loadNotifications()">
            <i class="fa-solid fa-rotate-right"></i> Retry
          </button>
        </div>
      `;
    }
  }
}

function setNotifFilter(filter, btn) {
  activeFilter = filter;
  document.querySelectorAll('.notif-filter-btn').forEach(b => {
    b.classList.remove('btn-primary', 'active');
    b.classList.add('btn-secondary');
  });
  if (btn) {
    btn.classList.remove('btn-secondary');
    btn.classList.add('btn-primary', 'active');
  }
  renderNotifications();
}

function renderNotifications() {
  const container = document.getElementById('adminNotifsFeedContainer');
  const unreadCounter = document.getElementById('notifUnreadCounter');
  if (!container) return;

  const unreadCount = allNotifications.filter(n => !n.read).length;
  if (unreadCounter) {
    unreadCounter.textContent = `${unreadCount} unread alert${unreadCount !== 1 ? 's' : ''}`;
  }

  const filtered = allNotifications.filter(n => {
    if (activeFilter === 'UNREAD') return !n.read;
    if (activeFilter === 'READ') return n.read;
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 60px 20px; color: var(--text-muted); background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-color-subtle);">
        <i class="fa-solid fa-bell-slash" style="font-size: 2.5rem; margin-bottom: 14px; opacity: 0.6;"></i>
        <div style="font-size: 1.05rem; font-weight: 600; color: var(--text-secondary);">No notifications in this view.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(n => {
    const isUnread = !n.read;
    let iconClass = 'fa-solid fa-bell';
    let iconColor = 'var(--accent-cyan)';
    let iconBg = 'rgba(0, 240, 255, 0.15)';

    if (n.type === 'SECURITY' || n.type === 'ALERT') {
      iconClass = 'fa-solid fa-shield-halved';
      iconColor = 'var(--danger)';
      iconBg = 'rgba(239, 68, 68, 0.15)';
    } else if (n.type === 'LOAN') {
      iconClass = 'fa-solid fa-hand-holding-dollar';
      iconColor = 'var(--warning)';
      iconBg = 'rgba(245, 158, 11, 0.15)';
    } else if (n.type === 'TRANSACTION' || n.type === 'DEPOSIT') {
      iconClass = 'fa-solid fa-money-bill-transfer';
      iconColor = 'var(--success)';
      iconBg = 'rgba(0, 230, 118, 0.15)';
    }

    const timeStr = n.createdAt ? new Date(n.createdAt).toLocaleString() : 'Just now';

    return `
      <div class="card" style="padding: 18px 22px; display: flex; justify-content: space-between; align-items: center; gap: 16px; border-left: 4px solid ${isUnread ? 'var(--accent-cyan)' : 'var(--border-color-subtle)'}; background: ${isUnread ? 'var(--bg-glass-card)' : 'var(--bg-card)'};">
        <div style="display: flex; align-items: flex-start; gap: 16px;">
          <div style="width: 44px; height: 44px; border-radius: var(--radius-md); background: ${iconBg}; color: ${iconColor}; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; flex-shrink: 0; margin-top: 2px;">
            <i class="${iconClass}"></i>
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <h4 style="font-size: 0.98rem; font-weight: 700; color: #fff;">${n.title || 'System Notification'}</h4>
              ${isUnread ? '<span class="badge badge-success" style="font-size: 0.65rem; padding: 2px 6px;">NEW</span>' : ''}
            </div>
            <p style="font-size: 0.88rem; color: var(--text-secondary); margin: 4px 0 6px 0;">${n.message || ''}</p>
            <span style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono);">${timeStr}</span>
          </div>
        </div>

        <div style="display: flex; gap: 8px; flex-shrink: 0;">
          ${isUnread ? `
            <button class="btn btn-secondary btn-sm" onclick="markNotificationRead('${n.notificationId}')" title="Mark as Read">
              <i class="fa-solid fa-check"></i>
            </button>
          ` : ''}
          <button class="btn btn-secondary btn-sm" onclick="deleteNotificationItem('${n.notificationId}')" title="Delete Alert" style="color: var(--danger);">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

async function markNotificationRead(notifId) {
  try {
    await API.request(`/admin/notifications/${notifId}/read`, 'PUT');
    const n = allNotifications.find(item => item.notificationId === notifId);
    if (n) n.read = true;
    renderNotifications();
    AdminCommon.updateLiveBadges();
  } catch (err) {
    Utils.showToast(err.message || 'Failed to update alert', 'error');
  }
}

async function markAllNotificationsRead() {
  try {
    await API.request('/admin/notifications/read-all', 'PUT');
    allNotifications.forEach(n => n.read = true);
    renderNotifications();
    AdminCommon.updateLiveBadges();
    Utils.showToast('All notifications marked as read.', 'success');
  } catch (err) {
    Utils.showToast(err.message || 'Failed to mark all as read', 'error');
  }
}

function deleteNotificationItem(notifId) {
  AdminCommon.confirmModal({
    title: 'Delete Notification?',
    message: 'Are you sure you want to permanently remove this notification alert?',
    confirmText: 'Delete',
    confirmClass: 'btn-danger',
    onConfirm: async () => {
      await API.request(`/admin/notifications/${notifId}`, 'DELETE');
      allNotifications = allNotifications.filter(n => n.notificationId !== notifId);
      renderNotifications();
      AdminCommon.updateLiveBadges();
      Utils.showToast('Notification removed.', 'info');
    }
  });
}
