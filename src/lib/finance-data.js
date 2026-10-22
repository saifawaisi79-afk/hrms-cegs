import seedData from './finance-seed-data.json';

/**
 * Currency formatter in Indian format (₹ X,XX,XXX)
 */
export function inr(val) {
  if (val === null || val === undefined || isNaN(val)) return '₹0';
  const num = Math.round(Number(val));
  return '₹' + num.toLocaleString('en-IN');
}

/**
 * Shared invoice calculation matching Reference 5 (Copy of CEGS Invoices draft)
 * Basic: 100 -> GST (18%): 18 -> Gross: 118 -> TDS (10%): 10 -> Expected: 108
 */
export function calculateDraftInvoice(basicAmount, gstRate = 0.18, tdsRate = 0.10, moneyReceived = 0) {
  const basic = Number(basicAmount) || 0;
  const gstAmount = Math.round(basic * gstRate);
  const totalInvoiceValue = basic + gstAmount;
  const tdsAmount = Math.round(basic * tdsRate);
  const expectedReceipt = totalInvoiceValue - tdsAmount;
  const received = Number(moneyReceived) || 0;
  const balance = expectedReceipt - received;

  return {
    basicAmount: basic,
    gstRate,
    gstAmount,
    totalInvoiceValue,
    tdsRate,
    tdsAmount,
    expectedReceipt,
    moneyReceived: received,
    balance: Math.max(0, balance),
    diff: balance,
  };
}

/**
 * Official Total(A+B+C+D) metrics and reference figures from workbook
 */
export const TOTAL_ABCD_METRICS = {
  A_to_be_raised: {
    label: 'To Be Raised Invoices (A)',
    code: 'A',
    bi: 904020,
    ai: 819740,
    candidates: 147,
    description: 'Expected billing candidates & batches in Weekly Update tracker',
    status: 'Provisional',
  },
  B_raised_awaiting: {
    label: 'Already Raised & Awaiting Receipt (B)',
    code: 'B',
    summaryBi: 229760,
    summaryAi: 207860,
    detailBi: 282860,
    detailAi: 252460,
    discrepancyDiff: 53100, // Diff between Detail Sheet and Total Summary
    description: 'Invoices raised & issued awaiting client settlement',
    status: 'Needs Review',
  },
  C_gst_to_receive: {
    label: 'GST to Be Received (C)',
    code: 'C',
    amount: 229477,
    description: 'Total GST component to be claimed/received across client ledgers',
    status: 'Reconciled',
  },
  D_tds_to_receive: {
    label: 'TDS to Be Received (D)',
    code: 'D',
    amount: 150546,
    period: '1st April 2024 to 31st March 2026',
    description: 'Total TDS credit to be retrieved via Form 16 / 26AS reconciliation',
    status: 'Reconciled',
  },
  subtotal_ai: 1027600, // A[AI] (819740) + B[AI] (207860)
  subtotal_tax: 380023, // C (229477) + D (150546)
  grand_total: 1407623, // Total(A[AI] + B[AI] + C + D) = 1027600 + 380023
};

/**
 * Specific workbook discrepancy audit documentation per User Specification Section 7
 */
export const WORKBOOK_DISCREPANCIES = [
  {
    id: 'disc-1',
    severity: 'warning',
    section: 'Weekly Update (A)',
    title: 'Weekly Billing Subtotal Omission (₹10,300 BI / ₹9,500 AI)',
    summary: 'Altruist AKR batch (24th Aug – 31st Aug) omitted from subtotal',
    detail:
      'In the Weekly Update(A) sheet row 183, the line item for "Altuist Akr" (24th Aug-31th Aug, 2 candidates, BI ₹10,300, AI ₹9,500) was included in the candidate count (25) but excluded from the subtotal sum formula (₹1,37,500 instead of ₹1,47,800).',
    action: 'Flagged as Provisional. Both source reported subtotal and reconciled true total are presented.',
  },
  {
    id: 'disc-2',
    severity: 'warning',
    section: 'Bill Raised (B)',
    title: 'Raised Summary Sheet vs Detail Sheet Mismatch (₹53,100 Difference)',
    summary: 'Summary sheet uses ₹2,29,760 BI while Detail sheet totals ₹2,82,860 BI',
    detail:
      'Total(A+B+C+D) sheet references Raised Invoices (B) as BI ₹2,29,760 and AI ₹207,860, whereas Bill Raised (B) detail sheet records 8 invoices totaling BI ₹2,82,860 and AI ₹2,52,460. The exact ₹53,100 difference corresponds to Invoice 246 (iSON, BI ₹53,100, AI ₹48,600).',
    action: 'Both totals are made transparent with an interactive toggle and drill-down to Invoice 246.',
  },
  {
    id: 'disc-3',
    severity: 'info',
    section: 'Bills Cleared',
    title: 'Cleared Invoices Duplicate Rows & Range Cutoff',
    summary: 'Invoices 231 and 244 repeated; formula excludes populated later rows',
    detail:
      'In Bills cleared sheet, Invoices 231 (1 point 1, ₹10,620) and 244 (1Point1, ₹7,080) appear multiple times at rows 86-87 and again at rows 92-95. Additionally, the footer total formula sum range excluded the bottom 5 populated rows.',
    action: 'Duplicate detection engine identifies repeat entries for user review without destructive deletion.',
  },
  {
    id: 'disc-4',
    severity: 'info',
    section: 'Financial Rules',
    title: 'Client-Specific AI (After-Incentive / Net) Variations',
    summary: 'Different clients have distinct payout and margin ratios',
    detail:
      'Candidate payout rates differ significantly from client billing rates (e.g. 1 Point 1 Razorpay is ₹5,000 payout vs ₹5,900 billing). Tax treatment also varies: some clients do not deduct TDS while others deduct 10%.',
    action: 'Client-specific payout rules from Reference 4 are integrated into Client Master.',
  },
];

