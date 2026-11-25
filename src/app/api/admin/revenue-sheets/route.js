import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import Candidate from '@/lib/models/Candidate';
import JoinerEntry from '@/lib/models/JoinerEntry';
import { getAuthUser, requireRole } from '@/lib/auth';
import { buildRevenueSheetData } from '@/lib/revenue-sheets';

export const dynamic = 'force-dynamic';

// GET /api/admin/revenue-sheets?month=2026-11
// Restricted exclusively to Super Admin
export async function GET(request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Access token required' }, { status: 401 });
    }
    if (!requireRole(authUser, ['super_admin'])) {
      return NextResponse.json(
        { error: 'Forbidden: Revenue Sheets are restricted to Super Admin only.' },
        { status: 403 }
      );
    }

    await connectDB();
    const url = new URL(request.url);
    const monthKey = url.searchParams.get('month') || '';

    const [users, candidates, joinerEntries] = await Promise.all([
      User.find({}, 'name role employee_id status').lean(),
      Candidate.find(
        {},
        'name number date employee company process response followUp1 followUp2 followUp3 category callStatus createdAt'
      ).lean(),
      JoinerEntry.find({}).lean(),
    ]);

    const payload = buildRevenueSheetData({
      monthKey,
      users: users.map((u) => ({ ...u, id: u._id.toString() })),
      candidates: candidates.map((c) => ({ ...c, id: c._id.toString() })),
      joinerEntries: joinerEntries.map((j) => ({ ...j, id: j._id.toString() })),
    });

    return NextResponse.json(payload);
  } catch (err) {
    console.error('Revenue Sheets GET Error:', err);
    return NextResponse.json({ error: 'Failed to generate revenue sheets' }, { status: 500 });
  }
}
