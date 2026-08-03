import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Attendance from '@/lib/models/Attendance';
import { getAuthUser } from '@/lib/auth';

// POST /api/attendance/check-in
export async function POST(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });

  const { latitude, longitude } = await request.json().catch(() => ({}));
  const todayStr = new Date().toISOString().split('T')[0];
  const nowTimeStr = new Date().toTimeString().split(' ')[0];

  await connectDB();
  const existing = await Attendance.findOne({ user_id: authUser.id, date: todayStr });
  if (existing) return NextResponse.json({ error: 'Already checked in for today' }, { status: 400 });

  const hour = new Date().getHours();
  const minute = new Date().getMinutes();
  const status = (hour > 9 || (hour === 9 && minute > 0)) ? 'late' : 'present';
  const verified = !!(latitude && longitude);

  await Attendance.create({
    user_id: authUser.id,
    date: todayStr,
    check_in_time: nowTimeStr,
    check_in_lat: latitude || null,
    check_in_lng: longitude || null,
    status,
    location_verified: verified,
    work_hours: 0,
  });

  return NextResponse.json({ message: 'Checked in successfully', check_in_time: nowTimeStr, status });
}
