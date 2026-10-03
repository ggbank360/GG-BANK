/**
 * GG BANK - Toast Notification & UI Feedback System
 */

const Toast = {
  container: null,

  init() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },

  show(message, type = 'info', title = null, duration = 4000) {
    this.init();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const iconMap = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };

    const titleMap = {
      success: title || 'Success',
      error: title || 'Error',
      warning: title || 'Warning',
      info: title || 'Notice'
    };

    toast.innerHTML = `
      <div style="font-size: 1.2rem; font-weight: bold;">${iconMap[type] || 'ℹ'}</div>
      <div class="toast-content">
        <div class="toast-title">${titleMap[type]}</div>
        <div class="toast-message">${message}</div>
      </div>
    `;

    this.container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, duration);
  },

  success(message, title = 'Success') {
    this.show(message, 'success', title);
  },

  error(message, title = 'Error') {
    this.show(message, 'error', title);
  },

  warning(message, title = 'Warning') {
    this.show(message, 'warning', title);
  },

  info(message, title = 'Information') {
    this.show(message, 'info', title);
  }
};

// Global Loading Helper
const Loader = {
  buttonOriginals: new Map(),

  start(btnElement, loadingText = 'Processing...') {
    if (!btnElement) return;
    if (!this.buttonOriginals.has(btnElement)) {
      this.buttonOriginals.set(btnElement, btnElement.innerHTML);
    }
    btnElement.disabled = true;
    btnElement.innerHTML = `<span class="spinner"></span> ${loadingText}`;
  },

  stop(btnElement) {
    if (!btnElement) return;
    btnElement.disabled = false;
    if (this.buttonOriginals.has(btnElement)) {
      btnElement.innerHTML = this.buttonOriginals.get(btnElement);
    }
  }
};

// Expose globally
window.Toast = Toast;
window.Loader = Loader;
