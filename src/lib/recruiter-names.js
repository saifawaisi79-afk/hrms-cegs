/**
 * Recruiter / employee name matching for candidate sheets.
 * Login names and sheet "employee" cells often differ (Aswin vs ASHWIN).
 */

const FIRST_NAME_ALIASES = {
  aswin: 'ashwin',
  ashwin: 'ashwin',
};

export function normalizePersonName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function canonicalFirstToken(name) {
  const first = normalizePersonName(name).split(' ')[0] || '';
  return FIRST_NAME_ALIASES[first] || first;
}

export function employeeNamesMatch(a, b) {
  const x = normalizePersonName(a);
  const y = normalizePersonName(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const xf = canonicalFirstToken(x);
  const yf = canonicalFirstToken(y);
  if (xf && xf === yf && xf.length >= 3) return true;
  return false;
}

/** Prefer the HR directory spelling when two labels are the same person. */
export function canonicalRecruiterName(name, knownNames = []) {
  const raw = String(name || '').trim();
  if (!raw) return '';
  const hit = (knownNames || []).find((n) => employeeNamesMatch(n, raw));
  return hit || raw;
}
