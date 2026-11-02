import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Attendance from '@/lib/models/Attendance';
import SystemSetting from '@/lib/models/SystemSetting';
import { getAuthUser } from '@/lib/auth';
import { toIsoDate } from '@/lib/auto-absent';
import { persistAttendanceWarning } from '@/lib/attendance-deductions';
import { getRequiredShiftHours } from '@/lib/attendance-policy';
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
  const requiredHours = getRequiredShiftHours(todayStr);

  // Check if Early Logout permission was granted by HR
  let earlyLogoutAllowed = !!existing.early_logout_allowed;
  if (!earlyLogoutAllowed) {
    try {
      const setting = await SystemSetting.findOne({ key: `early_logout_waivers_${todayStr}` }).lean();
      if (setting?.value) {
        const ids = JSON.parse(setting.value);
        if (ids.includes('ALL') || ids.includes(String(authUser.id))) {
          earlyLogoutAllowed = true;
        }
      }
    } catch {}
  }

  const isEarly = workHours < requiredHours && !earlyLogoutAllowed;

  let warningResult = null;
  if (isEarly) {
    try {
      warningResult = await persistAttendanceWarning({
        userId: authUser.id,
        type: 'early_clock_out',
        date: todayStr,
        note: `Early clock-out at ${nowTimeStr} (${workHours}h / ${requiredHours}h completed)`,
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
  } else if (existing.status === 'half_day' && earlyLogoutAllowed) {
    existing.status = 'present';
  }
  await existing.save();

  let message = 'Checked out successfully';
  if (earlyLogoutAllowed) {
    message = `Early Clock-Out authorized by HR Permission (${existing.early_logout_reason || 'Approved early departure'}).`;
  } else if (isEarly) {
    if (isHalfDay) {
      message = `Early Clock-Out (${workHours}h of ${requiredHours}h completed). This is warning #${earlyWarningsCount} this month — marked as Half-Day Absent with salary deduction.`;
    } else {
      message = `Early Clock-Out Warning (${earlyWarningsCount} of 2): You completed ${workHours}h of your ${requiredHours}h shift.`;
    }
  }

  return NextResponse.json({
    message,
    check_out_time: nowTimeStr,
    work_hours: workHours,
    is_early: isEarly,
    early_logout_allowed: earlyLogoutAllowed,
    early_warnings: earlyWarningsCount,
    is_half_day: isHalfDay,
    status: existing.status,
    warning: warningResult?.warning || null,
    half_days_cut: warningResult?.halfDaysCut || 0,
    attendance_penalty: warningResult?.attendancePenalty || 0,
    payroll: warningResult?.payroll || null,
  });
}
