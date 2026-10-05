import { NextResponse } from 'next/server';
import { z } from 'zod';
import connectDB from '@/lib/db';
import ClientInvoice from '@/lib/models/ClientInvoice';
import JoinerEntry from '@/lib/models/JoinerEntry';
import { getAuthUser, requireRole } from '@/lib/auth';
import { joinerBillEligible } from '@/lib/client-invoice-rules';
import { todayIsoDate, normalizeCandidateDate } from '@/lib/candidate-dates';

export const dynamic = 'force-dynamic';

function canFinance(user) {
  return requireRole(user, ['admin', 'super_admin', 'finance']);
}

function flatten(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  return { ...o, id: o._id?.toString(), _id: o._id?.toString() };
}

async function syncEligibleJoiners() {
  const today = todayIsoDate();
  const joiners = await JoinerEntry.find({}).lean();
  for (const joiner of joiners) {
    const bill = joinerBillEligible(joiner, today);
    if (!bill) continue;
    const joinerId = joiner._id.toString();
    const existing = await ClientInvoice.findOne({ joinerId });
    if (existing) {
      if (existing.stage === 'to_raise' && !existing.invoiceId) {
        existing.candidateName = joiner.name || existing.candidateName;
        existing.phone = joiner.phone || existing.phone;
        existing.client = joiner.process || existing.client;
        existing.joiningDate = bill.joiningDate;
        existing.billingDate = bill.billingDate;
        existing.monthKey = bill.monthKey;
        existing.recruiter = joiner.recruiterName || existing.recruiter;
        await existing.save();
      }
      continue;
    }
    await ClientInvoice.create({
      stage: 'to_raise',
      monthKey: bill.monthKey,
      joinerId,
      candidateName: joiner.name || '',
      phone: joiner.phone || '',
      client: joiner.process || '',
      joiningDate: bill.joiningDate,
      billingDate: bill.billingDate,
      recruiter: joiner.recruiterName || '',
      status: '',
      invoiceId: '',
    });
  }
}

const createSchema = z.object({
  action: z.literal('raise').optional(),
  ids: z.array(z.string()).optional(),
  invoiceDate: z.string().optional().default(''),
  revisedRequested: z.string().optional().default(''),
  revisedSent: z.string().optional().default(''),
  invoiceNo: z.string().optional().default(''),
  status: z.string().optional().default(''),
  client: z.string().optional(),
  monthKey: z.string().optional(),
  candidateName: z.string().optional(),
  phone: z.string().optional(),
  joiningDate: z.string().optional(),
  billingDate: z.string().optional(),
  recruiter: z.string().optional(),
  bi: z.number().optional(),
  ai: z.number().optional(),
});

export async function GET(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });
  if (!canFinance(authUser)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  await syncEligibleJoiners();

  const url = new URL(request.url);
  const stage = url.searchParams.get('stage');
  const month = url.searchParams.get('month');
  const filter = {};
  if (stage) filter.stage = stage;
  if (month) filter.monthKey = month;
  const rows = await ClientInvoice.find(filter).sort({ client: 1, createdAt: 1 }).lean();
  return NextResponse.json(rows.map(flatten));
}