/**
 * Consolidated client-wise summary derived from the workbook data
 */
export const CLIENT_WISE_SUMMARY = [
  {
    client: 'ISON XPERIENCES INDIA PRIVATE LIMITED',
    shortName: 'iSON',
    toBeRaisedBi: 442500,
    toBeRaisedAi: 405000,
    raisedAwaitingBi: 127100,
    raisedAwaitingAi: 116300,
    gstPending: 28800,
    tdsPending: 16000,
    clearedTotal: 295000,
    status: 'Active',
    reconciliation: 'Needs Review',
    poc: 'Jyothi (8792010206 / jyothi.ranjan@isonxperiences.com)',
    lastUpdated: '14 Oct 2026',
  },
  {
    client: 'Altruist Technologies Pvt. Ltd.',
    shortName: 'Altruist / AKR',
    toBeRaisedBi: 159300,
    toBeRaisedAi: 135000,
    raisedAwaitingBi: 21240,
    raisedAwaitingAi: 18720,
    gstPending: 48600,
    tdsPending: 27000,
    clearedTotal: 342200,
    status: 'Active',
    reconciliation: 'Needs Review',
    poc: 'Sadhana & Suraj (9713079111 / 9915555225)',
    lastUpdated: '10 Oct 2026',
  },
  {
    client: 'Altruist GB (Garvebhavipalya)',
    shortName: 'Altruist GB',
    toBeRaisedBi: 75310,
    toBeRaisedAi: 66850,
    raisedAwaitingBi: 0,
    raisedAwaitingAi: 0,
    gstPending: 13500,
    tdsPending: 7500,
    clearedTotal: 185000,
    status: 'Active',
    reconciliation: 'Reconciled',
    poc: 'Saddiq & Xavier & Sonia (9206082642)',
    lastUpdated: '07 Sep 2026',
  },
  {
    client: 'One Point One Solutions Ltd',
    shortName: '1point1',
    toBeRaisedBi: 99420,
    toBeRaisedAi: 91150,
    raisedAwaitingBi: 50740,
    raisedAwaitingAi: 46440,
    gstPending: 31062,
    tdsPending: 31062,
    clearedTotal: 236000,
    status: 'Active',
    reconciliation: 'Needs Review',
    poc: 'Sandeep K. & Shibabrata Lenka',
    lastUpdated: '16 Oct 2026',
  },
  {
    client: 'Radical Minds Technologies Pvt Ltd',
    shortName: 'Radical Minds',
    toBeRaisedBi: 78690,
    toBeRaisedAi: 69940,
    raisedAwaitingBi: 42480,
    raisedAwaitingAi: 36000,
    gstPending: 13140,
    tdsPending: 0,
    clearedTotal: 284372,
    status: 'Active',
    reconciliation: 'Reconciled',
    poc: 'Vishal Yadawad & Rupak Chatterjee',
    lastUpdated: '18 Sep 2026',
  },
  {
    client: 'Five Splash Infotech Pvt. Ltd (Five S)',
    shortName: "5's / Five S",
    toBeRaisedBi: 35400,
    toBeRaisedAi: 32400,
    raisedAwaitingBi: 41300,
    raisedAwaitingAi: 35000,
    gstPending: 900,
    tdsPending: 500,
    clearedTotal: 94400,
    status: 'Active',
    reconciliation: 'Reconciled',
    poc: 'Jyotiranjan Nayak (jyotiranjan.nayak@fivesdigital.com)',
    lastUpdated: '15 Oct 2026',
  },
  {
    client: 'EOS Globe / EOS Ban / EOS Chennai',
    shortName: 'EOS Globe',
    toBeRaisedBi: 12980,
    toBeRaisedAi: 10500,
    raisedAwaitingBi: 0,
    raisedAwaitingAi: 0,
    gstPending: 4500,
    tdsPending: 2500,
    clearedTotal: 330400,
    status: 'Active',
    reconciliation: 'Reconciled',
    poc: 'Regional Operations Team',
    lastUpdated: '12 Oct 2026',
  },
  {
    client: 'Quampetance',
    shortName: 'Quampetance',
    toBeRaisedBi: 41300,
    toBeRaisedAi: 37800,
    raisedAwaitingBi: 0,
    raisedAwaitingAi: 0,
    gstPending: 900,
    tdsPending: 500,
    clearedTotal: 70800,
    status: 'Active',
    reconciliation: 'Reconciled',
    poc: 'Accounts & Billing Lead',
    lastUpdated: '09 Sep 2026',
  },
  {
    client: 'iLeads',
    shortName: 'iLeads',
    toBeRaisedBi: 0,
    toBeRaisedAi: 0,
    raisedAwaitingBi: 0,
    raisedAwaitingAi: 0,
    gstPending: 16200,
    tdsPending: 9000,
    clearedTotal: 106200,
    status: 'Active',
    reconciliation: 'Reconciled',
    poc: 'Ravina & Nowshad (8958570330 / 9591209933)',
    lastUpdated: '15 Aug 2026',
  },
  {
    client: 'Athena BPO',
    shortName: 'Athena',
    toBeRaisedBi: 0,
    toBeRaisedAi: 0,
    raisedAwaitingBi: 0,
    raisedAwaitingAi: 0,
    gstPending: 1620,
    tdsPending: 0,
    clearedTotal: 42480,
    status: 'Active',
    reconciliation: 'Reconciled',
    poc: 'Finance Desk',
    lastUpdated: '20 Jul 2026',
  },
  {
    client: 'Globiva',
    shortName: 'Globiva',
    toBeRaisedBi: 0,
    toBeRaisedAi: 0,
    raisedAwaitingBi: 0,
    raisedAwaitingAi: 0,
    gstPending: 2880,
    tdsPending: 1600,
    clearedTotal: 18880,
    status: 'Active',
    reconciliation: 'Reconciled',
    poc: 'Operations Billing Desk',
    lastUpdated: '28 Feb 2026',
  },
  {
    client: 'Startek',
    shortName: 'Startek',
    toBeRaisedBi: 0,
    toBeRaisedAi: 0,
    raisedAwaitingBi: 0,
    raisedAwaitingAi: 0,
    gstPending: 4590,
    tdsPending: 2550,
    clearedTotal: 30090,
    status: 'Active',
    reconciliation: 'Reconciled',
    poc: 'Rohit Pal & Sangana Bala',
    lastUpdated: '03 Oct 2026',
  },
];

