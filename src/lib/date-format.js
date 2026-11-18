/**
 * Universal Date Formatter for CEGS HRMS
 * Always formats dates in Day/Month/Year (DD/MM/YYYY) format.
 */

export function formatDateDMY(val) {
  if (!val) return '';
  if (val === '-' || val === '—' || val === 'N/A') return val;

  // Already DD/MM/YYYY or D/M/YYYY
  if (typeof val === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(val.trim())) {
    const parts = val.trim().split('/');
    return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
  }

  // ISO string or YYYY-MM-DD
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val.trim())) {
    const [y, m, d] = val.trim().slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  }

  // Date object or timestamp
  const d = new Date(val);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString('en-GB'); // en-GB strictly formats as DD/MM/YYYY
  }

  return String(val);
}

export default formatDateDMY;
