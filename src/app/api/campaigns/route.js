import { NextResponse } from 'next/server';
import { z } from 'zod';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Campaign from '@/lib/models/Campaign';
import User from '@/lib/models/User';
import { getAuthUser, requireRole } from '@/lib/auth';
import { parseMonthKey, getMonthWeekPeriods, deriveCampaignTargets, currentMonthKey } from '@/lib/campaign-weeks';
import { evaluateAndAward, flattenUser } from '@/lib/campaign-evaluate';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  monthKey: z.string().regex(/^\d{4}-\d{2}$/),
  monthlyTeamTarget: z.number().int().positive(),
  participantIds: z.array(z.string().min(1)).min(1),
});

function serializeCampaign(doc, extra = {}) {
  const o = doc.toObject ? doc.toObject() : doc;
  const weeks = getMonthWeekPeriods(o.monthKey);
  const derived = deriveCampaignTargets(
    o.monthlyTeamTarget,
    weeks.length,
    (o.participantIds || []).length
  );
  return {
    id: o._id.toString(),
    _id: o._id.toString(),
    monthKey: o.monthKey,
    monthlyTeamTarget: o.monthlyTeamTarget,
    participantIds: (o.participantIds || []).map((id) => id.toString()),
    createdBy: o.createdBy?.toString?.() || null,
    weeks,
    ...derived,
    ...extra,
  };
}

function computeHallOfFame(snap, campaign) {
  if (!snap) {
    return {
      performerOfWeek: null,
      performerOfMonth: null,
      weekKey: '',
      monthKey: campaign?.monthKey || '',
    };
  }
  const allEmps = snap.employees || [];
  const currentWeek = snap.campaign?.currentWeek;

  let performerOfWeek = null;
  if (allEmps.length > 0) {
    const list = allEmps.map((e) => {
      const wInfo = (e.weekly || []).find((w) => w.weekKey === currentWeek?.weekKey) || e.thisWeek;
      return {
        ...e,
        weekTarget: wInfo?.target ?? 0,
        weekActual: wInfo?.actual ?? 0,
        weekStatus: wInfo?.label ?? 'Pending',
        weekAchieved: wInfo?.achieved ?? false,
        weekBonus: wInfo?.bonusAwarded ? wInfo.bonusAmount : (wInfo?.achieved ? 5000 : 0),
      };
    });
    list.sort((a, b) => (b.weekActual - a.weekActual) || (b.weeklyWins - a.weeklyWins) || (b.monthlyJoiners - a.monthlyJoiners));
    performerOfWeek = list[0] || null;
  }

  let performerOfMonth = null;
  if (snap.eomWinner) {
    performerOfMonth = snap.eomWinner;
  } else if (allEmps.length > 0) {
    const sorted = [...allEmps].sort((a, b) => (b.monthlyJoiners - a.monthlyJoiners) || (b.weeklyWins - a.weeklyWins));
    performerOfMonth = sorted[0] || null;
  }

  return {
    performerOfWeek,
    performerOfMonth,
    weekKey: currentWeek?.weekKey || '',
    monthKey: snap.campaign?.monthKey || campaign?.monthKey || '',
  };
}

export async function GET(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });

  await connectDB();
  const url = new URL(request.url);
  const monthKey = url.searchParams.get('month') || currentMonthKey();
  if (!parseMonthKey(monthKey)) {
    return NextResponse.json({ error: 'Invalid month' }, { status: 400 });
  }

  const campaign = await Campaign.findOne({ monthKey });
  const selectable = await User.find({
    $or: [
      { role: { $in: ['employee', 'admin', 'finance'] } },
      { employee_id: 'EMP0015' },
    ],
    status: { $in: ['active', 'on_leave'] },
  })
    .select('name email role employee_id status avatar_url')
    .sort({ name: 1 })
    .lean();

  const canManage = requireRole(authUser, ['admin', 'super_admin', 'finance']);

  if (!campaign) {
    return NextResponse.json({
      assigned: false,
      canManage,
      monthKey,
      weeks: getMonthWeekPeriods(monthKey),
      selectable: canManage ? selectable.map(flattenUser) : [],
      campaign: null,
      snapshot: null,
      hallOfFame: { performerOfWeek: null, performerOfMonth: null, weekKey: '', monthKey },
    });
  }

  const isParticipant = (campaign.participantIds || []).some(
    (id) => String(id) === String(authUser.id)
  );

  const snap = await evaluateAndAward(campaign, authUser.id);
  const hallOfFame = computeHallOfFame(snap, campaign);

  if (!canManage && !isParticipant) {
    return NextResponse.json({
      assigned: false,
      canManage,
      isParticipant: false,
      monthKey,
      selectable: [],
      campaign: serializeCampaign(campaign),
      snapshot: {
        campaign: snap.campaign,
      },
      hallOfFame,
    });
  }

  let snapshot = snap;
  if (!canManage && isParticipant) {
    snapshot = {
      ...snap,
      employees: snap.employees.filter((e) => e.id === String(authUser.id)),
    };
  }

  return NextResponse.json({
    assigned: canManage || isParticipant,
    canManage,
    isParticipant,
    monthKey,
    selectable: canManage ? selectable.map(flattenUser) : [],
    campaign: serializeCampaign(campaign),
    snapshot,
    hallOfFame,
  });
}

export async function POST(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });
  if (!requireRole(authUser, ['admin', 'super_admin', 'finance'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse({
    ...body,
    monthlyTeamTarget: Number(body.monthlyTeamTarget),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
  }

  const { monthKey, monthlyTeamTarget, participantIds } = parsed.data;
  const uniqueIds = [...new Set(participantIds)];
  if (!uniqueIds.length) {
    return NextResponse.json({ error: 'Select at least one employee' }, { status: 400 });
  }

  await connectDB();
  const validUsers = await User.find({
    _id: { $in: uniqueIds.filter((id) => mongoose.Types.ObjectId.isValid(id)) },
    role: { $in: ['employee', 'admin'] },
  }).select('_id');
  if (validUsers.length !== uniqueIds.length) {
    return NextResponse.json(
      { error: 'One or more selected employees are invalid' },
      { status: 400 }
    );
  }

  const campaign = await Campaign.findOneAndUpdate(
    { monthKey },
    {
      $set: {
        monthlyTeamTarget,
        participantIds: validUsers.map((u) => u._id),
      },
      $setOnInsert: { createdBy: authUser.id },
    },
    { new: true, upsert: true }
  );

  const snap = await evaluateAndAward(campaign, authUser.id);
  const hallOfFame = computeHallOfFame(snap, campaign);
  return NextResponse.json({ campaign: serializeCampaign(campaign), snapshot: snap, hallOfFame }, { status: 201 });
}
