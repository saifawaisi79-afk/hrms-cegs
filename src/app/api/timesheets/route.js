import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Timesheet from '@/lib/models/Timesheet';
import { getAuthUser } from '@/lib/auth';

function flattenTS(t) {
  const obj = t.toObject ? t.toObject() : t;
  return {
    ...obj,
    id: obj._id?.toString(), _id: obj._id?.toString(),
    user_id: obj.user_id?._id?.toString() || obj.user_id?.toString() || null,
    employee_name: obj.user_id?.name || null,
    employee_id: obj.user_id?.employee_id || null,
    avatar_url: obj.user_id?.avatar_url || null,
    department_name: obj.user_id?.department_id?.name || null,
    approved_by: obj.approved_by?.toString() || null,
  };
}

// GET /api/timesheets
export async function GET(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });

  await connectDB();
  const filter = authUser.role === 'employee' ? { user_id: authUser.id } : {};
  const pop = authUser.role !== 'employee'
    ? [{ path: 'user_id', select: 'name employee_id avatar_url department_id', populate: { path: 'department_id', select: 'name' } }]
    : [];
  let q = Timesheet.find(filter).sort({ date: -1 });
  for (const p of pop) q = q.populate(p);
  const timesheets = await q.lean();
  return NextResponse.json(timesheets.map(t => authUser.role === 'employee'
    ? { ...t, id: t._id?.toString(), _id: t._id?.toString(), user_id: t.user_id?.toString() }
    : flattenTS(t)));
}

// POST /api/timesheets
export async function POST(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });

  const { date, start_time, end_time, duration, project, task } = await request.json();
  if (!date || !project || !task) {
    return NextResponse.json({ error: 'Date, project, and task are required' }, { status: 400 });
  }

  let calculatedDuration = duration;
  if (start_time && end_time && !duration) {
    const [sH, sM] = start_time.split(':').map(Number);
    const [eH, eM] = end_time.split(':').map(Number);
    calculatedDuration = Math.max(0, Math.round(((eH - sH) + (eM - sM) / 60) * 100) / 100);
  }

  await connectDB();
  const ts = await Timesheet.create({ user_id: authUser.id, date, start_time: start_time || null, end_time: end_time || null, duration: calculatedDuration || 0, project, task });
  return NextResponse.json({ id: ts._id.toString(), date, project, task, duration: calculatedDuration, status: 'pending' }, { status: 201 });
}
