import { normalizeCandidateDate, todayIsoDate } from '@/lib/candidate-dates';
import { getCompanyPayoutDays } from '@/lib/company-process-payouts';

const LEFT_NOTE = /left|resign|abscond|inactive|drop/i;

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

/** Eligible for a to-raise row: joined required days ago (per company agreement) and still active in company. */
export function joinerBillEligible(joiner, today = todayIsoDate()) {
  const join = normalizeCandidateDate(joiner?.dateOfJoining);
  if (!join) return null;
  if (joinerLeftEarly(joiner)) return null;
  const company = joiner?.company || joiner?.process || '';
  const days = getCompanyPayoutDays(company) || 60;
  const due = addIsoDays(join, days);
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

export function parseInvoiceSortNumber(str) {
  if (!str) return -1;
  const s = String(str).trim();
  if (/^INV-20\d\d-/i.test(s)) {
    const digits = s.match(/\d+/g);
    return digits && digits.length > 1 ? parseInt(digits[digits.length - 1], 10) : 0;
  }
  const m = s.match(/INV-?0*(\d+)/i);
  if (m) {
    return parseInt(m[1], 10);
  }
  const anyM = s.match(/\d+/g);
  return anyM ? parseInt(anyM[anyM.length - 1], 10) : 0;
}

export function sortInvoicesDescending(items) {
  if (!Array.isArray(items)) return [];
  return [...items].sort((a, b) => {
    const numA = parseInvoiceSortNumber(a?.invoiceNo);
    const numB = parseInvoiceSortNumber(b?.invoiceNo);
    if (numA !== numB) {
      return numB - numA; // 263, 262, 261, 260...
    }
    const sA = String(a?.invoiceNo || '');
    const sB = String(b?.invoiceNo || '');
    if (sA !== sB) {
      return sB.localeCompare(sA, undefined, { numeric: true });
    }
    const tA = new Date(a?.createdAt || a?.invoiceDate || 0).getTime();
    const tB = new Date(b?.createdAt || b?.invoiceDate || 0).getTime();
    return tB - tA;
  });
}

