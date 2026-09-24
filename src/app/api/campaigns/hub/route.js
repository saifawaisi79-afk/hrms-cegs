import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Campaign from '@/lib/models/Campaign';
import { getAuthUser, requireRole } from '@/lib/auth';
import { currentMonthKey, parseMonthKey } from '@/lib/campaign-weeks';
import { evaluateAndAward } from '@/lib/campaign-evaluate';

export const dynamic = 'force-dynamic';

/** GET /api/campaigns/hub — evaluate bonuses server-side (idempotent). */
export async function GET(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });

  const url = new URL(request.url);
  const monthKey = url.searchParams.get('month') || currentMonthKey();
  if (!parseMonthKey(monthKey)) {
    return NextResponse.json({ error: 'Invalid month' }, { status: 400 });
  }

  await connectDB();
  const campaign = await Campaign.findOne({ monthKey });
  if (!campaign) {
    return NextResponse.json({ assigned: false, monthKey, snapshot: null });
  }

  const canManage = requireRole(authUser, ['admin', 'super_admin']);
  const isParticipant = (campaign.participantIds || []).some(
    (id) => String(id) === String(authUser.id)
  );
  if (!canManage && !isParticipant) {
    return NextResponse.json({ assigned: false, monthKey, snapshot: null });
  }

  const snapshot = await evaluateAndAward(campaign, authUser.id);
  return NextResponse.json({ assigned: true, canManage, isParticipant, monthKey, snapshot });
}
