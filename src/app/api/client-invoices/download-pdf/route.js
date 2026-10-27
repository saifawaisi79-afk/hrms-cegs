import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ClientInvoice from '@/lib/models/ClientInvoice';
import { generateInvoicePdfBuffer } from '@/lib/generateInvoicePdf';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const invoiceNo = searchParams.get('invoiceNo');

    let invoice = null;

    if (id || invoiceNo) {
      try {
        await connectDB();
        if (id && id.match(/^[0-9a-fA-F]{24}$/)) {
          invoice = await ClientInvoice.findById(id).lean();
        }
        if (!invoice && invoiceNo) {
          invoice = await ClientInvoice.findOne({ invoiceNo }).lean();
        }
      } catch (dbErr) {
        console.warn('DB lookup failed in PDF GET:', dbErr.message);
      }
    }

    if (!invoice) {
      invoice = {
        invoiceNo: invoiceNo || 'INV-01',
        client: searchParams.get('client') || 'Valued Client',
        amount: Number(searchParams.get('amount') || 0),
        dueDate: searchParams.get('dueDate') || '30 days',
        invoiceDate: searchParams.get('invoiceDate') || new Date().toISOString().slice(0, 10),
      };
    }

    const pdfBuffer = await generateInvoicePdfBuffer(invoice);
    const safeInvNo = String(invoice.invoiceNo || 'INV').replace(/[^a-zA-Z0-9_-]/g, '_');

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="INVOICE_${safeInvNo}.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (err) {
    console.error('PDF download error:', err);
    return NextResponse.json({ error: err.message || 'Failed to generate PDF' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    let invoice = await request.json().catch(() => ({}));
    if ((!invoice || !invoice.client) && (invoice?.id || invoice?.invoiceNo)) {
      try {
        await connectDB();
        if (invoice.id && invoice.id.match(/^[0-9a-fA-F]{24}$/)) {
          const dbInv = await ClientInvoice.findById(invoice.id).lean();
          if (dbInv) invoice = { ...dbInv, ...invoice };
        } else if (invoice.invoiceNo) {
          const dbInv = await ClientInvoice.findOne({ invoiceNo: invoice.invoiceNo }).lean();
          if (dbInv) invoice = { ...dbInv, ...invoice };
        }
      } catch (dbErr) {
        console.warn('DB lookup failed in PDF POST:', dbErr.message);
      }
    }

    const pdfBuffer = await generateInvoicePdfBuffer(invoice);
    const safeInvNo = String(invoice.invoiceNo || 'INV').replace(/[^a-zA-Z0-9_-]/g, '_');

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="INVOICE_${safeInvNo}.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (err) {
    console.error('PDF POST error:', err);
    return NextResponse.json({ error: err.message || 'Failed to generate PDF' }, { status: 500 });
  }
}
