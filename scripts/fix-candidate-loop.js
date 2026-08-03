/**
 * Fix recruitment thrash: gate poll, remove autosave/empty-row, read-only table cells.
 */
const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '../src/components/hrms/HrmsLegacy.jsx');
let s = fs.readFileSync(p, 'utf8');
let n = 0;

function replaceOnce(label, from, to) {
  if (!s.includes(from)) {
    console.error('MISS:', label);
    return false;
  }
  s = s.replace(from, to);
  n++;
  console.log('OK:', label);
  return true;
}

// --- 1) Initial load: skip API when no JWT ---
replaceOnce(
  'initial-load-token-gate',
  ` // INITIAL LOAD: Fetch candidates from API immediately on mount, ignore stale localStorage
 useEffect(() => {
 const loadInitialCandidates = async () => {
 try {
 const res = await fetch(\`\${GLOBAL_API_BASE}/candidates\`);
 if (res.ok) {
 const apiData = await res.json();
 if (Array.isArray(apiData)) {
 const cleaned = deduplicateCandidates(apiData);
 setCandidates(cleaned);
 // Update localStorage to latest API data to prevent stale cache
 try {
 localStorage.setItem('vp_hrms_v10_candidates', JSON.stringify(cleaned));
 localStorage.removeItem('cegs_candidates_cleared');
 } catch {}
 setCandidatesLoading(false);
 return;
 }
 }
 } catch (err) {
 console.warn('[Init] API unavailable, falling back to localStorage:', err.message);
 }
 // Only fall back to localStorage if API is unreachable
 const stored = getStoredCandidates();
 setCandidates(stored);
 setCandidatesLoading(false);
 };
 loadInitialCandidates();`,
  ` // INITIAL LOAD: fetch API only when JWT exists (avoids 401 spam without a session)
 useEffect(() => {
 const loadInitialCandidates = async () => {
 const token = typeof window !== 'undefined' ? localStorage.getItem('cegs_token') : null;
 if (token) {
 try {
 const res = await fetch(\`\${GLOBAL_API_BASE}/candidates\`);
 if (res.ok) {
 const apiData = await res.json();
 if (Array.isArray(apiData)) {
 const cleaned = deduplicateCandidates(apiData);
 setCandidates(cleaned);
 try {
 localStorage.setItem('vp_hrms_v10_candidates', JSON.stringify(cleaned));
 localStorage.removeItem('cegs_candidates_cleared');
 } catch {}
 setCandidatesLoading(false);
 return;
 }
 }
 } catch (err) {
 console.warn('[Init] API unavailable, falling back to localStorage:', err.message);
 }
 }
 const stored = getStoredCandidates();
 setCandidates(stored);
 setCandidatesLoading(false);
 };
 loadInitialCandidates();`
);

// --- 2) Polling: token-gated, 30s, stop on 401 ---
replaceOnce(
  'poll-gate',
  ` // Live MongoDB Atlas candidate sync & auto-polling effect (protects active user typing)
 useEffect(() => {
 let isMounted = true;

 const syncFromMongoAtlas = async () => {
 // If user typed/edited in the last 10 seconds, pause cloud polling overwrite to protect typing!
 if (Date.now() - lastEditedRef.current < 10000) {
 return;
 }

 try {
 const res = await fetch(\`\${GLOBAL_API_BASE}/candidates\`);
 if (res.ok) {
 const cloudData = await res.json();
 if (isMounted && Array.isArray(cloudData) && cloudData.length > 0) {
 setCandidates(prev => {
 // Preserve active unsaved local inline rows (id starting with 'cand_')
 const unsavedLocal = prev.filter(r => String(r.id || r._id || '').startsWith('cand_'));
 const merged = [...cloudData];
 unsavedLocal.forEach(loc => {
 if (!merged.some(c => String(c.id || c._id) === String(loc.id || loc._id))) {
 merged.push(loc);
 }
 });

 const cleaned = deduplicateCandidates(merged);
 if (JSON.stringify(prev) !== JSON.stringify(cleaned)) {
 save('candidates', cleaned);
 return cleaned;
 }
 return prev;
 });
 }
 }
 } catch (err) {
 console.warn('Live MongoDB Atlas candidate sync offline fallback:', err);
 }
 };

 syncFromMongoAtlas();
 const interval = setInterval(syncFromMongoAtlas, 5000);
 return () => { isMounted = false; clearInterval(interval); };
 }, []);`,
  ` // Optional cloud sync — JWT only; long interval; never thrash on 401
 useEffect(() => {
 let isMounted = true;
 const token = typeof window !== 'undefined' ? localStorage.getItem('cegs_token') : null;
 if (!token) return undefined;

 const syncFromMongoAtlas = async () => {
 if (Date.now() - lastEditedRef.current < 10000) return;
 try {
 const res = await fetch(\`\${GLOBAL_API_BASE}/candidates\`);
 if (res.status === 401) return;
 if (res.ok) {
 const cloudData = await res.json();
 if (isMounted && Array.isArray(cloudData) && cloudData.length > 0) {
 setCandidates(prev => {
 const cleaned = deduplicateCandidates(cloudData);
 if (JSON.stringify(prev) !== JSON.stringify(cleaned)) {
 save('candidates', cleaned);
 return cleaned;
 }
 return prev;
 });
 }
 }
 } catch (err) {
 console.warn('Candidate sync offline:', err);
 }
 };

 syncFromMongoAtlas();
 const interval = setInterval(syncFromMongoAtlas, 30000);
 return () => { isMounted = false; clearInterval(interval); };
 }, []);`
);