export async function POST(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });
  if (!canFinance(authUser)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  if (body.action === 'import') {
    await connectDB();
    const stage = ['to_raise', 'raised', 'cleared', 'gst'].includes(body.stage) ? body.stage : 'to_raise';
    const incoming = Array.isArray(body.rows) ? body.rows.slice(0, 500) : [];
    let saved = 0;
    for (const row of incoming) {
      if (stage === 'gst') {
        const invoiceNo = String(row.invoiceNo || '').trim();
        if (!invoiceNo) continue;
        const existing = await ClientInvoice.findOne({ invoiceNo, stage: { $in: ['raised', 'cleared'] } });
        if (existing) {
          if (row.gstNumber) existing.gstNumber = String(row.gstNumber);
          if (row.basicAmount != null && row.basicAmount !== '') existing.basicAmount = Number(row.basicAmount) || 0;
          if (row.moneyReceived != null && row.moneyReceived !== '') existing.moneyReceived = Number(row.moneyReceived) || 0;
          if (row.remark) existing.remark = String(row.remark);
          if (row.client) existing.client = String(row.client);
          await existing.save();
        } else {
          await ClientInvoice.create({
            stage: 'raised',
            invoiceNo,
            client: row.client || '',
            invoiceDate: row.invoiceDate || '',
            gstNumber: row.gstNumber || '',
            basicAmount: Number(row.basicAmount) || 0,
            moneyReceived: Number(row.moneyReceived) || 0,
            remark: row.remark || '',
          });
        }
        saved += 1;
        continue;
      }
      const stageName = stage === 'cleared' || stage === 'raised' ? stage : 'to_raise';
      const candidateName = String(row.candidateName || '').trim();
      const client = String(row.client || '').trim();
      if (/^total$/i.test(candidateName) || /^total$/i.test(client)) continue;
      if (stageName === 'to_raise' && !candidateName) continue;
      if (stageName !== 'to_raise' && !client && !String(row.invoiceNo || '').trim()) continue;
      const billing = normalizeCandidateDate(row.billingDate) || '';
      await ClientInvoice.create({
        stage: stageName,
        monthKey: billing ? billing.slice(0, 7) : (body.monthKey || todayIsoDate().slice(0, 7)),
        invoiceId: '',
        candidateName,
        phone: String(row.phone || ''),
        client,
        joiningDate: normalizeCandidateDate(row.joiningDate) || '',
        billingDate: billing,
        recruiter: String(row.recruiter || ''),
        bi: Number(row.bi) || 0,
        ai: Number(row.ai) || 0,
        status: String(row.status || ''),
        candidateCount: Number(row.candidateCount) || (stageName === 'to_raise' ? 0 : 1),
        invoiceDate: String(row.invoiceDate || ''),
        revisedRequested: String(row.revisedRequested || ''),
        revisedSent: String(row.revisedSent || ''),
        invoiceNo: String(row.invoiceNo || ''),
        gstStatus: String(row.gstStatus || ''),
        gstAmtStatus: String(row.gstAmtStatus || ''),
      });
      saved += 1;
    }
    return NextResponse.json({ saved });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
  }

  await connectDB();

  if (parsed.data.action === 'raise') {
    const ids = parsed.data.ids || [];
    if (!ids.length) return NextResponse.json({ error: 'Select at least one row' }, { status: 400 });
    const rows = await ClientInvoice.find({
      _id: { $in: ids },
      stage: 'to_raise',
      $or: [{ invoiceId: '' }, { invoiceId: null }, { invoiceId: { $exists: false } }],
    });
    if (!rows.length) return NextResponse.json({ error: 'No open to-raise rows found' }, { status: 400 });
    const client = rows[0].client || '';
    if (rows.some((r) => (r.client || '') !== client)) {
      return NextResponse.json({ error: 'Raise one client at a time' }, { status: 400 });
    }
    const bi = rows.reduce((s, r) => s + (Number(r.bi) || 0), 0);
    const ai = rows.reduce((s, r) => s + (Number(r.ai) || 0), 0);
    const created = await ClientInvoice.create({
      stage: 'raised',
      client,
      monthKey: rows[0].monthKey || '',
      candidateCount: rows.length,
      bi,
      ai,
      invoiceDate: parsed.data.invoiceDate || '',
      revisedRequested: parsed.data.revisedRequested || '',
      revisedSent: parsed.data.revisedSent || '',
      invoiceNo: parsed.data.invoiceNo || '',
      status: parsed.data.status || '',
      joinerIds: rows.map((r) => r.joinerId).filter(Boolean),
    });
    const invoiceId = created._id.toString();
    await ClientInvoice.updateMany(
      { _id: { $in: rows.map((r) => r._id) } },
      { $set: { invoiceId } }
    );
    return NextResponse.json(flatten(created), { status: 201 });
  }

  const monthKey = parsed.data.monthKey || todayIsoDate().slice(0, 7);
  const created = await ClientInvoice.create({
    stage: 'to_raise',
    monthKey,
    client: parsed.data.client || '',
    candidateName: parsed.data.candidateName || '',
    phone: parsed.data.phone || '',
    joiningDate: parsed.data.joiningDate || '',
    billingDate: parsed.data.billingDate || '',
    recruiter: parsed.data.recruiter || '',
    bi: parsed.data.bi || 0,
    ai: parsed.data.ai || 0,
    status: parsed.data.status || '',
  });
  return NextResponse.json(flatten(created), { status: 201 });
}
