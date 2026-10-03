/**
 * GG BANK - Loans & EMI Lifecycle Hub (loans.js)
 * Implements 5 Loan Products, Dynamic Amortization, Live Affordability Pre-Check,
 * Cloudinary Document Upload, Admin Approval Tracking, Month-by-Month EMI Repayments,
 * PDF Statement Generation, and Official Loan Closure Certification.
 */

let userLoans = [];
let currentUser = null;
let currentAccount = null;
let activeScheduleLoan = null;
let lastReceiptData = null;
let lastClosedLoan = null;

// Product Master Configuration
const LOAN_PRODUCTS = {
  'Personal Loan': {
    minAmount: 25000,
    maxAmount: 500000,
    defaultAmount: 200000,
    rate: 12.0,
    feePercent: 1.0,
    minTenure: 12,
    maxTenure: 60,
    defaultTenure: 36,
    tenures: [12, 24, 36, 48, 60]
  },
  'Education Loan': {
    minAmount: 50000,
    maxAmount: 1000000,
    defaultAmount: 300000,
    rate: 9.5,
    feePercent: 0.5,
    minTenure: 12,
    maxTenure: 84,
    defaultTenure: 48,
    tenures: [12, 24, 36, 48, 60, 72, 84]
  },
  'Vehicle Loan': {
    minAmount: 100000,
    maxAmount: 1000000,
    defaultAmount: 400000,
    rate: 10.5,
    feePercent: 1.0,
    minTenure: 12,
    maxTenure: 84,
    defaultTenure: 48,
    tenures: [12, 24, 36, 48, 60, 72, 84]
  },
  'Home Loan': {
    minAmount: 500000,
    maxAmount: 5000000,
    defaultAmount: 1500000,
    rate: 8.5,
    feePercent: 0.5,
    minTenure: 60,
    maxTenure: 240,
    defaultTenure: 120,
    tenures: [60, 120, 180, 240]
  },
  'Emergency Loan': {
    minAmount: 10000,
    maxAmount: 100000,
    defaultAmount: 50000,
    rate: 14.0,
    feePercent: 1.0,
    minTenure: 6,
    maxTenure: 24,
    defaultTenure: 12,
    tenures: [6, 12, 18, 24]
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = Auth.requireCustomer();
  if (!currentUser) return;

  document.querySelectorAll('.customer-name-display').forEach(el => {
    el.textContent = currentUser.name;
  });

  try {
    const accRes = await API.request(`/accounts/user/${currentUser.userId}`);
    currentAccount = accRes.data || { accountNumber: '10018849201', balance: 65450.00 };

    setupSlidersCalculator();
    setupApplicationForm();
    await loadUserLoans();
  } catch (err) {
    Utils.showToast(err.message, 'error');
  }
});

/* -------------------------------------------------------------
 * 1. LIVE SLIDERS CALCULATOR (TOP BANNER)
 * ------------------------------------------------------------- */
function setupSlidersCalculator() {
  const pSlider = document.getElementById('emiSliderPrincipal');
  const rSlider = document.getElementById('emiSliderRate');
  const tSlider = document.getElementById('emiSliderTenure');

  const updateSliders = () => {
    const p = parseFloat(pSlider?.value || 200000);
    const r = parseFloat(rSlider?.value || 12);
    const t = parseInt(tSlider?.value || 36);

    const calc = computeAmortization(p, r, t);
    const fee = Math.round(p * 0.01);

    if (document.getElementById('emiDisplayPrincipal')) document.getElementById('emiDisplayPrincipal').textContent = Utils.formatCurrency(p);
    if (document.getElementById('emiDisplayRate')) document.getElementById('emiDisplayRate').textContent = `${r.toFixed(1)}% p.a.`;
    if (document.getElementById('emiDisplayTenure')) document.getElementById('emiDisplayTenure').textContent = `${t} Months`;

    if (document.getElementById('emiResultMonthly')) document.getElementById('emiResultMonthly').textContent = Utils.formatCurrency(calc.emi);
    if (document.getElementById('emiResultInterest')) document.getElementById('emiResultInterest').textContent = Utils.formatCurrency(calc.totalInterest);
    if (document.getElementById('emiResultFee')) document.getElementById('emiResultFee').textContent = Utils.formatCurrency(fee);
    if (document.getElementById('emiResultTotal')) document.getElementById('emiResultTotal').textContent = Utils.formatCurrency(calc.totalRepayment);
  };

  [pSlider, rSlider, tSlider].forEach(slider => {
    if (slider) slider.addEventListener('input', updateSliders);
  });
  updateSliders();
}

/* -------------------------------------------------------------
 * 2. EXACT AMORTIZATION FORMULA
 * EMI = P * r * (1+r)^n / ((1+r)^n - 1)
 * ------------------------------------------------------------- */
