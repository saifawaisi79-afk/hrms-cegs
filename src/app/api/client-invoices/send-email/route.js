import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ClientInvoice from '@/lib/models/ClientInvoice';
import SystemSetting from '@/lib/models/SystemSetting';
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

// Retrieve SMTP config from environment variables or MongoDB SystemSetting
async function getSmtpConfig() {
  await connectDB();
  const envHost = process.env.SMTP_HOST || process.env.EMAIL_HOST;
  const envUser = process.env.SMTP_USER || process.env.EMAIL_USER;
  const envPass = process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD;
  const envPort = process.env.SMTP_PORT || process.env.EMAIL_PORT;

  if (envUser && envPass) {
    return {
      host: envHost || 'smtp.gmail.com',
      port: Number(envPort || 465),
      user: envUser,
      pass: envPass,
      source: 'env',
    };
  }

  try {
    const settings = await SystemSetting.find({
      key: { $in: ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass'] },
    }).lean();

    const map = {};
    settings.forEach((s) => {
      map[s.key] = s.value;
    });

    if (map.smtp_user && map.smtp_pass) {
      return {
        host: map.smtp_host || 'smtp.gmail.com',
        port: Number(map.smtp_port || 465),
        user: map.smtp_user,
        pass: map.smtp_pass,
        source: 'database',
      };
    }
  } catch (err) {
    console.warn('Could not read SMTP settings from DB:', err.message);
  }

  return null;
}

// GET: Check if SMTP is configured
export async function GET() {
  try {
    const config = await getSmtpConfig();
    if (config) {
      return NextResponse.json({
        configured: true,
        source: config.source,
        smtpHost: config.host,
        smtpPort: config.port,
        smtpUser: config.user,
      });
    }
    return NextResponse.json({
      configured: false,
      message: 'SMTP credentials are not configured yet.',
    });
  } catch (err) {
    return NextResponse.json({ configured: false, error: err.message });
  }
}

// POST: Send invoice email or save SMTP credentials
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));

    // Action: Save & Verify SMTP settings
    if (body.action === 'save_smtp') {
      const smtpUser = String(body.smtpUser || '').trim();
      const smtpPass = String(body.smtpPass || '').trim().replace(/\s+/g, '');
      const smtpHost = String(body.smtpHost || 'smtp.gmail.com').trim();
      const smtpPort = Number(body.smtpPort || 465);

      if (!smtpUser || !smtpPass) {
        return NextResponse.json(
          { error: 'Email username/address and App Password are required' },
          { status: 400 }
        );
      }

      // Verify connection with nodemailer
      const testTransporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465 || smtpHost.includes('gmail'),
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      try {
        await testTransporter.verify();
      } catch (verifyErr) {
        return NextResponse.json(
          {
            error: `Connection test failed: ${verifyErr.message}. For Gmail: Turn ON 2-Step Verification in Google Account -> Security -> App Passwords -> Generate 16-character password.`,
          },
          { status: 400 }
        );
      }

      await connectDB();
      const upsert = async (key, value) => {
        await SystemSetting.findOneAndUpdate(
          { key },
          { $set: { key, value } },
          { upsert: true, new: true }
        );
      };

      await upsert('smtp_host', smtpHost);
      await upsert('smtp_port', String(smtpPort));
      await upsert('smtp_user', smtpUser);
      await upsert('smtp_pass', smtpPass);

      return NextResponse.json({
        success: true,
        message: `✓ SMTP connection verified and saved! All outgoing invoices will now be sent directly from ${smtpUser}.`,
        smtpUser,
        smtpHost,
        smtpPort,
      });
    }

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

    // Retrieve active SMTP configuration
    const smtpConfig = await getSmtpConfig();

    if (!smtpConfig) {
      return NextResponse.json(
        {
          success: false,
          notConfigured: true,
          error:
            'SMTP email server credentials are not configured. To send emails directly from the server, configure your Gmail App Password below, or click "Send via Gmail Web" for instant 1-click delivery.',
        },
        { status: 400 }
      );
    }

    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.port === 465 || smtpConfig.host.includes('gmail'),
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.pass,
      },
    });

    const mailOptions = {
      from: `"Career Experts Global Solutions" <${smtpConfig.user}>`,
      to: recipients.join(', '),
      cc: ccRecipients.length > 0 ? ccRecipients.join(', ') : undefined,
      subject,
      text: textContent,
      html: htmlContent,
    };

    let info;
    try {
      info = await transporter.sendMail(mailOptions);
    } catch (smtpErr) {
      console.error('SMTP sendMail failed:', smtpErr.message);
      return NextResponse.json(
        {
          success: false,
          error: `SMTP delivery failed: ${smtpErr.message}. If using Gmail, make sure you created a 16-character App Password (at myaccount.google.com/apppasswords) and 2-Step Verification is ON.`,
        },
        { status: 400 }
      );
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
      messageId: info?.messageId || '',
      message: `Invoice ${invoiceNo} sent successfully to ${recipients.length} recipient${
        recipients.length === 1 ? '' : 's'
      } (${recipients.join(', ')}) from ${smtpConfig.user}`,
    });
  } catch (err) {
    console.error('Error in send-email route:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to send invoice email' },
      { status: 500 }
    );
  }
}
