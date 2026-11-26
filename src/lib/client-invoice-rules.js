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

export function dedupeByInvoiceNo(list = []) {
  const map = new Map();
  (list || []).forEach((inv) => {
    const rawNo = String(inv?.invoiceNo || '').trim();
    if (!rawNo) return;
    const key = rawNo.toUpperCase();
    const existing = map.get(key);
    if (!existing) {
      map.set(key, inv);
      return;
    }
    // Keep canonical record: Paid wins over Pending, populated items over summary, higher amount over zero
    const existingItems = Array.isArray(existing.items) ? existing.items.length : 0;
    const nextItems = Array.isArray(inv.items) ? inv.items.length : 0;
    const existingPaid = String(existing.status || '').toLowerCase() === 'paid' ? 1 : 0;
    const nextPaid = String(inv.status || '').toLowerCase() === 'paid' ? 1 : 0;
    const existingAmt = Number(existing.amount || existing.basicAmount || 0);
    const nextAmt = Number(inv.amount || inv.basicAmount || 0);
    if (
      nextPaid > existingPaid ||
      (nextPaid === existingPaid && nextItems > existingItems) ||
      (nextPaid === existingPaid && nextItems === existingItems && nextAmt > existingAmt)
    ) {
      map.set(key, inv);
    }
  });
  return sortInvoicesDescending(Array.from(map.values()));
}

export function normalizeApiInvoiceRow(apiInv) {
  const invNo = String(apiInv?.invoiceNo || '').trim();
  const rawAmt = Number(apiInv?.amount) || 0;
  const bAmt = Number(apiInv?.basicAmount) || (rawAmt ? Math.round(rawAmt / 1.18) : 0);
  const gAmt =
    apiInv?.sgstAmount != null && apiInv?.cgstAmount != null
      ? Number(apiInv.sgstAmount) + Number(apiInv.cgstAmount)
      : apiInv?.gstAmount != null
      ? Number(apiInv.gstAmount)
      : rawAmt > bAmt && bAmt > 0
      ? rawAmt - bAmt
      : Math.round(bAmt * 0.18);
  const tAmt = rawAmt || bAmt + gAmt;
  const sgstAmt = apiInv?.sgstAmount != null ? Number(apiInv.sgstAmount) : Math.round(gAmt / 2);
  const cgstAmt = apiInv?.cgstAmount != null ? Number(apiInv.cgstAmount) : gAmt - sgstAmt;
  const tdsAmt = Number(apiInv?.tdsAmount) > 0 ? Number(apiInv.tdsAmount) : 0;
  const expected = Math.max(0, tAmt - tdsAmt);
  const isPaid =
    String(apiInv?.status || '').toLowerCase() === 'paid' ||
    String(apiInv?.stage || '').toLowerCase() === 'cleared';
  const actual = isPaid
    ? Number(apiInv?.actualReceipt) || Number(apiInv?.moneyReceived) || expected
    : Number(apiInv?.actualReceipt) || Number(apiInv?.moneyReceived) || 0;
  const outstanding = isPaid ? 0 : Math.max(0, expected - actual);

  const milestoneText = `${apiInv?.projectMilestone || ''} ${apiInv?.notes || ''}`;
  const seatMatch = milestoneText.match(/(\d+)\s*(Seats|Seat|candidates|candidate)/i);
  let cCount = 1;
  if (Number(apiInv?.candidateCount) > 0) {
    cCount = Number(apiInv.candidateCount);
  } else if (seatMatch) {
    cCount = parseInt(seatMatch[1], 10);
  } else if (Array.isArray(apiInv?.items) && apiInv.items.length > 0) {
    cCount = apiInv.items.length;
  }

  const dateStr = apiInv?.invoiceDate
    ? String(apiInv.invoiceDate)
    : apiInv?.createdAt
    ? new Date(apiInv.createdAt).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  return {
    ...(apiInv || {}),
    id: apiInv?._id || apiInv?.id || `inv-${invNo}`,
    _id: apiInv?._id || apiInv?.id || `inv-${invNo}`,
    rawInvoice: apiInv,
    invoiceNo: invNo,
    rawInvoiceNo: invNo.replace(/^INV-/i, ''),
    client: apiInv?.client || 'Client',
    projectMilestone: apiInv?.projectMilestone || 'Candidate Placement & Seat Billing',
    candidateCount: cCount,
    invoiceDate: dateStr,
    clearedDate: apiInv?.paidDate || dateStr,
    paidDate: apiInv?.paidDate || (isPaid ? dateStr : ''),
    revisedRequested: apiInv?.revisedRequested || '',
    revisedSent: apiInv?.revisedSent || '',
    bi: bAmt,
    ai: tAmt,
    amount: tAmt,
    basicAmount: bAmt,
    sgstAmount: sgstAmt,
    cgstAmount: cgstAmt,
    gstAmount: gAmt,
    totalInvoiceValue: tAmt,
    tdsAmount: tdsAmt,
    expectedReceipt: expected,
    actualReceipt: actual,
    amountReceived: actual,
    outstandingBalance: outstanding,
    dueDate: apiInv?.dueDate || '30 days',
    status: isPaid ? 'Paid' : apiInv?.status || 'Pending',
    stage: apiInv?.stage || (isPaid ? 'cleared' : 'raised'),
    gstStatus: apiInv?.gstStatus || (isPaid ? 'Reconciled' : 'Pending'),
    gstAmtStatus: apiInv?.gstAmtStatus || (isPaid ? 'GST Cleared' : 'Pending'),
    paymentReference: apiInv?.paymentReference || (isPaid ? 'BANK-SETTLED' : ''),
    clearedBy: apiInv?.clearedBy || 'Finance Operations',
    remarks: apiInv?.notes || apiInv?.projectMilestone || '',
    notes: apiInv?.notes || '',
    items: Array.isArray(apiInv?.items) ? apiInv.items : [],
    source: 'payments_invoices',
  };
}

export function extractPaymentsInvoicesFromApi(apiList = []) {
  return dedupeByInvoiceNo(
    (apiList || []).filter((inv) => {
      const hasNo = String(inv?.invoiceNo || '').trim() !== '';
      const stage = String(inv?.stage || '').toLowerCase();
      return hasNo && stage !== 'to_raise';
    })
  );
}

export function extractRaisedInvoicesFromApi(apiList = []) {
  return extractPaymentsInvoicesFromApi(apiList)
    .filter((inv) => {
      const stage = String(inv?.stage || '').toLowerCase();
      const status = String(inv?.status || '').toLowerCase();
      return stage !== 'cleared' && status !== 'paid';
    })
    .map(normalizeApiInvoiceRow);
}

export function extractClearedInvoicesFromApi(apiList = []) {
  return extractPaymentsInvoicesFromApi(apiList)
    .filter((inv) => {
      const stage = String(inv?.stage || '').toLowerCase();
      const status = String(inv?.status || '').toLowerCase();
      return stage === 'cleared' || status === 'paid';
    })
    .map(normalizeApiInvoiceRow);
}