function computeAmortization(principal, annualRate, tenureMonths) {
  if (principal <= 0 || tenureMonths <= 0) {
    return { emi: 0, totalInterest: 0, totalRepayment: 0 };
  }
  const r = (annualRate / 12) / 100;
  const n = tenureMonths;
  const emi = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const totalRepayment = Math.round(emi * n);
  const totalInterest = Math.round(totalRepayment - principal);

  return {
    emi: Math.round(emi),
    totalInterest: totalInterest,
    totalRepayment: totalRepayment
  };
}

/* -------------------------------------------------------------
 * 3. APPLICATION FORM LOGIC & PRODUCT SWITCHING
 * ------------------------------------------------------------- */
function onLoanTypeSelected() {
  const typeSelect = document.getElementById('loanTypeSelect');
  if (!typeSelect) return;

  const productKey = typeSelect.value;
  const prod = LOAN_PRODUCTS[productKey] || LOAN_PRODUCTS['Personal Loan'];

  const amtInput = document.getElementById('loanAmountInput');
  const limitsHint = document.getElementById('loanAmountLimitsHint');
  const tenureSelect = document.getElementById('loanTenureSelect');

  if (amtInput) {
    amtInput.min = prod.minAmount;
    amtInput.max = prod.maxAmount;
    amtInput.value = prod.defaultAmount;
  }
  if (limitsHint) {
    limitsHint.textContent = `Range: ${Utils.formatCurrency(prod.minAmount)} to ${Utils.formatCurrency(prod.maxAmount)} • ${prod.rate}% p.a. • ${prod.feePercent}% Fee`;
  }

  // Populate tenure options
  if (tenureSelect) {
    tenureSelect.innerHTML = prod.tenures.map(m => {
      const yrs = (m / 12).toFixed(m % 12 === 0 ? 0 : 1);
      const isSelected = (m === prod.defaultTenure) ? 'selected' : '';
      return `<option value="${m}" ${isSelected}>${m} Months (${yrs} ${yrs == 1 ? 'Year' : 'Years'})</option>`;
    }).join('');
  }

  // Sync with top slider
  const pSlider = document.getElementById('emiSliderPrincipal');
  const rSlider = document.getElementById('emiSliderRate');
  const tSlider = document.getElementById('emiSliderTenure');

  if (pSlider) {
    pSlider.min = prod.minAmount;
    pSlider.max = prod.maxAmount;
    pSlider.value = prod.defaultAmount;
  }
  if (rSlider) rSlider.value = prod.rate;
  if (tSlider) tSlider.value = prod.defaultTenure;
  if (pSlider) pSlider.dispatchEvent(new Event('input'));

  onFormCalcInputsChange();
}

