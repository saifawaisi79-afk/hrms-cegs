import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import Attendance from '@/lib/models/Attendance';
import Leave from '@/lib/models/Leave';
import Candidate from '@/lib/models/Candidate';
import { getAuthUser } from '@/lib/auth';
import {
  findMissingAbsentees,
  hasSheetWork,
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

  const since = toIsoDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const attendanceRows = await Attendance.find({ date: { $gte: since } })
    .select('user_id date status check_in_time')
    .lean();

  const attendance = attendanceRows.map((a) => ({
    uid: a.user_id?.toString(),
    date: a.date,
    status: a.status,
    in: a.check_in_time,
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

  let candidates = [];
  try {
    const candRows = await Candidate.find({}).select('date employee name').lean();
    candidates = candRows.map((c) => ({
      date: c.date,
      employee: c.employee,
      name: c.name,
    }));
  } catch {
    candidates = [];
  }

  // Fix false auto-absents: sheet work → treat as present (do not erase other data)
  let purged = 0;
  for (const row of attendanceRows) {
    if (String(row.status).toLowerCase() !== 'absent') continue;
    const uid = row.user_id?.toString();
    const user = mappedUsers.find((u) => u.id === uid);
    if (!user) continue;
    if (row.check_in_time || hasSheetWork(candidates, user, row.date)) {
      await Attendance.updateOne(
        { _id: row._id },
        {
          $set: {
            status: 'present',
            check_in_time: row.check_in_time || '10:00:00',
            work_hours: row.work_hours || 0,
          },
        }
      );
      purged += 1;
    }
  }

  // If staff did Targets sheet work but have no/absent attendance, mark present
  const today = toIsoDate();
  for (const user of mappedUsers) {
    if (!hasSheetWork(candidates, user, today)) continue;
    if (!mongoose.Types.ObjectId.isValid(user.id)) continue;
    const existing = await Attendance.findOne({ user_id: user.id, date: today });
    if (existing && ['present', 'late'].includes(String(existing.status))) continue;
    if (existing && existing.check_in_time) continue;
    await Attendance.findOneAndUpdate(
      { user_id: user.id, date: today },
      {
        $set: {
          status: 'present',
          check_in_time: existing?.check_in_time || '10:00:00',
          work_hours: existing?.work_hours || 0,
          location_verified: false,
        },
        $setOnInsert: {
          user_id: user.id,
          date: today,
          check_out_time: null,
        },
      },
      { upsert: true }
    );
    purged += 1;
  }

  // Refresh attendance after corrections
  const attendanceAfter = (await Attendance.find({ date: { $gte: since } })
    .select('user_id date status')
    .lean()).map((a) => ({
    uid: a.user_id?.toString(),
    date: a.date,
    status: a.status,
  }));

  const missing = findMissingAbsentees({
    users: mappedUsers,
    attendance: attendanceAfter,
    leaves,
    candidates,
    now: new Date(),
  });

  let created = 0;
  for (const m of missing) {
    if (!mongoose.Types.ObjectId.isValid(m.uid)) continue;
    const existing = await Attendance.findOne({ user_id: m.uid, date: m.date });
    if (existing) {
      if (['present', 'late'].includes(String(existing.status))) continue;
      if (existing.check_in_time) continue;
      // Keep existing absent
      continue;
    }
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
    purged,
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

export async function POST(request) {
  try {
    return await markAbsentees(request);
  } catch (error) {
    console.error('mark-absent POST error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
