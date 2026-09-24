/**
 * Campaign Hub week calendar (Asia/Kolkata civil dates).
 *
 * A monthly campaign is split into every Monday–Sunday week that overlaps
 * the target month (ISO-style weeks). September 2026 therefore has 5 periods
 * (31 Aug–6 Sep … 28 Sep–4 Oct), not a hardcoded 4.
 *
 * The same periods are used for target split, joiner aggregation, weekly
 * bonus, monthly weekly-achievement count, and Employee of the Month.
 */

import { istIsoDate } from '@/lib/ist-time';
import { normalizeCandidateDate } from '@/lib/candidate-dates';

export const WEEKLY_BONUS_INR = 5000;
export const EOM_BONUS_INR = 15000;
export const EOM_MIN_WEEKLY_WINS = 2;

function pad(n) {
  return String(n).padStart(2, '0');
}

export function addDaysIso(iso, days) {
  const [y, m, d] = String(iso).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/** 0 = Monday … 6 = Sunday for a YYYY-MM-DD civil date. */
export function mondayIndex(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  const utcDay = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 Sun
  return (utcDay + 6) % 7;
}

export function parseMonthKey(monthKey) {
  const m = String(monthKey || '').trim().match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  if (month < 1 || month > 12) return null;
  return { year, month, monthKey: `${year}-${pad(month)}` };
}

export function monthBounds(monthKey) {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) return null;
  const start = `${parsed.year}-${pad(parsed.month)}-01`;
  const nextMonth = parsed.month === 12 ? `${parsed.year + 1}-01-01` : `${parsed.year}-${pad(parsed.month + 1)}-01`;
  const end = addDaysIso(nextMonth, -1);
  return { ...parsed, start, end };
}

/** ISO week-year key for the Monday of a Mon–Sun week. */
export function isoWeekKeyFromMonday(mondayIso) {
  const thursday = addDaysIso(mondayIso, 3);
  const [ty, tm, td] = thursday.split('-').map(Number);
  const jan4 = `${ty}-01-04`;
  const jan4Mon = addDaysIso(jan4, -mondayIndex(jan4));
  const week = Math.floor((Date.parse(`${thursday}T00:00:00Z`) - Date.parse(`${jan4Mon}T00:00:00Z`)) / 86400000 / 7) + 1;
  return `${ty}-W${pad(week)}`;
}

/**
 * @returns {{ weekKey: string, startIso: string, endIso: string, index: number }[]}
 */
export function getMonthWeekPeriods(monthKey) {
  const bounds = monthBounds(monthKey);
  if (!bounds) return [];
  const firstMonday = addDaysIso(bounds.start, -mondayIndex(bounds.start));
  const weeks = [];
  let monday = firstMonday;
  let index = 0;
  while (monday <= bounds.end) {
    const endIso = addDaysIso(monday, 6);
    weeks.push({
      weekKey: isoWeekKeyFromMonday(monday),
      startIso: monday,
      endIso,
      index,
    });
    monday = addDaysIso(monday, 7);
    index += 1;
  }
  return weeks;
}

export function currentMonthKey(now = new Date()) {
  return istIsoDate(now).slice(0, 7);
}

export function isIsoInRange(iso, startIso, endIso) {
  if (!iso) return false;
  return iso >= startIso && iso <= endIso;
}

export function joiningDateIso(value) {
  return normalizeCandidateDate(value) || '';
}

/**
 * Split an integer total across `parts` buckets.
 * First `total % parts` buckets receive +1 so the sum equals `total`.
 * Documented remainder method — no floating-point targets.
 */
export function splitEvenly(total, parts) {
  const n = Math.max(0, Math.floor(Number(parts) || 0));
  const t = Math.max(0, Math.floor(Number(total) || 0));
  if (n === 0) return [];
  const base = Math.floor(t / n);
  const rem = t % n;
  return Array.from({ length: n }, (_, i) => base + (i < rem ? 1 : 0));
}

export function deriveCampaignTargets(monthlyTeamTarget, weekCount, employeeCount) {
  const monthly = Math.max(0, Math.floor(Number(monthlyTeamTarget) || 0));
  const weeks = Math.max(0, Math.floor(Number(weekCount) || 0));
  const employees = Math.max(0, Math.floor(Number(employeeCount) || 0));
  const teamWeeklyByWeek = splitEvenly(monthly, weeks);
  const typicalTeamWeekly = teamWeeklyByWeek[0] ?? 0;
  const individualByWeek = teamWeeklyByWeek.map((tw) => splitEvenly(tw, employees));
  const typicalIndividual = individualByWeek[0]?.[0] ?? 0;
  return {
    monthlyTeamTarget: monthly,
    weekCount: weeks,
    selectedEmployeeCount: employees,
    teamWeeklyByWeek,
    typicalTeamWeekly,
    individualByWeek,
    typicalIndividual,
    evenTeamWeekly: teamWeeklyByWeek.every((v) => v === typicalTeamWeekly),
    evenIndividual: individualByWeek.every((row) => row.every((v) => v === typicalIndividual)),
  };
}

export function weekStatus(actual, target) {
  const a = Math.max(0, Number(actual) || 0);
  const t = Math.max(0, Number(target) || 0);
  const remaining = Math.max(0, t - a);
  if (t <= 0) {
    return { actual: a, target: t, remaining: 0, achieved: false, exceeded: false, label: 'No target' };
  }
  if (a > t) return { actual: a, target: t, remaining: 0, achieved: true, exceeded: true, label: 'Achieved / Exceeded' };
  if (a === t) return { actual: a, target: t, remaining: 0, achieved: true, exceeded: false, label: 'Achieved' };
  return { actual: a, target: t, remaining, achieved: false, exceeded: false, label: 'Pending' };
}