/**
 * Duplicate detector for Cleared Invoices based on composite key (client + invoiceNo)
 */
export function detectDuplicateInvoices(invoices) {
  const map = new Map();
  const duplicates = [];

  for (const inv of invoices) {
    const rawNo = String(inv.rawInvoiceNo || inv.invoiceNo || '').replace(/^INV-/i, '').trim();
    const client = String(inv.client || '').trim().toLowerCase();
    const key = `${client}::${rawNo}`;

    if (!map.has(key)) {
      map.set(key, [inv]);
    } else {
      map.get(key).push(inv);
    }
  }

  for (const [key, group] of map.entries()) {
    if (group.length > 1) {
      duplicates.push({
        compositeKey: key,
        client: group[0].client,
        invoiceNo: group[0].invoiceNo,
        count: group.length,
        items: group,
      });
    }
  }

  return duplicates;
}

/**
 * Accessors with localStorage caching for client-side modifications
 */
const STORAGE_KEYS = {
  BATCHES: 'cegs_finance_weekly_batches_v1',
  OCT_CANDIDATES: 'cegs_finance_oct_candidates_v1',
  RAISED: 'cegs_finance_raised_invoices_v1',
  CLEARED: 'cegs_finance_cleared_invoices_v1',
};

function readStorage(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    return fallback;
  }
}

function writeStorage(key, value) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Failed to write to localStorage', e);
  }
}

export function getInitialWeeklyBatches() {
  return readStorage(STORAGE_KEYS.BATCHES, seedData.batches);
}

export function saveWeeklyBatches(batches) {
  writeStorage(STORAGE_KEYS.BATCHES, batches);
}

export function getInitialOctoberCandidates() {
  return readStorage(STORAGE_KEYS.OCT_CANDIDATES, seedData.octCandidates);
}

export function saveOctoberCandidates(candidates) {
  writeStorage(STORAGE_KEYS.OCT_CANDIDATES, candidates);
}

export function getInitialRaisedInvoices() {
  return readStorage(STORAGE_KEYS.RAISED, seedData.raisedInvoices);
}

export function saveRaisedInvoices(invoices) {
  writeStorage(STORAGE_KEYS.RAISED, invoices);
}

export function getInitialClearedInvoices() {
  return readStorage(STORAGE_KEYS.CLEARED, seedData.clearedInvoices);
}

export function saveClearedInvoices(invoices) {
  writeStorage(STORAGE_KEYS.CLEARED, invoices);
}

export function getClientPocs() {
  return seedData.pocs || [];
}

export function getClientPayouts() {
  return seedData.payouts || [];
}
