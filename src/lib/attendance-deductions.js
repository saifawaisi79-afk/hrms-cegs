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
  countMonthlyEarlyLogoutWarnings,
  halfDaysFromWarnings,
  halfDaysFromEarlyLogouts,
  calcTotalHalfDaysCut,
  calcCombinedAttendancePenalty,
  calcHalfDayPenalty,
  halfDaysFromMistakeCount,
} from '@/lib/attendance-policy';
import { istIsoDate } from '@/lib/ist-time';

export const ATTENDANCE_WARNING_TYPES = ['late_clock_in', 'late_lunch_return', 'early_clock_out', 'below_40_percent', 'performance_below_40', 'clause40'];

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
  const mapped = rows.map((w) => ({ ...w, uid: w.user_id.toString() }));
  const lateCount = countMonthlyAttendanceWarnings(mapped, userId, month, year);
  const earlyCount = countMonthlyEarlyLogoutWarnings(mapped, userId, month, year);
  return {
    lateCount,
    earlyCount,
    totalCount: lateCount + earlyCount,
  };
}

export async function syncPayrollAttendanceDeduction(userId, month, year) {
  const user = await User.findById(userId).select('basic_salary allowances salary').lean();
  const existing = await Payroll.findOne({ user_id: userId, month, year });
  const basic = Number(user?.basic_salary ?? user?.salary ?? existing?.basic_salary) || 0;
  const allowances = Math.max(0, Number(user?.allowances ?? existing?.allowances) || 0);
  const overtime = Number(existing?.overtime) || 0;
  const bonus = Number(existing?.bonus) || 0;

  const rows = await AttendanceWarning.find({ user_id: userId, month, year }).lean();
  const mapped = rows.map((w) => ({ ...w, uid: w.user_id.toString() }));
  
  // Per-mistake count
  const lateClockIns = mapped.filter((w) => w.type === 'late_clock_in').length;
  const lateLunches = mapped.filter((w) => w.type === 'late_lunch_return').length;
  const earlyLogouts = mapped.filter((w) => w.type === 'early_clock_out').length;
  const below40s = mapped.filter((w) => w.type === 'below_40_percent' || w.type === 'performance_below_40' || w.type === 'clause40').length;

  const halfDaysCut = halfDaysFromMistakeCount(lateClockIns) +
                      halfDaysFromMistakeCount(lateLunches) +
                      halfDaysFromMistakeCount(earlyLogouts) +
                      halfDaysFromMistakeCount(below40s);

  const dailyRate = basic > 0 ? (basic / 30) : 0;
  const halfDayRate = Math.round(dailyRate / 2);
  const attendancePenalty = Math.round(halfDaysCut * halfDayRate);
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
        attendance_warnings: mapped.length,
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
  early_clock_out: 'Early Logout Warning',
  below_40_percent: 'Performance Target <40% Warning',
  performance_below_40: 'Performance Target <40% Warning',
  clause40: 'Performance Target <40% Warning',
};

const WARNING_MSGS = {
  late_clock_in:
    'You clocked in after your login grace period. This warning counts with late lunch returns toward monthly half-day pay cuts (2 warnings = 1 half-day).',
  late_lunch_return:
    'You returned late from lunch. This warning counts toward monthly half-day pay cuts (2 warnings = 1 half-day).',
  early_clock_out:
    'You clocked out before completing your 9-hour shift cycle.',
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

  const { lateCount, earlyCount, totalCount } = await countSavedMonthlyWarnings(userId, month, year);
  const payroll = await syncPayrollAttendanceDeduction(userId, month, year);

  if (created) {
    let warningMsg = note || WARNING_MSGS[type] || 'Attendance warning recorded.';
    if (type === 'early_clock_out') {
      if (earlyCount === 1) {
        warningMsg = 'Early Logout Warning (1 of 2): You clocked out early before completing your 9-hour cycle.';
      } else if (earlyCount === 2) {
        warningMsg = 'Early Logout Warning (2 of 2): You clocked out early. CAUTION: Next early departure will mark you as Half-Day Absent with a salary deduction!';
      } else {
        warningMsg = `Half-Day Absent Penalty: This is your ${earlyCount}th early departure this month. Marked as Half-Day Absent with salary deduction on your payroll.`;
      }
    }

    await notifyOnce({
      recipientId: userId,
      title: WARNING_TITLES[type] || 'Attendance Warning',
      message: warningMsg,
      dedupeKey: `att-warn:${userId}:${isoDate}:${type}`,
      type: 'Attendance',
    });

    if (type === 'early_clock_out' && earlyCount >= 3) {
      await notifyOnce({
        recipientId: userId,
        title: 'Half-Day Absent Deduction Notice',
        message: `You have ${earlyCount} early logout warnings this month. A half-day absent deduction has been applied to your monthly payroll.`,
        dedupeKey: `att-early-halfday:${userId}:${year}-${String(month).padStart(2, '0')}:${earlyCount}`,
        type: 'Attendance',
      });
    } else if (type !== 'early_clock_out' && lateCount >= 3) {
      const halfDays = halfDaysFromWarnings(lateCount);
      await notifyOnce({
        recipientId: userId,
        title: 'Half-Day Pay Cut Notice',
        message: `You have ${lateCount} late clock-in/lunch warnings this month (${halfDays} half-day pay cut${halfDays > 1 ? 's' : ''} applied). Policy: First 2 warnings have no deduction; half-day deduction starts from the 3rd warning.`,
        dedupeKey: `att-halfday:${userId}:${year}-${String(month).padStart(2, '0')}:${lateCount}`,
        type: 'Attendance',
      });
    }
  }

  const totalHalfDaysCut = calcTotalHalfDaysCut(lateCount, earlyCount);

  return {
    created,
    duplicate: !created,
    warning: flattenAttendanceWarning(doc),
    lateCount,
    earlyCount,
    totalCount,
    halfDaysCut: totalHalfDaysCut,
    attendancePenalty: calcCombinedAttendancePenalty(Number(payroll?.basic_salary) || 0, lateCount, earlyCount),
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

  const validSlips = slips.filter(s => s.user_id != null);
  return {
    processed_count: count,
    slips: validSlips.map(flattenPayrollSlip),
  };
}

export { monthYearFromDate, WARNINGS_PER_HALF_DAY };
