/**
 * Valid joiners for Campaign Hub — existing Recruitment / Joiner Sheet only.
 *
 * Counted when:
 * - JoinerEntry exists (HR Joiner Sheet), OR
 * - Targets candidate is marked joined (same rules as JoinerSheetSection).
 *
 * Date used (in order): JoinerEntry.dateOfJoining, else candidate.date (sheet
 * date when marked joined). Never counts rejected/unjoined candidates.
 * Deduped by candidateId, else phone+name.
 */

import { normalizeCandidateDate } from '@/lib/candidate-dates';
import { istIsoDate } from '@/lib/ist-time';
import { employeeNamesMatch } from '@/lib/recruiter-names';

const WEEK_KEYS = ['week1', 'week2', 'week3', 'week4', 'week5', 'week6', 'week7', 'week8'];

function hasInactiveKeyword(val) {
  const str = String(val || '').trim().toLowerCase();
  if (!str) return false;
  return (
    str.includes('inactive') ||
    str.includes('drop') ||
    str.includes('left') ||
    str.includes('resign') ||
    str.includes('abscond')
  );
}

export function isJoinerEntryInactive(j) {
  if (!j) return false;
  for (const wk of WEEK_KEYS) {
    if (hasInactiveKeyword(j[wk])) return true;
  }
  if (hasInactiveKeyword(j.status)) return true;
  return false;
}

function sheetText(cand) {
  return `${cand?.response || ''} ${cand?.followUp1 || ''} ${cand?.followUp2 || ''} ${cand?.followUp3 || ''} ${cand?.category || ''}`
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function isJoinedCandidate(cand) {
  const text = sheetText(cand);
  return (
    text.includes('joined') ||
    text.includes('joining') ||
    String(cand?.category || '').toLowerCase() === 'joined'
  );
}

export function isCandidateInactive(cand) {
  return hasInactiveKeyword(sheetText(cand));
}

function normName(s) {
  return String(s || '').trim().toLowerCase();
}

function normPhone(s) {
  return String(s || '').replace(/\D/g, '');
}

function parseFlexDateIso(value) {
  if (!value) return '';
  const cleaned = String(value).replace(/\s*([/-])\s*/g, '$1').trim();
  return normalizeCandidateDate(cleaned);
}

function isoFrom(value, fallbackCreated) {
  const fromField = parseFlexDateIso(value);
  if (fromField) return fromField;
  if (fallbackCreated) {
    try {
      return istIsoDate(new Date(fallbackCreated));
    } catch {
      return '';
    }
  }
  return '';
}

/**
 * @returns {{ isoDate: string, recruiterName: string, key: string, name: string }[]}
 */
export function collectValidJoiners(joinerEntries = [], candidates = []) {
  const byKey = new Map();
  const inactiveIds = new Set();
  const inactiveNamePhones = new Set();

  const candById = new Map();
  (candidates || []).forEach((c) => {
    const cid = String(c.id || c._id || '').trim();
    if (cid) candById.set(cid, c);
  });

  (joinerEntries || []).forEach((j) => {
    const name = String(j.name || '').trim();
    if (!name) return;
    const cid = String(j.candidateId || '').trim();
    const npKey = `p:${normPhone(j.phone)}|${normName(name)}`;
    const key = cid || npKey;

    if (isJoinerEntryInactive(j)) {
      if (cid) inactiveIds.add(cid);
      inactiveNamePhones.add(npKey);
      return;
    }

    let iso = '';
    if (j.dateOfJoining && String(j.dateOfJoining).trim()) {
      // Explicit DOJ must parse cleanly; never fall back to createdAt for text like "1st July" / "yet to join"
      iso = parseFlexDateIso(j.dateOfJoining);
    } else if (cid && candById.has(cid)) {
      const linked = candById.get(cid);
      iso = isoFrom(linked.date, linked.createdAt);
    } else if (!cid) {
      iso = isoFrom('', j.createdAt);
    }
    if (!iso) return;

    byKey.set(key, {
      isoDate: iso,
      recruiterName: String(j.recruiterName || '').trim(),
      key,
      name,
    });
  });

  (candidates || []).forEach((c) => {
    if (!isJoinedCandidate(c)) return;
    if (isCandidateInactive(c)) return;
    const name = String(c.name || '').trim();
    if (!name) return;
    const cid = String(c.id || c._id || '').trim();
    const npKey = `p:${normPhone(c.number)}|${normName(name)}`;
    const key = cid || npKey;

    if ((cid && inactiveIds.has(cid)) || inactiveNamePhones.has(npKey)) {
      return;
    }

    if (byKey.has(key)) {
      const existing = byKey.get(key);
      if (!existing.recruiterName && c.employee) {
        existing.recruiterName = String(c.employee).trim();
      }
      return;
    }
    const iso = isoFrom(c.date, c.createdAt);
    if (!iso) return;
    byKey.set(key, {
      isoDate: iso,
      recruiterName: String(c.employee || '').trim(),
      key,
      name,
    });
  });

  return [...byKey.values()];
}

export function countJoinersFor(joiners, recruiterName, startIso, endIso) {
  if (!String(recruiterName || '').trim()) return 0;
  return joiners.filter(
    (j) =>
      employeeNamesMatch(j.recruiterName, recruiterName) &&
      j.isoDate >= startIso &&
      j.isoDate <= endIso
  ).length;
}

export function lastJoinerIso(joiners, recruiterName, startIso, endIso) {
  if (!String(recruiterName || '').trim()) return '';
  let last = '';
  joiners.forEach((j) => {
    if (!employeeNamesMatch(j.recruiterName, recruiterName)) return;
    if (j.isoDate < startIso || j.isoDate > endIso) return;
    if (j.isoDate > last) last = j.isoDate;
  });
  return last;
}
