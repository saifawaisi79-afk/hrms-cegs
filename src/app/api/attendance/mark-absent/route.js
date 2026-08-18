import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import Attendance from '@/lib/models/Attendance';
import Leave from '@/lib/models/Leave';
import { getAuthUser } from '@/lib/auth';
import {
  findMissingAbsentees,
  toIsoDate,
} from '@/lib/auto-absent';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function markAbsentees(request) {
  const authUser = getAuthUser(request);
  const authHeader = request.headers.get('authorization') || '';
  const cronSecret = request.headers.get('x-cron-secret') || '';
  const envSecret = process.env.CRON_SECRET || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const isCron = !!(envSecret && (cronSecret === envSecret || bearer === envSecret));
  const isVercelCron = (request.headers.get('user-agent') || '').toLowerCase().includes('vercel-cron');
  if (!authUser && !isCron && !isVercelCron) {
    return NextResponse.json({ error: 'Access token required' }, { status: 401 });
  }

  await connectDB();

  const users = await User.find({ status: { $in: ['active', 'on_leave'] } })
    .select('_id name employee_id status joining_date')
    .lean();

  const mappedUsers = users.map((u) => ({
    id: u._id.toString(),
    name: u.name,
    employee_id: u.employee_id,
    status: u.status,
    joining_date: u.joining_date,
  }));

  const attendanceRows = await Attendance.find({
    date: { $gte: toIsoDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) },
  })
    .select('user_id date status')
    .lean();

  const attendance = attendanceRows.map((a) => ({
    uid: a.user_id?.toString(),
    date: a.date,
    status: a.status,
  }));

  let leaves = [];
  try {
    const leaveRows = await Leave.find({ status: 'approved' }).lean();
    leaves = leaveRows.map((l) => ({
      uid: l.user_id?.toString(),
      status: l.status,
      start_date: l.start_date || l.start,
      end_date: l.end_date || l.end,
      employee_name: l.employee_name,
    }));
  } catch {
    leaves = [];
  }

  const missing = findMissingAbsentees({
    users: mappedUsers,
    attendance,
    leaves,
    now: new Date(),
  });

  let created = 0;
  for (const m of missing) {
    if (!mongoose.Types.ObjectId.isValid(m.uid)) continue;
    const existing = await Attendance.findOne({ user_id: m.uid, date: m.date });
    if (existing) continue;
    await Attendance.create({
      user_id: m.uid,
      date: m.date,
      check_in_time: null,
      check_out_time: null,
      status: 'absent',
      work_hours: 0,
      location_verified: false,
    });
    created += 1;
  }

  return NextResponse.json({
    ok: true,
    missing: missing.length,
    created,
    date: toIsoDate(),
    absentees: missing,
  });
}

/** Vercel Cron uses GET */
export async function GET(request) {
  try {
    return await markAbsentees(request);
  } catch (error) {
    console.error('mark-absent GET error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST /api/attendance/mark-absent
 * Marks active staff absent for past working days (and today after cutoff)
 * when they have no clock-in and are not on approved leave.
 */
export async function POST(request) {
  try {
    return await markAbsentees(request);
  } catch (error) {
    console.error('mark-absent POST error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
