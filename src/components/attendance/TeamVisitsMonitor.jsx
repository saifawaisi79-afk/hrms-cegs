'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Car,
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  User,
  RefreshCw,
  X,
  ChevronDown,
  ChevronUp,
  MapPin,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { toIsoDate } from '@/lib/auto-absent';
import { getAuthToken, API_BASE } from '@/lib/auth-client';

/**
 * Format any time string into a clean 12-hour format without seconds (e.g. "02:35 PM" or "11:30 AM").
 */
export function formatVisitTime(str) {
  if (!str) return '—';
  const trimmed = String(str).trim();
  if (!trimmed) return '—';

  // If already formatted with AM/PM (e.g., "02:35:10 PM" or "11:30 AM")
  if (/am|pm/i.test(trimmed)) {
    return trimmed.replace(/:\d{2}(\s*[ap]m)/i, '$1');
  }

  // If ISO 8601 string (e.g., "2026-10-22T08:45:00.000Z")
  if (trimmed.includes('T')) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      let h = d.getHours();
      const m = d.getMinutes();
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
    }
  }

  // If 24h format (e.g., "14:35:10" or "09:15")
  const parts = trimmed.split(':');
  if (parts.length >= 2) {
    let h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (!isNaN(h) && !isNaN(m)) {
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
    }
  }

  return trimmed;
}

/**
 * Calculate duration between two time strings or dates in minutes.
 */
export function calcDurationDisplay(outTime, inTime) {
  if (!outTime) return null;
  const parseToMinutes = (t) => {
    if (!t) return null;
    if (t.includes('T')) {
      const d = new Date(t);
      if (!isNaN(d.getTime())) return d.getHours() * 60 + d.getMinutes();
    }
    const clean = String(t).trim();
    const isPm = /pm/i.test(clean);
    const isAm = /am/i.test(clean);
    const nums = clean.replace(/[^\d:]/g, '').split(':');
    if (nums.length >= 2) {
      let h = parseInt(nums[0], 10);
      const m = parseInt(nums[1], 10);
      if (isNaN(h) || isNaN(m)) return null;
      if (isPm && h < 12) h += 12;
      if (isAm && h === 12) h = 0;
      return h * 60 + m;
    }
    return null;
  };

  const startMin = parseToMinutes(outTime);
  const endMin = inTime ? parseToMinutes(inTime) : null;
  if (startMin === null || endMin === null) return null;
  let diff = endMin - startMin;
  if (diff < 0) diff += 24 * 60; // crossed midnight
  const hrs = Math.floor(diff / 60);
  const mins = diff % 60;
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
}

/**
 * Parse an attendance record into an array of distinct visit sessions.
 */
export function parseVisitSessions(rec) {
  if (!rec) return [];
  const logs = Array.isArray(rec.visit_logs) ? rec.visit_logs : [];

  const sessions = [];
  let openSession = null;

  logs.forEach((log) => {
    if (log.action === 'company_visit') {
      if (openSession) {
        sessions.push(openSession);
      }
      openSession = {
        outTime: log.time,
        inTime: null,
        outAt: log.at,
        inAt: null,
        remarks: log.remarks || 'Company Visit',
        status: 'out',
      };
    } else if (log.action === 'back_to_office') {
      if (openSession) {
        openSession.inTime = log.time;
        openSession.inAt = log.at;
        openSession.status = 'returned';
        if (log.remarks && log.remarks !== 'Back to Office') {
          openSession.remarks = `${openSession.remarks} • ${log.remarks}`;
        }
        sessions.push(openSession);
        openSession = null;
      } else {
        sessions.push({
          outTime: rec.company_visit_out_time || null,
          inTime: log.time,
          outAt: null,
          inAt: log.at,
          remarks: log.remarks || 'Back to Office',
          status: 'returned',
        });
      }
    }
  });

  if (openSession) {
    sessions.push(openSession);
  }

  // Fallback if logs array was empty but top-level fields were set
  if (sessions.length === 0 && (rec.company_visit_out_time || rec.visit_status === 'company_visit')) {
    sessions.push({
      outTime: rec.company_visit_out_time || null,
      inTime: rec.company_visit_in_time || null,
      status: rec.visit_status === 'company_visit' ? 'out' : 'returned',
      remarks: 'Company Visit',
    });
  }

  return sessions;
}

