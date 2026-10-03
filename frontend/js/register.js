/**
 * GG BANK - Customer 3-Step Registration Controller (register.js)
 * Step 1: Personal Details
 * Step 2: KYC Documents (Aadhaar, PAN, Address Proof, Photo, Signature)
 * Step 3: Account Details (Savings, Current, Student, Nominee, Password)
 */

let currentStep = 1;

function jumpToStep(step) {
  if (step === currentStep) return;
  if (step > currentStep) {
    if (!validateStep(currentStep)) return;
  }
  setWizardStep(step);
}

function nextWizardStep(fromStep) {
  if (!validateStep(fromStep)) return;
  setWizardStep(fromStep + 1);
}

function prevWizardStep(fromStep) {
  setWizardStep(fromStep - 1);
}

function setWizardStep(step) {
  currentStep = step;
  document.querySelectorAll('.wizard-step').forEach(el => el.classList.remove('active'));
  document.getElementById(`wizardStep${step}`)?.classList.add('active');

  for (let i = 1; i <= 3; i++) {
    const item = document.getElementById(`stepIndicator${i}`);
    const circle = document.getElementById(`stepCircle${i}`);
    if (!item || !circle) continue;

    item.classList.remove('active', 'completed');
    if (i < step) {
      item.classList.add('completed');
      circle.innerHTML = '<i class="fa-solid fa-check"></i>';
    } else if (i === step) {
      item.classList.add('active');
      circle.textContent = i;
    } else {
      circle.textContent = i;
    }
  }

  const progress = document.getElementById('stepperProgress');
  if (progress) {
    progress.style.width = step === 1 ? '0%' : (step === 2 ? '50%' : '100%');
  }
}

function validateStep(step) {
  if (step === 1) {
    const name = document.getElementById('regName').value.trim();
    const dob = document.getElementById('regDob').value;
    const phone = document.getElementById('regPhone').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const address = document.getElementById('regAddress').value.trim();

    if (!name || !dob || !phone || !email || !address) {
      Utils.showToast('Please fill out all Step 1 Personal Details before continuing.', 'warning');
      return false;
    }
    if (!email.includes('@')) {
      Utils.showToast('Please enter a valid email address.', 'error');
      return false;
    }
    return true;
  } else if (step === 2) {
    const aadhaar = document.getElementById('regAadhaarNumber').value.trim();
    const pan = document.getElementById('regPanNumber').value.trim().toUpperCase();

    if (!aadhaar || !pan) {
      Utils.showToast('Please provide Aadhaar and PAN numbers in Step 2.', 'warning');
      return false;
    }

    // Validate PAN format: 5 letters + 4 digits + 1 letter (e.g. ABCDE1234F)
    const panPattern = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panPattern.test(pan)) {
      Utils.showToast('Invalid PAN format. PAN must be like ABCDE1234F (5 letters + 4 digits + 1 letter).', 'error');
      document.getElementById('regPanNumber')?.focus();
      return false;
    }

    // Check for duplicate PAN in existing records
    const existingUsers = API.getMock('gg_users');
    const duplicatePan = existingUsers.find(u =>
      u.role === 'CUSTOMER' &&
      u.documents &&
      u.documents.panNumber &&
      u.documents.panNumber.toUpperCase() === pan
    );
    if (duplicatePan) {
      const existingAccounts = API.getMock('gg_accounts');
      const existingAcc = existingAccounts.find(a => a.userId === duplicatePan.userId);
      const accNum = existingAcc ? existingAcc.accountNumber : 'N/A';
      Utils.showToast(
        `⚠️ PAN "${pan}" already registered! Existing account: ${duplicatePan.name} (Acc: ${accNum}). Please contact the branch.`,
        'error',
        'Duplicate PAN Detected'
      );
      // Highlight PAN field
      const panField = document.getElementById('regPanNumber');
      if (panField) {
        panField.style.borderColor = 'var(--danger)';
        panField.style.boxShadow = '0 0 0 3px rgba(239,68,68,0.25)';
        panField.focus();
      }
      return false;
    }
    return true;
  }
  return true;
}