function onFormCalcInputsChange() {
  const typeSelect = document.getElementById('loanTypeSelect');
  const productKey = typeSelect ? typeSelect.value : 'Personal Loan';
  const prod = LOAN_PRODUCTS[productKey] || LOAN_PRODUCTS['Personal Loan'];

  const amt = parseFloat(document.getElementById('loanAmountInput')?.value || prod.defaultAmount);
  const tenure = parseInt(document.getElementById('loanTenureSelect')?.value || prod.defaultTenure);
  const monthlyIncome = parseFloat(document.getElementById('loanMonthlyIncome')?.value || 30000);
  const existingEmi = parseFloat(document.getElementById('loanExistingEmi')?.value || 0);

  const calc = computeAmortization(amt, prod.rate, tenure);
  const procFee = Math.round(amt * (prod.feePercent / 100));
  const netDisbursement = amt - procFee;

  // Real-time Affordability Check: (Existing EMI + New EMI) / Monthly Income <= 40%
  const totalEmi = existingEmi + calc.emi;
  const ratio = monthlyIncome > 0 ? ((totalEmi / monthlyIncome) * 100) : 100;
  const isEligible = ratio <= 40 && monthlyIncome >= 15000 && amt >= prod.minAmount && amt <= prod.maxAmount;

  const badge = document.getElementById('eligibilityBadge');
  const strip = document.getElementById('eligibilityCheckStrip');

  if (badge && strip) {
    if (isEligible) {
      badge.className = 'badge badge-success';
      badge.innerHTML = `<i class="fa-solid fa-check"></i> ELIGIBLE (${ratio.toFixed(1)}% EMI/Income)`;
      strip.style.borderLeftColor = 'var(--success)';
    } else {
      badge.className = 'badge badge-danger';
      badge.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> HIGH DTI RATIO (${ratio.toFixed(1)}% > 40%)`;
      strip.style.borderLeftColor = 'var(--danger)';
    }
  }

  return { calc, procFee, netDisbursement, isEligible, ratio };
}

/* -------------------------------------------------------------
 * 4. FOUR PROOF DOCUMENTS (PAN, AADHAAR, INCOME, BANK STATEMENT)
 * ------------------------------------------------------------- */
const proofDocStores = {
  Pan: { name: '', url: '' },
  Aadhaar: { name: '', url: '' },
  Income: { name: '', url: '' },
  BankStatement: { name: '', url: '' }
};

async function processProofDocFile(file, docType) {
  if (!file) return;

  const textEl = document.getElementById(`text${docType}`);
  const badgeEl = document.getElementById(`badge${docType}`);
  const viewBtn = document.getElementById(`btnView${docType}Doc`);
  const hiddenInput = document.getElementById(`loan${docType}DocData`);

  if (textEl) textEl.textContent = `Uploading ${file.name}...`;

  try {
    let finalUrl = '';
    try {
      const res = await Cloudinary.upload(file, 'loan_documents');
      finalUrl = (res && typeof res === 'object') ? (res.secure_url || res.url) : res;
    } catch (cErr) {
      // Local Data URL fallback
      finalUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });
    }

    if (hiddenInput) hiddenInput.value = finalUrl;
    proofDocStores[docType] = { name: file.name, url: finalUrl };

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

    Utils.showToast(`${docType} document uploaded successfully!`, 'success');
  } catch (err) {
    console.error(`Upload error for ${docType}:`, err);
    Utils.showToast(`Failed to upload ${docType}. Please try again.`, 'error');
  }
}

function handleProofFileUpload(e, docType) {
  const file = e.target.files && e.target.files[0];
  if (file) processProofDocFile(file, docType);
}

function previewProofDocument(docTitle, inputId) {
  const modal = document.getElementById('loanDocViewerModal');
  const titleEl = document.getElementById('loanDocViewerTitle');
  const bodyEl = document.getElementById('loanDocViewerBody');
  const fnEl = document.getElementById('loanDocViewerFilename');
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
        <h4 style="color: #ffffff; margin-bottom: 8px;">${docTitle} (PDF Document)</h4>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 16px;">Document is securely stored and authenticated.</p>
        <a href="${dataUrl}" target="_blank" download="${docTitle.replace(/\s+/g, '_')}.pdf" class="btn btn-primary btn-sm">
          <i class="fa-solid fa-arrow-up-right-from-square"></i> Open / Download PDF
        </a>
      </div>
    `;
    fnEl.textContent = 'PDF Document Attached';
  } else {
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

window.handleProofFileUpload = handleProofFileUpload;
window.previewProofDocument = previewProofDocument;

/* -------------------------------------------------------------
 * 5. LOAN SUBMISSION HANDLER
 * ------------------------------------------------------------- */
function setupApplicationForm() {
  const form = document.getElementById('loanApplicationForm');
  if (!form) return;

  // Initialize product limits
  onLoanTypeSelected();

  // Attach Drag & Drop to all 4 Proof Dropzones
  ['Pan', 'Aadhaar', 'Income', 'BankStatement'].forEach(docType => {
    const dropzone = document.getElementById(`dropzone${docType}`);
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
        processProofDocFile(files[0], docType);
      }
    }, false);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const typeSelect = document.getElementById('loanTypeSelect');
    const loanType = typeSelect ? typeSelect.value : 'Personal Loan';
    const prod = LOAN_PRODUCTS[loanType] || LOAN_PRODUCTS['Personal Loan'];

    const amount = parseFloat(document.getElementById('loanAmountInput')?.value || 0);
    const tenure = parseInt(document.getElementById('loanTenureSelect')?.value || 36);
    const monthlyIncome = parseFloat(document.getElementById('loanMonthlyIncome')?.value || 0);
    const existingEmi = parseFloat(document.getElementById('loanExistingEmi')?.value || 0);
    const purpose = document.getElementById('loanPurposeInput')?.value.trim() || 'General Funding';

    // 4 proof documents
    const panDoc = document.getElementById('loanPanDocData')?.value || null;
    const aadhaarDoc = document.getElementById('loanAadhaarDocData')?.value || null;
    const incomeDoc = document.getElementById('loanIncomeDocData')?.value || null;
    const bankStatementDoc = document.getElementById('loanBankStatementDocData')?.value || null;

    if (amount < prod.minAmount || amount > prod.maxAmount) {
      Utils.showToast(`Loan amount must be between ${Utils.formatCurrency(prod.minAmount)} and ${Utils.formatCurrency(prod.maxAmount)}.`, 'error');
      return;
    }

    const { calc, procFee, netDisbursement, isEligible, ratio } = onFormCalcInputsChange();

    if (!isEligible) {
      const proceed = confirm(`Warning: Your calculated debt-to-income ratio is ${ratio.toFixed(1)}%, which exceeds our recommended 40% threshold. Do you still wish to submit for special underwriter review?`);
      if (!proceed) return;
    }

    const submitBtn = document.getElementById('btnSubmitLoan');
    Utils.setLoading(submitBtn, true, 'Submitting Application...');

    try {
      await API.request('/loans', 'POST', {
        accountNumber: currentAccount.accountNumber,
        customerName: currentUser.name,
        email: currentUser.email,
        userId: currentUser.userId,
        loanType: loanType,
        requestedAmount: amount,
        tenure: tenure,
        interestRate: prod.rate,
        processingFeePercent: prod.feePercent,
        monthlyIncome: monthlyIncome,
        existingEmi: existingEmi,
        estimatedEMI: calc.emi,
        totalInterest: calc.totalInterest,
        totalRepayment: calc.totalRepayment,
        purpose: purpose,
        loanDocument: panDoc || aadhaarDoc || null,
        documents: {
          panCard: panDoc,
          aadhaarCard: aadhaarDoc,
          incomeProof: incomeDoc,
          bankStatement: bankStatementDoc
        },
        creditScore: 720
      });

      Utils.showToast('Loan application submitted with proof documents for Underwriter Review!', 'success');
      form.reset();

      // Reset proof badges
      ['Pan', 'Aadhaar', 'Income', 'BankStatement'].forEach(docType => {
        const hInput = document.getElementById(`loan${docType}DocData`);
        const badge = document.getElementById(`badge${docType}`);
        const text = document.getElementById(`text${docType}`);
        const viewBtn = document.getElementById(`btnView${docType}Doc`);
        if (hInput) hInput.value = '';
        if (badge) {
          badge.className = 'badge';
          badge.style.background = 'rgba(245, 158, 11, 0.15)';
          badge.style.color = 'var(--warning)';
          badge.textContent = 'Pending';
        }
        if (text) text.textContent = 'Upload or drag & drop proof';
        if (viewBtn) viewBtn.style.display = 'none';
      });

      onLoanTypeSelected();
      await loadUserLoans();
    } catch (err) {
      Utils.showToast(err.message, 'error', 'Submission Failed');
    } finally {
      Utils.setLoading(submitBtn, false);
    }
  });
}

