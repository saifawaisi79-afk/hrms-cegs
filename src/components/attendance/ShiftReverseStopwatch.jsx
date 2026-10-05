'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Clock, CheckCircle2, Play, LogIn, AlertTriangle, LogOut } from 'lucide-react';
import confetti from 'canvas-confetti';
import { toIsoDate } from '@/lib/auto-absent';
import { getAuthToken, API_BASE } from '@/lib/auth-client';
import { countMonthlyEarlyLogoutWarnings } from '@/lib/attendance-policy';

const SHIFT_HOURS = 9;
const SHIFT_MS = SHIFT_HOURS * 60 * 60 * 1000; // 32,400,000 ms

/**
 * Flexible punch time parser for multiple formats:
 * - "09:30:00 AM" / "9:30 PM"
 * - "09:30:00" / "09:30"
 * - ISO string "2026-10-05T09:30:00.000Z"
 */
export function parseClockInTime(dateStr, timeStr) {
  if (!timeStr) return null;
  const isoDate = String(dateStr || '').slice(0, 10);
  const now = new Date();
  let [y, mo, d] = isoDate.split('-').map(Number);
  if (!y || !mo || !d) {
    y = now.getFullYear();
    mo = now.getMonth() + 1;
    d = now.getDate();
  }

  const raw = String(timeStr).trim();

  // Try 12-hour AM/PM or 24-hour HH:mm[:ss]
  const timeMatch = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const seconds = parseInt(timeMatch[3] || '0', 10);
    const ampm = timeMatch[4]?.toUpperCase();

    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;

    return new Date(y, mo - 1, d, hours, minutes, seconds, 0);
  }

  // Try parsing direct ISO date
  const parsedDirect = new Date(raw);
  if (!isNaN(parsedDirect.getTime())) return parsedDirect;

  return null;
}

