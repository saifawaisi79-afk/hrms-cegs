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

function normName(s) {
  return String(s || '').trim().toLowerCase();
}

function normPhone(s) {
  return String(s || '').replace(/\D/g, '');
}

function isoFrom(value, fallbackCreated) {
  const fromField = normalizeCandidateDate(value);
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

  (joinerEntries || []).forEach((j) => {
    const name = String(j.name || '').trim();
    if (!name) return;
    const iso = isoFrom(j.dateOfJoining, j.createdAt);
    if (!iso) return;
    const cid = String(j.candidateId || '').trim();
    const key = cid || `p:${normPhone(j.phone)}|${normName(name)}`;
    byKey.set(key, {
      isoDate: iso,
      recruiterName: String(j.recruiterName || '').trim(),
      key,
      name,
    });
  });

  (candidates || []).forEach((c) => {
    if (!isJoinedCandidate(c)) return;
    const name = String(c.name || '').trim();
    if (!name) return;
    const cid = String(c.id || c._id || '').trim();
    const key = cid || `p:${normPhone(c.number)}|${normName(name)}`;
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
  const want = normName(recruiterName);
  if (!want) return 0;
  return joiners.filter(
    (j) => normName(j.recruiterName) === want && j.isoDate >= startIso && j.isoDate <= endIso
  ).length;
}

export function lastJoinerIso(joiners, recruiterName, startIso, endIso) {
  const want = normName(recruiterName);
  let last = '';
  joiners.forEach((j) => {
    if (normName(j.recruiterName) !== want) return;
    if (j.isoDate < startIso || j.isoDate > endIso) return;
    if (j.isoDate > last) last = j.isoDate;
  });
  return last;
}
