import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Attendance from '@/lib/models/Attendance';
import { getAuthUser } from '@/lib/auth';
import { toIsoDate } from '@/lib/auto-absent';
import { OFFICE_TZ, calcWorkHours, istTimeString, normalizePunchTime } from '@/lib/ist-time';

// POST /api/attendance/check-out
export async function POST(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { check_out_time, date } = body;
  const todayStr =
    typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())
      ? date.trim()
      : toIsoDate(new Date());
  const nowTimeStr =
    normalizePunchTime(check_out_time) || istTimeString(new Date());

  await connectDB();
  const existing = await Attendance.findOne({ user_id: authUser.id, date: todayStr });
  if (!existing) return NextResponse.json({ error: 'Must check in first before checking out' }, { status: 400 });
  if (existing.check_out_time) return NextResponse.json({ error: 'Already checked out for today' }, { status: 400 });

  const workHours = calcWorkHours(existing.check_in_time, nowTimeStr);

  existing.check_out_time = nowTimeStr;
  existing.work_hours = workHours;
  existing.time_zone = OFFICE_TZ;
  await existing.save();

  return NextResponse.json({ message: 'Checked out successfully', check_out_time: nowTimeStr, work_hours: workHours });
}