export function formatTime12(dateObj) {
  if (!dateObj || isNaN(dateObj.getTime())) return '--:--';
  let hours = dateObj.getHours();
  const minutes = dateObj.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${String(minutes).padStart(2, '0')} ${ampm}`;
}

export function ShiftReverseStopwatch({ currentUser, db, save }) {
  const [mounted, setMounted] = useState(false);
  const [liveNow, setLiveNow] = useState(() => new Date());
  const [hasCelebrated, setHasCelebrated] = useState(false);
  const [isClockingIn, setIsClockingIn] = useState(false);
  const [showEarlyModal, setShowEarlyModal] = useState(false);
  const [isClockingOut, setIsClockingOut] = useState(false);

  // Position state (persisted to localStorage)
  const [position, setPosition] = useState({ x: -1, y: -1 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, startPosX: 0, startPosY: 0 });
  const widgetRef = useRef(null);

  // Today in Asia/Kolkata ISO format
  const todayIso = useMemo(() => toIsoDate(new Date()), []);

  // Sync attendance record on boot across all portals
  useEffect(() => {
    setMounted(true);

    // Load saved position or default to down-right corner
    try {
      const savedPos = localStorage.getItem('cegs_shift_timer_pos_cyl');
      if (savedPos) {
        const parsed = JSON.parse(savedPos);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          setPosition(parsed);
        }
      }
    } catch {}

    // Fetch fresh attendance if user is logged in
    const token = getAuthToken();
    if (token && currentUser) {
      fetch(`${API_BASE}/attendance`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((rows) => {
          if (Array.isArray(rows) && typeof save === 'function') {
            save('attendance', rows);
          }
        })
        .catch(() => {});
    }
  }, [currentUser, save, todayIso]);

  // Set default initial position in DOWN-RIGHT CORNER once mounted
  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;
    if (position.x === -1 || position.y === -1) {
      const w = 285;
      const h = 50;
      const initialX = Math.max(16, window.innerWidth - w - 24);
      const initialY = Math.max(16, window.innerHeight - h - 24);
      setPosition({ x: initialX, y: initialY });
    }
  }, [mounted, position.x, position.y]);

  // Listen for immediate clock-in / clock-out custom events
  useEffect(() => {
    const handleAttendanceEvent = () => {
      setLiveNow(new Date());
    };

    window.addEventListener('hrms:attendance-update', handleAttendanceEvent);
    return () => {
      window.removeEventListener('hrms:attendance-update', handleAttendanceEvent);
    };
  }, []);

  // Today's attendance record for current user (matching across all roles: HR Admin, Finance, Employee, Super Admin)
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

  // Parse clock-in and clock-out timestamps
  const clockInDt = useMemo(() => {
    if (!isClockedIn) return null;
    return parseClockInTime(todayRec.date || todayIso, todayRec.in || todayRec.check_in_time);
  }, [isClockedIn, todayRec, todayIso]);

  const clockOutDt = useMemo(() => {
    if (!isClockedOut) return null;
    return parseClockInTime(todayRec.date || todayIso, todayRec.out || todayRec.check_out_time);
  }, [isClockedOut, todayRec, todayIso]);

  // Target shift end timestamp: Clock-in + 9 hours
  const targetEndDt = useMemo(() => {
    if (!clockInDt) return null;
    return new Date(clockInDt.getTime() + SHIFT_MS);
  }, [clockInDt]);

  // Ticking timer: 1-second interval
  useEffect(() => {
    if (!isClockedIn || isClockedOut) return;
    const interval = setInterval(() => {
      setLiveNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, [isClockedIn, isClockedOut]);

  // Calculations for remaining time and progress
  const calculation = useMemo(() => {
    if (!clockInDt || !targetEndDt) {
      return {
        remainingSecs: SHIFT_HOURS * 3600,
        elapsedSecs: 0,
        progressPct: 0,
        isCompleted: false,
        isOvertime: false,
        overtimeSecs: 0,
      };
    }

    const currentAnchor = isClockedOut && clockOutDt ? clockOutDt : liveNow;
    const elapsedMs = Math.max(0, currentAnchor.getTime() - clockInDt.getTime());
    const remainingMs = targetEndDt.getTime() - currentAnchor.getTime();

    const isCompleted = remainingMs <= 0;
    const remainingSecs = Math.max(0, Math.floor(remainingMs / 1000));
    const overtimeSecs = isCompleted ? Math.floor(Math.abs(remainingMs) / 1000) : 0;
    const progressPct = Math.min(100, Math.max(0, (elapsedMs / SHIFT_MS) * 100));

    return {
      remainingSecs,
      elapsedSecs: Math.floor(elapsedMs / 1000),
      progressPct,
      isCompleted,
      isOvertime: isCompleted && !isClockedOut,
      overtimeSecs,
    };
  }, [clockInDt, targetEndDt, isClockedOut, clockOutDt, liveNow]);

  // Confetti trigger once 9 hours is reached
  useEffect(() => {
    if (calculation.isCompleted && !hasCelebrated && isClockedIn) {
      setHasCelebrated(true);
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
        });
      } catch {}
    }
  }, [calculation.isCompleted, hasCelebrated, isClockedIn]);

  // Direct 1-Click Clock-In from within the cylinder (for HR Admin, Finance, and Employee portals)
  const handleDirectClockIn = useCallback(
    async (e) => {
      e?.stopPropagation();
      if (isClockingIn || !currentUser) return;
      setIsClockingIn(true);

      const now = new Date();
      const timeStr = now.toTimeString().substr(0, 8);
      const userId = currentUser.id || currentUser._id;

      const newRec = {
        id: Date.now().toString(),
        uid: userId,
        user_id: userId,
        date: todayIso,
        in: timeStr,
        check_in_time: timeStr,
        out: null,
        status: 'present',
        hrs: 0,
        auto: false,
        source: 'clock',
      };

      // Optimistically save into React db state
      if (typeof save === 'function') {
        const remaining = (db?.attendance || []).filter((a) => {
          const uid = a.uid || a.user_id || (typeof a.user_id === 'object' ? a.user_id?._id : null);
          const matchUser = String(uid) === String(userId);
          const matchDate = String(a.date || '').slice(0, 10) === todayIso;
          return !(matchUser && matchDate);
        });
        save('attendance', [newRec, ...remaining]);
      }

      // Notify global event listeners
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('hrms:attendance-update', {
            detail: { action: 'clock-in', record: newRec },
          })
        );
      }

      // Persist to backend server API
      try {
        const token = getAuthToken();
        if (token) {
          const res = await fetch(`${API_BASE}/attendance/check-in`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              status: 'present',
              date: todayIso,
              check_in_time: timeStr,
            }),
          });
          if (res.ok) {
            const data = await res.json().catch(() => ({}));
            if (data?.check_in_time && typeof save === 'function') {
              save('attendance', [
                { ...newRec, id: data.id || newRec.id, in: data.check_in_time },
                ...(db?.attendance || []).filter(
                  (a) =>
                    !(
                      String(a.uid || a.user_id) === String(userId) &&
                      String(a.date || '').slice(0, 10) === todayIso
                    )
                ),
              ]);
            }
          }
        }
      } catch (err) {
        console.error('Direct clock-in error:', err);
      } finally {
        setIsClockingIn(false);
        setLiveNow(new Date());
      }
    },
    [isClockingIn, currentUser, todayIso, save, db?.attendance]
  );

  // Monthly early logout warnings count for current user
  const curMonth = liveNow.getMonth() + 1;
  const curYear = liveNow.getFullYear();
  const earlyWarningsCount = useMemo(() => {
    if (!currentUser) return 0;
    return countMonthlyEarlyLogoutWarnings(
      db?.attendanceWarnings,
      currentUser.id || currentUser._id,
      curMonth,
      curYear
    );
  }, [db?.attendanceWarnings, currentUser, curMonth, curYear]);

  const isPenaltyWarning = earlyWarningsCount >= 2;
  const nextWarningNum = earlyWarningsCount + 1;

  const executeClockOut = useCallback(async () => {
    if (isClockingOut || !currentUser) return;
    setIsClockingOut(true);

    const now = new Date();
    const timeStr = now.toTimeString().substr(0, 8);
    const userId = currentUser.id || currentUser._id;

    try {
      const token = getAuthToken();
      if (token) {
        const res = await fetch(`${API_BASE}/attendance/check-out`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            date: todayIso,
            check_out_time: timeStr,
          }),
        });

        const data = await res.json().catch(() => ({}));
        const finalStatus = data?.status || (data?.is_half_day ? 'half_day' : todayRec?.status || 'present');
        const workHours = typeof data?.work_hours === 'number' ? data.work_hours : Math.max(0, Math.round((calculation.elapsedSecs / 3600) * 100) / 100);

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
                  out: timeStr,
                  check_out_time: timeStr,
                  hrs: workHours,
                  work_hours: workHours,
                  status: finalStatus,
                };
              }
              return a;
            })
          );

          if (data?.warning) {
            save('attendanceWarnings', [
              data.warning,
              ...(db?.attendanceWarnings || []).filter((w) => w.id !== data.warning.id),
            ]);
          }

          if (data?.payroll) {
            save('payroll', [
              data.payroll,
              ...(db?.payroll || []).filter((p) => p.id !== data.payroll.id && p._id !== data.payroll._id),
            ]);
          }
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('hrms:attendance-update', {
              detail: { action: 'clock-out', record: { ...todayRec, out: timeStr, status: finalStatus, hrs: workHours } },
            })
          );
        }

        if (data?.is_early) {
          if (data?.is_half_day) {
            alert(`🚨 Half-Day Absent Penalty Applied!\nYou have ${data.early_warnings} early logout warnings this month. You have been marked Half-Day Absent and an automatic half-day deduction has been applied to your payroll.`);
          } else {
            alert(`⚠️ Early Logout Warning (${data.early_warnings} of 2)\nYou clocked out before completing 9 hours. Note: after 2 warnings, from your 3rd warning onward you will be marked as Half-Day Absent with a payroll deduction.`);
          }
        }
      }
    } catch (err) {
      console.error('Execute clock-out error:', err);
    } finally {
      setIsClockingOut(false);
      setShowEarlyModal(false);
      setLiveNow(new Date());
    }
  }, [isClockingOut, currentUser, todayIso, calculation.elapsedSecs, save, db?.attendance, db?.attendanceWarnings, db?.payroll, todayRec]);

  const handleClockOutClick = useCallback(
    (e) => {
      e?.stopPropagation();
      if (!isClockedIn || isClockedOut) return;
      if (calculation.remainingSecs > 0) {
        setShowEarlyModal(true);
      } else {
        executeClockOut();
      }
    },
    [isClockedIn, isClockedOut, calculation.remainingSecs, executeClockOut]
  );


  // Dragging logic (moveable by cursor anywhere)
  const handleStartDrag = useCallback(
    (clientX, clientY) => {
      setIsDragging(true);
      dragRef.current = {
        startX: clientX,
        startY: clientY,
        startPosX: position.x,
        startPosY: position.y,
      };
    },
    [position.x, position.y]
  );

  const handleMouseDown = (e) => {
    if (e.button !== 0 || e.target.closest('button')) return;
    e.preventDefault();
    handleStartDrag(e.clientX, e.clientY);
  };

  const handleTouchStart = (e) => {
    if (e.target.closest('button')) return;
    const touch = e.touches[0];
    if (touch) {
      handleStartDrag(touch.clientX, touch.clientY);
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      const widgetWidth = widgetRef.current?.offsetWidth || 285;
      const widgetHeight = widgetRef.current?.offsetHeight || 50;

      const maxX = Math.max(0, window.innerWidth - widgetWidth - 10);
      const maxY = Math.max(0, window.innerHeight - widgetHeight - 10);

      const nextX = Math.min(maxX, Math.max(10, dragRef.current.startPosX + dx));
      const nextY = Math.min(maxY, Math.max(10, dragRef.current.startPosY + dy));

      setPosition({ x: nextX, y: nextY });
    };

    const handleTouchMove = (e) => {
      const touch = e.touches[0];
      if (!touch) return;
      const dx = touch.clientX - dragRef.current.startX;
      const dy = touch.clientY - dragRef.current.startY;
      const widgetWidth = widgetRef.current?.offsetWidth || 285;
      const widgetHeight = widgetRef.current?.offsetHeight || 50;

      const maxX = Math.max(0, window.innerWidth - widgetWidth - 10);
      const maxY = Math.max(0, window.innerHeight - widgetHeight - 10);

      const nextX = Math.min(maxX, Math.max(10, dragRef.current.startPosX + dx));
      const nextY = Math.min(maxY, Math.max(10, dragRef.current.startPosY + dy));

      setPosition({ x: nextX, y: nextY });
    };

    const handleEndDrag = () => {
      setIsDragging(false);
      try {
        localStorage.setItem('cegs_shift_timer_pos_cyl', JSON.stringify(position));
      } catch {}
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleEndDrag);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleEndDrag);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEndDrag);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEndDrag);
    };
  }, [isDragging, position]);

  // If component isn't mounted or user isn't logged in, don't render
  if (!mounted || !currentUser) return null;

  // Formatting hours, minutes, seconds for countdown display
  const remSecs = calculation.remainingSecs;
  const remH = Math.floor(remSecs / 3600);
  const remM = Math.floor((remSecs % 3600) / 60);
  const remS = remSecs % 60;

  const hStr = String(remH).padStart(2, '0');
  const mStr = String(remM).padStart(2, '0');
  const sStr = String(remS).padStart(2, '0');

  const clockInDisplay = formatTime12(clockInDt);
  const targetEndDisplay = formatTime12(targetEndDt);

  // Portal label for contextual tooltip
  const portalLabelText =
    currentUser.role === 'admin'
      ? 'HR Admin Panel'
      : currentUser.role === 'finance'
      ? 'Finance & Invoices'
      : currentUser.role === 'super_admin'
      ? 'Super Admin'
      : 'Employee Portal';

  return (
    <>
      <aside
      ref={widgetRef}
      className={`shift-cylinder-stopwatch ${isDragging ? 'dragging' : ''} ${calculation.isCompleted ? 'completed' : ''} ${!isClockedIn ? 'ready-to-clock' : ''}`}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      style={{
        left: position.x >= 0 ? `${position.x}px` : 'auto',
        top: position.y >= 0 ? `${position.y}px` : 'auto',
        right: position.x < 0 ? '24px' : 'auto',
        bottom: position.y < 0 ? '24px' : 'auto',
      }}
      title={
        isClockedIn
          ? `${portalLabelText} • Clocked In: ${clockInDisplay} • Target Out: ${targetEndDisplay} (9h Shift)\nDrag to move anywhere`
          : `${portalLabelText} • Click Clock In to start your 9-hour shift timer\nDrag to move anywhere`
      }
    >
      {/* Left indicator: live pulse & clock icon */}
      <div className="cylinder-left">
        <span
          className={`cylinder-status-dot ${!isClockedIn ? 'waiting' : isClockedOut ? 'paused' : 'live'}`}
        />
        <Clock size={15} className={`cylinder-clock-icon ${!isClockedIn ? 'waiting' : ''}`} />
      </div>

      {/* Center: Clean 9h reverse countdown digits */}
      <div className="cylinder-digits">
        <span className={remH === 0 ? 'cyl-dim' : 'cyl-bright'}>
          <span className="cyl-num">{hStr}</span>
          <span className="cyl-unit">h</span>
        </span>
        <span className="cyl-gap" />
        <span className={remH === 0 && remM === 0 ? 'cyl-dim' : 'cyl-bright'}>
          <span className="cyl-num">{mStr}</span>
          <span className="cyl-unit">m</span>
        </span>
        <span className="cyl-gap" />
        <span className="cyl-bright">
          <span className="cyl-num">{sStr}</span>
          <span className="cyl-unit">s</span>
        </span>
      </div>

      {/* Right side: Direct Clock-In button if not clocked in, or Clock Out actions when active */}
      <div className="cylinder-right">
        {!isClockedIn ? (
          <button
            type="button"
            className="cylinder-clockin-btn"
            onClick={handleDirectClockIn}
            disabled={isClockingIn}
            title={`Click to Clock In on ${portalLabelText}`}
          >
            <Play size={11} fill="currentColor" />
            <span>{isClockingIn ? 'Clocking in…' : 'Clock In'}</span>
          </button>
        ) : isClockedOut ? (
          <span className="cylinder-badge out">
            <span>Out</span>
          </span>
        ) : calculation.isCompleted ? (
          <button
            type="button"
            className="cylinder-clockout-btn completed"
            onClick={handleClockOutClick}
            disabled={isClockingOut}
            title="9h shift complete! Click to Clock Out"
          >
            <CheckCircle2 size={12} />
            <span>Clock Out</span>
          </button>
        ) : (
          <button
            type="button"
            className="cylinder-clockout-btn"
            onClick={handleClockOutClick}
            disabled={isClockingOut}
            title={`Target: ${targetEndDisplay} • Click to Clock Out early`}
          >
            <span>Clock Out</span>
          </button>
        )}
      </div>

      {/* Inset Bottom Progress Bar Curve (shows progress when active) */}
      <div className="cylinder-progress-track">
        <div
          className={`cylinder-progress-fill ${calculation.isCompleted ? 'completed' : ''} ${!isClockedIn ? 'zero' : ''}`}
          style={{ width: `${isClockedIn ? calculation.progressPct : 0}%` }}
        />
      </div>
    </aside>

    {/* Early Clock-Out Warning & Half-Day Absent Deduction Modal */}
    {showEarlyModal && (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999999,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && !isClockingOut) setShowEarlyModal(false);
        }}
        role="dialog"
        aria-modal="true"
      >
        <div
          style={{
            background: '#0f172a',
            border: `1px solid ${isPenaltyWarning ? 'rgba(239, 68, 68, 0.45)' : 'rgba(245, 158, 11, 0.45)'}`,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
            borderRadius: 16,
            maxWidth: 460,
            width: '100%',
            padding: 24,
            color: '#f8fafc',
            fontFamily: 'inherit',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: isPenaltyWarning ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isPenaltyWarning ? '#ef4444' : '#f59e0b',
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#f8fafc' }}>
                {isPenaltyWarning ? '🚨 Critical: Half-Day Absent Deduction' : '⚠️ Early Clock-Out Warning'}
              </h3>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                {isPenaltyWarning
                  ? `Warning #${nextWarningNum} • Marks Half-Day Absent`
                  : `Incomplete Shift (${nextWarningNum} of 2 Warnings)`}
              </div>
            </div>
          </div>

          {/* Shift Time Badge */}
          <div
            style={{
              background: 'rgba(30, 41, 59, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 12,
              padding: '12px 16px',
              marginBottom: 16,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: 10.5, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Remaining Shift Time
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#f8fafc', fontVariantNumeric: 'tabular-nums' }}>
                {hStr}h {mStr}m {sStr}s
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10.5, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                9-Hour Shift Cycle
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#38bdf8' }}>
                In: {clockInDisplay} • Target: {targetEndDisplay}
              </div>
            </div>
          </div>

          {/* Explanatory text */}
          <div
            style={{
              background: isPenaltyWarning ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
              border: `1px solid ${isPenaltyWarning ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
              borderRadius: 10,
              padding: '12px 14px',
              marginBottom: 18,
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            {isPenaltyWarning ? (
              <>
                <p style={{ margin: '0 0 6px 0', color: '#fca5a5', fontWeight: 800 }}>
                  ⚠️ You already have {earlyWarningsCount} early logout warning{earlyWarningsCount > 1 ? 's' : ''} this month!
                </p>
                <p style={{ margin: 0, color: '#e2e8f0' }}>
                  Clocking out before completing your 9 hours will trigger your <strong>{nextWarningNum}th early departure</strong>.
                  You will be marked as <strong>Half-Day Absent</strong> and an automatic <strong>half-day salary deduction will be applied to your monthly payroll</strong>!
                </p>
              </>
            ) : (
              <>
                <p style={{ margin: '0 0 6px 0', color: '#fde68a', fontWeight: 700 }}>
                  You have not completed your required 9-hour cycle.
                </p>
                <p style={{ margin: 0, color: '#cbd5e1' }}>
                  Clocking out early will record an <strong>Early Logout Warning ({nextWarningNum} of 2)</strong>.
                  From the <strong>3rd warning onward</strong>, early departures mark you as <strong>Half-Day Absent</strong> with payroll deduction.
                </p>
              </>
            )}
          </div>

          <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 20px 0' }}>
            {isPenaltyWarning
              ? 'Are you sure you want to clock out? It will mark you half-day absent with salary deduction.'
              : 'Are you sure you want to clock out early, or would you like to continue working?'}
          </p>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowEarlyModal(false)}
              disabled={isClockingOut}
              style={{ fontWeight: 600, padding: '7px 14px' }}
            >
              Continue Working
            </button>
            <button
              type="button"
              className="btn"
              onClick={executeClockOut}
              disabled={isClockingOut}
              style={{
                background: isPenaltyWarning ? '#dc2626' : '#ea580c',
                color: '#ffffff',
                borderColor: isPenaltyWarning ? '#b91c1c' : '#c2410c',
                fontWeight: 700,
                padding: '7px 14px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <LogOut size={14} />
              {isClockingOut
                ? 'Clocking out…'
                : isPenaltyWarning
                ? 'Clock Out (Accept Half-Day Penalty)'
                : 'Confirm Early Clock Out'}
            </button>
          </div>
        </div>
      </div>
    )}
  </>
  );
}

export default ShiftReverseStopwatch;
