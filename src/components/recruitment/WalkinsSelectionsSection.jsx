'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { todayIsoDate, formatSheetDateDisplay } from '@/lib/candidate-dates';
import { getRecruiters } from '@/lib/nav';

const GLOBAL_API_BASE = '/api';

const COMPANY_OPTIONS = [
  'Select Company',
  'ALTRUIST',
  'ONE POINT ONE',
  'STARTEK',
  'TRIO',
  'ISON',
  'RADICAL MINDS',
];

const emptyForm = {
  name: '',
  number: '',
  company: 'Select Company',
  process: '',
  recruiterName: '',
  rounds: '',
  furtherUpdate: '',
};

function sheetText(cand) {
  return `${cand?.response || ''} ${cand?.followUp1 || ''} ${cand?.followUp2 || ''} ${cand?.followUp3 || ''} ${cand?.category || ''}`
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/** Same rules as Targets KPI — walk-in or selected on employee sheet. */
export function isWalkinOrSelectedCandidate(cand) {
  const text = sheetText(cand);
  const walkin =
    /walk\s*-?\s*in/.test(text) || text.includes('walkin') || text.includes('visited');
  const selected = text.includes('selected') || text.includes('hired');
  const cat = String(cand?.category || '').toLowerCase();
  return walkin || selected || cat === 'walkins' || cat === 'selected';
}

function stageLabel(cand) {
  const text = sheetText(cand);
  const parts = [];
  if (/walk\s*-?\s*in/.test(text) || text.includes('walkin') || text.includes('visited')) {
    parts.push('Walk-in');
  }
  if (text.includes('selected') || text.includes('hired')) parts.push('Selected');
  if (text.includes('joined') || text.includes('joining')) parts.push('Joined');
  if (text.includes('interview')) parts.push('Interview');
  return parts.join(' · ') || (cand.response || '—');
}

function furtherFromCandidate(cand) {
  return [cand.followUp1, cand.followUp2, cand.followUp3]
    .map((x) => String(x || '').trim())
    .filter(Boolean)
    .join(' | ');
}

function dupKey(name, number) {
  return `${String(name || '').trim().toLowerCase()}|${String(number || '').replace(/\D/g, '')}`;
}

function mapCandidateToRow(cand, index) {
  const id = cand.id || cand._id;
  return {
    id: `sheet_${id}`,
    _id: `sheet_${id}`,
    source: 'sheet',
    candidateId: id,
    slNo: cand.slNo || index + 1,
    name: cand.name || '',
    number: cand.number || '',
    company: cand.company || '',
    process: stageLabel(cand),
    recruiterName: cand.employee || '',
    rounds: cand.response || '',
    furtherUpdate: furtherFromCandidate(cand),
    date: cand.date || '',
    raw: cand,
  };
}

/**
 * HR Walk-ins & Selections — shows employee Targets sheet walk-in/selected
 * rows automatically, plus optional HR-only manual entries.
 */
export function WalkinsSelectionsSection({ db, user, canEdit = true }) {
  const [manualRows, setManualRows] = useState([]);
  const [sheetCandidates, setSheetCandidates] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Ready');
  const [search, setSearch] = useState('');

  const recruiters = useMemo(() => {
    const fromNav = getRecruiters(db, db?.candidates || []);
    const fromUsers = (db?.users || [])
      .filter((u) => String(u.status || 'active').toLowerCase() !== 'inactive')
      .map((u) => u.name)
      .filter(Boolean);
    return [...new Set([...fromNav, ...fromUsers])].sort((a, b) =>
      String(a).localeCompare(String(b))
    );
  }, [db]);

  const load = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('cegs_token') : null;
    if (!token) {
      setStatus('Login required');
      return;
    }
    try {
      const [wsRes, candRes] = await Promise.all([
        fetch(`${GLOBAL_API_BASE}/walkin-selections`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${GLOBAL_API_BASE}/candidates`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (wsRes.ok) {
        const data = await wsRes.json();
        setManualRows(
          (Array.isArray(data) ? data : []).map((r) => ({
            ...r,
            source: 'manual',
            id: r.id || r._id,
          }))
        );
      }

      let fromApi = [];
      if (candRes.ok) {
        const data = await candRes.json();
        fromApi = Array.isArray(data) ? data : [];
      }
      const fromDb = Array.isArray(db?.candidates) ? db.candidates : [];
      // Prefer API; fall back / merge with local db by id
      const byId = new Map();
      [...fromDb, ...fromApi].forEach((c) => {
        const id = String(c.id || c._id || '');
        if (!id) return;
        byId.set(id, c);
      });
      setSheetCandidates([...byId.values()]);
      setStatus('Synced');
    } catch {
      setSheetCandidates(Array.isArray(db?.candidates) ? db.candidates : []);
      setStatus('Offline');
    }
  }, [db?.candidates]);

  useEffect(() => {
    load();
  }, [load]);

  // Live update when Targets sheet candidates change in app state
  useEffect(() => {
    if (Array.isArray(db?.candidates) && db.candidates.length > 0) {
      setSheetCandidates((prev) => {
        const byId = new Map();
        [...prev, ...db.candidates].forEach((c) => {
          const id = String(c.id || c._id || '');
          if (id) byId.set(id, c);
        });
        return [...byId.values()];
      });
    }
  }, [db?.candidates]);

  const sheetRows = useMemo(() => {
    return sheetCandidates
      .filter(isWalkinOrSelectedCandidate)
      .map((c, i) => mapCandidateToRow(c, i));
  }, [sheetCandidates]);

  const rows = useMemo(() => {
    const sheetKeys = new Set(sheetRows.map((r) => dupKey(r.name, r.number)));
    // Manual HR rows that are not already covered by an employee sheet entry
    const extras = manualRows.filter((r) => !sheetKeys.has(dupKey(r.name, r.number)));
    const merged = [...sheetRows, ...extras];
    return merged.map((r, i) => ({ ...r, displaySl: i + 1 }));
  }, [sheetRows, manualRows]);

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      String(r.name || '').toLowerCase().includes(q) ||
      String(r.number || '').includes(q) ||
      String(r.company || '').toLowerCase().includes(q) ||
      String(r.recruiterName || '').toLowerCase().includes(q) ||
      String(r.process || '').toLowerCase().includes(q) ||
      String(r.furtherUpdate || '').toLowerCase().includes(q)
    );
  });

  const resetForm = () => {
    setForm(emptyForm);
    setError('');
  };

  const handleAdd = async (e) => {
    e?.preventDefault?.();
    if (!canEdit) return;
    setError('');

    if (!form.name.trim() || /\d/.test(form.name)) {
      setError('Name is required and cannot contain numbers.');
      return;
    }
    const numClean = String(form.number || '').replace(/\D/g, '');
    if (numClean.length < 10 || numClean.length > 12) {
      setError('Contact number must be between 10 and 12 digits.');
      return;
    }
    if (!form.recruiterName || form.recruiterName === 'Select Recruiter') {
      setError('Select the CEGS recruiter who scheduled the walk-in.');
      return;
    }
    if (!form.company || form.company === 'Select Company') {
      setError('Select a company.');
      return;
    }

    const token = localStorage.getItem('cegs_token');
    if (!token) {
      setError('Session expired. Log in again.');
      return;
    }

    setStatus('Saving...');
    const payload = {
      name: form.name.trim().toUpperCase(),
      number: form.number.trim(),
      company: form.company,
      process: form.process.trim(),
      recruiterName: form.recruiterName,
      rounds: form.rounds.trim(),
      furtherUpdate: form.furtherUpdate.trim(),
      date: formatSheetDateDisplay(todayIsoDate()),
      createdBy: user?.name || '',
      slNo: manualRows.length + 1,
    };

    try {
      const res = await fetch(`${GLOBAL_API_BASE}/walkin-selections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || 'Failed to save entry.');
        setStatus('Error');
        return;
      }
      const saved = await res.json();
      setManualRows((prev) => [...prev, { ...saved, source: 'manual', id: saved.id || saved._id }]);
      resetForm();
      setStatus('Synced');
    } catch {
      setError('Network error while saving.');
      setStatus('Error');
    }
  };

  const startEdit = (row) => {
    if (!canEdit) return;
    setEditingId(row.id || row._id);
    setEditForm({
      name: row.name || '',
      number: row.number || '',
      company: row.company || 'Select Company',
      process: row.process || '',
      recruiterName: row.recruiterName || '',
      rounds: row.rounds || '',
      furtherUpdate: row.furtherUpdate || '',
      source: row.source,
      candidateId: row.candidateId,
    });
    setError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
    setError('');
  };

  const saveEdit = async () => {
    if (!canEdit || !editingId || !editForm) return;
    setError('');
    if (!editForm.name.trim()) {
      setError('Name is required.');
      return;
    }

    const token = localStorage.getItem('cegs_token');
    if (!token) {
      setError('Session expired. Log in again.');
      return;
    }

    setStatus('Saving...');

    try {
      if (editForm.source === 'sheet' && editForm.candidateId) {
        // Update the employee Targets candidate so sheet + HR stay aligned
        const payload = {
          name: editForm.name.trim().toUpperCase(),
          number: editForm.number,
          company: editForm.company === 'Select Company' ? '' : editForm.company,
          employee: editForm.recruiterName || undefined,
          response: editForm.rounds || undefined,
          followUp3: editForm.furtherUpdate || undefined,
        };
        const res = await fetch(`${GLOBAL_API_BASE}/candidates/${editForm.candidateId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setError(err.error || 'Failed to update sheet candidate.');
          setStatus('Error');
          return;
        }
        setSheetCandidates((prev) =>
          prev.map((c) =>
            String(c.id || c._id) === String(editForm.candidateId)
              ? { ...c, ...payload }
              : c
          )
        );
      } else {
        const payload = {
          name: editForm.name.trim().toUpperCase(),
          number: editForm.number,
          company: editForm.company === 'Select Company' ? '' : editForm.company,
          process: editForm.process,
          recruiterName: editForm.recruiterName,
          rounds: editForm.rounds,
          furtherUpdate: editForm.furtherUpdate,
        };
        const res = await fetch(`${GLOBAL_API_BASE}/walkin-selections/${editingId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setError(err.error || 'Failed to update.');
          setStatus('Error');
          return;
        }
        const data = await res.json();
        const updated = data.entry || { ...payload, id: editingId };
        setManualRows((prev) =>
          prev.map((r) =>
            String(r.id || r._id) === String(editingId) ? { ...r, ...updated, source: 'manual' } : r
          )
        );
      }
      cancelEdit();
      setStatus('Synced');
    } catch {
      setError('Network error while updating.');
      setStatus('Error');
    }
  };

  const removeRow = async (row) => {
    if (!canEdit) return;
    if (row.source === 'sheet') {
      setError(
        'This row comes from an employee Targets sheet. Clear or edit “walk in / selected” on their datasheet to remove it here.'
      );
      return;
    }
    if (!window.confirm('Delete this walk-in / selection entry?')) return;
    const token = localStorage.getItem('cegs_token');
    if (!token) return;
    const id = row.id || row._id;
    try {
      await fetch(`${GLOBAL_API_BASE}/walkin-selections/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setManualRows((prev) => prev.filter((r) => String(r.id || r._id) !== String(id)));
    } catch {
      setError('Failed to delete.');
    }
  };

  const inputStyle = {
    width: '100%',
    borderRadius: 10,
    border: '1px solid #E5E7EB',
    padding: '9px 12px',
    fontSize: 13,
    fontWeight: 600,
    outline: 'none',
    background: '#fff',
  };

  const labelStyle = {
    display: 'block',
    fontSize: 11,
    fontWeight: 800,
    color: '#64748B',
    marginBottom: 5,
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
  };

  return (
    <div
      className="recruitment-page-card glass-card"
      style={{ borderRadius: 24, padding: 24, marginTop: 8 }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 18,
        }}
      >
        <div>
          <h3
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: 'var(--text-primary)',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            Walk-ins & Selections
          </h3>
          <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', marginTop: 2 }}>
            Auto-filled from employee Targets sheets (walk-in / selected) ·{' '}
            <span style={{ color: status.includes('Error') ? '#B45309' : '#059669' }}>{status}</span>
            {' · '}
            {sheetRows.length} from sheets
            {manualRows.length ? ` · ${manualRows.length} HR-added` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ borderRadius: 99, minHeight: 40, fontSize: 12 }}
            onClick={load}
          >
            Refresh
          </button>
          <input
            className="form-input"
            style={{ borderRadius: 99, padding: '8px 16px', fontSize: 12, width: 220, minHeight: 40 }}
            placeholder="Search name, phone, company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search walk-ins"
          />
        </div>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            marginBottom: 14,
            padding: '10px 14px',
            borderRadius: 12,
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#991B1B',
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {error}
        </div>
      )}

      {canEdit && (
        <form
          onSubmit={handleAdd}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 12,
            marginBottom: 20,
            padding: 16,
            background: '#F8FAFC',
            borderRadius: 16,
            border: '1px solid #E2E8F0',
          }}
        >
          <div style={{ gridColumn: '1 / -1', fontSize: 12, fontWeight: 700, color: '#64748B' }}>
            Optional HR-only entry (employee sheet walk-ins appear automatically below)
          </div>
          <div>
            <label style={labelStyle}>SL No</label>
            <input style={inputStyle} value={rows.length + 1} readOnly aria-label="Serial number" />
          </div>
          <div>
            <label style={labelStyle}>Name</label>
            <input
              style={inputStyle}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value.toUpperCase() })}
              placeholder="CANDIDATE NAME"
              required
            />
          </div>
          <div>
            <label style={labelStyle}>Number</label>
            <input
              style={inputStyle}
              value={form.number}
              onChange={(e) => setForm({ ...form, number: e.target.value })}
              placeholder="Phone"
              required
            />
          </div>
          <div>
            <label style={labelStyle}>Company</label>
            <select
              style={inputStyle}
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
            >
              {COMPANY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Process</label>
            <input
              style={inputStyle}
              value={form.process}
              onChange={(e) => setForm({ ...form, process: e.target.value })}
              placeholder="e.g. Voice / Non-voice"
            />
          </div>
          <div>
            <label style={labelStyle}>Recruiter Name</label>
            <select
              style={inputStyle}
              value={form.recruiterName}
              onChange={(e) => setForm({ ...form, recruiterName: e.target.value })}
              required
            >
              <option value="">Select Recruiter</option>
              {recruiters.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Rounds</label>
            <input
              style={inputStyle}
              value={form.rounds}
              onChange={(e) => setForm({ ...form, rounds: e.target.value })}
              placeholder="e.g. Round 1 / L1"
            />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>Further Update</label>
            <input
              style={inputStyle}
              value={form.furtherUpdate}
              onChange={(e) => setForm({ ...form, furtherUpdate: e.target.value })}
              placeholder="Next step / notes"
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <button type="submit" className="btn btn-primary" style={{ borderRadius: 99, minHeight: 40 }}>
              + Add Entry
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ borderRadius: 99, minHeight: 40 }}
              onClick={resetForm}
            >
              Clear
            </button>
          </div>
        </form>
      )}

      <div className="datasheet-scroll">
        <table className="datasheet-table">
          <thead>
            <tr>
              {[
                'SL No',
                'Name',
                'Number',
                'Company',
                'Process',
                'Recruiter',
                'Rounds',
                'Further Update',
                'Source',
                ...(canEdit ? ['Action'] : []),
              ].map((h) => (
                <th key={h} style={{ textAlign: h === 'Action' ? 'center' : 'left' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={canEdit ? 10 : 9}
                  style={{ padding: 28, textAlign: 'center', color: 'var(--text-secondary)' }}
                >
                  <div style={{ fontWeight: 800, marginBottom: 6, color: 'var(--text-primary)' }}>
                    No walk-in / selection entries yet
                  </div>
                  <div style={{ fontSize: 13 }}>
                    When employees mark Response / Follow-up as walk-in or selected on Targets, those
                    candidates appear here automatically.
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((row) => {
                const rid = row.id || row._id;
                const isEditing = editingId === rid && editForm;
                if (isEditing) {
                  return (
                    <tr key={rid} className="datasheet-entry-row datasheet-editing-row">
                      <td style={{ fontWeight: 800, color: 'var(--text-muted)', padding: '10px 14px' }}>
                        {row.displaySl}
                      </td>
                      <td>
                        <input
                          className="cell-input"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value.toUpperCase() })}
                        />
                      </td>
                      <td>
                        <input
                          className="cell-input"
                          value={editForm.number}
                          onChange={(e) => setEditForm({ ...editForm, number: e.target.value })}
                        />
                      </td>
                      <td>
                        <select
                          className="cell-select"
                          value={
                            COMPANY_OPTIONS.includes(editForm.company)
                              ? editForm.company
                              : editForm.company || 'Select Company'
                          }
                          onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                        >
                          {COMPANY_OPTIONS.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          className="cell-input"
                          value={editForm.process}
                          onChange={(e) => setEditForm({ ...editForm, process: e.target.value })}
                          disabled={editForm.source === 'sheet'}
                          title={editForm.source === 'sheet' ? 'Derived from sheet stages' : ''}
                        />
                      </td>
                      <td>
                        <select
                          className="cell-select"
                          value={editForm.recruiterName}
                          onChange={(e) => setEditForm({ ...editForm, recruiterName: e.target.value })}
                        >
                          <option value="">Select Recruiter</option>
                          {recruiters.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          className="cell-input"
                          value={editForm.rounds}
                          onChange={(e) => setEditForm({ ...editForm, rounds: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          className="cell-input"
                          value={editForm.furtherUpdate}
                          onChange={(e) => setEditForm({ ...editForm, furtherUpdate: e.target.value })}
                        />
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 11, fontWeight: 700 }}>
                        {editForm.source === 'sheet' ? 'Sheet' : 'HR'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="datasheet-row-actions">
                          <button
                            type="button"
                            className="datasheet-action-btn datasheet-action-save"
                            onClick={saveEdit}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className="datasheet-action-btn datasheet-action-cancel"
                            onClick={cancelEdit}
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                const cell = (v) => (
                  <td
                    style={{
                      padding: '10px 12px',
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {v || '—'}
                  </td>
                );

                return (
                  <tr key={rid}>
                    <td style={{ fontWeight: 800, color: 'var(--text-muted)', padding: '10px 14px' }}>
                      {row.displaySl}
                    </td>
                    {cell(row.name)}
                    {cell(row.number)}
                    {cell(row.company)}
                    {cell(row.process)}
                    {cell(row.recruiterName)}
                    {cell(row.rounds)}
                    {cell(row.furtherUpdate)}
                    <td style={{ padding: '10px 12px' }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: 99,
                          background: row.source === 'sheet' ? '#ECFDF5' : '#EEF2FF',
                          color: row.source === 'sheet' ? '#047857' : '#4338CA',
                        }}
                      >
                        {row.source === 'sheet' ? 'Employee sheet' : 'HR added'}
                      </span>
                    </td>
                    {canEdit && (
                      <td style={{ textAlign: 'center' }}>
                        <div className="datasheet-row-actions">
                          <button
                            type="button"
                            className="datasheet-action-btn datasheet-action-edit"
                            onClick={() => startEdit(row)}
                          >
                            Edit
                          </button>
                          {row.source !== 'sheet' && (
                            <button
                              type="button"
                              className="datasheet-action-btn datasheet-action-delete"
                              onClick={() => removeRow(row)}
                            >
                              Del
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
