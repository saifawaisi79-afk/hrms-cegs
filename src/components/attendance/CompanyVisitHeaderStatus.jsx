'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Building2,
  Car,
  CheckCircle2,
  Clock,
  ChevronRight,
  MapPin,
  Briefcase,
  History,
  X,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { toIsoDate } from '@/lib/auto-absent';
import { getAuthToken, API_BASE } from '@/lib/auth-client';
import { parseClockInTime, formatTime12 } from './ShiftReverseStopwatch';

export function CompanyVisitHeaderStatus({ currentUser, db, save }) {
  const [mounted, setMounted] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const todayIso = useMemo(() => toIsoDate(new Date()), []);

  // Today's attendance record for current user
  const todayRec = useMemo(() => {
    if (!currentUser) return null;
    const currentIds = [
      currentUser.id,
      currentUser._id,
      currentUser.employee_id,
      currentUser.eid,
      currentUser.email?.toLowerCase(),
    ].filter(Boolean).map(String);

    return (db?.attendance || []).find((a) => {
      const aUid = a.uid || a.user_id || (typeof a.user_id === 'object' ? a.user_id?._id : null);
      const aEmail = a.email || a.user_id?.email || a.employee_email;
      const aEmpId = a.employee_id || a.user_id?.employee_id;

      const matchUser =
        currentIds.includes(String(aUid)) ||
        (aEmail && currentIds.includes(String(aEmail).toLowerCase())) ||
        (aEmpId && currentIds.includes(String(aEmpId)));

      const matchDate = String(a.date || '').slice(0, 10) === todayIso;
      return matchUser && matchDate;
    });
  }, [db?.attendance, currentUser, todayIso]);

  // Is user clocked in?
  const isClockedIn = Boolean(
    todayRec &&
    (todayRec.in || todayRec.check_in_time) &&
    todayRec.status !== 'absent' &&
    String(todayRec.source || 'clock') !== 'sheet'
  );

  const isClockedOut = Boolean(todayRec?.out || todayRec?.check_out_time);

  // Current visit status: 'in_office' or 'company_visit'
  const currentVisitStatus = todayRec?.visit_status || 'in_office';
  const isOnVisit = currentVisitStatus === 'company_visit';

  const visitLogs = useMemo(() => {
    return Array.isArray(todayRec?.visit_logs) ? todayRec.visit_logs : [];
  }, [todayRec?.visit_logs]);

  // Handle status update
  const handleUpdateStatus = useCallback(
    async (nextAction) => {
      if (isSubmitting || !currentUser || !isClockedIn) return;
      setIsSubmitting(true);
      setFeedbackMsg(null);

      const now = new Date();
      const timeStr = now.toTimeString().substr(0, 8);
      const userId = currentUser.id || currentUser._id;
      const userRemarks = remarks.trim();

      const newLogEntry = {
        action: nextAction,
        time: timeStr,
        remarks: userRemarks || (nextAction === 'company_visit' ? 'Company Visit' : 'Back to Office'),
        at: new Date().toISOString(),
      };

      const updatedLogs = [...visitLogs, newLogEntry];
      const updatedVisitStatus = nextAction === 'company_visit' ? 'company_visit' : 'in_office';

      // Optimistic state update in db.attendance
      if (typeof save === 'function') {
        save(
          'attendance',
          (db?.attendance || []).map((a) => {
            const uid = a.uid || a.user_id || (typeof a.user_id === 'object' ? a.user_id?._id : null);
            const matchUser = String(uid) === String(userId);
            const matchDate = String(a.date || '').slice(0, 10) === todayIso;
            if (matchUser && matchDate) {
              return {
                ...a,
                visit_status: updatedVisitStatus,
                company_visit_out_time:
                  nextAction === 'company_visit' ? timeStr : a.company_visit_out_time,
                company_visit_in_time:
                  nextAction === 'back_to_office' ? timeStr : a.company_visit_in_time,
                visit_logs: updatedLogs,
              };
            }
            return a;
          })
        );
      }

      // Notify window listeners
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('hrms:attendance-update', {
            detail: {
              action: nextAction,
              visit_status: updatedVisitStatus,
              record: {
                ...todayRec,
                visit_status: updatedVisitStatus,
                visit_logs: updatedLogs,
              },
            },
          })
        );
      }

      // Remote server sync
      try {
        const token = getAuthToken();
        if (token) {
          const res = await fetch(`${API_BASE}/attendance/visit-status`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              action: nextAction,
              remarks: userRemarks,
              date: todayIso,
              time: timeStr,
            }),
          });

          if (res.ok) {
            const data = await res.json().catch(() => ({}));
            if (data?.record && typeof save === 'function') {
              save(
                'attendance',
                (db?.attendance || []).map((a) => {
                  const uid = a.uid || a.user_id || (typeof a.user_id === 'object' ? a.user_id?._id : null);
                  const matchUser = String(uid) === String(userId);
                  const matchDate = String(a.date || '').slice(0, 10) === todayIso;
                  if (matchUser && matchDate) {
                    return { ...a, ...data.record };
                  }
                  return a;
                })
              );
            }
          }
        }

        setRemarks('');
        setFeedbackMsg(
          nextAction === 'company_visit'
            ? '✓ Marked Company Visit. Your 9-hour attendance timer continues!'
            : '✓ Welcome back to office! In-office presence resumed.'
        );
      } catch (err) {
        console.error('Update visit status error:', err);
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, currentUser, isClockedIn, remarks, visitLogs, save, db?.attendance, todayIso, todayRec]
  );

  // If user is not clocked in yet or has clocked out, do not display top-right status capsule
  if (!isClockedIn || isClockedOut) {
    return null;
  }

  return (
    <>
      {/* Top-Right Header Status Capsule */}
      <button
        type="button"
        className={`hdr-todays-status-capsule ${isOnVisit ? 'on-visit' : 'in-office'}`}
        onClick={() => {
          setFeedbackMsg(null);
          setModalOpen(true);
        }}
        title="Click to view Today's Status: Company Visit > Back to Office"
        aria-label="Today's Status: Company Visit and Back to Office"
      >
        <span className="status-capsule-dot" />
        <span className="status-capsule-label">Today&apos;s Status</span>
        <ChevronRight size={13} className="status-capsule-arrow" />
        <span className="status-capsule-current">
          {isOnVisit ? (
            <>
              <Car size={13} className="status-capsule-icon" />
              <span>Company Visit</span>
            </>
          ) : (
            <>
              <Building2 size={13} className="status-capsule-icon" />
              <span>In Office</span>
            </>
          )}
        </span>
      </button>

      {/* Modern High-End Popup Modal: Today's Status > Company Visit > Back to Office */}
      {modalOpen && mounted && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="visit-modal-backdrop"
              onClick={(e) => {
                if (e.target === e.currentTarget && !isSubmitting) setModalOpen(false);
              }}
              role="dialog"
              aria-modal="true"
            >
              <div className="visit-modal-container" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="visit-modal-header">
              <div className="visit-modal-title-wrap">
                <div className="visit-modal-icon-badge">
                  {isOnVisit ? <Car size={20} /> : <Building2 size={20} />}
                </div>
                <div>
                  <h3 className="visit-modal-title">Today&apos;s Status</h3>
                  <p className="visit-modal-subtitle">Company Visit &amp; Office Presence Workflow</p>
                </div>
              </div>
              <button
                type="button"
                className="visit-modal-close"
                onClick={() => setModalOpen(false)}
                disabled={isSubmitting}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Workflow Breadcrumb Indicator: Today's Status > Company Visit > Back to Office */}
            <div className="visit-workflow-bar">
              <div className={`workflow-step ${!isOnVisit ? 'active' : 'completed'}`}>
                <span className="step-num">{!isOnVisit ? '●' : '✓'}</span>
                <span className="step-text">In Office</span>
              </div>
              <ChevronRight size={14} className="workflow-sep" />
              <div className={`workflow-step ${isOnVisit ? 'active pulsing' : ''}`}>
                <span className="step-num">{isOnVisit ? '🚗' : '2'}</span>
                <span className="step-text">Company Visit</span>
              </div>
              <ChevronRight size={14} className="workflow-sep" />
              <div className={`workflow-step ${!isOnVisit && visitLogs.length > 0 ? 'completed' : ''}`}>
                <span className="step-num">3</span>
                <span className="step-text">Back to Office</span>
              </div>
            </div>

            {/* Feedback Alert if just updated */}
            {feedbackMsg && (
              <div className="visit-feedback-alert">
                <CheckCircle2 size={16} />
                <span>{feedbackMsg}</span>
              </div>
            )}

            {/* Current Status & Action Panel */}
            <div className="visit-action-card">
              {isOnVisit ? (
                /* Currently Out on Company Visit -> Offer 'Back to Office' */
                <div className="visit-state-box visit-mode">
                  <div className="state-badge-row">
                    <span className="state-live-badge amber">
                      <span className="badge-pulse-dot" />
                      Currently on Company Visit
                    </span>
                    {todayRec?.company_visit_out_time && (
                      <span className="state-time-text">
                        Left at {todayRec.company_visit_out_time}
                      </span>
                    )}
                  </div>

                  <p className="state-desc">
                    You are currently marked as out on a company visit. When you return to the office,
                    click <strong>Back to Office</strong> below to log your arrival.
                  </p>

                  <div className="visit-input-wrap">
                    <label htmlFor="visit-remarks" className="visit-input-label">
                      Return Notes (Optional)
                    </label>
                    <input
                      id="visit-remarks"
                      type="text"
                      className="visit-input"
                      placeholder="e.g. Meeting finished, back at work station..."
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>

                  <button
                    type="button"
                    className="visit-action-btn btn-back-office"
                    onClick={() => handleUpdateStatus('back_to_office')}
                    disabled={isSubmitting}
                  >
                    <Building2 size={16} />
                    <span>{isSubmitting ? 'Logging...' : 'Mark Back to Office'}</span>
                  </button>

                  <div className="visit-policy-hint">
                    <CheckCircle2 size={13} className="hint-icon" />
                    <span>
                      Attendance is unaffected — your 9-hour work timer has been running continuously.
                    </span>
                  </div>
                </div>
              ) : (
                /* Currently In Office -> Offer 'Company Visit' */
                <div className="visit-state-box office-mode">
                  <div className="state-badge-row">
                    <span className="state-live-badge green">
                      <span className="badge-pulse-dot" />
                      Currently In Office
                    </span>
                    {todayRec?.in && (
                      <span className="state-time-text">
                        Clocked In: {todayRec.in}
                      </span>
                    )}
                  </div>

                  <p className="state-desc">
                    Going out for an official client visit, candidate walk-in meeting, or partner company visit?
                    Mark your departure below.
                  </p>

                  <div className="visit-input-wrap">
                    <label htmlFor="visit-destination" className="visit-input-label">
                      Company / Destination / Purpose (Optional)
                    </label>
                    <input
                      id="visit-destination"
                      type="text"
                      className="visit-input"
                      placeholder="e.g. Novel Tech Park client demo, vendor meeting..."
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>

                  <button
                    type="button"
                    className="visit-action-btn btn-company-visit"
                    onClick={() => handleUpdateStatus('company_visit')}
                    disabled={isSubmitting}
                  >
                    <Car size={16} />
                    <span>{isSubmitting ? 'Logging...' : 'Mark Company Visit'}</span>
                  </button>

                  <div className="visit-policy-hint">
                    <CheckCircle2 size={13} className="hint-icon" />
                    <span>
                      <strong>Attendance Continues:</strong> Your 9-hour shift timer and reverse stopwatch will
                      continue running normally while on company visit.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Today's Movement History */}
            <div className="visit-history-section">
              <div className="history-header">
                <History size={14} />
                <span>Today&apos;s Visit History ({visitLogs.length})</span>
              </div>

              {visitLogs.length === 0 ? (
                <div className="history-empty">
                  No company visits logged yet today. You are currently working on premises.
                </div>
              ) : (
                <div className="history-timeline">
                  {visitLogs
                    .slice()
                    .reverse()
                    .map((item, idx) => (
                      <div key={idx} className="timeline-item">
                        <div
                          className={`timeline-marker ${
                            item.action === 'company_visit' ? 'visit' : 'office'
                          }`}
                        >
                          {item.action === 'company_visit' ? <Car size={12} /> : <Building2 size={12} />}
                        </div>
                        <div className="timeline-content">
                          <div className="timeline-top">
                            <strong className="timeline-label">
                              {item.action === 'company_visit' ? 'Company Visit' : 'Back to Office'}
                            </strong>
                            <span className="timeline-time">{item.time}</span>
                          </div>
                          {item.remarks && <p className="timeline-remarks">{item.remarks}</p>}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )
    : null}
    </>
  );
}

export default CompanyVisitHeaderStatus;
