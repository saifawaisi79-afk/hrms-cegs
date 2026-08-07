/**
 * Attendance & break policy — late warnings, lunch windows, payroll penalties.
 */

export const LUNCH_START_HOUR = 15;
export const LUNCH_START_MIN = 0;
export const EMPLOYEE_LUNCH_MINS = 30;
export const HR_LUNCH_MINS = 60;
/** Late clock-in + late lunch return warnings combined per half-day cut */
export const WARNINGS_PER_HALF_DAY = 3;

export function isHrOrSuperAdmin(user) {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'super_admin') return true;
  const title = String(user.title || user.designation || '').toLowerCase();
  return title.includes('hr manager') || title.includes('hr ');
}

export function getLunchAllowedMinutes(user) {
  return isHrOrSuperAdmin(user) ? HR_LUNCH_MINS : EMPLOYEE_LUNCH_MINS;
}

/** Employee lunch window 3:00–3:30 PM; HR 3:00–4:00 PM */
export function getLunchWindowEnd(user) {
  const mins = getLunchAllowedMinutes(user);
  const end = new Date();
  end.setHours(LUNCH_START_HOUR, LUNCH_START_MIN + mins, 0, 0);
  return end;
}

export function getLunchWindowLabel(user) {
  const mins = getLunchAllowedMinutes(user);
  if (mins === 60) return '3:00 PM – 4:00 PM';
  return '3:00 PM – 3:30 PM';
}

/** Late if after 10:15 AM (10:00 start + 15 min grace from settings). */
export function isLateClockIn(now = new Date(), settings) {
  const h = settings?.hours;
  let startH = 10;
  let startM = 0;
  const grace = Number(h?.grace) || 15;
  if (h?.start) {
    const parts = String(h.start).split(':').map(Number);
    startH = parts[0] || 10;
    startM = parts[1] || 0;
  }
  const deadlineM = startM + grace;
  const deadlineH = startH + Math.floor(deadlineM / 60);
  const deadlineMin = deadlineM % 60;
  const curH = now.getHours();
  const curM = now.getMinutes();
  if (curH > deadlineH) return true;
  if (curH === deadlineH && curM > deadlineMin) return true;
  return false;
}

export function monthYearFromDate(d = new Date()) {
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}

export function countMonthlyAttendanceWarnings(warnings, uid, month, year) {
  return (warnings || []).filter(
    (w) =>
      String(w.uid) === String(uid) &&
      Number(w.month) === Number(month) &&
      Number(w.year) === Number(year) &&
      (w.type === 'late_clock_in' || w.type === 'late_lunch_return')
  ).length;
}

export function halfDaysFromWarnings(warningCount) {
  return Math.floor(warningCount / WARNINGS_PER_HALF_DAY);
}

export function calcHalfDayPenalty(basicSalary, warningCount) {
  const basic = Number(basicSalary) || 0;
  if (!basic || warningCount < WARNINGS_PER_HALF_DAY) return 0;
  const dailyRate = basic / 30;
  const halfDays = halfDaysFromWarnings(warningCount);
  return Math.round(halfDays * (dailyRate / 2));
}

/** Minutes until 2:50 PM lunch heads-up (10 min before 3:00 PM window). */
export function minutesUntilLunchHeadsUp(now = new Date()) {
  const target = new Date(now);
  target.setHours(14, 50, 0, 0);
  return (target.getTime() - now.getTime()) / 60000;
}

export function isLunchHeadsUpTime(now = new Date()) {
  const h = now.getHours();
  const m = now.getMinutes();
  return h === 14 && m >= 50;
}

export function isLateLunchReturn(user, endTime = new Date(), durationSecs, allowedMinutes) {
  const exceeded = durationSecs > allowedMinutes * 60;
  const windowEnd = getLunchWindowEnd(user);
  const lateByClock = endTime.getTime() > windowEnd.getTime();
  return exceeded || lateByClock;
}
