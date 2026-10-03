/**
 * GG BANK - PDF Account Statement Exporter
 * Generates an official bank account statement using jsPDF and autoTable.
 */

const StatementGenerator = {
  generatePDF(customer, account, transactions) {
    if (typeof window.jspdf === 'undefined' && typeof jsPDF === 'undefined') {
      Toast.error('PDF generation library not loaded. Please check your internet connection.');
      return;
    }

    const { jsPDF } = window.jspdf || window;
    const doc = new jsPDF();

    // Palette
    const primaryColor = [7, 13, 30];       // Dark Navy
    const accentColor = [0, 114, 255];      // GG Bank Cyan / Blue
    const grayText = [100, 116, 139];

    // Header Banner
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 42, 'F');

    // Bank Branding
    doc.setTextColor(0, 240, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('GG BANK', 14, 20);

    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal');
    doc.text('Smart Digital Banking Management System', 14, 27);
    doc.text('"Secure Banking. Smarter Future."', 14, 34);

    // Document Title
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('ACCOUNT STATEMENT', 145, 24);

    // Customer & Account Details Box
    doc.setFillColor(245, 248, 252);
    doc.roundedRect(14, 48, 182, 38, 3, 3, 'F');

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Customer Name:', 20, 58);
    doc.setFont('helvetica', 'normal');
    doc.text(customer.name || 'Gowtham NK', 60, 58);

    doc.setFont('helvetica', 'bold');
    doc.text('Account Number:', 20, 66);
    doc.setFont('helvetica', 'normal');
    doc.text(account.accountNumber || '10018849201', 60, 66);

    doc.setFont('helvetica', 'bold');
    doc.text('Account Type:', 20, 74);
    doc.setFont('helvetica', 'normal');
    doc.text(account.accountType || 'SAVINGS', 60, 74);

    // Right Column Box
    doc.setFont('helvetica', 'bold');
    doc.text('IFSC Code:', 120, 58);
    doc.setFont('helvetica', 'normal');
    doc.text(account.ifscCode || 'GGBN0001234', 150, 58);

    doc.setFont('helvetica', 'bold');
    doc.text('Current Balance:', 120, 66);
    doc.setFont('helvetica', 'normal');
    doc.text(`Rs. ${(account.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 150, 66);

    doc.setFont('helvetica', 'bold');
    doc.text('Statement Date:', 120, 74);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date().toLocaleDateString('en-GB'), 150, 74);

    // Table Data Formatting
    const tableHeaders = [['Date', 'Transaction ID', 'Description', 'Type', 'Amount (Rs.)', 'Balance After']];
    const tableData = (transactions || []).map(t => [
      new Date(t.createdAt).toLocaleDateString('en-GB'),
      t.transactionId,
      t.description || t.type,
      t.type,
      (t.type === 'DEPOSIT' || t.type === 'LOAN_DISBURSEMENT' ? '+' : '-') + t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
      (t.balanceAfter || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })
    ]);

    // Render Table
    if (doc.autoTable) {
      doc.autoTable({
        head: tableHeaders,
        body: tableData,
        startY: 92,
        theme: 'striped',
        headStyles: {
          fillColor: [11, 21, 45],
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fontSize: 8.5,
          textColor: [30, 41, 59]
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        margin: { left: 14, right: 14 }
      });
    }

    // Footer Watermark & Security Note
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(...grayText);
      doc.text('This is a computer-generated bank statement from GG BANK and requires no physical signature.', 14, 288);
      doc.text(`Page ${i} of ${pageCount}`, 185, 288);
    }

    // Download File
    doc.save(`GG_BANK_Statement_${account.accountNumber}_${Date.now().toString().slice(-4)}.pdf`);
    Toast.success('Statement downloaded successfully!');
  },

  exportCSV(filename, rows) {
    const processRow = function (row) {
      let finalVal = '';
      for (let j = 0; j < row.length; j++) {
        let innerValue = row[j] === null || row[j] === undefined ? '' : row[j].toString();
        if (row[j] instanceof Date) {
          innerValue = row[j].toLocaleString();
        }
        let result = innerValue.replace(/"/g, '""');
        if (result.search(/("|,|\n)/g) >= 0)
          result = '"' + result + '"';
        if (j > 0)
          finalVal += ',';
        finalVal += result;
      }
      return finalVal + '\n';
    };

    let csvFile = '';
    for (let i = 0; i < rows.length; i++) {
      csvFile += processRow(rows[i]);
    }

    const blob = new Blob([csvFile], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      Toast.success('CSV report exported successfully!');
    }
  }
};

window.StatementGenerator = StatementGenerator;
