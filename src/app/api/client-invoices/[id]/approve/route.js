import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import ClientInvoice from '@/lib/models/ClientInvoice';
import Notification from '@/lib/models/Notification';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function flatten(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  return { ...o, id: o._id.toString(), _id: o._id.toString() };
}

/**
 * POST /api/client-invoices/[id]/approve
 * Dual-approval action:
 * - Mohammed Raheel (EMP0005 • Recruiter)
 * - Super Admin (super_admin role)
 */
export async function POST(request, { params }) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Access token required' }, { status: 401 });
    }

    const { id } = params;
    const role = (authUser.role || '').toLowerCase();
    const isSuperAdmin = ['super_admin', 'admin', 'it_team', 'finance'].includes(role);
    const isRaheel =
      authUser.employee_id === 'EMP0005' ||
      String(authUser.name || '').toLowerCase().includes('raheel') ||
      String(authUser.email || '').toLowerCase().includes('raheel');

    if (!isSuperAdmin && !isRaheel) {
      return NextResponse.json(
        {
          error:
            'Forbidden: Only Mohammed Raheel (EMP0005 • Recruiter) or Super Admin can approve client invoices.',
        },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || 'approve').toLowerCase(); // 'approve' | 'reject'
    const notes = String(body.notes || '').trim();
    const approverType = String(body.approverType || '').toLowerCase(); // 'superadmin' | 'recruiter'

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject".' },
        { status: 400 }
      );
    }

    await connectDB();
    let invoice = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      invoice = await ClientInvoice.findById(id);
    }
    if (!invoice) {
      invoice = await ClientInvoice.findOne({
        $or: [{ invoiceNo: id }, { _id: id }],
      });
    }

    if (!invoice) {
      // Fallback: check if id is an invoiceNo and upsert
      invoice = await ClientInvoice.findOneAndUpdate(
        { invoiceNo: id },
        { $setOnInsert: { invoiceNo: id, client: 'Client Billing', stage: 'raised', status: 'Pending' } },
        { upsert: true, new: true }
      );
    }

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Initialize approvals if missing on legacy documents
    if (!invoice.approvals) {
      invoice.approvals = {
        recruiter: {
          status: 'pending',
          approverName: 'Mohammed raheel',
          employeeId: 'EMP0005',
          approvedAt: '',
          approvedBy: '',
          notes: '',
        },
        superAdmin: {
          status: 'pending',
          approverName: 'Super Admin',
          approvedAt: '',
          approvedBy: '',
          notes: '',
        },
      };
    }

    const nowIso = new Date().toISOString();
    const isApproving = action === 'approve';

    if (approverType === 'superadmin' || (isSuperAdmin && approverType !== 'recruiter')) {
      invoice.approvals.superAdmin = {
        status: isApproving ? 'approved' : 'rejected',
        approverName: 'Super Admin',
        approvedAt: nowIso,
        approvedBy: authUser.name || 'Super Admin',
        notes: notes || (isApproving ? 'Approved by Super Admin' : 'Changes requested by Super Admin'),
      };
    }

    if (approverType === 'recruiter' || (isRaheel && approverType !== 'superadmin')) {
      invoice.approvals.recruiter = {
        status: isApproving ? 'approved' : 'rejected',
        approverName: 'Mohammed raheel',
        employeeId: 'EMP0005',
        approvedAt: nowIso,
        approvedBy: authUser.name || 'Mohammed raheel (EMP0005)',
        notes: notes || (isApproving ? 'Approved by Mohammed raheel' : 'Changes requested by Mohammed raheel'),
      };
    }

    // Evaluate overall approval status: Either Mohammed Raheel OR Super Admin approval unlocks the invoice
    const recStatus = invoice.approvals.recruiter?.status || 'pending';
    const saStatus = invoice.approvals.superAdmin?.status || 'pending';

    if (recStatus === 'approved' || saStatus === 'approved') {
      invoice.approvalStatus = 'approved';
    } else if (recStatus === 'rejected' && saStatus === 'rejected') {
      invoice.approvalStatus = 'rejected';
    } else if (recStatus === 'rejected' || saStatus === 'rejected') {
      invoice.approvalStatus = 'rejected';
    } else {
      invoice.approvalStatus = 'pending';
    }

    invoice.markModified('approvals');
    await invoice.save();

    // Broadcast system notification
    try {
      const actorName = isSuperAdmin ? 'Super Admin' : 'Mohammed raheel (EMP0005)';
      const invDisplay = invoice.invoiceNo ? `Invoice #${invoice.invoiceNo}` : 'Invoice';
      const notifTitle = isApproving
        ? `✅ ${invDisplay} Approved by ${actorName}`
        : `⚠️ ${invDisplay} Changes Requested by ${actorName}`;
      const notifMsg = isApproving
        ? `${invDisplay} (${invoice.client}) was approved by ${actorName}. Unlocked for emailing to client.`
        : `${invDisplay} was rejected with remark: "${notes || 'Please review and adjust placement seats'}".`;

      await Notification.create({
        title: notifTitle,
        message: notifMsg,
        type: isApproving ? 'invoice_approved' : 'invoice_rejected',
        read: false,
      });
    } catch (notifErr) {
      console.warn('Notification create warning:', notifErr.message);
    }

    return NextResponse.json({
      success: true,
      message: isApproving ? 'Approval recorded successfully.' : 'Rejection recorded.',
      invoice: flatten(invoice),
    });
  } catch (error) {
    console.error('Invoice approve POST error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

