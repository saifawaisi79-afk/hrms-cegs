import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Attendance from '@/lib/models/Attendance';
import { getAuthUser } from '@/lib/auth';
import { toIsoDate } from '@/lib/auto-absent';
import { isLateClockIn } from '@/lib/attendance-policy';
import { OFFICE_TZ, istTimeString, normalizePunchTime } from '@/lib/ist-time';

// POST /api/attendance/check-in
export async function POST(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { latitude, longitude, status: bodyStatus, check_in_time, date } = body;
  const todayStr =
    typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())
      ? date.trim()
      : toIsoDate(new Date());
  const nowTimeStr =
    normalizePunchTime(check_in_time) || istTimeString(new Date());

  await connectDB();
  const existing = await Attendance.findOne({ user_id: authUser.id, date: todayStr });

  const late = isLateClockIn(new Date(), null, {
    id: authUser.id,
    email: authUser.email,
    login_time: authUser.login_time,
  });
  const status = bodyStatus === 'late' || bodyStatus === 'present'
    ? bodyStatus
    : late
      ? 'late'
      : 'present';
  const verified = !!(latitude && longitude);

  if (existing) {
    // Allow overriding an auto-absent / empty row with a real clock-in
    if (['present', 'late'].includes(String(existing.status)) && existing.check_in_time) {
      return NextResponse.json({ error: 'Already checked in for today' }, { status: 400 });
    }
    existing.check_in_time = nowTimeStr;
    existing.check_in_lat = latitude || null;
    existing.check_in_lng = longitude || null;
    existing.status = status;
    existing.location_verified = verified;
    existing.source = 'clock';
    existing.time_zone = OFFICE_TZ;
    existing.check_out_time = null;
    existing.work_hours = 0;
    await existing.save();
    return NextResponse.json({
      message: 'Checked in successfully',
      check_in_time: nowTimeStr,
      status,
      id: existing._id.toString(),
    });
  }

  const created = await Attendance.create({
    user_id: authUser.id,
    date: todayStr,
    check_in_time: nowTimeStr,
    check_in_lat: latitude || null,
    check_in_lng: longitude || null,
    status,
    location_verified: verified,
    work_hours: 0,
    source: 'clock',
    time_zone: OFFICE_TZ,
  });

  return NextResponse.json({
    message: 'Checked in successfully',
    check_in_time: nowTimeStr,
    status,
    id: created._id.toString(),
  });
}
