/**
 * Auto-mark employees absent when they do not clock in / attend on a working day.
 */

export const TODAY_ABSENT_AFTER_HOUR = 19; // 7:00 PM local — after work day, still no clock-in
export const ABSENT_LOOKBACK_DAYS = 21;

export function toIsoDate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseIsoDate(iso) {
  const [y, m, d] = String(iso || '').split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** Sundays are office holidays — skip. */
export function isWorkingDay(dateOrIso) {
  const d = typeof dateOrIso === 'string' ? parseIsoDate(dateOrIso) : dateOrIso;
  if (!d || Number.isNaN(d.getTime())) return false;
  return d.getDay() !== 0;
}

export function listWorkingDatesBack(now = new Date(), lookback = ABSENT_LOOKBACK_DAYS) {
  const dates = [];
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (let i = 0; i < lookback; i++) {
    const d = new Date(cursor);
    d.setDate(cursor.getDate() - i);
    if (isWorkingDay(d)) dates.push(toIsoDate(d));
  }
  return dates;
}

export function isActiveStaff(user) {
  if (!user) return false;
  const status = String(user.status || 'active').toLowerCase();
  if (status === 'inactive') return false;
  return true;
}

export function joinedOnOrBefore(user, isoDate) {
  const joined = String(user.joining_date || user.joined || '').slice(0, 10);
  if (!joined) return true;
  return joined <= isoDate;
}

export function isOnApprovedLeave(leaves, user, isoDate) {
  const uid = String(user?.id || user?._id || '');
  const name = String(user?.name || '').trim().toLowerCase();
  return (leaves || []).some((l) => {
    if (String(l.status || '').toLowerCase() !== 'approved') return false;
    const sameUser =
      String(l.uid || l.user_id || '') === uid ||
      String(l.employee_name || '').trim().toLowerCase() === name;
    if (!sameUser) return false;
    const start = String(l.start || l.start_date || '').slice(0, 10);
    const end = String(l.end || l.end_date || start).slice(0, 10);
    if (!start) return false;
    return isoDate >= start && isoDate <= end;
  });
}

export function hasAttendanceMarked(attendance, userId, isoDate) {
  return (attendance || []).some(
    (a) =>
      String(a.uid || a.user_id) === String(userId) &&
      String(a.date).slice(0, 10) === isoDate &&
      ['present', 'late', 'absent'].includes(String(a.status || '').toLowerCase())
  );
}

/**
 * Whether we should auto-absent for this calendar date yet.
 * Past working days: yes. Today: only after TODAY_ABSENT_AFTER_HOUR.
 */
export function shouldEvaluateDate(isoDate, now = new Date()) {
  if (!isWorkingDay(isoDate)) return false;
  const today = toIsoDate(now);
  if (isoDate < today) return true;
  if (isoDate > today) return false;
  return now.getHours() >= TODAY_ABSENT_AFTER_HOUR;
}

export function findMissingAbsentees({
  users = [],
  attendance = [],
  leaves = [],
  now = new Date(),
  lookback = ABSENT_LOOKBACK_DAYS,
} = {}) {
  const dates = listWorkingDatesBack(now, lookback).filter((d) => shouldEvaluateDate(d, now));
  const staff = (users || []).filter(isActiveStaff);
  const missing = [];

  for (const date of dates) {
    for (const user of staff) {
      const uid = user.id || user._id;
      if (!uid) continue;
      if (!joinedOnOrBefore(user, date)) continue;
      if (isOnApprovedLeave(leaves, user, date)) continue;
      if (hasAttendanceMarked(attendance, uid, date)) continue;
      missing.push({
        uid: String(uid),
        date,
        name: user.name || 'Staff',
        employee_id: user.employee_id || user.eid || '',
      });
    }
  }
  return missing;
}

export function buildAbsentAttendanceRecords(missing, seed = Date.now()) {
  return (missing || []).map((m, i) => ({
    id: `absent_${m.uid}_${m.date}`,
    uid: m.uid,
    date: m.date,
    in: null,
    out: null,
    status: 'absent',
    hrs: 0,
    auto: true,
    note: 'Auto-marked absent — no login / clock-in',
    created_at: new Date(seed + i).toISOString(),
  }));
}

export function buildAbsentCalendarEvents(absentRecords, users = []) {
  return (absentRecords || [])
    .filter((a) => String(a.status || '').toLowerCase() === 'absent')
    .map((a) => {
      const emp =
        (users || []).find(
          (u) => String(u.id) === String(a.uid) || String(u._id) === String(a.uid)
        ) || {};
      const name = emp.name || a.name || 'Staff Member';
      return {
        id: `absent_evt_${a.uid}_${a.date}`,
        title: `Absent - ${name}`,
        type: 'absent',
        date: String(a.date).slice(0, 10),
        person: name,
        icon: 'clock',
        badgeColor: '#DC2626',
        badgeBg: '#FEE2E2',
        notes: a.note || (a.auto ? 'Auto-marked absent (no login / attendance clock-in)' : 'Marked absent'),
      };
    });
}

/**
 * Merge new auto-absent rows into attendance list (does not overwrite present/late).
 * Returns { nextAttendance, added }.
 */
export function mergeAutoAbsents(attendance, users, leaves, now = new Date()) {
  const missing = findMissingAbsentees({ users, attendance, leaves, now });
  if (!missing.length) {
    return { nextAttendance: attendance || [], added: [] };
  }
  const added = buildAbsentAttendanceRecords(missing);
  return {
    nextAttendance: [...added, ...(attendance || [])],
    added,
  };
}
