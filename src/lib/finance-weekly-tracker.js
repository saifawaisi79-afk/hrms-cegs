/**
 * Live Weekly Update (A) Billing Readiness Engine
 *
 * Computes real-time Candidate Detail rows and Company x Week Batches
 * directly from HRMS Joiner Sheet (JoinerEntry + joined Candidate records)
 * across ALL months, enriched with company/process payout slabs and raised invoices.
 */

import { formatSheetDateDisplay, normalizeCandidateDate } from '@/lib/candidate-dates';
import { istIsoDate } from '@/lib/ist-time';
import { canonicalRecruiterName } from '@/lib/recruiter-names';
import { addDaysIso, getMonthWeekPeriods, parseMonthKey } from '@/lib/campaign-weeks';
import { isCandidateInactive, isJoinedCandidate, isJoinerEntryInactive } from '@/lib/campaign-joiners';
import { getCompanyPayoutDays, resolveJoinerPayoutInfo } from '@/lib/company-process-payouts';
import { calculateDraftInvoice } from '@/lib/finance-data';

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

function normName(val) {
  return String(val || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function formatShortPeriod(startIso, endIso) {
  const sParts = String(startIso || '').split('-');
  const eParts = String(endIso || '').split('-');
  if (sParts.length !== 3 || eParts.length !== 3) return `${startIso} - ${endIso}`;
  const sD = sParts[2];
  const sM = SHORT_MONTHS[parseInt(sParts[1], 10) - 1] || sParts[1];
  const eD = eParts[2];
  const eM = SHORT_MONTHS[parseInt(eParts[1], 10) - 1] || eParts[1];
  return `${sD} ${sM} - ${eD} ${eM} ${eParts[0]}`;
}

function hasAll8WeeksActive(j) {
  if (!j) return false;
  const w8 = String(j.week8 || '').trim().toLowerCase();
  if (w8.includes('active') || w8.includes('working')) return true;
  return ['week1', 'week2', 'week3', 'week4', 'week5', 'week6', 'week7', 'week8'].every((k) => {
    const v = String(j[k] || '').trim().toLowerCase();
    return v.includes('active') || v.includes('working');
  });
}

function extractFollowupNote(j, c) {
  if (j) {
    const notes = ['week8', 'week7', 'week6', 'week5', 'week4', 'week3', 'week2', 'week1']
      .map((k) => (j[k] ? `${k.replace('week', 'W')}: ${j[k]}` : ''))
      .filter(Boolean);
    if (notes.length > 0) return notes[0];
  }
  return String(c?.response || '').trim();
}

/**
 * Build live Weekly Update (A) data from MongoDB collections.
 */
export function buildLiveWeeklyTracker({
  users = [],
  candidates = [],
  joinerEntries = [],
  invoices = [],
  now = new Date(),
}) {
  const todayIso = istIsoDate(now);

  // Recruiter canonical directory
  const knownRecruiters = (users || [])
    .map((u) => String(u.name || '').trim())
    .filter(Boolean);

  // Index existing raised/cleared invoices so billed candidates are flagged cleanly
  const billedJoinerIds = new Set();
  const billedEmpIds = new Set();
  const billedNameKeys = new Map(); // normalizedName -> invoiceNo

  (invoices || []).forEach((inv) => {
    const stage = String(inv.stage || '').toLowerCase();
    if (stage !== 'raised' && stage !== 'cleared') return;
    const invNo = inv.invoiceNo || 'Billed';
    if (inv.joinerId) billedJoinerIds.add(String(inv.joinerId));
    if (Array.isArray(inv.joinerIds)) {
      inv.joinerIds.forEach((jid) => jid && billedJoinerIds.add(String(jid)));
    }
    if (inv.candidateName) {
      billedNameKeys.set(normName(inv.candidateName), invNo);
    }
    if (Array.isArray(inv.items)) {
      inv.items.forEach((it) => {
        const eid = String(it?.empId || '').trim().toUpperCase();
        if (eid && eid !== 'PENDING' && eid !== 'NA' && eid !== '-') {
          billedEmpIds.add(eid);
        }
        const ename = normName(it?.employeeName);
        if (ename) billedNameKeys.set(ename, invNo);
      });
    }
  });

  // Index candidates by ID & map JoinerEntries
  const candById = new Map();
  (candidates || []).forEach((c) => {
    const cid = String(c.id || c._id || '').trim();
    if (cid) candById.set(cid, c);
  });

  const inactiveIds = new Set();
  const inactiveNamePhones = new Set();
  const excludedCandidateIds = new Set();
  const excludedNamePhones = new Set();
  const deletedCandidateIds = new Set();
  const deletedNamePhones = new Set();

  (joinerEntries || []).forEach((j) => {
    const cid = String(j.candidateId || '').trim();
    const np = `${normName(j.name)}|${normPhone(j.phone)}`;
    if (j.weeklyExcluded) {
      if (cid) excludedCandidateIds.add(cid);
      if (np !== '|') excludedNamePhones.add(np);
      return;
    }
    if (j.weeklyDeleted) {
      if (cid) deletedCandidateIds.add(cid);
      if (np !== '|') deletedNamePhones.add(np);
    }
    if (isJoinerEntryInactive(j)) {
      if (cid) inactiveIds.add(cid);
      if (np !== '|') inactiveNamePhones.add(np);
    }
  });

  const mergedByKey = new Map();
  const deletedByKey = new Map();

  // 1. Ingest JoinerEntry rows (overlays + manual rows), routing soft-deleted rows to Recycle Bin
  (joinerEntries || []).forEach((j) => {
    if (j.weeklyExcluded) return;
    const name = String(j.name || '').trim();
    if (!name) return;
    const jid = String(j._id || j.id || '').trim();
    const cid = String(j.candidateId || '').trim();
    const phone = String(j.phone || '').trim();
    const key = cid || `p:${normPhone(phone)}|${normName(name)}`;
    const linked = cid ? candById.get(cid) : null;

    let joiningIso = '';
    let rawDojText = String(j.dateOfJoining || '').trim();
    if (rawDojText) {
      joiningIso = parseFlexDateIso(rawDojText);
    } else if (linked) {
      joiningIso = parseFlexDateIso(linked.date) || istDateFromCreated(linked.createdAt);
    } else {
      joiningIso = istDateFromCreated(j.createdAt);
    }

    const rawCompany = String(j.company || linked?.company || '').trim();
    const rawProcess = String(j.process || linked?.process || '').trim();
    const rawRecruiter = String(j.recruiterName || linked?.employee || '').trim();
    const inactive = isJoinerEntryInactive(j) || (linked ? isCandidateInactive(linked) : false);

    const record = {
      id: cid ? `cand_${cid}` : `joiner_${jid || key}`,
      overlayId: jid,
      candidateId: cid,
      candidateName: name.toUpperCase(),
      phone: phone || String(linked?.number || '').trim(),
      rawCompany,
      rawProcess,
      rawRecruiter,
      joiningIso,
      rawDojText,
      explicitBillingDate: String(j.billingDate || '').trim(),
      empId: String(j.employeeCode || '').trim(),
      inactive,
      all8Active: !inactive && hasAll8WeeksActive(j),
      remarks: extractFollowupNote(j, linked) || 'Live from Joiner Sheet',
      source: cid ? 'joiner_sheet' : 'joiner_manual',
      deletedAt: String(j.weeklyDeletedAt || '').trim(),
      deletedBy: String(j.weeklyDeletedBy || '').trim(),
    };

    if (j.weeklyDeleted) {
      deletedByKey.set(key, record);
    } else {
      mergedByKey.set(key, record);
    }
  });

  // 2. Ingest joined Candidates without an overlay row yet (respecting permanent exclusions and recycle bin)
  (candidates || []).forEach((c) => {
    if (!isJoinedCandidate(c)) return;
    const name = String(c.name || '').trim();
    if (!name) return;
    const cid = String(c.id || c._id || '').trim();
    const phone = String(c.number || '').trim();
    const np = `${normName(name)}|${normPhone(phone)}`;
    const key = cid || `p:${np}`;

    if ((cid && excludedCandidateIds.has(cid)) || (np !== '|' && excludedNamePhones.has(np))) {
      return;
    }

    const deletedTarget =
      deletedByKey.get(key) ||
      ((cid && deletedCandidateIds.has(cid)) || (np !== '|' && deletedNamePhones.has(np)));
    if (deletedTarget) {
      if (typeof deletedTarget === 'object') {
        if (!deletedTarget.rawRecruiter && c.employee) deletedTarget.rawRecruiter = String(c.employee).trim();
        if (!deletedTarget.rawCompany && c.company) deletedTarget.rawCompany = String(c.company).trim();
        if (!deletedTarget.rawProcess && c.process) deletedTarget.rawProcess = String(c.process).trim();
        if (!deletedTarget.phone && phone) deletedTarget.phone = phone;
      }
      return;
    }

    if (mergedByKey.has(key)) {
      const existing = mergedByKey.get(key);
      if (!existing.rawRecruiter && c.employee) existing.rawRecruiter = String(c.employee).trim();
      if (!existing.rawCompany && c.company) existing.rawCompany = String(c.company).trim();
      if (!existing.rawProcess && c.process) existing.rawProcess = String(c.process).trim();
      if (!existing.phone && phone) existing.phone = phone;
      return;
    }

    const joiningIso = parseFlexDateIso(c.date) || istDateFromCreated(c.createdAt);
    const inactive =
      isCandidateInactive(c) ||
      (cid && inactiveIds.has(cid)) ||
      (np !== '|' && inactiveNamePhones.has(np));

    mergedByKey.set(key, {
      id: cid ? `cand_${cid}` : `cand_${key}`,
      overlayId: '',
      candidateId: cid,
      candidateName: name.toUpperCase(),
      phone,
      rawCompany: String(c.company || '').trim(),
      rawProcess: String(c.process || '').trim(),
      rawRecruiter: String(c.employee || '').trim(),
      joiningIso,
      rawDojText: String(c.date || '').trim(),
      explicitBillingDate: '',
      empId: '',
      inactive,
      all8Active: false,
      remarks: extractFollowupNote(null, c) || 'Joined on Targets Sheet',
      source: 'targets_joined',
      deletedAt: '',
      deletedBy: '',
    });
  });

  // 3. Enrich every candidate with Payout, BI (+18% GST), AI (-10% TDS), Billing Date, and Readiness
  const EXCLUDED_WEEKLY_MONTHS = new Set(['2025-07', '2026-07', '2026-08']);
  const monthSet = new Set();
  const enrichTrackerItem = (item, recordMonth = true) => {
    const payout = resolveJoinerPayoutInfo(item.rawCompany, item.rawProcess);
    const client = payout.canonicalCompany || item.rawCompany || 'Other';
    const process = payout.matchedProcess || item.rawProcess || client;
    const recruiter =
      canonicalRecruiterName(item.rawRecruiter, knownRecruiters) ||
      item.rawRecruiter ||
      '—';

    const payoutDays = getCompanyPayoutDays(item.rawCompany || client);
    let billingIso = parseFlexDateIso(item.explicitBillingDate);
    if (!billingIso && item.joiningIso) {
      billingIso = addDaysIso(item.joiningIso, payoutDays);
    }

    const monthKey = item.joiningIso ? item.joiningIso.slice(0, 7) : '';
    if (recordMonth && monthKey && !EXCLUDED_WEEKLY_MONTHS.has(monthKey)) {
      monthSet.add(monthKey);
    }

    const tax = calculateDraftInvoice(payout.rate, 0.18, 0.10);
    const empStatus = item.inactive ? 'INACTIVE' : 'ACTIVE';
    const cleanEmpId = item.empId ? item.empId.toUpperCase() : 'Pending';
    const hasValidEmpId = Boolean(cleanEmpId && cleanEmpId !== 'PENDING' && cleanEmpId !== 'NA' && cleanEmpId !== '-');

    const matchedInvoiceNo =
      (item.overlayId && billedJoinerIds.has(item.overlayId) && 'Billed') ||
      (item.candidateId && billedJoinerIds.has(item.candidateId) && 'Billed') ||
      (hasValidEmpId && billedEmpIds.has(cleanEmpId) && 'Billed') ||
      billedNameKeys.get(normName(item.candidateName)) ||
      '';

    const lockInPassed = Boolean((billingIso && billingIso <= todayIso) || item.all8Active);

    let billingStatus = 'Pending Confirmation';
    if (matchedInvoiceNo) {
      billingStatus = 'Moved to Bill Raised';
    } else if (empStatus !== 'ACTIVE') {
      billingStatus = 'Dropped / Inactive';
    } else if (lockInPassed && hasValidEmpId) {
      billingStatus = 'Ready to Invoice';
    } else if (lockInPassed && !hasValidEmpId) {
      billingStatus = 'Pending Emp ID';
    } else {
      billingStatus = 'In Notice Period';
    }

    return {
      id: item.id,
      overlayId: item.overlayId,
      candidateId: item.candidateId,
      candidateName: item.candidateName,
      phone: item.phone,
      client,
      rawClient: item.rawCompany,
      process: process.toUpperCase(),
      rawProcess: item.rawProcess,
      joiningDate: item.joiningIso ? formatSheetDateDisplay(item.joiningIso) : (item.rawDojText || '—'),
      joiningIso: item.joiningIso || '',
      billingDate: billingIso ? formatSheetDateDisplay(billingIso) : '—',
      billingIso: billingIso || '',
      monthKey,
      recruiter,
      baseRate: payout.rate,
      bi: tax.totalInvoiceValue,
      ai: tax.expectedReceipt,
      payoutDays,
      empId: cleanEmpId,
      empStatus,
      billingStatus,
      invoiceNo: matchedInvoiceNo,
      lockInPassed,
      remarks: item.remarks,
      source: item.source,
      deletedAt: item.deletedAt || '',
      deletedBy: item.deletedBy || '',
    };
  };

  const liveCandidates = [...mergedByKey.values()]
    .map((it) => enrichTrackerItem(it, true))
    .filter((c) => !EXCLUDED_WEEKLY_MONTHS.has(c.monthKey));
  const deletedCandidates = [...deletedByKey.values()]
    .map((it) => enrichTrackerItem(it, false))
    .filter((c) => !EXCLUDED_WEEKLY_MONTHS.has(c.monthKey))
    .sort((a, b) => (b.deletedAt || '').localeCompare(a.deletedAt || '') || a.candidateName.localeCompare(b.candidateName))
    .map((c, idx) => ({ ...c, slNo: idx + 1 }));

  // Sort candidates newest joining date descending
  liveCandidates.sort((a, b) => {
    if (a.joiningIso && b.joiningIso && a.joiningIso !== b.joiningIso) {
      return b.joiningIso.localeCompare(a.joiningIso);
    }
    if (a.joiningIso && !b.joiningIso) return -1;
    if (!a.joiningIso && b.joiningIso) return 1;
    return a.candidateName.localeCompare(b.candidateName);
  });

  const indexedCandidates = liveCandidates.map((c, idx) => ({ ...c, slNo: idx + 1 }));

  // 4. Build Live Weekly Batches (Company x Joining Week across all months in Joiner Sheet)
  const weekPeriodsCache = new Map();
  const findMonthWeek = (isoDate) => {
    if (!isoDate) return null;
    const mk = isoDate.slice(0, 7);
    if (!parseMonthKey(mk)) return null;
    if (!weekPeriodsCache.has(mk)) {
      weekPeriodsCache.set(mk, getMonthWeekPeriods(mk));
    }
    const weeks = weekPeriodsCache.get(mk);
    const hit = weeks.find((w) => isoDate >= w.startIso && isoDate <= w.endIso) || weeks[0];
    if (!hit) return null;
    const monthStart = `${mk}-01`;
    const lastDay = new Date(Date.UTC(Number(mk.slice(0, 4)), Number(mk.slice(5, 7)), 0))
      .toISOString()
      .slice(0, 10);
    const s = hit.startIso < monthStart ? monthStart : hit.startIso;
    const e = hit.endIso > lastDay ? lastDay : hit.endIso;
    return {
      monthKey: mk,
      weekKey: hit.weekKey,
      startIso: s,
      endIso: e,
      periodLabel: formatShortPeriod(s, e),
    };
  };

  const batchMap = new Map();
  indexedCandidates.forEach((c) => {
    const wk = findMonthWeek(c.joiningIso);
    const batchKey = wk ? `${c.client}::${wk.monthKey}::${wk.weekKey}` : `${c.client}::unassigned`;
    if (!batchMap.has(batchKey)) {
      batchMap.set(batchKey, {
        id: `batch_${batchKey}`,
        company: c.client,
        monthKey: wk ? wk.monthKey : '',
        weekKey: wk ? wk.weekKey : '',
        startIso: wk ? wk.startIso : '',
        endIso: wk ? wk.endIso : '',
        period: wk ? wk.periodLabel : 'Pending DOJ Date',
        candidates: 0,
        droppedCount: 0,
        totalRows: 0,
        readyCount: 0,
        bi: 0,
        ai: 0,
        minBillingIso: '',
        maxBillingIso: '',
        billingDate: '',
      });
    }
    const b = batchMap.get(batchKey);
    b.totalRows += 1;
    if (c.empStatus === 'ACTIVE') {
      b.candidates += 1;
      b.bi += c.bi;
      b.ai += c.ai;
      if (c.billingStatus === 'Ready to Invoice' || c.billingStatus === 'Pending Emp ID') {
        b.readyCount += 1;
      }
      if (c.billingIso) {
        if (!b.minBillingIso || c.billingIso < b.minBillingIso) b.minBillingIso = c.billingIso;
        if (!b.maxBillingIso || c.billingIso > b.maxBillingIso) b.maxBillingIso = c.billingIso;
      }
    } else {
      b.droppedCount += 1;
    }
  });

  const batchesSorted = [...batchMap.values()]
    .sort((a, b) => {
      if (a.startIso && b.startIso && a.startIso !== b.startIso) {
        return b.startIso.localeCompare(a.startIso);
      }
      if (a.startIso && !b.startIso) return -1;
      if (!a.startIso && b.startIso) return 1;
      return b.bi - a.bi || a.company.localeCompare(b.company);
    })
    .map((b, idx) => {
      const dateToBeRaisedIso = b.maxBillingIso || b.minBillingIso || '';
      const dateToBeRaised = dateToBeRaisedIso ? formatSheetDateDisplay(dateToBeRaisedIso) : '—';
      let status = 'In Notice Period';
      if (b.candidates === 0 && b.droppedCount > 0) {
        status = `All Dropped (${b.droppedCount} drop)`;
      } else if (dateToBeRaisedIso && dateToBeRaisedIso <= todayIso) {
        status = b.droppedCount > 0 ? `Ready to Raise (${b.droppedCount} drop)` : 'Ready to Raise (No drop)';
      } else if (b.droppedCount > 0) {
        status = `Notice Period (${b.droppedCount} drop)`;
      }
      return {
        ...b,
        slNo: idx + 1,
        dateToBeRaised,
        dateToBeRaisedIso,
        status,
      };
    });

  // Available months sorted newest first
  const curMonth = todayIso.slice(0, 7);
  monthSet.add(curMonth);
  const availableMonths = [...monthSet].sort().reverse();

  return {
    candidates: indexedCandidates,
    deletedCandidates,
    batches: batchesSorted,
    availableMonths,
    generatedAt: new Date().toISOString(),
  };
}
