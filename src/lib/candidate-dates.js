/**
 * Normalize candidate sheet dates to YYYY-MM-DD for daily sheet filtering.
 */

import { istIsoDate } from '@/lib/ist-time';

export function todayIsoDate(d = new Date()) {
  return istIsoDate(d);
}

/** Convert DD/MM/YYYY, ISO, Excel serial, or Date → YYYY-MM-DD (or ''). */
export function normalizeCandidateDate(dateStr) {
  if (dateStr == null || dateStr === '') return '';
  if (typeof dateStr === 'number' && Number.isFinite(dateStr)) {
    // Excel serial date (days since 1899-12-30)
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const ms = excelEpoch.getTime() + dateStr * 86400000;
    const d = new Date(ms);
    if (!Number.isNaN(d.getTime())) return todayIsoDate(d);
    return '';
  }

  const str = String(dateStr).trim();
  if (!str || str.toLowerCase() === 'today') return todayIsoDate();

  // Already ISO YYYY-MM-DD
  const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  // en-GB DD/MM/YYYY or DD-MM-YYYY
  const dmy = str.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (dmy) {
    let day = parseInt(dmy[1], 10);
    let month = parseInt(dmy[2], 10);
    let year = parseInt(dmy[3], 10);
    if (year < 100) year += 2000;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // US-ish MM/DD/YYYY when first part > 12 treated as day already handled;
  // try Date parse as fallback
  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) return todayIsoDate(parsed);

  return '';
}

/** Display YYYY-MM-DD as DD/MM/YYYY for sheet cells. */
export function formatSheetDateDisplay(iso) {
  const n = normalizeCandidateDate(iso);
  if (!n) return '';
  const [y, m, d] = n.split('-');
  return `${d}/${m}/${y}`;
}

export function matchesSheetDate(cand, sheetDateIso) {
  const target = normalizeCandidateDate(sheetDateIso) || todayIsoDate();
  const candDate = normalizeCandidateDate(cand?.date);
  // Empty date on legacy rows: treat as belonging to selected sheet only when sheet is today
  if (!candDate) return target === todayIsoDate();
  return candDate === target;
}
