/**
 * Centralized Master Company & Process Payout Configuration
 * Extracted directly from official CEGS client agreements & payout matrices.
 */

export const COMPANY_PAYOUT_CONFIG = {
  '1 Point 1': {
    aliases: ['1 point 1', 'one point one', '1point1', 'one point one solutions ltd', 'onepointone'],
    payoutDays: 60,
    invoiceRaiseSchedule: 'Every month within 5th',
    clearanceTimeline: 'Within 30 days from date of invoice',
    defaultRate: 3000,
    processes: [
      { name: 'Razorpay', rate: 5000 },
      { name: 'TATA Premium', rate: 7000 },
      { name: 'TATA Standard', rate: 7000 },
      { name: 'ICICI', rate: 3000 },
      { name: 'SBI', rate: 3000 },
      { name: "JFL(domino's)", rate: 3000 },
      { name: 'Ujjivan finance', rate: 3000 },
      { name: 'Xiaomi - Hotline', rate: 3000 },
      { name: 'Edelweiss', rate: 3000 },
      { name: 'DRA', rate: 3000 },
      { name: 'DMI', rate: 3000 },
      { name: 'Chola', rate: 3000 },
      { name: 'VRL', rate: 3000 },
      { name: 'TMB PROCESS', rate: 3000 },
      { name: 'Collection Process', rate: 3000 },
      { name: 'Lateral', rate: 0, note: '7.33% below mgr & 8.33% above mgr' },
    ],
  },
  'Five S Digital': {
    aliases: ['five s digital', 'fives digital', 'five splash', 'fivesplash', 'five splash infotech pvt. ltd- bangalore', 'fives'],
    payoutDays: 60,
    invoiceRaiseSchedule: 'Post completion of 60 days',
    clearanceTimeline: 'Within 30 days from date of invoice',
    defaultRate: 5000,
    processes: [
      { name: 'Eureka Forbes Ltd', rate: 5000 },
      { name: 'CoinDCX', rate: 5000 },
      { name: 'Real Estate', rate: 5000 },
      { name: 'TVS', rate: 5000 },
      { name: 'JFL', rate: 5000 },
    ],
  },
  'iSON': {
    aliases: ['ison', 'ison xperiences', 'ison xperiences india private limited'],
    payoutDays: 60,
    invoiceRaiseSchedule: 'Every month within 10th',
    clearanceTimeline: 'Within 30 days from date of invoice',
    defaultRate: 5000,
    processes: [
      { name: 'Etisalat', rate: 7000 },
      { name: '101', rate: 5000 },
      { name: 'CNR', rate: 5000 },
      { name: 'I-CAD', rate: 5000 },
      { name: 'E-Money', rate: 5000 },
      { name: 'Universal', rate: 5000 },
      { name: 'SMB', rate: 5000 },
      { name: 'Flipkart', rate: 5000 },
    ],
  },
  'Altruist GBPalya': {
    aliases: ['altruist gbpalya', 'altruist gb', 'altruist garvebhavi', 'altruist begur', 'altruist gb palya'],
    payoutDays: 90,
    invoiceRaiseSchedule: 'Every month within 10th',
    clearanceTimeline: 'Within 10th clears before month end; after 10th clears next month 10th',
    defaultRate: 4000,
    processes: [
      { name: 'AirTel Black', rate: 12000 },
      { name: 'BB Gold', rate: 10000 },
      { name: 'Mobility', rate: 10000 },
      { name: 'Platinum', rate: 10000 },
      { name: 'MLob', rate: 10000 },
      { name: 'DTH', rate: 4500 },
      { name: '121', rate: 4500 },
      { name: 'WCC', rate: 4000 },
      { name: 'Airtel prepaid KK', rate: 4000 },
      { name: 'TN Postpaid', rate: 4000 },
      { name: 'OB Collection', rate: 4000 },
      { name: 'IPRu', rate: 3000 },
      { name: 'ICICI', rate: 3000 },
    ],
  },
  'Altruist AKR': {
    aliases: ['altruist akr', 'altruist technologies', 'altruist technologies pvt. ltd.', 'altruist tech', 'altruist kudlu'],
    payoutDays: 90,
    invoiceRaiseSchedule: 'Every month within 10th',
    clearanceTimeline: 'Within 10th clears before month end; after 10th clears next month 10th',
    defaultRate: 4500,
    processes: [
      { name: 'Titan', rate: 10000 },
      { name: 'Toyota', rate: 5000 },
      { name: 'Leap Finance', rate: 5000 },
      { name: 'RM-Leap Finance', rate: 5000 },
      { name: 'Amazon', rate: 5000 },
      { name: 'Switch Mobility', rate: 5000 },
      { name: 'IBL', rate: 4500 },
      { name: 'Ezetap', rate: 4500 },
      { name: 'BOB(Bank of Baroda)', rate: 4500 },
      { name: 'TBSS', rate: 4500 },
      { name: 'Indus Bank', rate: 3000 },
    ],
  },
  'iLeads': {
    aliases: ['ileads', 'i leads', 'ileads.one'],
    payoutDays: 60,
    invoiceRaiseSchedule: 'Post completion of 60 days',
    clearanceTimeline: 'Within 15-20 days from date of invoice',
    defaultRate: 5000,
    processes: [
      { name: 'ACKO', rate: 7000 },
      { name: 'Ujivan', rate: 5000 },
      { name: 'Customer Support', rate: 5000 },
    ],
  },
  'EOS Globe': {
    aliases: ['eos globe', 'eos', 'eos chennai'],
    payoutDays: 45,
    invoiceRaiseSchedule: 'Post certification, date shared over email',
    clearanceTimeline: 'Within 15-20 days from date of invoice',
    defaultRate: 5000,
    processes: [
      { name: 'SHI Malayalam', rate: 5000 },
      { name: 'SHI Kannada', rate: 5000 },
      { name: 'CRM', rate: 5000 },
    ],
  },
  'Radical Minds': {
    aliases: ['radical minds', 'radicalminds', 'radical minds technologies pvt ltd', 'radical'],
    payoutDays: 60,
    invoiceRaiseSchedule: '15th and 30th every month',
    clearanceTimeline: '15 - 20 days from date of invoice',
    defaultRate: 4000,
    processes: [
      { name: 'CoinDCX', rate: 6000 },
      { name: 'Traya', rate: 6000 },
      { name: 'Lupin', rate: 4000 },
      { name: 'Ixigo', rate: 4000 },
      { name: 'Buddy Loan', rate: 4000 },
      { name: 'Lemonn', rate: 4000 },
      { name: 'Aliaxis', rate: 4000 },
      { name: 'Snapbit', rate: 4000 },
      { name: 'Olivia', rate: 4000 },
      { name: 'Pureit', rate: 4000 },
      { name: 'Silo Fortune', rate: 4000 },
      { name: 'Petromin', rate: 4000 },
    ],
  },
  'ECHOE': {
    aliases: ['echoe', 'echo'],
    payoutDays: 45,
    invoiceRaiseSchedule: 'Post 45 days',
    clearanceTimeline: 'Within 15-20 days',
    defaultRate: 2500,
    processes: [
      { name: 'Tele Sales', rate: 2500 },
      { name: 'Customer Support', rate: 2500 },
    ],
  },
  'Globiva': {
    aliases: ['globiva', 'globiva services'],
    payoutDays: 60,
    invoiceRaiseSchedule: 'On or before 10th every month',
    clearanceTimeline: 'Within 15 days from date of invoice',
    defaultRate: 8000,
    processes: [
      { name: 'Cred Semi Voice', rate: 8000, note: '1-5: 8k, 6-14: 10k, 15+: 12k' },
      { name: 'Flipkart Telesales/CS', rate: 8000 },
      { name: 'TATA AIA Sales', rate: 8000 },
      { name: 'Social Media / Motor Insurance', rate: 8000 },
    ],
  },
  'Athena': {
    aliases: ['athena', 'athena bpo', 'athenabpo'],
    payoutDays: 45,
    invoiceRaiseSchedule: 'Every month within 5th',
    clearanceTimeline: 'Before month end if raised by 5th, else 1st week next month',
    defaultRate: 4000,
    processes: [
      { name: 'TTK Prestige (Hindi)', rate: 5000 },
      { name: 'TTK Prestige (South Languages)', rate: 3000 },
      { name: 'TCL', rate: 3000 },
      { name: 'LTFS', rate: 3000 },
      { name: 'ABHI', rate: 3000 },
    ],
  },
  'Cogent': {
    aliases: ['cogent'],
    payoutDays: 60,
    invoiceRaiseSchedule: 'Every month within 10th',
    clearanceTimeline: 'Within 30 days',
    defaultRate: 5000,
    processes: [
      { name: 'Insurance Process', rate: 5000 },
      { name: 'Customer Support', rate: 5000 },
    ],
  },
  'Quampentence': {
    aliases: ['quampentence', 'quampetance'],
    payoutDays: 60,
    invoiceRaiseSchedule: 'Every month within 10th',
    clearanceTimeline: 'Within 30 days',
    defaultRate: 5000,
    processes: [
      { name: 'Customer Support', rate: 5000 },
      { name: 'Operations', rate: 5000 },
    ],
  },
  'Ebixcash': {
    aliases: ['ebixcash', 'ebix'],
    payoutDays: 60,
    invoiceRaiseSchedule: 'Every month within 10th',
    clearanceTimeline: '15 - 20 days from date of invoice',
    defaultRate: 5000,
    processes: [
      { name: 'Customer Support', rate: 5000 },
      { name: 'Collections', rate: 5000 },
    ],
  },
  'Startek': {
    aliases: ['startek'],
    payoutDays: 60,
    invoiceRaiseSchedule: 'Every month within 10th',
    clearanceTimeline: 'Within 30 days',
    defaultRate: 5000,
    processes: [
      { name: 'Customer Experience', rate: 5000 },
      { name: 'Voice Process', rate: 5000 },
    ],
  },
  'Silaris': {
    aliases: ['silaris'],
    payoutDays: 45,
    invoiceRaiseSchedule: 'Post 45 days',
    clearanceTimeline: 'Within 20 days',
    defaultRate: 3500,
    processes: [
      { name: 'Tele Sales', rate: 3500 },
    ],
  },
};

