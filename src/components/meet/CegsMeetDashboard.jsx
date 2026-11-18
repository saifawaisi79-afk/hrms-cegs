'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { formatDateDMY } from '@/lib/date-format';
import {
  Video,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  Users,
  Copy,
  Check,
  Search,
  Trash2,
  AlertCircle,
  Shield,
  Eye,
  CheckCircle,
  XCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Info,
  LogOut,
  Sparkles,
} from 'lucide-react';

export function CegsMeetDashboard({ db, save, user }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('upcoming'); // 'calendar' | 'upcoming' | 'history' | 'cancelled'
  const [meetings, setMeetings] = useState([]);
  const [stats, setStats] = useState({
    totalMeetings: 0,
    upcomingCount: 0,
    completedCount: 0,
    cancelledCount: 0,
    totalMinutes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // Google OAuth Status
  const [googleStatus, setGoogleStatus] = useState({
    connected: false,
    email: '',
    isConfigured: true,
  });
  const [statusMessage, setStatusMessage] = useState(null);

  // Quick Join input
  const [quickJoinCode, setQuickJoinCode] = useState('');
  const [quickJoinError, setQuickJoinError] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [attendanceModalMeeting, setAttendanceModalMeeting] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Create Form State
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    agenda: '',
    type: 'scheduled',
    scheduled_date: new Date().toISOString().slice(0, 10),
    scheduled_start_time: '11:00',
    duration_minutes: 30,
    privacy: 'internal',
    allowed_departments: [],
    participant_user_ids: [],
  });
  const [participantSearch, setParticipantSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calendar State
  const [calendarDate, setCalendarDate] = useState(new Date().toISOString().slice(0, 10));

  const isHR = user?.role === 'admin' || user?.role === 'finance';
  const isSA = user?.role === 'super_admin';
  const canManage = isHR || isSA;

  // 1. Fetch meetings list & stats from backend
  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('cegs_token') || '';
      const res = await fetch('/api/meet', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.meetings) {
        setMeetings(data.meetings);
        if (data.stats) setStats(data.stats);
      }
    } catch (e) {
      console.warn('Failed to load meetings:', e);
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Google OAuth connection status
  const fetchGoogleStatus = async () => {
    try {
      const token = localStorage.getItem('cegs_token') || '';
      const res = await fetch('/api/meet/google/status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setGoogleStatus({
          connected: data.connected,
          email: data.email || '',
          isConfigured: data.isConfigured,
        });
      }
    } catch (e) { }
  };

  useEffect(() => {
    fetchMeetings();
    fetchGoogleStatus();

    // Check URL parameters for OAuth redirect feedback
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('google_connected') === 'true') {
        const email = urlParams.get('email') || '';
        setStatusMessage({
          type: 'success',
          text: `Google Account successfully connected${email ? ` (${email})` : ''}! You can now generate official Google Meet links.`,
        });
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (urlParams.get('google_error')) {
        setStatusMessage({
          type: 'error',
          text: `Google OAuth Error: ${urlParams.get('google_error')}`,
        });
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  // 3. Filtered list based on active tab & search
  const filteredMeetings = useMemo(() => {
    let list = [...meetings];
    if (activeTab === 'upcoming') {
      list = list.filter(m => ['scheduled', 'in_progress'].includes(m.status));
    } else if (activeTab === 'history') {
      list = list.filter(m => m.status === 'completed');
    } else if (activeTab === 'cancelled') {
      list = list.filter(m => m.status === 'cancelled');
    } else if (activeTab === 'calendar') {
      list = list.filter(m => m.scheduled_date === calendarDate);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(m =>
        m.title.toLowerCase().includes(q) ||
        m.meeting_id.toLowerCase().includes(q) ||
        (m.google_meet_url && m.google_meet_url.toLowerCase().includes(q)) ||
        m.host_name.toLowerCase().includes(q) ||
        (m.description && m.description.toLowerCase().includes(q))
      );
    }

    return list;
  }, [meetings, activeTab, calendarDate, searchQuery]);

  // 4. Quick Join by Code
  const handleQuickJoin = (e) => {
    e.preventDefault();
    setQuickJoinError('');
    const code = quickJoinCode.trim().toLowerCase();
    if (!code) return;

    // Check if code matches an existing meeting in DB
    const matched = meetings.find(m =>
      m.meeting_id.toLowerCase() === code ||
      m.meeting_id.replace(/-/g, '') === code.replace(/-/g, '') ||
      (m.google_meet_code && m.google_meet_code.toLowerCase() === code)
    );

    if (matched) {
      if (matched.status === 'cancelled') {
        setQuickJoinError('This meeting has been cancelled.');
        return;
      }
      handleJoinGoogleMeet(matched);
    } else if (code.startsWith('http://') || code.startsWith('https://')) {
      window.open(code, '_blank', 'noopener,noreferrer');
    } else {
      // Direct jump to Google Meet by code
      window.open(`https://meet.google.com/${code}`, '_blank', 'noopener,noreferrer');
    }
  };

  // 5. Start Instant Google Meet
  const handleStartInstant = async () => {
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('cegs_token') || '';
      const res = await fetch('/api/meet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: `Quick Sync (${user?.name || 'CEGS Team'})`,
          type: 'instant',
          privacy: 'internal',
        })
      });
      const data = await res.json();
      if (res.ok && data.meeting) {
        setMeetings(prev => [data.meeting, ...prev]);
        const meetUrl = data.googleMeetUrl || data.meeting.google_meet_url;
        if (meetUrl) {
          window.open(meetUrl, '_blank', 'noopener,noreferrer');
        } else {
          router.push(`/meet/${data.meeting.meeting_id}`);
        }
      } else {
        alert(data.error || 'Failed to start instant Google Meet');
      }
    } catch (e) {
      alert('Network error creating instant meeting');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 6. Submit Schedule Meeting Form
  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    if (!createForm.title.trim()) {
      alert('Please enter a meeting title');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('cegs_token') || '';
      const res = await fetch('/api/meet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(createForm)
      });
      const data = await res.json();
      if (res.ok && data.meeting) {
        setMeetings(prev => [data.meeting, ...prev]);
        setCreateModalOpen(false);
        setActiveTab('upcoming');
        setCreateForm({
          title: '',
          description: '',
          agenda: '',
          type: 'scheduled',
          scheduled_date: new Date().toISOString().slice(0, 10),
          scheduled_start_time: '11:00',
          duration_minutes: 30,
          privacy: 'internal',
          allowed_departments: [],
          participant_user_ids: [],
        });
        alert('✅ Official Google Meet generated & invitations dispatched to participants!');
      } else {
        alert(data.error || 'Failed to schedule Google Meet');
      }
    } catch (e) {
      alert('Network error scheduling meeting');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 7. Join Google Meet & Record Attendance
  const handleJoinGoogleMeet = async (meet) => {
    const meetUrl = meet.google_meet_url || (meet.meeting_id ? `https://meet.google.com/${meet.google_meet_code || meet.meeting_id}` : null);

    // Call attendance join in background
    try {
      const token = localStorage.getItem('cegs_token') || '';
      fetch(`/api/meet/${meet.meeting_id}/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'join' })
      }).catch(() => { });
    } catch (e) { }

    if (meetUrl) {
      window.open(meetUrl, '_blank', 'noopener,noreferrer');
    } else {
      router.push(`/meet/${meet.meeting_id}`);
    }
  };

  // 8. Cancel Meeting
  const handleCancelMeeting = async (meetId) => {
    const reason = window.prompt('Please enter the cancellation reason for participants:');
    if (reason === null) return;

    try {
      const token = localStorage.getItem('cegs_token') || '';
      const res = await fetch(`/api/meet/${meetId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'cancel', cancellation_reason: reason })
      });
      if (res.ok) {
        fetchMeetings();
        alert('Meeting cancelled.');
      }
    } catch (e) { }
  };

  // 9. Load Attendance Report
  const openAttendanceModal = async (meet) => {
    setAttendanceModalMeeting(meet);
    setLoadingAttendance(true);
    setAttendanceData(null);
    try {
      const token = localStorage.getItem('cegs_token') || '';
      const res = await fetch(`/api/meet/${meet.meeting_id}/attendance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setAttendanceData(data);
      }
    } catch (e) { } finally {
      setLoadingAttendance(false);
    }
  };

  // 10. Copy Meeting Link helper
  const copyMeetingUrl = (meet) => {
    const url = meet.google_meet_url || `${window.location.origin}/meet/${meet.meeting_id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(meet.meeting_id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // 11. Disconnect Google Account
  const handleDisconnectGoogle = async () => {
    if (!window.confirm('Disconnect the currently connected Google Account?')) return;
    try {
      const token = localStorage.getItem('cegs_token') || '';
      const res = await fetch('/api/meet/google/disconnect', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setGoogleStatus({ connected: false, email: '', isConfigured: true });
        setStatusMessage({ type: 'success', text: 'Google Account disconnected.' });
      }
    } catch (e) { }
  };

  const allEmployees = db?.users || [];

  return (
    <div className="anim-fadeup" style={{ maxWidth: 1240, margin: '0 auto', paddingBottom: 40 }}>
      {/* Status Toast / Banner */}
      {statusMessage && (
        <div style={{
          background: statusMessage.type === 'success' ? '#ECFDF5' : '#FEF2F2',
          border: statusMessage.type === 'success' ? '1px solid #A7F3D0' : '1px solid #FECACA',
          color: statusMessage.type === 'success' ? '#065F46' : '#991B1B',
          padding: '12px 20px',
          borderRadius: 14,
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 13,
          fontWeight: 700,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {statusMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 800 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ─── HERO HEADER & TITLE ──────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
        borderRadius: 20,
        padding: '26px 32px',
        color: '#FFFFFF',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 20,
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
      }}>
        <div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(59, 130, 246, 0.2)',
            color: '#93C5FD',
            padding: '4px 10px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 800,
            marginBottom: 8
          }}>
            <Video size={14} />
            <span>OFFICIAL GOOGLE MEET INTEGRATION</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0, letterSpacing: '-0.5px' }}>
            Meeting Scheduler & Google Meet
          </h1>
          <p style={{ fontSize: 13, color: '#94A3B8', margin: '6px 0 0 0' }}>
            Schedule meetings, invite employees from directory, auto-generate official Google Meet spaces, and track attendance.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleStartInstant}
            style={{
              background: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              padding: '11px 20px',
              borderRadius: 12,
              fontSize: 13.5,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            <Video size={16} />
            <span>Instant Google Meet</span>
          </button>

          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            style={{
              background: '#0F766E',
              color: '#FFFFFF',
              border: 'none',
              padding: '11px 20px',
              borderRadius: 12,
              fontSize: 13.5,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(15, 118, 110, 0.35)'
            }}
          >
            <Plus size={16} />
            <span>Schedule Meeting</span>
          </button>
        </div>
      </div>

      {/* ─── GOOGLE INTEGRATION STATUS CALLOUT ─────────────────── */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 16,
        padding: '14px 20px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: googleStatus.connected ? '#ECFDF5' : '#FEF3C7',
            color: googleStatus.connected ? '#059669' : '#D97706',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 900
          }}>
            <Shield size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13.5, fontWeight: 800, color: '#0F172A' }}>
                Google Workspace / Meet API
              </span>
              <span style={{
                fontSize: 11,
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: 6,
                background: googleStatus.connected ? '#D1FAE5' : '#FEF3C7',
                color: googleStatus.connected ? '#065F46' : '#B45309'
              }}>
                {googleStatus.connected ? '● CONNECTED' : 'NOT CONNECTED'}
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
              {googleStatus.connected
                ? `Active Account: ${googleStatus.email || 'Configured via Google OAuth'}`
                : 'Connect a Google Account to generate official Google Meet conference links automatically.'}
            </div>
          </div>
        </div>

        <div>
          {googleStatus.connected ? (
            canManage && (
              <button
                type="button"
                onClick={handleDisconnectGoogle}
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  color: '#64748B',
                  borderRadius: 8,
                  padding: '7px 14px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <LogOut size={13} />
                <span>Disconnect</span>
              </button>
            )
          ) : (
            <a
              href="/api/meet/google/auth"
              style={{
                background: '#2563EB',
                color: '#FFFFFF',
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: 12.5,
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                textDecoration: 'none',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)'
              }}
            >
              <ExternalLink size={14} />
              <span>Connect with Google</span>
            </a>
          )}
        </div>
      </div>

      {/* ─── QUICK STATS CARDS ─────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
        marginBottom: 24
      }}>
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '16px 20px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Meetings</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#0F172A', marginTop: 4 }}>{stats.totalMeetings}</div>
        </div>
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '16px 20px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Upcoming / Scheduled</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#2563EB', marginTop: 4 }}>{stats.upcomingCount}</div>
        </div>
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '16px 20px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Completed</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#059669', marginTop: 4 }}>{stats.completedCount}</div>
        </div>
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '16px 20px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#6366F1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Scheduled Mins</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#6366F1', marginTop: 4 }}>{stats.totalMinutes} <span style={{ fontSize: 14, fontWeight: 600 }}>mins</span></div>
        </div>
      </div>

      {/* ─── QUICK JOIN BAR & TAB CONTROLS ─────────────────────── */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 16,
        padding: '14px 20px',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16
      }}>
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { id: 'upcoming', label: `Upcoming (${stats.upcomingCount})`, icon: Clock },
            { id: 'calendar', label: 'My Calendar', icon: CalendarIcon },
            { id: 'history', label: `History (${stats.completedCount})`, icon: CheckCircle },
            { id: 'cancelled', label: `Cancelled (${stats.cancelledCount})`, icon: XCircle },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: isActive ? '#0F172A' : '#F1F5F9',
                  color: isActive ? '#FFFFFF' : '#475569',
                  border: 'none',
                  borderRadius: 10,
                  padding: '8px 14px',
                  fontSize: 13,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Quick Join Input Box */}
        <form onSubmit={handleQuickJoin} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Enter Google Meet code or URL..."
            value={quickJoinCode}
            onChange={(e) => {
              setQuickJoinCode(e.target.value);
              setQuickJoinError('');
            }}
            style={{
              background: '#F8FAFC',
              border: quickJoinError ? '1px solid #EF4444' : '1px solid #CBD5E1',
              borderRadius: 10,
              padding: '8px 14px',
              fontSize: 12.5,
              width: 250,
              outline: 'none',
              fontFamily: 'JetBrains Mono, monospace'
            }}
          />
          <button
            type="submit"
            style={{
              background: '#0F172A',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 10,
              padding: '8px 16px',
              fontSize: 12.5,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span>Join</span>
            <ExternalLink size={13} />
          </button>
        </form>
      </div>

      {quickJoinError && (
        <div style={{ color: '#EF4444', fontSize: 12, fontWeight: 700, marginBottom: 16, paddingLeft: 4 }}>
          {quickJoinError}
        </div>
      )}

      {/* ─── CALENDAR PICKER (WHEN CALENDAR TAB ACTIVE) ─────────── */}
      {activeTab === 'calendar' && (
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 16,
          padding: 16,
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap'
        }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
            <CalendarIcon size={16} color="#2563EB" />
            <span>Select Date:</span>
          </div>
          <input
            type="date"
            value={calendarDate}
            onChange={(e) => setCalendarDate(e.target.value)}
            style={{
              border: '1px solid #CBD5E1',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 13,
              fontWeight: 700,
              color: '#0F172A'
            }}
          />
          <span style={{ fontSize: 12, color: '#64748B' }}>
            Showing meetings scheduled for <strong>{formatDateDMY(calendarDate)}</strong>
          </span>
        </div>
      )}

      {/* ─── SEARCH FILTER ─────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ position: 'relative', maxWidth: 360 }}>
          <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: 12, top: 11 }} />
          <input
            type="text"
            placeholder="Search meetings by title, ID or host..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 10,
              padding: '8px 12px 8px 36px',
              fontSize: 12.5,
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* ─── MEETINGS LIST CONTAINER ───────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filteredMeetings.map((meet) => {
          const isLive = meet.status === 'in_progress';
          const isCompleted = meet.status === 'completed';
          const isCancelled = meet.status === 'cancelled';
          const isHost = String(meet.host_id) === String(user?.id);

          return (
            <div
              key={meet._id || meet.meeting_id}
              style={{
                background: '#FFFFFF',
                border: isLive ? '2px solid #10B981' : '1px solid #E2E8F0',
                borderRadius: 16,
                padding: '18px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 16,
                boxShadow: isLive ? '0 6px 20px rgba(16, 185, 129, 0.15)' : '0 2px 6px rgba(0,0,0,0.02)'
              }}
            >
              {/* Left Details */}
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flex: 1, minWidth: 280 }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: isLive ? '#ECFDF5' : isCompleted ? '#F1F5F9' : '#EFF6FF',
                  color: isLive ? '#059669' : isCompleted ? '#64748B' : '#2563EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900
                }}>
                  <Video size={20} />
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, fontSize: 16, color: '#0F172A' }}>{meet.title}</span>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: 6,
                      background: isLive ? '#D1FAE5' : isCompleted ? '#F1F5F9' : isCancelled ? '#FEE2E2' : '#EFF6FF',
                      color: isLive ? '#059669' : isCompleted ? '#475569' : isCancelled ? '#DC2626' : '#2563EB'
                    }}>
                      {isLive ? '● LIVE NOW' : meet.status.toUpperCase()}
                    </span>
                    <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>
                      ID: <code style={{ color: '#0F172A', fontWeight: 700 }}>{meet.meeting_id}</code>
                    </span>
                  </div>

                  {meet.google_meet_url && (
                    <div style={{ fontSize: 12, color: '#2563EB', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span>Google Meet:</span>
                      <a
                        href={meet.google_meet_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#2563EB', fontWeight: 700, textDecoration: 'underline' }}
                      >
                        {meet.google_meet_url}
                      </a>
                    </div>
                  )}

                  {(meet.agenda || meet.description) && (
                    <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 4 }}>
                      {meet.agenda || meet.description}
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8, fontSize: 12, color: '#475569', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CalendarIcon size={13} color="#64748B" />
                      <strong>{formatDateDMY(meet.scheduled_date)}</strong> at <strong>{meet.scheduled_start_time}</strong>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={13} color="#64748B" />
                      {meet.duration_minutes} mins
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Users size={13} color="#64748B" />
                      Host: <strong>{meet.host_name}</strong> {isHost && '(You)'}
                    </span>
                    <span>
                      Participants: <strong>{meet.participants?.length || 0}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => copyMeetingUrl(meet)}
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid #CBD5E1',
                    color: copiedId === meet.meeting_id ? '#059669' : '#475569',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontSize: 12,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer'
                  }}
                >
                  {copiedId === meet.meeting_id ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedId === meet.meeting_id ? 'Copied' : 'Copy Meet Link'}</span>
                </button>

                {!isCancelled && (
                  <button
                    type="button"
                    onClick={() => handleJoinGoogleMeet(meet)}
                    style={{
                      background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 8,
                      padding: '8px 18px',
                      fontSize: 13,
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)'
                    }}
                  >
                    <Video size={14} />
                    <span>Join Google Meet</span>
                    <ExternalLink size={13} />
                  </button>
                )}

                {/* View Attendance details */}
                <button
                  type="button"
                  onClick={() => openAttendanceModal(meet)}
                  style={{
                    background: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    color: '#334155',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontSize: 12,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer'
                  }}
                >
                  <Eye size={13} />
                  <span>Attendance</span>
                </button>

                {/* Cancel option for Host */}
                {(isHost || canManage) && !isCancelled && !isCompleted && (
                  <button
                    type="button"
                    onClick={() => handleCancelMeeting(meet._id || meet.meeting_id)}
                    style={{
                      background: '#FEE2E2',
                      border: 'none',
                      color: '#DC2626',
                      borderRadius: 8,
                      padding: '8px 12px',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                    title="Cancel Meeting"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filteredMeetings.length === 0 && !loading && (
          <div style={{
            background: '#FFFFFF',
            borderRadius: 16,
            border: '1px dashed #CBD5E1',
            padding: 40,
            textAlign: 'center',
            color: '#64748B'
          }}>
            <Video size={36} color="#94A3B8" style={{ margin: '0 auto 12px auto' }} />
            <div style={{ fontWeight: 800, fontSize: 16, color: '#1E293B', marginBottom: 4 }}>
              No meetings found
            </div>
            <p style={{ fontSize: 13, margin: '0 0 16px 0' }}>
              {activeTab === 'upcoming'
                ? 'You have no upcoming scheduled meetings.'
                : activeTab === 'calendar'
                  ? `No meetings scheduled on ${formatDateDMY(calendarDate)}.`
                  : 'No meetings record under this category.'}
            </p>
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              style={{
                background: '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 10,
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              + Schedule a Google Meet
            </button>
          </div>
        )}
      </div>

      {/* ─── MODAL 1: SCHEDULE NEW MEETING ─────────────────────── */}
      {createModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 16
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 20,
            width: '100%',
            maxWidth: 620,
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: 24,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid #E2E8F0', paddingBottom: 14 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0F172A', margin: 0 }}>Schedule Google Meet</h3>
                <p style={{ fontSize: 12.5, color: '#64748B', margin: '4px 0 0 0' }}>Creates a genuine Google Meet space and dispatches invitations</p>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: 20, fontWeight: 700 }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMeeting} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Meeting Title */}
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Meeting Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q4 Recruitment Strategy & Review"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  style={{ width: '100%', border: '1px solid #CBD5E1', borderRadius: 10, padding: 10, fontSize: 13, outline: 'none' }}
                />
              </div>

              {/* Agenda */}
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Meeting Agenda
                </label>
                <input
                  type="text"
                  placeholder="e.g. Discuss open positions, client requirements, onboarding status"
                  value={createForm.agenda}
                  onChange={(e) => setCreateForm({ ...createForm, agenda: e.target.value })}
                  style={{ width: '100%', border: '1px solid #CBD5E1', borderRadius: 10, padding: 10, fontSize: 13, outline: 'none' }}
                />
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Additional Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief meeting context or prep materials..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  style={{ width: '100%', border: '1px solid #CBD5E1', borderRadius: 10, padding: 10, fontSize: 13, outline: 'none', resize: 'vertical' }}
                />
              </div>

              {/* Date, Time & Duration */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>Date *</label>
                  <input
                    type="date"
                    required
                    value={createForm.scheduled_date}
                    onChange={(e) => setCreateForm({ ...createForm, scheduled_date: e.target.value })}
                    style={{ width: '100%', border: '1px solid #CBD5E1', borderRadius: 10, padding: 9, fontSize: 12.5 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>Start Time *</label>
                  <input
                    type="time"
                    required
                    value={createForm.scheduled_start_time}
                    onChange={(e) => setCreateForm({ ...createForm, scheduled_start_time: e.target.value })}
                    style={{ width: '100%', border: '1px solid #CBD5E1', borderRadius: 10, padding: 9, fontSize: 12.5 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>Duration</label>
                  <select
                    value={createForm.duration_minutes}
                    onChange={(e) => setCreateForm({ ...createForm, duration_minutes: Number(e.target.value) })}
                    style={{ width: '100%', border: '1px solid #CBD5E1', borderRadius: 10, padding: 9, fontSize: 12.5 }}
                  >
                    <option value={15}>15 Minutes</option>
                    <option value={30}>30 Minutes</option>
                    <option value={45}>45 Minutes (Recommended)</option>
                    <option value={60}>60 Minutes (Max Free Plan)</option>
                  </select>
                </div>
              </div>

              {/* Participant Selection from Employee Directory */}
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Invite Employees ({createForm.participant_user_ids.length} selected)
                </label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input
                    type="text"
                    placeholder="Search employee by name or designation..."
                    value={participantSearch}
                    onChange={(e) => setParticipantSearch(e.target.value)}
                    style={{ flex: 1, border: '1px solid #CBD5E1', borderRadius: 8, padding: '7px 12px', fontSize: 12.5 }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const allIds = allEmployees.map(u => u.id || u._id);
                      setCreateForm({ ...createForm, participant_user_ids: allIds });
                    }}
                    style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: 8, padding: '6px 10px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, participant_user_ids: [] })}
                    style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: 8, padding: '6px 10px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}
                  >
                    Clear
                  </button>
                </div>

                <div style={{ maxHeight: 150, overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: 10, padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {allEmployees
                    .filter(u => {
                      if (!participantSearch) return true;
                      const q = participantSearch.toLowerCase();
                      return (u.name || '').toLowerCase().includes(q) || (u.designation || u.title || '').toLowerCase().includes(q);
                    })
                    .map(emp => {
                      const uid = emp.id || emp._id;
                      const isSelected = createForm.participant_user_ids.includes(uid);
                      return (
                        <div
                          key={uid}
                          onClick={() => {
                            if (isSelected) {
                              setCreateForm({
                                ...createForm,
                                participant_user_ids: createForm.participant_user_ids.filter(id => id !== uid)
                              });
                            } else {
                              setCreateForm({
                                ...createForm,
                                participant_user_ids: [...createForm.participant_user_ids, uid]
                              });
                            }
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 10px',
                            borderRadius: 6,
                            background: isSelected ? '#EFF6FF' : 'transparent',
                            cursor: 'pointer'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <input type="checkbox" checked={isSelected} readOnly />
                            <div>
                              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A' }}>{emp.name}</div>
                              <div style={{ fontSize: 10.5, color: '#64748B' }}>{emp.designation || emp.title || 'Staff'}</div>
                            </div>
                          </div>
                          <span style={{ fontSize: 11, color: '#94A3B8' }}>{emp.email}</span>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10, borderTop: '1px solid #E2E8F0', paddingTop: 16 }}>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  style={{
                    background: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    borderRadius: 10,
                    padding: '9px 18px',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    background: '#2563EB',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 10,
                    padding: '9px 22px',
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
                    opacity: isSubmitting ? 0.7 : 1,
                  }}
                >
                  {isSubmitting ? 'Creating Google Meet...' : 'Create & Send Invitations'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: ATTENDANCE & PARTICIPATION AUDIT LOGS ───── */}
      {attendanceModalMeeting && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 16
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 20,
            width: '100%',
            maxWidth: 680,
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: 24,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid #E2E8F0', paddingBottom: 12 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0F172A', margin: 0 }}>
                  Meeting Attendance Report
                </h3>
                <p style={{ fontSize: 12.5, color: '#64748B', margin: '4px 0 0 0' }}>
                  {attendanceModalMeeting.title} · ID: {attendanceModalMeeting.meeting_id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAttendanceModalMeeting(null)}
                style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: 20, fontWeight: 700 }}
              >
                ✕
              </button>
            </div>

            {loadingAttendance && (
              <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>
                Loading attendance audit logs...
              </div>
            )}

            {!loadingAttendance && attendanceData && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                  <div style={{ background: '#F8FAFC', padding: 12, borderRadius: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700 }}>Invited</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A' }}>{attendanceData.participantsCount}</div>
                  </div>
                  <div style={{ background: '#F8FAFC', padding: 12, borderRadius: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700 }}>Joined Call</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#059669' }}>{attendanceData.joinedCount}</div>
                  </div>
                  <div style={{ background: '#F8FAFC', padding: 12, borderRadius: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700 }}>Status</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#2563EB', textTransform: 'capitalize', marginTop: 3 }}>
                      {attendanceData.status}
                    </div>
                  </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #CBD5E1', textAlign: 'left' }}>
                      <th style={{ padding: 10, fontWeight: 800, color: '#334155' }}>Employee</th>
                      <th style={{ padding: 10, fontWeight: 800, color: '#334155' }}>Role</th>
                      <th style={{ padding: 10, fontWeight: 800, color: '#334155' }}>Attended?</th>
                      <th style={{ padding: 10, fontWeight: 800, color: '#334155' }}>Duration</th>
                      <th style={{ padding: 10, fontWeight: 800, color: '#334155' }}>First Join</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceData.attendance.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: 10 }}>
                          <div style={{ fontWeight: 700, color: '#0F172A' }}>{item.name}</div>
                          <div style={{ fontSize: 11, color: '#64748B' }}>{item.email}</div>
                        </td>
                        <td style={{ padding: 10, textTransform: 'capitalize' }}>
                          <span style={{
                            background: item.role === 'host' ? '#FEF3C7' : '#F1F5F9',
                            color: item.role === 'host' ? '#D97706' : '#475569',
                            padding: '2px 8px',
                            borderRadius: 6,
                            fontWeight: 700,
                            fontSize: 11
                          }}>
                            {item.role}
                          </span>
                        </td>
                        <td style={{ padding: 10 }}>
                          {item.hasJoined ? (
                            <span style={{ color: '#059669', fontWeight: 800 }}>✓ Yes</span>
                          ) : (
                            <span style={{ color: '#94A3B8' }}>No</span>
                          )}
                        </td>
                        <td style={{ padding: 10, fontWeight: 700, color: '#0F172A' }}>
                          {item.totalDurationMinutes} mins
                        </td>
                        <td style={{ padding: 10, color: '#64748B', fontSize: 11.5 }}>
                          {item.firstJoinedAt
                            ? `${formatDateDMY(item.firstJoinedAt)} ${new Date(item.firstJoinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CegsMeetDashboard;
