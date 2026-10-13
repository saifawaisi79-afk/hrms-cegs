'use client';

import React, { useEffect, useRef, useState } from 'react';

// Synthesize a pleasant WhatsApp-like incoming message chime using Web Audio API
function playMessageChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // First gentle tone (E5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.18);

    // Second chime tone (B5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(987.77, now + 0.08);
    gain2.gain.setValueAtTime(0.15, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.38);
  } catch {}
}

/**
 * Floating WhatsApp-style notification toast for newly arrived messages.
 * Pops up across all HRMS pages when a teammate or group sends a message.
 */
export function MessengerNotificationToast({
  currentUser,
  messages = [],
  groups = [],
  isMessengerOpen = false,
  activeTargetUserId = null,
  activeTargetGroupId = null,
  onOpenChatWithUser,
  onOpenChatWithGroup,
}) {
  const [notifications, setNotifications] = useState([]);
  const knownMsgIdsRef = useRef(new Set());
  const initialLoadRef = useRef(true);
  const myId = String(currentUser?.id || currentUser?._id || '');

  useEffect(() => {
    if (!myId || !Array.isArray(messages)) return;

    // On initial mount, prime the known IDs so we don't alert for pre-existing history
    if (initialLoadRef.current) {
      messages.forEach((m) => {
        const key = String(m.id || m._id || `${m.fromId}-${m.time}`);
        knownMsgIdsRef.current.add(key);
      });
      initialLoadRef.current = false;
      return;
    }

    // Identify new incoming messages
    const newlyArrived = [];
    messages.forEach((m) => {
      const key = String(m.id || m._id || `${m.fromId}-${m.time}`);
      const fromId = String(m.fromId || '');

      // Check if message is from another user and hasn't been notified yet
      if (fromId && fromId !== myId && !knownMsgIdsRef.current.has(key)) {
        knownMsgIdsRef.current.add(key);

        // If the messenger is already open and viewing this exact conversation, skip toast
        const isCurrentlyViewing =
          isMessengerOpen &&
          ((m.groupId && String(m.groupId) === String(activeTargetGroupId)) ||
            (!m.groupId && String(m.fromId) === String(activeTargetUserId)));

        if (!isCurrentlyViewing) {
          newlyArrived.push(m);
        }
      }
    });

    if (newlyArrived.length > 0) {
      playMessageChime();

      // Find group or user details for each new message
      const formattedToasts = newlyArrived.map((msg) => {
        const groupObj = msg.groupId
          ? groups.find((g) => String(g.id || g._id) === String(msg.groupId))
          : null;

        return {
          id: `toast-${Date.now()}-${Math.random()}`,
          message: msg,
          group: groupObj,
          senderName: msg.fromName || 'Team Member',
          senderAvatar:
            msg.fromAvatar ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(msg.fromName || 'user')}`,
          text: msg.text || (msg.imageUrl ? '📷 Sent a photo' : 'New message'),
          hasImage: Boolean(msg.imageUrl),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
      });

      setNotifications((prev) => [...formattedToasts, ...prev].slice(0, 3));
    }
  }, [messages, myId, groups, isMessengerOpen, activeTargetUserId, activeTargetGroupId]);

  const handleDismiss = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleOpen = (toast) => {
    handleDismiss(toast.id);
    if (toast.group || toast.message.groupId) {
      const grp =
        toast.group ||
        groups.find((g) => String(g.id || g._id) === String(toast.message.groupId)) || {
          id: toast.message.groupId,
          name: 'Team Group',
        };
      onOpenChatWithGroup?.(grp);
    } else {
      onOpenChatWithUser?.({
        id: toast.message.fromId,
        _id: toast.message.fromId,
        name: toast.senderName,
        avatar: toast.senderAvatar,
      });
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 24,
        right: 24,
        zIndex: 999999,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        maxWidth: 360,
        width: 'calc(100vw - 48px)',
        pointerEvents: 'none',
      }}
    >
      {notifications.map((n) => (
        <div
          key={n.id}
          style={{
            pointerEvents: 'auto',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: 16,
            padding: '14px 16px',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            boxShadow: '0 12px 36px rgba(15, 23, 42, 0.16), 0 4px 12px rgba(16, 185, 129, 0.12)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            cursor: 'pointer',
            transition: 'transform 0.2s ease',
          }}
          onClick={() => handleOpen(n)}
        >
          {/* TOP ROW: SENDER INFO + DISMISS */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ position: 'relative' }}>
                <img
                  src={n.senderAvatar}
                  alt=""
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    border: '2px solid #10B981',
                    objectFit: 'cover',
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: '#10B981',
                    border: '2px solid #FFFFFF',
                  }}
                />
              </div>

              <div>
                <div style={{ fontSize: 13, fontWeight: 900, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{n.senderName}</span>
                  {n.group && (
                    <span
                      style={{
                        background: '#ECFDF5',
                        color: '#059669',
                        padding: '1px 6px',
                        borderRadius: 6,
                        fontSize: 10,
                        fontWeight: 800,
                        border: '1px solid #A7F3D0',
                      }}
                    >
                      in {n.group.name}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 10.5, color: '#64748B' }}>
                  {n.time} · Live Team Messenger
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDismiss(n.id);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                fontSize: 16,
                padding: '2px 6px',
                borderRadius: 6,
                lineHeight: 1,
              }}
              title="Dismiss"
            >
              ✕
            </button>
          </div>

          {/* MESSAGE CONTENT SNIPPET */}
          <div
            style={{
              fontSize: 12.5,
              color: '#334155',
              background: '#F8FAFC',
              padding: '8px 12px',
              borderRadius: 10,
              lineHeight: 1.4,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              border: '1px solid #E2E8F0',
            }}
          >
            {n.hasImage && <span style={{ fontSize: 14 }}>📷</span>}
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontWeight: 600,
              }}
            >
              {n.text}
            </span>
          </div>

          {/* ACTION BUTTON */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              type="button"
              className="btn btn-xs"
              style={{
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: 11,
                padding: '5px 12px',
                borderRadius: 99,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)',
              }}
            >
              Open & Reply →
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
