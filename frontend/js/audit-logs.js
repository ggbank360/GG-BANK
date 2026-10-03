/**
 * GG BANK - Audit Logs Controller (audit-logs.js)
 * Implements Audit trail retrieval, Action Filtering, Search, and CSV export.
 */

let allAuditLogs = [];
let filteredAuditLogs = [];
let currentPage = 1;
const PAGE_SIZE = 10;

document.addEventListener('DOMContentLoaded', async () => {
  const admin = AdminCommon.init('audit-logs');
  if (!admin) return;

  await loadAuditLogs();
  setupEventListeners();
  window.__adminRefreshData = loadAuditLogs;
});

async function loadAuditLogs() {
  AdminCommon.renderLoading('adminAuditTableBody', 'Loading immutable audit trail...');
  try {
    const res = await API.request('/admin/audit-logs');
    allAuditLogs = res.data || [];
    applyFilters();
  } catch (err) {
    AdminCommon.renderError('adminAuditTableBody', 'Failed to load audit trail: ' + err.message, loadAuditLogs);
  }
}

function setupEventListeners() {
  const searchInput = document.getElementById('auditSearchInput');
  const actionFilter = document.getElementById('auditActionFilter');

  if (searchInput) searchInput.addEventListener('input', () => { currentPage = 1; applyFilters(); });
  if (actionFilter) actionFilter.addEventListener('change', () => { currentPage = 1; applyFilters(); });
}

function applyFilters() {
  const query = (document.getElementById('auditSearchInput')?.value || '').toLowerCase().trim();
  const action = document.getElementById('auditActionFilter')?.value || 'ALL';

  filteredAuditLogs = allAuditLogs.filter(log => {
    const matchesQuery = !query ||
      (log.logId && log.logId.toLowerCase().includes(query)) ||
      (log.userId && log.userId.toLowerCase().includes(query)) ||
      (log.adminId && log.adminId.toLowerCase().includes(query)) ||
      (log.description && log.description.toLowerCase().includes(query)) ||
      (log.action && log.action.toLowerCase().includes(query));

    const matchesAction = action === 'ALL' || (log.action && log.action.toUpperCase() === action);

    return matchesQuery && matchesAction;
  });

  renderTable();
}

function renderTable() {
  const tbody = document.getElementById('adminAuditTableBody');
  if (!tbody) return;

  if (filteredAuditLogs.length === 0) {
    AdminCommon.renderEmpty('adminAuditTableBody', 'No audit logs found matching criteria.', 'fa-shield-halved');
    updatePagination(0);
    return;
  }

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginated = filteredAuditLogs.slice(startIndex, startIndex + PAGE_SIZE);

  tbody.innerHTML = paginated.map(l => {
    const timeStr = l.timestamp ? new Date(l.timestamp).toLocaleString() : 'N/A';
    const status = l.status || 'SUCCESS';
    const actor = l.adminId || l.userId || 'SYSTEM';

    let actionBadgeColor = 'var(--accent-cyan)';
    if (l.action && l.action.includes('LOAN')) actionBadgeColor = 'var(--warning)';
    if (l.action && l.action.includes('LOGIN')) actionBadgeColor = '#3b82f6';
    if (l.action && (l.action.includes('BLOCK') || l.action.includes('REJECT') || l.action.includes('DELETE'))) actionBadgeColor = 'var(--danger)';

    return `
      <tr>
        <td>
          <span style="font-family: var(--font-mono); font-weight: 700; color: var(--text-muted); font-size: 0.85rem;">
            ${l.logId}
          </span>
        </td>
        <td style="font-size: 0.82rem; color: var(--text-secondary); white-space: nowrap;">
          ${timeStr}
        </td>
        <td>
          <span style="font-family: var(--font-mono); color: #fff; font-size: 0.85rem;">${actor}</span>
        </td>
        <td>
          <span class="badge" style="background: rgba(255, 255, 255, 0.08); color: ${actionBadgeColor}; font-size: 0.75rem;">
            ${l.action}
          </span>
        </td>
        <td style="font-size: 0.88rem; color: var(--text-primary);">
          ${l.description || 'System state change record'}
        </td>
        <td>
          <span class="badge ${status === 'SUCCESS' ? 'badge-success' : 'badge-danger'}" style="font-size: 0.72rem;">
            ${status}
          </span>
        </td>
      </tr>
    `;
  }).join('');

  updatePagination(filteredAuditLogs.length);
}

function updatePagination(totalCount) {
  const summary = document.getElementById('auditCountSummary');
  const container = document.getElementById('auditPaginationBtns');
  if (!summary || !container) return;

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;
  summary.textContent = `Showing ${(currentPage - 1) * PAGE_SIZE + (totalCount > 0 ? 1 : 0)} to ${Math.min(currentPage * PAGE_SIZE, totalCount)} of ${totalCount} audit logs`;

  let btnsHtml = `
    <button class="btn btn-secondary btn-sm" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">
      <i class="fa-solid fa-chevron-left"></i>
    </button>
  `;

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      btnsHtml += `
        <button class="btn ${i === currentPage ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="changePage(${i})">
          ${i}
        </button>
      `;
    } else if (i === currentPage - 2 || i === currentPage + 2) {
      btnsHtml += `<span style="padding: 4px 6px; color: var(--text-muted);">...</span>`;
    }
  }

  btnsHtml += `
    <button class="btn btn-secondary btn-sm" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">
      <i class="fa-solid fa-chevron-right"></i>
    </button>
  `;

  container.innerHTML = btnsHtml;
}

function changePage(page) {
  currentPage = page;
  renderTable();
}

function exportAuditCsv() {
  const exportData = filteredAuditLogs.map(l => ({
    'Log ID': l.logId,
    'Timestamp': l.timestamp ? new Date(l.timestamp).toLocaleString() : 'N/A',
    'Actor': l.adminId || l.userId || 'SYSTEM',
    'Action': l.action,
    'Description': l.description,
    'Status': l.status || 'SUCCESS'
  }));

  AdminCommon.exportCSV(exportData, 'GG_BANK_Audit_Logs.csv');
}
