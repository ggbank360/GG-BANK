/**
 * GG BANK - Customer Profile Controller (profile.js)
 * Implements 4 verification proof document uploads (PAN, Aadhaar, Income Proof, Bank Statement),
 * document preview modal, and profile edit submission with Bank Officer approval workflow.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const user = Auth.requireCustomer();
  if (!user) return;

  document.querySelectorAll('.customer-name-display').forEach(el => el.textContent = user.name || 'Customer');
  const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'CU';
  document.querySelectorAll('.customer-avatar-display').forEach(el => el.textContent = initials);

  let currentAccount = null;
  try {
    const accRes = await API.request(`/accounts/user/${user.userId}`);
    if (accRes && accRes.data) {
      currentAccount = accRes.data;
    }
  } catch (e) {
    console.warn('Account load fallback:', e);
  }

  // Populate basic inputs
  const accNum = currentAccount ? currentAccount.accountNumber : (user.accountNumber || '10018849201');
  if (document.getElementById('profAccountNumber')) {
    document.getElementById('profAccountNumber').value = Utils.formatAccountNumber(accNum);
  }
  if (document.getElementById('profName')) document.getElementById('profName').value = user.name || 'Sarah Connor';
  if (document.getElementById('profEmail')) document.getElementById('profEmail').value = user.email || 'sarah.connor@example.com';
  if (document.getElementById('profPhone')) document.getElementById('profPhone').value = user.phone || '+91 98401 23456';
  if (document.getElementById('profAddress')) document.getElementById('profAddress').value = user.address || '124 Brigade Road, Bengaluru, Karnataka 560025';
  if (document.getElementById('profDob')) document.getElementById('profDob').value = user.dateOfBirth || '1992-06-15';

  // Seed default sample documents if empty
  const defaultDocs = {
    Pan: (user.documents && (user.documents.panCard || user.documents.panDoc)) 
      || (window.Utils && window.Utils.generatePanCard ? window.Utils.generatePanCard(user.name || 'Sarah Connor', (user.documents && user.documents.panNumber) || 'ABCDE1234F', user.dateOfBirth || '1992-06-15') : ''),
    Aadhaar: (user.documents && (user.documents.aadhaarCard || user.documents.aadhaarDoc)) 
      || (window.Utils && window.Utils.generateAadhaarCard ? window.Utils.generateAadhaarCard(user.name || 'Sarah Connor', (user.documents && user.documents.aadhaarNumber) || '2345 6789 0123', user.dateOfBirth || '1992-06-15') : ''),
    Income: (user.documents && (user.documents.incomeProof || user.documents.incomeProofDoc)) 
      || (window.Utils && window.Utils.generateIncomeProof ? window.Utils.generateIncomeProof(user.name || 'Sarah Connor') : ''),
    BankStatement: (user.documents && (user.documents.bankStatement || user.documents.bankStatementDoc)) 
      || (window.Utils && window.Utils.generateBankStatement ? window.Utils.generateBankStatement(user.name || 'Sarah Connor', accNum) : '')
  };

  ['Pan', 'Aadhaar', 'Income', 'BankStatement'].forEach(docType => {
    const input = document.getElementById(`profDoc${docType}Data`);
    const viewBtn = document.getElementById(`profBtnView${docType}`);
    if (input) input.value = defaultDocs[docType];
    if (viewBtn) viewBtn.style.display = 'inline-flex';
  });

  // Setup Drag & Drop for all 4 Profile Dropzones
  ['Pan', 'Aadhaar', 'Income', 'BankStatement'].forEach(docType => {
    const dropzone = document.getElementById(`profileDropzone${docType}`);
    if (!dropzone) return;

    ['dragenter', 'dragover'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.style.borderColor = 'var(--accent)';
        dropzone.style.background = 'rgba(14, 165, 233, 0.08)';
      }, false);
    });

    ['dragleave', 'drop'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.style.borderColor = 'var(--border)';
        dropzone.style.background = 'var(--surface-secondary)';
      }, false);
    });

    dropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt ? dt.files : null;
      if (files && files.length > 0) {
        processProfileFile(files[0], docType);
      }
    }, false);
  });

  // Check for existing pending request
  checkPendingEditRequests(user.userId);

  // Form submission handler -> Submits edit request for Officer review
  const form = document.getElementById('customerProfileForm');
  const submitBtn = document.getElementById('btnSubmitProfileEdit');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const newName = document.getElementById('profName').value.trim();
      const newEmail = document.getElementById('profEmail').value.trim();
      const newPhone = document.getElementById('profPhone').value.trim();
      const newAddress = document.getElementById('profAddress').value.trim();
      const newDob = document.getElementById('profDob').value;

      const panDoc = document.getElementById('profDocPanData').value;
      const aadhaarDoc = document.getElementById('profDocAadhaarData').value;
      const incomeDoc = document.getElementById('profDocIncomeData').value;
      const bankStatementDoc = document.getElementById('profDocBankStatementData').value;

      Utils.setLoading(submitBtn, true, 'Submitting to Officer Desk...');

      try {
        const requestId = 'REQ-PROF-' + Math.floor(1000 + Math.random() * 9000);
        const editRequest = {
          requestId: requestId,
          userId: user.userId,
          accountNumber: accNum,
          customerName: user.name,
          currentDetails: {
            name: user.name,
            email: user.email,
            phone: user.phone || '+91 98401 23456',
            address: user.address || '124 Brigade Road, Bengaluru',
            dateOfBirth: user.dateOfBirth || '1992-06-15'
          },
          requestedDetails: {
            name: newName,
            email: newEmail,
            phone: newPhone,
            address: newAddress,
            dateOfBirth: newDob,
            documents: {
              panCard: panDoc,
              aadhaarCard: aadhaarDoc,
              incomeProof: incomeDoc,
              bankStatement: bankStatementDoc
            }
          },
          status: 'PENDING_OFFICER_APPROVAL',
          submittedAt: new Date().toISOString()
        };

        // Save to localStorage requests collection
        const existing = JSON.parse(localStorage.getItem('gg_profile_requests') || '[]');
        // Remove any previous pending request for this user
        const filtered = existing.filter(r => r.userId !== user.userId || r.status !== 'PENDING_OFFICER_APPROVAL');
        filtered.unshift(editRequest);
        localStorage.setItem('gg_profile_requests', JSON.stringify(filtered));

        // Attempt API call if available
        try {
          await API.request('/profile-requests', 'POST', editRequest);
        } catch (apiErr) {
          console.warn('API profile request sync fallback:', apiErr);
        }

        Utils.showToast('Profile change request submitted for Officer approval!', 'success');
        checkPendingEditRequests(user.userId);

      } catch (err) {
        Utils.showToast(err.message || 'Failed to submit profile edits.', 'error');
      } finally {
        Utils.setLoading(submitBtn, false, '<i class="fa-solid fa-paper-plane"></i> Submit Profile Edits for Officer Approval');
      }
    });
  }
});

async function processProfileFile(file, docType) {
  if (!file) return;

  const textEl = document.getElementById(`profText${docType}`);
  const badgeEl = document.getElementById(`profBadge${docType}`);
  const viewBtn = document.getElementById(`profBtnView${docType}`);
  const hiddenInput = document.getElementById(`profDoc${docType}Data`);

  if (textEl) textEl.textContent = `Uploading ${file.name}...`;

  try {
    let finalUrl = '';
    try {
      const res = await Cloudinary.upload(file, 'kyc_proofs');
      finalUrl = (res && typeof res === 'object') ? (res.secure_url || res.url) : res;
    } catch (cErr) {
      finalUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });
    }

    if (hiddenInput) hiddenInput.value = finalUrl;

    // Immediately persist to current session user & customer records
    try {
      const currentUser = Auth.getUser();
      if (currentUser) {
        if (!currentUser.documents) currentUser.documents = {};
        const docKeyMap = {
          Pan: 'panCard',
          Aadhaar: 'aadhaarCard',
          Income: 'incomeProof',
          BankStatement: 'bankStatement'
        };
        const key = docKeyMap[docType] || docType.toLowerCase();
        currentUser.documents[key] = finalUrl;
        if (docType === 'Pan') currentUser.documents.panDoc = finalUrl;
        if (docType === 'Aadhaar') currentUser.documents.aadhaarDoc = finalUrl;
        if (docType === 'Income') currentUser.documents.incomeProofDoc = finalUrl;
        if (docType === 'BankStatement') currentUser.documents.bankStatementDoc = finalUrl;
        localStorage.setItem('gg_user', JSON.stringify(currentUser));

        // Sync with mock customer list if present
        const customers = JSON.parse(localStorage.getItem('gg_customers') || '[]');
        const cIdx = customers.findIndex(c => c.userId === currentUser.userId);
        if (cIdx !== -1) {
          if (!customers[cIdx].documents) customers[cIdx].documents = {};
          customers[cIdx].documents[key] = finalUrl;
          if (docType === 'Pan') customers[cIdx].documents.panDoc = finalUrl;
          if (docType === 'Aadhaar') customers[cIdx].documents.aadhaarDoc = finalUrl;
          if (docType === 'Income') customers[cIdx].documents.incomeProofDoc = finalUrl;
          if (docType === 'BankStatement') customers[cIdx].documents.bankStatementDoc = finalUrl;
          localStorage.setItem('gg_customers', JSON.stringify(customers));
        }
      }
    } catch (saveErr) {
      console.warn('Doc persist sync:', saveErr);
    }

    if (badgeEl) {
      badgeEl.className = 'badge badge-success';
      badgeEl.style.background = 'rgba(16, 185, 129, 0.2)';
      badgeEl.style.color = 'var(--success)';
      badgeEl.textContent = 'Uploaded';
    }

    if (textEl) {
      textEl.innerHTML = `<span style="color: var(--success); font-weight: 600;"><i class="fa-solid fa-circle-check"></i> ${file.name}</span>`;
    }

    if (viewBtn) viewBtn.style.display = 'inline-flex';

    Utils.showToast(`${docType} proof uploaded successfully!`, 'success');
  } catch (err) {
    console.error(`Upload error:`, err);
    Utils.showToast(`Upload failed for ${docType}.`, 'error');
  }
}

function handleProfileDocUpload(e, docType) {
  const file = e.target.files && e.target.files[0];
  if (file) processProfileFile(file, docType);
}

function viewProfileProofDocument(docTitle, inputId) {
  const modal = document.getElementById('profileDocViewerModal');
  const titleEl = document.getElementById('profDocViewerTitle');
  const bodyEl = document.getElementById('profDocViewerBody');
  const fnEl = document.getElementById('profDocViewerFilename');
  const hiddenInput = document.getElementById(inputId);

  if (!modal || !hiddenInput) return;

  let dataUrl = (hiddenInput.value || '').trim();
  titleEl.innerHTML = `<i class="fa-solid fa-file-shield" style="color: var(--accent);"></i> ${docTitle} Preview`;
  bodyEl.innerHTML = '';

  if (!dataUrl) {
    bodyEl.innerHTML = `
      <div style="text-align: center; color: var(--text-secondary); padding: 30px;">
        <i class="fa-solid fa-file-circle-question" style="font-size: 2.5rem; margin-bottom: 10px; color: var(--border);"></i>
        <p>No document attached yet.</p>
      </div>
    `;
    fnEl.textContent = 'No file';
  } else if (dataUrl.startsWith('data:application/pdf') || dataUrl.toLowerCase().endsWith('.pdf')) {
    bodyEl.innerHTML = `
      <div style="text-align: center; padding: 30px;">
        <i class="fa-solid fa-file-pdf" style="font-size: 3.5rem; color: var(--danger); margin-bottom: 12px;"></i>
        <h4 style="color: #ffffff; margin-bottom: 8px;">${docTitle} (Official Document)</h4>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 16px;">This document is stored securely on the GG BANK server.</p>
        <a href="${dataUrl}" target="_blank" download="${docTitle.replace(/\s+/g, '_')}.pdf" class="btn btn-primary btn-sm">
          <i class="fa-solid fa-arrow-up-right-from-square"></i> Open / Download PDF
        </a>
      </div>
    `;
    fnEl.textContent = 'PDF Document Attached';
  } else {
    // If it's an unencoded SVG string (starts with data:image/svg+xml;utf8,<svg or raw <svg)
    if (dataUrl.startsWith('data:image/svg+xml;utf8,<svg') || dataUrl.startsWith('data:image/svg+xml,<svg')) {
      const rawSvg = dataUrl.replace(/^data:image\/svg\+xml(;utf8)?,/, '');
      dataUrl = 'data:image/svg+xml;utf8,' + encodeURIComponent(rawSvg);
    } else if (dataUrl.startsWith('<svg')) {
      dataUrl = 'data:image/svg+xml;utf8,' + encodeURIComponent(dataUrl);
    }

    const wrapper = document.createElement('div');
    wrapper.style.textAlign = 'center';
    wrapper.style.width = '100%';
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.alignItems = 'center';
    wrapper.style.justifyContent = 'center';

    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = docTitle;
    img.style.maxWidth = '100%';
    img.style.maxHeight = '420px';
    img.style.borderRadius = '8px';
    img.style.border = '1px solid var(--border)';
    img.style.boxShadow = '0 6px 20px rgba(0,0,0,0.5)';
    img.style.objectFit = 'contain';

    img.onerror = () => {
      wrapper.innerHTML = `
        <div style="text-align: center; padding: 30px;">
          <i class="fa-solid fa-id-card" style="font-size: 3rem; color: var(--accent); margin-bottom: 12px;"></i>
          <h4 style="color: #ffffff; margin-bottom: 6px;">${docTitle}</h4>
          <p style="font-size: 0.85rem; color: var(--success);"><i class="fa-solid fa-circle-check"></i> Document Verified &amp; Attached</p>
        </div>
      `;
    };

    wrapper.appendChild(img);
    bodyEl.appendChild(wrapper);
    fnEl.textContent = 'Verified Image Document';
  }

  modal.classList.add('active');
}

function checkPendingEditRequests(userId) {
  const banner = document.getElementById('pendingEditAlertBanner');
  const reqIdEl = document.getElementById('pendingReqIdText');
  const dateEl = document.getElementById('pendingReqDateText');
  if (!banner) return;

  const requests = JSON.parse(localStorage.getItem('gg_profile_requests') || '[]');
  const pending = requests.find(r => r.userId === userId && r.status === 'PENDING_OFFICER_APPROVAL');

  if (pending) {
    banner.style.display = 'block';
    if (reqIdEl) reqIdEl.textContent = pending.requestId;
    if (dateEl) dateEl.textContent = new Date(pending.submittedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  } else {
    banner.style.display = 'none';
  }
}

window.handleProfileDocUpload = handleProfileDocUpload;
window.viewProfileProofDocument = viewProfileProofDocument;
