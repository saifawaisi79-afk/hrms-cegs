const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '../src/components/hrms/HrmsLegacy.jsx');
let s = fs.readFileSync(p, 'utf8');

const start = s.indexOf('{/* CANDIDATE DATASHEET TABLE & STATUS OVERVIEW GRID */}');
const end = s.indexOf('{/* RIGHT: CANDIDATE STATUS OVERVIEW DONUT CARD */}');
if (start < 0 || end < 0) {
  console.error('markers not found', start, end);
  process.exit(1);
}

let replacement = `{/* CANDIDATE DATASHEET TABLE & STATUS OVERVIEW GRID */}
 <div className="recruitment-split">
 {/* LEFT: CANDIDATE TABLE CARD */}
 <div className="recruitment-page-card glass-card" style={{ borderRadius: 24, padding: 24 }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
 <div>
 <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
 {activeTaskCategory === 'calls' ? 'Calls Made Datasheet' :
 activeTaskCategory === 'interviews' ? 'Interviews Scheduled Datasheet' :
 activeTaskCategory === 'walkins' ? 'Walk-ins Today Datasheet' :
 activeTaskCategory === 'selected' ? 'Selected Today Datasheet' :
 'Joined Today Datasheet'} {isEmp ? \`(\${user?.name})\` : selectedEmployeeFilter !== 'ALL' ? \`(\${selectedEmployeeFilter})\` : '(All Recruiter Log)'}
 </h3>
 <p style={{ fontSize: 12.5, fontWeight: 700, color: saveStatus.includes('Error') || saveStatus.includes('Offline') ? 'var(--amber)' : '#059669', marginTop: 2 }}>{saveStatus}</p>
 </div>

 <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
 <input
 className="form-input"
 style={{ borderRadius: 99, padding: '8px 16px', fontSize: 12, width: 200, minHeight: 40 }}
 placeholder="Search candidate..."
 value={searchQuery}
 onChange={e => setSearchQuery(e.target.value)}
 aria-label="Search candidates"
 />
 <button type="button" className="btn btn-secondary" style={{ borderRadius: 99, padding: '8px 14px', fontSize: 12, minHeight: 40 }} onClick={handleTriggerImport}>
 <IC n="upload" s={13} /> Upload File
 </button>
 <button type="button" className="btn btn-secondary" style={{ borderRadius: 99, padding: '8px 14px', fontSize: 12, minHeight: 40, background: '#FEF3C7', borderColor: '#FDE68A', color: '#92400E' }} onClick={handleCleanDuplicates} title="Remove duplicate candidate entries">
 Clean Duplicates
 </button>
 <button type="button" className="btn btn-secondary" style={{ borderRadius: 99, padding: '8px 12px', fontSize: 12, minHeight: 40, background: '#FEE2E2', borderColor: '#FCA5A5', color: '#991B1B' }} onClick={handleClearAllCandidates} title="Clear all candidates">
 Clear
 </button>
 {!isSA && (
 <button type="button" className="btn btn-primary" style={{ borderRadius: 99, padding: '8px 16px', fontSize: 12, minHeight: 40 }} onClick={() => setShowCandidateModal(true)}>
 <IC n="plus" s={13} /> Add Candidate
 </button>
 )}
 </div>
 </div>

 <div ref={tableScrollRef} className="datasheet-scroll">
 <table className="datasheet-table">
 <thead>
 <tr>
 {['SL No', 'Date', 'Candidate Name', 'Contact Number', 'Languages', 'Qualification', 'Response', 'Call Status', 'Location', 'Experience', 'Follow Up 1', 'Follow Up 2', 'Follow Up 3', 'Action'].map(h => (
 <th key={h} style={{ textAlign: h === 'Action' ? 'center' : 'left' }}>{h}</th>
 ))}
 </tr>
 </thead>
 <tbody>
 {filteredCandidates.length === 0 ? (
 <tr>
 <td colSpan={14} style={{ padding: 28, textAlign: 'center', color: 'var(--text-secondary)' }}>
 <div style={{ fontWeight: 800, marginBottom: 6, color: 'var(--text-primary)' }}>No candidates in this datasheet yet</div>
 <div style={{ fontSize: 13, marginBottom: 14 }}>Add a candidate or upload a .xlsx / .csv file to start tracking.</div>
 {!isSA && (
 <button type="button" className="btn btn-primary" onClick={() => setShowCandidateModal(true)}>
 <IC n="plus" s={14} /> Add Candidate
 </button>
 )}
 </td>
 </tr>
 ) : filteredCandidates.map(row => {
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
 })}
 </tbody>
 </table>
 </div>

 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)', flexWrap: 'wrap', gap: 10 }}>
 <button type="button" style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }} onClick={handleTriggerImport}>
 <IC n="file" s={14} /> Upload File (.csv, .xlsx)
 </button>
 <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>
 Edit any cell — changes auto-save after you pause typing.
 </span>
 </div>
 </div>

 `;

s = s.slice(0, start) + replacement + s.slice(end);
fs.writeFileSync(p, s);
console.log('datasheet UI replaced, lines', s.split(/\n/).length);