// --- 3) Remove auto-generate empty row ---
replaceOnce(
  'remove-empty-row',
  ` useEffect(() => {
 // Auto-generate 1 fresh empty candidate entry form for the active task category page if empty
 if (user?.name && !isSA) {
 const userCatRows = candidates.filter(c => 
 (c.employee || '').trim().toLowerCase() === user.name.trim().toLowerCase() &&
 getCategoryFromCandidate(c) === activeTaskCategory
 );
 if (userCatRows.length === 0) {
 let resp = '';
 let f1 = '', f2 = '', f3 = '';
 if (activeTaskCategory === 'interviews') { resp = 'Interview Scheduled'; f1 = 'Interview Scheduled'; }
 else if (activeTaskCategory === 'walkins') { resp = 'Walk-in Today'; f2 = 'Walk-in Today'; }
 else if (activeTaskCategory === 'selected') { resp = 'Selected Today'; f3 = 'Selected Today'; }
 else if (activeTaskCategory === 'joined') { resp = 'Joined Today'; f3 = 'Joined Today'; }

 const initialRow = {
 id: 'cand_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
 slNo: 1,
 date: new Date().toLocaleDateString('en-GB'),
 name: '',
 number: '',
 languages: 'English',
 qualification: '',
 response: resp,
 callStatus: 'Select Status',
 location: 'Bengaluru',
 experience: 0,
 followUp1: f1,
 followUp2: f2,
 followUp3: f3,
 category: activeTaskCategory,
 employee: user.name
 };
 updateCandidatesStore([...candidates, initialRow]);
 }
 }
 }, [user?.name, activeTaskCategory]);`,
  ` // No empty-row auto-create — use Add Candidate + Save Candidate (POST)`
);

// --- 4) Remove persist + handleCellChange ---
replaceOnce(
  'remove-autosave-fns',
  ` const persistCandidateRow = async (row) => {
 if (!row) return;
 const id = row.id || row._id;
 setSaveStatus('Saving...');
 try {
 if (String(id).startsWith('cand_')) {
 const res = await fetch(\`\${API_BASE}/candidates\`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(row),
 });
 if (res.ok) {
 const saved = await res.json();
 const newId = saved.id || saved._id;
 setCandidates((prev) => {
 const next = prev.map((c) => ((c.id || c._id) === id ? { ...row, id: newId, _id: newId } : c));
 save('candidates', next);
 return next;
 });
 }
 } else {
 await fetch(\`\${API_BASE}/candidates/\${id}\`, {
 method: 'PUT',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(row),
 });
 }
 setSaveStatus('Synced');
 } catch {
 setSaveStatus('Offline — saved locally');
 }
 };

 const handleCellChange = (candId, field, value) => {
 if (isSA) return;
 lastEditedRef.current = Date.now();
 setSaveStatus('Saving...');
 setCandidates((prev) => {
 const next = prev.map((c) => ((c.id || c._id) === candId ? { ...c, [field]: value } : c));
 const row = next.find((c) => (c.id || c._id) === candId);
 save('candidates', next);
 try {
 localStorage.setItem('vp_hrms_v4_candidates', JSON.stringify(next));
 } catch {}
 if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
 saveDebounceRef.current = setTimeout(() => persistCandidateRow(row), 450);
 return next;
 });
 };

`,
  ` // Inline cell auto-save removed — Add Candidate modal POSTs explicitly

`
);

