/**
 * GG BANK - Reports & Analytics Controller (admin-reports.js)
 * Implements generation of 7 distinct Regulatory & Audit Reports in PDF, CSV, and Excel formats.
 */

document.addEventListener('DOMContentLoaded', () => {
  const admin = AdminCommon.init('reports');
  if (!admin) return;
});

async function downloadReport(reportType, format) {
  const period = document.getElementById('reportPeriodSelect')?.value || 'MONTHLY';
  Utils.showToast(`Preparing ${reportType} Report (${period} - ${format})...`, 'info');

  try {
    const res = await API.request(`/admin/reports?period=${period}&reportType=${reportType}`);
    const data = res.data || {};

    const timestampStr = new Date().toISOString().slice(0, 10);
    const baseFilename = `GG_BANK_${reportType}_Report_${period}_${timestampStr}`;

    switch (reportType) {
      case 'CUSTOMER':
        exportCustomerReport(data.customerReport || {}, format, baseFilename);
        break;

      case 'TRANSACTION':
        exportTransactionReport(data.transactionReport || [], format, baseFilename);
        break;

      case 'DEPOSIT':
        exportDepositReport(data.depositReport || {}, format, baseFilename);
        break;

      case 'WITHDRAWAL':
        exportWithdrawalReport(data.withdrawalReport || {}, format, baseFilename);
        break;

      case 'TRANSFER':
        exportTransferReport(data.transferReport || {}, format, baseFilename);
        break;

      case 'LOAN':
        exportLoanReport(data.loanReport || {}, format, baseFilename);
        break;

      case 'FINANCIAL':
        exportFinancialSummary(data.financialSummary || {}, format, baseFilename);
        break;

      default:
        Utils.showToast('Unknown report type requested.', 'error');
    }

  } catch (err) {
    Utils.showToast(err.message || 'Failed to generate report', 'error');
  }
}

// 1. Customer Report Export
function exportCustomerReport(data, format, filename) {
  const list = data.customersList || [];
  const rows = list.map(c => [
    c.userId || 'N/A',
    c.name || 'N/A',
    c.email || 'N/A',
    c.phone || 'N/A',
    c.status || 'ACTIVE',
    c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A'
  ]);
  const headers = ['Customer ID', 'Full Name', 'Email Address', 'Phone Number', 'Status', 'Registered Date'];

  if (format === 'PDF') {
    AdminCommon.exportPDF('Customer & KYC Directory Audit', headers, rows, filename + '.pdf');
  } else {
    const csvData = list.map(c => ({
      'Customer ID': c.userId,
      'Name': c.name,
      'Email': c.email,
      'Phone': c.phone || 'N/A',
      'Status': c.status,
      'Registered Date': c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A'
    }));
    if (format === 'EXCEL') AdminCommon.exportExcel(csvData, filename, null);
    else AdminCommon.exportCSV(csvData, filename + '.csv', null);
  }
}

// 2. Transaction Report Export
function exportTransactionReport(list, format, filename) {
  const rows = list.map(t => [
    t.transactionId,
    t.createdAt ? new Date(t.createdAt).toLocaleString() : 'N/A',
    t.senderAccount || 'N/A',
    t.receiverAccount || 'N/A',
    t.type,
    `INR ${(t.amount || 0).toLocaleString('en-IN')}`,
    t.status || 'COMPLETED'
  ]);
  const headers = ['Transaction ID', 'Timestamp', 'Sender Acc', 'Receiver Acc', 'Type', 'Amount', 'Status'];

  if (format === 'PDF') {
    AdminCommon.exportPDF('Global Transaction Ledger Report', headers, rows, filename + '.pdf');
  } else {
    const csvData = list.map(t => ({
      'Transaction ID': t.transactionId,
      'Timestamp': t.createdAt ? new Date(t.createdAt).toLocaleString() : 'N/A',
      'Sender': t.senderAccount,
      'Receiver': t.receiverAccount,
      'Type': t.type,
      'Amount': t.amount,
      'Status': t.status
    }));
    if (format === 'EXCEL') AdminCommon.exportExcel(csvData, filename, null);
    else AdminCommon.exportCSV(csvData, filename + '.csv', null);
  }
}

// 3. Deposit Report Export
function exportDepositReport(data, format, filename) {
  const list = data.items || [];
  const rows = list.map(d => [
    d.transactionId,
    d.createdAt ? new Date(d.createdAt).toLocaleString() : 'N/A',
    d.receiverAccount,
    d.senderAccount || 'Treasury Direct',
    `INR ${(d.amount || 0).toLocaleString('en-IN')}`,
    d.status || 'COMPLETED'
  ]);
  const headers = ['Deposit ID', 'Timestamp', 'Beneficiary Account', 'Channel', 'Amount', 'Status'];

  if (format === 'PDF') {
    AdminCommon.exportPDF('Deposit & Treasury Credit Inflow Report', headers, rows, filename + '.pdf');
  } else {
    const csvData = list.map(d => ({
      'Deposit ID': d.transactionId,
      'Timestamp': d.createdAt ? new Date(d.createdAt).toLocaleString() : 'N/A',
      'Beneficiary Account': d.receiverAccount,
      'Channel': d.senderAccount,
      'Amount (INR)': d.amount,
      'Status': d.status
    }));
    if (format === 'EXCEL') AdminCommon.exportExcel(csvData, filename, null);
    else AdminCommon.exportCSV(csvData, filename + '.csv', null);
  }
}

