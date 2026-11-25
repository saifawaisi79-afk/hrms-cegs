import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import Candidate from '@/lib/models/Candidate';
import JoinerEntry from '@/lib/models/JoinerEntry';
import ClientInvoice from '@/lib/models/ClientInvoice';
import { getAuthUser } from '@/lib/auth';
import { buildLiveWeeklyTracker } from '@/lib/finance-weekly-tracker';

export const dynamic = 'force-dynamic';

function canAccessWeeklyFinance(user) {
  if (!user) return false;
  const r = String(user.role || '').toLowerCase();
  const eid = String(user.employee_id || user.eid || '').toUpperCase();
  const name = String(user.name || '').toLowerCase();
  const email = String(user.email || '').toLowerCase();
  const isRaheel = eid === 'EMP0005' || name.includes('raheel') || email.includes('raheel');
  return ['admin', 'super_admin', 'finance', 'it_team', 'hr', 'management'].includes(r) || isRaheel;
}

// GET /api/finance/weekly-tracker
export async function GET(request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Access token required' }, { status: 401 });
    }
    if (!canAccessWeeklyFinance(authUser)) {
      return NextResponse.json({ error: 'Forbidden: Finance/HR/Admin access required' }, { status: 403 });
    }

    await connectDB();

    const [users, candidates, joinerEntries, invoices] = await Promise.all([
      User.find({}, 'name role employee_id status').lean(),
      Candidate.find(
        {},
        'name number date employee company process response followUp1 followUp2 followUp3 category callStatus createdAt'
      ).lean(),
      JoinerEntry.find({}).lean(),
      ClientInvoice.find(
        { stage: { $in: ['raised', 'cleared'] } },
        'stage invoiceNo joinerId joinerIds candidateName items.empId items.employeeName'
      ).lean(),
    ]);

    const payload = buildLiveWeeklyTracker({
      users: users.map((u) => ({ ...u, id: u._id.toString() })),
      candidates: candidates.map((c) => ({ ...c, id: c._id.toString() })),
      joinerEntries: joinerEntries.map((j) => ({ ...j, id: j._id.toString() })),
      invoices: invoices.map((inv) => ({ ...inv, id: inv._id.toString() })),
    });

    return NextResponse.json(payload);
  } catch (err) {
    console.error('Weekly Tracker GET Error:', err);
    return NextResponse.json({ error: 'Failed to load live weekly billing tracker' }, { status: 500 });
  }
}
