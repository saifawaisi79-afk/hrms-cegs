import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Attendance from '@/lib/models/Attendance';
import Notification from '@/lib/models/Notification';
import { getAuthUser } from '@/lib/auth';
import { toIsoDate } from '@/lib/auto-absent';
import { istTimeString, normalizePunchTime } from '@/lib/ist-time';

function flattenAttendance(a) {
  const obj = a.toObject ? a.toObject() : a;
  const uid = obj.user_id?._id?.toString() || obj.user_id?.toString() || null;
  return {
    ...obj,
    id: obj._id?.toString(),
    _id: obj._id?.toString(),
    user_id: uid,
    uid,
    date: obj.date,
    in: obj.check_in_time || null,
    out: obj.check_out_time || null,
    hrs: obj.work_hours || 0,
    status: obj.status,
    auto: obj.status === 'absent' && !obj.check_in_time,
    source: obj.source || (obj.status === 'absent' ? 'auto' : 'clock'),
    time_zone: obj.time_zone || null,
    location_verified: obj.location_verified ? 1 : 0,
    visit_status: obj.visit_status || 'in_office',
    company_visit_out_time: obj.company_visit_out_time || null,
    company_visit_in_time: obj.company_visit_in_time || null,
    visit_logs: Array.isArray(obj.visit_logs) ? obj.visit_logs : [],
  };
}

// POST /api/attendance/visit-status
export async function POST(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { action, remarks, date, time } = body;

  if (!['company_visit', 'back_to_office'].includes(action)) {
    return NextResponse.json({ error: 'action must be "company_visit" or "back_to_office"' }, { status: 400 });
  }

  const todayStr =
    typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())
      ? date.trim()
      : toIsoDate(new Date());

  const nowTimeStr =
    normalizePunchTime(time) || istTimeString(new Date());

  await connectDB();
  const existing = await Attendance.findOne({ user_id: authUser.id, date: todayStr });
  if (!existing) {
    return NextResponse.json({ error: 'Must clock in first before setting visit status' }, { status: 400 });
  }
  if (existing.check_out_time) {
    return NextResponse.json({ error: 'Already clocked out for today' }, { status: 400 });
  }

  if (action === 'company_visit') {
    existing.visit_status = 'company_visit';
    existing.company_visit_out_time = nowTimeStr;
    if (!Array.isArray(existing.visit_logs)) {
      existing.visit_logs = [];
    }
    existing.visit_logs.push({
      action: 'company_visit',
      time: nowTimeStr,
      remarks: typeof remarks === 'string' ? remarks.trim() : 'Company Visit',
      at: new Date(),
    });

    try {
      await Notification.create({
        sender_id: null,
        recipient_id: authUser.id,
        title: 'Company Visit Logged',
        message: `Marked departure for company visit at ${nowTimeStr}. Your 9-hour attendance timer continues ticking normally.`,
        type: 'Attendance',
        created_at: new Date().toISOString(),
      });
    } catch {}
  } else {
    existing.visit_status = 'in_office';
    existing.company_visit_in_time = nowTimeStr;
    if (!Array.isArray(existing.visit_logs)) {
      existing.visit_logs = [];
    }
    existing.visit_logs.push({
      action: 'back_to_office',
      time: nowTimeStr,
      remarks: typeof remarks === 'string' ? remarks.trim() : 'Back to Office',
      at: new Date(),
    });

    try {
      await Notification.create({
        sender_id: null,
        recipient_id: authUser.id,
        title: 'Back to Office Logged',
        message: `Marked return to office at ${nowTimeStr}. In-office work presence resumed.`,
        type: 'Attendance',
        created_at: new Date().toISOString(),
      });
    } catch {}
  }

  await existing.save();

  return NextResponse.json({
    message: action === 'company_visit' ? 'Marked Company Visit successfully' : 'Marked Back to Office successfully',
    action,
    visit_status: existing.visit_status,
    company_visit_out_time: existing.company_visit_out_time,
    company_visit_in_time: existing.company_visit_in_time,
    visit_logs: existing.visit_logs,
    record: flattenAttendance(existing),
  });
}
