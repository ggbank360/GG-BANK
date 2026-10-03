/**
 * GG BANK - Monthly Budget Controller (budget.js)
 * Implements category spending monitoring with 80% and 100% threshold warnings
 */

let userBudgets = [];
let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = Auth.requireCustomer();
  if (!currentUser) return;

  document.querySelectorAll('.customer-name-display').forEach(el => el.textContent = currentUser.name);

  await loadBudgets();
  setupBudgetModal();
});

async function loadBudgets() {
  try {
    const res = await API.request('/budgets');
    userBudgets = res.data || [];
    renderBudgetCards(userBudgets);
  } catch (err) {
    Utils.showToast(err.message, 'error');
  }
}

function renderBudgetCards(budgets) {
  const container = document.getElementById('budgetCardsGrid');
  if (!container) return;

  if (budgets.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 30px;">No budgets configured. Click "Set Category Budget" to track monthly expenses.</div>`;
    return;
  }

  container.innerHTML = budgets.map(b => {
    const percentage = Math.min(100, Math.round((b.spent / b.limitAmount) * 100));
    let progressClass = 'progress-safe';
    let alertTag = '';

    if (percentage >= 100) {
      progressClass = 'progress-danger';
      alertTag = `<span class="badge badge-danger">100% Exceeded!</span>`;
    } else if (percentage >= 80) {
      progressClass = 'progress-warning';
      alertTag = `<span class="badge badge-warning">80% Near Limit</span>`;
    }

    const remaining = Math.max(0, b.limitAmount - b.spent);

    return `
      <div class="budget-card">
        <div class="budget-card-header">
          <div class="budget-category-title">🎯 ${b.category}</div>
          ${alertTag}
        </div>
        <div class="budget-numbers">
          <span>Spent: <strong>${Utils.formatCurrency(b.spent)}</strong></span>
          <span>Limit: <strong>${Utils.formatCurrency(b.limitAmount)}</strong></span>
        </div>
        <div class="budget-progress-track">
          <div class="budget-progress-fill ${progressClass}" style="width: ${percentage}%;"></div>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-secondary);">
          <span>${percentage}% Used</span>
          <span>${Utils.formatCurrency(remaining)} Remaining</span>
        </div>
      </div>
    `;
  }).join('');
}

function setupBudgetModal() {
  const modal = document.getElementById('setBudgetModal');
  const form = document.getElementById('setBudgetForm');
  const openBtn = document.getElementById('btnOpenBudgetModal');

  if (openBtn && modal) {
    openBtn.addEventListener('click', () => modal.classList.add('active'));
  }

  if (form && modal) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const cat = document.getElementById('budgetCategorySelect').value;
      const limit = parseFloat(document.getElementById('budgetLimitInput').value);

      if (isNaN(limit) || limit <= 0) {
        Utils.showToast('Please enter a valid monthly limit.', 'error');
        return;
      }

      try {
        await API.request('/budgets', 'POST', {
          category: cat,
          limitAmount: limit
        });
        Utils.showToast(`Monthly budget for ${cat} set to ₹${limit.toLocaleString('en-IN')}!`, 'success');
        modal.classList.remove('active');
        form.reset();
        await loadBudgets();
      } catch (err) {
        Utils.showToast(err.message, 'error');
      }
    });
  }

  document.querySelectorAll('[data-modal-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (modal) modal.classList.remove('active');
    });
  });
}
