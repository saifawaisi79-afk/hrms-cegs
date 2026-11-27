/**
 * Persist attendance warnings and keep payroll deduction rows in Mongo.
 * Late clock-in + late lunch: 2 warnings/month = 1 half-day cut.
 */
import AttendanceWarning from '@/lib/models/AttendanceWarning';
import Payroll from '@/lib/models/Payroll';
import User from '@/lib/models/User';
import Notification from '@/lib/models/Notification';
import Timesheet from '@/lib/models/Timesheet';
import Attendance from '@/lib/models/Attendance';
import SystemSetting from '@/lib/models/SystemSetting';
import Candidate from '@/lib/models/Candidate';
import Leave from '@/lib/models/Leave';
import { candidateDateMongoQuery, normalizeCandidateDate } from '@/lib/candidate-dates';
import { employeeNamesMatch } from '@/lib/recruiter-names';
import { computeRecruiterDayPerformance } from '@/lib/recruiter-targets';
import { formatInOfficeTz, istIsoDate } from '@/lib/ist-time';
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
  hasCompanyVisitOnRecord,
} from '@/lib/attendance-policy';

export const ATTENDANCE_WARNING_TYPES = ['late_clock_in', 'late_lunch_return', 'early_clock_out', 'below_40_percent', 'performance_below_40', 'clause40'];
export const BELOW_40_TYPES = ['below_40_percent', 'performance_below_40', 'clause40'];

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
export async function evaluateBelow40ForUserDate(userId, isoDate, options = {}) {
  const { allowTodayInProgress = false } = options;
  const nowIst = formatInOfficeTz(new Date());
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return { valid: false, reason: 'invalid_date' };
  if (isoDate > nowIst.date) return { valid: false, reason: 'future_date' };
  const dow = new Date(`${isoDate}T12:00:00Z`).getUTCDay();
  if (dow === 0) return { valid: false, reason: 'sunday' };

  const user = await User.findById(userId).select('name role designation status').lean();
  if (!user || !['active', 'on_leave'].includes(String(user.status || 'active'))) {
    return { valid: false, reason: 'inactive_user' };
  }

  const att = await Attendance.findOne({ user_id: userId, date: isoDate }).select('status source check_out_time early_logout_allowed clause40_waived visit_status company_visit_out_time visit_logs').lean();
  if (!att || att.status === 'absent') return { valid: false, reason: 'no_attendance' };
  if (hasCompanyVisitOnRecord(att) || att.clause40_waived) return { valid: false, reason: 'waived_visit_or_clause40' };

  try {
    const setting = await SystemSetting.findOne({ key: `clause40_waivers_${isoDate}` }).lean();
    if (setting?.value) {
      const ids = JSON.parse(setting.value).map(String);
      if (ids.includes('ALL') || ids.includes(String(userId))) return { valid: false, reason: 'waived_setting' };
    }
  } catch {}

  const approvedLeave = await Leave.findOne({
    user_id: userId,
    status: 'approved',
    start_date: { $lte: isoDate },
    end_date: { $gte: isoDate },
  }).lean();
  if (approvedLeave) return { valid: false, reason: 'approved_leave' };

  if (!allowTodayInProgress && isoDate === nowIst.date && !att.check_out_time && nowIst.hour < 19) {
    return { valid: false, reason: 'shift_in_progress' };
  }

  const dateQuery = candidateDateMongoQuery(isoDate);
  const dayCands = dateQuery ? await Candidate.find(dateQuery).lean() : [];
  const perf = computeRecruiterDayPerformance({
    candidates: dayCands,
    empName: user.name,
    sheetDate: isoDate,
    user,
  });

  const t = perf.targets;
  const accurateNote = `Daily performance ${perf.pct}% (${perf.calls}/${t.calls} calls, ${perf.itvs}/${t.itvs} itv, ${perf.walks}/${t.walks} walkins, ${perf.sels}/${t.sels} sel, ${perf.jnds}/${t.jnds} joined${perf.pct < 40 ? ' — below 40% target' : ''})`;
  return { valid: true, isBelow40: perf.pct < 40, perf, accurateNote, user };
}

