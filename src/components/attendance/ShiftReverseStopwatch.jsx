'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Clock, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { toIsoDate } from '@/lib/auto-absent';
import { getAuthToken, API_BASE } from '@/lib/auth-client';

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

  // Position state (persisted to localStorage)
  const [position, setPosition] = useState({ x: -1, y: -1 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, startPosX: 0, startPosY: 0 });
  const widgetRef = useRef(null);

  // Today in Asia/Kolkata ISO format
  const todayIso = useMemo(() => toIsoDate(new Date()), []);

  // Sync attendance record on boot if db.attendance lacks today's punch
  useEffect(() => {
    setMounted(true);

    // Load saved position or default to down right corner
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
    if (token && currentUser?.id) {
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
  }, [currentUser?.id, save, todayIso]);

  // Set default initial position in DOWN RIGHT CORNER once mounted
  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;
    if (position.x === -1 || position.y === -1) {
      const w = 275;
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

  // Today's attendance record for current user
  const todayRec = useMemo(() => {
    if (!currentUser?.id) return null;
    return (db?.attendance || []).find((a) => {
      const uid = a.uid || a.user_id || (typeof a.user_id === 'object' ? a.user_id?._id : null);
      const matchUser = String(uid) === String(currentUser.id);
      const matchDate = String(a.date || '').slice(0, 10) === todayIso;
      return matchUser && matchDate;
    });
  }, [db?.attendance, currentUser?.id, todayIso]);

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

  // Dragging logic (whole cylinder is moveable by cursor)
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
    if (e.button !== 0) return;
    e.preventDefault();
    handleStartDrag(e.clientX, e.clientY);
  };

  const handleTouchStart = (e) => {
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
      const widgetWidth = widgetRef.current?.offsetWidth || 275;
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
      const widgetWidth = widgetRef.current?.offsetWidth || 275;
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

  // If user hasn't clocked in today yet, keep hidden until clock-in
  if (!isClockedIn) return null;

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

  return (
    <aside
      ref={widgetRef}
      className={`shift-cylinder-stopwatch ${isDragging ? 'dragging' : ''} ${calculation.isCompleted ? 'completed' : ''}`}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      style={{
        left: position.x >= 0 ? `${position.x}px` : 'auto',
        top: position.y >= 0 ? `${position.y}px` : 'auto',
        right: position.x < 0 ? '24px' : 'auto',
        bottom: position.y < 0 ? '24px' : 'auto',
      }}
      title={`Clocked In: ${clockInDisplay} • Target Out: ${targetEndDisplay} (9h Shift)\nDrag to move anywhere`}
    >
      {/* Left indicator: live pulse & clock icon */}
      <div className="cylinder-left">
        <span className={`cylinder-status-dot ${isClockedOut ? 'paused' : 'live'}`} />
        <Clock size={15} className="cylinder-clock-icon" />
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

      {/* Right side status / target badge */}
      <div className="cylinder-right">
        {calculation.isCompleted ? (
          <span className="cylinder-badge completed">
            <CheckCircle2 size={12} />
            <span>9h Done</span>
          </span>
        ) : isClockedOut ? (
          <span className="cylinder-badge out">
            <span>Out</span>
          </span>
        ) : (
          <span className="cylinder-badge active">
            <span>🎯 {targetEndDisplay}</span>
          </span>
        )}
      </div>

      {/* Inset Bottom Progress Bar Curve */}
      <div className="cylinder-progress-track">
        <div
          className={`cylinder-progress-fill ${calculation.isCompleted ? 'completed' : ''}`}
          style={{ width: `${calculation.progressPct}%` }}
        />
      </div>
    </aside>
  );
}

export default ShiftReverseStopwatch;
