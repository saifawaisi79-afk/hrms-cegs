'use client';

import { useEffect, useMemo, useState } from 'react';
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

/**
 * HR Walk-ins & Selections register — separate from Targets KPI datasheets.
 */
export function WalkinsSelectionsSection({ db, user, canEdit = true }) {
  const [rows, setRows] = useState([]);
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

  const load = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('cegs_token') : null;
    if (!token) {
      setStatus('Login required');
      return;
    }
    try {
      const res = await fetch(`${GLOBAL_API_BASE}/walkin-selections`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRows(Array.isArray(data) ? data : []);
        setStatus('Synced');
      } else {
        setStatus('Sync error');
      }
    } catch {
      setStatus('Offline');
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      String(r.name || '').toLowerCase().includes(q) ||
      String(r.number || '').includes(q) ||
      String(r.company || '').toLowerCase().includes(q) ||
      String(r.recruiterName || '').toLowerCase().includes(q) ||
      String(r.process || '').toLowerCase().includes(q)
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
      slNo: rows.length + 1,
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
      setRows((prev) => [...prev, saved]);
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
    if (!editForm.recruiterName) {
      setError('Recruiter is required.');
      return;
    }

    const token = localStorage.getItem('cegs_token');
    if (!token) {
      setError('Session expired. Log in again.');
      return;
    }

    setStatus('Saving...');
    const payload = {
      ...editForm,
      name: editForm.name.trim().toUpperCase(),
      company: editForm.company === 'Select Company' ? '' : editForm.company,
    };

    try {
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
      setRows((prev) =>
        prev.map((r) => (String(r.id || r._id) === String(editingId) ? { ...r, ...updated } : r))
      );
      cancelEdit();
      setStatus('Synced');
    } catch {
      setError('Network error while updating.');
      setStatus('Error');
    }
  };

  const removeRow = async (id) => {
    if (!canEdit) return;
    if (!window.confirm('Delete this walk-in / selection entry?')) return;
    const token = localStorage.getItem('cegs_token');
    if (!token) return;
    try {
      await fetch(`${GLOBAL_API_BASE}/walkin-selections/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setRows((prev) => prev.filter((r) => String(r.id || r._id) !== String(id)));
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
            Track scheduled walk-ins and selection updates ·{' '}
            <span style={{ color: status.includes('Error') ? '#B45309' : '#059669' }}>{status}</span>
          </p>
        </div>
        <input
          className="form-input"
          style={{ borderRadius: 99, padding: '8px 16px', fontSize: 12, width: 220, minHeight: 40 }}
          placeholder="Search name, phone, company..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search walk-ins"
        />
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
              {['SL No', 'Name', 'Number', 'Company', 'Process', 'Recruiter', 'Rounds', 'Further Update', ...(canEdit ? ['Action'] : [])].map(
                (h) => (
                  <th key={h} style={{ textAlign: h === 'Action' ? 'center' : 'left' }}>
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 9 : 8} style={{ padding: 28, textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <div style={{ fontWeight: 800, marginBottom: 6, color: 'var(--text-primary)' }}>
                    No walk-in / selection entries yet
                  </div>
                  <div style={{ fontSize: 13 }}>Add a candidate walk-in scheduled by a CEGS recruiter.</div>
                </td>
              </tr>
            ) : (
              filtered.map((row, idx) => {
                const rid = row.id || row._id;
                const isEditing = editingId === rid && editForm;
                if (isEditing) {
                  return (
                    <tr key={rid} className="datasheet-entry-row datasheet-editing-row">
                      <td style={{ fontWeight: 800, color: 'var(--text-muted)', padding: '10px 14px' }}>
                        {row.slNo || idx + 1}
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
                      <td style={{ textAlign: 'center' }}>
                        <div className="datasheet-row-actions">
                          <button type="button" className="datasheet-action-btn datasheet-action-save" onClick={saveEdit}>
                            Save
                          </button>
                          <button type="button" className="datasheet-action-btn datasheet-action-cancel" onClick={cancelEdit}>
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
                      {row.slNo || idx + 1}
                    </td>
                    {cell(row.name)}
                    {cell(row.number)}
                    {cell(row.company)}
                    {cell(row.process)}
                    {cell(row.recruiterName)}
                    {cell(row.rounds)}
                    {cell(row.furtherUpdate)}
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
                          <button
                            type="button"
                            className="datasheet-action-btn datasheet-action-delete"
                            onClick={() => removeRow(rid)}
                          >
                            Del
                          </button>
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
