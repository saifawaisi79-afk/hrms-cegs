import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { z } from 'zod';
import connectDB from '@/lib/db';
import ClientInvoice from '@/lib/models/ClientInvoice';
import { getAuthUser, requireRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  stage: z.enum(['to_raise', 'raised', 'cleared']).optional(),
  candidateName: z.string().optional(),
  phone: z.string().optional(),
  client: z.string().optional(),
  joiningDate: z.string().optional(),
  billingDate: z.string().optional(),
  recruiter: z.string().optional(),
  bi: z.number().optional(),
  ai: z.number().optional(),
  status: z.string().optional(),
  candidateCount: z.number().optional(),
  invoiceDate: z.string().optional(),
  revisedRequested: z.string().optional(),
  revisedSent: z.string().optional(),
  invoiceNo: z.string().optional(),
  gstStatus: z.string().optional(),
  gstAmtStatus: z.string().optional(),
  gstNumber: z.string().optional(),
  basicAmount: z.number().optional(),
  moneyReceived: z.number().optional(),
  remark: z.string().optional(),
  monthKey: z.string().optional(),
});

function flatten(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  return { ...o, id: o._id.toString(), _id: o._id.toString() };
}

export async function PATCH(request, { params }) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });
  if (!requireRole(authUser, ['admin', 'super_admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }
  const body = await request.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
  }

  await connectDB();
  const updated = await ClientInvoice.findByIdAndUpdate(id, { $set: parsed.data }, { new: true });
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(flatten(updated));
}

export async function DELETE(request, { params }) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });
  if (!requireRole(authUser, ['admin', 'super_admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }
  await connectDB();
  const row = await ClientInvoice.findById(id);
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (row.stage === 'to_raise' && row.joinerId) {
    return NextResponse.json({ error: 'Joiner rows stay on the sheet. Clear BI, AI, or status instead.' }, { status: 400 });
  }
  if (row.stage !== 'to_raise' && row.joinerIds?.length) {
    await ClientInvoice.updateMany({ invoiceId: id }, { $set: { invoiceId: '' } });
  }
  await row.deleteOne();
  return NextResponse.json({ message: 'Deleted' });
}
