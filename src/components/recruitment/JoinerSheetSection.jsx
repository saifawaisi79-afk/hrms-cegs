'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getRecruiters } from '@/lib/nav';

const GLOBAL_API_BASE = '/api';

const COMPANY_TABS = [
  'ALL',
  'ALTRUIST',
  'ONE POINT ONE',
  'STARTEK',
  'TRIO',
  'ISON',
  'RADICAL MINDS',
];

const WEEK_KEYS = ['week1', 'week2', 'week3', 'week4', 'week5', 'week6', 'week7', 'week8'];

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

function dupKey(name, phone) {
  return `${String(name || '').trim().toLowerCase()}|${String(phone || '').replace(/\D/g, '')}`;
}

function mapJoinedCandidate(cand, index) {
  const id = cand.id || cand._id;
  return {
    id: `sheet_${id}`,
    source: 'sheet',
    candidateId: String(id),
    slNo: cand.slNo || index + 1,
    name: cand.name || '',
    phone: cand.number || '',
    process: cand.company || '',
    recruiterName: cand.employee || '',
    dateOfJoining: '',
    billingDate: '',
    employeeCode: '',
    interviewDate: '',
    week1: '',
    week2: '',
    week3: '',
    week4: '',
    week5: '',
    week6: '',
    week7: '',
    week8: '',
    rawDate: cand.date || '',
  };
}

/**
 * Joiner Sheet — Google Sheets style (SL, Name, Phone, Process, DOJ, Billing,
 * Emp ID, Interview date, Recruiter, Week 1–8 follow-ups).
 * Auto from Targets “joined” rows: SL, Name, Phone, Process, Recruiter.
 */
