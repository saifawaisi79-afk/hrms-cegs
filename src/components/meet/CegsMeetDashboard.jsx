'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { formatDateDMY } from '@/lib/date-format';
import {
  Video,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  Users,
  Copy,
  Check,
  PhoneCall,
  Search,
  Filter,
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
  Building,
  UserCheck,
} from 'lucide-react';
import { CegsMeetRoom } from './CegsMeetRoom';

export function CegsMeetDashboard({ db, save, user }) {
  const [activeTab, setActiveTab] = useState('upcoming'); // 'calendar' | 'upcoming' | 'history' | 'requests' | 'cancelled'
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

  // Active video call state (when joined from dashboard)
  const [activeMeetingRoom, setActiveMeetingRoom] = useState(null);

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
    type: 'scheduled',
    scheduled_date: new Date().toISOString().slice(0, 10),
    scheduled_start_time: '11:00',
    duration_minutes: 30,
    privacy: 'internal',
    allowed_departments: [],
    participant_user_ids: [],
    allow_screen_share: true,
    allow_chat: true,
    mute_on_entry: false,
  });
  const [participantSearch, setParticipantSearch] = useState('');

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

  useEffect(() => {
    fetchMeetings();
  }, []);

  // 2. Filtered list based on active tab & search
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
        m.host_name.toLowerCase().includes(q) ||
        (m.description && m.description.toLowerCase().includes(q))
      );
    }

    return list;
  }, [meetings, activeTab, calendarDate, searchQuery]);

  // 3. Quick Join by Code
  const handleQuickJoin = (e) => {
    e.preventDefault();
    setQuickJoinError('');
    const code = quickJoinCode.trim().toLowerCase();
    if (!code) return;

    const matched = meetings.find(m => m.meeting_id.toLowerCase() === code || m.meeting_id.replace(/-/g, '') === code.replace(/-/g, ''));
    if (matched) {
      if (matched.status === 'cancelled') {
        setQuickJoinError('This meeting has been cancelled.');
        return;
      }
      setActiveMeetingRoom(matched.meeting_id);
    } else {
      // Direct jump attempt by code
      setActiveMeetingRoom(code);
    }
  };

  // 4. Start Instant Meeting
  const handleStartInstant = async () => {
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
          allow_screen_share: true,
          allow_chat: true
        })
      });
      const data = await res.json();
      if (res.ok && data.meeting) {
        setMeetings(prev => [data.meeting, ...prev]);
        setActiveMeetingRoom(data.meeting.meeting_id);
      } else {
        alert(data.error || 'Failed to start instant meeting');
      }
    } catch (e) {
      alert('Network error creating instant meeting');
    }
  };

  // 5. Submit Schedule Meeting Form
  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    if (!createForm.title.trim()) {
      alert('Please enter a meeting title');
      return;
    }

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
        // Reset form
        setCreateForm({
          title: '',
          description: '',
          type: 'scheduled',
          scheduled_date: new Date().toISOString().slice(0, 10),
          scheduled_start_time: '11:00',
          duration_minutes: 30,
          privacy: 'internal',
          allowed_departments: [],
          participant_user_ids: [],
          allow_screen_share: true,
          allow_chat: true,
          mute_on_entry: false,
        });
        alert('✅ Meeting scheduled successfully & invitations dispatched!');
      } else {
        alert(data.error || 'Failed to schedule meeting');
      }
    } catch (e) {
      alert('Network error scheduling meeting');
    }
  };

  // 6. Cancel Meeting
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
    } catch (e) {}
  };

  // 7. Load Attendance Report
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
    } catch (e) {} finally {
      setLoadingAttendance(false);
    }
  };

  // 8. Copy Meeting Link helper
  const copyMeetingUrl = (mId) => {
    const url = `${window.location.origin}/meet/${mId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(mId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // -------------------------------------------------------------
  // If user is currently in a live meeting, render full room!
  // -------------------------------------------------------------
  if (activeMeetingRoom) {
    if (typeof document !== 'undefined') {
      return createPortal(
        <CegsMeetRoom
          meetingId={activeMeetingRoom}
          user={user}
          onLeave={() => {
            setActiveMeetingRoom(null);
            fetchMeetings();
          }}
        />,
        document.body
      );
    }
    return (
      <CegsMeetRoom
        meetingId={activeMeetingRoom}
        user={user}
        onLeave={() => {
          setActiveMeetingRoom(null);
          fetchMeetings();
        }}
      />
    );
  }

  // -------------------------------------------------------------
  // DASHBOARD VIEW
  // -------------------------------------------------------------
  const allEmployees = db?.users || [];

  return (
    <div className="anim-fadeup" style={{ maxWidth: 1240, margin: '0 auto', paddingBottom: 40 }}>
      {/* ─── HERO HEADER & TITLE ──────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
        borderRadius: 20,
        padding: '24px 30px',
        color: '#fff',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 20,
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
      }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(59, 130, 246, 0.2)', color: '#93C5FD', padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 800, marginBottom: 8 }}>
            <Video size={14} />
            <span>CEGS MEET PLATFORM</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0, letterSpacing: '-0.5px' }}>
            Meeting Scheduler & Video Conferencing
          </h1>
          <p style={{ fontSize: 13, color: '#94A3B8', margin: '6px 0 0 0' }}>
            Host secure video meetings, collaborate with live screen sharing, chat, and automated attendance tracking.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleStartInstant}
            style={{
              background: '#2563EB',
              color: '#fff',
              border: 'none',
              padding: '10px 18px',
              borderRadius: 12,
              fontSize: 13.5,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)'
            }}
          >
            <Video size={16} />
            <span>Instant Meeting</span>
          </button>

          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            style={{
              background: '#0F766E',
              color: '#fff',
              border: 'none',
              padding: '10px 18px',
              borderRadius: 12,
              fontSize: 13.5,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(15, 118, 110, 0.3)'
            }}
          >
            <Plus size={16} />
            <span>Schedule Meeting</span>
          </button>
        </div>
      </div>

      {/* ─── QUICK STATS CARDS ─────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
        marginBottom: 24
      }}>
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: '16px 20px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Meetings</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#0F172A', marginTop: 4 }}>{stats.totalMeetings}</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: '16px 20px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Upcoming / Live</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#2563EB', marginTop: 4 }}>{stats.upcomingCount}</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: '16px 20px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Completed</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#059669', marginTop: 4 }}>{stats.completedCount}</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: '16px 20px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#6366F1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Conferencing Time</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#6366F1', marginTop: 4 }}>{stats.totalMinutes} <span style={{ fontSize: 14, fontWeight: 600 }}>mins</span></div>
        </div>
      </div>

      {/* ─── QUICK JOIN BAR & TAB CONTROLS ─────────────────────── */}
      <div style={{
        background: '#fff',
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
                  color: isActive ? '#fff' : '#475569',
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
            placeholder="Enter meeting code..."
            value={quickJoinCode}
            onChange={(e) => {
              setQuickJoinCode(e.target.value);
              setQuickJoinError('');
            }}
            style={{
              background: '#F8FAFC',
              border: '1px solid #CBD5E1',
              borderRadius: 10,
              padding: '8px 14px',
              fontSize: 13,
              outline: 'none',
              width: 190
            }}
          />
          <button
            type="submit"
            style={{
              background: '#2563EB',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            Join
          </button>
        </form>
      </div>

      {quickJoinError && (
        <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '8px 14px', borderRadius: 10, fontSize: 12.5, fontWeight: 700, marginBottom: 16 }}>
          {quickJoinError}
        </div>
      )}

      {/* ─── CALENDAR PICKER (when activeTab === 'calendar') ──── */}
      {activeTab === 'calendar' && (
        <div style={{
          background: '#fff',
          border: '1px solid #E2E8F0',
          borderRadius: 16,
          padding: 16,
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontWeight: 800, fontSize: 14, color: '#1E293B' }}>Select Calendar Date:</span>
            <input
              type="date"
              value={calendarDate}
              onChange={(e) => setCalendarDate(e.target.value)}
              style={{
                border: '1px solid #CBD5E1',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: 13,
                fontWeight: 600,
                color: '#0F172A'
              }}
            />
          </div>
          <div style={{ fontSize: 12.5, color: '#64748B', fontWeight: 600 }}>
            Showing scheduled sessions for {calendarDate}
          </div>
        </div>
      )}

      {/* ─── MEETINGS LIST ────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {filteredMeetings.map((meet) => {
          const isLive = meet.status === 'in_progress';
          const isCompleted = meet.status === 'completed';
          const isCancelled = meet.status === 'cancelled';
          const isHost = String(meet.host_id) === String(user?.id);

          return (
            <div
              key={meet._id || meet.meeting_id}
              style={{
                background: '#fff',
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

                  {meet.description && (
                    <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 4 }}>
                      {meet.description}
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
                  onClick={() => copyMeetingUrl(meet.meeting_id)}
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
                  <span>{copiedId === meet.meeting_id ? 'Copied' : 'Invite Link'}</span>
                </button>

                {!isCancelled && !isCompleted && (
                  <button
                    type="button"
                    onClick={() => setActiveMeetingRoom(meet.meeting_id)}
                    style={{
                      background: isLive ? '#10B981' : '#2563EB',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      padding: '8px 18px',
                      fontSize: 13,
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(37,99,235,0.3)'
                    }}
                  >
                    <Video size={14} />
                    <span>{isLive ? 'Join Live Room' : 'Start / Join'}</span>
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
            background: '#fff',
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
                ? `No meetings scheduled on ${calendarDate}.`
                : 'No meetings record under this category.'}
            </p>
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              style={{
                background: '#2563EB',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              + Schedule a Meeting
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
            background: '#fff',
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
                <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0F172A', margin: 0 }}>Schedule CEGS Meeting</h3>
                <p style={{ fontSize: 12.5, color: '#64748B', margin: '4px 0 0 0' }}>Create room, configure participant access & dispatch invitations</p>
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

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Description / Agenda (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief meeting notes or agenda items..."
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
                    <option value={45}>45 Minutes</option>
                    <option value={60}>1 Hour</option>
                    <option value={90}>1.5 Hours</option>
                  </select>
                </div>
              </div>

              {/* Privacy Setting */}
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Meeting Privacy & Access Control
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  {[
                    { id: 'internal', label: 'Internal (All Staff)', desc: 'Any CEGS employee with link' },
                    { id: 'department', label: 'Department Only', desc: 'Designated department teams' },
                    { id: 'private', label: 'Private (Invite Only)', desc: 'Only explicitly invited users' },
                  ].map(opt => (
                    <div
                      key={opt.id}
                      onClick={() => setCreateForm({ ...createForm, privacy: opt.id })}
                      style={{
                        border: createForm.privacy === opt.id ? '2px solid #2563EB' : '1px solid #CBD5E1',
                        background: createForm.privacy === opt.id ? '#EFF6FF' : '#F8FAFC',
                        borderRadius: 10,
                        padding: 10,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: 12, color: '#0F172A' }}>{opt.label}</div>
                      <div style={{ fontSize: 10.5, color: '#64748B', marginTop: 3 }}>{opt.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Participant Selection from Employee Directory */}
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Invite Participants ({createForm.participant_user_ids.length} selected)
                </label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input
                    type="text"
                    placeholder="Search employee by name or role..."
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
                            <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#2563EB', color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {(emp.name?.[0] || 'U').toUpperCase()}
                            </div>
                            <span style={{ fontSize: 12.5, fontWeight: 600, color: '#1E293B' }}>{emp.name}</span>
                            <span style={{ fontSize: 11, color: '#64748B' }}>({emp.designation || emp.title || emp.role})</span>
                          </div>
                          <input type="checkbox" checked={isSelected} readOnly style={{ width: 16, height: 16 }} />
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Permissions & Security Toggles */}
              <div style={{ background: '#F8FAFC', borderRadius: 10, padding: 12, border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#334155', marginBottom: 8 }}>Permissions & Security</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#1E293B', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={createForm.allow_screen_share}
                      onChange={(e) => setCreateForm({ ...createForm, allow_screen_share: e.target.checked })}
                      style={{ width: 16, height: 16 }}
                    />
                    <span>Allow Screen Sharing</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#1E293B', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={createForm.allow_chat}
                      onChange={(e) => setCreateForm({ ...createForm, allow_chat: e.target.checked })}
                      style={{ width: 16, height: 16 }}
                    />
                    <span>Allow In-Meeting Chat</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#1E293B', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={createForm.mute_on_entry}
                      onChange={(e) => setCreateForm({ ...createForm, mute_on_entry: e.target.checked })}
                      style={{ width: 16, height: 16 }}
                    />
                    <span>Mute Mics on Entry</span>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, marginTop: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: '#2563EB', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 22px', fontSize: 13.5, fontWeight: 800, cursor: 'pointer' }}
                >
                  Create & Dispatch Invites
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: ATTENDANCE & PARTICIPATION REPORT ──────── */}
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
            background: '#fff',
            borderRadius: 20,
            width: '100%',
            maxWidth: 680,
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: 24,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, borderBottom: '1px solid #E2E8F0', paddingBottom: 12 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 900, color: '#0F172A', margin: 0 }}>
                  Meeting Attendance Report
                </h3>
                <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 4 }}>
                  {attendanceModalMeeting.title} · ID: {attendanceModalMeeting.meeting_id}
                </div>
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
                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
                  <div style={{ background: '#F8FAFC', borderRadius: 10, padding: 12, border: '1px solid #E2E8F0', textAlign: 'center' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Invited</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A' }}>{attendanceData.participantsCount}</div>
                  </div>
                  <div style={{ background: '#ECFDF5', borderRadius: 10, padding: 12, border: '1px solid #A7F3D0', textAlign: 'center' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>Attended</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#059669' }}>{attendanceData.joinedCount}</div>
                  </div>
                  <div style={{ background: '#EFF6FF', borderRadius: 10, padding: 12, border: '1px solid #BFDBFE', textAlign: 'center' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#1D4ED8', textTransform: 'uppercase' }}>Status</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#1D4ED8', textTransform: 'capitalize', marginTop: 4 }}>
                      {attendanceData.status}
                    </div>
                  </div>
                </div>

                {/* Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #CBD5E1', textAlign: 'left' }}>
                      <th style={{ padding: 10 }}>Participant</th>
                      <th style={{ padding: 10 }}>Role</th>
                      <th style={{ padding: 10 }}>Joined?</th>
                      <th style={{ padding: 10 }}>Duration</th>
                      <th style={{ padding: 10 }}>First Joined</th>
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

