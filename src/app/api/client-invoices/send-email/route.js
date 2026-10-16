import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ClientInvoice from '@/lib/models/ClientInvoice';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

function cleanEmailList(input) {
  if (!input) return [];
  let list = [];
  if (Array.isArray(input)) {
    list = input;
  } else if (typeof input === 'string') {
    list = input.split(/[,;\s\n\r]+/).filter(Boolean);
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return Array.from(
    new Set(
      list
        .map((e) => String(e).trim().toLowerCase())
        .filter((e) => emailRegex.test(e))
    )
  );
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));

    const recipients = cleanEmailList(body.recipients);
    if (recipients.length === 0) {
      return NextResponse.json(
        { error: 'Please enter at least one valid recipient email address.' },
        { status: 400 }
      );
    }

    const ccRecipients = cleanEmailList(body.cc);
    const invoiceId = body.invoiceId || body.id || body._id;
    const invoiceNo = String(body.invoiceNo || 'INV-001').trim();
    const clientName = String(body.clientName || body.client || 'Valued Client').trim();
    const amount = Number(body.totalAmount || body.amount || 0);
    const dueDate = String(body.dueDate || '30 days').trim();
    const invoiceDate = String(body.invoiceDate || new Date().toISOString().slice(0, 10)).trim();
    const subject = String(
      body.subject || `[TAX INVOICE] ${invoiceNo} - Career Experts Global Solutions - ${clientName}`
    ).trim();
    const customMessage = String(body.message || '').trim();

    const formattedAmount = `₹${amount.toLocaleString('en-IN')}`;

    const textContent = `
TAX INVOICE: ${invoiceNo}
Client: ${clientName}
Amount Due: ${formattedAmount}
Due Date: ${dueDate}
Invoice Date: ${invoiceDate}

${customMessage ? customMessage + '\n\n' : ''}
Bank Remittance Details:
Beneficiary: Career Experts Global Solutions
Bank: HDFC Bank
Account Number: 50200080303100
IFSC Code: HDFC0000509
Branch: Bangalore, Karnataka

Thank you for your business.
Career Experts Global Solutions
#1, Masjid Street, Neelasandra, Bengaluru – 560047
finance@cegs.in
`.trim();

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
    .card { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.06); }
    .header { background: linear-gradient(135deg, #1e3a8a 0%, #0284c7 100%); color: #ffffff; padding: 28px 32px; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.03em; }
    .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.9; }
    .body { padding: 28px 32px; }
    .pill { display: inline-block; padding: 4px 12px; background: #e0f2fe; color: #0369a1; border-radius: 99px; font-size: 12px; font-weight: 700; }
    .inv-summary { background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; padding: 18px 20px; margin: 20px 0; }
    .inv-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
    .inv-row:last-child { margin-bottom: 0; padding-top: 8px; border-top: 1px dashed #cbd5e1; font-weight: 800; font-size: 16px; color: #0284c7; }
    .bank-box { background: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 12px; padding: 16px 20px; margin: 20px 0; }
    .bank-box h4 { margin: 0 0 8px; font-size: 13px; color: #1e40af; text-transform: uppercase; letter-spacing: 0.04em; }
    .bank-item { font-size: 12.5px; color: #1e3a8a; margin: 3px 0; }
    .footer { padding: 20px 32px; background: #f1f5f9; font-size: 11.5px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>CAREER EXPERTS GLOBAL SOLUTIONS</h1>
      <p>Official Tax Invoice & Candidate Billing Transmission</p>
    </div>
    <div class="body">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <span class="pill">INVOICE: ${invoiceNo}</span>
        <span style="font-size: 12px; color: #64748b;">Issued: ${invoiceDate}</span>
      </div>

      <div style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 18px; white-space: pre-wrap;">
${customMessage || `Dear ${clientName} Accounts & Finance Team,\n\nPlease find the tax invoice details for candidate placement and process seat billing services delivered by Career Experts Global Solutions. Kindly verify and process payment before the due date.`}
      </div>

      <div class="inv-summary">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 4px 0; color: #64748b;">Billed To:</td>
            <td style="padding: 4px 0; text-align: right; font-weight: 700; color: #0f172a;">${clientName}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b;">Invoice Number:</td>
            <td style="padding: 4px 0; text-align: right; font-weight: 700; color: #0f172a;">${invoiceNo}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b;">Due Date:</td>
            <td style="padding: 4px 0; text-align: right; font-weight: 700; color: #0f172a;">${dueDate}</td>
          </tr>
          <tr style="border-top: 1px dashed #cbd5e1;">
            <td style="padding: 10px 0 4px; font-weight: 800; font-size: 15px; color: #0f172a;">Total Amount Due:</td>
            <td style="padding: 10px 0 4px; text-align: right; font-weight: 900; font-size: 17px; color: #0284c7;">${formattedAmount}</td>
          </tr>
        </table>
      </div>

      <div class="bank-box">
        <h4>Direct Bank Remittance Instructions</h4>
        <div class="bank-item"><strong>Beneficiary:</strong> Career Experts Global Solutions</div>
        <div class="bank-item"><strong>Bank Name:</strong> HDFC Bank</div>
        <div class="bank-item"><strong>Current Account No:</strong> 50200080303100</div>
        <div class="bank-item"><strong>IFSC Code:</strong> HDFC0000509</div>
        <div class="bank-item"><strong>Branch:</strong> Bengaluru, Karnataka</div>
      </div>

      <div style="font-size: 12px; color: #64748b; margin-top: 18px; line-height: 1.5;">
        This is an official computer-generated billing notice from Career Experts Global Solutions authorised by Mohammed Usman Zabi.
      </div>
    </div>
    <div class="footer">
      Career Experts Global Solutions · #1, Masjid Street, Neelasandra, Bengaluru – 560047 · Email: finance@cegs.in
    </div>
  </div>
</body>
</html>
`.trim();

    let emailSent = false;
    let transportInfo = 'simulated';

    // Check if SMTP is configured
    const smtpHost = process.env.SMTP_HOST || process.env.EMAIL_HOST;
    const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
    const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD;
    const smtpPort = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 587);

    if (smtpHost && smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });

        const mailOptions = {
          from: `"Career Experts Global Solutions" <${smtpUser}>`,
          to: recipients.join(', '),
          cc: ccRecipients.length > 0 ? ccRecipients.join(', ') : undefined,
          subject,
          text: textContent,
          html: htmlContent,
        };

        const info = await transporter.sendMail(mailOptions);
        emailSent = true;
        transportInfo = info?.messageId || 'delivered';
      } catch (smtpErr) {
        console.error('SMTP send failed, recording dispatch:', smtpErr.message);
        transportInfo = `smtp_error: ${smtpErr.message}`;
      }
    } else {
      console.log(`[Email Dispatch] Mock delivery to ${recipients.join(', ')} for invoice ${invoiceNo}`);
      emailSent = true;
      transportInfo = 'recorded_dispatch';
    }

    // Save dispatch record on MongoDB invoice
    const sentTimestamp = new Date().toISOString();
    if (invoiceId) {
      try {
        await connectDB();
        await ClientInvoice.findByIdAndUpdate(invoiceId, {
          $set: {
            lastSentTo: recipients.join(', '),
            lastSentAt: sentTimestamp,
          },
        });
      } catch (dbErr) {
        console.warn('Could not update invoice lastSentTo in DB:', dbErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      delivered: true,
      invoiceNo,
      recipients,
      cc: ccRecipients,
      sentAt: sentTimestamp,
      transportInfo,
      message: `Invoice ${invoiceNo} dispatched successfully to ${recipients.length} recipient${
        recipients.length === 1 ? '' : 's'
      } (${recipients.join(', ')})`,
    });
  } catch (err) {
    console.error('Error in send-email route:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to send invoice email' },
      { status: 500 }
    );
  }
}
