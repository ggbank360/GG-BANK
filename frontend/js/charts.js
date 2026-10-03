/**
 * GG BANK - Chart.js Visualizations & Analytics Engine
 * Clean modern fintech aesthetic with accessible palettes
 */

const BankCharts = {
  instances: {},

  destroyChart(id) {
    if (this.instances[id]) {
      this.instances[id].destroy();
      delete this.instances[id];
    }
  },

  renderIncomeExpense(canvasId, income = 72850, expense = 7400) {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    this.instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Total Inflow (Income)', 'Total Outflow (Expenses)', 'Net Savings'],
        datasets: [{
          label: 'Amount (₹)',
          data: [income, expense, Math.max(0, income - expense)],
          backgroundColor: [
            'rgba(16, 185, 129, 0.85)', // success emerald
            'rgba(239, 68, 68, 0.85)',   // danger red
            'rgba(14, 165, 233, 0.85)'   // accent cyan
          ],
          borderColor: [
            '#10b981',
            '#ef4444',
            '#0ea5e9'
          ],
          borderWidth: 1.5,
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => ' ₹' + Number(context.raw).toLocaleString('en-IN')
            }
          }
        },
        scales: {
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.06)' },
            ticks: {
              color: '#94a3b8',
              callback: (val) => '₹' + Number(val).toLocaleString('en-IN')
            }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8', font: { family: 'Outfit, sans-serif' } }
          }
        }
      }
    });
  },

  renderCategorySpending(canvasId, categories = ['Food', 'Bills', 'Shopping', 'Transport'], values = [6200, 3400, 2800, 1900]) {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const colors = [
      '#0ea5e9', // cyan
      '#6366f1', // indigo
      '#f59e0b', // amber
      '#ec4899', // pink
      '#10b981', // emerald
      '#8b5cf6', // purple
      '#64748b'  // slate
    ];

    this.instances[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: categories,
        datasets: [{
          data: values,
          backgroundColor: colors.slice(0, categories.length),
          borderColor: '#0f172a',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#94a3b8',
              font: { family: 'Outfit, sans-serif', size: 12 },
              padding: 12
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => ` ${context.label}: ₹${Number(context.raw).toLocaleString('en-IN')}`
            }
          }
        },
        cutout: '68%'
      }
    });
  },

  renderTransactionTrend(canvasId, labels = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'], dataPoints = [25000, 34000, 42000, 50000, 65450, 65450]) {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    this.instances[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Account Balance (₹)',
          data: dataPoints,
          borderColor: '#0ea5e9',
          backgroundColor: 'rgba(14, 165, 233, 0.12)',
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointBackgroundColor: '#0ea5e9',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 1.5,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => ' Balance: ₹' + Number(context.raw).toLocaleString('en-IN')
            }
          }
        },
        scales: {
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.06)' },
            ticks: {
              color: '#94a3b8',
              callback: (val) => '₹' + Number(val).toLocaleString('en-IN')
            }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8', font: { family: 'Outfit, sans-serif' } }
          }
        }
      }
    });
  },

  renderAdminGrowth(canvasId) {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    this.instances[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
        datasets: [
          {
            label: 'Total Deposits',
            data: [120000, 210000, 340000, 450000, 610000, 780000],
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            fill: true,
            tension: 0.3,
            borderWidth: 2
          },
          {
            label: 'Total Transfers',
            data: [80000, 140000, 220000, 310000, 420000, 540000],
            borderColor: '#0ea5e9',
            backgroundColor: 'rgba(14, 165, 233, 0.08)',
            fill: true,
            tension: 0.3,
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#94a3b8', font: { family: 'Outfit, sans-serif' } }
          }
        },
        scales: {
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.06)' },
            ticks: {
              color: '#94a3b8',
              callback: (val) => '₹' + Number(val).toLocaleString('en-IN')
            }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8' }
          }
        }
      }
    });
  }
};

window.BankCharts = BankCharts;