function selectAccType(type) {
  document.querySelectorAll('.acc-type-card').forEach(c => c.classList.remove('selected'));
  document.getElementById('regAccountType').value = type;

  if (type === 'SAVINGS') {
    document.getElementById('accTypeSavings')?.classList.add('selected');
  } else if (type === 'CURRENT') {
    document.getElementById('accTypeCurrent')?.classList.add('selected');
  } else if (type === 'STUDENT') {
    document.getElementById('accTypeStudent')?.classList.add('selected');
  }
}

async function processDocFile(file, labelId, previewId, hiddenInputId) {
  if (!file) return;

  const label = document.getElementById(labelId);
  const preview = document.getElementById(previewId);
  const hidden = document.getElementById(hiddenInputId);

  if (label) {
    label.innerHTML = `<span style="color: var(--accent-cyan);"><i class="fa-solid fa-spinner fa-spin"></i> Processing ${file.name}...</span>`;
  }

  // 1. Read file as Data URL immediately so the image is ALWAYS available
  const reader = new FileReader();
  reader.onload = async function(e) {
    const dataUrl = e.target.result;
    if (hidden) hidden.value = dataUrl;
    if (preview && file.type.startsWith('image/')) {
      preview.src = dataUrl;
      preview.style.display = 'block';
    }

    // 2. Cloudinary Upload if available (updates hidden value only if valid string URL returned)
    if (window.Cloudinary) {
      try {
        const res = await Cloudinary.upload(file, 'kyc_documents');
        const finalUrl = (res && typeof res === 'object') ? (res.secure_url || res.url) : res;
        if (finalUrl && typeof finalUrl === 'string' && finalUrl.length > 5) {
          if (hidden) hidden.value = finalUrl;
        }
        if (label) {
          label.innerHTML = `<span style="color: var(--success); font-weight: 600;"><i class="fa-solid fa-cloud-arrow-up"></i> ${file.name} (Uploaded)</span>`;
        }
        Utils.showToast(`${file.name} attached & uploaded successfully!`, 'success');
        return;
      } catch (err) {
        console.warn('Cloudinary upload notice, using local file data:', err);
      }
    }

    if (label) {
      label.innerHTML = `<span style="color: var(--success); font-weight: 600;"><i class="fa-solid fa-check"></i> ${file.name} (Attached)</span>`;
    }
    Utils.showToast(`${file.name} attached successfully!`, 'info');
  };
  reader.readAsDataURL(file);
}

async function processSingleImgFile(file, imgId, placeholderId, hiddenInputId) {
  if (!file) return;

  const img = document.getElementById(imgId);
  const placeholder = document.getElementById(placeholderId);
  const hidden = document.getElementById(hiddenInputId);

  // 1. Read file as Data URL immediately
  const reader = new FileReader();
  reader.onload = async function(e) {
    const dataUrl = e.target.result;
    if (hidden) hidden.value = dataUrl;
    if (img) {
      img.src = dataUrl;
      img.style.display = 'block';
    }
    if (placeholder) {
      placeholder.style.display = 'none';
    }

    // 2. Cloudinary Upload if available
    if (window.Cloudinary) {
      try {
        const res = await Cloudinary.upload(file, 'kyc_media');
        const finalUrl = (res && typeof res === 'object') ? (res.secure_url || res.url) : res;
        if (finalUrl && typeof finalUrl === 'string' && finalUrl.length > 5) {
          if (hidden) hidden.value = finalUrl;
        }
        Utils.showToast(`${file.name} attached & uploaded!`, 'success');
        return;
      } catch (err) {
        console.warn('Cloudinary upload notice, using local file data:', err);
      }
    }

    Utils.showToast(`${file.name} attached successfully!`, 'info');
  };
  reader.readAsDataURL(file);
}

