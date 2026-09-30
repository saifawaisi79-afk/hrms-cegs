/**
 * Attendance deduction policy checks (late clock-in + late lunch).
 * Run: npx tsx scripts/test-attendance-deductions.js
 */
import {
  WARNINGS_PER_HALF_DAY,
  countMonthlyAttendanceWarnings,
  halfDaysFromWarnings,
  calcHalfDayPenalty,
  monthYearFromDate,
} from '../src/lib/attendance-policy.js';
import { hasAttendanceWarning } from '../src/lib/attendance-warnings-ui.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const uid = 'u1';
const { month, year } = monthYearFromDate();

assert(WARNINGS_PER_HALF_DAY === 2, 'late arrival/lunch must use 2 warnings per half-day');

const none = [];
assert(countMonthlyAttendanceWarnings(none, uid, month, year) === 0, 'empty = 0');
assert(halfDaysFromWarnings(0) === 0, '0 warnings = 0 half-days');
assert(calcHalfDayPenalty(30000, 0) === 0, 'no penalty with 0 warnings');
assert(calcHalfDayPenalty(30000, 1) === 0, '1 warning = warning only, no pay cut');

const one = [{ uid, type: 'late_clock_in', month, year }];
assert(countMonthlyAttendanceWarnings(one, uid, month, year) === 1, '1 late clock-in counts');
assert(halfDaysFromWarnings(1) === 0, '1 warning is not a half-day');

const two = [
  { uid, type: 'late_clock_in', month, year },
  { uid, type: 'late_lunch_return', month, year },
];
assert(countMonthlyAttendanceWarnings(two, uid, month, year) === 2, 'clock-in + lunch = 2');
assert(halfDaysFromWarnings(2) === 1, '2 warnings = 1 half-day');
const daily = 30000 / 30;
assert(calcHalfDayPenalty(30000, 2) === Math.round(1 * (daily / 2)), 'penalty is half of daily rate');

const three = [...two, { uid, type: 'late_clock_in', month, year, date: 'x' }];
assert(halfDaysFromWarnings(3) === 1, '3 warnings still 1 half-day (floor 3/2)');
assert(halfDaysFromWarnings(4) === 2, '4 warnings = 2 half-days');
assert(calcHalfDayPenalty(30000, 4) === Math.round(2 * (daily / 2)), 'second half-day at 4 warnings');

const otherMonth = [{ uid, type: 'late_clock_in', month: month === 1 ? 2 : 1, year }];
assert(countMonthlyAttendanceWarnings(otherMonth, uid, month, year) === 0, 'other month excluded');

const otherUser = [{ uid: 'u2', type: 'late_lunch_return', month, year }];
assert(countMonthlyAttendanceWarnings(otherUser, uid, month, year) === 0, 'other employee excluded');

const ignoredType = [{ uid, type: 'perf_below_40', month, year }];
assert(countMonthlyAttendanceWarnings(ignoredType, uid, month, year) === 0, 'non late/lunch types do not count');

const date = '2026-09-30';
const saved = [{ uid, type: 'late_lunch_return', date }];
assert(hasAttendanceWarning(saved, uid, 'late_lunch_return', date) === true, 'duplicate same day+type blocked');
assert(hasAttendanceWarning(saved, uid, 'late_clock_in', date) === false, 'other type same day allowed');
assert(hasAttendanceWarning(saved, uid, 'late_lunch_return', '2026-09-29') === false, 'other day allowed');

console.log('attendance deduction scenarios passed');
console.log(JSON.stringify({
  warningsPerHalfDay: WARNINGS_PER_HALF_DAY,
  examples: {
    w0: { halfDays: halfDaysFromWarnings(0), penalty: calcHalfDayPenalty(30000, 0) },
    w1: { halfDays: halfDaysFromWarnings(1), penalty: calcHalfDayPenalty(30000, 1) },
    w2: { halfDays: halfDaysFromWarnings(2), penalty: calcHalfDayPenalty(30000, 2) },
    w3: { halfDays: halfDaysFromWarnings(3), penalty: calcHalfDayPenalty(30000, 3) },
    w4: { halfDays: halfDaysFromWarnings(4), penalty: calcHalfDayPenalty(30000, 4) },
  },
}, null, 2));
