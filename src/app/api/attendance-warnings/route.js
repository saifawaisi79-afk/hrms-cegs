import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import AttendanceWarning from '@/lib/models/AttendanceWarning';
import { getAuthUser } from '@/lib/auth';
import {
  ATTENDANCE_WARNING_TYPES,
  flattenAttendanceWarning,
  persistAttendanceWarning,
} from '@/lib/attendance-deductions';

export const dynamic = 'force-dynamic';

function canViewAll(authUser) {
  return authUser.role === 'admin' || authUser.role === 'super_admin';
}

// GET /api/attendance-warnings
export async function GET(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });

  const url = new URL(request.url);
  const month = url.searchParams.get('month');
  const year = url.searchParams.get('year');

  await connectDB();
  const filter = canViewAll(authUser) ? {} : { user_id: authUser.id };
  if (month) filter.month = Number(month);
  if (year) filter.year = Number(year);

  const rows = await AttendanceWarning.find(filter).sort({ date: -1, createdAt: -1 }).lean();
  return NextResponse.json(rows.map(flattenAttendanceWarning));
}

// POST /api/attendance-warnings — record late clock-in / late lunch (idempotent per day+type)
export async function POST(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const type = String(body.type || '');
  if (!ATTENDANCE_WARNING_TYPES.includes(type)) {
    return NextResponse.json({ error: 'type must be late_clock_in, late_lunch_return, or early_clock_out' }, { status: 400 });
  }

  let userId = authUser.id;
  if (body.user_id && String(body.user_id) !== String(authUser.id)) {
    if (!canViewAll(authUser)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    userId = body.user_id;
  }

  await connectDB();
  try {
    const result = await persistAttendanceWarning({
      userId,
      type,
      note: body.note || '',
      date: body.date,
    });
    return NextResponse.json(result, { status: result.created ? 201 : 200 });
  } catch (err) {
    console.error('attendance-warnings POST', err);
    return NextResponse.json({ error: 'Failed to save attendance warning' }, { status: 500 });
  }
}