function handleDocUpload(event, labelId, previewId, hiddenInputId) {
  const file = event.target.files && event.target.files[0];
  if (file) {
    processDocFile(file, labelId, previewId, hiddenInputId);
  }
}

function handleSingleImgUpload(event, imgId, placeholderId, hiddenInputId) {
  const file = event.target.files && event.target.files[0];
  if (file) {
    processSingleImgFile(file, imgId, placeholderId, hiddenInputId);
  }
}

function setupDropzoneEvents(element, onFileDropped) {
  if (!element) return;

  ['dragenter', 'dragover'].forEach(name => {
    element.addEventListener(name, (e) => {
      e.preventDefault();
      e.stopPropagation();
      element.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(name => {
    element.addEventListener(name, (e) => {
      e.preventDefault();
      e.stopPropagation();
      element.classList.remove('dragover');
    }, false);
  });

  element.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt ? dt.files : null;
    if (files && files.length > 0) {
      onFileDropped(files[0]);
    }
  }, false);
}

function initKycDragAndDrop() {
  // Prevent default window file dropping navigation
  ['dragover', 'drop'].forEach(name => {
    window.addEventListener(name, (e) => {
      e.preventDefault();
    }, false);
  });

  // 1. Aadhaar Card Dropzone
  const aadhaarZone = document.getElementById('aadhaarDropzone');
  if (aadhaarZone) {
    setupDropzoneEvents(aadhaarZone, (file) => {
      processDocFile(file, 'aadhaarUploadLabel', 'aadhaarPreviewThumb', 'aadhaarDocData');
    });
  }

  // 2. PAN Card Dropzone
  const panZone = document.getElementById('panDropzone');
  if (panZone) {
    setupDropzoneEvents(panZone, (file) => {
      processDocFile(file, 'panUploadLabel', 'panPreviewThumb', 'panDocData');
    });
  }

  // 3. Address Proof Dropzone
  const addressZone = document.getElementById('addressProofDropzone');
  if (addressZone) {
    setupDropzoneEvents(addressZone, (file) => {
      processDocFile(file, 'addressProofUploadLabel', 'addressProofPreviewThumb', 'addressProofDocData');
    });
  }

  // 4. Passport Photo Card / Container
  const photoZone = document.getElementById('photoPreviewContainer') || document.getElementById('photoDropzone');
  if (photoZone) {
    setupDropzoneEvents(photoZone, (file) => {
      processSingleImgFile(file, 'photoPreviewImg', 'photoPlaceholderIcon', 'photoDocData');
    });
  }
  const photoCard = document.getElementById('photoDropzone');
  if (photoCard && photoCard !== photoZone) {
    setupDropzoneEvents(photoCard, (file) => {
      processSingleImgFile(file, 'photoPreviewImg', 'photoPlaceholderIcon', 'photoDocData');
    });
  }

  // 5. Signature Card / Container
  const sigZone = document.getElementById('sigPreviewContainer') || document.getElementById('sigDropzone');
  if (sigZone) {
    setupDropzoneEvents(sigZone, (file) => {
      processSingleImgFile(file, 'signaturePreviewImg', 'sigPlaceholderText', 'signatureDocData');
    });
  }
  const sigCard = document.getElementById('sigDropzone');
  if (sigCard && sigCard !== sigZone) {
    setupDropzoneEvents(sigCard, (file) => {
      processSingleImgFile(file, 'signaturePreviewImg', 'sigPlaceholderText', 'signatureDocData');
    });
  }
}

function calculateAge() {
  const dobInput = document.getElementById('regDob');
  if (dobInput && dobInput.value) {
    const b = new Date(dobInput.value);
    const now = new Date();
    let age = now.getFullYear() - b.getFullYear();
    if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) {
      age--;
    }
  }
}

function checkStrength() {
  const val = document.getElementById('regPassword').value;
  const bar = document.getElementById('regStrengthBar');
  const txt = document.getElementById('regStrengthText');
  let score = 0;
  if (val.length >= 8) score += 25;
  if (/[A-Z]/.test(val)) score += 25;
  if (/[0-9]/.test(val)) score += 25;
  if (/[^A-Za-z0-9]/.test(val)) score += 25;

  if (bar) bar.style.width = score + '%';
  if (txt) {
    if (score <= 25) {
      if (bar) bar.style.backgroundColor = 'var(--danger)';
      txt.textContent = 'Weak Password';
      txt.style.color = 'var(--danger)';
    } else if (score <= 50) {
      if (bar) bar.style.backgroundColor = 'var(--warning)';
      txt.textContent = 'Moderate Password';
      txt.style.color = 'var(--warning)';
    } else {
      if (bar) bar.style.backgroundColor = 'var(--success)';
      txt.textContent = 'Strong Password';
      txt.style.color = 'var(--success)';
    }
  }
}

function togglePass(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  if (input.type === 'password') {
    input.type = 'text';
    icon.classList.remove('fa-eye');
    icon.classList.add('fa-eye-slash');
  } else {
    input.type = 'password';
    icon.classList.remove('fa-eye-slash');
    icon.classList.add('fa-eye');
  }
}

function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('gg_theme', next);

  const icon = document.getElementById('themeToggleIcon');
  const text = document.getElementById('themeToggleText');
  if (icon) icon.className = next === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  if (text) text.textContent = next === 'dark' ? 'Light Mode' : 'Dark Mode';
}

