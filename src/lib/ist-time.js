/**
 * Office timezone helpers — CEGS runs on India Standard Time (Asia/Kolkata).
 * Vercel/Node default to UTC; never use Date#toTimeString() for attendance punches.
 */

export const OFFICE_TZ = 'Asia/Kolkata';

/** @returns {{ date: string, time: string, timeHm: string, hour: number, minute: number, second: number }} */
export function formatInOfficeTz(date = new Date(), timeZone = OFFICE_TZ) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
      .formatToParts(date)
      .filter((p) => p.type !== 'literal')
      .map((p) => [p.type, p.value])
  );
  const hour = parts.hour === '24' ? '00' : parts.hour;
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${hour}:${parts.minute}:${parts.second}`,
    timeHm: `${hour}:${parts.minute}`,
    hour: parseInt(hour, 10),
    minute: parseInt(parts.minute, 10),
    second: parseInt(parts.second, 10),
  };
}

/** YYYY-MM-DD in Asia/Kolkata */
export function istIsoDate(d = new Date()) {
  return formatInOfficeTz(d).date;
}

/** HH:mm:ss in Asia/Kolkata */
export function istTimeString(d = new Date()) {
  return formatInOfficeTz(d).time;
}

/** Accept HH:mm or HH:mm:ss from client; return HH:mm:ss or null */
export function normalizePunchTime(value) {
  const m = String(value || '').trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  const sec = Math.min(59, Math.max(0, parseInt(m[3] || '0', 10)));
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

/**
 * Legacy punches stored wall-clock UTC on Vercel (no time_zone).
 * Convert HH:mm[:ss] as UTC → Asia/Kolkata wall clock.
 */
export function utcWallClockToIst(timeStr) {
  const norm = normalizePunchTime(timeStr);
  if (!norm) return timeStr || null;
  try {
    const d = new Date(`1970-01-01T${norm}Z`);
    if (Number.isNaN(d.getTime())) return norm;
    return formatInOfficeTz(d).time;
  } catch {
    return norm;
  }
}

export function calcWorkHours(checkIn, checkOut) {
  const a = normalizePunchTime(checkIn);
  const b = normalizePunchTime(checkOut);
  if (!a || !b) return 0;
  const [sH, sM, sS] = a.split(':').map(Number);
  const [eH, eM, eS] = b.split(':').map(Number);
  const startMs = sH * 3600000 + sM * 60000 + sS * 1000;
  const endMs = eH * 3600000 + eM * 60000 + eS * 1000;
  return Math.max(0, Math.round(((endMs - startMs) / 3600000) * 100) / 100);
}
