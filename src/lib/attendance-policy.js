/**
 * Attendance & break policy — late warnings, lunch windows, payroll penalties.
 * Clock comparisons use Asia/Kolkata so Vercel UTC does not skew late checks.
 */

import { formatInOfficeTz } from '@/lib/ist-time';

export const LUNCH_START_HOUR = 15;
export const LUNCH_START_MIN = 0;
export const EMPLOYEE_LUNCH_MINS = 30;
export const HR_LUNCH_MINS = 60;
/** Late clock-in + late lunch return warnings combined per half-day cut */
export const WARNINGS_PER_HALF_DAY = 3;
export const DEFAULT_LOGIN_TIME = '10:00';
/** Per-employee login start overrides (used when login_time is not stored yet). */
export const SPECIAL_LOGIN_TIMES = {
  'raheel@careerexpertglobalsolution.com': '11:00',
};

export function parseHm(hm) {
  const parts = String(hm || DEFAULT_LOGIN_TIME).split(':').map((n) => parseInt(n, 10));
  return {
    h: Number.isFinite(parts[0]) ? parts[0] : 10,
    m: Number.isFinite(parts[1]) ? parts[1] : 0,
  };
}

export function formatTime12FromHm(hm) {
  const { h, m } = parseHm(hm);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

/** Official login start HH:mm — stored field, then special email map, then 10:00. */
export function resolveLoginTime(user) {
  const email = String(user?.email || '').toLowerCase().trim();
  const stored = String(user?.login_time || user?.loginTime || '').trim().slice(0, 5);
  const special = SPECIAL_LOGIN_TIMES[email];
  // Known special staff (e.g. Raheel @ 11:00): ignore schema default 10:00
  if (special) {
    if (stored && stored !== DEFAULT_LOGIN_TIME) return stored;
    return special;
  }
  return stored || DEFAULT_LOGIN_TIME;
}

export function getLateClockDeadline(user, settings) {
  const grace = Number(settings?.hours?.grace) || 15;
  let startH;
  let startM;
  if (user) {
    const parsed = parseHm(resolveLoginTime(user));
    startH = parsed.h;
    startM = parsed.m;
  } else if (settings?.hours?.start) {
    const parsed = parseHm(settings.hours.start);
    startH = parsed.h;
    startM = parsed.m;
  } else {
    startH = 10;
    startM = 0;
  }
  const deadlineTotal = startH * 60 + startM + grace;
  return {
    startH,
    startM,
    grace,
    deadlineH: Math.floor(deadlineTotal / 60) % 24,
    deadlineMin: deadlineTotal % 60,
    deadlineLabel: formatTime12FromHm(
      `${Math.floor(deadlineTotal / 60) % 24}:${String(deadlineTotal % 60).padStart(2, '0')}`
    ),
    startLabel: formatTime12FromHm(`${startH}:${String(startM).padStart(2, '0')}`),
  };
}

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

/** Late if after login start + grace (default 10:00 + 15 → 10:15; Raheel 11:00 + 15 → 11:15). */
export function isLateClockIn(now = new Date(), settings, user) {
  const { deadlineH, deadlineMin } = getLateClockDeadline(user, settings);
  const { hour: curH, minute: curM } = formatInOfficeTz(now);
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
