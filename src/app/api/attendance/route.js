import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Attendance from '@/lib/models/Attendance';
import { getAuthUser } from '@/lib/auth';
import { OFFICE_TZ, calcWorkHours, normalizePunchTime, utcWallClockToIst } from '@/lib/ist-time';

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
    employee_name: obj.user_id?.name || null,
    employee_id: obj.user_id?.employee_id || null,
    avatar_url: obj.user_id?.avatar_url || null,
    department_name: obj.user_id?.department_id?.name || null,
    location_verified: obj.location_verified ? 1 : 0,
  };
}

/** Legacy Vercel UTC punches land ~04:00–08:00 for normal IST morning clock-ins. */
function looksLikeUtcMorningPunch(timeStr) {
  const norm = normalizePunchTime(timeStr);
  if (!norm) return false;
  return parseInt(norm.slice(0, 2), 10) <= 8;
}

/** One-time convert legacy UTC wall-clock punches → IST and persist. */
async function repairLegacyUtcTimes(records) {
  const repaired = [];
  for (const row of records) {
    if (row.time_zone === OFFICE_TZ || row.time_zone === 'IST') {
      repaired.push(row);
      continue;
    }
    if (!row.check_in_time) {
      repaired.push(row);
      continue;
    }
    if (row.source && row.source !== 'clock') {
      repaired.push(row);
      continue;
    }
    if (!looksLikeUtcMorningPunch(row.check_in_time)) {
      repaired.push(row);
      continue;
    }

    const nextIn = utcWallClockToIst(row.check_in_time);
    const nextOut = row.check_out_time ? utcWallClockToIst(row.check_out_time) : null;

    try {
      const workHours =
        nextIn && nextOut ? calcWorkHours(nextIn, nextOut) : row.work_hours || 0;
      await Attendance.updateOne(
        { _id: row._id },
        {
          $set: {
            check_in_time: nextIn,
            check_out_time: nextOut,
            work_hours: workHours,
            time_zone: OFFICE_TZ,
          },
        }
      );
      repaired.push({
        ...row,
        check_in_time: nextIn,
        check_out_time: nextOut,
        work_hours: workHours,
        time_zone: OFFICE_TZ,
      });
    } catch {
      repaired.push(row);
    }
  }
  return repaired;
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

  const fixed = await repairLegacyUtcTimes(records);
  return NextResponse.json(fixed.map(flattenAttendance));
}
