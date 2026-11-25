/**
 * Revenue Sheets Calculation Engine (November 2026+)
 *
 * Combines Data Sheet activity (walk-ins, selections from Candidate) with
 * Joiner Sheet records (active joiners, company & process payout rates from JoinerEntry + Candidate).
 * Excludes inactive/dropped joiners so live attrition deducts from daily, weekly, and monthly revenue.
 */

import { normalizeCandidateDate } from '@/lib/candidate-dates';
import { istIsoDate } from '@/lib/ist-time';
import { canonicalRecruiterName, employeeNamesMatch } from '@/lib/recruiter-names';
import { addDaysIso, currentMonthKey, getMonthWeekPeriods, monthBounds, parseMonthKey } from '@/lib/campaign-weeks';
import { isCandidateInactive, isJoinedCandidate, isJoinerEntryInactive } from '@/lib/campaign-joiners';
import { resolveJoinerPayoutInfo } from '@/lib/company-process-payouts';

export const MIN_REVENUE_MONTH = '2026-11';
export const MIN_REVENUE_DATE = '2026-11-01';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function formatMonthLabel(monthKey) {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) return monthKey;
  return `${MONTH_NAMES[parsed.month - 1]} ${parsed.year}`;
}

function parseFlexDateIso(val) {
  if (!val) return '';
  const cleaned = String(val).replace(/\s*([/-])\s*/g, '$1').trim();
  return normalizeCandidateDate(cleaned);
}

function istDateFromCreated(val) {
  if (!val) return '';
  try {
    const dt = new Date(val);
    if (isNaN(dt.getTime())) return '';
    return istIsoDate(dt);
  } catch {
    return '';
  }
}

function normPhone(val) {
  return String(val || '').replace(/\D/g, '');
}

function normText(val) {
  return String(val || '').trim().toLowerCase();
}

