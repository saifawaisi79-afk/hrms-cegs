import { normalizeCandidateDate, todayIsoDate } from '@/lib/candidate-dates';

const LEFT_NOTE = /left|resign|abscond/i;

export function addIsoDays(iso, days) {
  const [y, m, d] = iso.split('-').map((n) => parseInt(n, 10));
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function joinerLeftEarly(joiner) {
  const notes = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => joiner?.[`week${n}`] || '').join(' ');
  return LEFT_NOTE.test(notes);
}

/** Eligible for a to-raise row: joined at least 56 days ago and still in the company. */
export function joinerBillEligible(joiner, today = todayIsoDate()) {
  const join = normalizeCandidateDate(joiner?.dateOfJoining);
  if (!join) return null;
  if (joinerLeftEarly(joiner)) return null;
  const due = addIsoDays(join, 56);
  if (due > today) return null;
  const billing = normalizeCandidateDate(joiner?.billingDate) || due;
  return {
    joiningDate: join,
    billingDate: billing,
    monthKey: billing.slice(0, 7),
  };
}

export function gstBreakdown(basicAmount, moneyReceived) {
  const basic = Number(basicAmount) || 0;
  const received = Number(moneyReceived) || 0;
  const gstAmount = Math.round(basic * 0.18);
  const totalInvoice = basic + gstAmount;
  const tdsAmount = Math.round(basic * 0.1);
  const needToReceive = basic - tdsAmount;
  const diff = needToReceive - received;
  return { gstAmount, totalInvoice, tdsAmount, needToReceive, diff };
}