export async function reconcileRecruiterSheetWarningsForItems(items = []) {
  if (!Array.isArray(items) || items.length === 0) return { cleared: 0, updated: 0 };
  const dateSet = new Set();
  for (const item of items) {
    const iso = normalizeCandidateDate(item?.date) || istIsoDate();
    if (iso) dateSet.add(iso);
  }
  const dates = [...dateSet];
  if (dates.length === 0) return { cleared: 0, updated: 0 };

  const existingWarns = await AttendanceWarning.find({
    date: { $in: dates },
    type: { $in: BELOW_40_TYPES },
  }).select('user_id date type note').lean();
  if (existingWarns.length === 0) return { cleared: 0, updated: 0 };

  const uids = [...new Set(existingWarns.map((w) => String(w.user_id)))];
  const empNamesInItems = items.map((i) => i?.employee).filter(Boolean);
  const usersList = await User.find({ _id: { $in: uids } }).select('name').lean();
  const nameMap = new Map(usersList.map((u) => [String(u._id), u.name]));

  let cleared = 0;
  let updated = 0;
  const processedPairs = new Set();
  for (const w of existingWarns) {
    const uidStr = String(w.user_id);
    const uName = nameMap.get(uidStr) || '';
    if (empNamesInItems.length > 0 && uName && !empNamesInItems.some((en) => employeeNamesMatch(en, uName))) continue;
    const pairKey = `${uidStr}|${w.date}`;
    if (processedPairs.has(pairKey)) continue;
    processedPairs.add(pairKey);

    const resEval = await evaluateBelow40ForUserDate(w.user_id, w.date);
    const [yStr, mStr] = w.date.split('-');
    const m = parseInt(mStr, 10);
    const y = parseInt(yStr, 10);

    if (!resEval.valid || !resEval.isBelow40) {
      const del = await AttendanceWarning.deleteMany({ user_id: w.user_id, date: w.date, type: { $in: BELOW_40_TYPES } });
      cleared += del?.deletedCount || 0;
      if (m && y) await syncPayrollAttendanceDeduction(w.user_id, m, y);
    } else if (resEval.accurateNote && w.note !== resEval.accurateNote) {
      await AttendanceWarning.updateMany(
        { user_id: w.user_id, date: w.date, type: { $in: BELOW_40_TYPES } },
        { $set: { note: resEval.accurateNote } }
      );
      updated++;
    }
  }
  return { cleared, updated };
}

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

  // Honor HR Permissions overrides / waivers for this date before recording any breach
  const uidStr = String(userId);
  let waivedByPermission = false;
  try {
    const attRec = await Attendance.findOne({ user_id: userId, date: isoDate }).select('source status early_logout_allowed clause40_waived visit_status company_visit_out_time visit_logs').lean();
    if (hasCompanyVisitOnRecord(attRec)) {
      waivedByPermission = true;
    } else if (type === 'late_clock_in' && attRec?.source === 'override' && attRec?.status === 'present') {
      waivedByPermission = true;
    } else if (type === 'early_clock_out') {
      if (attRec?.early_logout_allowed) {
        waivedByPermission = true;
      } else {
        const setting = await SystemSetting.findOne({ key: `early_logout_waivers_${isoDate}` }).lean();
        if (setting?.value) {
          const ids = JSON.parse(setting.value).map(String);
          if (ids.includes('ALL') || ids.includes(uidStr)) waivedByPermission = true;
        }
      }
    } else if (type === 'below_40_percent' || type === 'performance_below_40' || type === 'clause40') {
      if (attRec?.clause40_waived) {
        waivedByPermission = true;
      } else {
        const setting = await SystemSetting.findOne({ key: `clause40_waivers_${isoDate}` }).lean();
        if (setting?.value) {
          const ids = JSON.parse(setting.value).map(String);
          if (ids.includes('ALL') || ids.includes(uidStr)) waivedByPermission = true;
        }
      }
    }
  } catch {}

  if (waivedByPermission) {
    const { lateCount, earlyCount, totalCount } = await countSavedMonthlyWarnings(userId, month, year);
    const payroll = await syncPayrollAttendanceDeduction(userId, month, year);
    return {
      created: false,
      waived: true,
      duplicate: false,
      warning: null,
      lateCount,
      earlyCount,
      totalCount,
      halfDaysCut: calcTotalHalfDaysCut(lateCount, earlyCount),
      attendancePenalty: calcCombinedAttendancePenalty(Number(payroll?.basic_salary) || 0, lateCount, earlyCount),
      payroll: payroll ? flattenPayrollSlip(payroll) : null,
    };
  }

  let resolvedNote = note || '';
  if (BELOW_40_TYPES.includes(type)) {
    const evalRes = await evaluateBelow40ForUserDate(userId, isoDate);
    if (!evalRes.valid || !evalRes.isBelow40) {
      await AttendanceWarning.deleteMany({ user_id: userId, date: isoDate, type: { $in: BELOW_40_TYPES } });
      const { lateCount, earlyCount, totalCount } = await countSavedMonthlyWarnings(userId, month, year);
      const payroll = await syncPayrollAttendanceDeduction(userId, month, year);
      return {
        created: false,
        waived: !!evalRes.reason?.startsWith('waived'),
        aboveThreshold: !!(evalRes.valid && !evalRes.isBelow40),
        reason: evalRes.reason || (evalRes.isBelow40 === false ? 'pct_at_least_40' : 'ineligible'),
        pct: evalRes.perf?.pct ?? null,
        duplicate: false,
        warning: null,
        lateCount,
        earlyCount,
        totalCount,
        halfDaysCut: calcTotalHalfDaysCut(lateCount, earlyCount),
        attendancePenalty: calcCombinedAttendancePenalty(Number(payroll?.basic_salary) || 0, lateCount, earlyCount),
        payroll: payroll ? flattenPayrollSlip(payroll) : null,
      };
    }
    resolvedNote = evalRes.accurateNote;
  }

  let created = false;
  let doc;
  try {
    doc = await AttendanceWarning.create({
      user_id: userId,
      type,
      date: isoDate,
      month,
      year,
      note: resolvedNote,
    });
    created = true;
  } catch (err) {
    if (err?.code !== 11000) throw err;
    doc = await AttendanceWarning.findOne({ user_id: userId, date: isoDate, type });
    if (doc && BELOW_40_TYPES.includes(type) && resolvedNote && doc.note !== resolvedNote) {
      await AttendanceWarning.updateOne({ _id: doc._id }, { $set: { note: resolvedNote } });
      doc.note = resolvedNote;
    }
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
  const existingSlips = await Payroll.find({ month, year }).select('user_id status').lean();
  const heldUserIds = new Set(
    existingSlips
      .filter((s) => String(s.status || '').toLowerCase() === 'on_hold')
      .map((s) => String(s.user_id?._id || s.user_id))
  );
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
    const isHeld = heldUserIds.has(String(emp._id));
    const targetStatus = isHeld ? 'on_hold' : 'processed';

    await Payroll.findOneAndUpdate(
      { user_id: emp._id, month, year },
      {
        $set: {
          basic_salary: basic,
          allowances,
          overtime,
          bonus,
          status: targetStatus,
          ...(isHeld ? { previous_status: 'processed' } : {}),
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
      { $set: { status: targetStatus, processed_date: processedDate, overtime, bonus } }
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
