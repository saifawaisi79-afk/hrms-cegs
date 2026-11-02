'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';

export function PermissionsSection({ db, save, user }) {
  const [activeTab, setActiveTab] = useState('employees'); // 'employees' | 'history' | 'roles'
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [employees, setEmployees] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'late' | 'wfh' | 'waived' | 'early'
  const [feedback, setFeedback] = useState({ msg: '', type: 'info' });
  const [processingId, setProcessingId] = useState(null);

  // History Filter State
  const [historySearch, setHistorySearch] = useState('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState('all');

  // Short Reason Prompt Modal State
  const [reasonModal, setReasonModal] = useState({
    isOpen: false,
    title: '',
    subtitle: '',
    permissionType: '',
    employee: null,
    date: '',
    chips: [],
    customReason: '',
    onConfirm: null,
  });

  // System Status & Announcement Controls
  const [systemStatus, setSystemStatus] = useState({
    hrms_stopped: false,
    hrms_announcement: '',
    hrms_announcement_level: 'info',
    hrms_announcement_updated_at: null,
  });
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementLevel, setAnnouncementLevel] = useState('info');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Role Permissions Matrix (Preserved functionality)
  const [matrix, setMatrix] = useState(() => db?.permissions || {
    super_admin: { payroll: true, attendance: true, deleteEmp: true, approveLeave: true, reports: true },
    admin: { payroll: true, attendance: true, deleteEmp: true, approveLeave: true, reports: true },
    manager: { payroll: false, attendance: true, deleteEmp: false, approveLeave: true, reports: true },
    employee: { payroll: false, attendance: false, deleteEmp: false, approveLeave: false, reports: false },
    recruiter: { payroll: false, attendance: false, deleteEmp: false, approveLeave: false, reports: true },
    finance: { payroll: true, attendance: false, deleteEmp: false, approveLeave: true, reports: true },
  });

  const toggleRolePerm = (role, key) => {
    const updated = {
      ...matrix,
      [role]: { ...matrix[role], [key]: !matrix[role][key] },
    };
    setMatrix(updated);
    if (typeof save === 'function') save('permissions', updated);
  };

  // Determine if selected date is Saturday (6h shift) or weekday (9h shift)
  const isSaturday = useMemo(() => {
    try {
      const parts = selectedDate.split('-').map(Number);
      return new Date(parts[0], parts[1] - 1, parts[2]).getDay() === 6;
    } catch {
      return false;
    }
  }, [selectedDate]);

  const requiredShiftHours = isSaturday ? 6 : 9;

  // Show notification toast
  const notify = (msg, type = 'success') => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback({ msg: '', type: 'info' }), 4500);
  };

  // Helper to open reason modal
  const promptReason = ({ title, subtitle, permissionType, employee, date, chips, onConfirm }) => {
    setReasonModal({
      isOpen: true,
      title,
      subtitle,
      permissionType,
      employee,
      date: date || selectedDate,
      chips: chips || [],
      customReason: (chips && chips[0]) || '',
      onConfirm,
    });
  };

  // Fetch permissions, employee status, and audit logs from API
  const fetchPermissionsData = useCallback(async (dateStr) => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? (localStorage.getItem('cegs_auth_token') || localStorage.getItem('cegs_token')) : '';
      const res = await fetch(`/api/admin/permissions?date=${dateStr}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
        if (Array.isArray(data.history)) {
          setHistory(data.history);
        }
        if (data.systemStatus) {
          setSystemStatus(data.systemStatus);
          setAnnouncementText(data.systemStatus.hrms_announcement || '');
          setAnnouncementLevel(data.systemStatus.hrms_announcement_level || 'info');
        }
      } else {
        // Fallback to local db.users
        const localEmps = (db?.users || []).filter(u => u.status !== 'inactive').map(u => ({
          id: u.id || u._id,
          employee_id: u.employee_id || u.eid || 'EMP',
          name: u.name,
          email: u.email,
          role: u.role,
          designation: u.designation || u.title || 'Staff',
          department_name: 'General',
          avatar_url: u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.name || 'user')}`,
          wfh_allowed: !!u.wfh_allowed,
          attendance: { status: 'present', check_in_time: '10:00:00', is_late: false },
          clause40_waived: false,
          early_logout_allowed: false,
          early_logout_reason: '',
        }));
        setEmployees(localEmps);
      }
    } catch (err) {
      console.warn('Failed to load permissions from API, using store:', err);
    } finally {
      setLoading(false);
    }
  }, [db?.users]);

  useEffect(() => {
    fetchPermissionsData(selectedDate);
  }, [selectedDate, fetchPermissionsData]);

  // Navigate date
  const changeDateBy = (days) => {
    const parts = selectedDate.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${day}`);
  };

  const getAuthToken = () => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('cegs_auth_token') || localStorage.getItem('cegs_token') || '';
  };

  // 1. WORK FROM HOME (WFH)
  const handleToggleWfh = (emp) => {
    const nextVal = !emp.wfh_allowed;
    if (nextVal) {
      promptReason({
        title: 'Grant Work From Home (WFH)',
        subtitle: `Permit ${emp.name} to log in remotely without office GPS boundary`,
        permissionType: 'wfh',
        employee: emp,
        date: selectedDate,
        chips: ['Health / Recovery', 'Travel / Out of town', 'Remote Project Delivery', 'Approved by Management'],
        onConfirm: (reason) => executeToggleWfh(emp, true, reason),
      });
    } else {
      promptReason({
        title: 'Revoke Work From Home (WFH)',
        subtitle: `Require ${emp.name} to clock in strictly inside office premises`,
        permissionType: 'wfh',
        employee: emp,
        date: selectedDate,
        chips: ['Resumed office attendance', 'Remote period ended', 'Management directive'],
        onConfirm: (reason) => executeToggleWfh(emp, false, reason),
      });
    }
  };

  const executeToggleWfh = async (emp, nextVal, reason) => {
    setProcessingId(emp.id);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/admin/permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: 'toggle_wfh',
          userId: emp.id,
          wfh_allowed: nextVal,
          reason,
        }),
      });
      if (res.ok) {
        setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, wfh_allowed: nextVal } : e));
        notify(`WFH ${nextVal ? 'Granted' : 'Revoked'} for ${emp.name}`);
        fetchPermissionsData(selectedDate);
      } else {
        notify('Failed to update WFH permission', 'error');
      }
    } catch (err) {
      notify('Network error updating WFH', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // 2. ATTENDANCE & AUTO ON-TIME OVERRIDE
  const handleOverrideOnTime = (emp) => {
    promptReason({
      title: 'Auto Attendance: Mark On-Time',
      subtitle: `Change attendance for ${emp.name} on ${selectedDate} to ON-TIME and clear late penalties`,
      permissionType: 'auto_attendance_ontime',
      employee: emp,
      date: selectedDate,
      chips: [
        'Reached early, login failed in portal',
        'Network / System technical glitch',
        'HR portal punch delay verified',
        'Management verified on-time arrival',
      ],
      onConfirm: (reason) => executeOverrideOnTime(emp, reason),
    });
  };

  const executeOverrideOnTime = async (emp, reason) => {
    setProcessingId(emp.id);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/admin/permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: 'override_attendance_ontime',
          userId: emp.id,
          date: selectedDate,
          reason,
        }),
      });
      if (res.ok) {
        setEmployees(prev => prev.map(e => {
          if (e.id === emp.id) {
            return {
              ...e,
              attendance: {
                ...e.attendance,
                status: 'present',
                is_late: false,
                is_overridden: true,
                check_in_time: e.attendance?.check_in_time || '10:00:00',
              },
            };
          }
          return e;
        }));
        notify(`Attendance for ${emp.name} marked ON-TIME. Late penalty cleared!`);
        fetchPermissionsData(selectedDate);
      } else {
        notify('Failed to override attendance', 'error');
      }
    } catch (err) {
      notify('Network error overriding attendance', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // 3. 40% PERFORMANCE CLAUSE WAIVER
  const handleToggle40Clause = (emp) => {
    const nextVal = !emp.clause40_waived;
    if (nextVal) {
      promptReason({
        title: 'Waive 40% Performance Clause',
        subtitle: `Exempt ${emp.name} from the 40% minimum daily activity requirement on ${selectedDate}`,
        permissionType: 'clause_40_waive',
        employee: emp,
        date: selectedDate,
        chips: [
          'CRM / Calling system downtime',
          'Low lead volume in pipeline',
          'New Joiner Onboarding & Training',
          'Special internal assignment',
          'Management exemption',
        ],
        onConfirm: (reason) => executeToggle40Clause(emp, true, reason),
      });
    } else {
      promptReason({
        title: 'Re-enforce 40% Performance Clause',
        subtitle: `Restore normal 40% performance minimum for ${emp.name} on ${selectedDate}`,
        permissionType: 'clause_40_waive',
        employee: emp,
        date: selectedDate,
        chips: ['Issue resolved', 'Standard criteria restored'],
        onConfirm: (reason) => executeToggle40Clause(emp, false, reason),
      });
    }
  };

  const executeToggle40Clause = async (emp, nextVal, reason) => {
    setProcessingId(emp.id);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/admin/permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: 'toggle_40_clause',
          userId: emp.id,
          date: selectedDate,
          ignore: nextVal,
          reason,
        }),
      });
      if (res.ok) {
        setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, clause40_waived: nextVal } : e));
        notify(`40% Performance Clause ${nextVal ? 'Waived / Ignored' : 'Re-enforced'} for ${emp.name}`);
        fetchPermissionsData(selectedDate);
      } else {
        notify('Failed to update 40% clause waiver', 'error');
      }
    } catch (err) {
      notify('Network error updating waiver', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // 4. EARLY LOGOUT PERMISSION
  const handleToggleEarlyLogout = (emp) => {
    const nextVal = !emp.early_logout_allowed;
    if (nextVal) {
      promptReason({
        title: 'Grant Early Logout Permission',
        subtitle: `Authorize ${emp.name} to clock out early on ${selectedDate} without warnings or half-day deduction`,
        permissionType: 'early_logout',
        employee: emp,
        date: selectedDate,
        chips: [
          'Medical / Doctor Appointment',
          'Family / Personal Emergency',
          'Official Client Visit / Field Work',
          'Severe Weather / Commute Disruption',
          'Approved Half-Day Leave',
          'Manager Authorized Departure',
        ],
        onConfirm: (reason) => executeToggleEarlyLogout(emp, true, reason),
      });
    } else {
      promptReason({
        title: 'Revoke Early Logout Permission',
        subtitle: `Restore standard shift hours requirement for ${emp.name} on ${selectedDate}`,
        permissionType: 'early_logout',
        employee: emp,
        date: selectedDate,
        chips: ['Cancelled early departure', 'Returned to full shift', 'Manager directive'],
        onConfirm: (reason) => executeToggleEarlyLogout(emp, false, reason),
      });
    }
  };

  const executeToggleEarlyLogout = async (emp, allowed, reason) => {
    setProcessingId(emp.id);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/admin/permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: 'toggle_early_logout',
          userId: emp.id,
          date: selectedDate,
          allowed,
          reason,
        }),
      });
      if (res.ok) {
        setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, early_logout_allowed: allowed, early_logout_reason: allowed ? reason : '' } : e));
        notify(`Early Logout ${allowed ? 'Authorized' : 'Revoked'} for ${emp.name}`);
        fetchPermissionsData(selectedDate);
      } else {
        notify('Failed to update Early Logout permission', 'error');
      }
    } catch (err) {
      notify('Network error updating Early Logout', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // 5. BATCH ACTIONS
  const handleBatchWfh = (grant) => {
    promptReason({
      title: grant ? 'Grant WFH for ALL Staff' : 'Revoke WFH for ALL Staff',
      subtitle: grant ? 'Permit all active staff to log in remotely' : 'Require all staff to log in inside office premises',
      permissionType: 'wfh',
      employee: { name: 'All Staff Members', employee_id: 'ALL' },
      date: selectedDate,
      chips: grant
        ? ['Severe weather / Rain alert', 'Office maintenance / Renovation', 'Festival / Holiday advisory', 'Management directive']
        : ['Resumed regular office operations', 'Weather advisory cleared'],
      onConfirm: async (reason) => {
        try {
          const token = getAuthToken();
          const res = await fetch('/api/admin/permissions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              action: 'toggle_all_wfh',
              wfh_allowed: grant,
              reason,
            }),
          });
          if (res.ok) {
            setEmployees(prev => prev.map(e => ({ ...e, wfh_allowed: grant })));
            notify(`WFH ${grant ? 'granted to' : 'revoked from'} all staff members`);
            fetchPermissionsData(selectedDate);
          }
        } catch {
          notify('Batch action failed', 'error');
        }
      },
    });
  };

  const handleBatchWaive40 = () => {
    promptReason({
      title: `Waive 40% Clause for ALL Staff (${selectedDate})`,
      subtitle: `Exempt all employees from the 40% daily minimum clause on ${selectedDate}`,
      permissionType: 'clause_40_waive',
      employee: { name: 'All Staff Members', employee_id: 'ALL' },
      date: selectedDate,
      chips: ['CRM Server downtime', 'Calling carrier outage', 'All-hands team meeting', 'Management exemption'],
      onConfirm: async (reason) => {
        try {
          const token = getAuthToken();
          const res = await fetch('/api/admin/permissions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              action: 'toggle_40_clause',
              userId: 'ALL',
              date: selectedDate,
              ignore: true,
              reason,
            }),
          });
          if (res.ok) {
            setEmployees(prev => prev.map(e => ({ ...e, clause40_waived: true })));
            notify(`40% clause waived for ALL employees on ${selectedDate}`);
            fetchPermissionsData(selectedDate);
          }
        } catch {
          notify('Batch waiver failed', 'error');
        }
      },
    });
  };

  // 6. UPDATE HRMS SYSTEM STATUS / ANNOUNCEMENT / EMERGENCY STOP
  const handleUpdateSystemStatus = async (shouldStop) => {
    setIsUpdatingStatus(true);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/admin/permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: 'set_hrms_stop',
          stopped: shouldStop,
          announcement: announcementText,
          level: announcementLevel,
          reason: shouldStop ? 'Emergency pause broadcast' : announcementText || 'Normal operation status',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSystemStatus(data.systemStatus);
        notify(data.message || 'System status broadcast updated successfully');
        fetchPermissionsData(selectedDate);
      } else {
        notify('Failed to update system status', 'error');
      }
    } catch {
      notify('Network error updating system status', 'error');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchSearch = !searchTerm || (
        emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employee_id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      const matchRole = filterRole === 'all' || emp.role === filterRole;
      let matchStatus = true;
      if (filterStatus === 'late') matchStatus = emp.attendance?.is_late || emp.attendance?.status === 'late';
      else if (filterStatus === 'wfh') matchStatus = !!emp.wfh_allowed;
      else if (filterStatus === 'waived') matchStatus = !!emp.clause40_waived;
      else if (filterStatus === 'early') matchStatus = !!emp.early_logout_allowed;

      return matchSearch && matchRole && matchStatus;
    });
  }, [employees, searchTerm, filterRole, filterStatus]);

  // Aggregate stats
  const stats = useMemo(() => {
    const total = employees.length;
    const wfh = employees.filter(e => e.wfh_allowed).length;
    const late = employees.filter(e => e.attendance?.is_late || e.attendance?.status === 'late').length;
    const onTime = employees.filter(e => e.attendance?.status === 'present' && !e.attendance?.is_late).length;
    const waived = employees.filter(e => e.clause40_waived).length;
    const early = employees.filter(e => e.early_logout_allowed).length;
    return { total, wfh, late, onTime, waived, early };
  }, [employees]);

  // Filtered history records
  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      const matchType = historyTypeFilter === 'all' || item.permission_type === historyTypeFilter;
      const q = historySearch.toLowerCase().trim();
      const matchQuery = !q || (
        (item.user_name || '').toLowerCase().includes(q) ||
        (item.employee_id || '').toLowerCase().includes(q) ||
        (item.reason || '').toLowerCase().includes(q) ||
        (item.granted_by || '').toLowerCase().includes(q) ||
        (item.effective_date || '').includes(q)
      );
      return matchType && matchQuery;
    });
  }, [history, historyTypeFilter, historySearch]);

  const formatHistoryTimestamp = (dateVal) => {
    if (!dateVal) return '—';
    try {
      const d = new Date(dateVal);
      return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return String(dateVal);
    }
  };

  const renderPermissionBadge = (type) => {
    switch (type) {
      case 'early_logout':
        return (
          <span style={{ padding: '4px 10px', borderRadius: 99, fontSize: 11.5, fontWeight: 800, background: '#FEF3C7', color: '#B45309', border: '1px solid #FCD34D', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            🚪 Early Logout
          </span>
        );
      case 'wfh':
        return (
          <span style={{ padding: '4px 10px', borderRadius: 99, fontSize: 11.5, fontWeight: 800, background: '#E0F2FE', color: '#0369A1', border: '1px solid #BAE6FD', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            🏠 Work From Home
          </span>
        );
      case 'auto_attendance_ontime':
        return (
          <span style={{ padding: '4px 10px', borderRadius: 99, fontSize: 11.5, fontWeight: 800, background: '#DCFCE7', color: '#15803D', border: '1px solid #BBF7D0', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            ⚡ Auto Attendance (On-Time)
          </span>
        );
      case 'clause_40_waive':
        return (
          <span style={{ padding: '4px 10px', borderRadius: 99, fontSize: 11.5, fontWeight: 800, background: '#F3E8FF', color: '#7E22CE', border: '1px solid #E9D5FF', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            🛡️ 40% Clause Waived
          </span>
        );
      default:
        return (
          <span style={{ padding: '4px 10px', borderRadius: 99, fontSize: 11.5, fontWeight: 800, background: '#F1F5F9', color: '#475569' }}>
            {type}
          </span>
        );
    }
  };

  return (
    <div className="anim-fadeup" style={{ paddingBottom: 40 }}>
      {/* Toast Feedback Notification */}
      {feedback.msg && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 9999,
            background: feedback.type === 'error' ? '#EF4444' : '#10B981',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 14,
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span>{feedback.type === 'error' ? '⚠️' : '✅'}</span>
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
            Staff Permissions & Operational Hub
          </h1>
          <p style={{ fontSize: 13.5, color: '#64748B', margin: '4px 0 0 0' }}>
            Manage Work From Home (WFH), attendance overrides, 40% performance waivers, early logout permissions, and audit history
          </p>
        </div>

        {/* Date Selector & Shift Hours Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div
            style={{
              padding: '6px 14px',
              borderRadius: 99,
              fontSize: 12,
              fontWeight: 800,
              background: isSaturday ? '#FEF3C7' : '#EFF6FF',
              color: isSaturday ? '#B45309' : '#1D4ED8',
              border: `1px solid ${isSaturday ? '#FCD34D' : '#BFDBFE'}`,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>⏰</span>
            <span>{isSaturday ? 'Saturday • 6 Hours Shift' : 'Weekday • 9 Hours Shift'}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '4px 8px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <button
              type="button"
              onClick={() => changeDateBy(-1)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px 10px', fontSize: 14, fontWeight: 800, color: '#475569' }}
              title="Previous Day"
            >
              ◀
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ border: 'none', fontWeight: 800, fontSize: 13, color: '#0F172A', outline: 'none', padding: '4px 6px' }}
            />
            <button
              type="button"
              onClick={() => changeDateBy(1)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px 10px', fontSize: 14, fontWeight: 800, color: '#475569' }}
              title="Next Day"
            >
              ▶
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
              style={{ marginLeft: 6, background: '#F1F5F9', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 800, color: '#334155', cursor: 'pointer' }}
            >
              Today
            </button>
          </div>
        </div>
      </div>

      {/* Tab Switcher: Employee Permissions vs History & Logs vs Global Roles Matrix */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setActiveTab('employees')}
          style={{
            padding: '9px 18px',
            borderRadius: 10,
            fontSize: 13.5,
            fontWeight: 800,
            cursor: 'pointer',
            border: 'none',
            background: activeTab === 'employees' ? '#0F172A' : '#F1F5F9',
            color: activeTab === 'employees' ? '#FFFFFF' : '#475569',
            transition: 'all 0.15s ease',
          }}
        >
          Staff Permissions & Overrides ({employees.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          style={{
            padding: '9px 18px',
            borderRadius: 10,
            fontSize: 13.5,
            fontWeight: 800,
            cursor: 'pointer',
            border: 'none',
            background: activeTab === 'history' ? '#0F172A' : '#F1F5F9',
            color: activeTab === 'history' ? '#FFFFFF' : '#475569',
            transition: 'all 0.15s ease',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>📜</span>
          <span>Permission History & Audit Log ({history.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('roles')}
          style={{
            padding: '9px 18px',
            borderRadius: 10,
            fontSize: 13.5,
            fontWeight: 800,
            cursor: 'pointer',
            border: 'none',
            background: activeTab === 'roles' ? '#0F172A' : '#F1F5F9',
            color: activeTab === 'roles' ? '#FFFFFF' : '#475569',
            transition: 'all 0.15s ease',
          }}
        >
          Role Permissions Matrix
        </button>
      </div>

      {activeTab === 'roles' ? (
        /* ROLES PERMISSIONS MATRIX (Preserved) */
        <div className="card anim-fadeup">
          <div className="card-hdr">
            <div>
              <div className="section-title">Roles & Global Permissions Matrix</div>
              <div className="section-sub">Configure functional policy thresholds across company role designations</div>
            </div>
          </div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Designated System Role</th>
                  <th style={{ textAlign: 'center' }}>Payroll Access</th>
                  <th style={{ textAlign: 'center' }}>Staff Attendance</th>
                  <th style={{ textAlign: 'center' }}>Delete Records</th>
                  <th style={{ textAlign: 'center' }}>Approve Leaves</th>
                  <th style={{ textAlign: 'center' }}>View Reports</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(matrix).map(([r, perms]) => (
                  <tr key={r}>
                    <td style={{ fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-primary)' }}>{r}</td>
                    {['payroll', 'attendance', 'deleteEmp', 'approveLeave', 'reports'].map(k => (
                      <td key={k} style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={!!perms[k]}
                          onChange={() => toggleRolePerm(r, k)}
                          style={{ cursor: 'pointer', width: 16, height: 16 }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'history' ? (
        /* PERMISSION HISTORY & AUDIT LOG TAB */
        <div className="card anim-fadeup" style={{ padding: 0, overflow: 'hidden' }}>
          {/* History Header & Filters */}
          <div style={{ padding: '16px 20px', background: '#FFFFFF', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#0F172A' }}>Permission Grant & Audit History</div>
              <div style={{ fontSize: 12.5, color: '#64748B' }}>Complete record of all Early Logout, WFH, Attendance Overrides, and 40% Waivers granted with short reasons</div>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search history by employee, reason, admin..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, minWidth: 260, outline: 'none' }}
              />

              <select
                value={historyTypeFilter}
                onChange={(e) => setHistoryTypeFilter(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, background: '#FFFFFF', fontWeight: 600 }}
              >
                <option value="all">All Permission Types</option>
                <option value="early_logout">Early Logout (🚪)</option>
                <option value="wfh">Work From Home (🏠)</option>
                <option value="auto_attendance_ontime">Auto Attendance (⚡)</option>
                <option value="clause_40_waive">40% Clause Waiver (🛡️)</option>
              </select>

              <button
                type="button"
                onClick={() => fetchPermissionsData(selectedDate)}
                style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#F8FAFC', fontSize: 13, fontWeight: 700, color: '#334155', cursor: 'pointer' }}
              >
                ↻ Refresh
              </button>
            </div>
          </div>

          {/* History Table */}
          <div className="tbl-wrap">
            <table className="tbl" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th style={{ width: 180 }}>Date & Time</th>
                  <th style={{ width: 220 }}>Employee</th>
                  <th style={{ width: 180 }}>Permission Type</th>
                  <th style={{ width: 120 }}>Effective Date</th>
                  <th style={{ width: 110, textAlign: 'center' }}>Action</th>
                  <th>Reason / Justification</th>
                  <th style={{ width: 160 }}>Authorized By</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 48, textAlign: 'center', color: '#64748B' }}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>📜</div>
                      <div style={{ fontWeight: 800, color: '#0F172A', fontSize: 15 }}>No permission history records found</div>
                      <div style={{ fontSize: 13, marginTop: 4 }}>
                        When you grant or revoke Early Logout, WFH, Auto Attendance, or 40% Clause permissions, an audit trail with reasons will appear here.
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((item) => (
                    <tr key={item._id || item.id}>
                      <td style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>
                        {formatHistoryTimestamp(item.createdAt)}
                      </td>
                      <td>
                        <div style={{ fontWeight: 800, color: '#0F172A', fontSize: 13.5 }}>{item.user_name}</div>
                        <div style={{ fontSize: 11, color: '#64748B' }}>{item.employee_id || 'EMP'}</div>
                      </td>
                      <td>
                        {renderPermissionBadge(item.permission_type)}
                      </td>
                      <td style={{ fontSize: 12.5, fontWeight: 700, color: '#334155' }}>
                        {item.effective_date}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            background: item.action === 'granted' ? '#DCFCE7' : item.action === 'revoked' ? '#FEE2E2' : '#F3E8FF',
                            color: item.action === 'granted' ? '#166534' : item.action === 'revoked' ? '#991B1B' : '#7E22CE',
                          }}
                        >
                          {item.action}
                        </span>
                      </td>
                      <td style={{ fontSize: 12.5, color: '#1E293B' }}>
                        <div style={{ background: '#F8FAFC', padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E8F0', display: 'inline-block', maxWidth: 450, fontWeight: 600 }}>
                          "{item.reason}"
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 12.5 }}>{item.granted_by}</div>
                        <span style={{ fontSize: 10.5, fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                          {item.granted_by_role}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* EMPLOYEES PERMISSIONS & OVERRIDES TAB */
        <>
          {/* EMERGENCY SYSTEM ANNOUNCEMENT & STOP HRMS PANEL */}
          <div
            style={{
              background: systemStatus.hrms_stopped ? '#FEF2F2' : '#FFFFFF',
              border: `1px solid ${systemStatus.hrms_stopped ? '#FECACA' : '#E2E8F0'}`,
              borderRadius: 16,
              padding: '20px 24px',
              marginBottom: 20,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22 }}>📢</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: systemStatus.hrms_stopped ? '#B91C1C' : '#0F172A' }}>
                    {systemStatus.hrms_stopped ? 'HRMS Emergency Stop Activated' : 'System Announcement & Emergency Controls'}
                  </div>
                  <div style={{ fontSize: 12.5, color: '#64748B' }}>
                    Broadcast real-time announcements to all employee portals, or pause HRMS attendance clock-ins anytime
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div
                style={{
                  padding: '6px 14px',
                  borderRadius: 99,
                  fontWeight: 800,
                  fontSize: 12,
                  background: systemStatus.hrms_stopped ? '#DC2626' : systemStatus.hrms_announcement ? '#D97706' : '#10B981',
                  color: '#FFFFFF',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>●</span>
                <span>{systemStatus.hrms_stopped ? 'HRMS STOPPED / PAUSED' : systemStatus.hrms_announcement ? 'BROADCAST ACTIVE' : 'HRMS OPERATIONAL'}</span>
              </div>
            </div>

            {/* Input Row */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text"
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                placeholder="Type an announcement to broadcast across all staff portals (e.g. Server maintenance from 2:00 PM)..."
                style={{
                  flex: 1,
                  minWidth: 260,
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1px solid #CBD5E1',
                  fontSize: 13.5,
                  outline: 'none',
                }}
              />
              <select
                value={announcementLevel}
                onChange={(e) => setAnnouncementLevel(e.target.value)}
                style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 13, fontWeight: 700, background: '#FFFFFF' }}
              >
                <option value="info">Info (Blue Banner)</option>
                <option value="warning">Warning (Amber Banner)</option>
                <option value="urgent">Urgent / Pause (Red Banner)</option>
              </select>

              <button
                type="button"
                onClick={() => handleUpdateSystemStatus(false)}
                disabled={isUpdatingStatus || !announcementText.trim()}
                style={{
                  background: '#0284C7',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: 10,
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: isUpdatingStatus ? 'not-allowed' : 'pointer',
                  opacity: isUpdatingStatus || !announcementText.trim() ? 0.6 : 1,
                }}
              >
                Broadcast Announcement
              </button>

              {/* Stop / Resume HRMS Button */}
              {systemStatus.hrms_stopped ? (
                <button
                  type="button"
                  onClick={() => handleUpdateSystemStatus(false)}
                  disabled={isUpdatingStatus}
                  style={{
                    background: '#10B981',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: 10,
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  ▶ Resume HRMS Operations
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Are you sure you want to STOP HRMS? This will broadcast an emergency pause banner to all staff.')) {
                      handleUpdateSystemStatus(true);
                    }
                  }}
                  disabled={isUpdatingStatus}
                  style={{
                    background: '#DC2626',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: 10,
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  🛑 Stop HRMS Anytime
                </button>
              )}

              {systemStatus.hrms_announcement && (
                <button
                  type="button"
                  onClick={() => {
                    setAnnouncementText('');
                    handleUpdateSystemStatus(false);
                  }}
                  style={{
                    background: '#F1F5F9',
                    color: '#475569',
                    border: '1px solid #CBD5E1',
                    padding: '10px 14px',
                    borderRadius: 10,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Clear Announcement
                </button>
              )}
            </div>
          </div>

          {/* METRIC OVERVIEW CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 20 }}>
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Total Active Staff</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#0F172A', marginTop: 4 }}>{stats.total}</div>
              <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{requiredShiftHours}h Shift ({isSaturday ? 'Saturday' : 'Mon–Fri'})</div>
            </div>

            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>WFH Allowed</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#0284C7', marginTop: 4 }}>{stats.wfh}</div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Remote login permitted</div>
            </div>

            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Late Punches ({selectedDate})</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: stats.late > 0 ? '#DC2626' : '#10B981', marginTop: 4 }}>{stats.late}</div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Eligible for On-Time Override</div>
            </div>

            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>40% Clause Waived</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#7C3AED', marginTop: 4 }}>{stats.waived}</div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Exempt from half-day deduction</div>
            </div>

            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Early Logout Authorized</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: stats.early > 0 ? '#B45309' : '#64748B', marginTop: 4 }}>{stats.early}</div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>No early departure penalty</div>
            </div>
          </div>

          {/* SEARCH & FILTERS BAR */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: 16, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flex: 1 }}>
              <input
                type="text"
                placeholder="Search staff by name, ID, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, minWidth: 240, outline: 'none' }}
              />

              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, background: '#FFFFFF', fontWeight: 600 }}
              >
                <option value="all">All Roles</option>
                <option value="employee">Employees</option>
                <option value="admin">HR Admins</option>
                <option value="finance">Finance</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, background: '#FFFFFF', fontWeight: 600 }}
              >
                <option value="all">All Statuses</option>
                <option value="late">Late Punch Only</option>
                <option value="wfh">WFH Allowed Only</option>
                <option value="waived">40% Clause Waived Only</option>
                <option value="early">Early Logout Allowed Only</option>
              </select>
            </div>

            {/* Batch Action Buttons */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => handleBatchWfh(true)}
                style={{ padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0', cursor: 'pointer' }}
              >
                Grant All WFH
              </button>
              <button
                type="button"
                onClick={() => handleBatchWfh(false)}
                style={{ padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: '#F8FAFC', color: '#475569', border: '1px solid #CBD5E1', cursor: 'pointer' }}
              >
                Revoke All WFH
              </button>
              <button
                type="button"
                onClick={handleBatchWaive40}
                style={{ padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: '#FAF5FF', color: '#6B21A8', border: '1px solid #E9D5FF', cursor: 'pointer' }}
              >
                Waive 40% for All ({selectedDate})
              </button>
            </div>
          </div>

          {/* MAIN EMPLOYEES PERMISSIONS & OVERRIDES TABLE */}
          <div className="card anim-fadeup" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="tbl-wrap">
              <table className="tbl" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th style={{ width: 220 }}>Employee</th>
                    <th style={{ width: 130 }}>Role</th>
                    <th style={{ width: 150, textAlign: 'center' }}>
                      Work From Home
                      <div style={{ fontSize: 10, fontWeight: 500, color: '#94A3B8' }}>Remote login</div>
                    </th>
                    <th style={{ width: 250 }}>
                      Attendance ({selectedDate})
                      <div style={{ fontSize: 10, fontWeight: 500, color: '#94A3B8' }}>Auto On-Time Override</div>
                    </th>
                    <th style={{ width: 190, textAlign: 'center' }}>
                      40% Performance Clause
                      <div style={{ fontSize: 10, fontWeight: 500, color: '#94A3B8' }}>Waiver for {selectedDate}</div>
                    </th>
                    <th style={{ width: 190, textAlign: 'center' }}>
                      Early Logout
                      <div style={{ fontSize: 10, fontWeight: 500, color: '#94A3B8' }}>Permission for {selectedDate}</div>
                    </th>
                    <th style={{ width: 120, textAlign: 'center' }}>Daily Shift</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>
                        Loading staff permissions and attendance records...
                      </td>
                    </tr>
                  ) : filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>
                        No staff members match the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp) => {
                      const isLate = emp.attendance?.is_late || emp.attendance?.status === 'late';
                      const isPresent = emp.attendance?.status === 'present';
                      const isOverridden = emp.attendance?.is_overridden;
                      const checkIn = emp.attendance?.check_in_time;
                      const isProcessing = processingId === emp.id;

                      return (
                        <tr key={emp.id}>
                          {/* Employee Info */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <img
                                src={emp.avatar_url}
                                alt={emp.name}
                                style={{ width: 36, height: 36, borderRadius: 99, background: '#F1F5F9', border: '1px solid #E2E8F0' }}
                              />
                              <div>
                                <div style={{ fontWeight: 800, color: '#0F172A', fontSize: 13.5 }}>{emp.name}</div>
                                <div style={{ fontSize: 11.5, color: '#64748B' }}>{emp.employee_id} • {emp.designation}</div>
                              </div>
                            </div>
                          </td>

                          {/* Role Badge */}
                          <td>
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                background: emp.role === 'admin' ? '#FEE2E2' : emp.role === 'finance' ? '#FEF3C7' : '#EFF6FF',
                                color: emp.role === 'admin' ? '#991B1B' : emp.role === 'finance' ? '#92400E' : '#1E40AF',
                              }}
                            >
                              {emp.role}
                            </span>
                          </td>

                          {/* 1. WORK FROM HOME (WFH) TOGGLE */}
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                              <button
                                type="button"
                                onClick={() => handleToggleWfh(emp)}
                                disabled={isProcessing}
                                style={{
                                  padding: '5px 12px',
                                  borderRadius: 99,
                                  fontSize: 12,
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  border: 'none',
                                  background: emp.wfh_allowed ? '#DCFCE7' : '#F1F5F9',
                                  color: emp.wfh_allowed ? '#166534' : '#64748B',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                {emp.wfh_allowed ? '✓ WFH Allowed' : 'Office Only'}
                              </button>
                            </div>
                          </td>

                          {/* 2. ATTENDANCE & AUTO ON-TIME OVERRIDE */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                              <div>
                                {isLate ? (
                                  <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 800, background: '#FEE2E2', color: '#991B1B' }}>
                                    ● LATE {checkIn ? `(${checkIn})` : ''}
                                  </span>
                                ) : isPresent ? (
                                  <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 800, background: '#DCFCE7', color: '#166534' }}>
                                    ● ON-TIME {checkIn ? `(${checkIn})` : ''}
                                    {isOverridden && <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.8 }}>(Override)</span>}
                                  </span>
                                ) : (
                                  <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: '#F1F5F9', color: '#64748B' }}>
                                    No punch
                                  </span>
                                )}
                              </div>

                              {/* One-Click Action: Change Late to On-Time */}
                              {isLate ? (
                                <button
                                  type="button"
                                  onClick={() => handleOverrideOnTime(emp)}
                                  disabled={isProcessing}
                                  style={{
                                    padding: '5px 10px',
                                    borderRadius: 6,
                                    fontSize: 11.5,
                                    fontWeight: 800,
                                    background: '#10B981',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    cursor: 'pointer',
                                    boxShadow: '0 1px 3px rgba(16,185,129,0.3)',
                                  }}
                                  title="Employee reached early/on-time but had login failure. Click to change to on-time and remove late deduction."
                                >
                                  ⚡ Mark On-Time
                                </button>
                              ) : !isPresent ? (
                                <button
                                  type="button"
                                  onClick={() => handleOverrideOnTime(emp)}
                                  disabled={isProcessing}
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: 6,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    background: '#F1F5F9',
                                    color: '#334155',
                                    border: '1px solid #CBD5E1',
                                    cursor: 'pointer',
                                  }}
                                  title="Record on-time attendance for missed clock-in"
                                >
                                  + Mark Present
                                </button>
                              ) : (
                                <span style={{ fontSize: 11, color: '#10B981', fontWeight: 700 }}>✓ Clean</span>
                              )}
                            </div>
                          </td>

                          {/* 3. 40% PERFORMANCE CLAUSE WAIVER */}
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleToggle40Clause(emp)}
                              disabled={isProcessing}
                              style={{
                                padding: '5px 12px',
                                borderRadius: 99,
                                fontSize: 11.5,
                                fontWeight: 800,
                                cursor: 'pointer',
                                border: 'none',
                                background: emp.clause40_waived ? '#F3E8FF' : '#F1F5F9',
                                color: emp.clause40_waived ? '#7E22CE' : '#64748B',
                                transition: 'all 0.15s ease',
                              }}
                              title="When waived, employee is exempt from the 40% minimum half-day absent risk on this date"
                            >
                              {emp.clause40_waived ? '✓ Waived (HR Override)' : 'Enforce 40%'}
                            </button>
                          </td>

                          {/* 4. EARLY LOGOUT PERMISSION */}
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                              <button
                                type="button"
                                onClick={() => handleToggleEarlyLogout(emp)}
                                disabled={isProcessing}
                                style={{
                                  padding: '5px 12px',
                                  borderRadius: 99,
                                  fontSize: 11.5,
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  border: 'none',
                                  background: emp.early_logout_allowed ? '#FEF3C7' : '#F1F5F9',
                                  color: emp.early_logout_allowed ? '#B45309' : '#64748B',
                                  transition: 'all 0.15s ease',
                                }}
                                title="Authorize employee to clock out early without early warnings or half-day penalty on this date"
                              >
                                {emp.early_logout_allowed ? '✓ Early Logout Allowed' : 'Standard Shift'}
                              </button>
                              {emp.early_logout_reason && (
                                <div
                                  style={{
                                    fontSize: 10.5,
                                    color: '#92400E',
                                    maxWidth: 160,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    fontWeight: 600,
                                  }}
                                  title={emp.early_logout_reason}
                                >
                                  "{emp.early_logout_reason}"
                                </div>
                              )}
                            </div>
                          </td>

                          {/* SHIFT HOURS (9h Mon-Fri / 6h Sat) */}
                          <td style={{ textAlign: 'center' }}>
                            <span style={{ fontSize: 12, fontWeight: 800, color: isSaturday ? '#B45309' : '#0F172A' }}>
                              {requiredShiftHours}h Shift
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* SHORT REASON CONFIRMATION MODAL */}
      {reasonModal.isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 20,
              maxWidth: 520,
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              border: '1px solid #E2E8F0',
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: '#EFF6FF',
                    color: '#2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                  }}
                >
                  {reasonModal.permissionType === 'early_logout'
                    ? '🚪'
                    : reasonModal.permissionType === 'wfh'
                    ? '🏠'
                    : reasonModal.permissionType === 'auto_attendance_ontime'
                    ? '⚡'
                    : '🛡️'}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#0F172A' }}>
                    {reasonModal.title}
                  </h3>
                  <p style={{ margin: '3px 0 0 0', fontSize: 12, color: '#64748B' }}>
                    {reasonModal.subtitle}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px 24px' }}>
              {reasonModal.employee && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 12,
                    background: '#F1F5F9',
                    marginBottom: 16,
                    fontSize: 12.5,
                  }}
                >
                  <span style={{ fontWeight: 800, color: '#0F172A' }}>
                    👤 {reasonModal.employee.name} ({reasonModal.employee.employee_id || 'STAFF'})
                  </span>
                  <span style={{ fontWeight: 700, color: '#64748B' }}>
                    📅 {reasonModal.date || selectedDate}
                  </span>
                </div>
              )}

              <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                Short Reason / Justification <span style={{ color: '#DC2626' }}>*</span>
              </label>

              <textarea
                rows={3}
                value={reasonModal.customReason}
                onChange={(e) => setReasonModal((prev) => ({ ...prev, customReason: e.target.value }))}
                placeholder="Enter short reason for granting this permission (e.g. Medical emergency, Client visit, Reached early)..."
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1px solid #CBD5E1',
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  resize: 'none',
                }}
              />

              {/* Quick Select Chips */}
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', marginBottom: 6 }}>
                  Quick Fill Reason:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(reasonModal.chips || []).map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setReasonModal((prev) => ({ ...prev, customReason: chip }))}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 99,
                        fontSize: 11,
                        fontWeight: 700,
                        border: '1px solid #E2E8F0',
                        background: reasonModal.customReason === chip ? '#EFF6FF' : '#FFFFFF',
                        color: reasonModal.customReason === chip ? '#1D4ED8' : '#475569',
                        cursor: 'pointer',
                        transition: 'all 0.1s ease',
                      }}
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 10,
                padding: '16px 24px',
                background: '#F8FAFC',
                borderTop: '1px solid #E2E8F0',
              }}
            >
              <button
                type="button"
                onClick={() => setReasonModal((prev) => ({ ...prev, isOpen: false }))}
                style={{
                  padding: '8px 16px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  background: '#FFFFFF',
                  color: '#475569',
                  border: '1px solid #CBD5E1',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const finalReason = reasonModal.customReason.trim() || 'Approved by HR';
                  if (typeof reasonModal.onConfirm === 'function') {
                    reasonModal.onConfirm(finalReason);
                  }
                  setReasonModal((prev) => ({ ...prev, isOpen: false }));
                }}
                style={{
                  padding: '8px 20px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 800,
                  background: '#0F172A',
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
              >
                Confirm & Grant
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