/**
 * Hook to extract and organize today's office visit records for all employees.
 */
export function useTeamOfficeVisits(db, targetDate = null) {
  const [syncedRecords, setSyncedRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const todayIso = useMemo(() => targetDate || toIsoDate(new Date()), [targetDate]);

  const refreshVisits = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) return;
      setLoading(true);
      const res = await fetch(`${API_BASE}/attendance`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setSyncedRecords(data);
        }
      }
    } catch (err) {
      console.error('refreshVisits error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshVisits();
    const handleAttendanceChange = () => {
      refreshVisits();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('hrms:attendance-update', handleAttendanceChange);
      return () => window.removeEventListener('hrms:attendance-update', handleAttendanceChange);
    }
  }, [refreshVisits]);

  // Merge db.attendance and syncedRecords
  const visitsList = useMemo(() => {
    const sourceList = syncedRecords.length > 0 ? syncedRecords : (db?.attendance || []);
    const userMap = new Map();
    (db?.users || []).forEach((u) => {
      if (u.id) userMap.set(String(u.id), u);
      if (u._id) userMap.set(String(u._id), u);
      if (u.employee_id) userMap.set(String(u.employee_id), u);
      if (u.email) userMap.set(String(u.email).toLowerCase(), u);
    });

    const results = [];

    sourceList.forEach((rec) => {
      const recDate = String(rec.date || '').slice(0, 10);
      if (recDate !== todayIso) return;

      const hasVisit =
        rec.visit_status === 'company_visit' ||
        rec.company_visit_out_time ||
        (Array.isArray(rec.visit_logs) && rec.visit_logs.length > 0);

      if (!hasVisit) return;

      const uid = rec.uid || rec.user_id || (typeof rec.user_id === 'object' ? rec.user_id?._id : null);
      const email = rec.email || rec.employee_email;
      const empId = rec.employee_id;

      const userObj =
        userMap.get(String(uid)) ||
        (email ? userMap.get(String(email).toLowerCase()) : null) ||
        (empId ? userMap.get(String(empId)) : null) ||
        (typeof rec.user_id === 'object' ? rec.user_id : null) ||
        {};

      const sessions = parseVisitSessions(rec);
      const isCurrentlyOut = rec.visit_status === 'company_visit';
      const lastSession = sessions[sessions.length - 1];

      // Primary departure time (when they went)
      const outTime = rec.company_visit_out_time || lastSession?.outTime || null;
      // Primary return time (when they came back)
      const inTime = !isCurrentlyOut ? (rec.company_visit_in_time || lastSession?.inTime || null) : null;

      results.push({
        id: rec.id || rec._id || `vis_${uid}`,
        uid: String(uid || ''),
        employeeName: userObj.name || rec.employee_name || 'Staff Member',
        employeeId: userObj.employee_id || rec.employee_id || '—',
        avatar: userObj.avatar || rec.avatar_url || null,
        department: userObj.department || userObj.title || rec.department_name || 'Staff',
        isCurrentlyOut,
        outTime,
        inTime,
        outTimeFormatted: formatVisitTime(outTime),
        inTimeFormatted: inTime ? formatVisitTime(inTime) : (isCurrentlyOut ? 'Still Away' : 'Returned'),
        duration: calcDurationDisplay(outTime, inTime),
        sessions,
        remarks: lastSession?.remarks || (isCurrentlyOut ? 'Company Visit' : 'Back to Office'),
        attendanceRecord: rec,
      });
    });

    // Sort: currently out first, then newest departure
    return results.sort((a, b) => {
      if (a.isCurrentlyOut && !b.isCurrentlyOut) return -1;
      if (!a.isCurrentlyOut && b.isCurrentlyOut) return 1;
      return String(b.outTime || '').localeCompare(String(a.outTime || ''));
    });
  }, [syncedRecords, db?.attendance, db?.users, todayIso]);

  const activeCount = useMemo(() => visitsList.filter((v) => v.isCurrentlyOut).length, [visitsList]);
  const returnedCount = useMemo(() => visitsList.filter((v) => !v.isCurrentlyOut).length, [visitsList]);

  return {
    visitsList,
    activeCount,
    returnedCount,
    totalCount: visitsList.length,
    loading,
    refreshVisits,
  };
}