// --- 5) Strengthen Add Candidate submit: local fallback + clearer errors ---
replaceOnce(
  'add-candidate-submit',
  ` try {
 const res = await fetch(\`\${API_BASE}/candidates\`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(draftRow)
 });
 if (res.ok) {
 const saved = await res.json();
 updateCandidatesStore([...candidates, { ...draftRow, id: saved.id || saved._id }]);
 setSaveStatus('Synced');
 setShowCandidateModal(false);
 setCandidateForm({ name: '', number: '', languages: 'English', qualification: '', response: '', callStatus: 'Select Status', location: 'Bengaluru', experience: 0, followUp1: '', followUp2: '', followUp3: '' });
 showToast('Candidate successfully saved!', 'success');
 } else {
 setFormError('Failed to save to database.');
 setSaveStatus('Error');
 }
 } catch (err) {
 setFormError('Network error while saving.');
 setSaveStatus('Error');
 }
 };`,
  ` try {
 const token = typeof window !== 'undefined' ? localStorage.getItem('cegs_token') : null;
 if (!token) {
 const localId = 'cand_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
 updateCandidatesStore([...candidates, { ...draftRow, id: localId }]);
 setSaveStatus('Saved locally — log in with API session to sync cloud DB');
 setShowCandidateModal(false);
 setCandidateForm({ name: '', number: '', languages: 'English', qualification: '', response: '', callStatus: 'Select Status', location: 'Bengaluru', experience: 0, followUp1: '', followUp2: '', followUp3: '' });
 showToast('Saved locally. Sign in via API to POST to MongoDB.', 'info');
 return;
 }
 const res = await fetch(\`\${API_BASE}/candidates\`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(draftRow)
 });
 if (res.ok) {
 const saved = await res.json();
 updateCandidatesStore([...candidates, { ...draftRow, id: saved.id || saved._id }]);
 setSaveStatus('Synced to database');
 setShowCandidateModal(false);
 setCandidateForm({ name: '', number: '', languages: 'English', qualification: '', response: '', callStatus: 'Select Status', location: 'Bengaluru', experience: 0, followUp1: '', followUp2: '', followUp3: '' });
 showToast('Candidate saved to database!', 'success');
 } else if (res.status === 401) {
 setFormError('Session expired. Log out and sign in again to save to the database.');
 setSaveStatus('Error');
 } else {
 const errBody = await res.json().catch(() => ({}));
 setFormError(errBody.error || 'Failed to save to database.');
 setSaveStatus('Error');
 }
 } catch (err) {
 setFormError('Network error while saving.');
 setSaveStatus('Error');
 }
 };`
);

