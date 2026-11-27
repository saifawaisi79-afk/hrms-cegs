'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';
import { formatDateDMY } from '@/lib/date-format';
import {
  Video,
  ExternalLink,
  Calendar,
  Clock,
  Users,
  Copy,
  Check,
  ArrowLeft,
  AlertCircle,
  Shield,
  FileText,
  UserCheck,
} from 'lucide-react';

export default function MeetingLaunchPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useApp();
  const meetingId = params?.id;

  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [hasLaunched, setHasLaunched] = useState(false);

  useEffect(() => {
    if (!meetingId) return;

    let isCancelled = false;
    const fetchMeeting = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('cegs_token') || '';
        const res = await fetch(`/api/meet/${meetingId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load meeting details');
        }
        if (!isCancelled) {
          setMeeting(data.meeting);
        }
      } catch (err) {
        if (!isCancelled) setError(err.message);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    fetchMeeting();
    return () => {
      isCancelled = true;
    };
  }, [meetingId]);

  const handleLaunchGoogleMeet = async () => {
    if (!meeting?.google_meet_url) return;

    // Record attendance join on server
    try {
      const token = localStorage.getItem('cegs_token') || '';
      await fetch(`/api/meet/${meeting.meeting_id}/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'join' })
      });
    } catch (e) {
      console.warn('Attendance record error:', e);
    }

    setHasLaunched(true);
    window.open(meeting.google_meet_url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyLink = () => {
    if (!meeting?.google_meet_url) return;
    navigator.clipboard.writeText(meeting.google_meet_url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#F8FAFC',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          border: '4px solid #E2E8F0',
          borderTopColor: '#2563EB',
          animation: 'spin 1s linear infinite',
          marginBottom: 16,
        }} />
        <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', margin: 0 }}>
          Loading Google Meet Session...
        </h3>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#F8FAFC',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: 'Inter, system-ui, sans-serif',
        textAlign: 'center',
      }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: '#FEE2E2',
          color: '#DC2626',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}>
          <AlertCircle size={32} />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: '0 0 8px 0' }}>
          Unable to Access Meeting
        </h2>
        <p style={{ fontSize: 14, color: '#64748B', maxWidth: 440, margin: '0 0 20px 0' }}>
          {error || 'Meeting not found or you do not have permission to access it.'}
        </p>
        <button
          onClick={() => router.push('/campaign/meetings')}
          style={{
            background: '#2563EB',
            color: '#FFFFFF',
            border: 'none',
            padding: '10px 20px',
            borderRadius: 10,
            fontSize: 13.5,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Return to Meeting Scheduler
        </button>
      </div>
    );
  }

  const isCancelled = meeting.status === 'cancelled';
  const isCompleted = meeting.status === 'completed';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #F1F5F9 0%, #FFFFFF 100%)',
      fontFamily: 'Inter, system-ui, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      padding: '16px 0',
      alignItems: 'center',
    }}>
      {/* Top Header Card */}
      <div style={{
        maxWidth: 720,
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
      }}>
        <button
          onClick={() => router.push('/campaign/meetings')}
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            color: '#475569',
            padding: '8px 16px',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          }}
        >
          <ArrowLeft size={16} />
          Back to Meetings
        </button>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: '#EFF6FF',
          border: '1px solid #BFDBFE',
          color: '#1D4ED8',
          padding: '6px 14px',
          borderRadius: 20,
          fontSize: 12,
          fontWeight: 800,
        }}>
          <Shield size={14} />
          Official Google Meet
        </div>
      </div>

      {/* Main Container Card */}
      <div style={{
        maxWidth: 720,
        width: '100%',
        background: '#FFFFFF',
        borderRadius: 20,
        border: '1px solid #E2E8F0',
        boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
        overflow: 'hidden',
      }}>
        {/* Top Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
          padding: '32px 36px',
          color: '#FFFFFF',
          position: 'relative',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{
              background: 'rgba(255,255,255,0.2)',
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              {meeting.type === 'instant' ? 'Instant Meeting' : 'Scheduled Meeting'}
            </span>
            <span style={{
              background: isCancelled ? '#EF4444' : isCompleted ? '#64748B' : '#10B981',
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 800,
              textTransform: 'uppercase',
            }}>
              {meeting.status}
            </span>
          </div>

          <h1 style={{ fontSize: 26, fontWeight: 900, margin: '0 0 10px 0', letterSpacing: '-0.5px' }}>
            {meeting.title}
          </h1>

          <div style={{ fontSize: 13, color: '#DBEAFE', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span>Hosted by <strong>{meeting.host_name}</strong></span>
            <span>·</span>
            <span>ID: <code style={{ background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: 4 }}>{meeting.meeting_id}</code></span>
          </div>
        </div>

        {/* Cancelled Banner */}
        {isCancelled && (
          <div style={{
            background: '#FEF2F2',
            borderBottom: '1px solid #FECACA',
            padding: '14px 24px',
            color: '#991B1B',
            fontSize: 13.5,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <AlertCircle size={18} />
            <span>This meeting was cancelled: {meeting.cancellation_reason || 'No cancellation reason specified.'}</span>
          </div>
        )}

        {/* Content Body */}
        <div style={{ padding: 32 }}>
          {/* Key Schedule Meta Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 16,
            marginBottom: 24,
          }}>
            <div style={{ background: '#F8FAFC', padding: 16, borderRadius: 12, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={13} color="#2563EB" /> Date
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>
                {formatDateDMY(meeting.scheduled_date)}
              </div>
            </div>

            <div style={{ background: '#F8FAFC', padding: 16, borderRadius: 12, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={13} color="#2563EB" /> Time & Duration
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>
                {meeting.scheduled_start_time} ({meeting.duration_minutes} mins)
              </div>
            </div>

            <div style={{ background: '#F8FAFC', padding: 16, borderRadius: 12, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Users size={13} color="#2563EB" /> Invited
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>
                {meeting.participants?.length || 0} Employees
              </div>
            </div>
          </div>

          {/* Agenda & Description */}
          {(meeting.agenda || meeting.description) && (
            <div style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 14,
              padding: 20,
              marginBottom: 28,
            }}>
              {meeting.agenda && (
                <div style={{ marginBottom: meeting.description ? 12 : 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 4 }}>
                    Meeting Agenda
                  </div>
                  <div style={{ fontSize: 13.5, color: '#0F172A', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {meeting.agenda}
                  </div>
                </div>
              )}
              {meeting.description && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 4 }}>
                    Description
                  </div>
                  <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>
                    {meeting.description}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Main Google Meet Action Buttons */}
          {!isCancelled && meeting.google_meet_url && (
            <div style={{
              background: '#F0FDF4',
              border: '1.5px solid #86EFAC',
              borderRadius: 16,
              padding: 24,
              marginBottom: 28,
              textAlign: 'center',
            }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#15803D', fontWeight: 800, fontSize: 14, marginBottom: 12 }}>
                <Video size={18} />
                <span>Ready to Join via Google Meet</span>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleLaunchGoogleMeet}
                  style={{
                    background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '14px 28px',
                    borderRadius: 12,
                    fontSize: 15,
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    boxShadow: '0 8px 20px rgba(22, 163, 74, 0.35)',
                    transition: 'transform 0.15s ease',
                  }}
                >
                  <Video size={20} />
                  <span>Join Google Meet Call</span>
                  <ExternalLink size={16} />
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    color: copiedLink ? '#15803D' : '#334155',
                    padding: '14px 20px',
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  {copiedLink ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
                </button>
              </div>

              <div style={{ fontSize: 12, color: '#64748B', marginTop: 12 }}>
                Link: <code style={{ color: '#0F172A', background: '#FFFFFF', padding: '3px 8px', borderRadius: 6, border: '1px solid #CBD5E1' }}>{meeting.google_meet_url}</code>
              </div>

              {hasLaunched && (
                <div style={{ fontSize: 12, color: '#16A34A', fontWeight: 700, marginTop: 10 }}>
                  ✓ Join attendance recorded in CEGS HRMS
                </div>
              )}
            </div>
          )}

          {/* Invited Participants List */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Users size={16} color="#2563EB" />
              <span>Invited Participants ({meeting.participants?.length || 0})</span>
            </div>

            <div style={{
              border: '1px solid #E2E8F0',
              borderRadius: 12,
              overflow: 'hidden',
              maxHeight: 220,
              overflowY: 'auto',
            }}>
              {meeting.participants?.map((p, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 16px',
                    borderBottom: idx < meeting.participants.length - 1 ? '1px solid #F1F5F9' : 'none',
                    background: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: p.role === 'host' ? '#2563EB' : '#64748B',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: 12,
                    }}>
                      {(p.name?.[0] || 'U').toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                        {p.name} {p.role === 'host' && '(Host)'}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748B' }}>
                        {p.email}
                      </div>
                    </div>
                  </div>

                  <div>
                    {p.has_joined ? (
                      <span style={{
                        background: '#ECFDF5',
                        color: '#065F46',
                        border: '1px solid #A7F3D0',
                        fontSize: 11,
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: 6,
                      }}>
                        ✓ Joined
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: '#94A3B8' }}>Invited</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