/**
 * Full-width Live Office Visits Monitor section for HR Portal (Attendance Page).
 */
export function TeamVisitsSection({ db, currentUser, onRefresh }) {
  const { visitsList, activeCount, returnedCount, loading, refreshVisits } = useTeamOfficeVisits(db);
  const [expandedId, setExpandedId] = useState(null);
  const [filterQuery, setFilterQuery] = useState('');

  const filtered = useMemo(() => {
    if (!filterQuery.trim()) return visitsList;
    const q = filterQuery.toLowerCase();
    return visitsList.filter(
      (v) =>
        v.employeeName.toLowerCase().includes(q) ||
        v.department.toLowerCase().includes(q) ||
        v.employeeId.toLowerCase().includes(q) ||
        (v.remarks && v.remarks.toLowerCase().includes(q))
    );
  }, [visitsList, filterQuery]);

  return (
    <div
      className="card"
      style={{
        borderRadius: 20,
        padding: 24,
        marginBottom: 24,
        background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.95))',
        border: '1px solid rgba(226, 232, 240, 0.9)',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.04)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: activeCount > 0 ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' : 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: activeCount > 0 ? '0 4px 14px rgba(245, 158, 11, 0.35)' : '0 4px 14px rgba(59, 130, 246, 0.25)',
            }}
          >
            <Car size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Team Office &amp; Field Visits Today
              </h3>
              {activeCount > 0 && (
                <span
                  style={{
                    background: '#FEF3C7',
                    color: '#92400E',
                    border: '1px solid #FDE68A',
                    padding: '2px 10px',
                    borderRadius: 99,
                    fontSize: 11,
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#D97706', animation: 'pulse 1.5s infinite' }} />
                  {activeCount} Currently Away
                </span>
              )}
            </div>
            <p style={{ margin: '3px 0 0 0', fontSize: 12.5, fontWeight: 600, color: '#64748B' }}>
              Real-time monitoring: tracks exactly when employees go for company visits and when they come back
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="text"
            className="form-input"
            style={{ borderRadius: 99, padding: '7px 14px', fontSize: 12, minHeight: 36, width: 180 }}
            placeholder="Search staff visit..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-secondary"
            style={{ borderRadius: 99, padding: '7px 14px', fontSize: 12, minHeight: 36, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={() => refreshVisits()}
            disabled={loading}
            title="Refresh latest office visits"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'Refreshing…' : 'Sync'}</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Chips */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>Total Visits Logged:</span>
          <span style={{ fontSize: 14, fontWeight: 900, color: '#0F172A' }}>{visitsList.length}</span>
        </div>
        <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 12, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#92400E' }}>Currently Out on Visit:</span>
          <span style={{ fontSize: 14, fontWeight: 900, color: '#B45309' }}>{activeCount}</span>
        </div>
        <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 12, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#065F46' }}>Returned to Office:</span>
          <span style={{ fontSize: 14, fontWeight: 900, color: '#059669' }}>{returnedCount}</span>
        </div>
      </div>

      {/* Visits Table */}
      {filtered.length === 0 ? (
        <div style={{ background: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: 14, padding: '32px 16px', textAlign: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#F1F5F9', color: '#64748B', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
            <Building2 size={22} />
          </div>
          <div style={{ fontWeight: 800, fontSize: 14, color: '#334155' }}>
            {visitsList.length === 0 ? 'No employees on company visit today' : 'No matching staff visits found'}
          </div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
            {visitsList.length === 0
              ? 'All clocked-in staff are currently present in the office. When anyone marks an office visit, their departure and return times will appear here automatically.'
              : 'Try clearing your search query.'}
          </div>
        </div>
      ) : (
        <div className="tbl-wrap" style={{ border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden' }}>
          <table className="tbl" style={{ margin: 0 }}>
            <thead style={{ background: '#F8FAFC' }}>
              <tr>
                <th style={{ padding: '12px 16px' }}>Employee</th>
                <th style={{ padding: '12px 16px' }}>Current Status</th>
                <th style={{ padding: '12px 16px' }}>Went (Departure Time)</th>
                <th style={{ padding: '12px 16px' }}>Came Back (Return Time)</th>
                <th style={{ padding: '12px 16px' }}>Time Away</th>
                <th style={{ padding: '12px 16px' }}>Purpose / Remarks</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>History</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => {
                const isExpanded = expandedId === v.id;
                return (
                  <React.Fragment key={v.id}>
                    <tr style={{ background: v.isCurrentlyOut ? 'rgba(254, 243, 199, 0.25)' : '#FFFFFF' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {v.avatar ? (
                            <img src={v.avatar} alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#E2E8F0', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12 }}>
                              {v.employeeName.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: 800, fontSize: 13, color: '#0F172A' }}>{v.employeeName}</div>
                            <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>
                              {v.employeeId} · {v.department}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        {v.isCurrentlyOut ? (
                          <span
                            style={{
                              background: '#FEF3C7',
                              color: '#92400E',
                              border: '1px solid #FDE68A',
                              padding: '3px 10px',
                              borderRadius: 99,
                              fontSize: 11,
                              fontWeight: 800,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                            }}
                          >
                            <Car size={12} />
                            <span>Out on Visit</span>
                          </span>
                        ) : (
                          <span
                            style={{
                              background: '#ECFDF5',
                              color: '#065F46',
                              border: '1px solid #A7F3D0',
                              padding: '3px 10px',
                              borderRadius: 99,
                              fontSize: 11,
                              fontWeight: 800,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                            }}
                          >
                            <Building2 size={12} />
                            <span>Back in Office</span>
                          </span>
                        )}
                      </td>

                      {/* When they went */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 800, color: '#0284C7' }}>
                          <Clock size={13} />
                          <span>{v.outTimeFormatted}</span>
                        </div>
                      </td>

                      {/* When they came back */}
                      <td style={{ padding: '12px 16px' }}>
                        {v.isCurrentlyOut ? (
                          <span style={{ fontSize: 11.5, color: '#D97706', fontWeight: 700, fontStyle: 'italic' }}>
                            Pending return…
                          </span>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 800, color: '#059669' }}>
                            <CheckCircle2 size={13} />
                            <span>{v.inTimeFormatted}</span>
                          </div>
                        )}
                      </td>

                      {/* Duration */}
                      <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: 12.5, color: '#475569' }}>
                        {v.duration || (v.isCurrentlyOut ? 'In progress' : '—')}
                      </td>

                      {/* Purpose */}
                      <td style={{ padding: '12px 16px', fontSize: 12.5, fontWeight: 600, color: '#334155' }}>
                        {v.remarks || 'Company Visit'}
                      </td>

                      {/* History details toggle */}
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        {v.sessions.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : v.id)}
                            style={{
                              background: '#F1F5F9',
                              border: '1px solid #CBD5E1',
                              borderRadius: 8,
                              padding: '4px 8px',
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <span>{v.sessions.length} legs</span>
                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </button>
                        ) : (
                          <span style={{ color: '#94A3B8', fontSize: 11 }}>1 visit</span>
                        )}
                      </td>
                    </tr>

                    {/* Expandable multi-leg history */}
                    {isExpanded && v.sessions.length > 1 && (
                      <tr style={{ background: '#F8FAFC' }}>
                        <td colSpan={7} style={{ padding: '12px 24px' }}>
                          <div style={{ fontSize: 11.5, fontWeight: 800, color: '#475569', marginBottom: 8 }}>
                            All Visit Legs for {v.employeeName} Today:
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {v.sessions.map((sess, idx) => (
                              <div
                                key={idx}
                                style={{
                                  background: '#FFFFFF',
                                  border: '1px solid #E2E8F0',
                                  borderRadius: 8,
                                  padding: '8px 12px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  fontSize: 12,
                                  gap: 12,
                                }}
                              >
                                <span style={{ fontWeight: 700, color: '#64748B' }}>Leg #{idx + 1}</span>
                                <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#0284C7', fontWeight: 800 }}>
                                  Went: {formatVisitTime(sess.outTime)}
                                </span>
                                <ArrowRight size={13} style={{ color: '#94A3B8' }} />
                                <span style={{ fontFamily: 'JetBrains Mono, monospace', color: sess.inTime ? '#059669' : '#D97706', fontWeight: 800 }}>
                                  Back: {sess.inTime ? formatVisitTime(sess.inTime) : 'Still Away'}
                                </span>
                                <span style={{ color: '#64748B', fontWeight: 600 }}>{sess.remarks}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/**
 * Dedicated Card for Finance & Invoices View (/finance/invoices).
 */
export function TeamVisitsFinanceCard({ db, currentUser, onRefresh }) {
  const { visitsList, activeCount, returnedCount, loading, refreshVisits } = useTeamOfficeVisits(db);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div
        style={{
          background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
          borderRadius: 20,
          padding: 20,
          color: '#FFFFFF',
          marginBottom: 20,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)',
              }}
            >
              <Car size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#FFFFFF', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Staff Office &amp; Field Visits Today
                </h4>
                {activeCount > 0 && (
                  <span
                    style={{
                      background: 'rgba(245, 158, 11, 0.25)',
                      color: '#FCD34D',
                      border: '1px solid rgba(245, 158, 11, 0.5)',
                      padding: '2px 8px',
                      borderRadius: 99,
                      fontSize: 10,
                      fontWeight: 800,
                    }}
                  >
                    {activeCount} Out
                  </span>
                )}
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: 11.5, color: 'rgba(255, 255, 255, 0.65)', fontWeight: 600 }}>
                Live departure &amp; return times for all staff visiting clients, banks, or corporate offices
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={() => refreshVisits()}
              disabled={loading}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#FFFFFF',
                borderRadius: 99,
                padding: '6px 12px',
                fontSize: 11.5,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              <span>{loading ? 'Syncing…' : 'Sync'}</span>
            </button>

            <button
              type="button"
              onClick={() => setModalOpen(true)}
              style={{
                background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                border: 'none',
                color: '#FFFFFF',
                borderRadius: 99,
                padding: '6px 14px',
                fontSize: 11.5,
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
              }}
            >
              View All ({visitsList.length})
            </button>
          </div>
        </div>

        {/* Quick inline horizontal preview */}
        {visitsList.length === 0 ? (
          <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: 10, fontSize: 12, color: 'rgba(255, 255, 255, 0.6)' }}>
            🏢 All staff currently present in office. No field visits recorded yet today.
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', marginTop: 14, paddingBottom: 4 }}>
            {visitsList.slice(0, 4).map((v) => (
              <div
                key={v.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: v.isCurrentlyOut ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 12,
                  padding: '10px 14px',
                  minWidth: 220,
                  fontSize: 12,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontWeight: 800, color: '#FFFFFF' }}>{v.employeeName}</span>
                  <span
                    style={{
                      fontSize: 9.5,
                      fontWeight: 800,
                      padding: '1px 6px',
                      borderRadius: 99,
                      background: v.isCurrentlyOut ? '#F59E0B' : '#10B981',
                      color: '#FFFFFF',
                    }}
                  >
                    {v.isCurrentlyOut ? 'OUT' : 'BACK'}
                  </span>
                </div>
                <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'rgba(255, 255, 255, 0.85)' }}>
                  Went: <strong style={{ color: '#38BDF8' }}>{v.outTimeFormatted}</strong>
                </div>
                <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'rgba(255, 255, 255, 0.85)', marginTop: 2 }}>
                  Back: <strong style={{ color: v.isCurrentlyOut ? '#FCD34D' : '#34D399' }}>{v.inTimeFormatted}</strong>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Full Modal Viewer for Finance */}
      {modalOpen && typeof document !== 'undefined' &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
            }}
            onClick={() => setModalOpen(false)}
          >
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: 20,
                width: '100%',
                maxWidth: 800,
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ padding: '18px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Car size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
                      Today&apos;s Staff Office Visits (Departure &amp; Return)
                    </h3>
                    <p style={{ margin: 0, fontSize: 11.5, color: '#64748B' }}>
                      Finance Movement Log · {visitsList.length} employee(s) logged visits today
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{ background: '#F1F5F9', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#475569' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ padding: 20, overflowY: 'auto' }}>
                {visitsList.length === 0 ? (
                  <div style={{ padding: 32, textAlign: 'center', color: '#64748B' }}>No office visits logged today.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {visitsList.map((v) => (
                      <div
                        key={v.id}
                        style={{
                          background: v.isCurrentlyOut ? '#FFFBEB' : '#F8FAFC',
                          border: v.isCurrentlyOut ? '1px solid #FDE68A' : '1px solid #E2E8F0',
                          borderRadius: 14,
                          padding: 16,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 800, fontSize: 14, color: '#0F172A' }}>{v.employeeName}</span>
                            <span style={{ fontSize: 11, color: '#64748B' }}>({v.department})</span>
                          </div>
                          <span
                            style={{
                              background: v.isCurrentlyOut ? '#FEF3C7' : '#ECFDF5',
                              color: v.isCurrentlyOut ? '#92400E' : '#065F46',
                              border: v.isCurrentlyOut ? '1px solid #FDE68A' : '1px solid #A7F3D0',
                              padding: '2px 8px',
                              borderRadius: 99,
                              fontSize: 10.5,
                              fontWeight: 800,
                            }}
                          >
                            {v.isCurrentlyOut ? '🚗 Out on Visit' : '🏢 Back in Office'}
                          </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginTop: 8 }}>
                          <div style={{ background: '#FFFFFF', padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                            <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700 }}>Went (Departure)</div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: '#0284C7', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>
                              {v.outTimeFormatted}
                            </div>
                          </div>
                          <div style={{ background: '#FFFFFF', padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                            <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700 }}>Came Back (Return)</div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: v.isCurrentlyOut ? '#D97706' : '#059669', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>
                              {v.inTimeFormatted}
                            </div>
                          </div>
                          <div style={{ background: '#FFFFFF', padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                            <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700 }}>Duration</div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: '#475569', marginTop: 2 }}>
                              {v.duration || (v.isCurrentlyOut ? 'In progress' : '—')}
                            </div>
                          </div>
                          <div style={{ background: '#FFFFFF', padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                            <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700 }}>Remarks</div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginTop: 2 }}>
                              {v.remarks || 'Company Visit'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

/**
 * Global Header capsule button for HR & Finance users to see live office visits from anywhere.
 */
export function TeamVisitsHeaderCapsule({ db, currentUser }) {
  const isAuthorized = currentUser?.role === 'admin' || currentUser?.role === 'finance' || currentUser?.role === 'super_admin';
  const { visitsList, activeCount, returnedCount, refreshVisits } = useTeamOfficeVisits(db);
  const [modalOpen, setModalOpen] = useState(false);

  if (!isAuthorized) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: activeCount > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.08)',
          border: activeCount > 0 ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(255, 255, 255, 0.15)',
          color: activeCount > 0 ? '#F59E0B' : '#E2E8F0',
          borderRadius: 99,
          padding: '6px 12px',
          fontSize: 11.5,
          fontWeight: 800,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        title="View Today's Staff Office Visits (Departure & Return Times)"
        aria-label="View Today's Staff Office Visits"
      >
        <Car size={13} style={{ color: activeCount > 0 ? '#F59E0B' : '#38BDF8' }} />
        <span>Visits</span>
        {activeCount > 0 ? (
          <span
            style={{
              background: '#F59E0B',
              color: '#FFFFFF',
              borderRadius: 99,
              padding: '1px 6px',
              fontSize: 10,
              fontWeight: 900,
              marginLeft: 2,
            }}
          >
            {activeCount} Out
          </span>
        ) : visitsList.length > 0 ? (
          <span
            style={{
              background: 'rgba(56, 189, 248, 0.2)',
              color: '#38BDF8',
              borderRadius: 99,
              padding: '1px 6px',
              fontSize: 10,
              fontWeight: 800,
              marginLeft: 2,
            }}
          >
            {visitsList.length}
          </span>
        ) : null}
      </button>

      {modalOpen && typeof document !== 'undefined' &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
            }}
            onClick={() => setModalOpen(false)}
          >
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: 20,
                width: '100%',
                maxWidth: 720,
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Car size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
                      Today&apos;s Staff Office Visits
                    </h3>
                    <p style={{ margin: 0, fontSize: 11.5, color: '#64748B' }}>
                      {activeCount > 0 ? `${activeCount} currently out on field visit` : 'All staff currently in office'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{ background: '#F1F5F9', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#475569' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ padding: 18, overflowY: 'auto' }}>
                {visitsList.length === 0 ? (
                  <div style={{ padding: 28, textAlign: 'center', color: '#64748B' }}>
                    <Building2 size={32} style={{ margin: '0 auto 8px', color: '#94A3B8' }} />
                    <div style={{ fontWeight: 800, color: '#1E293B' }}>No office visits logged today</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>When employees mark a company visit, their departure and return times appear here.</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {visitsList.map((v) => (
                      <div
                        key={v.id}
                        style={{
                          background: v.isCurrentlyOut ? '#FFFBEB' : '#F8FAFC',
                          border: v.isCurrentlyOut ? '1px solid #FDE68A' : '1px solid #E2E8F0',
                          borderRadius: 12,
                          padding: 14,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontWeight: 800, fontSize: 13.5, color: '#0F172A' }}>{v.employeeName}</span>
                          <span
                            style={{
                              background: v.isCurrentlyOut ? '#FEF3C7' : '#ECFDF5',
                              color: v.isCurrentlyOut ? '#92400E' : '#065F46',
                              padding: '2px 8px',
                              borderRadius: 99,
                              fontSize: 10.5,
                              fontWeight: 800,
                            }}
                          >
                            {v.isCurrentlyOut ? '🚗 Out on Visit' : '🏢 Back in Office'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#0284C7', fontWeight: 700 }}>
                            Went: {v.outTimeFormatted}
                          </span>
                          <ArrowRight size={12} style={{ color: '#94A3B8' }} />
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', color: v.isCurrentlyOut ? '#D97706' : '#059669', fontWeight: 700 }}>
                            Back: {v.inTimeFormatted}
                          </span>
                          {v.duration && <span style={{ color: '#64748B', fontWeight: 600 }}>({v.duration})</span>}
                          {v.remarks && <span style={{ color: '#64748B', fontStyle: 'italic' }}>— {v.remarks}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

export default TeamVisitsSection;
