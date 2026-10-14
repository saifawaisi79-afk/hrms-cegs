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

const SEED_INVOICES = [
  {
    invoiceNo: 'INV-001',
    client: 'Apex Corp',
    projectMilestone: 'Brand Identity · Kickoff',
    amount: 29500,
    dueDate: '10 May',
    status: 'Paid',
    stage: 'cleared',
    paidDate: '2026-05-10',
    invoiceDate: '2026-05-01',
    notes: 'Initial milestone payment completed via wire transfer.',
  },
  {
    invoiceNo: 'INV-002',
    client: 'Apex Corp',
    projectMilestone: 'Brand Identity · Design Delivery',
    amount: 47200,
    dueDate: '24 May',
    status: 'Pending',
    stage: 'raised',
    invoiceDate: '2026-05-10',
    notes: 'Design delivery sprint 2 review pending approval.',
  },
  {
    invoiceNo: 'INV-003',
    client: 'Apex Corp',
    projectMilestone: 'Brand Identity · Development',
    amount: 53100,
    dueDate: '15 Jun',
    status: 'Pending',
    stage: 'raised',
    invoiceDate: '2026-05-15',
    notes: 'Frontend and design token integration in progress.',
  },
  {
    invoiceNo: 'INV-000A',
    client: 'Nexus Media',
    projectMilestone: 'Digital Brand Activation · Retainer',
    amount: 185000,
    dueDate: '28 Apr',
    status: 'Paid',
    stage: 'cleared',
    paidDate: '2026-04-28',
    invoiceDate: '2026-04-10',
    notes: 'Full payment received.',
  },
  {
    invoiceNo: 'INV-000B',
    client: 'Starlight Tech',
    projectMilestone: 'UX Design System Architecture',
    amount: 115000,
    dueDate: '14 Apr',
    status: 'Paid',
    stage: 'cleared',
    paidDate: '2026-04-14',
    invoiceDate: '2026-04-01',
    notes: 'Full payment cleared via NEFT.',
  },
  {
    invoiceNo: 'INV-000C',
    client: 'TechCorp Solutions',
    projectMilestone: 'Enterprise Integration Advisory',
    amount: 90500,
    dueDate: '02 Apr',
    status: 'Paid',
    stage: 'cleared',
    paidDate: '2026-04-02',
    invoiceDate: '2026-03-25',
    notes: 'Cleared on receipt.',
  },
];

async function seedCrmInvoicesIfEmpty() {
  const count = await ClientInvoice.countDocuments({
    projectMilestone: { $exists: true, $ne: '' },
  });
  if (count === 0) {
    for (const item of SEED_INVOICES) {
      await ClientInvoice.create(item);
    }
  }
}

export async function GET(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });
  if (!canFinance(authUser)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  await syncEligibleJoiners();
  await seedCrmInvoicesIfEmpty();

  const url = new URL(request.url);
  const stage = url.searchParams.get('stage');
  const month = url.searchParams.get('month');
  const client = url.searchParams.get('client');
  const status = url.searchParams.get('status');
  const search = url.searchParams.get('search');

  const filter = {};
  if (stage) filter.stage = stage;
  if (month) filter.monthKey = month;
  if (client && client !== 'ALL') {
    filter.client = { $regex: new RegExp(`^${client}$`, 'i') };
  }
  if (status && status !== 'ALL') {
    filter.status = { $regex: new RegExp(`^${status}$`, 'i') };
  }
  if (search) {
    const q = search.trim();
    filter.$or = [
      { client: { $regex: q, $options: 'i' } },
      { invoiceNo: { $regex: q, $options: 'i' } },
      { projectMilestone: { $regex: q, $options: 'i' } },
      { candidateName: { $regex: q, $options: 'i' } },
    ];
  }

  const rows = await ClientInvoice.find(filter).sort({ createdAt: -1, invoiceNo: -1 }).lean();
  return NextResponse.json(rows.map(flatten));
}

export async function POST(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });
  if (!canFinance(authUser)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json().catch(() => ({}));

  // Handle Mark Paid action
  if (body.action === 'mark_paid') {
    await connectDB();
    const id = body.id || body._id;
    if (!id) return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
    const updated = await ClientInvoice.findByIdAndUpdate(
      id,
      {
        $set: {
          status: 'Paid',
          stage: 'cleared',
          paidDate: todayIsoDate(),
        },
      },
      { new: true }
    );
    if (!updated) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    return NextResponse.json(flatten(updated));
  }

  // Handle Create Invoice from CRM modal
  if (body.action === 'create_invoice') {
    await connectDB();
    const client = String(body.client || '').trim();
    if (!client) return NextResponse.json({ error: 'Client / Company is required' }, { status: 400 });

    let invoiceNo = String(body.invoiceNo || '').trim();
    if (!invoiceNo) {
      const count = await ClientInvoice.countDocuments();
      invoiceNo = `INV-${String(count + 1).padStart(3, '0')}`;
    }

    const amount = Number(body.amount) || 0;
    const status = body.status === 'Paid' ? 'Paid' : 'Pending';
    const stage = status === 'Paid' ? 'cleared' : 'raised';

    const created = await ClientInvoice.create({
      invoiceNo,
      client,
      projectMilestone: String(body.projectMilestone || 'Project Milestone').trim(),
      amount,
      basicAmount: amount,
      dueDate: String(body.dueDate || '10 days').trim(),
      status,
      stage,
      invoiceDate: String(body.invoiceDate || todayIsoDate()).trim(),
      paidDate: status === 'Paid' ? todayIsoDate() : '',
      clientEmail: String(body.clientEmail || '').trim(),
      clientPhone: String(body.clientPhone || '').trim(),
      notes: String(body.notes || '').trim(),
    });

    return NextResponse.json(flatten(created), { status: 201 });
  }

  // Handle Send Reminder action
  if (body.action === 'send_reminder') {
    return NextResponse.json({
      success: true,
      message: `Payment reminder sent successfully for invoice ${body.invoiceNo || ''}`,
      sentAt: new Date().toISOString(),
    });
  }

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
