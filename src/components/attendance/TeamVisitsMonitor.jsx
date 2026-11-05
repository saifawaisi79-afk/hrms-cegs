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
  Download,
  Search,
  Filter,
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
 * Format date string (YYYY-MM-DD) into readable format like "Thu, Nov 05, 2026".
 */
export function formatVisitDate(dateStr) {
  if (!dateStr) return '—';
  const parts = String(dateStr).split('-');
  if (parts.length === 3) {
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' });
    }
  }
  return dateStr;
}

/**
 * Format YYYY-MM into readable month name like "November 2026".
 */
export function formatMonthLabel(yyyyMm) {
  if (!yyyyMm || yyyyMm.length < 7) return yyyyMm || 'All Months';
  const [y, m] = yyyyMm.split('-');
  const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
  if (isNaN(date.getTime())) return yyyyMm;
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
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
 * Export visits list as a clean CSV file download.
 */
export function exportVisitsToCsv(visits, monthLabel) {
  if (!visits || visits.length === 0) {
    if (typeof window !== 'undefined') alert('No visit records to export.');
    return;
  }
  const headers = ['Date', 'Employee Name', 'Employee ID', 'Department', 'Went (Departure)', 'Came Back (Return)', 'Duration Away', 'Status', 'Purpose / Remarks'];
  const rows = visits.map((v) => [
    `"${v.date || ''}"`,
    `"${(v.employeeName || '').replace(/"/g, '""')}"`,
    `"${v.employeeId || ''}"`,
    `"${(v.department || '').replace(/"/g, '""')}"`,
    `"${v.outTimeFormatted || ''}"`,
    `"${v.inTimeFormatted || ''}"`,
    `"${v.duration || ''}"`,
    `"${v.isCurrentlyOut ? 'Out on Visit' : v.statusDisplay || 'Returned'}"`,
    `"${(v.remarks || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const safeLabel = String(monthLabel || 'All').replace(/\s+/g, '_');
  link.setAttribute('download', `Staff_Office_Visits_${safeLabel}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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
 * Hook to extract and organize office visits for today and the entire month for all employees.
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

  // Parse all historical visit records
  const allVisitsHistory = useMemo(() => {
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
      if (!recDate) return;

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
      const isToday = recDate === todayIso;
      const isCurrentlyOut = isToday && rec.visit_status === 'company_visit';
      const lastSession = sessions[sessions.length - 1];

      // Primary departure time (when they went)
      const outTime = rec.company_visit_out_time || lastSession?.outTime || null;
      // Primary return time (when they came back)
      const inTime = !isCurrentlyOut ? (rec.company_visit_in_time || lastSession?.inTime || null) : null;

      let statusDisplay = 'Returned';
      if (isCurrentlyOut) {
        statusDisplay = 'Out on Visit';
      } else if (rec.visit_status === 'company_visit' && !inTime) {
        statusDisplay = 'Away (No return punch)';
      }

      results.push({
        id: rec.id || rec._id || `vis_${uid}_${recDate}`,
        uid: String(uid || ''),
        date: recDate,
        isToday,
        employeeName: userObj.name || rec.employee_name || 'Staff Member',
        employeeId: userObj.employee_id || rec.employee_id || '—',
        avatar: userObj.avatar || rec.avatar_url || null,
        department: userObj.department || userObj.title || rec.department_name || 'Staff',
        isCurrentlyOut,
        outTime,
        inTime,
        outTimeFormatted: formatVisitTime(outTime),
        inTimeFormatted: inTime ? formatVisitTime(inTime) : (isCurrentlyOut ? 'Still Away' : (rec.visit_status === 'company_visit' ? 'Still Away' : 'Returned')),
        duration: calcDurationDisplay(outTime, inTime),
        sessions,
        statusDisplay,
        remarks: sessions.map((s) => s.remarks).filter(Boolean).join(' • ') || lastSession?.remarks || (isCurrentlyOut ? 'Company Visit' : 'Back to Office'),
        attendanceRecord: rec,
      });
    });

    // Sort: newest date first, then out-first, then newest departure
    return results.sort((a, b) => {
      const cmpDate = String(b.date).localeCompare(String(a.date));
      if (cmpDate !== 0) return cmpDate;
      if (a.isCurrentlyOut && !b.isCurrentlyOut) return -1;
      if (!a.isCurrentlyOut && b.isCurrentlyOut) return 1;
      return String(b.outTime || '').localeCompare(String(a.outTime || ''));
    });
  }, [syncedRecords, db?.attendance, db?.users, todayIso]);

  // Today's visits filter
  const visitsList = useMemo(() => {
    return allVisitsHistory.filter((v) => v.date === todayIso);
  }, [allVisitsHistory, todayIso]);

  // Available months present in data
  const availableMonths = useMemo(() => {
    const set = new Set();
    const currentMonthKey = todayIso.slice(0, 7);
    set.add(currentMonthKey);
    allVisitsHistory.forEach((v) => {
      if (v.date) set.add(v.date.slice(0, 7));
    });
    return Array.from(set).sort().reverse();
  }, [allVisitsHistory, todayIso]);

  const activeCount = useMemo(() => visitsList.filter((v) => v.isCurrentlyOut).length, [visitsList]);
  const returnedCount = useMemo(() => visitsList.filter((v) => !v.isCurrentlyOut).length, [visitsList]);

  return {
    visitsList,
    allVisitsHistory,
    availableMonths,
    activeCount,
    returnedCount,
    totalCount: visitsList.length,
    loading,
    refreshVisits,
    todayIso,
  };
}

/**
 * Reusable Full-Feature Staff Visits Modal with "Today" and "Monthly History" views.
 */
export function StaffVisitsDetailModal({
  open,
  onClose,
  visitsList = [],
  allVisitsHistory = [],
  availableMonths = [],
  activeCount = 0,
  returnedCount = 0,
  refreshVisits,
  loading = false,
  todayIso,
}) {
  const currentMonthKey = (todayIso || toIsoDate(new Date())).slice(0, 7);
  const [activeTab, setActiveTab] = useState('today'); // 'today' | 'month'
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'out' | 'returned'
  const [expandedId, setExpandedId] = useState(null);

  // Filter for the selected month in monthly history
  const monthVisits = useMemo(() => {
    return allVisitsHistory.filter((v) => {
      if (selectedMonth === 'all') return true;
      return String(v.date || '').startsWith(selectedMonth);
    });
  }, [allVisitsHistory, selectedMonth]);

  // Apply search and status filter to monthVisits
  const filteredMonthVisits = useMemo(() => {
    let list = monthVisits;
    if (statusFilter === 'out') {
      list = list.filter((v) => v.isCurrentlyOut || (v.statusDisplay && v.statusDisplay.toLowerCase().includes('away')));
    } else if (statusFilter === 'returned') {
      list = list.filter((v) => !v.isCurrentlyOut && (!v.statusDisplay || !v.statusDisplay.toLowerCase().includes('away')));
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (v) =>
        v.employeeName.toLowerCase().includes(q) ||
        v.employeeId.toLowerCase().includes(q) ||
        v.department.toLowerCase().includes(q) ||
        (v.remarks && v.remarks.toLowerCase().includes(q)) ||
        (v.date && v.date.toLowerCase().includes(q))
    );
  }, [monthVisits, statusFilter, searchQuery]);

  // Statistics for selected month
  const monthStats = useMemo(() => {
    const total = monthVisits.length;
    const uniqueEmployees = new Set(monthVisits.map((v) => v.employeeId || v.employeeName)).size;
    const active = monthVisits.filter((v) => v.isCurrentlyOut).length;
    const returned = total - active;
    return { total, uniqueEmployees, active, returned };
  }, [monthVisits]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
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
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 20,
          width: '100%',
          maxWidth: 860,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 22px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(245, 158, 11, 0.3)',
              }}
            >
              <Car size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16.5, fontWeight: 800, color: '#0F172A' }}>
                Staff Office &amp; Field Visits Tracker
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: 11.5, color: '#64748B', fontWeight: 600 }}>
                {activeTab === 'today'
                  ? activeCount > 0
                    ? `${activeCount} staff member(s) currently out on field visit`
                    : 'All staff currently in office today'
                  : `Monthly History · ${monthStats.total} visit record(s) in ${formatMonthLabel(selectedMonth)}`}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={refreshVisits}
              disabled={loading}
              style={{
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: 8,
                padding: '6px 10px',
                fontSize: 11.5,
                fontWeight: 700,
                color: '#475569',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
              title="Refresh attendance records"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              <span>{loading ? 'Syncing…' : 'Sync'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{ background: '#F1F5F9', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#475569' }}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', padding: '10px 22px 0 22px', borderBottom: '1px solid #E2E8F0', background: '#FFFFFF', gap: 8 }}>
          <button
            type="button"
            onClick={() => setActiveTab('today')}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === 'today' ? '2.5px solid #D97706' : '2.5px solid transparent',
              color: activeTab === 'today' ? '#D97706' : '#64748B',
              fontWeight: 800,
              fontSize: 13,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.15s ease',
            }}
          >
            <span>Today&apos;s Live Visits</span>
            <span
              style={{
                background: activeTab === 'today' ? '#FEF3C7' : '#F1F5F9',
                color: activeTab === 'today' ? '#B45309' : '#64748B',
                padding: '1px 7px',
                borderRadius: 99,
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              {visitsList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('month')}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === 'month' ? '2.5px solid #0284C7' : '2.5px solid transparent',
              color: activeTab === 'month' ? '#0284C7' : '#64748B',
              fontWeight: 800,
              fontSize: 13,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.15s ease',
            }}
          >
            <Calendar size={14} />
            <span>Entire Month History</span>
            <span
              style={{
                background: activeTab === 'month' ? '#E0F2FE' : '#F1F5F9',
                color: activeTab === 'month' ? '#0369A1' : '#64748B',
                padding: '1px 7px',
                borderRadius: 99,
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              {monthVisits.length}
            </span>
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: 20, overflowY: 'auto', flex: 1, background: '#FAFAFA' }}>
          {/* TAB 1: TODAY'S VISITS */}
          {activeTab === 'today' && (
            <div>
              {visitsList.length === 0 ? (
                <div style={{ padding: '36px 20px', textAlign: 'center', color: '#64748B', background: '#FFFFFF', borderRadius: 14, border: '1px dashed #CBD5E1' }}>
                  <Building2 size={36} style={{ margin: '0 auto 10px', color: '#94A3B8' }} />
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#1E293B' }}>No office visits logged today</div>
                  <p style={{ fontSize: 12, marginTop: 4, maxWidth: 400, margin: '6px auto 14px' }}>
                    When employees mark an official company visit from the header status pill, their departure &amp; return times appear here live.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('month')}
                    style={{
                      background: '#0284C7',
                      color: '#FFFFFF',
                      border: 'none',
                      padding: '7px 16px',
                      borderRadius: 99,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    View Entire Month History ({allVisitsHistory.length} total)
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {visitsList.map((v) => (
                    <div
                      key={v.id}
                      style={{
                        background: v.isCurrentlyOut ? '#FFFBEB' : '#FFFFFF',
                        border: v.isCurrentlyOut ? '1px solid #FDE68A' : '1px solid #E2E8F0',
                        borderRadius: 14,
                        padding: 16,
                        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: '50%',
                              background: v.isCurrentlyOut ? '#FDE68A' : '#E2E8F0',
                              color: v.isCurrentlyOut ? '#92400E' : '#475569',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: 12,
                            }}
                          >
                            {v.employeeName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span style={{ fontWeight: 800, fontSize: 14, color: '#0F172A' }}>{v.employeeName}</span>
                            <span style={{ fontSize: 11.5, color: '#64748B', marginLeft: 8 }}>
                              {v.employeeId} · {v.department}
                            </span>
                          </div>
                        </div>

                        <span
                          style={{
                            background: v.isCurrentlyOut ? '#FEF3C7' : '#ECFDF5',
                            color: v.isCurrentlyOut ? '#92400E' : '#065F46',
                            border: v.isCurrentlyOut ? '1px solid #FDE68A' : '1px solid #A7F3D0',
                            padding: '3px 10px',
                            borderRadius: 99,
                            fontSize: 11,
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                          }}
                        >
                          {v.isCurrentlyOut ? <Car size={12} /> : <Building2 size={12} />}
                          <span>{v.isCurrentlyOut ? '🚗 Out on Visit' : '🏢 Back in Office'}</span>
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
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
                          <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700 }}>Duration Away</div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: '#475569', marginTop: 2 }}>
                            {v.duration || (v.isCurrentlyOut ? 'In progress' : '—')}
                          </div>
                        </div>
                        <div style={{ background: '#FFFFFF', padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                          <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700 }}>Purpose / Remarks</div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={v.remarks}>
                            {v.remarks || 'Company Visit'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ENTIRE MONTH HISTORY */}
          {activeTab === 'month' && (
            <div>
              {/* Filter and Control Bar */}
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: 14,
                  padding: '14px 16px',
                  border: '1px solid #E2E8F0',
                  marginBottom: 16,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 12,
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {/* Month Dropdown */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={15} style={{ color: '#0284C7' }} />
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 8,
                        border: '1px solid #CBD5E1',
                        fontSize: 12.5,
                        fontWeight: 700,
                        color: '#0F172A',
                        background: '#FFFFFF',
                        cursor: 'pointer',
                      }}
                    >
                      {availableMonths.map((m) => (
                        <option key={m} value={m}>
                          {formatMonthLabel(m)} {m === currentMonthKey ? '(Current)' : ''}
                        </option>
                      ))}
                      <option value="all">All Months (Full History)</option>
                    </select>
                  </div>

                  {/* Status Filter */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#475569',
                      background: '#FFFFFF',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="all">All Statuses</option>
                    <option value="out">🚗 Out on Visit / Away</option>
                    <option value="returned">🏢 Returned to Office</option>
                  </select>

                  {/* Search Query */}
                  <div style={{ position: 'relative', minWidth: 180 }}>
                    <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                    <input
                      type="text"
                      placeholder="Search staff, EID, company..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        padding: '6px 10px 6px 30px',
                        borderRadius: 8,
                        border: '1px solid #CBD5E1',
                        fontSize: 12,
                        width: '100%',
                      }}
                    />
                  </div>
                </div>

                {/* CSV Export Button */}
                <button
                  type="button"
                  onClick={() => exportVisitsToCsv(filteredMonthVisits, selectedMonth === 'all' ? 'All_Months' : formatMonthLabel(selectedMonth))}
                  style={{
                    background: '#10B981',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 8,
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)',
                  }}
                  title="Download CSV report of office visits"
                >
                  <Download size={13} />
                  <span>Download CSV Log</span>
                </button>
              </div>

              {/* Month Statistics Overview */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 16 }}>
                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '10px 14px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>Total Field Visits</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#0F172A', marginTop: 2 }}>{monthStats.total}</div>
                </div>
                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '10px 14px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>Staff Members on Field</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#0284C7', marginTop: 2 }}>{monthStats.uniqueEmployees}</div>
                </div>
                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '10px 14px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>Returned to Office</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#059669', marginTop: 2 }}>{monthStats.returned}</div>
                </div>
                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '10px 14px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>Currently Active / Out</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#D97706', marginTop: 2 }}>{monthStats.active}</div>
                </div>
              </div>

              {/* History Table / Cards */}
              {filteredMonthVisits.length === 0 ? (
                <div style={{ padding: '36px 20px', textAlign: 'center', color: '#64748B', background: '#FFFFFF', borderRadius: 14, border: '1px dashed #CBD5E1' }}>
                  <Building2 size={36} style={{ margin: '0 auto 10px', color: '#94A3B8' }} />
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#1E293B' }}>No visit records found</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>
                    {searchQuery ? 'No visits match your search query.' : `No office visits recorded for ${formatMonthLabel(selectedMonth)}.`}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {filteredMonthVisits.map((v) => {
                    const isExpanded = expandedId === v.id;
                    return (
                      <div
                        key={v.id}
                        style={{
                          background: v.isCurrentlyOut ? '#FFFBEB' : '#FFFFFF',
                          border: v.isCurrentlyOut ? '1px solid #FDE68A' : '1px solid #E2E8F0',
                          borderRadius: 14,
                          padding: 14,
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span
                              style={{
                                background: '#F1F5F9',
                                color: '#334155',
                                border: '1px solid #CBD5E1',
                                padding: '2px 8px',
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 800,
                                fontFamily: 'JetBrains Mono, monospace',
                              }}
                            >
                              {formatVisitDate(v.date)}
                            </span>
                            <span style={{ fontWeight: 800, fontSize: 13.5, color: '#0F172A' }}>{v.employeeName}</span>
                            <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>
                              ({v.employeeId} · {v.department})
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                              {v.isCurrentlyOut ? '🚗 Out on Visit' : v.statusDisplay === 'Away (No return punch)' ? '⚠️ No Return Punch' : '🏢 Back in Office'}
                            </span>

                            {v.sessions.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setExpandedId(isExpanded ? null : v.id)}
                                style={{
                                  background: '#F1F5F9',
                                  border: '1px solid #CBD5E1',
                                  borderRadius: 6,
                                  padding: '2px 6px',
                                  fontSize: 10.5,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 3,
                                }}
                              >
                                <span>{v.sessions.length} legs</span>
                                {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Timing details */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, flexWrap: 'wrap', marginTop: 4 }}>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#0284C7', fontWeight: 700 }}>
                            Went: {v.outTimeFormatted}
                          </span>
                          <ArrowRight size={12} style={{ color: '#94A3B8' }} />
                          <span
                            style={{
                              fontFamily: 'JetBrains Mono, monospace',
                              color: v.isCurrentlyOut ? '#D97706' : '#059669',
                              fontWeight: 700,
                            }}
                          >
                            Back: {v.inTimeFormatted}
                          </span>
                          {v.duration && (
                            <span style={{ color: '#475569', fontWeight: 700, background: '#F1F5F9', padding: '1px 6px', borderRadius: 4, fontSize: 11 }}>
                              {v.duration}
                            </span>
                          )}
                          {v.remarks && (
                            <span style={{ color: '#475569', fontStyle: 'italic', fontSize: 11.5 }}>
                              — {v.remarks}
                            </span>
                          )}
                        </div>

                        {/* Multi-leg accordion */}
                        {isExpanded && v.sessions.length > 1 && (
                          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>Multiple Visit Sessions on {v.date}:</div>
                            {v.sessions.map((sess, idx) => (
                              <div
                                key={idx}
                                style={{
                                  background: '#F8FAFC',
                                  border: '1px solid #E2E8F0',
                                  borderRadius: 6,
                                  padding: '6px 10px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  fontSize: 11.5,
                                  gap: 8,
                                }}
                              >
                                <span style={{ fontWeight: 700, color: '#64748B' }}>Leg #{idx + 1}</span>
                                <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#0284C7', fontWeight: 700 }}>
                                  Went: {formatVisitTime(sess.outTime)}
                                </span>
                                <ArrowRight size={11} style={{ color: '#94A3B8' }} />
                                <span style={{ fontFamily: 'JetBrains Mono, monospace', color: sess.inTime ? '#059669' : '#D97706', fontWeight: 700 }}>
                                  Back: {sess.inTime ? formatVisitTime(sess.inTime) : 'Still Away'}
                                </span>
                                {sess.remarks && <span style={{ color: '#64748B', fontStyle: 'italic' }}>{sess.remarks}</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * Full-width Live Office Visits Monitor section for HR Portal (Attendance Page).
 */
export function TeamVisitsSection({ db, currentUser, onRefresh }) {
  const { visitsList, allVisitsHistory, availableMonths, activeCount, returnedCount, loading, refreshVisits, todayIso } = useTeamOfficeVisits(db);
  const currentMonthKey = (todayIso || toIsoDate(new Date())).slice(0, 7);
  const [sectionTab, setSectionTab] = useState('today'); // 'today' | 'month'
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [expandedId, setExpandedId] = useState(null);
  const [filterQuery, setFilterQuery] = useState('');

  // Items to display depending on tab
  const displayItems = useMemo(() => {
    let source = sectionTab === 'today' ? visitsList : allVisitsHistory.filter((v) => selectedMonth === 'all' || String(v.date || '').startsWith(selectedMonth));
    if (!filterQuery.trim()) return source;
    const q = filterQuery.toLowerCase();
    return source.filter(
      (v) =>
        v.employeeName.toLowerCase().includes(q) ||
        v.department.toLowerCase().includes(q) ||
        v.employeeId.toLowerCase().includes(q) ||
        (v.remarks && v.remarks.toLowerCase().includes(q)) ||
        (v.date && v.date.toLowerCase().includes(q))
    );
  }, [sectionTab, visitsList, allVisitsHistory, selectedMonth, filterQuery]);

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
                Staff Office &amp; Field Visits (Live &amp; Monthly History)
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Tab Pill Toggle */}
          <div style={{ display: 'flex', background: '#F1F5F9', padding: 3, borderRadius: 99 }}>
            <button
              type="button"
              onClick={() => setSectionTab('today')}
              style={{
                background: sectionTab === 'today' ? '#FFFFFF' : 'transparent',
                color: sectionTab === 'today' ? '#0F172A' : '#64748B',
                boxShadow: sectionTab === 'today' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                border: 'none',
                borderRadius: 99,
                padding: '5px 12px',
                fontSize: 11.5,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Today ({visitsList.length})
            </button>
            <button
              type="button"
              onClick={() => setSectionTab('month')}
              style={{
                background: sectionTab === 'month' ? '#FFFFFF' : 'transparent',
                color: sectionTab === 'month' ? '#0284C7' : '#64748B',
                boxShadow: sectionTab === 'month' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                border: 'none',
                borderRadius: 99,
                padding: '5px 12px',
                fontSize: 11.5,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Entire Month History
            </button>
          </div>

          {sectionTab === 'month' && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{
                borderRadius: 99,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 700,
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                cursor: 'pointer',
              }}
            >
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {formatMonthLabel(m)}
                </option>
              ))}
              <option value="all">All Months</option>
            </select>
          )}

          <input
            type="text"
            className="form-input"
            style={{ borderRadius: 99, padding: '7px 14px', fontSize: 12, minHeight: 36, width: 170 }}
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

          {sectionTab === 'month' && (
            <button
              type="button"
              onClick={() => exportVisitsToCsv(displayItems, formatMonthLabel(selectedMonth))}
              style={{
                background: '#10B981',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 99,
                padding: '7px 14px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Download size={13} />
              <span>Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Overview Stat Chips */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>
            {sectionTab === 'today' ? "Today's Visits Logged:" : `Visits in ${formatMonthLabel(selectedMonth)}:`}
          </span>
          <span style={{ fontSize: 14, fontWeight: 900, color: '#0F172A' }}>{displayItems.length}</span>
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
      {displayItems.length === 0 ? (
        <div style={{ background: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: 14, padding: '32px 16px', textAlign: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#F1F5F9', color: '#64748B', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
            <Building2 size={22} />
          </div>
          <div style={{ fontWeight: 800, fontSize: 14, color: '#334155' }}>
            {filterQuery ? 'No matching staff visits found' : sectionTab === 'today' ? 'No employees on company visit today' : `No office visits logged for ${formatMonthLabel(selectedMonth)}`}
          </div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
            {sectionTab === 'today'
              ? 'All clocked-in staff are currently present in the office. Switch to "Entire Month History" above to view previous days.'
              : 'Try selecting another month or clearing your search.'}
          </div>
        </div>
      ) : (
        <div className="tbl-wrap" style={{ border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden' }}>
          <table className="tbl" style={{ margin: 0 }}>
            <thead style={{ background: '#F8FAFC' }}>
              <tr>
                {sectionTab === 'month' && <th style={{ padding: '12px 16px' }}>Date</th>}
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
              {displayItems.map((v) => {
                const isExpanded = expandedId === v.id;
                return (
                  <React.Fragment key={v.id}>
                    <tr style={{ background: v.isCurrentlyOut ? 'rgba(254, 243, 199, 0.25)' : '#FFFFFF' }}>
                      {sectionTab === 'month' && (
                        <td style={{ padding: '12px 16px', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, color: '#475569' }}>
                          {formatVisitDate(v.date)}
                        </td>
                      )}
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
                        ) : v.statusDisplay === 'Away (No return punch)' ? (
                          <span
                            style={{
                              background: '#F1F5F9',
                              color: '#475569',
                              border: '1px solid #CBD5E1',
                              padding: '3px 10px',
                              borderRadius: 99,
                              fontSize: 11,
                              fontWeight: 800,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                            }}
                          >
                            <AlertCircle size={12} />
                            <span>No Return Punch</span>
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
                        <td colSpan={sectionTab === 'month' ? 8 : 7} style={{ padding: '12px 24px' }}>
                          <div style={{ fontSize: 11.5, fontWeight: 800, color: '#475569', marginBottom: 8 }}>
                            All Visit Legs for {v.employeeName} on {v.date}:
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
  const { visitsList, allVisitsHistory, availableMonths, activeCount, returnedCount, loading, refreshVisits, todayIso } = useTeamOfficeVisits(db);
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
                  Staff Attendance &amp; Field Visits (Live &amp; Monthly)
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
            <a
              href="/billing/attendance"
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#FFFFFF',
                borderRadius: 99,
                padding: '6px 12px',
                fontSize: 11.5,
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
              title="Open full Attendance Module"
            >
              <Clock size={12} />
              <span>Attendance Module</span>
            </a>

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
              View All History ({allVisitsHistory.length})
            </button>
          </div>
        </div>

        {/* Quick inline horizontal preview */}
        {visitsList.length === 0 ? (
          <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: 10, fontSize: 12, color: 'rgba(255, 255, 255, 0.6)' }}>
            🏢 All staff currently present in office. No field visits recorded yet today. Click &quot;View All History&quot; to see previous days.
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

      <StaffVisitsDetailModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        visitsList={visitsList}
        allVisitsHistory={allVisitsHistory}
        availableMonths={availableMonths}
        activeCount={activeCount}
        returnedCount={returnedCount}
        refreshVisits={refreshVisits}
        loading={loading}
        todayIso={todayIso}
      />
    </>
  );
}

/**
 * Global Header capsule button for HR & Finance users to see live office visits and full monthly history from anywhere.
 */
export function TeamVisitsHeaderCapsule({ db, currentUser }) {
  const isAuthorized = currentUser?.role === 'admin' || currentUser?.role === 'finance' || currentUser?.role === 'super_admin';
  const { visitsList, allVisitsHistory, availableMonths, activeCount, returnedCount, refreshVisits, loading, todayIso } = useTeamOfficeVisits(db);
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
        title="View Staff Office Visits (Live Today & Monthly History)"
        aria-label="View Staff Office Visits"
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
        ) : allVisitsHistory.length > 0 ? (
          <span
            style={{
              background: 'rgba(148, 163, 184, 0.2)',
              color: '#CBD5E1',
              borderRadius: 99,
              padding: '1px 6px',
              fontSize: 10,
              fontWeight: 700,
              marginLeft: 2,
            }}
          >
            {allVisitsHistory.length}
          </span>
        ) : null}
      </button>

      <StaffVisitsDetailModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        visitsList={visitsList}
        allVisitsHistory={allVisitsHistory}
        availableMonths={availableMonths}
        activeCount={activeCount}
        returnedCount={returnedCount}
        refreshVisits={refreshVisits}
        loading={loading}
        todayIso={todayIso}
      />
    </>
  );
}

export default TeamVisitsSection;
