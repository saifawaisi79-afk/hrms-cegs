/**
 * Client-side helpers for attendance warnings + notifications (localStorage via save()).
 */
import {
  WARNINGS_PER_HALF_DAY,
  monthYearFromDate,
  countMonthlyAttendanceWarnings,
  halfDaysFromWarnings,
} from './attendance-policy';

export function pushHrmsNotification(save, db, { to, title, msg, type = 'Attendance' }) {
  if (!save || !to) return;
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
    },
    ...(db?.notifications || []),
  ]);
}

export function recordAttendanceWarning(save, db, { uid, type, note }) {
  const { month, year } = monthYearFromDate();
  const date = new Date().toISOString().split('T')[0];
  const entry = {
    id: Date.now() + Math.random(),
    uid,
    type,
    date,
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
      msg: `You have ${count} attendance warnings this month (${halfDays} half-day pay cut${halfDays > 1 ? 's' : ''} will apply on payroll). Late clock-in and late lunch return are counted together.`,
      type: 'Attendance',
    });
  }
  return count;
}