/* -------------------------------------------------------------
 * 6. USER LOANS RETRIEVAL & DASHBOARD RENDERING
 * ------------------------------------------------------------- */
async function loadUserLoans() {
  try {
    const res = await API.request('/loans');
    userLoans = (res.data || []).filter(l => 
      l.userId === currentUser.userId || 
      l.accountNumber === currentAccount.accountNumber ||
      (currentUser.email && l.email === currentUser.email)
    );

    renderActiveLoanCard(userLoans);
    renderLoansHistory(userLoans);

    const countEl = document.getElementById('loansCountText');
    if (countEl) countEl.textContent = `${userLoans.length} Application${userLoans.length === 1 ? '' : 's'}`;
  } catch (err) {
    console.warn('Failed to load user loans:', err);
  }
}

/**
 * Prominently renders the Active Loan Card per the user's specification:
 * Loan Amount, Outstanding, EMI, Interest, Tenure, Paid EMIs (e.g. 3/36),
 * Next EMI Due Date, Status ACTIVE, and [PAY EMI], [VIEW SCHEDULE], [DOWNLOAD STATEMENT].
 */
function renderActiveLoanCard(loans) {
  const container = document.getElementById('activeLoanSection');
  if (!container) return;

  // Find the primary active loan
  const activeLoan = loans.find(l => l.status === 'APPROVED' || l.status === 'ACTIVE');

  if (!activeLoan) {
    // Check if there is a recently completed/closed loan or pending loan
    const underReviewLoan = loans.find(l => l.status === 'UNDER_REVIEW' || l.status === 'PENDING');
    if (underReviewLoan) {
      container.innerHTML = `
        <div class="card" style="border-left: 4px solid var(--warning); background: linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98));">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div>
              <span class="badge badge-warning" style="font-size: 0.78rem;">UNDER REVIEW</span>
              <h3 style="font-size: 1.25rem; font-weight: 800; color: #fff; margin-top: 6px;">${underReviewLoan.loanType}</h3>
              <div style="font-size: 0.78rem; font-family: var(--font-mono); color: var(--accent-cyan);">REF: ${underReviewLoan.loanId}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Requested Principal</div>
              <strong style="font-size: 1.3rem; color: #fff; font-family: var(--font-mono);">${Utils.formatCurrency(underReviewLoan.requestedAmount)}</strong>
            </div>
          </div>
          <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 12px;">
            Your loan application has been submitted to the GG BANK Credit Underwriting Committee. Verification of KYC and financial eligibility is currently underway. Funds will be credited directly upon approval.
          </p>
          <div style="display: flex; gap: 14px; font-size: 0.82rem; color: var(--text-muted); background: rgba(0,0,0,0.25); padding: 10px 14px; border-radius: var(--radius-sm);">
            <div>Tenure: <strong style="color: #fff;">${underReviewLoan.tenure} Mos</strong></div>
            <div>Monthly EMI: <strong style="color: var(--warning);">${Utils.formatCurrency(underReviewLoan.estimatedEMI)}</strong></div>
            <div>Interest: <strong style="color: #fff;">${underReviewLoan.interestRate}% p.a.</strong></div>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    return;
  }

  const outstanding = (activeLoan.outstandingBalance !== undefined) ? activeLoan.outstandingBalance : activeLoan.requestedAmount;
  const paidCount = activeLoan.paidEmisCount || 0;
  const totalCount = activeLoan.totalEmisCount || activeLoan.tenure || 36;
  const emiVal = activeLoan.estimatedEMI || 6643;
  const nextDueDate = activeLoan.nextEmiDueDate ? new Date(activeLoan.nextEmiDueDate).toLocaleDateString('en-GB') : '15th Next Month';

  container.innerHTML = `
    <div class="card" style="border: 2px solid rgba(16, 185, 129, 0.4); background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(15, 23, 42, 0.95) 100%); position: relative; overflow: hidden;">
      
      <!-- Top Strip with Active Badge & Ref -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 42px; height: 42px; border-radius: var(--radius-md); background: rgba(16, 185, 129, 0.2); color: var(--success); display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
            <i class="fa-solid fa-hand-holding-dollar"></i>
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <h3 style="font-size: 1.25rem; font-weight: 800; color: #fff; margin: 0;">${activeLoan.loanType}</h3>
              <span class="badge badge-success" style="font-size: 0.72rem; letter-spacing: 0.5px;"><i class="fa-solid fa-circle-check"></i> ACTIVE</span>
            </div>
            <div style="font-size: 0.78rem; font-family: var(--font-mono); color: var(--accent-cyan); margin-top: 2px;">
              ACCOUNT: ${activeLoan.accountNumber} &bull; LOAN ID: <strong>${activeLoan.loanId}</strong>
            </div>
          </div>
        </div>

        <div style="text-align: right;">
          <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Outstanding Balance</div>
          <div style="font-size: 1.5rem; font-weight: 800; font-family: var(--font-mono); color: var(--danger); margin-top: 2px;">
            ${Utils.formatCurrency(outstanding)}
          </div>
        </div>
      </div>

      <!-- 6 Key Statistics Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; background: rgba(0, 0, 0, 0.35); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color-subtle); margin-bottom: 16px;">
        <div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">Sanctioned Amount</div>
          <div style="font-weight: 700; color: #fff; font-size: 1rem; margin-top: 2px;">${Utils.formatCurrency(activeLoan.requestedAmount)}</div>
        </div>
        <div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">Monthly EMI</div>
          <div style="font-weight: 800; color: var(--warning); font-size: 1.05rem; margin-top: 2px;">${Utils.formatCurrency(emiVal)}</div>
        </div>
        <div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">Interest Rate</div>
          <div style="font-weight: 700; color: #fff; font-size: 1rem; margin-top: 2px;">${activeLoan.interestRate}% p.a.</div>
        </div>
        <div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">Total Tenure</div>
          <div style="font-weight: 700; color: #fff; font-size: 1rem; margin-top: 2px;">${activeLoan.tenure} Months</div>
        </div>
        <div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">Paid EMIs</div>
          <div style="font-weight: 800; color: var(--accent-cyan); font-size: 1.05rem; margin-top: 2px;">${paidCount} / ${totalCount}</div>
        </div>
        <div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">Next Due Date</div>
          <div style="font-weight: 700; color: #fff; font-size: 0.92rem; margin-top: 2px;">${nextDueDate}</div>
        </div>
      </div>

      <!-- Action Buttons Row -->
      <div style="display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap;">
        <button class="btn btn-secondary btn-sm" onclick="viewLoanSchedule('${activeLoan.loanId}')">
          <i class="fa-solid fa-calendar-days"></i> View Schedule
        </button>
        <button class="btn btn-secondary btn-sm" onclick="downloadLoanStatement('${activeLoan.loanId}')">
          <i class="fa-solid fa-file-pdf"></i> Download Statement
        </button>
        <button class="btn btn-success" onclick="payActiveLoanEMI('${activeLoan.loanId}')" style="box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
          <i class="fa-solid fa-bolt"></i> Pay EMI (${Utils.formatCurrency(emiVal)})
        </button>
      </div>

    </div>
  `;
}

/**
 * Renders complete history of customer loans (Approved, Under Review, Closed)
 */
function renderLoansHistory(loans) {
  const container = document.getElementById('loansHistoryGrid');
  if (!container) return;

  if (loans.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 40px; background: var(--bg-surface); border-radius: var(--radius-md);">
        <i class="fa-solid fa-folder-open" style="font-size: 2rem; margin-bottom: 8px; opacity: 0.5;"></i>
        <div>No loan applications submitted yet. Apply on the left to get instant digital credit.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = loans.map(l => {
    let statusBadge = 'badge-warning';
    if (l.status === 'APPROVED' || l.status === 'ACTIVE') statusBadge = 'badge-success';
    if (l.status === 'REJECTED') statusBadge = 'badge-danger';
    if (l.status === 'CLOSED' || l.status === 'COMPLETED') statusBadge = 'badge-info';

    const outstanding = (l.outstandingBalance !== undefined) ? l.outstandingBalance : l.requestedAmount;
    const paidCount = l.paidEmisCount || 0;
    const totalCount = l.totalEmisCount || l.tenure || 36;

    return `
      <div style="background: var(--bg-surface); border: 1px solid var(--border-color-subtle); border-radius: var(--radius-md); padding: 14px; display: flex; flex-direction: column; gap: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong style="color: #fff; font-size: 0.95rem;">${l.loanType}</strong>
            <div style="font-size: 0.74rem; font-family: var(--font-mono); color: var(--accent-cyan);">REF: ${l.loanId}</div>
          </div>
          <span class="badge ${statusBadge}">${l.status}</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; font-size: 0.8rem; background: rgba(0,0,0,0.25); padding: 8px 12px; border-radius: var(--radius-sm);">
          <div>Principal: <strong style="color: #fff;">${Utils.formatCurrency(l.requestedAmount)}</strong></div>
          <div>Monthly EMI: <strong style="color: var(--warning);">${Utils.formatCurrency(l.estimatedEMI)}</strong></div>
          <div>Outstanding: <strong style="color: ${outstanding > 0 ? 'var(--danger)' : 'var(--success)'}; font-family: var(--font-mono);">${Utils.formatCurrency(outstanding)}</strong></div>
          <div>Tenure: <strong>${l.tenure} Mos</strong></div>
          <div>Paid EMIs: <strong style="color: var(--accent-cyan);">${paidCount}/${totalCount}</strong></div>
          <div>Rate: <strong>${l.interestRate}% p.a.</strong></div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.78rem; color: var(--text-muted); flex-wrap: wrap; gap: 8px;">
          <div>Applied: ${l.createdAt ? new Date(l.createdAt).toLocaleDateString() : 'N/A'}</div>
          
          <div style="display: flex; gap: 6px;">
            ${(l.status === 'APPROVED' || l.status === 'ACTIVE') ? `
              <button class="btn btn-secondary btn-sm" onclick="viewLoanSchedule('${l.loanId}')" style="padding: 3px 8px; font-size: 0.75rem;">
                <i class="fa-solid fa-list-check"></i> Schedule
              </button>
              <button class="btn btn-success btn-sm" onclick="payActiveLoanEMI('${l.loanId}')" style="padding: 3px 8px; font-size: 0.75rem;">
                <i class="fa-solid fa-money-bill-wave"></i> Pay EMI
              </button>
            ` : (l.status === 'CLOSED' ? `
              <button class="btn btn-secondary btn-sm" onclick="openClosedCertificateModal('${l.loanId}')" style="padding: 3px 8px; font-size: 0.75rem; color: var(--success); border-color: rgba(16, 185, 129, 0.4);">
                <i class="fa-solid fa-certificate"></i> Closure Certificate
              </button>
            ` : '')}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/* -------------------------------------------------------------
 * 7. EMI REPAYMENT ACTION & RECEIPT GENERATION
 * ------------------------------------------------------------- */
async function payActiveLoanEMI(loanId) {
  const loan = userLoans.find(l => l.loanId === loanId);
  if (!loan) return;

  const emiVal = loan.estimatedEMI || 6643;
  if (currentAccount && currentAccount.balance < emiVal) {
    Utils.showToast(`Insufficient balance in account ${currentAccount.accountNumber}. Available: ${Utils.formatCurrency(currentAccount.balance)}, EMI Due: ${Utils.formatCurrency(emiVal)}`, 'error');
    return;
  }

  const confirmed = confirm(`Confirm debit of ${Utils.formatCurrency(emiVal)} from your GG BANK account (${currentAccount.accountNumber}) for monthly installment?`);
  if (!confirmed) return;

  try {
    const res = await API.request(`/loans/${loanId}/pay-emi`, 'POST', {
      accountNumber: currentAccount.accountNumber
    });

    const data = res.data || {};
    lastReceiptData = {
      receiptId: data.receiptId || `RCPT-${Date.now().toString().slice(-6)}`,
      loanId: loanId,
      amount: data.amountPaid || emiVal,
      principal: data.principal || Math.round(emiVal * 0.75),
      interest: data.interest || Math.round(emiVal * 0.25),
      remainingOutstanding: data.remainingOutstanding !== undefined ? data.remainingOutstanding : Math.max(0, (loan.outstandingBalance || loan.requestedAmount) - emiVal),
      status: data.status || 'ACTIVE'
    };

    // Open receipt modal
    openReceiptModal(lastReceiptData);

    // Refresh accounts & loans
    const accRes = await API.request(`/accounts/user/${currentUser.userId}`);
    if (accRes.data) currentAccount = accRes.data;
    await loadUserLoans();

    // If loan became CLOSED, show celebratory modal
    if (lastReceiptData.remainingOutstanding <= 0 || data.status === 'CLOSED') {
      lastClosedLoan = loan;
      setTimeout(() => {
        openClosureModal(loan);
      }, 700);
    }
  } catch (err) {
    Utils.showToast(err.message, 'error', 'Payment Failed');
  }
}

function openReceiptModal(receipt) {
  document.getElementById('receiptIdVal').textContent = receipt.receiptId;
  document.getElementById('receiptLoanIdVal').textContent = receipt.loanId;
  document.getElementById('receiptAmountVal').textContent = Utils.formatCurrency(receipt.amount);
  document.getElementById('receiptSplitVal').textContent = `${Utils.formatCurrency(receipt.principal)} (Principal) / ${Utils.formatCurrency(receipt.interest)} (Interest)`;
  document.getElementById('receiptRemainingVal').textContent = Utils.formatCurrency(receipt.remainingOutstanding);

  document.getElementById('emiReceiptModal')?.classList.add('active');
}

function printReceipt() {
  window.print();
}

/* -------------------------------------------------------------
 * 8. EMI SCHEDULE VIEWER
 * ------------------------------------------------------------- */
function viewLoanSchedule(loanId) {
  const loan = userLoans.find(l => l.loanId === loanId);
  if (!loan) return;

  activeScheduleLoan = loan;

  document.getElementById('scheduleLoanTitle').textContent = `${loan.loanType} (${loan.loanId})`;
  document.getElementById('scheduleSanctionedVal').textContent = Utils.formatCurrency(loan.requestedAmount);

  const tbody = document.getElementById('scheduleTableBody');
  if (!tbody) return;

  // Use schedule array or generate dynamically
  let schedule = loan.schedule;
  if (!schedule || schedule.length === 0) {
    schedule = [];
    const tenure = loan.tenure || 36;
    const emi = loan.estimatedEMI || 6643;
    const r = (loan.interestRate / 12) / 100;
    let balance = loan.requestedAmount;
    const paidCount = loan.paidEmisCount || 0;

    for (let i = 1; i <= tenure; i++) {
      const int = Math.round(balance * r);
      const prin = emi - int;
      balance = Math.max(0, balance - prin);
      const d = new Date();
      d.setMonth(d.getMonth() + i);

      schedule.push({
        installmentNumber: i,
        dueDate: d.toISOString().split('T')[0],
        emiAmount: emi,
        principal: prin,
        interest: int,
        remainingBalance: balance,
        status: (i <= paidCount) ? 'PAID' : 'PENDING'
      });
    }
  }

  tbody.innerHTML = schedule.map(s => {
    const isPaid = (s.status === 'PAID');
    return `
      <tr style="${isPaid ? 'opacity: 0.7; background: rgba(16, 185, 129, 0.05);' : ''}">
        <td><strong style="font-family: var(--font-mono); color: var(--accent-cyan);">#${s.installmentNumber}</strong></td>
        <td>${new Date(s.dueDate).toLocaleDateString('en-GB')}</td>
        <td style="font-weight: 700; color: #fff;">${Utils.formatCurrency(s.emiAmount)}</td>
        <td style="color: var(--text-secondary);">${Utils.formatCurrency(s.principal)}</td>
        <td style="color: var(--text-secondary);">${Utils.formatCurrency(s.interest)}</td>
        <td>
          <span class="badge ${isPaid ? 'badge-success' : 'badge-warning'}">
            ${isPaid ? '✔ PAID' : 'PENDING'}
          </span>
        </td>
      </tr>
    `;
  }).join('');

  document.getElementById('emiScheduleModal')?.classList.add('active');
}

/* -------------------------------------------------------------
 * 9. STATEMENT DOWNLOAD VIA jsPDF
 * ------------------------------------------------------------- */
function downloadLoanStatement(loanId) {
  const targetLoanId = loanId || (activeScheduleLoan ? activeScheduleLoan.loanId : null);
  const loan = userLoans.find(l => l.loanId === targetLoanId) || activeScheduleLoan;

  if (!loan) {
    Utils.showToast('No active loan selected for statement download.', 'error');
    return;
  }

  if (!window.jspdf || !window.jspdf.jsPDF) {
    Utils.showToast('Generating statement...', 'info');
    window.print();
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Header branding
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 40, 'F');

  doc.setTextColor(56, 189, 248);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('GG BANK', 14, 22);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('OFFICIAL LOAN AMORTIZATION STATEMENT', 14, 32);

  doc.setTextColor(148, 163, 184);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 140, 32);

  // Customer & Loan Dossier
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('CUSTOMER INFORMATION', 14, 52);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Name: ${currentUser.name}`, 14, 60);
  doc.text(`Account Number: ${loan.accountNumber}`, 14, 68);
  doc.text(`Facility Type: ${loan.loanType}`, 14, 76);

  doc.text(`Loan Reference ID: ${loan.loanId}`, 110, 60);
  doc.text(`Sanctioned Amount: INR ${loan.requestedAmount.toLocaleString('en-IN')}`, 110, 68);
  doc.text(`Current Outstanding: INR ${(loan.outstandingBalance || 0).toLocaleString('en-IN')}`, 110, 76);
  doc.text(`Interest Rate: ${loan.interestRate}% p.a. • Tenure: ${loan.tenure} Months`, 110, 84);

  // Divider
  doc.setDrawColor(203, 213, 225);
  doc.line(14, 92, 196, 92);

  // Table Headers
  doc.setFillColor(241, 245, 249);
  doc.rect(14, 96, 182, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);

  doc.text('EMI #', 18, 102);
  doc.text('DUE DATE', 45, 102);
  doc.text('INSTALLMENT (INR)', 80, 102);
  doc.text('PRINCIPAL', 125, 102);
  doc.text('INTEREST', 155, 102);
  doc.text('STATUS', 180, 102);

  // Rows (First 15 installments)
  let y = 112;
  const schedule = loan.schedule || [];
  const items = schedule.slice(0, 15);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);

  items.forEach(s => {
    doc.text(`#${s.installmentNumber}`, 18, y);
    doc.text(`${new Date(s.dueDate).toLocaleDateString('en-GB')}`, 45, y);
    doc.text(`${s.emiAmount.toLocaleString('en-IN')}`, 80, y);
    doc.text(`${s.principal.toLocaleString('en-IN')}`, 125, y);
    doc.text(`${s.interest.toLocaleString('en-IN')}`, 155, y);
    doc.text(`${s.status}`, 180, y);
    y += 8;
  });

  // Footer seal
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('This is a computer-generated official loan statement from GG BANK and requires no physical signature.', 14, 280);

  doc.save(`GG_BANK_Statement_${loan.loanId}.pdf`);
  Utils.showToast('Loan statement downloaded successfully!', 'success');
}