// --- 6) Read-only table cells (no onChange autosave) ---
replaceOnce(
  'table-readonly',
  ` ) : filteredCandidates.map(row => {
 const rid = row.id || row._id;
 const locked = !!isSA;
 return (
 <tr key={rid}>
 <td style={{ fontWeight: 800, color: 'var(--text-muted)', padding: '10px 14px' }}>{row.slNo}</td>
 <td><input className="cell-input" disabled={locked} value={row.date || ''} onChange={e => handleCellChange(rid, 'date', e.target.value)} aria-label="Date" /></td>
 <td><input className="cell-input" disabled={locked} value={row.name || ''} onChange={e => handleCellChange(rid, 'name', e.target.value.toUpperCase())} aria-label="Candidate name" /></td>
 <td><input className="cell-input" disabled={locked} value={row.number || ''} onChange={e => handleCellChange(rid, 'number', e.target.value)} aria-label="Contact number" /></td>
 <td>
 <select className="cell-select" disabled={locked} value={row.languages || 'English'} onChange={e => handleCellChange(rid, 'languages', e.target.value)} aria-label="Languages">
 {(LANGUAGE_OPTIONS || ['English','Hindi','Kannada','Tamil','Telugu']).map(o => <option key={o} value={o}>{o}</option>)}
 </select>
 </td>
 <td><input className="cell-input" disabled={locked} value={row.qualification || ''} onChange={e => handleCellChange(rid, 'qualification', e.target.value)} aria-label="Qualification" /></td>
 <td><input className="cell-input" disabled={locked} value={row.response || ''} onChange={e => handleCellChange(rid, 'response', e.target.value)} aria-label="Response" /></td>
 <td>
 <select className="cell-select" disabled={locked} value={row.callStatus || 'Select Status'} onChange={e => handleCellChange(rid, 'callStatus', e.target.value)} aria-label="Call status">
 {(CALL_STATUS_OPTIONS || ['Select Status','Connected','Not Connected','RNR','Busy']).map(o => <option key={o} value={o}>{o}</option>)}
 </select>
 </td>
 <td><input className="cell-input" disabled={locked} value={row.location || ''} onChange={e => handleCellChange(rid, 'location', e.target.value)} aria-label="Location" /></td>
 <td><input className="cell-input" type="number" min={0} disabled={locked} value={row.experience ?? 0} onChange={e => handleCellChange(rid, 'experience', Number(e.target.value) || 0)} aria-label="Experience" style={{ textAlign: 'center', minWidth: 64 }} /></td>
 <td><input className="cell-input" disabled={locked} value={row.followUp1 || ''} onChange={e => handleCellChange(rid, 'followUp1', e.target.value)} aria-label="Follow up 1" /></td>
 <td><input className="cell-input" disabled={locked} value={row.followUp2 || ''} onChange={e => handleCellChange(rid, 'followUp2', e.target.value)} aria-label="Follow up 2" /></td>
 <td><input className="cell-input" disabled={locked} value={row.followUp3 || ''} onChange={e => handleCellChange(rid, 'followUp3', e.target.value)} aria-label="Follow up 3" /></td>
 <td style={{ textAlign: 'center' }}>
 {!isSA && (
 <button 
 type="button"
 style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', borderRadius: 8, padding: '6px 10px', fontSize: 11, fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, minHeight: 36 }}
 onClick={() => handleDeleteCandidate(rid)}
 title="Delete candidate row"
 >
 <IC n="trash" s={12} /> Delete
 </button>
 )}
 </td>
 </tr>
 );
 })}`,
  ` ) : filteredCandidates.map(row => {
 const rid = row.id || row._id;
 const cell = (v) => (
 <td style={{ padding: '10px 14px', fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{v ?? '—'}</td>
 );
 return (
 <tr key={rid}>
 <td style={{ fontWeight: 800, color: 'var(--text-muted)', padding: '10px 14px' }}>{row.slNo}</td>
 {cell(row.date)}
 {cell(row.name)}
 {cell(row.number)}
 {cell(row.languages)}
 {cell(row.qualification)}
 {cell(row.response)}
 {cell(row.callStatus)}
 {cell(row.location)}
 {cell(row.experience ?? 0)}
 {cell(row.followUp1)}
 {cell(row.followUp2)}
 {cell(row.followUp3)}
 <td style={{ textAlign: 'center' }}>
 {!isSA && (
 <button 
 type="button"
 style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', borderRadius: 8, padding: '6px 10px', fontSize: 11, fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, minHeight: 36 }}
 onClick={() => handleDeleteCandidate(rid)}
 title="Delete candidate row"
 >
 <IC n="trash" s={12} /> Delete
 </button>
 )}
 </td>
 </tr>
 );
 })}`
);

// --- 7) Footer hint ---
replaceOnce(
  'footer-hint',
  ` <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>
 Edit any cell — changes auto-save after you pause typing.
 </span>`,
  ` <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>
 Use <strong>Add Candidate</strong> → <strong>Save Candidate</strong> to POST a new row to the database.
 </span>`
);

// Modal button label already "Save Candidate" — good

fs.writeFileSync(p, s);
console.log('Done patches:', n);
console.log('handleCellChange left?', s.includes('handleCellChange'));
console.log('authRedirectLock?', s.includes('authRedirectLock'));
console.log('30000 poll?', s.includes('setInterval(syncFromMongoAtlas, 30000)'));
