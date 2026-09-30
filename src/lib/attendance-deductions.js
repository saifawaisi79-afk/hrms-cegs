/**
 * Persist attendance warnings and keep payroll deduction rows in Mongo.
 * Late clock-in + late lunch: 2 warnings/month = 1 half-day cut.
 */
import AttendanceWarning from '@/lib/models/AttendanceWarning';
import Payroll from '@/lib/models/Payroll';
import User from '@/lib/models/User';
import Notification from '@/lib/models/Notification';
import Timesheet from '@/lib/models/Timesheet';
import {
  WARNINGS_PER_HALF_DAY,
  monthYearFromDate,
  countMonthlyAttendanceWarnings,
  halfDaysFromWarnings,
  calcHalfDayPenalty,
} from '@/lib/attendance-policy';
import { istIsoDate } from '@/lib/ist-time';

export const ATTENDANCE_WARNING_TYPES = ['late_clock_in', 'late_lunch_return'];

export function flattenAttendanceWarning(w) {
  const o = w.toObject ? w.toObject() : w;
  const uid = o.user_id?._id?.toString() || o.user_id?.toString() || null;
  return {
    id: o._id?.toString(),
    uid,
    user_id: uid,
    type: o.type,
    date: o.date,
    month: o.month,
    year: o.year,
    note: o.note || '',
    at: o.createdAt ? new Date(o.createdAt).toISOString() : o.at || null,
  };
}

export function flattenPayrollSlip(p) {
  const obj = p.toObject ? p.toObject() : p;
  const uid = obj.user_id?._id?.toString() || obj.user_id?.toString() || null;
  const deductions = Number(obj.deductions) || 0;
  const attendancePenalty = Number(obj.attendance_penalty ?? obj.attendancePenalty ?? deductions) || 0;
  const warningCount = Number(obj.attendance_warnings ?? obj.attendanceWarnings) || 0;
  const halfDays = Number(obj.half_days_cut ?? obj.halfDaysCut) || 0;
  return {
    ...obj,
    id: obj._id?.toString(),
    _id: obj._id?.toString(),
    uid,
    user_id: uid,
    employee_name: obj.user_id?.name || null,
    employee_id: obj.user_id?.employee_id || null,
    avatar_url: obj.user_id?.avatar_url || null,
    designation: obj.user_id?.designation || null,
    department_name: obj.user_id?.department_id?.name || null,
    basic: obj.basic_salary,
    net: obj.net_salary,
    deductions,
    attendancePenalty,
    attendanceWarnings: warningCount,
    halfDaysCut: halfDays,
    date: obj.processed_date || obj.date || null,
  };
}

async function notifyOnce({ recipientId, title, message, dedupeKey, type = 'Attendance' }) {
  try {
    await Notification.create({
      sender_id: null,
      recipient_id: recipientId,
      title,
      message,
      type,
      created_at: new Date().toISOString(),
      dedupeKey,
    });
    return true;
  } catch (err) {
    if (err?.code === 11000) return false;
    throw err;
  }
}

export async function countSavedMonthlyWarnings(userId, month, year) {
  const rows = await AttendanceWarning.find({ user_id: userId, month, year }).lean();
  return countMonthlyAttendanceWarnings(
    rows.map((w) => ({ ...w, uid: w.user_id.toString() })),
    userId,
    month,
    year
  );
}

export async function syncPayrollAttendanceDeduction(userId, month, year, warningCount) {
  const user = await User.findById(userId).select('basic_salary allowances').lean();
  const existing = await Payroll.findOne({ user_id: userId, month, year });
  const basic = Number(existing?.basic_salary ?? user?.basic_salary) || 0;
  const allowances = Math.max(0, Number(existing?.allowances ?? user?.allowances) || 0);
  const overtime = Number(existing?.overtime) || 0;
  const bonus = Number(existing?.bonus) || 0;
  const attendancePenalty = calcHalfDayPenalty(basic, warningCount);
  const halfDaysCut = halfDaysFromWarnings(warningCount);
  const deductions = attendancePenalty;
  const netSalary = basic + allowances + overtime + bonus - deductions;

  const doc = await Payroll.findOneAndUpdate(
    { user_id: userId, month, year },
    {
      $set: {
        basic_salary: basic,
        allowances,
        overtime,
        bonus,
        deductions,
        net_salary: netSalary,
        attendance_warnings: warningCount,
        half_days_cut: halfDaysCut,
        attendance_penalty: attendancePenalty,
      },
      $setOnInsert: {
        user_id: userId,
        month,
        year,
        status: 'draft',
        processed_date: null,
      },
    },
    { upsert: true, new: true }
  );
  return doc;
}

const WARNING_TITLES = {
  late_clock_in: 'Late Clock-In Warning',
  late_lunch_return: 'Late Lunch Return Warning',
};