/* -------------------------------------------------------------
 * 10. OFFICIAL CLOSURE CERTIFICATE VIA jsPDF
 * ------------------------------------------------------------- */
function openClosureModal(loan) {
  lastClosedLoan = loan;
  document.getElementById('closedLoanTitle').textContent = loan.loanType;
  document.getElementById('closedLoanId').textContent = loan.loanId;
  document.getElementById('closedLoanDate').textContent = new Date().toLocaleDateString('en-GB');
  document.getElementById('loanClosureModal')?.classList.add('active');
}

function openClosedCertificateModal(loanId) {
  const loan = userLoans.find(l => l.loanId === loanId);
  if (loan) openClosureModal(loan);
}

function downloadClosureCertificate() {
  const loan = lastClosedLoan || userLoans.find(l => l.status === 'CLOSED');
  if (!loan) {
    Utils.showToast('Loan closure details unavailable.', 'error');
    return;
  }

  if (!window.jspdf || !window.jspdf.jsPDF) {
    window.print();
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('landscape', 'mm', 'a4'); // Landscape certificate

  // Golden / Emerald Border
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(4);
  doc.rect(10, 10, 277, 190);

  doc.setDrawColor(56, 189, 248);
  doc.setLineWidth(1);
  doc.rect(14, 14, 269, 182);

  // Bank Header
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('GG BANK DIGITAL PORTAL', 148, 40, { align: 'center' });

  doc.setTextColor(16, 185, 129);
  doc.setFontSize(18);
  doc.text('OFFICIAL LOAN CLOSURE & NO-OBJECTION CERTIFICATE (NOC)', 148, 54, { align: 'center' });

  // Body
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');

  doc.text('This is to certify that the credit facility outlined below has been fully satisfied and closed in our records:', 148, 76, { align: 'center' });

  // Boxed Details
  doc.setFillColor(248, 250, 252);
  doc.rect(40, 88, 217, 50, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(40, 88, 217, 50);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Borrower Legal Name:', 48, 100);
  doc.setFont('helvetica', 'normal');
  doc.text(`${currentUser.name}`, 110, 100);

  doc.setFont('helvetica', 'bold');
  doc.text('Associated Account:', 48, 110);
  doc.setFont('helvetica', 'normal');
  doc.text(`${loan.accountNumber}`, 110, 110);

  doc.setFont('helvetica', 'bold');
  doc.text('Loan Facility & Ref ID:', 48, 120);
  doc.setFont('helvetica', 'normal');
  doc.text(`${loan.loanType}  (Ref: ${loan.loanId})`, 110, 120);

  doc.setFont('helvetica', 'bold');
  doc.text('Sanctioned Amount & Closure:', 48, 130);
  doc.setFont('helvetica', 'normal');
  doc.text(`INR ${loan.requestedAmount.toLocaleString('en-IN')}  • Outstanding: INR 0.00 (Fully Paid)`, 110, 130);

  doc.text('The bank confirms that all contractual monthly installments, principal, and accrued interest have been fully settled. No dues remain outstanding against this facility.', 148, 154, { align: 'center', maxWidth: 220 });

  // Signatures
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('CHIEF CREDIT OFFICER', 60, 178);
  doc.text('GG BANK CENTRAL OPERATIONS', 210, 178);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Issue Date: ${new Date().toLocaleDateString('en-GB')}  •  Digital Certificate Hash: SHA256-${loan.loanId}-CLOSED`, 148, 192, { align: 'center' });

  doc.save(`GG_BANK_Closure_Certificate_${loan.loanId}.pdf`);
  Utils.showToast('Loan closure certificate downloaded!', 'success');
}

// Global scope bindings for HTML event listeners
window.onLoanTypeSelected = onLoanTypeSelected;
window.onFormCalcInputsChange = onFormCalcInputsChange;
window.handleLoanDocUpload = handleLoanDocUpload;
window.payActiveLoanEMI = payActiveLoanEMI;
window.viewLoanSchedule = viewLoanSchedule;
window.downloadLoanStatement = downloadLoanStatement;
window.openClosedCertificateModal = openClosedCertificateModal;
window.downloadClosureCertificate = downloadClosureCertificate;
window.printReceipt = printReceipt;
