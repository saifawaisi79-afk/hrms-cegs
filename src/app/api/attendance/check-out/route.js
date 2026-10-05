import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Attendance from '@/lib/models/Attendance';
import { getAuthUser } from '@/lib/auth';
import { toIsoDate } from '@/lib/auto-absent';
import { persistAttendanceWarning } from '@/lib/attendance-deductions';
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
  const isEarly = workHours < 9;

  let warningResult = null;
  if (isEarly) {
    try {
      warningResult = await persistAttendanceWarning({
        userId: authUser.id,
        type: 'early_clock_out',
        date: todayStr,
        note: `Early clock-out at ${nowTimeStr} (${workHours}h / 9h completed)`,
      });
    } catch (err) {
      console.error('early_clock_out persist warning error:', err);
    }
  }

  const earlyWarningsCount = warningResult?.earlyCount || 0;
  const isHalfDay = isEarly && earlyWarningsCount >= 3;

  existing.check_out_time = nowTimeStr;
  existing.work_hours = workHours;
  existing.time_zone = OFFICE_TZ;
  if (isHalfDay) {
    existing.status = 'half_day';
  }
  await existing.save();

  let message = 'Checked out successfully';
  if (isEarly) {
    if (isHalfDay) {
      message = `Early Clock-Out (${workHours}h of 9h completed). This is warning #${earlyWarningsCount} this month — marked as Half-Day Absent with salary deduction.`;
    } else {
      message = `Early Clock-Out Warning (${earlyWarningsCount} of 2): You completed ${workHours}h of your 9h shift.`;
    }
  }

  return NextResponse.json({
    message,
    check_out_time: nowTimeStr,
    work_hours: workHours,
    is_early: isEarly,
    early_warnings: earlyWarningsCount,
    is_half_day: isHalfDay,
    status: existing.status,
    warning: warningResult?.warning || null,
    half_days_cut: warningResult?.halfDaysCut || 0,
    attendance_penalty: warningResult?.attendancePenalty || 0,
    payroll: warningResult?.payroll || null,
  });
}