const WARNING_MSGS = {
  late_clock_in:
    'You clocked in after your login grace period. This warning counts with late lunch returns toward monthly half-day pay cuts (2 warnings = 1 half-day).',
  late_lunch_return:
    'You returned late from lunch. This warning counts toward monthly half-day pay cuts (2 warnings = 1 half-day).',
};

/**
 * Insert-once warning for a user/date/type. Updates payroll + notifications.
 */
export async function persistAttendanceWarning({ userId, type, note, date }) {
  if (!ATTENDANCE_WARNING_TYPES.includes(type)) {
    throw new Error('Invalid attendance warning type');
  }
  const isoDate = date && /^\d{4}-\d{2}-\d{2}$/.test(String(date).trim())
    ? String(date).trim()
    : istIsoDate();
  const [yearStr, monthStr] = isoDate.split('-');
  const month = parseInt(monthStr, 10);
  const year = parseInt(yearStr, 10);

  let created = false;
  let doc;
  try {
    doc = await AttendanceWarning.create({
      user_id: userId,
      type,
      date: isoDate,
      month,
      year,
      note: note || '',
    });
    created = true;
  } catch (err) {
    if (err?.code !== 11000) throw err;
    doc = await AttendanceWarning.findOne({ user_id: userId, date: isoDate, type });
  }

  const count = await countSavedMonthlyWarnings(userId, month, year);
  const payroll = await syncPayrollAttendanceDeduction(userId, month, year, count);

  if (created) {
    await notifyOnce({
      recipientId: userId,
      title: WARNING_TITLES[type],
      message: note || WARNING_MSGS[type],
      dedupeKey: `att-warn:${userId}:${isoDate}:${type}`,
      type: 'Attendance',
    });
    if (count > 0 && count % WARNINGS_PER_HALF_DAY === 0) {
      const halfDays = halfDaysFromWarnings(count);
      await notifyOnce({
        recipientId: userId,
        title: 'Half-Day Pay Cut Notice',
        message: `You have ${count} attendance warnings this month (${halfDays} half-day pay cut${halfDays > 1 ? 's' : ''} will apply on payroll). Late clock-in and late lunch return are counted together (2 warnings = 1 half-day).`,
        dedupeKey: `att-halfday:${userId}:${year}-${String(month).padStart(2, '0')}:${count}`,
        type: 'Attendance',
      });
    }
  }

  return {
    created,
    duplicate: !created,
    warning: flattenAttendanceWarning(doc),
    count,
    halfDaysCut: halfDaysFromWarnings(count),
    attendancePenalty: calcHalfDayPenalty(Number(payroll?.basic_salary) || 0, count),
    payroll: payroll ? flattenPayrollSlip(payroll) : null,
  };
}

export async function processMonthlyPayroll(month, year) {
  const employees = await User.find({ status: { $in: ['active', 'on_leave'] } })
    .select('_id basic_salary allowances')
    .lean();
  let count = 0;
  const processedDate = new Date().toISOString().split('T')[0];

  for (const emp of employees) {
    const basic = Number(emp.basic_salary) || 0;
    const allowances = Math.max(0, Number(emp.allowances) || 0);
    const monthStr = String(month).padStart(2, '0');
    const startStr = `${year}-${monthStr}-01`;
    const endStr = `${year}-${monthStr}-31`;

    const tsAgg = await Timesheet.aggregate([
      { $match: { user_id: emp._id, status: 'approved', date: { $gte: startStr, $lte: endStr } } },
      { $group: { _id: null, total: { $sum: '$duration' } } },
    ]);
    const totalHrs = tsAgg[0]?.total || 0;
    const otHours = Math.max(0, totalHrs - 160);
    const overtime = Math.round(otHours * 25);
    const bonus = 0;
    const warningCount = await countSavedMonthlyWarnings(emp._id, month, year);

    await Payroll.findOneAndUpdate(
      { user_id: emp._id, month, year },
      {
        $set: {
          basic_salary: basic,
          allowances,
          overtime,
          bonus,
          status: 'processed',
          processed_date: processedDate,
        },
        $setOnInsert: {
          user_id: emp._id,
          month,
          year,
          deductions: 0,
          net_salary: basic + allowances,
          attendance_warnings: 0,
          half_days_cut: 0,
          attendance_penalty: 0,
        },
      },
      { upsert: true }
    );
    await syncPayrollAttendanceDeduction(emp._id, month, year, warningCount);
    await Payroll.updateOne(
      { user_id: emp._id, month, year },
      { $set: { status: 'processed', processed_date: processedDate, overtime, bonus } }
    );
    count++;
  }

  const slips = await Payroll.find({ month, year })
    .populate({
      path: 'user_id',
      select: 'name employee_id avatar_url designation department_id',
      populate: { path: 'department_id', select: 'name' },
    })
    .lean();

  return {
    processed_count: count,
    slips: slips.map(flattenPayrollSlip),
  };
}

export { monthYearFromDate, WARNINGS_PER_HALF_DAY };