function sheetText(cand) {
  return `${cand?.response || ''} ${cand?.followUp1 || ''} ${cand?.followUp2 || ''} ${cand?.followUp3 || ''} ${cand?.category || ''} ${cand?.callStatus || ''}`
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function isWalkinCandidate(cand) {
  const text = sheetText(cand);
  const cat = String(cand?.category || '').toLowerCase();
  return (
    /walk\s*-?\s*in/.test(text) ||
    text.includes('walkin') ||
    text.includes('visited') ||
    cat === 'walkins'
  );
}

function isSelectionCandidate(cand) {
  const text = sheetText(cand);
  const cat = String(cand?.category || '').toLowerCase();
  return text.includes('selected') || text.includes('hired') || cat === 'selected';
}

function getDayOfWeekUtc(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sun
}

/**
 * Determine recruitment staff names (excluding Super Admin & IT_TEAM unless they logged recruitment entries).
 */
function buildRecruiterRoster(users = [], activeMonthEntries = []) {
  const names = [];
  const pushUnique = (rawName) => {
    const s = String(rawName || '').trim();
    if (!s) return;
    if (names.some((n) => employeeNamesMatch(n, s))) return;
    names.push(s);
  };

  (users || []).forEach((u) => {
    const role = String(u.role || '').toLowerCase();
    const status = String(u.status || 'active').toLowerCase();
    if (status === 'inactive') return;
    if (role === 'super_admin' || role === 'it_team') return;
    pushUnique(u.name);
  });

  // Include anyone with activity in the selected month (e.g., an employee who left mid-month)
  (activeMonthEntries || []).forEach((name) => {
    pushUnique(name);
  });

  return names.sort((a, b) => a.localeCompare(b));
}

/**
 * Build structured Revenue Sheets payload for a given month (>= 2026-11).
 */
export function buildRevenueSheetData({
  monthKey: requestedMonthKey,
  users = [],
  candidates = [],
  joinerEntries = [],
  now = new Date(),
}) {
  const todayIso = istIsoDate(now);
  const curMonth = currentMonthKey(now);
  const effectiveDefaultMonth = curMonth >= MIN_REVENUE_MONTH ? curMonth : MIN_REVENUE_MONTH;
  const targetMonth =
    requestedMonthKey && parseMonthKey(requestedMonthKey) && requestedMonthKey >= MIN_REVENUE_MONTH
      ? requestedMonthKey
      : effectiveDefaultMonth;

  const bounds = monthBounds(targetMonth);
  const monthPrefix = `${targetMonth}-`;

  // 1. Index candidates and overlays
  const candById = new Map();
  (candidates || []).forEach((c) => {
    const cid = String(c.id || c._id || '').trim();
    if (cid) candById.set(cid, c);
  });

  const inactiveIds = new Set();
  const inactiveNamePhones = new Set();
  (joinerEntries || []).forEach((j) => {
    if (isJoinerEntryInactive(j)) {
      const cid = String(j.candidateId || '').trim();
      if (cid) inactiveIds.add(cid);
      const np = `${normText(j.name)}|${normPhone(j.phone)}`;
      if (np !== '|') inactiveNamePhones.add(np);
    }
  });

  // 2. Collect available months >= 2026-11 AND collect normalized candidate + joiner events
  const monthSet = new Set([MIN_REVENUE_MONTH]);
  if (curMonth >= MIN_REVENUE_MONTH) monthSet.add(curMonth);

  const novOnwardEventsForRoster = [];
  const dayRecruiterActivity = new Map(); // date -> Map<canonicalRecruiter, { walkins, selections }>

  // Pre-scan candidates for available months & month walkins/selections
  const monthCandidates = [];
  (candidates || []).forEach((c) => {
    const iso = parseFlexDateIso(c.date) || istDateFromCreated(c.createdAt);
    if (!iso || iso < MIN_REVENUE_DATE) return;
    const ym = iso.slice(0, 7);
    monthSet.add(ym);
    if (iso >= bounds.start && iso <= bounds.end) {
      monthCandidates.push({ cand: c, iso });
      if (c.employee) novOnwardEventsForRoster.push(c.employee);
    }
  });

  // Merge Joiner Sheet + Joined Candidates (deduped by candidateId else name+phone)
  const joinerByKey = new Map();
  (joinerEntries || []).forEach((j) => {
    const name = String(j.name || '').trim();
    if (!name) return;
    const cid = String(j.candidateId || '').trim();
    const np = `${normText(name)}|${normPhone(j.phone)}`;
    const key = cid || `p:${np}`;

    let iso = '';
    if (j.dateOfJoining && String(j.dateOfJoining).trim()) {
      iso = parseFlexDateIso(j.dateOfJoining);
    } else if (cid && candById.has(cid)) {
      const linked = candById.get(cid);
      iso = parseFlexDateIso(linked.date) || istDateFromCreated(linked.createdAt);
    } else if (!cid) {
      iso = istDateFromCreated(j.createdAt);
    }
    if (!iso || iso < MIN_REVENUE_DATE) return;

    monthSet.add(iso.slice(0, 7));

    const linkedCand = cid ? candById.get(cid) : null;
    const rawRecruiter = String(j.recruiterName || linkedCand?.employee || '').trim();
    const rawCompany = String(j.company || linkedCand?.company || '').trim();
    const rawProcess = String(j.process || linkedCand?.process || '').trim();
    const inactive = isJoinerEntryInactive(j) || (linkedCand ? isCandidateInactive(linkedCand) : false);

    if (iso >= bounds.start && iso <= bounds.end && rawRecruiter) {
      novOnwardEventsForRoster.push(rawRecruiter);
    }

    joinerByKey.set(key, {
      id: String(j._id || j.id || key),
      candidateId: cid,
      name,
      phone: String(j.phone || linkedCand?.number || '').trim(),
      isoDate: iso,
      rawCompany,
      rawProcess,
      rawRecruiter,
      inactive,
      inactiveReason: inactive
        ? ['week1', 'week2', 'week3', 'week4', 'week5', 'week6', 'week7', 'week8']
            .map((wk) => j[wk])
            .filter(Boolean)
            .slice(-1)[0] || j.status || 'Inactive'
        : '',
      source: cid ? 'Joiner Sheet + Data Sheet' : 'Joiner Sheet (Manual)',
    });
  });

  (candidates || []).forEach((c) => {
    if (!isJoinedCandidate(c)) return;
    const name = String(c.name || '').trim();
    if (!name) return;
    const cid = String(c.id || c._id || '').trim();
    const np = `${normText(name)}|${normPhone(c.number)}`;
    const key = cid || `p:${np}`;
    if (joinerByKey.has(key)) {
      const existing = joinerByKey.get(key);
      if (!existing.rawRecruiter && c.employee) existing.rawRecruiter = String(c.employee).trim();
      if (!existing.rawCompany && c.company) existing.rawCompany = String(c.company).trim();
      if (!existing.rawProcess && c.process) existing.rawProcess = String(c.process).trim();
      return;
    }

    const iso = parseFlexDateIso(c.date) || istDateFromCreated(c.createdAt);
    if (!iso || iso < MIN_REVENUE_DATE) return;

    monthSet.add(iso.slice(0, 7));

    const inactive =
      isCandidateInactive(c) ||
      (cid && inactiveIds.has(cid)) ||
      (np !== '|' && inactiveNamePhones.has(np));

    if (iso >= bounds.start && iso <= bounds.end && c.employee) {
      novOnwardEventsForRoster.push(c.employee);
    }

    joinerByKey.set(key, {
      id: cid || key,
      candidateId: cid,
      name,
      phone: String(c.number || '').trim(),
      isoDate: iso,
      rawCompany: String(c.company || '').trim(),
      rawProcess: String(c.process || '').trim(),
      rawRecruiter: String(c.employee || '').trim(),
      inactive,
      inactiveReason: inactive ? (c.response || 'Inactive') : '',
      source: 'Data Sheet',
    });
  });

  const recruiters = buildRecruiterRoster(users, novOnwardEventsForRoster);

  // 3. Tally Walk-ins & Selections for targetMonth
  monthCandidates.forEach(({ cand, iso }) => {
    const rec = canonicalRecruiterName(cand.employee || '', recruiters) || String(cand.employee || '').trim() || 'Unassigned';
    const w = isWalkinCandidate(cand) ? 1 : 0;
    const s = isSelectionCandidate(cand) ? 1 : 0;
    if (!w && !s) return;

    if (!dayRecruiterActivity.has(iso)) dayRecruiterActivity.set(iso, new Map());
    const recMap = dayRecruiterActivity.get(iso);
    if (!recMap.has(rec)) recMap.set(rec, { walkins: 0, selections: 0 });
    const entry = recMap.get(rec);
    entry.walkins += w;
    entry.selections += s;
  });

  // 4. Filter joiners to targetMonth and compute payout revenue
  const activeJoinerLedger = [];
  const inactiveJoinerLedger = [];
  const dayRecruiterJoiners = new Map(); // date -> Map<canonicalRecruiter, { joiners, revenue }>

  [...joinerByKey.values()]
    .filter((j) => j.isoDate >= bounds.start && j.isoDate <= bounds.end)
    .sort((a, b) => b.isoDate.localeCompare(a.isoDate) || a.name.localeCompare(b.name))
    .forEach((j) => {
      const rec = canonicalRecruiterName(j.rawRecruiter, recruiters) || j.rawRecruiter || 'Unassigned';
      const payout = resolveJoinerPayoutInfo(j.rawCompany, j.rawProcess);
      const record = {
        ...j,
        recruiterName: rec,
        canonicalCompany: payout.canonicalCompany,
        matchedProcess: payout.matchedProcess || j.rawProcess || 'Default Rate',
        rate: payout.rate,
        isExactRateMatch: payout.isExactMatch,
      };

      if (j.inactive) {
        inactiveJoinerLedger.push(record);
        return;
      }

      activeJoinerLedger.push(record);
      if (!dayRecruiterJoiners.has(j.isoDate)) dayRecruiterJoiners.set(j.isoDate, new Map());
      const rMap = dayRecruiterJoiners.get(j.isoDate);
      if (!rMap.has(rec)) rMap.set(rec, { joiners: 0, revenue: 0 });
      const cell = rMap.get(rec);
      cell.joiners += 1;
      cell.revenue += payout.rate;
    });

  // 5. Build Daily Sheets (Mon–Sat, or Sunday only if activity happened; up to min(bounds.end, todayIso) or max activity date)
  const activityDates = new Set([...dayRecruiterActivity.keys(), ...dayRecruiterJoiners.keys()]);
  const maxActiveDate = [...activityDates].sort().pop() || '';
  const lastDateInMonth = targetMonth === curMonth ? (maxActiveDate > todayIso ? maxActiveDate : todayIso) : bounds.end;
  const clampedEnd = lastDateInMonth < bounds.end ? lastDateInMonth : bounds.end;

  const allDatesAsc = [];
  let cursor = bounds.start;
  while (cursor <= clampedEnd) {
    const dow = getDayOfWeekUtc(cursor);
    const hasActivity = activityDates.has(cursor);
    if (dow !== 0 || hasActivity) {
      allDatesAsc.push(cursor);
    }
    cursor = addDaysIso(cursor, 1);
  }

  const dailyByDateMap = new Map();
  const dailySheets = allDatesAsc.map((iso) => {
    const actMap = dayRecruiterActivity.get(iso) || new Map();
    const jndMap = dayRecruiterJoiners.get(iso) || new Map();

    // Ensure any recruiter with activity on that day is listed
    const rowNames = [...recruiters];
    [...actMap.keys(), ...jndMap.keys()].forEach((r) => {
      if (!rowNames.some((n) => employeeNamesMatch(n, r))) rowNames.push(r);
    });

    let totalWalkins = 0;
    let totalSelections = 0;
    let totalJoiners = 0;
    let totalRevenue = 0;

    const rows = rowNames.map((name, idx) => {
      const a = actMap.get(name) || { walkins: 0, selections: 0 };
      const j = jndMap.get(name) || { joiners: 0, revenue: 0 };
      totalWalkins += a.walkins;
      totalSelections += a.selections;
      totalJoiners += j.joiners;
      totalRevenue += j.revenue;
      return {
        slNo: idx + 1,
        recruiterName: name,
        walkins: a.walkins,
        selections: a.selections,
        joiners: j.joiners,
        revenue: j.revenue,
      };
    });

    const dayObj = {
      date: iso,
      rows,
      totals: {
        walkins: totalWalkins,
        selections: totalSelections,
        joiners: totalJoiners,
        revenue: totalRevenue,
      },
    };
    dailyByDateMap.set(iso, dayObj);
    return dayObj;
  });

  // 6. Weekly Revenue Summaries (Mon–Sat ISO weeks clipped to [bounds.start, bounds.end])
  const rawWeeks = getMonthWeekPeriods(targetMonth);
  const weeklySummaries = rawWeeks
    .map((wk, idx) => {
      const wkDays = [];
      let d = wk.startIso < bounds.start ? bounds.start : wk.startIso;
      const wkEnd = wk.endIso > clampedEnd ? clampedEnd : wk.endIso;
      while (d <= wkEnd) {
        if (d.startsWith(monthPrefix)) {
          const dow = getDayOfWeekUtc(d);
          const dayObj = dailyByDateMap.get(d);
          if (dow !== 0 || dayObj) {
            wkDays.push({
              slNo: wkDays.length + 1,
              date: d,
              walkins: dayObj?.totals.walkins || 0,
              selections: dayObj?.totals.selections || 0,
              joiners: dayObj?.totals.joiners || 0,
              revenue: dayObj?.totals.revenue || 0,
            });
          }
        }
        d = addDaysIso(d, 1);
      }
      if (wkDays.length === 0) return null;
      return {
        weekNumber: idx + 1,
        weekKey: wk.weekKey,
        startIso: wkDays[0].date,
        endIso: wkDays[wkDays.length - 1].date,
        days: wkDays,
        totalWalkins: wkDays.reduce((s, r) => s + r.walkins, 0),
        totalSelections: wkDays.reduce((s, r) => s + r.selections, 0),
        totalJoiners: wkDays.reduce((s, r) => s + r.joiners, 0),
        totalRevenue: wkDays.reduce((s, r) => s + r.revenue, 0),
      };
    })
    .filter(Boolean);

  // 7. Monthly Company-Wise Breakdown (with nested Process breakdown)
  const companyMap = new Map();
  activeJoinerLedger.forEach((j) => {
    const cName = j.canonicalCompany;
    if (!companyMap.has(cName)) {
      companyMap.set(cName, {
        company: cName,
        joiners: 0,
        inactiveJoiners: 0,
        revenue: 0,
        processMap: new Map(),
      });
    }
    const comp = companyMap.get(cName);
    comp.joiners += 1;
    comp.revenue += j.rate;

    const pKey = `${j.matchedProcess}|${j.rate}`;
    if (!comp.processMap.has(pKey)) {
      comp.processMap.set(pKey, {
        process: j.matchedProcess,
        rate: j.rate,
        joiners: 0,
        revenue: 0,
      });
    }
    const proc = comp.processMap.get(pKey);
    proc.joiners += 1;
    proc.revenue += j.rate;
  });

  inactiveJoinerLedger.forEach((j) => {
    const cName = j.canonicalCompany;
    if (!companyMap.has(cName)) {
      companyMap.set(cName, {
        company: cName,
        joiners: 0,
        inactiveJoiners: 0,
        revenue: 0,
        processMap: new Map(),
      });
    }
    companyMap.get(cName).inactiveJoiners += 1;
  });

  const companySummary = [...companyMap.values()]
    .map((c) => ({
      company: c.company,
      joiners: c.joiners,
      inactiveJoiners: c.inactiveJoiners,
      revenue: c.revenue,
      processes: [...c.processMap.values()].sort((a, b) => b.revenue - a.revenue),
    }))
    .sort((a, b) => b.revenue - a.revenue || b.joiners - a.joiners)
    .map((c, idx) => ({ slNo: idx + 1, ...c }));

  // 8. Monthly Recruiter-Wise Leaderboard
  const totalMonthRevenue = activeJoinerLedger.reduce((s, j) => s + j.rate, 0);
  const recruiterTotalsMap = new Map();
  recruiters.forEach((name) => {
    recruiterTotalsMap.set(name, {
      recruiterName: name,
      walkins: 0,
      selections: 0,
      joiners: 0,
      inactiveJoiners: 0,
      revenue: 0,
    });
  });

  dailySheets.forEach((ds) => {
    ds.rows.forEach((r) => {
      if (!recruiterTotalsMap.has(r.recruiterName)) {
        recruiterTotalsMap.set(r.recruiterName, {
          recruiterName: r.recruiterName,
          walkins: 0,
          selections: 0,
          joiners: 0,
          inactiveJoiners: 0,
          revenue: 0,
        });
      }
      const rt = recruiterTotalsMap.get(r.recruiterName);
      rt.walkins += r.walkins;
      rt.selections += r.selections;
      rt.joiners += r.joiners;
      rt.revenue += r.revenue;
    });
  });

  inactiveJoinerLedger.forEach((j) => {
    const key = j.recruiterName;
    if (recruiterTotalsMap.has(key)) {
      recruiterTotalsMap.get(key).inactiveJoiners += 1;
    }
  });

  const recruiterSummary = [...recruiterTotalsMap.values()]
    .sort((a, b) => b.revenue - a.revenue || b.joiners - a.joiners || b.selections - a.selections)
    .map((r, idx) => ({
      slNo: idx + 1,
      ...r,
      sharePct: totalMonthRevenue > 0 ? Math.round((r.revenue / totalMonthRevenue) * 100) : 0,
    }));

  // 9. Overall Month Totals
  const totals = {
    walkins: recruiterSummary.reduce((s, r) => s + r.walkins, 0),
    selections: recruiterSummary.reduce((s, r) => s + r.selections, 0),
    joiners: activeJoinerLedger.length,
    inactiveJoiners: inactiveJoinerLedger.length,
    revenue: totalMonthRevenue,
    avgRevenuePerJoiner:
      activeJoinerLedger.length > 0 ? Math.round(totalMonthRevenue / activeJoinerLedger.length) : 0,
    workingDays: dailySheets.length,
  };

  const availableMonths = [...monthSet]
    .filter((m) => m >= MIN_REVENUE_MONTH)
    .sort((a, b) => b.localeCompare(a))
    .map((key) => ({ key, label: formatMonthLabel(key) }));

  return {
    monthKey: targetMonth,
    monthLabel: formatMonthLabel(targetMonth),
    minMonth: MIN_REVENUE_MONTH,
    availableMonths,
    totals,
    dailySheets: [...dailySheets].reverse(), // Newest working day first
    weeklySummaries,
    companySummary,
    recruiterSummary,
    activeJoinerLedger,
    inactiveJoinerLedger,
  };
}