// 4. Withdrawal Report Export
function exportWithdrawalReport(data, format, filename) {
  const list = data.items || [];
  const rows = list.map(w => [
    w.transactionId,
    w.createdAt ? new Date(w.createdAt).toLocaleString() : 'N/A',
    w.senderAccount,
    w.receiverAccount || 'Self / Cash ATM',
    `INR ${(w.amount || 0).toLocaleString('en-IN')}`,
    w.status || 'COMPLETED'
  ]);
  const headers = ['Withdrawal ID', 'Timestamp', 'Source Account', 'Destination Channel', 'Amount', 'Status'];

  if (format === 'PDF') {
    AdminCommon.exportPDF('Withdrawal & Debit Outflow Report', headers, rows, filename + '.pdf');
  } else {
    const csvData = list.map(w => ({
      'Withdrawal ID': w.transactionId,
      'Timestamp': w.createdAt ? new Date(w.createdAt).toLocaleString() : 'N/A',
      'Source Account': w.senderAccount,
      'Channel': w.receiverAccount,
      'Amount (INR)': w.amount,
      'Status': w.status
    }));
    if (format === 'EXCEL') AdminCommon.exportExcel(csvData, filename, null);
    else AdminCommon.exportCSV(csvData, filename + '.csv', null);
  }
}

// 5. Transfer Report Export
function exportTransferReport(data, format, filename) {
  const list = data.items || [];
  const rows = list.map(t => [
    t.transactionId,
    t.createdAt ? new Date(t.createdAt).toLocaleString() : 'N/A',
    t.senderAccount,
    t.receiverAccount,
    `INR ${(t.amount || 0).toLocaleString('en-IN')}`,
    t.status || 'COMPLETED'
  ]);
  const headers = ['Transfer ID', 'Timestamp', 'Sender Account', 'Receiver Account', 'Amount', 'Status'];

  if (format === 'PDF') {
    AdminCommon.exportPDF('Inter-Account Funds Transfer Report', headers, rows, filename + '.pdf');
  } else {
    const csvData = list.map(t => ({
      'Transfer ID': t.transactionId,
      'Timestamp': t.createdAt ? new Date(t.createdAt).toLocaleString() : 'N/A',
      'Sender': t.senderAccount,
      'Receiver': t.receiverAccount,
      'Amount (INR)': t.amount,
      'Status': t.status
    }));
    if (format === 'EXCEL') AdminCommon.exportExcel(csvData, filename, null);
    else AdminCommon.exportCSV(csvData, filename + '.csv', null);
  }
}

// 6. Loan Report Export
function exportLoanReport(data, format, filename) {
  const list = data.items || [];
  const rows = list.map(l => [
    l.loanId,
    l.accountNumber,
    l.loanType,
    `INR ${(l.requestedAmount || 0).toLocaleString('en-IN')}`,
    `${l.tenure || 24} Mo`,
    `INR ${(l.estimatedEMI || 0).toLocaleString('en-IN')}`,
    l.status
  ]);
  const headers = ['Loan ID', 'Account No', 'Loan Type', 'Requested Principal', 'Tenure', 'EMI', 'Status'];

  if (format === 'PDF') {
    AdminCommon.exportPDF('Loan Portfolio Underwriting Report', headers, rows, filename + '.pdf');
  } else {
    const csvData = list.map(l => ({
      'Loan ID': l.loanId,
      'Account Number': l.accountNumber,
      'Loan Type': l.loanType,
      'Requested Principal (INR)': l.requestedAmount,
      'Tenure (Months)': l.tenure,
      'Monthly EMI': l.estimatedEMI,
      'Status': l.status
    }));
    if (format === 'EXCEL') AdminCommon.exportExcel(csvData, filename, null);
    else AdminCommon.exportCSV(csvData, filename + '.csv', null);
  }
}

// 7. Financial Summary Export
function exportFinancialSummary(data, format, filename) {
  const summaryRows = [
    ['Total Vault Portfolio Balance', `INR ${(data.totalVaultBalance || 0).toLocaleString('en-IN')}`],
    ['Cumulative Deposits Inflow', `INR ${(data.totalDeposits || 0).toLocaleString('en-IN')}`],
    ['Cumulative Withdrawals Outflow', `INR ${(data.totalWithdrawals || 0).toLocaleString('en-IN')}`],
    ['Cumulative Transfers Cleared', `INR ${(data.totalTransfers || 0).toLocaleString('en-IN')}`],
    ['Net Disbursed Credit Facilities', `INR ${(data.netDisbursedLoans || 0).toLocaleString('en-IN')}`],
    ['Report Audit Timestamp', new Date().toLocaleString()]
  ];
  const headers = ['Financial Metric', 'Value'];

  if (format === 'PDF') {
    AdminCommon.exportPDF('Executive Financial Solvency & Liquidity Summary', headers, summaryRows, filename + '.pdf');
  } else {
    const csvData = summaryRows.map(r => ({ 'Financial Metric': r[0], 'Value': r[1] }));
    if (format === 'EXCEL') AdminCommon.exportExcel(csvData, filename, null);
    else AdminCommon.exportCSV(csvData, filename + '.csv', null);
  }
}
