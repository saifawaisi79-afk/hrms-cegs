/**
 * Leave policy:
 * - 24 paid leave days / year = 12 Casual + 12 Sick
 * - Accrue 2 paid days each month; unused days carry forward within the year
 * - Days beyond available paid balance (or type annual cap) are unpaid
 */

export const PAID_LEAVES_PER_MONTH = 2;
export const CASUAL_ANNUAL = 12;
export const SICK_ANNUAL = 12;
export const ANNUAL_TOTAL = CASUAL_ANNUAL + SICK_ANNUAL; // 24

export function countLeaveDays(start, end) {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e < s) return 0;
  return Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

function yearStart(asOf = new Date()) {
  return new Date(asOf.getFullYear(), 0, 1);
}

/** Months from Jan 1 (or join month) through current month, inclusive. */
export function monthsAccruedInYear(asOf = new Date(), joiningDate) {
  const ys = yearStart(asOf);
  let start = ys;
  if (joiningDate) {
    const j = new Date(joiningDate);
    if (!Number.isNaN(j.getTime()) && j > ys) {
      start = new Date(j.getFullYear(), j.getMonth(), 1);
    }
  }
  if (start > asOf) return 0;
  return (asOf.getFullYear() - start.getFullYear()) * 12 + (asOf.getMonth() - start.getMonth()) + 1;
}

function isConsumingStatus(status) {
  return status === 'approved' || status === 'pending';
}

function normalizeType(type) {
  const t = String(type || '').toLowerCase();
  if (t === 'sick' || t === 'vacation' || t === 'medical') return 'sick';
  return 'casual'; // casual | personal | default
}

function totalDaysOf(leave) {
  return Number(leave.totalDays) || countLeaveDays(leave.start, leave.end);
}

function paidDaysOf(leave) {
  const days = totalDaysOf(leave);
  if (leave.payType === 'unpaid') return 0;
  if (leave.payType === 'mixed') return Number(leave.paidDays) || 0;
  if (leave.payType === 'paid') return Number(leave.paidDays) || days;
  return days;
}

function unpaidDaysOf(leave) {
  const days = totalDaysOf(leave);
  if (leave.payType === 'paid') return 0;
  if (leave.payType === 'mixed') {
    return Number(leave.unpaidDays) || Math.max(0, days - paidDaysOf(leave));
  }
  if (leave.payType === 'unpaid') return Number(leave.unpaidDays) || days;
  return 0;
}

/**
 * Year-to-date leave balances for monthly accrual + casual/sick caps.
 */
export function calcLeaveBalance(leaves, userId, asOf = new Date(), joiningDate) {
  const months = monthsAccruedInYear(asOf, joiningDate);
  // Accrue 2/month, never more than annual 24 entitlement
  const accrued = Math.min(months * PAID_LEAVES_PER_MONTH, ANNUAL_TOTAL);
  const y = asOf.getFullYear();
  const yearPrefix = `${y}-`;
  const monthPrefix = `${y}-${String(asOf.getMonth() + 1).padStart(2, '0')}`;

  const mine = (leaves || []).filter(
    (l) => String(l.uid) === String(userId) && String(l.start || '').startsWith(yearPrefix)
  );

  let paidUsed = 0;
  let unpaidUsed = 0;
  let pendingPaid = 0;
  let pendingUnpaid = 0;
  let casualUsed = 0;
  let sickUsed = 0;
  let casualPending = 0;
  let sickPending = 0;

  mine.forEach((l) => {
    if (!isConsumingStatus(l.status)) return;
    const p = paidDaysOf(l);
    const u = unpaidDaysOf(l);
    const days = totalDaysOf(l);
    const kind = normalizeType(l.type);

    if (l.status === 'pending') {
      pendingPaid += p;
      pendingUnpaid += u;
      if (kind === 'sick') sickPending += days;
      else casualPending += days;
    } else {
      paidUsed += p;
      unpaidUsed += u;
      if (kind === 'sick') sickUsed += days;
      else casualUsed += days;
    }
  });

  const reservedPaid = paidUsed + pendingPaid;
  const available = Math.max(0, accrued - reservedPaid);

  const monthsBefore = Math.max(0, months - 1);
  const accruedBefore = Math.min(monthsBefore * PAID_LEAVES_PER_MONTH, ANNUAL_TOTAL);
  let paidBeforeThisMonth = 0;
  mine.forEach((l) => {
    if (!isConsumingStatus(l.status)) return;
    if (String(l.start || '').startsWith(monthPrefix)) return;
    paidBeforeThisMonth += paidDaysOf(l);
  });
  const carryIn = Math.max(0, accruedBefore - paidBeforeThisMonth);
  const thisMonthPool = Math.min(PAID_LEAVES_PER_MONTH + carryIn, ANNUAL_TOTAL - paidBeforeThisMonth);

  const casualRemaining = Math.max(0, CASUAL_ANNUAL - casualUsed - casualPending);
  const sickRemaining = Math.max(0, SICK_ANNUAL - sickUsed - sickPending);

  return {
    paidPerMonth: PAID_LEAVES_PER_MONTH,
    casualAnnual: CASUAL_ANNUAL,
    sickAnnual: SICK_ANNUAL,
    annualTotal: ANNUAL_TOTAL,
    monthsAccrued: months,
    accrued,
    paidUsed,
    unpaidUsed,
    pendingPaid,
    pendingUnpaid,
    available,
    carryIn,
    thisMonthPool,
    casualUsed,
    sickUsed,
    casualPending,
    sickPending,
    casualRemaining,
    sickRemaining,
  };
}

/**
 * Allocate paid vs unpaid for a request of `type` (casual|sick).
 * Respects monthly accrued paid pool AND annual type caps (12/12).
 */
export function allocateLeavePay(days, availablePaid, typeRemaining = Infinity) {
  const total = Math.max(0, Number(days) || 0);
  const typeCap = Math.max(0, Number(typeRemaining));
  const avail = Math.max(0, Number(availablePaid) || 0);

  // Cannot take more than remaining annual entitlement for that type as "typed" leave;
  // anything beyond type remaining is unpaid (and still unpaid vs paid pool).
  const withinType = Math.min(total, typeCap);
  const beyondType = Math.max(0, total - withinType);

  const paidDays = Math.min(withinType, avail);
  const unpaidDays = Math.max(0, withinType - paidDays) + beyondType;

  let payType = 'paid';
  if (unpaidDays > 0 && paidDays > 0) payType = 'mixed';
  else if (unpaidDays > 0) payType = 'unpaid';

  return {
    paidDays,
    unpaidDays,
    payType,
    totalDays: total,
    blockedByTypeCap: beyondType > 0,
    typeRemaining: typeCap,
  };
}

export function typeRemainingFor(balance, type) {
  const kind = String(type || '').toLowerCase() === 'sick' ? 'sick' : 'casual';
  return kind === 'sick' ? balance.sickRemaining : balance.casualRemaining;
}

export function payTypeLabel(leave) {
  if (!leave) return '—';
  if (leave.payType === 'unpaid') return 'Unpaid';
  if (leave.payType === 'mixed') {
    return `Mixed (${leave.paidDays || 0} paid / ${leave.unpaidDays || 0} unpaid)`;
  }
  return 'Paid';
}