function fillDemoKYCApplicant() {
  document.getElementById('regName').value = 'Sarah Connor';
  document.getElementById('regDob').value = '2001-11-20';
  document.getElementById('regGender').value = 'Female';
  document.getElementById('regPhone').value = '9123456780';
  document.getElementById('regEmail').value = 'sarah.new' + Math.floor(Math.random() * 900 + 100) + '@ggbank.com';
  document.getElementById('regAddress').value = '120 Silicon Park, Tech Corridor, Chennai';
  document.getElementById('regOccupation').value = 'Salaried Employee';

  document.getElementById('regAadhaarNumber').value = '5421 8976 1234';
  document.getElementById('regPanNumber').value = 'SARAH7890K';
  const addrTypeEl = document.getElementById('regAddressProofType');
  if (addrTypeEl) addrTypeEl.value = 'Electricity Bill';

  const sampleSvg = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="180" viewBox="0 0 300 180"><rect width="300" height="180" fill="%23172752" rx="10"/><text x="20" y="35" fill="%2300f0ff" font-family="sans-serif" font-weight="bold" font-size="14">GOVERNMENT OF INDIA</text><text x="20" y="70" fill="%23fff" font-family="sans-serif" font-size="12">IDENTIFICATION DOCUMENT</text><rect x="20" y="90" width="70" height="70" fill="%2338bdf8" rx="5"/><text x="105" y="115" fill="%23e2e8f0" font-family="monospace" font-size="13">VERIFIED ID CARD</text><text x="105" y="140" fill="%2310b981" font-family="sans-serif" font-weight="bold" font-size="12">&#x2714; SECURE CHIP</text></svg>';
  
  document.getElementById('panDocData').value = sampleSvg;
  document.getElementById('panPreviewThumb').src = sampleSvg;
  document.getElementById('panPreviewThumb').style.display = 'block';
  document.getElementById('panUploadLabel').textContent = 'PAN Card Attached';

  document.getElementById('aadhaarDocData').value = sampleSvg;
  document.getElementById('aadhaarPreviewThumb').src = sampleSvg;
  document.getElementById('aadhaarPreviewThumb').style.display = 'block';
  document.getElementById('aadhaarUploadLabel').textContent = 'Aadhaar Card Attached';

  const addrDocEl = document.getElementById('addressProofDocData');
  if (addrDocEl) addrDocEl.value = sampleSvg;
  const addrThumb = document.getElementById('addressProofPreviewThumb');
  if (addrThumb) { addrThumb.src = sampleSvg; addrThumb.style.display = 'block'; }
  const addrLbl = document.getElementById('addressProofUploadLabel');
  if (addrLbl) addrLbl.textContent = 'Address Proof Attached';

  const photoSvg = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><circle cx="60" cy="60" r="60" fill="%230284c7"/><text x="60" y="70" fill="%23fff" font-size="40" text-anchor="middle">👤</text></svg>';
  document.getElementById('photoDocData').value = photoSvg;
  document.getElementById('photoPreviewImg').src = photoSvg;
  document.getElementById('photoPreviewImg').style.display = 'block';
  document.getElementById('photoPlaceholderIcon').style.display = 'none';

  const sigSvg = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60" viewBox="0 0 200 60"><text x="20" y="42" fill="%2300f0ff" font-family="cursive" font-size="28" font-weight="bold">Sarah C.</text></svg>';
  document.getElementById('signatureDocData').value = sigSvg;
  document.getElementById('signaturePreviewImg').src = sigSvg;
  document.getElementById('signaturePreviewImg').style.display = 'block';
  document.getElementById('sigPlaceholderText').style.display = 'none';

  selectAccType('SAVINGS');
  document.getElementById('regNomineeName').value = 'John Connor';
  document.getElementById('regNomineeRelation').value = 'Son';
  document.getElementById('regNomineePhone').value = '9876543211';
  document.getElementById('regPassword').value = 'Password@123';
  checkStrength();

  Utils.showToast('Demo applicant details & documents attached for all 3 steps!', 'success');
}

