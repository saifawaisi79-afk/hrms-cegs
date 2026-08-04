'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Modal, IC } from '@/components/hrms/HrmsLegacy';

const API_BASE = '/api';

/**
 * Team messenger backed by MongoDB (/api/messages) so both sides see the same thread.
 */
export function GlobalMessengerModal({ open, onClose, currentUser, targetUser, setTargetUser, db, save }) {
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [colleagues, setColleagues] = useState([]);
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState('');
  const messagesEndRef = useRef(null);

  const myId = String(currentUser?.id || '');

  const mapApiUser = (u) => ({
    id: String(u.id || u._id),
    name: u.name,
    email: u.email,
    role: u.role,
    title: u.designation || u.title || u.role,
    designation: u.designation || u.title || '',
    avatar:
      u.avatar_url ||
      u.avatar ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.name || u.email || 'user')}`,
  });

  const resolvePartner = (list, target) => {
    if (!target) return null;
    const tid = String(target.id || target._id || '');
    const temail = String(target.email || '').toLowerCase();
    return (
      list.find((u) => String(u.id) === tid) ||
      list.find((u) => String(u.email || '').toLowerCase() === temail) ||
      null
    );
  };

  const syncMessagesToStore = (rows) => {
    if (typeof save === 'function') {
      try {
        save('messages', rows);
      } catch {}
    }
  };

  const fetchColleagues = async () => {
    try {
      const res = await fetch(`${API_BASE}/users`);
      if (!res.ok) throw new Error('users');
      const data = await res.json();
      if (!Array.isArray(data)) return;
      setColleagues(data.map(mapApiUser).filter((u) => u.id && u.id !== myId));
    } catch {
      const local = (db?.users || [])
        .filter((u) => String(u.id) !== myId)
        .map((u) => ({
          ...u,
          id: String(u.id),
          avatar:
            u.avatar ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.name || 'user')}`,
        }));
      setColleagues(local);
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await fetch(`${API_BASE}/messages`);
      if (!res.ok) {
        if (res.status === 401) setLoadError('Sign in again to use live chat.');
        return;
      }
      const data = await res.json();
      if (!Array.isArray(data)) return;
      setMessages(data);
      syncMessagesToStore(data);
      setLoadError('');
    } catch {
      setLoadError('Unable to sync messages. Check your connection.');
    }
  };

  useEffect(() => {
    if (!open || !myId) return undefined;
    fetchColleagues();
    fetchMessages();
    const poll = setInterval(fetchMessages, 3000);
    return () => clearInterval(poll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, myId]);

  const otherUsers = colleagues.filter(
    (u) =>
      (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const resolvedTarget = resolvePartner(colleagues, targetUser);
  const activeChatPartner = resolvedTarget || otherUsers[0] || null;

  useEffect(() => {
    if (!open || !activeChatPartner?.id || !myId) return;
    if (targetUser && String(targetUser.id) !== String(activeChatPartner.id)) {
      setTargetUser?.(activeChatPartner);
    }
    (async () => {
      try {
        await fetch(`${API_BASE}/messages/read`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fromId: activeChatPartner.id }),
        });
        setMessages((prev) =>
          prev.map((m) =>
            String(m.fromId) === String(activeChatPartner.id) && String(m.toId) === myId
              ? { ...m, read: 1 }
              : m
          )
        );
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeChatPartner?.id, myId]);

  const conversation = messages
    .filter(
      (m) =>
        (String(m.fromId) === myId && String(m.toId) === String(activeChatPartner?.id)) ||
        (String(m.fromId) === String(activeChatPartner?.id) && String(m.toId) === myId)
    )
    .sort((a, b) => new Date(a.time) - new Date(b.time));

  useEffect(() => {
    if (!open) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation.length, open]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() || !activeChatPartner || sending) return;
    const body = text.trim();
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toId: activeChatPartner.id, text: body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || 'Failed to send message');
        return;
      }
      setMessages((prev) => {
        const next = [...prev.filter((m) => m.id !== data.id), data];
        syncMessagesToStore(next);
        return next;
      });
      setText('');
    } catch {
      alert('Unable to send message. Check your connection.');
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title=" CEGS Team Messenger & Live Chat"
      subtitle="Instant direct messaging across all team members"
      maxWidth={940}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20, height: 480 }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid var(--border)',
            paddingRight: 16,
          }}
        >
          <input
            className="form-input"
            placeholder=" Search colleague..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ marginBottom: 12, padding: '8px 12px', fontSize: 12.5 }}
          />

          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              scrollbarWidth: 'thin',
            }}
          >
            {otherUsers.length === 0 ? (
              <div style={{ padding: 16, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                No colleagues found. Onboard users to chat.
              </div>
            ) : (
              otherUsers.map((u) => {
                const isSelected = String(activeChatPartner?.id) === String(u.id);
                const userMsgs = messages.filter(
                  (m) => String(m.fromId) === String(u.id) && String(m.toId) === myId && !m.read
                );

                return (
                  <div
                    key={u.id}
                    onClick={() => setTargetUser(u)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 12px',
                      borderRadius: 12,
                      cursor: 'pointer',
                      background: isSelected ? 'var(--accent)' : 'var(--bg-surface, #F8FAFC)',
                      color: isSelected ? '#FFFFFF' : 'var(--text-main, #1E293B)',
                      transition: 'all 0.2s',
                    }}
                  >
                    <img
                      src={
                        u.avatar ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`
                      }
                      alt=""
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: '50%',
                        border: isSelected ? '2px solid #FFF' : '2px solid #E2E8F0',
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: 13,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {u.name}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          opacity: 0.8,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {u.title || u.designation || u.role}
                      </div>
                    </div>
                    {userMsgs.length > 0 && (
                      <span
                        style={{
                          background: '#EF4444',
                          color: '#FFF',
                          borderRadius: 99,
                          padding: '2px 6px',
                          fontSize: 10,
                          fontWeight: 900,
                        }}
                      >
                        {userMsgs.length}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {activeChatPartner ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                paddingBottom: 12,
                borderBottom: '1px solid var(--border)',
                marginBottom: 14,
              }}
            >
              <img
                src={activeChatPartner.avatar}
                alt=""
                style={{ width: 42, height: 42, borderRadius: '50%', border: '2px solid var(--accent)' }}
              />
              <div>
                <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-main)' }}>
                  {activeChatPartner.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {activeChatPartner.title || activeChatPartner.designation} · {activeChatPartner.email}
                </div>
              </div>
            </div>

            {loadError && (
              <div style={{ fontSize: 12, color: '#B45309', marginBottom: 8, fontWeight: 600 }}>
                {loadError}
              </div>
            )}

            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                paddingRight: 8,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                scrollbarWidth: 'thin',
              }}
            >
              {conversation.length === 0 ? (
                <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-muted)', fontSize: 13 }}>
                  No chat messages yet. Say hello to <strong>{activeChatPartner.name}</strong>!
                </div>
              ) : (
                conversation.map((m) => {
                  const isMe = String(m.fromId) === myId;
                  return (
                    <div
                      key={m.id}
                      style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}
                    >
                      <div
                        style={{
                          maxWidth: '75%',
                          padding: '12px 16px',
                          borderRadius: isMe ? '18px 18px 2px 18px' : '18px 18px 18px 2px',
                          background: isMe ? 'var(--accent)' : 'var(--bg-surface, #F1F5F9)',
                          color: isMe ? '#FFFFFF' : 'var(--text-main, #0F172A)',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                          fontSize: 13.5,
                          lineHeight: 1.4,
                        }}
                      >
                        <div>{m.text}</div>
                        <div
                          style={{
                            fontSize: 10,
                            opacity: 0.7,
                            marginTop: 4,
                            textAlign: 'right',
                            fontFamily: 'JetBrains Mono, monospace',
                          }}
                        >
                          {new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <form
              onSubmit={handleSendMessage}
              style={{
                display: 'flex',
                gap: 10,
                marginTop: 14,
                paddingTop: 12,
                borderTop: '1px solid var(--border)',
              }}
            >
              <input
                className="form-input"
                placeholder={`Type a message to ${activeChatPartner.name.split(' ')[0]}...`}
                value={text}
                onChange={(e) => setText(e.target.value)}
                style={{ flex: 1, padding: '12px 16px' }}
                autoFocus
                disabled={sending}
              />
              <button
                type="submit"
                className="btn btn-dark"
                disabled={sending || !text.trim()}
                style={{
                  background: 'var(--accent)',
                  padding: '0 20px',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  opacity: sending ? 0.7 : 1,
                }}
              >
                <span>{sending ? 'Sending…' : 'Send'}</span> <IC n="send" s={15} />
              </button>
            </form>
          </div>
        ) : (
          <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-muted)' }}>
            Select an employee to start a conversation.
          </div>
        )}
      </div>
    </Modal>
  );
}