/**
 * Canonical aliases for real-world typos / shorthand process labels seen in HRMS sheets.
 */
const PROCESS_TYPO_ALIASES = {
  estilata: 'etisalat',
  icic: 'icici',
  ujivan: 'ujjivan',
  ujjavan: 'ujjivan',
  lemon: 'lemonn',
  snabbit: 'snapbit',
  'airtel black': 'airtel black',
  'customer support role': 'customer support',
  'traya process': 'traya',
};

function normalizeProcessToken(rawProcess) {
  const cleaned = String(rawProcess || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return PROCESS_TYPO_ALIASES[cleaned] || cleaned;
}

function findMatchingProcess(processes = [], pLower) {
  if (!pLower || !Array.isArray(processes) || processes.length === 0) return null;
  // 1. Exact match (or exact alias match)
  const exact = processes.find((p) => p.name.toLowerCase() === pLower);
  if (exact) return exact;
  // 2. Substring match (skip ultra-short numeric codes like '101' unless exact word)
  return (
    processes.find((p) => {
      const itemLower = p.name.toLowerCase();
      if (/^\d+$/.test(itemLower)) {
        return new RegExp(`\\b${itemLower}\\b`).test(pLower);
      }
      return pLower.includes(itemLower) || itemLower.includes(pLower);
    }) || null
  );
}

/**
 * Find canonical company configuration by raw company name or string
 */
export function getCompanyConfig(rawCompany) {
  if (!rawCompany) return null;
  const lower = String(rawCompany).trim().toLowerCase();

  for (const [name, cfg] of Object.entries(COMPANY_PAYOUT_CONFIG)) {
    if (name.toLowerCase() === lower) return { canonicalName: name, ...cfg };
    if (cfg.aliases && cfg.aliases.some((a) => lower.includes(a) || a.includes(lower))) {
      return { canonicalName: name, ...cfg };
    }
  }

  // Fallback heuristic
  if (lower.includes('altruist') || lower.includes('altrust')) {
    if (lower.includes('gb') || lower.includes('garvebhavi') || lower.includes('begur') || lower.includes('amr')) {
      return { canonicalName: 'Altruist GBPalya', ...COMPANY_PAYOUT_CONFIG['Altruist GBPalya'] };
    }
    return { canonicalName: 'Altruist AKR', ...COMPANY_PAYOUT_CONFIG['Altruist AKR'] };
  }
  if (lower.includes('ison')) return { canonicalName: 'iSON', ...COMPANY_PAYOUT_CONFIG['iSON'] };
  if (lower.includes('five') || lower.includes('splash')) return { canonicalName: 'Five S Digital', ...COMPANY_PAYOUT_CONFIG['Five S Digital'] };
  if (lower.includes('point') || lower.includes('1p1')) return { canonicalName: '1 Point 1', ...COMPANY_PAYOUT_CONFIG['1 Point 1'] };
  if (lower.includes('radical')) return { canonicalName: 'Radical Minds', ...COMPANY_PAYOUT_CONFIG['Radical Minds'] };
  if (lower.includes('ilead')) return { canonicalName: 'iLeads', ...COMPANY_PAYOUT_CONFIG['iLeads'] };
  if (lower.includes('eos')) return { canonicalName: 'EOS Globe', ...COMPANY_PAYOUT_CONFIG['EOS Globe'] };
  if (lower.includes('globiva')) return { canonicalName: 'Globiva', ...COMPANY_PAYOUT_CONFIG['Globiva'] };
  if (lower.includes('athena')) return { canonicalName: 'Athena', ...COMPANY_PAYOUT_CONFIG['Athena'] };
  if (lower.includes('startek')) return { canonicalName: 'Startek', ...COMPANY_PAYOUT_CONFIG['Startek'] };

  return null;
}

/**
 * Returns payout days (45, 60, or 90) for a given company name.
 * Defaults to 60 days if unknown.
 */
export function getCompanyPayoutDays(rawCompany) {
  const cfg = getCompanyConfig(rawCompany);
  return cfg?.payoutDays || 60;
}

/**
 * Returns all predefined processes for a company
 */
export function getCompanyProcesses(rawCompany) {
  const cfg = getCompanyConfig(rawCompany);
  return cfg?.processes || [];
}

/**
 * Detailed lookup returning canonical company, matched process name, rate (INR), and whether a process matched.
 * For generic 'ALTRUIST' without branch qualifier, checks both Altruist AKR and Altruist GBPalya processes.
 */
export function resolveJoinerPayoutInfo(rawCompany, rawProcess) {
  if (!rawCompany && !rawProcess) {
    return { rate: 5000, canonicalCompany: 'Other', matchedProcess: '', isExactMatch: false };
  }
  const cLower = String(rawCompany || '').trim().toLowerCase();
  const pNorm = normalizeProcessToken(rawProcess);

  const isGenericAltruist =
    (cLower.includes('altruist') || cLower.includes('altrust')) &&
    !cLower.includes('akr') &&
    !cLower.includes('kudlu') &&
    !cLower.includes('gb') &&
    !cLower.includes('garvebhavi') &&
    !cLower.includes('begur');

  if (isGenericAltruist && pNorm) {
    for (const branch of ['Altruist GBPalya', 'Altruist AKR']) {
      const bCfg = COMPANY_PAYOUT_CONFIG[branch];
      const hit = findMatchingProcess(bCfg.processes, pNorm);
      if (hit && hit.rate !== undefined) {
        return {
          rate: hit.rate,
          canonicalCompany: branch,
          matchedProcess: hit.name,
          isExactMatch: true,
        };
      }
    }
  }

  const cfg = getCompanyConfig(rawCompany);
  if (!cfg) {
    return {
      rate: 5000,
      canonicalCompany: String(rawCompany || 'Other').trim().toUpperCase() || 'Other',
      matchedProcess: String(rawProcess || '').trim(),
      isExactMatch: false,
    };
  }

  if (!pNorm) {
    return {
      rate: cfg.defaultRate || 5000,
      canonicalCompany: cfg.canonicalName,
      matchedProcess: '',
      isExactMatch: false,
    };
  }

  const matched = findMatchingProcess(cfg.processes, pNorm);
  if (matched && matched.rate !== undefined) {
    return {
      rate: matched.rate,
      canonicalCompany: cfg.canonicalName,
      matchedProcess: matched.name,
      isExactMatch: true,
    };
  }

  return {
    rate: cfg.defaultRate || 5000,
    canonicalCompany: cfg.canonicalName,
    matchedProcess: String(rawProcess || '').trim(),
    isExactMatch: false,
  };
}

/**
 * Look up the exact payout amount for a company and process.
 * If not specifically listed, returns company default rate or 5000.
 */
export function getProcessPayoutAmount(rawCompany, rawProcess) {
  return resolveJoinerPayoutInfo(rawCompany, rawProcess).rate;
}
