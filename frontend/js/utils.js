/**
 * GG BANK - Utility & Helper Library (utils.js)
 * Includes Toast System, Loading Indicators, Clipboard Copying, and PDF Generators
 */

const Utils = {
  // Toast Notification System
  showToast(message, type = 'info', title = null, duration = 4000) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const iconMap = {
      success: '<i class="fa-solid fa-circle-check" style="color: var(--success); font-size: 1.2rem;"></i>',
      error: '<i class="fa-solid fa-circle-xmark" style="color: var(--danger); font-size: 1.2rem;"></i>',
      warning: '<i class="fa-solid fa-triangle-exclamation" style="color: var(--warning); font-size: 1.2rem;"></i>',
      info: '<i class="fa-solid fa-circle-info" style="color: var(--accent-cyan); font-size: 1.2rem;"></i>'
    };

    const titleMap = {
      success: title || 'Success',
      error: title || 'Error',
      warning: title || 'Warning',
      info: title || 'Notification'
    };

    toast.innerHTML = `
      <div>${iconMap[type] || iconMap.info}</div>
      <div class="toast-content" style="flex: 1;">
        <div style="font-size: 0.9rem; font-weight: 700; color: var(--text-primary);">${titleMap[type]}</div>
        <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 2px;">${message}</div>
      </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  // Loading Helper for Buttons
  setLoading(btnElement, isLoading, loadingText = 'Processing...') {
    if (!btnElement) return;
    if (isLoading) {
      btnElement.dataset.origText = btnElement.innerHTML;
      btnElement.disabled = true;
      btnElement.innerHTML = `<span class="spinner"></span> ${loadingText}`;
    } else {
      btnElement.disabled = false;
      if (btnElement.dataset.origText) {
        btnElement.innerHTML = btnElement.dataset.origText;
      }
    }
  },

  // Copy to Clipboard with User Toast
  async copyToClipboard(text, customMessage = 'Account number copied successfully.') {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-999999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      this.showToast(customMessage, 'success', 'Copied!');
      return true;
    } catch (err) {
      this.showToast('Failed to copy text.', 'error');
      return false;
    }
  },

  // Format Currency (INR)
  formatCurrency(amount) {
    const val = parseFloat(amount) || 0;
    return '₹' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },

  // Format 11-digit Account Number (e.g., 1234 5678 901)
  formatAccountNumber(accNum) {
    if (!accNum) return '•••• •••• •••';
    const str = accNum.toString().trim();
    if (str.length === 12) {
      return `${str.slice(0, 4)} ${str.slice(4, 8)} ${str.slice(8, 12)}`;
    }
    return str;
  },

  // Generate Downloadable Account Details PDF (jsPDF)
  downloadAccountDetailsPDF(customerDetails) {
    if (typeof window.jspdf === 'undefined' && typeof jsPDF === 'undefined') {
      this.showToast('PDF generator library not loaded.', 'error');
      return;
    }

    const { jsPDF } = window.jspdf || window;
    const doc = new jsPDF();

    // Palette
    const navy = [7, 13, 30];
    const cyan = [0, 240, 255];

    // Header Banner
    doc.setFillColor(...navy);
    doc.rect(0, 0, 210, 45, 'F');

    // Branding
    doc.setTextColor(...cyan);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('GG BANK', 14, 22);

    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal');
    doc.text('Smart Digital Banking Management System', 14, 29);
    doc.text('"Secure Banking. Smarter Future."', 14, 36);

    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('ACCOUNT CREATION CERTIFICATE', 115, 25);

    // Details Box
    doc.setFillColor(245, 248, 252);
    doc.roundedRect(14, 55, 182, 90, 4, 4, 'F');

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');

    const fields = [
      ['Customer Name:', customerDetails.name || 'Customer'],
      ['11-Digit Account Number:', customerDetails.accountNumber || '12345678901'],
      ['Account Type:', customerDetails.accountType || 'Savings Account'],
      ['Initial Balance:', 'Rs. 0.00'],
      ['Account Status:', 'ACTIVE'],
      ['IFSC Code:', 'GGBN0001234'],
      ['Branch:', 'Central Tech Branch'],
      ['Creation Date:', customerDetails.createdDate || new Date().toLocaleDateString('en-GB')]
    ];

    let y = 70;
    fields.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, 22, y);
      doc.setFont('helvetica', label.includes('Account Number') ? 'bold' : 'normal');
      if (label.includes('Account Number')) {
        doc.setTextColor(0, 114, 255);
      } else {
        doc.setTextColor(15, 23, 42);
      }
      doc.text(value, 90, y);
      y += 9;
    });

    // Security Notice
    doc.setFillColor(254, 243, 199);
    doc.roundedRect(14, 155, 182, 30, 3, 3, 'F');
    doc.setFontSize(9);
    doc.setTextColor(146, 64, 14);
    doc.setFont('helvetica', 'bold');
    doc.text('IMPORTANT SECURITY NOTICE:', 20, 164);
    doc.setFont('helvetica', 'normal');
    doc.text('Please save your 11-digit account number securely. You will require this number every time you log in.', 20, 172);
    doc.text('Never share your internet banking password or OTP with anyone.', 20, 178);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('GG BANK Academic Digital Banking System - Generated for demonstration purposes.', 14, 285);

    doc.save(`GG_BANK_Account_${customerDetails.accountNumber}.pdf`);
    this.showToast('Account details PDF downloaded successfully!', 'success');
  }
};

window.Utils = Utils;
window.Toast = window.Toast || {
  show: (m, type, title) => Utils.showToast(m, type, title),
  success: (m, title) => Utils.showToast(m, 'success', title),
  error: (m, title) => Utils.showToast(m, 'error', title),
  warning: (m, title) => Utils.showToast(m, 'warning', title),
  info: (m, title) => Utils.showToast(m, 'info', title)
};
window.Loader = window.Loader || {
  start: (btn, text) => Utils.setLoading(btn, true, text),
  stop: (btn) => Utils.setLoading(btn, false)
};
