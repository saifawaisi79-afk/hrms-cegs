/**
 * Paste into the browser console on https://hrms-cegs.vercel.app (or localhost)
 * while logged in. Does NOT clear storage. Copies candidate cache JSON to clipboard
 * and downloads a file. Recruiters should run this WITHOUT refreshing if a tab
 * has been open since before the 09/09/2026 wipe.
 */
(function exportHrmsCandidateCache() {
  const keys = [
    'vp_hrms_v11_candidates',
    'vp_hrms_v10_candidates',
    'vp_hrms_v4_candidates',
    'cegs_db_v4_candidates',
    'cegs_db_candidates',
    'cegs_candidates_cleared',
  ];
  const out = { exportedAt: new Date().toISOString(), origin: location.origin, keys: {} };
  keys.forEach((k) => {
    const raw = localStorage.getItem(k);
    if (raw == null) {
      out.keys[k] = null;
      return;
    }
    try {
      out.keys[k] = JSON.parse(raw);
    } catch {
      out.keys[k] = raw;
    }
  });
  const json = JSON.stringify(out, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `hrms_localstorage_candidates_${Date.now()}.json`;
  a.click();
  console.log('[HRMS export] counts', Object.fromEntries(
    Object.entries(out.keys).map(([k, v]) => [k, Array.isArray(v) ? v.length : v])
  ));
  return out;
})();