document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('gg_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  const icon = document.getElementById('themeToggleIcon');
  const text = document.getElementById('themeToggleText');
  if (icon) icon.className = saved === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  if (text) text.textContent = saved === 'dark' ? 'Light Mode' : 'Dark Mode';

  // Initialize Drag and Drop on all KYC upload dropzones
  initKycDragAndDrop();

  // ── Live PAN Duplicate Detection ──
  const panInput = document.getElementById('regPanNumber');
  if (panInput) {
    let panCheckTimer = null;
    panInput.addEventListener('input', () => {
      // Reset styling
      panInput.style.borderColor = '';
      panInput.style.boxShadow = '';
      // Remove any existing PAN warning
      const existingWarn = document.getElementById('panDuplicateWarning');
      if (existingWarn) existingWarn.remove();

      clearTimeout(panCheckTimer);
      const val = panInput.value.trim().toUpperCase();
      if (val.length < 10) return; // PAN is exactly 10 chars

      panCheckTimer = setTimeout(() => {
        const users = API.getMock('gg_users');
        const dup = users.find(u =>
          u.role === 'CUSTOMER' &&
          u.documents &&
          u.documents.panNumber &&
          u.documents.panNumber.toUpperCase() === val
        );
        if (dup) {
          const accounts = API.getMock('gg_accounts');
          const acc = accounts.find(a => a.userId === dup.userId);
          const accNum = acc ? acc.accountNumber : 'N/A';

          // Show inline warning below PAN field
          const warn = document.createElement('div');
          warn.id = 'panDuplicateWarning';
          warn.style.cssText = 'margin-top:6px;padding:8px 12px;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.4);border-radius:8px;font-size:0.82rem;color:#fca5a5;display:flex;align-items:flex-start;gap:8px;line-height:1.4;';
          warn.innerHTML = `
            <i class="fa-solid fa-triangle-exclamation" style="color:#ef4444;margin-top:2px;flex-shrink:0;"></i>
            <span>
              <strong style="color:#f87171;">⚠️ Duplicate PAN Detected</strong><br>
              PAN <strong style="font-family:monospace;">${val}</strong> is already registered to
              <strong>${dup.name}</strong> (Account: <span style="font-family:monospace;">${accNum}</span>).
              This application will be flagged for Admin review.
            </span>
          `;
          panInput.parentNode.insertAdjacentElement('afterend', warn);

          // Style the PAN field red
          panInput.style.borderColor = 'var(--danger)';
          panInput.style.boxShadow = '0 0 0 3px rgba(239,68,68,0.2)';
        } else {
          // PAN is available
          panInput.style.borderColor = 'var(--success)';
          panInput.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.2)';
          // Show green tick
          const ok = document.createElement('div');
          ok.id = 'panDuplicateWarning';
          ok.style.cssText = 'margin-top:5px;font-size:0.78rem;color:var(--success);display:flex;align-items:center;gap:5px;';
          ok.innerHTML = '<i class="fa-solid fa-circle-check"></i> PAN is available and unique.';
          panInput.parentNode.insertAdjacentElement('afterend', ok);
        }
      }, 600);
    });
  }

  const form = document.getElementById('customerRegisterForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('regName').value.trim();
      const dob = document.getElementById('regDob').value;
      const gender = document.getElementById('regGender').value;
      const phone = document.getElementById('regPhone').value.trim();
      const email = document.getElementById('regEmail').value.trim();
      const address = document.getElementById('regAddress').value.trim();
      const occupation = document.getElementById('regOccupation').value;
      
      const aadhaarNumber = document.getElementById('regAadhaarNumber').value.trim();
      const aadhaarDoc = document.getElementById('aadhaarDocData').value;
      const panNumber = document.getElementById('regPanNumber').value.trim().toUpperCase();
      const panDoc = document.getElementById('panDocData').value;
      const addressProofType = document.getElementById('regAddressProofType') ? document.getElementById('regAddressProofType').value : 'Not Required';
      const addressProofDoc = document.getElementById('addressProofDocData') ? document.getElementById('addressProofDocData').value : '';
      const photoDoc = document.getElementById('photoDocData').value;
      const signatureDoc = document.getElementById('signatureDocData').value;

      const accountType = document.getElementById('regAccountType').value;
      const nomineeName = document.getElementById('regNomineeName').value.trim();
      const nomineeRelation = document.getElementById('regNomineeRelation').value;
      const nomineePhone = document.getElementById('regNomineePhone').value.trim();
      const pass = document.getElementById('regPassword').value;

      const btn = document.getElementById('btnRegisterSubmit');

      if (!panNumber || !aadhaarNumber) {
        Utils.showToast('Please provide both PAN and Aadhaar numbers.', 'error');
        setWizardStep(2);
        return;
      }

      Utils.setLoading(btn, true, 'Submitting Application...');

      try {
        const res = await API.request('/users/register', 'POST', {
          name,
          email,
          phone,
          dateOfBirth: dob,
          gender,
          address,
          occupation,
          accountType,
          password: pass,
          panNumber,
          panDoc,
          aadhaarNumber,
          aadhaarDoc,
          addressProofType,
          addressProofDoc,
          photoDoc,
          signatureDoc,
          nomineeName,
          nomineeRelation,
          nomineePhone
        });

        const createdAcc = res.data && res.data.account ? res.data.account : {
          accountNumber: '100188' + Math.floor(10000 + Math.random() * 90000),
          accountType: accountType
        };

        const successData = {
          name: name,
          accountNumber: createdAcc.accountNumber,
          accountType: createdAcc.accountType || accountType,
          balance: 0.00,
          createdDate: new Date().toLocaleDateString('en-GB'),
          email: email
        };
        sessionStorage.setItem('gg_new_account_created', JSON.stringify(successData));

        Utils.showToast('Account application submitted! Awaiting Admin Approval.', 'success');

        setTimeout(() => {
          window.location.href = `account-created.html?accountNumber=${createdAcc.accountNumber}`;
        }, 600);

      } catch (err) {
        Utils.showToast(err.message, 'error', 'Registration Failed');
      } finally {
        Utils.setLoading(btn, false);
      }
    });
  }
});

// Global bindings
window.handleDocUpload = handleDocUpload;
window.handleSingleImgUpload = handleSingleImgUpload;
window.processDocFile = processDocFile;
window.processSingleImgFile = processSingleImgFile;
window.initKycDragAndDrop = initKycDragAndDrop;
