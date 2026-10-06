'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AppHeader } from './AppHeader';
import { useApp } from '@/contexts/AppContext';
import {
  EmployeeQuickViewModal,
  Modal,
  IC,
} from '@/components/hrms/HrmsLegacy';
import { GlobalMessengerModal } from '@/components/chat/GlobalMessengerModal';
import {
  ShiftReverseStopwatch,
  parseClockInTime,
  formatTime12,
} from '@/components/attendance/ShiftReverseStopwatch';
import { countMonthlyEarlyLogoutWarnings } from '@/lib/attendance-policy';
import { toIsoDate } from '@/lib/auto-absent';
import { getAuthToken, API_BASE } from '@/lib/auth-client';
import { AlertTriangle, Clock, LogOut } from 'lucide-react';

export function AppShell({ children }) {
  const {
    user,
    db,
    save,
    logout,
    showLogoutModal,
    setShowLogoutModal,
    quickViewUser,
    setQuickViewUser,
    showMessengerInbox,
    setShowMessengerInbox,
    chatTargetUser,
    setChatTargetUser,
    openChatWithUser,
  } = useApp();

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [nowTime, setNowTime] = useState(() => new Date());

  // Today ISO date in IST
  const todayIso = useMemo(() => toIsoDate(new Date()), []);

  // Today's attendance record for current user
  const todayRec = useMemo(() => {
    if (!user) return null;
    const currentIds = [
      user.id,
      user._id,
      user.employee_id,
      user.eid,
      user.email?.toLowerCase(),
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
  }, [db?.attendance, user, todayIso]);

  const isClockedIn = Boolean(
    todayRec &&
    (todayRec.in || todayRec.check_in_time) &&
    todayRec.status !== 'absent' &&
    String(todayRec.source || 'clock') !== 'sheet'
  );
  const isClockedOut = Boolean(todayRec?.out || todayRec?.check_out_time);

  const clockInDt = useMemo(() => {
    if (!isClockedIn) return null;
    return parseClockInTime(todayRec.date || todayIso, todayRec.in || todayRec.check_in_time);
  }, [isClockedIn, todayRec, todayIso]);

  const targetEndDt = useMemo(() => {
    if (!clockInDt) return null;
    return new Date(clockInDt.getTime() + 9 * 3600 * 1000);
  }, [clockInDt]);

  // Tick clock when logout modal is visible to keep countdown real-time
  useEffect(() => {
    if (!showLogoutModal || !isClockedIn || isClockedOut) return;
    const interval = setInterval(() => setNowTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, [showLogoutModal, isClockedIn, isClockedOut]);

  const remainingSecs = useMemo(() => {
    if (!targetEndDt || isClockedOut) return 0;
    return Math.max(0, Math.floor((targetEndDt.getTime() - nowTime.getTime()) / 1000));
  }, [targetEndDt, isClockedOut, nowTime]);

  const isEarlyShift = isClockedIn && !isClockedOut && remainingSecs > 0;

  // Monthly early logout count
  const curMonth = nowTime.getMonth() + 1;
  const curYear = nowTime.getFullYear();
  const earlyCount = useMemo(() => {
    if (!user) return 0;
    return countMonthlyEarlyLogoutWarnings(
      db?.attendanceWarnings,
      user.id || user._id,
      curMonth,
      curYear
    );
  }, [db?.attendanceWarnings, user, curMonth, curYear]);

  const isPenaltyWarning = earlyCount >= 2;
  const nextWarningNum = earlyCount + 1;

  const remH = Math.floor(remainingSecs / 3600);
  const remM = Math.floor((remainingSecs % 3600) / 60);
  const remS = remainingSecs % 60;
  const remFormatted = `${String(remH).padStart(2, '0')}h ${String(remM).padStart(2, '0')}m ${String(remS).padStart(2, '0')}s`;

  const handleConfirmLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      // Auto check-out via server API if currently clocked in
      if (isClockedIn && !isClockedOut) {
        const token = getAuthToken();
        const nowStr = new Date().toTimeString().substr(0, 8);
        if (token) {
          const res = await fetch(`${API_BASE}/attendance/check-out`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              date: todayIso,
              check_out_time: nowStr,
            }),
          });
          if (res.ok) {
            const data = await res.json().catch(() => ({}));
            // Dispatch update so any active views catch the state
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('hrms:attendance-update', {
                  detail: { action: 'clock-out', record: data },
                })
              );
            }
          }
        }
      }
    } catch (err) {
      console.error('Logout checkout sync error:', err);
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
      logout();
    }
  };

  return (
    <div className="app-shell">
      <AppHeader />
      <div className="main-area">
        <div className="page-content">{children}</div>
      </div>

      <Modal
        open={showLogoutModal}
        onClose={() => !isLoggingOut && setShowLogoutModal(false)}
        title={isEarlyShift ? (isPenaltyWarning ? '🚨 Critical: Half-Day Absent Deduction' : '⚠️ Early Logout Warning') : 'Sign out'}
        subtitle={isEarlyShift ? 'Incomplete 9-Hour Work Shift' : 'End your CEGS OS session'}
        maxWidth={460}
      >
        {isEarlyShift ? (
          <div>
            <div
              style={{
                background: isPenaltyWarning ? '#fef2f2' : '#fffbeb',
                border: `1px solid ${isPenaltyWarning ? '#fecaca' : '#fde68a'}`,
                borderRadius: 14,
                padding: '16px 18px',
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: isPenaltyWarning ? '#fee2e2' : '#fef3c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isPenaltyWarning ? '#dc2626' : '#d97706',
                    flexShrink: 0,
                  }}
                >
                  <AlertTriangle size={18} />
                </div>
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: 14,
                    color: isPenaltyWarning ? '#dc2626' : '#b45309',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {isPenaltyWarning
                    ? `Warning #${nextWarningNum}: Marks Half-Day Absent`
                    : `Early Departure Warning (${nextWarningNum} of 2)`}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  padding: '12px 16px',
                  borderRadius: 12,
                  marginBottom: 14,
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
                }}
              >
                <div>
                  <div style={{ fontSize: 10.5, color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.02em' }}>
                    Remaining Shift Time
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>
                    {remFormatted}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10.5, color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.02em' }}>
                    Shift Cycle (9 Hours)
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0284c7', marginTop: 2 }}>
                    In: {formatTime12(clockInDt)} • Out: {formatTime12(targetEndDt)}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                {isPenaltyWarning ? (
                  <>
                    <p style={{ margin: '0 0 6px 0', color: '#dc2626', fontWeight: 800 }}>
                      ⚠️ You currently have {earlyCount} early logout warning{earlyCount > 1 ? 's' : ''} this month.
                    </p>
                    <p style={{ margin: 0, color: '#7f1d1d' }}>
                      Logging out before completing your 9 hours will trigger your <strong>{nextWarningNum}th early departure</strong>.
                      You will be marked as <strong>Half-Day Absent</strong> and a <strong>half-day salary deduction will be applied to your monthly payroll</strong>!
                    </p>
                  </>
                ) : (
                  <>
                    <p style={{ margin: '0 0 6px 0', color: '#b45309', fontWeight: 800 }}>
                      You have not completed your 9-hour shift cycle.
                    </p>
                    <p style={{ margin: 0, color: '#78350f' }}>
                      Logging out now will record an <strong>Early Logout Warning ({nextWarningNum} of 2)</strong>.
                      From the <strong>3rd warning onward</strong>, you are marked as <strong>Half-Day Absent</strong> with payroll salary deduction.
                    </p>
                  </>
                )}
              </div>
            </div>

            <p style={{ color: '#475569', fontSize: 13.5, marginBottom: 18, lineHeight: 1.5 }}>
              {isPenaltyWarning
                ? 'Are you sure you want to log out? It will mark you half day absent with a deduction.'
                : 'Are you sure you want to log out now, or stay signed in to finish your 9 hours?'}
            </p>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                disabled={isLoggingOut}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#334155',
                  fontWeight: 700,
                  padding: '9px 16px',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontSize: 13.5,
                }}
              >
                Stay signed in
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                disabled={isLoggingOut}
                style={{
                  background: isPenaltyWarning
                    ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)'
                    : 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 700,
                  padding: '9px 16px',
                  borderRadius: 10,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: isLoggingOut ? 'not-allowed' : 'pointer',
                  opacity: isLoggingOut ? 0.7 : 1,
                  boxShadow: isPenaltyWarning
                    ? '0 4px 14px rgba(220, 38, 38, 0.35)'
                    : '0 4px 14px rgba(234, 88, 12, 0.35)',
                  fontSize: 13.5,
                }}
              >
                <LogOut size={14} />
                {isLoggingOut
                  ? 'Logging out…'
                  : isPenaltyWarning
                  ? 'Log Out (Accept Half-Day Penalty)'
                  : 'Confirm Early Log Out'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
              Are you sure you want to log out of CEGS OS?
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowLogoutModal(false)}
                disabled={isLoggingOut}
              >
                Stay signed in
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmLogout}
                disabled={isLoggingOut}
              >
                <LogOut size={14} /> {isLoggingOut ? 'Logging out…' : 'Log out'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {quickViewUser && (
        <EmployeeQuickViewModal
          targetUser={quickViewUser}
          currentUser={user}
          db={db}
          onClose={() => setQuickViewUser(null)}
          onStartChat={openChatWithUser}
        />
      )}

      <GlobalMessengerModal
        open={showMessengerInbox}
        onClose={() => {
          setShowMessengerInbox(false);
          setChatTargetUser(null);
        }}
        currentUser={user}
        targetUser={chatTargetUser}
        setTargetUser={setChatTargetUser}
        db={db}
        save={save}
      />

      {/* Global 9-Hour Shift Countdown Timer */}
      <ShiftReverseStopwatch
        currentUser={user}
        db={db}
        save={save}
      />
    </div>
  );
}
