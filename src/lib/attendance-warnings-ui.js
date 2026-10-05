/**
 * Client-side helpers for attendance warnings + notifications.
 * Warnings are saved locally for instant UI and POSTed to Mongo for payroll.
 */
import {
  WARNINGS_PER_HALF_DAY,
  countMonthlyAttendanceWarnings,
  countMonthlyEarlyLogoutWarnings,
  halfDaysFromWarnings,
  halfDaysFromEarlyLogouts,
} from './attendance-policy';
import { istIsoDate } from './ist-time';

function authHeaders() {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('cegs_token') : '';
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function pushHrmsNotification(save, db, { to, title, msg, type = 'Attendance', dedupeKey = null }) {
  if (!save || !to) return;
  const existing = db?.notifications || [];
  if (dedupeKey && existing.some((n) => n.dedupeKey && n.dedupeKey === dedupeKey)) return;
  save('notifications', [
    {
      id: Date.now() + Math.random(),
      from: null,
      to,
      title,
      msg,
      type,
      read: 0,
      at: new Date().toISOString(),
      dedupeKey,
    },
    ...existing,
  ]);
}

export function hasAttendanceWarning(warnings, uid, type, date) {
  return (warnings || []).some(
    (w) =>
      String(w.uid) === String(uid) &&
      w.type === type &&
      String(w.date).slice(0, 10) === String(date).slice(0, 10)
  );
}

export async function persistAttendanceWarningRemote({ type, note, date, uid }) {
  try {
    const res = await fetch('/api/attendance-warnings', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ type, note, date, user_id: uid }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function recordAttendanceWarning(save, db, { uid, type, note, date }) {
  const isoDate = date || istIsoDate();
  const [yearStr, monthStr] = String(isoDate).split('-');
  const month = parseInt(monthStr, 10);
  const year = parseInt(yearStr, 10);
  if (hasAttendanceWarning(db?.attendanceWarnings, uid, type, isoDate)) {
    return countMonthlyAttendanceWarnings(db?.attendanceWarnings || [], uid, month, year);
  }

  const entry = {
    id: Date.now() + Math.random(),
    uid,
    type,
    date: isoDate,
    month,
    year,
    note: note || '',
    at: new Date().toISOString(),
  };
  const all = [...(db?.attendanceWarnings || []), entry];
  save('attendanceWarnings', all);

  const count = countMonthlyAttendanceWarnings(all, uid, month, year);
  if (count > 0 && count % WARNINGS_PER_HALF_DAY === 0) {
    const halfDays = halfDaysFromWarnings(count);
    pushHrmsNotification(save, db, {
      to: uid,
      title: 'Half-Day Pay Cut Notice',
      msg: `You have ${count} attendance warnings this month (${halfDays} half-day pay cut${halfDays > 1 ? 's' : ''} will apply on payroll). Late clock-in and late lunch return are counted together (2 warnings = 1 half-day).`,
      type: 'Attendance',
      dedupeKey: `att-halfday:${uid}:${year}-${String(month).padStart(2, '0')}:${count}`,
    });
  }

  persistAttendanceWarningRemote({ type, note, date: isoDate, uid });

  return count;
}

export function recordEarlyLogoutWarning(save, db, { uid, note, date }) {
  const isoDate = date || istIsoDate();
  const [yearStr, monthStr] = String(isoDate).split('-');
  const month = parseInt(monthStr, 10);
  const year = parseInt(yearStr, 10);
  const type = 'early_clock_out';

  if (hasAttendanceWarning(db?.attendanceWarnings, uid, type, isoDate)) {
    return countMonthlyEarlyLogoutWarnings(db?.attendanceWarnings || [], uid, month, year);
  }

  const entry = {
    id: Date.now() + Math.random(),
    uid,
    type,
    date: isoDate,
    month,
    year,
    note: note || '',
    at: new Date().toISOString(),
  };
  const all = [...(db?.attendanceWarnings || []), entry];
  if (save) save('attendanceWarnings', all);

  const earlyCount = countMonthlyEarlyLogoutWarnings(all, uid, month, year);

  if (earlyCount === 1) {
    pushHrmsNotification(save, db, {
      to: uid,
      title: 'Early Logout Warning (1 of 2)',
      msg: 'You clocked out/logged out before completing your 9-hour cycle.',
      type: 'Attendance',
      dedupeKey: `att-early-warn-1:${uid}:${isoDate}`,
    });
  } else if (earlyCount === 2) {
    pushHrmsNotification(save, db, {
      to: uid,
      title: 'Early Logout Warning (2 of 2)',
      msg: 'Caution: Next early departure will mark you as Half-Day Absent with a salary deduction!',
      type: 'Attendance',
      dedupeKey: `att-early-warn-2:${uid}:${isoDate}`,
    });
  } else {
    pushHrmsNotification(save, db, {
      to: uid,
      title: 'Half-Day Absent (Early Logout)',
      msg: `Early departure #${earlyCount} this month. You have been marked Half-Day Absent with payroll deduction.`,
      type: 'Attendance',
      dedupeKey: `att-early-halfday:${uid}:${isoDate}:${earlyCount}`,
    });
  }

  persistAttendanceWarningRemote({ type, note, date: isoDate, uid });
  return earlyCount;
}

