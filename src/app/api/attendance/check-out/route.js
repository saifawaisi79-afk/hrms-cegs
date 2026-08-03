import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Attendance from '@/lib/models/Attendance';
import { getAuthUser } from '@/lib/auth';

// POST /api/attendance/check-out
export async function POST(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });

  const todayStr = new Date().toISOString().split('T')[0];
  const nowTimeStr = new Date().toTimeString().split(' ')[0];

  await connectDB();
  const existing = await Attendance.findOne({ user_id: authUser.id, date: todayStr });
  if (!existing) return NextResponse.json({ error: 'Must check in first before checking out' }, { status: 400 });
  if (existing.check_out_time) return NextResponse.json({ error: 'Already checked out for today' }, { status: 400 });

  const [sH, sM, sS] = existing.check_in_time.split(':').map(Number);
  const [eH, eM, eS] = nowTimeStr.split(':').map(Number);
  const startMs = sH * 3600000 + sM * 60000 + sS * 1000;
  const endMs = eH * 3600000 + eM * 60000 + eS * 1000;
  const workHours = Math.max(0, Math.round(((endMs - startMs) / 3600000) * 100) / 100);

  existing.check_out_time = nowTimeStr;
  existing.work_hours = workHours;
  await existing.save();

  return NextResponse.json({ message: 'Checked out successfully', check_out_time: nowTimeStr, work_hours: workHours });
}
