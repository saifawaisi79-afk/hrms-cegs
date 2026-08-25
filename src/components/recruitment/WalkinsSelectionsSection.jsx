'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  todayIsoDate,
  formatSheetDateDisplay,
  normalizeCandidateDate,
  matchesSheetDate,
} from '@/lib/candidate-dates';
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
  hrStatus: 'selected',
};

function sheetText(cand) {
  return `${cand?.response || ''} ${cand?.followUp1 || ''} ${cand?.followUp2 || ''} ${cand?.followUp3 || ''} ${cand?.category || ''} ${cand?.callStatus || ''}`
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function isWalkinCandidate(cand) {
  const text = sheetText(cand);
  const cat = String(cand?.category || '').toLowerCase();
  return (
    /walk\s*-?\s*in/.test(text) ||
    text.includes('walkin') ||
    text.includes('visited') ||
    cat === 'walkins'
  );
}

function isSelectedOnSheet(cand) {
  const text = sheetText(cand);
  const cat = String(cand?.category || '').toLowerCase();
  return text.includes('selected') || text.includes('hired') || cat === 'selected';
}

function isRejectedOnSheet(cand) {
  const text = sheetText(cand);
  const status = String(cand?.callStatus || '').toLowerCase();
  return status.includes('reject') || text.includes('reject') || text.includes('rejected');
}

/** Pull into HR register: walk-in, selected, or rejected from employee sheets. */
export function isWalkinOrSelectedCandidate(cand) {
  return isWalkinCandidate(cand) || isSelectedOnSheet(cand) || isRejectedOnSheet(cand);
}

function dupKey(name, number) {
  return `${String(name || '').trim().toLowerCase()}|${String(number || '').replace(/\D/g, '')}`;
}

/** Identity only from employee sheet — process / rounds / further update left for HR. */
function mapCandidateToRow(cand, index) {
  const id = cand.id || cand._id;
  return {
    id: `sheet_${id}`,
    _id: `sheet_${id}`,
    source: 'sheet',
    candidateId: String(id),
    slNo: cand.slNo || index + 1,
    name: cand.name || '',
    number: cand.number || '',
    company: cand.company || '',
    process: '',
    recruiterName: cand.employee || '',
    rounds: '',
    furtherUpdate: '',
    hrStatus: '',
    date: cand.date || '',
    raw: cand,
  };
}

function bucketOf(row) {
  const status = String(row.hrStatus || '').toLowerCase();
  if (status === 'rejected') return 'rejected';
  if (status === 'selected') return 'selected';
  if (row.raw && isRejectedOnSheet(row.raw)) return 'rejected';
  // Walk-ins + selected sheet tags land in Selected until HR marks Rejected
  return 'selected';
}

/**
 * HR Walk-ins & Selections — date-wise Selected / Rejected register.
 * Sheet auto-fills: SL No, Name, Number, Company, Recruiter only.
 */
export function WalkinsSelectionsSection({ db, user, canEdit = true }) {
  const [manualRows, setManualRows] = useState([]);
  const [sheetCandidates, setSheetCandidates] = useState([]);
  const [sheetDate, setSheetDate] = useState(() => todayIsoDate());
  const [section, setSection] = useState('selected'); // selected | rejected
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
            source: r.candidateId ? 'overlay' : 'manual',
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
      const byId = new Map();
      [...fromDb, ...fromApi].forEach((c) => {
        const id = String(c.id || c._id || '');
        if (id) byId.set(id, c);
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

  const overlayByCandidate = useMemo(() => {
    const map = new Map();
    manualRows.forEach((r) => {
      if (r.candidateId) map.set(String(r.candidateId), r);
    });
    return map;
  }, [manualRows]);

  const sheetRows = useMemo(() => {
    return sheetCandidates
      .filter(isWalkinOrSelectedCandidate)
      .filter((c) => matchesSheetDate(c, sheetDate))
      .map((c, i) => {
        const base = mapCandidateToRow(c, i);
        const overlay = overlayByCandidate.get(String(base.candidateId));
        if (!overlay) return base;
        return {
          ...base,
          // Keep identity from sheet; HR fields from overlay
          company: base.company || overlay.company || '',
          process: overlay.process || '',
          rounds: overlay.rounds || '',
          furtherUpdate: overlay.furtherUpdate || '',
          hrStatus: overlay.hrStatus || '',
          overlayId: overlay.id || overlay._id,
        };
      });
  }, [sheetCandidates, sheetDate, overlayByCandidate]);

  const manualOnlyRows = useMemo(() => {
    const sheetKeys = new Set(sheetRows.map((r) => dupKey(r.name, r.number)));
    const sheetCandIds = new Set(sheetRows.map((r) => String(r.candidateId)));
    return manualRows
      .filter((r) => !r.candidateId || !sheetCandIds.has(String(r.candidateId)))
      .filter((r) => !sheetKeys.has(dupKey(r.name, r.number)))
      .filter((r) => {
        const d = normalizeCandidateDate(r.date);
        if (!d) return true; // legacy undated HR rows show on every day
        return d === normalizeCandidateDate(sheetDate);
      })
      .map((r) => ({
        ...r,
        source: 'manual',
        process: r.process || '',
        rounds: r.rounds || '',
        furtherUpdate: r.furtherUpdate || '',
        hrStatus: r.hrStatus || 'selected',
      }));
  }, [manualRows, sheetRows, sheetDate]);

  const allRows = useMemo(() => {
    const merged = [...sheetRows, ...manualOnlyRows];
    return merged.map((r, i) => ({ ...r, displaySl: i + 1, bucket: bucketOf(r) }));
  }, [sheetRows, manualOnlyRows]);

  const selectedRows = useMemo(
    () => allRows.filter((r) => r.bucket === 'selected'),
    [allRows]
  );
  const rejectedRows = useMemo(
    () => allRows.filter((r) => r.bucket === 'rejected'),
    [allRows]
  );

  const sectionRows = section === 'rejected' ? rejectedRows : selectedRows;

  const filtered = sectionRows.filter((r) => {
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

  const authHeaders = () => {
    const token = localStorage.getItem('cegs_token');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
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
    if (!form.recruiterName) {
      setError('Select the CEGS recruiter who scheduled the walk-in.');
      return;
    }
    if (!form.company || form.company === 'Select Company') {
      setError('Select a company.');
      return;
    }

    if (!localStorage.getItem('cegs_token')) {
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
      hrStatus: form.hrStatus || section,
      date: formatSheetDateDisplay(sheetDate),
      createdBy: user?.name || '',
    };

    try {
      const res = await fetch(`${GLOBAL_API_BASE}/walkin-selections`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || 'Failed to save entry.');
        setStatus('Error');
        return;
      }
      const saved = await res.json();
      setManualRows((prev) => [
        ...prev,
        { ...saved, source: 'manual', id: saved.id || saved._id },
      ]);
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
      hrStatus: row.hrStatus || row.bucket || 'selected',
      source: row.source,
      candidateId: row.candidateId || '',
      overlayId: row.overlayId || (row.source === 'manual' ? row.id || row._id : ''),
      date: row.date || formatSheetDateDisplay(sheetDate),
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
    if (!localStorage.getItem('cegs_token')) {
      setError('Session expired. Log in again.');
      return;
    }

    setStatus('Saving...');
    const hrPayload = {
      name: editForm.name.trim().toUpperCase(),
      number: editForm.number,
      company: editForm.company === 'Select Company' ? '' : editForm.company,
      process: editForm.process || '',
      recruiterName: editForm.recruiterName || '',
      rounds: editForm.rounds || '',
      furtherUpdate: editForm.furtherUpdate || '',
      hrStatus: editForm.hrStatus || 'selected',
      date: editForm.date || formatSheetDateDisplay(sheetDate),
      candidateId: editForm.candidateId || '',
    };

    try {
      if (editForm.candidateId) {
        // Upsert HR overlay for sheet-sourced row (process / rounds / status)
        const res = await fetch(`${GLOBAL_API_BASE}/walkin-selections`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(hrPayload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setError(err.error || 'Failed to save HR fields.');
          setStatus('Error');
          return;
        }
        const saved = await res.json();
        setManualRows((prev) => {
          const without = prev.filter(
            (r) => String(r.candidateId || '') !== String(editForm.candidateId)
          );
          return [
            ...without,
            { ...saved, source: 'overlay', id: saved.id || saved._id },
          ];
        });

        // Also persist company on the Targets candidate when HR fills it
        if (hrPayload.company) {
          await fetch(`${GLOBAL_API_BASE}/candidates/${editForm.candidateId}`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify({ company: hrPayload.company }),
          }).catch(() => {});
          setSheetCandidates((prev) =>
            prev.map((c) =>
              String(c.id || c._id) === String(editForm.candidateId)
                ? { ...c, company: hrPayload.company }
                : c
            )
          );
        }
      } else if (editForm.overlayId) {
        const res = await fetch(
          `${GLOBAL_API_BASE}/walkin-selections/${editForm.overlayId}`,
          {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify(hrPayload),
          }
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setError(err.error || 'Failed to update.');
          setStatus('Error');
          return;
        }
        const data = await res.json();
        const updated = data.entry || { ...hrPayload, id: editForm.overlayId };
        setManualRows((prev) =>
          prev.map((r) =>
            String(r.id || r._id) === String(editForm.overlayId)
              ? { ...r, ...updated, source: 'manual' }
              : r
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
    if (row.source === 'sheet' && !row.overlayId) {
      setError(
        'Sheet rows stay while walk-in/selected is on the employee Targets sheet. Mark Rejected via Edit, or clear walk-in on their datasheet.'
      );
      return;
    }
    const id = row.overlayId || (row.source === 'manual' ? row.id || row._id : null);
    if (!id || String(id).startsWith('sheet_')) {
      setError('Cannot delete sheet-linked identity here.');
      return;
    }
    if (!window.confirm('Delete this HR entry / notes?')) return;
    const token = localStorage.getItem('cegs_token');
    if (!token) return;
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

  const cardStyle = (active, tone) => ({
    flex: '1 1 180px',
    minWidth: 160,
    borderRadius: 16,
    padding: '14px 16px',
    border: active ? `2px solid ${tone}` : '1px solid #E5E7EB',
    background: '#fff',
    cursor: 'pointer',
    boxShadow: active ? `0 4px 14px ${tone}33` : '0 1px 3px rgba(0,0,0,0.04)',
    textAlign: 'left',
  });

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
          marginBottom: 16,
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
            Date-wise register · sheet fills name/number/company/recruiter · HR fills process &amp;
            rounds ·{' '}
            <span style={{ color: status.includes('Error') ? '#B45309' : '#059669' }}>{status}</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              fontWeight: 800,
              color: '#64748B',
            }}
          >
            Sheet date
            <input
              type="date"
              className="form-input"
              style={{
                borderRadius: 99,
                padding: '8px 12px',
                fontSize: 12,
                width: 150,
                minHeight: 40,
              }}
              value={sheetDate}
              onChange={(e) => setSheetDate(e.target.value || todayIsoDate())}
              aria-label="Sheet date"
            />
          </label>
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
            style={{
              borderRadius: 99,
              padding: '8px 16px',
              fontSize: 12,
              width: 200,
              minHeight: 40,
            }}
            placeholder="Search name, phone, company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search walk-ins"
          />
        </div>
      </div>

      {/* Top counts — Selected / Rejected */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <button
          type="button"
          style={cardStyle(section === 'selected', '#10B981')}
          onClick={() => setSection('selected')}
        >
          <div style={{ fontSize: 11, fontWeight: 800, color: '#6B7280', letterSpacing: '0.04em' }}>
            SELECTED
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#111827', marginTop: 4 }}>
            {selectedRows.length}
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#059669', marginTop: 2 }}>
            Walk-ins &amp; selections · {formatSheetDateDisplay(sheetDate)}
          </div>
        </button>
        <button
          type="button"
          style={cardStyle(section === 'rejected', '#EF4444')}
          onClick={() => setSection('rejected')}
        >
          <div style={{ fontSize: 11, fontWeight: 800, color: '#6B7280', letterSpacing: '0.04em' }}>
            REJECTED
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#111827', marginTop: 4 }}>
            {rejectedRows.length}
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#DC2626', marginTop: 2 }}>
            Rejected for {formatSheetDateDisplay(sheetDate)}
          </div>
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setSection('selected')}
          style={{
            borderRadius: 99,
            padding: '8px 16px',
            fontSize: 12.5,
            fontWeight: 800,
            border: 'none',
            cursor: 'pointer',
            background: section === 'selected' ? '#10B981' : '#fff',
            color: section === 'selected' ? '#fff' : '#374151',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          Selected ({selectedRows.length})
        </button>
        <button
          type="button"
          onClick={() => setSection('rejected')}
          style={{
            borderRadius: 99,
            padding: '8px 16px',
            fontSize: 12.5,
            fontWeight: 800,
            border: 'none',
            cursor: 'pointer',
            background: section === 'rejected' ? '#EF4444' : '#fff',
            color: section === 'rejected' ? '#fff' : '#374151',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          Rejected ({rejectedRows.length})
        </button>
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 12,
            marginBottom: 20,
            padding: 16,
            background: '#F8FAFC',
            borderRadius: 16,
            border: '1px solid #E2E8F0',
          }}
        >
          <div style={{ gridColumn: '1 / -1', fontSize: 12, fontWeight: 700, color: '#64748B' }}>
            Optional HR-only entry for {formatSheetDateDisplay(sheetDate)} (employee walk-ins already
            appear below — edit a row to fill Process / Rounds)
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
            <label style={labelStyle}>Recruiter</label>
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
            <label style={labelStyle}>Section</label>
            <select
              style={inputStyle}
              value={form.hrStatus}
              onChange={(e) => setForm({ ...form, hrStatus: e.target.value })}
            >
              <option value="selected">Selected</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Process</label>
            <input
              style={inputStyle}
              value={form.process}
              onChange={(e) => setForm({ ...form, process: e.target.value })}
              placeholder="HR enters"
            />
          </div>
          <div>
            <label style={labelStyle}>Rounds</label>
            <input
              style={inputStyle}
              value={form.rounds}
              onChange={(e) => setForm({ ...form, rounds: e.target.value })}
              placeholder="HR enters"
            />
          </div>
          <div>
            <label style={labelStyle}>Further Update</label>
            <input
              style={inputStyle}
              value={form.furtherUpdate}
              onChange={(e) => setForm({ ...form, furtherUpdate: e.target.value })}
              placeholder="HR enters"
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
                'Date',
                'Name',
                'Number',
                'Company',
                'Recruiter',
                'Process',
                'Rounds',
                'Further Update',
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
                    No {section} entries for {formatSheetDateDisplay(sheetDate)}
                  </div>
                  <div style={{ fontSize: 13 }}>
                    Change sheet date, or wait for employees to log walk-in / selected on Targets.
                  </div>
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
                        {idx + 1}
                      </td>
                      <td>
                        <input
                          className="cell-input"
                          value={editForm.date || ''}
                          onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          className="cell-input"
                          value={editForm.name}
                          onChange={(e) =>
                            setEditForm({ ...editForm, name: e.target.value.toUpperCase() })
                          }
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
                        <select
                          className="cell-select"
                          value={editForm.recruiterName}
                          onChange={(e) =>
                            setEditForm({ ...editForm, recruiterName: e.target.value })
                          }
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
                          value={editForm.process}
                          onChange={(e) => setEditForm({ ...editForm, process: e.target.value })}
                          placeholder="HR enters"
                        />
                      </td>
                      <td>
                        <input
                          className="cell-input"
                          value={editForm.rounds}
                          onChange={(e) => setEditForm({ ...editForm, rounds: e.target.value })}
                          placeholder="HR enters"
                        />
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <select
                            className="cell-select"
                            value={editForm.hrStatus}
                            onChange={(e) => setEditForm({ ...editForm, hrStatus: e.target.value })}
                          >
                            <option value="selected">Selected</option>
                            <option value="rejected">Rejected</option>
                          </select>
                          <input
                            className="cell-input"
                            value={editForm.furtherUpdate}
                            onChange={(e) =>
                              setEditForm({ ...editForm, furtherUpdate: e.target.value })
                            }
                            placeholder="Further update"
                          />
                        </div>
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

                const cell = (v, emptyHint) => (
                  <td
                    style={{
                      padding: '10px 12px',
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: v ? 'var(--text-primary)' : '#94A3B8',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {v || emptyHint || '—'}
                  </td>
                );

                return (
                  <tr key={rid}>
                    <td style={{ fontWeight: 800, color: 'var(--text-muted)', padding: '10px 14px' }}>
                      {idx + 1}
                    </td>
                    {cell(
                      normalizeCandidateDate(row.date)
                        ? formatSheetDateDisplay(normalizeCandidateDate(row.date))
                        : formatSheetDateDisplay(sheetDate)
                    )}
                    {cell(row.name)}
                    {cell(row.number)}
                    {cell(row.company)}
                    {cell(row.recruiterName)}
                    {cell(row.process, '—')}
                    {cell(row.rounds, '—')}
                    {cell(row.furtherUpdate, '—')}
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
                          {(row.source === 'manual' || row.overlayId) && (
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
