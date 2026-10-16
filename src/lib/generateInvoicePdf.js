import PDFDocument from 'pdfkit';

/**
 * Generates an official Tax Invoice PDF buffer using PDFKit.
 * Uses standard Helvetica fonts compatible with all PDF engines.
 */
export function generateInvoicePdfBuffer(invoice) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 36,
        info: {
          Title: `Tax Invoice ${invoice.invoiceNo || 'INV'} - Career Experts Global Solutions`,
          Author: 'Career Experts Global Solutions',
          Subject: `Official Tax Invoice for ${invoice.client || 'Client'}`,
          Keywords: 'Tax Invoice, GST, CEGS, HRMS, Placement Billing',
        },
      });

      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const primaryColor = '#1E3A8A'; // Deep Navy
      const accentColor = '#0284C7';  // Ocean Blue
      const darkColor = '#0F172A';    // Slate 900
      const mutedColor = '#64748B';   // Slate 500
      const lightBg = '#F8FAFC';

      const invoiceNo = String(invoice.invoiceNo || 'INV-01').trim();
      const clientName = String(invoice.client || invoice.clientName || 'Valued Client').trim();
      const clientAddress = String(invoice.clientAddress || 'Karnataka, India').trim();
      const clientGstin = String(invoice.clientGstin || '29AAFCR0597P1ZJ').trim();
      const clientState = String(invoice.clientState || 'Karnataka').trim();
      const clientStateCode = String(invoice.clientStateCode || '29').trim();
      const invoiceDate = String(invoice.invoiceDate || new Date().toISOString().slice(0, 10)).trim();
      const dueDate = String(invoice.dueDate || '30 days').trim();
      const poNo = String(invoice.poNo || '—').trim();

      const items = Array.isArray(invoice.items) && invoice.items.length > 0 ? invoice.items : [];
      const basicAmt = Number(
        invoice.basicAmount ||
          (items.length > 0
            ? items.reduce((s, it) => s + (Number(it.amount) || Number(it.ratePerSeat) || 0), 0)
            : Math.round(Number(invoice.amount || invoice.totalAmount || 0) / 1.18))
      );
      const cgstAmt = Number(
        invoice.cgstAmount !== undefined && invoice.cgstAmount !== null
          ? invoice.cgstAmount
          : Math.round(basicAmt * 0.09)
      );
      const sgstAmt = Number(
        invoice.sgstAmount !== undefined && invoice.sgstAmount !== null
          ? invoice.sgstAmount
          : Math.round(basicAmt * 0.09)
      );
      const totalAmount = Number(invoice.amount || invoice.totalAmount || basicAmt + cgstAmt + sgstAmt);
      const amountInWords = String(invoice.amountInWords || '').trim();

      // =========================================================================
      // 1. TOP HEADER BANNER
      // =========================================================================
      doc.rect(36, 36, 523, 72).fillAndStroke('#EFF6FF', '#BFDBFE');

      doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(16).text('CAREER EXPERTS GLOBAL SOLUTIONS', 48, 48);
      doc.fillColor(accentColor).font('Helvetica-Bold').fontSize(11).text('OFFICIAL TAX INVOICE & BILLING TRANSMISSION', 48, 68);
      doc.fillColor(mutedColor).font('Helvetica').fontSize(8.5).text(
        '#1, Masjid Street, Neelasandra, Bengaluru - 560047, Karnataka | GSTIN: 29DWCPM8081C2ZB | PAN: DWCPM8081C',
        48,
        84
      );

      // =========================================================================
      // 2. INVOICE META & CLIENT INFORMATION
      // =========================================================================
      const metaTop = 118;

      // Left Box: Supplier Details
      doc.rect(36, metaTop, 255, 92).stroke('#CBD5E1');
      doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(9.5).text('SUPPLIER (SERVICE PROVIDER)', 44, metaTop + 8);
      doc.fillColor(darkColor).font('Helvetica-Bold').fontSize(9).text('Career Experts Global Solutions', 44, metaTop + 22);
      doc.fillColor('#334155').font('Helvetica').fontSize(8.5).text('Address: #1, Masjid Street, Neelasandra, Bangalore - 560047', 44, metaTop + 34, { width: 240 });
      doc.text('GSTIN: 29DWCPM8081C2ZB | PAN: DWCPM8081C', 44, metaTop + 58);
      doc.text('Email: finance@cegs.in | Phone: +91 7892220496', 44, metaTop + 72);

      // Right Box: Invoice Reference & Dates
      doc.rect(296, metaTop, 263, 92).stroke('#CBD5E1');
      doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(9.5).text('INVOICE DETAILS', 304, metaTop + 8);

      doc.fillColor(darkColor).font('Helvetica-Bold').fontSize(9).text('Invoice No:', 304, metaTop + 24);
      doc.fillColor(accentColor).font('Helvetica-Bold').fontSize(9.5).text(invoiceNo, 380, metaTop + 24);

      doc.fillColor(darkColor).font('Helvetica').fontSize(8.5).text('Invoice Date:', 304, metaTop + 40);
      doc.font('Helvetica-Bold').text(invoiceDate, 380, metaTop + 40);

      doc.font('Helvetica').text('Payment Due:', 304, metaTop + 56);
      doc.font('Helvetica-Bold').text(dueDate, 380, metaTop + 56);

      doc.font('Helvetica').text('PO Reference:', 304, metaTop + 72);
      doc.font('Helvetica-Bold').text(poNo, 380, metaTop + 72);

      // Bill To (Receiver) Section
      const billToTop = metaTop + 98;
      doc.rect(36, billToTop, 523, 62).fillAndStroke(lightBg, '#CBD5E1');
      doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(9.5).text('BILLED TO (RECEIVER / CLIENT):', 44, billToTop + 8);
      doc.fillColor(darkColor).font('Helvetica-Bold').fontSize(10.5).text(clientName, 44, billToTop + 22);
      doc.fillColor('#334155').font('Helvetica').fontSize(8.5).text(
        `Address: ${clientAddress} | State: ${clientState} (Code: ${clientStateCode}) | GSTIN: ${clientGstin}`,
        44,
        billToTop + 38,
        { width: 505 }
      );

      // =========================================================================
      // 3. ITEMS / CANDIDATE BREAKDOWN TABLE
      // =========================================================================
      const tableTop = billToTop + 70;
      doc.rect(36, tableTop, 523, 22).fillAndStroke(primaryColor, primaryColor);

      // Header row columns
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8.5);
      doc.text('S.No', 42, tableTop + 6, { width: 25 });
      doc.text('EMP ID', 70, tableTop + 6, { width: 60 });
      doc.text('Candidate / Employee Name', 135, tableTop + 6, { width: 140 });
      doc.text('Process / LOB', 280, tableTop + 6, { width: 85 });
      doc.text('DOJ', 370, tableTop + 6, { width: 45 });
      doc.text('SAC', 420, tableTop + 6, { width: 35 });
      doc.text('Rate', 460, tableTop + 6, { width: 40, align: 'right' });
      doc.text('Amount (Rs.)', 505, tableTop + 6, { width: 48, align: 'right' });

      let currentY = tableTop + 22;
      const displayRows = items.length > 0 ? items.slice(0, 18) : [
        {
          sno: '01',
          empId: 'CEGS-01',
          employeeName: invoice.projectMilestone || 'Placement & Process Billing Services',
          processLob: 'Billing Scope',
          doj: invoiceDate,
          sacCode: '99851',
          ratePerSeat: basicAmt,
          amount: basicAmt,
        },
      ];

      displayRows.forEach((row, idx) => {
        const isEven = idx % 2 === 0;
        const rowBg = isEven ? '#FFFFFF' : '#F8FAFC';
        doc.rect(36, currentY, 523, 17).fillAndStroke(rowBg, '#E2E8F0');

        doc.fillColor(darkColor).font('Helvetica').fontSize(8);
        const sno = row.sno || String(idx + 1).padStart(2, '0');
        const empId = row.empId || '—';
        const empName = row.employeeName || 'Candidate';
        const lob = row.processLob || row.designation || 'Process';
        const doj = row.doj || '—';
        const sac = row.sacCode || '99851';
        const rate = Number(row.ratePerSeat || row.amount || 0);
        const amt = Number(row.amount || row.ratePerSeat || 0);

        doc.text(sno, 42, currentY + 4, { width: 25 });
        doc.text(empId, 70, currentY + 4, { width: 60 });
        doc.text(empName.slice(0, 26), 135, currentY + 4, { width: 140 });
        doc.text(lob.slice(0, 16), 280, currentY + 4, { width: 85 });
        doc.text(doj, 370, currentY + 4, { width: 45 });
        doc.text(sac, 420, currentY + 4, { width: 35 });
        doc.text(`Rs. ${rate.toLocaleString('en-IN')}`, 455, currentY + 4, { width: 45, align: 'right' });
        doc.font('Helvetica-Bold').text(`Rs. ${amt.toLocaleString('en-IN')}`, 505, currentY + 4, { width: 48, align: 'right' });

        currentY += 17;
      });

      // =========================================================================
      // 4. TOTALS CALCULATION BOX
      // =========================================================================
      currentY += 6;
      const totalsBoxWidth = 230;
      const totalsBoxX = 559 - totalsBoxWidth;

      doc.rect(totalsBoxX, currentY, totalsBoxWidth, 76).fillAndStroke(lightBg, '#CBD5E1');

      doc.fillColor(darkColor).font('Helvetica').fontSize(8.5);
      doc.text('Subtotal (Basic):', totalsBoxX + 12, currentY + 8);
      doc.font('Helvetica-Bold').text(`Rs. ${basicAmt.toLocaleString('en-IN')}`, totalsBoxX + 130, currentY + 8, { align: 'right', width: 88 });

      doc.font('Helvetica').text('CGST (9%):', totalsBoxX + 12, currentY + 22);
      doc.font('Helvetica-Bold').text(`Rs. ${cgstAmt.toLocaleString('en-IN')}`, totalsBoxX + 130, currentY + 22, { align: 'right', width: 88 });

      doc.font('Helvetica').text('SGST (9%):', totalsBoxX + 12, currentY + 36);
      doc.font('Helvetica-Bold').text(`Rs. ${sgstAmt.toLocaleString('en-IN')}`, totalsBoxX + 130, currentY + 36, { align: 'right', width: 88 });

      doc.rect(totalsBoxX, currentY + 50, totalsBoxWidth, 26).fillAndStroke('#E0F2FE', accentColor);
      doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(10).text('TOTAL PAYABLE:', totalsBoxX + 12, currentY + 58);
      doc.font('Helvetica-Bold').fontSize(11).text(`Rs. ${totalAmount.toLocaleString('en-IN')}`, totalsBoxX + 120, currentY + 57, { align: 'right', width: 98 });

      // Amount in words
      if (amountInWords) {
        doc.rect(36, currentY, totalsBoxX - 42, 76).fillAndStroke('#FFFBEB', '#FDE68A');
        doc.fillColor('#92400E').font('Helvetica-Bold').fontSize(8.5).text('AMOUNT IN WORDS:', 44, currentY + 10);
        doc.fillColor(darkColor).font('Helvetica-Bold').fontSize(9).text(amountInWords, 44, currentY + 24, { width: totalsBoxX - 58 });
        doc.fillColor(mutedColor).font('Helvetica').fontSize(8).text('Computer generated official GST tax invoice.', 44, currentY + 56);
      }

      currentY += 84;

      // =========================================================================
      // 5. BANK REMITTANCE & DIGITAL SIGNATURE SECTION
      // =========================================================================
      const bottomBoxHeight = 84;
      doc.rect(36, currentY, 320, bottomBoxHeight).fillAndStroke('#F0FDF4', '#86EFAC');

      doc.fillColor('#14532D').font('Helvetica-Bold').fontSize(9).text('DIRECT BANK REMITTANCE DETAILS (HDFC BANK):', 44, currentY + 8);
      doc.fillColor(darkColor).font('Helvetica').fontSize(8.5);
      doc.text('Beneficiary: Career Experts Global Solutions', 44, currentY + 22);
      doc.text('Bank Name: HDFC Bank | Account Type: Current Account', 44, currentY + 35);
      doc.text('Current Account No: 50200080303100', 44, currentY + 48);
      doc.text('IFSC Code: HDFC0000509 | Branch: Bengaluru, Karnataka', 44, currentY + 61);

      // Signature Stamp Box (Right)
      doc.rect(366, currentY, 193, bottomBoxHeight).fillAndStroke('#FFFFFF', '#CBD5E1');
      doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(8.5).text('FOR CAREER EXPERTS GLOBAL SOLUTIONS', 374, currentY + 8);

      doc.rect(385, currentY + 22, 155, 34).stroke('#0284C7');
      doc.fillColor(accentColor).font('Helvetica-Bold').fontSize(8).text('MOHAMMED USMAN ZABI', 388, currentY + 26, { align: 'center', width: 150 });
      doc.fillColor(mutedColor).font('Helvetica').fontSize(7.5).text('Digitally Signed & Certified', 388, currentY + 36, { align: 'center', width: 150 });
      doc.text(`Date: ${invoiceDate}`, 388, currentY + 45, { align: 'center', width: 150 });

      doc.fillColor(darkColor).font('Helvetica-Bold').fontSize(8).text('Authorised Signatory & Stamp', 374, currentY + 68, { align: 'center', width: 175 });

      // =========================================================================
      // 6. BOTTOM FOOTER
      // =========================================================================
      doc.fillColor(mutedColor).font('Helvetica').fontSize(7.5).text(
        'Thank you for your business. Career Experts Global Solutions · #1, Masjid Street, Neelasandra, Bengaluru - 560047',
        36,
        currentY + bottomBoxHeight + 8,
        { align: 'center', width: 523 }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
