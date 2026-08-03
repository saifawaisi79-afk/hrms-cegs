const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '../src/components/hrms/HrmsLegacy.jsx');
let s = fs.readFileSync(p, 'utf8');

// Insert handleCellChange after handleDeleteCandidate
const deleteFnMarker = `const handleDeleteCandidate = async (candId) => {
 if (isSA) return;
 if (window.confirm('Are you sure you want to delete this candidate record?')) {
 const updated = candidates.filter(c => (c.id || c._id) !== candId);
 updateCandidatesStore(updated);
 try {
 await fetch(\`\${API_BASE}/candidates/\${candId}\`, { method: 'DELETE' });
 } catch {}
 showToast('Deleted candidate entry.', 'info');
 }
 };`;

const cellHandler = `const handleDeleteCandidate = async (candId) => {
 if (isSA) return;
 if (window.confirm('Are you sure you want to delete this candidate record?')) {
 const updated = candidates.filter(c => (c.id || c._id) !== candId);
 updateCandidatesStore(updated);
 try {
 await fetch(\`\${API_BASE}/candidates/\${candId}\`, { method: 'DELETE' });
 } catch {}
 showToast('Deleted candidate entry.', 'info');
 }
 };

 const persistCandidateRow = async (row) => {
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
 };`;

if (s.includes(deleteFnMarker)) {
  s = s.replace(deleteFnMarker, cellHandler);
  console.log('inserted handleCellChange');
} else {
  console.log('WARN: delete marker not found — trying loose match');
  if (!s.includes('const handleCellChange')) {
    s = s.replace(
      /const handleDeleteCandidate = async \(candId\) => \{[\s\S]*?\n \};/,
      (m) => m + `\n\n const persistCandidateRow = async (row) => {
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
 try { localStorage.setItem('vp_hrms_v4_candidates', JSON.stringify(next)); } catch {}
 if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
 saveDebounceRef.current = setTimeout(() => persistCandidateRow(row), 450);
 return next;
 });
 };`
    );
    console.log('loose insert done', s.includes('handleCellChange'));
  }
}

fs.writeFileSync(p, s);
console.log('lines', s.split(/\n/).length);