export function JoinerSheetSection({ db, user, canEdit = true, employeeFilter = 'ALL' }) {
  const [overlays, setOverlays] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [companyTab, setCompanyTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('Ready');
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);

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
      const [jRes, cRes] = await Promise.all([
        fetch(`${GLOBAL_API_BASE}/joiners`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${GLOBAL_API_BASE}/candidates`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (jRes.ok) {
        const data = await jRes.json();
        setOverlays(Array.isArray(data) ? data : []);
      }
      let fromApi = [];
      if (cRes.ok) {
        const data = await cRes.json();
        fromApi = Array.isArray(data) ? data : [];
      }
      const fromDb = Array.isArray(db?.candidates) ? db.candidates : [];
      const byId = new Map();
      [...fromDb, ...fromApi].forEach((c) => {
        const id = String(c.id || c._id || '');
        if (id) byId.set(id, c);
      });
      setCandidates([...byId.values()]);
      setStatus('Synced');
    } catch {
      setCandidates(Array.isArray(db?.candidates) ? db.candidates : []);
      setStatus('Offline');
    }
  }, [db?.candidates]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (Array.isArray(db?.candidates)) {
      setCandidates((prev) => {
        const byId = new Map();
        [...prev, ...db.candidates].forEach((c) => {
          const id = String(c.id || c._id || '');
          if (id) byId.set(id, c);
        });
        return [...byId.values()];
      });
    }
  }, [db?.candidates]);

  const overlayByCand = useMemo(() => {
    const m = new Map();
    overlays.forEach((r) => {
      if (r.candidateId) m.set(String(r.candidateId), r);
    });
    return m;
  }, [overlays]);

  const sheetRows = useMemo(() => {
    let list = candidates.filter(isJoinedCandidate);
    if (employeeFilter && employeeFilter !== 'ALL') {
      const emp = String(employeeFilter).trim().toLowerCase();
      list = list.filter((c) => String(c.employee || '').trim().toLowerCase() === emp);
    }
    return list.map((c, i) => {
      const base = mapJoinedCandidate(c, i);
      const ov = overlayByCand.get(String(base.candidateId));
      if (!ov) return base;
      return {
        ...base,
        process: ov.process || base.process,
        dateOfJoining: ov.dateOfJoining || '',
        billingDate: ov.billingDate || '',
        employeeCode: ov.employeeCode || '',
        interviewDate: ov.interviewDate || '',
        recruiterName: ov.recruiterName || base.recruiterName,
        week1: ov.week1 || '',
        week2: ov.week2 || '',
        week3: ov.week3 || '',
        week4: ov.week4 || '',
        week5: ov.week5 || '',
        week6: ov.week6 || '',
        week7: ov.week7 || '',
        week8: ov.week8 || '',
        name: ov.name || base.name,
        phone: ov.phone || base.phone,
        overlayId: ov.id || ov._id,
      };
    });
  }, [candidates, overlayByCand, employeeFilter]);

  const manualOnly = useMemo(() => {
    const keys = new Set(sheetRows.map((r) => dupKey(r.name, r.phone)));
    const ids = new Set(sheetRows.map((r) => String(r.candidateId)));
    return overlays
      .filter((r) => !r.candidateId || !ids.has(String(r.candidateId)))
      .filter((r) => !keys.has(dupKey(r.name, r.phone)))
      .map((r) => ({
        ...r,
        id: r.id || r._id,
        source: 'manual',
        phone: r.phone || '',
      }));
  }, [overlays, sheetRows]);

  const allRows = useMemo(() => {
    const merged = [...sheetRows, ...manualOnly];
    return merged.map((r, i) => ({ ...r, displaySl: i + 1 }));
  }, [sheetRows, manualOnly]);

  const filtered = useMemo(() => {
    return allRows.filter((r) => {
      if (companyTab !== 'ALL') {
        const p = String(r.process || '').toUpperCase();
        if (!p.includes(companyTab)) return false;
      }
      const q = search.toLowerCase().trim();
      if (!q) return true;
      return (
        String(r.name || '').toLowerCase().includes(q) ||
        String(r.phone || '').includes(q) ||
        String(r.process || '').toLowerCase().includes(q) ||
        String(r.recruiterName || '').toLowerCase().includes(q) ||
        String(r.employeeCode || '').toLowerCase().includes(q)
      );
    });
  }, [allRows, companyTab, search]);

  const tabCounts = useMemo(() => {
    const counts = { ALL: allRows.length };
    COMPANY_TABS.slice(1).forEach((c) => {
      counts[c] = allRows.filter((r) =>
        String(r.process || '').toUpperCase().includes(c)
      ).length;
    });
    return counts;
  }, [allRows]);

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('cegs_token') || ''}`,
  });

  const startEdit = (row) => {
    if (!canEdit) return;
    setEditingId(row.id || row._id);
    setEditForm({
      name: row.name || '',
      phone: row.phone || '',
      process: row.process || '',
      dateOfJoining: row.dateOfJoining || '',
      billingDate: row.billingDate || '',
      employeeCode: row.employeeCode || '',
      interviewDate: row.interviewDate || '',
      recruiterName: row.recruiterName || '',
      week1: row.week1 || '',
      week2: row.week2 || '',
      week3: row.week3 || '',
      week4: row.week4 || '',
      week5: row.week5 || '',
      week6: row.week6 || '',
      week7: row.week7 || '',
      week8: row.week8 || '',
      candidateId: row.candidateId || '',
      overlayId: row.overlayId || (row.source === 'manual' ? row.id || row._id : ''),
      source: row.source,
    });
    setError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
    setError('');
  };

  const saveEdit = async () => {
    if (!canEdit || !editForm) return;
    if (!editForm.name.trim()) {
      setError('Name is required.');
      return;
    }
    setStatus('Saving...');
    const payload = {
      name: editForm.name.trim().toUpperCase(),
      phone: editForm.phone.trim(),
      process: editForm.process.trim(),
      dateOfJoining: editForm.dateOfJoining.trim(),
      billingDate: editForm.billingDate.trim(),
      employeeCode: editForm.employeeCode.trim(),
      interviewDate: editForm.interviewDate.trim(),
      recruiterName: editForm.recruiterName.trim(),
      week1: editForm.week1,
      week2: editForm.week2,
      week3: editForm.week3,
      week4: editForm.week4,
      week5: editForm.week5,
      week6: editForm.week6,
      week7: editForm.week7,
      week8: editForm.week8,
      candidateId: editForm.candidateId || '',
      createdBy: user?.name || '',
    };

    try {
      if (editForm.candidateId || !editForm.overlayId) {
        const res = await fetch(`${GLOBAL_API_BASE}/joiners`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setError(err.error || 'Failed to save.');
          setStatus('Error');
          return;
        }
        const saved = await res.json();
        setOverlays((prev) => {
          const without = prev.filter(
            (r) =>
              String(r.candidateId || '') !== String(editForm.candidateId) &&
              String(r.id || r._id) !== String(saved.id || saved._id)
          );
          return [...without, saved];
        });
        if (editForm.candidateId && payload.process) {
          await fetch(`${GLOBAL_API_BASE}/candidates/${editForm.candidateId}`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify({ company: payload.process }),
          }).catch(() => {});
        }
      } else {
        const res = await fetch(`${GLOBAL_API_BASE}/joiners/${editForm.overlayId}`, {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setError(err.error || 'Failed to update.');
          setStatus('Error');
          return;
        }
        const data = await res.json();
        const updated = data.entry || { ...payload, id: editForm.overlayId };
        setOverlays((prev) =>
          prev.map((r) =>
            String(r.id || r._id) === String(editForm.overlayId) ? { ...r, ...updated } : r
          )
        );
      }
      cancelEdit();
      setStatus('Synced');
    } catch {
      setError('Network error while saving.');
      setStatus('Error');
    }
  };

  const cell = (v) => (
    <td
      style={{
        padding: '8px 10px',
        fontSize: 12,
        fontWeight: 600,
        color: v ? '#0f172a' : '#94a3b8',
        whiteSpace: 'nowrap',
      }}
    >
      {v || '—'}
    </td>
  );

  const headerStyle = {
    background: '#1e40af',
    color: '#fff',
    fontSize: 11,
    fontWeight: 800,
    padding: '10px 8px',
    whiteSpace: 'nowrap',
    position: 'sticky',
    top: 0,
    zIndex: 1,
  };

  return (
    <div
      className="recruitment-page-card glass-card"
      style={{ borderRadius: 24, padding: 24, width: '100%' }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 14,
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
            Joiners Sheet
          </h3>
          <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', marginTop: 2 }}>
            Candidates marked <strong>joined</strong> on Targets · auto: SL / Name / Phone / Process /
            Recruiter · HR fills DOJ, billing, emp code, interview date &amp; Week 1–8 ·{' '}
            <span style={{ color: status.includes('Error') ? '#B45309' : '#059669' }}>{status}</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
            placeholder="Search name, phone, recruiter..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Company tabs like Google Sheet (ISON, …) */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {COMPANY_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setCompanyTab(tab)}
            style={{
              borderRadius: 8,
              padding: '7px 14px',
              fontSize: 12,
              fontWeight: 800,
              border: companyTab === tab ? '2px solid #1e40af' : '1px solid #E5E7EB',
              background: companyTab === tab ? '#1e40af' : '#F8FAFC',
              color: companyTab === tab ? '#fff' : '#334155',
              cursor: 'pointer',
            }}
          >
            {tab === 'ALL' ? 'All Companies' : tab} ({tabCounts[tab] || 0})
          </button>
        ))}
      </div>

      {error && (
        <div
          role="alert"
          style={{
            marginBottom: 12,
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

      <div className="datasheet-scroll" style={{ maxHeight: '70vh' }}>
        <table className="datasheet-table" style={{ minWidth: 1400 }}>
          <thead>
            <tr>
              {[
                'SL.NO',
                'Name',
                'Phone Number',
                'Process',
                'Date of Joining',
                'Billing Date',
                'Employee ID/Code',
                'Interview date',
                'Recruiter Name',
                'Week 1 followup',
                'Week 2 followup',
                'Week 3 followup',
                'Week 4 followup',
                'Week 5 followup',
                'Week 6 followup',
                'Week 7 followup',
                'Week 8 followup',
                ...(canEdit ? ['Action'] : []),
              ].map((h) => (
                <th key={h} style={{ ...headerStyle, textAlign: h === 'Action' ? 'center' : 'left' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={canEdit ? 18 : 17}
                  style={{ padding: 32, textAlign: 'center', color: '#64748B' }}
                >
                  <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
                    No joiners yet{companyTab !== 'ALL' ? ` for ${companyTab}` : ''}
                  </div>
                  <div style={{ fontSize: 13 }}>
                    When employees mark Response / Follow-up as <strong>joined</strong> on Targets,
                    those candidates appear here automatically.
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((row, idx) => {
                const rid = row.id || row._id;
                const isEditing = editingId === rid && editForm;

                if (isEditing) {
                  const inp = (key, placeholder = '') => (
                    <input
                      className="cell-input"
                      style={{ minWidth: 90 }}
                      value={editForm[key] || ''}
                      placeholder={placeholder}
                      onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                    />
                  );
                  return (
                    <tr key={rid} className="datasheet-entry-row datasheet-editing-row">
                      <td style={{ fontWeight: 800, padding: '8px 10px', color: '#64748B' }}>
                        {idx + 1}
                      </td>
                      <td>{inp('name', 'NAME')}</td>
                      <td>{inp('phone', 'Phone')}</td>
                      <td>
                        <select
                          className="cell-select"
                          value={editForm.process || ''}
                          onChange={(e) => setEditForm({ ...editForm, process: e.target.value })}
                        >
                          <option value="">Select Process</option>
                          {COMPANY_TABS.slice(1).map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                          {editForm.process && !COMPANY_TABS.includes(editForm.process) ? (
                            <option value={editForm.process}>{editForm.process}</option>
                          ) : null}
                        </select>
                      </td>
                      <td>{inp('dateOfJoining', 'DD/MM/YY')}</td>
                      <td>{inp('billingDate', 'DD/MM/YY')}</td>
                      <td>{inp('employeeCode', 'Emp code')}</td>
                      <td>{inp('interviewDate', 'DD/MM/YY')}</td>
                      <td>
                        <select
                          className="cell-select"
                          value={editForm.recruiterName || ''}
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
                      {WEEK_KEYS.map((wk) => (
                        <td key={wk}>{inp(wk, wk.replace('week', 'W'))}</td>
                      ))}
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

                return (
                  <tr key={rid}>
                    <td style={{ fontWeight: 800, padding: '8px 10px', color: '#64748B' }}>
                      {idx + 1}
                    </td>
                    {cell(row.name)}
                    {cell(row.phone)}
                    {cell(row.process)}
                    {cell(row.dateOfJoining)}
                    {cell(row.billingDate)}
                    {cell(row.employeeCode)}
                    {cell(row.interviewDate)}
                    {cell(row.recruiterName)}
                    {WEEK_KEYS.map((wk) => cell(row[wk]))}
                    {canEdit && (
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="datasheet-action-btn datasheet-action-edit"
                          onClick={() => startEdit(row)}
                        >
                          Edit
                        </button>
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
