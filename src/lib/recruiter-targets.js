/**
 * Shared recruiter daily target & performance score calculations.
 * Single source of truth used by both Targets UI and server Payroll / Warning reconciliation.
 */
import { employeeNamesMatch } from '@/lib/recruiter-names';
import { matchesSheetDate } from '@/lib/candidate-dates';

export function isFinanceUserOrEmployee(target, dbUsers = []) {
  if (!target) return false;
  if (typeof target === 'object') {
    if (target.role === 'finance') return true;
    const t = String(target.title || target.designation || '').toLowerCase();
    const d = String(target.department || target.department_name || target.dept || '').toLowerCase();
    if (
      t.includes('finance') ||
      t.includes('invoice') ||
      t.includes('billing') ||
      t.includes('accounts') ||
      d.includes('finance') ||
      d.includes('invoice') ||
      d.includes('billing') ||
      d.includes('accounts')
    ) {
      return true;
    }
    if (target.name) {
      const match = (dbUsers || []).find(
        (u) => u && u !== target && employeeNamesMatch(u.name, target.name)
      );
      if (match && match !== target) return isFinanceUserOrEmployee(match, []);
    }
    return false;
  }
  const matchedUser = (dbUsers || []).find((u) => employeeNamesMatch(u?.name, target));
  if (matchedUser) {
    return isFinanceUserOrEmployee(matchedUser, []);
  }
  return false;
}

export function getRecruitmentTargets(isFinance) {
  if (isFinance) {
    return {
      calls: 40,
      itvs: 7,
      walks: 2,
      sels: 1,
      jnds: 1,
    };
  }
  return {
    calls: 80,
    itvs: 15,
    walks: 5,
    sels: 3,
    jnds: 1,
  };
}

export function isConnectedCall(c) {
  const status = String(c?.callStatus || '').trim().toLowerCase();
  return status === 'connected' || status.includes('connect');
}

/** One sheet row can credit multiple daily tasks via Response / Follow-up text. */
export function candidateMatchesTask(cand, task) {
  if (task === 'calls') return isConnectedCall(cand);
  const text = `${cand?.response || ''} ${cand?.followUp1 || ''} ${cand?.followUp2 || ''} ${cand?.followUp3 || ''}`
    .toLowerCase()
    .replace(/\s+/g, ' ');
  if (task === 'interviews') {
    return text.includes('interview') || text.includes('scheduled') || /\bschedule\b/.test(text);
  }
  if (task === 'walkins') {
    return /walk\s*-?\s*in/.test(text) || text.includes('walkin') || text.includes('visited');
  }
  if (task === 'selected') {
    return text.includes('selected') || text.includes('hired');
  }
  if (task === 'joined') {
    return text.includes('joined') || text.includes('joining') || String(cand?.category || '').toLowerCase() === 'joined';
  }
  return false;
}

export function computeRecruiterDayPerformance({
  candidates = [],
  empName = '',
  sheetDate,
  isFinance = null,
  user = null,
  dbUsers = [],
}) {
  const resolvedFinance =
    typeof isFinance === 'boolean'
      ? isFinance
      : isFinanceUserOrEmployee(user || empName, dbUsers);
  const targets = getRecruitmentTargets(resolvedFinance);

  const dayRows = (candidates || []).filter((c) => {
    if (!matchesSheetDate(c, sheetDate)) return false;
    if (!empName) return true;
    return employeeNamesMatch(c?.employee, empName);
  });

  const calls = dayRows.filter((c) => candidateMatchesTask(c, 'calls')).length;
  const itvs = dayRows.filter((c) => candidateMatchesTask(c, 'interviews')).length;
  const walks = dayRows.filter((c) => candidateMatchesTask(c, 'walkins')).length;
  const sels = dayRows.filter((c) => candidateMatchesTask(c, 'selected')).length;
  const jnds = dayRows.filter((c) => candidateMatchesTask(c, 'joined')).length;

  const callsScore = Math.min(20, Math.round((calls / targets.calls) * 20));
  const itvScore = Math.min(20, Math.round((itvs / targets.itvs) * 20));
  const walkinScore = Math.min(20, Math.round((walks / targets.walks) * 20));
  const selScore = Math.min(20, Math.round((sels / targets.sels) * 20));
  const jndScore = Math.min(20, Math.round((jnds / targets.jnds) * 20));
  const pct = callsScore + itvScore + walkinScore + selScore + jndScore;

  return {
    rowCount: dayRows.length,
    calls,
    itvs,
    walks,
    sels,
    jnds,
    targets,
    callsScore,
    itvScore,
    walkinScore,
    selScore,
    jndScore,
    pct,
  };
}
