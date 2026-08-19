import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Attendance from '@/lib/models/Attendance';
import { getAuthUser } from '@/lib/auth';

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
    employee_name: obj.user_id?.name || null,
    employee_id: obj.user_id?.employee_id || null,
    avatar_url: obj.user_id?.avatar_url || null,
    department_name: obj.user_id?.department_id?.name || null,
    location_verified: obj.location_verified ? 1 : 0,
  };
}

// GET /api/attendance
export async function GET(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });

  await connectDB();
  let records;
  if (authUser.role === 'employee') {
    records = await Attendance.find({ user_id: authUser.id }).sort({ date: -1 }).lean();
  } else {
    records = await Attendance.find({})
      .populate({ path: 'user_id', select: 'name employee_id avatar_url department_id', populate: { path: 'department_id', select: 'name' } })
      .sort({ date: -1 }).lean();
  }
  return NextResponse.json(records.map(flattenAttendance));
}
