'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, IC } from '@/components/hrms/HrmsLegacy';
import { apiFetch, API_BASE } from '@/lib/auth-client';
import { canCreateMessengerGroup, isGroupAdmin } from '@/lib/messenger-auth';

// WhatsApp-style distinct colors for group participant names
const NAME_COLORS = [
  '#059669', // Emerald
  '#2563EB', // Blue
  '#7C3AED', // Violet
  '#D97706', // Amber
  '#DB2777', // Pink
  '#0891B2', // Cyan
  '#E11D48', // Rose
  '#4F46E5', // Indigo
];

function getUserColor(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return NAME_COLORS[Math.abs(hash) % NAME_COLORS.length];
}

const COLOR_PRESETS = [
  { name: 'WhatsApp Emerald', color: '#10B981' },
  { name: 'Royal Indigo', color: '#6366F1' },
  { name: 'Purple Glow', color: '#8B5CF6' },
  { name: 'Sunset Amber', color: '#F59E0B' },
  { name: 'Rose Quartz', color: '#F43F5E' },
  { name: 'Ocean Cyan', color: '#06B6D4' },
];

/**
 * Modern Live Team Messenger with WhatsApp-style Groups & Direct Messaging.
 * Authority: Only HR (Admin) and Finance / Invoice portal members can create groups.
 * Group Admins can add or remove employees whenever they want.
 */
export function GlobalMessengerModal({
  open,
  onClose,
  currentUser,
  targetUser,
  setTargetUser,
  targetGroup,
  setTargetGroup,
  initialGroupId,
  db,
  save,
}) {
  const [activeTab, setActiveTab] = useState('direct'); // 'direct' | 'groups'
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [colleagues, setColleagues] = useState([]);
  const [messages, setMessages] = useState([]);
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState('');

  // Modals
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
  const [groupSearch, setGroupSearch] = useState('');
  const [memberPickerSearch, setMemberPickerSearch] = useState('');

  // Create Group Form State
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#10B981');
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Add Member to existing group state
  const [membersToAdd, setMembersToAdd] = useState([]);
  const [addingMembers, setAddingMembers] = useState(false);

  const messagesEndRef = useRef(null);
  const myId = String(currentUser?.id || currentUser?._id || '');

  // Authority check for group creation (Only HR Admin or Finance / Invoice Portal)
  const hasGroupCreationAuthority = useMemo(() => {
    return canCreateMessengerGroup(currentUser, db?.users);
  }, [currentUser, db?.users]);

  // Check if current user is admin of active group
  const isCurrentGroupAdmin = useMemo(() => {
    if (!activeGroup || !currentUser) return false;
    return isGroupAdmin(activeGroup, currentUser, db?.users);
  }, [activeGroup, currentUser, db?.users]);

  const mapApiUser = (u) => ({
    id: String(u.id || u._id),
    _id: String(u.id || u._id),
    name: u.name,
    email: u.email,
    role: u.role,
    title: u.designation || u.title || u.role,
    designation: u.designation || u.title || '',
    department: u.department_name || u.department || '',
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

  const syncGroupsToStore = (rows) => {
    if (typeof save === 'function') {
      try {
        save('chatGroups', rows);
      } catch {}
    }
  };

  // 1. Fetch Colleagues
  const fetchColleagues = async () => {
    try {
      const res = await apiFetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setColleagues(data.map(mapApiUser).filter((u) => u.id && u.id !== myId));
          return;
        }
      }
      throw new Error('Fallback to local');
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

  // 2. Fetch Messages (Direct & Group)
  const fetchMessages = async () => {
    try {
      let url = '/api/messages';
      if (activeTab === 'groups' && activeGroup?.id) {
        url = `/api/messages?groupId=${encodeURIComponent(activeGroup.id)}`;
      }
      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setMessages((prev) => {
            const map = new Map();
            prev.forEach((m) => map.set(m.id || `${m.fromId}-${m.time}`, m));
            data.forEach((m) => map.set(m.id || `${m.fromId}-${m.time}`, m));
            const combined = Array.from(map.values());
            syncMessagesToStore(combined);
            return combined;
          });
          setLoadError('');
          return;
        }
      }
      // If error or unauthenticated, use db.messages
      if (db?.messages && Array.isArray(db.messages)) {
        setMessages(db.messages);
      }
    } catch {
      if (db?.messages && Array.isArray(db.messages)) {
        setMessages(db.messages);
      }
    }
  };

  // 3. Fetch Chat Groups
  const fetchGroups = async () => {
    try {
      const res = await apiFetch('/api/chat-groups');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setGroups(data);
          syncGroupsToStore(data);
          return;
        }
      }
      // Local fallback
      const localGroups = db?.chatGroups || [];
      setGroups(localGroups);
    } catch {
      const localGroups = db?.chatGroups || [];
      setGroups(localGroups);
    }
  };

  // Periodic poll
  useEffect(() => {
    if (!open || !myId) return undefined;
    fetchColleagues();
    fetchGroups();
    fetchMessages();
    const poll = setInterval(() => {
      fetchMessages();
      fetchGroups();
    }, 3000);
    return () => clearInterval(poll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, myId, activeTab, activeGroup?.id]);

  // When targetUser prop changes, switch to direct tab
  useEffect(() => {
    if (targetUser) {
      setActiveTab('direct');
    }
  }, [targetUser]);

  // When targetGroup prop changes, switch to groups tab
  useEffect(() => {
    if (targetGroup) {
      setActiveGroup(targetGroup);
      setActiveTab('groups');
    }
  }, [targetGroup]);

  // When initialGroupId prop changes, switch to groups tab
  useEffect(() => {
    if (initialGroupId && groups.length > 0) {
      const found = groups.find((g) => String(g.id) === String(initialGroupId));
      if (found) {
        setActiveGroup(found);
        setActiveTab('groups');
      }
    }
  }, [initialGroupId, groups]);

  // Direct chat partner resolution
  const otherUsers = colleagues.filter(
    (u) =>
      (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const resolvedTarget = resolvePartner(colleagues, targetUser);
  const activeChatPartner = resolvedTarget || otherUsers[0] || null;

  // Filter groups
  const filteredGroups = groups.filter(
    (g) =>
      (g.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (g.description || '').toLowerCase().includes(search.toLowerCase())
  );

  // Set default active group if none selected
  useEffect(() => {
    if (activeTab === 'groups' && !activeGroup && filteredGroups.length > 0) {
      setActiveGroup(filteredGroups[0]);
    }
  }, [activeTab, activeGroup, filteredGroups]);

  // Mark direct messages as read
  useEffect(() => {
    if (!open || activeTab !== 'direct' || !activeChatPartner?.id || !myId) return;
    if (targetUser && String(targetUser.id) !== String(activeChatPartner.id)) {
      setTargetUser?.(activeChatPartner);
    }
    (async () => {
      try {
        await apiFetch('/api/messages/read', {
          method: 'POST',
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
  }, [open, activeTab, activeChatPartner?.id, myId]);

  // Active conversation filtering
  const conversation = useMemo(() => {
    if (activeTab === 'groups' && activeGroup) {
      return messages
        .filter((m) => String(m.groupId || m.group_id) === String(activeGroup.id))
        .sort((a, b) => new Date(a.time) - new Date(b.time));
    }
    if (activeTab === 'direct' && activeChatPartner) {
      return messages
        .filter(
          (m) =>
            !m.groupId &&
            !m.group_id &&
            ((String(m.fromId) === myId && String(m.toId) === String(activeChatPartner.id)) ||
              (String(m.fromId) === String(activeChatPartner.id) && String(m.toId) === myId))
        )
        .sort((a, b) => new Date(a.time) - new Date(b.time));
    }
    return [];
  }, [activeTab, activeGroup, activeChatPartner, messages, myId]);

  // Auto scroll
  useEffect(() => {
    if (!open) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation.length, open]);

  // Send message handler (Direct or Group)
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    const bodyText = text.trim();
    setSending(true);

    try {
      if (activeTab === 'groups' && activeGroup) {
        // Send to Group
        const res = await apiFetch('/api/messages', {
          method: 'POST',
          body: JSON.stringify({ groupId: activeGroup.id, text: bodyText }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          // Local fallback
          const localMsg = {
            id: `local-g-${Date.now()}`,
            groupId: activeGroup.id,
            fromId: myId,
            fromName: currentUser?.name || 'Me',
            fromRole: currentUser?.role || 'Staff',
            fromAvatar: currentUser?.avatar || '',
            text: bodyText,
            time: new Date().toISOString(),
          };
          setMessages((prev) => {
            const next = [...prev, localMsg];
            syncMessagesToStore(next);
            return next;
          });
        } else {
          setMessages((prev) => {
            const next = [...prev.filter((m) => m.id !== data.id), data];
            syncMessagesToStore(next);
            return next;
          });
        }
      } else if (activeTab === 'direct' && activeChatPartner) {
        // Send Direct Message
        const res = await apiFetch('/api/messages', {
          method: 'POST',
          body: JSON.stringify({ toId: activeChatPartner.id, text: bodyText }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const localMsg = {
            id: `local-d-${Date.now()}`,
            fromId: myId,
            toId: activeChatPartner.id,
            text: bodyText,
            time: new Date().toISOString(),
          };
          setMessages((prev) => {
            const next = [...prev, localMsg];
            syncMessagesToStore(next);
            return next;
          });
        } else {
          setMessages((prev) => {
            const next = [...prev.filter((m) => m.id !== data.id), data];
            syncMessagesToStore(next);
            return next;
          });
        }
      }
      setText('');
    } catch {
      alert('Unable to send message. Please check your network.');
    } finally {
      setSending(false);
    }
  };

  // Create Group Handler (Authority: HR Admin or Finance / Invoice)
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      alert('Please enter a group name');
      return;
    }
    if (!hasGroupCreationAuthority) {
      alert('Authority Required: Only HR (Admin) and Finance / Invoice portal members can create groups.');
      return;
    }

    setCreatingGroup(true);
    try {
      const payload = {
        name: newGroupName.trim(),
        description: newGroupDesc.trim(),
        color: newGroupColor,
        memberIds: selectedMemberIds,
      };

      const res = await apiFetch('/api/chat-groups', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // If API fails or offline, fallback to local store
        const newLocalGroup = {
          id: `group-${Date.now()}`,
          name: newGroupName.trim(),
          description: newGroupDesc.trim(),
          color: newGroupColor,
          created_by: myId,
          creatorName: currentUser?.name || 'Admin',
          admins: [myId],
          members: [myId, ...selectedMemberIds].map((id) => {
            const u = colleagues.find((c) => String(c.id) === String(id));
            return u || { id, name: id === myId ? currentUser?.name : 'Member' };
          }),
          createdAt: new Date().toISOString(),
          last_message: {
            text: `Group "${newGroupName.trim()}" created`,
            time: new Date().toISOString(),
          },
        };

        const updatedGroups = [newLocalGroup, ...groups];
        setGroups(updatedGroups);
        syncGroupsToStore(updatedGroups);
        setActiveGroup(newLocalGroup);
      } else {
        const updatedGroups = [data, ...groups.filter((g) => g.id !== data.id)];
        setGroups(updatedGroups);
        syncGroupsToStore(updatedGroups);
        setActiveGroup(data);
      }

      // Reset form and switch tab to groups
      setNewGroupName('');
      setNewGroupDesc('');
      setSelectedMemberIds([]);
      setShowCreateGroupModal(false);
      setActiveTab('groups');
    } catch {
      alert('Failed to create group. Please check your connection.');
    } finally {
      setCreatingGroup(false);
    }
  };

  // Add members to existing group
  const handleAddMembersToGroup = async () => {
    if (!activeGroup || membersToAdd.length === 0) return;
    if (!isCurrentGroupAdmin) {
      alert('Authority Denied: Only group admins can add employees.');
      return;
    }

    setAddingMembers(true);
    try {
      const res = await apiFetch(`/api/chat-groups/${activeGroup.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ addMemberIds: membersToAdd }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data?.id) {
        setGroups((prev) => prev.map((g) => (g.id === data.id ? data : g)));
        setActiveGroup(data);
        syncGroupsToStore(groups.map((g) => (g.id === data.id ? data : g)));
      } else {
        // Local fallback
        const currentMemberIds = new Set(
          (activeGroup.members || []).map((m) => String(typeof m === 'object' ? m.id || m._id : m))
        );
        const newMembersList = [...(activeGroup.members || [])];
        membersToAdd.forEach((mid) => {
          if (!currentMemberIds.has(String(mid))) {
            const u = colleagues.find((c) => String(c.id) === String(mid));
            if (u) newMembersList.push(u);
          }
        });
        const updatedGroup = { ...activeGroup, members: newMembersList };
        setGroups((prev) => prev.map((g) => (g.id === updatedGroup.id ? updatedGroup : g)));
        setActiveGroup(updatedGroup);
        syncGroupsToStore(groups.map((g) => (g.id === updatedGroup.id ? updatedGroup : g)));
      }

      setMembersToAdd([]);
      alert('Employees added to the group successfully!');
    } catch {
      alert('Failed to add members.');
    } finally {
      setAddingMembers(false);
    }
  };

  // Remove member from existing group
  const handleRemoveMember = async (memberId, memberName) => {
    if (!activeGroup || !isCurrentGroupAdmin) {
      alert('Authority Denied: Only group admins can remove employees.');
      return;
    }
    if (!window.confirm(`Are you sure you want to remove ${memberName || 'this employee'} from the group?`)) {
      return;
    }

    try {
      const res = await apiFetch(`/api/chat-groups/${activeGroup.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ removeMemberId: memberId }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data?.id) {
        setGroups((prev) => prev.map((g) => (g.id === data.id ? data : g)));
        setActiveGroup(data);
        syncGroupsToStore(groups.map((g) => (g.id === data.id ? data : g)));
      } else {
        // Local fallback
        const updatedMembers = (activeGroup.members || []).filter(
          (m) => String(typeof m === 'object' ? m.id || m._id : m) !== String(memberId)
        );
        const updatedGroup = { ...activeGroup, members: updatedMembers };
        setGroups((prev) => prev.map((g) => (g.id === updatedGroup.id ? updatedGroup : g)));
        setActiveGroup(updatedGroup);
        syncGroupsToStore(groups.map((g) => (g.id === updatedGroup.id ? updatedGroup : g)));
      }
    } catch {
      alert('Failed to remove member.');
    }
  };

  // Leave group
  const handleLeaveGroup = async () => {
    if (!activeGroup) return;
    if (!window.confirm(`Are you sure you want to leave "${activeGroup.name}"?`)) return;

    try {
      await apiFetch(`/api/chat-groups/${activeGroup.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'leave' }),
      });
      const nextGroups = groups.filter((g) => g.id !== activeGroup.id);
      setGroups(nextGroups);
      setActiveGroup(nextGroups[0] || null);
      setShowGroupInfoModal(false);
      syncGroupsToStore(nextGroups);
    } catch {
      alert('Failed to leave group.');
    }
  };

  if (!open) return null;

  // Colleagues not in active group (for Add Member picker)
  const existingGroupMemberIdSet = new Set(
    (activeGroup?.members || []).map((m) => String(typeof m === 'object' ? m.id || m._id : m))
  );
  const eligibleColleaguesToAdd = colleagues.filter(
    (c) =>
      !existingGroupMemberIdSet.has(String(c.id)) &&
      ((c.name || '').toLowerCase().includes(memberPickerSearch.toLowerCase()) ||
        (c.title || '').toLowerCase().includes(memberPickerSearch.toLowerCase()))
  );

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="CEGS Live Team Messenger & WhatsApp Groups"
        subtitle="Real-time 1-on-1 direct messaging and WhatsApp-style department & project groups"
        maxWidth={980}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '290px 1fr', gap: 18, height: 530 }}>
          {/* LEFT SIDEBAR */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              borderRight: '1px solid var(--border)',
              paddingRight: 16,
              height: '100%',
              overflow: 'hidden',
            }}
          >
            {/* TABS: Direct Chats vs Groups */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 6,
                background: 'var(--bg-surface, #F1F5F9)',
                padding: 4,
                borderRadius: 14,
                marginBottom: 12,
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab('direct')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '8px 10px',
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTab === 'direct' ? '#FFFFFF' : 'transparent',
                  color: activeTab === 'direct' ? 'var(--accent, #7C3AED)' : 'var(--text-muted, #64748B)',
                  boxShadow: activeTab === 'direct' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                <IC n="message" s={14} />
                <span>Direct ({colleagues.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('groups')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '8px 10px',
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTab === 'groups' ? '#FFFFFF' : 'transparent',
                  color: activeTab === 'groups' ? '#059669' : 'var(--text-muted, #64748B)',
                  boxShadow: activeTab === 'groups' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                <IC n="users" s={14} />
                <span>Groups ({groups.length})</span>
              </button>
            </div>

            {/* CREATE GROUP BUTTON / AUTHORITY BADGE */}
            {activeTab === 'groups' && (
              <div style={{ marginBottom: 10 }}>
                {hasGroupCreationAuthority ? (
                  <button
                    type="button"
                    onClick={() => setShowCreateGroupModal(true)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: '9px 14px',
                      borderRadius: 12,
                      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      color: '#FFFFFF',
                      fontSize: 12.5,
                      fontWeight: 800,
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                      transition: 'all 0.2s',
                    }}
                  >
                    <IC n="plus" s={15} />
                    <span>+ Create New Group</span>
                    <span
                      style={{
                        background: 'rgba(255,255,255,0.22)',
                        padding: '1px 6px',
                        borderRadius: 99,
                        fontSize: 10,
                        fontWeight: 900,
                      }}
                    >
                      Admin
                    </span>
                  </button>
                ) : (
                  <div
                    style={{
                      background: '#FEF3C7',
                      border: '1px dashed #F59E0B',
                      borderRadius: 10,
                      padding: '8px 10px',
                      fontSize: 11,
                      color: '#92400E',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <IC n="lock" s={13} />
                    <span>Group creation: HR & Finance Admins only</span>
                  </div>
                )}
              </div>
            )}

            {/* SEARCH INPUT */}
            <input
              className="form-input"
              placeholder={activeTab === 'direct' ? ' Search colleague...' : ' Search team group...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ marginBottom: 12, padding: '8px 12px', fontSize: 12.5, borderRadius: 10 }}
            />

            {/* LIST AREA */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                scrollbarWidth: 'thin',
                paddingRight: 2,
              }}
            >
              {activeTab === 'direct' ? (
                /* DIRECT CHATS LIST */
                otherUsers.length === 0 ? (
                  <div style={{ padding: 16, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                    No colleagues found.
                  </div>
                ) : (
                  otherUsers.map((u) => {
                    const isSelected = String(activeChatPartner?.id) === String(u.id);
                    const userMsgs = messages.filter(
                      (m) =>
                        !m.groupId &&
                        !m.group_id &&
                        String(m.fromId) === String(u.id) &&
                        String(m.toId) === myId &&
                        !m.read
                    );

                    return (
                      <div
                        key={u.id}
                        onClick={() => {
                          setTargetUser(u);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '10px 12px',
                          borderRadius: 12,
                          cursor: 'pointer',
                          background: isSelected ? 'var(--accent, #7C3AED)' : 'var(--bg-surface, #F8FAFC)',
                          color: isSelected ? '#FFFFFF' : 'var(--text-main, #1E293B)',
                          transition: 'all 0.18s ease',
                          boxShadow: isSelected ? '0 4px 12px rgba(124, 92, 252, 0.25)' : 'none',
                        }}
                      >
                        <img
                          src={u.avatar}
                          alt=""
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: '50%',
                            border: isSelected ? '2px solid #FFF' : '2px solid #E2E8F0',
                            flexShrink: 0,
                            objectFit: 'cover',
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
                )
              ) : (
                /* GROUPS LIST */
                filteredGroups.length === 0 ? (
                  <div style={{ padding: 20, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                    {hasGroupCreationAuthority ? (
                      <>
                        <p style={{ marginBottom: 10 }}>No groups created yet.</p>
                        <button
                          type="button"
                          className="btn btn-sm btn-dark"
                          onClick={() => setShowCreateGroupModal(true)}
                          style={{ background: '#10B981', fontWeight: 800 }}
                        >
                          + Create First Group
                        </button>
                      </>
                    ) : (
                      'No groups found. Once HR or Finance adds you to a group, it will appear here.'
                    )}
                  </div>
                ) : (
                  filteredGroups.map((g) => {
                    const isSelected = activeGroup?.id === g.id;
                    const memberCount = (g.members || []).length;
                    const isGrpAdmin = isGroupAdmin(g, currentUser, db?.users);
                    const grpColor = g.color || '#10B981';

                    return (
                      <div
                        key={g.id}
                        onClick={() => setActiveGroup(g)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '10px 12px',
                          borderRadius: 12,
                          cursor: 'pointer',
                          background: isSelected ? 'var(--accent, #7C3AED)' : 'var(--bg-surface, #F8FAFC)',
                          color: isSelected ? '#FFFFFF' : 'var(--text-main, #1E293B)',
                          transition: 'all 0.18s ease',
                          boxShadow: isSelected ? '0 4px 12px rgba(124, 92, 252, 0.25)' : 'none',
                        }}
                      >
                        {/* Group Avatar / Badge */}
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 12,
                            background: isSelected ? '#FFFFFF' : grpColor,
                            color: isSelected ? grpColor : '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 900,
                            fontSize: 16,
                            flexShrink: 0,
                            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                          }}
                        >
                          👥
                        </div>

                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 4,
                            }}
                          >
                            <span
                              style={{
                                fontWeight: 800,
                                fontSize: 13,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {g.name}
                            </span>
                            {isGrpAdmin && (
                              <span
                                style={{
                                  fontSize: 9.5,
                                  fontWeight: 900,
                                  background: isSelected ? 'rgba(255,255,255,0.25)' : '#ECFDF5',
                                  color: isSelected ? '#FFF' : '#059669',
                                  padding: '1px 5px',
                                  borderRadius: 4,
                                }}
                              >
                                Admin
                              </span>
                            )}
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
                            {memberCount} member{memberCount === 1 ? '' : 's'}
                            {g.last_message?.text ? ` · ${g.last_message.text}` : ''}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )
              )}
            </div>
          </div>

          {/* RIGHT CHAT AREA */}
          {activeTab === 'groups' ? (
            /* GROUP CHAT VIEW */
            activeGroup ? (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* GROUP HEADER */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: 12,
                    borderBottom: '1px solid var(--border)',
                    marginBottom: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        background: activeGroup.color || '#10B981',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 20,
                        fontWeight: 900,
                        boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                      }}
                    >
                      👥
                    </div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{activeGroup.name}</span>
                        {isCurrentGroupAdmin && (
                          <span
                            style={{
                              background: '#ECFDF5',
                              color: '#059669',
                              border: '1px solid #A7F3D0',
                              padding: '2px 7px',
                              borderRadius: 99,
                              fontSize: 10,
                              fontWeight: 900,
                            }}
                          >
                            You are Group Admin
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                        {(activeGroup.members || []).length} members · Created by{' '}
                        <strong>{activeGroup.creatorName || 'Admin'}</strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {/* Add Member button if group admin */}
                    {isCurrentGroupAdmin && (
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => setShowGroupInfoModal(true)}
                        style={{
                          background: '#10B981',
                          color: '#FFF',
                          fontWeight: 800,
                          fontSize: 11.5,
                          borderRadius: 8,
                          padding: '6px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <IC n="user-plus" s={13} />
                        <span>Add Employees</span>
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={() => setShowGroupInfoModal(true)}
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        borderRadius: 8,
                        padding: '6px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        border: '1px solid var(--border)',
                      }}
                    >
                      <IC n="info" s={14} />
                      <span>Group Info & Members</span>
                    </button>
                  </div>
                </div>

                {/* GROUP MESSAGES FEED */}
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
                      <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
                      No messages in <strong>{activeGroup.name}</strong> yet.
                      <div style={{ fontSize: 12, marginTop: 4 }}>
                        Say hello to your team and kick off the discussion!
                      </div>
                    </div>
                  ) : (
                    conversation.map((m) => {
                      const isMe = String(m.fromId) === myId;
                      const senderName = m.fromName || (isMe ? 'You' : 'Member');
                      const nameColor = getUserColor(senderName);
                      const isSystem = m.isSystem || senderName === 'System';

                      if (isSystem) {
                        return (
                          <div key={m.id || m.time} style={{ display: 'flex', justifyContent: 'center' }}>
                            <div
                              style={{
                                background: '#F1F5F9',
                                color: '#64748B',
                                padding: '4px 14px',
                                borderRadius: 99,
                                fontSize: 11,
                                fontWeight: 600,
                              }}
                            >
                              {m.text}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={m.id || `${m.fromId}-${m.time}`}
                          style={{
                            display: 'flex',
                            justifyContent: isMe ? 'flex-end' : 'flex-start',
                            alignItems: 'flex-start',
                            gap: 8,
                          }}
                        >
                          {!isMe && (
                            <img
                              src={
                                m.fromAvatar ||
                                `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(senderName)}`
                              }
                              alt=""
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius: '50%',
                                marginTop: 2,
                                border: '1.5px solid #E2E8F0',
                                flexShrink: 0,
                              }}
                            />
                          )}

                          <div
                            style={{
                              maxWidth: '75%',
                              padding: '10px 14px',
                              borderRadius: isMe ? '18px 18px 2px 18px' : '18px 18px 18px 2px',
                              background: isMe ? 'var(--accent, #7C3AED)' : 'var(--bg-surface, #F1F5F9)',
                              color: isMe ? '#FFFFFF' : 'var(--text-main, #0F172A)',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                              fontSize: 13.5,
                              lineHeight: 1.4,
                            }}
                          >
                            {!isMe && (
                              <div
                                style={{
                                  fontSize: 11,
                                  fontWeight: 900,
                                  color: nameColor,
                                  marginBottom: 3,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                }}
                              >
                                <span>{senderName}</span>
                                {m.fromRole && (
                                  <span
                                    style={{
                                      fontSize: 9,
                                      fontWeight: 800,
                                      background: 'rgba(0,0,0,0.06)',
                                      padding: '1px 5px',
                                      borderRadius: 4,
                                      color: '#475569',
                                    }}
                                  >
                                    {m.fromRole}
                                  </span>
                                )}
                              </div>
                            )}

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

                {/* MESSAGE INPUT */}
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
                    placeholder={`Message #${activeGroup.name}...`}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    style={{ flex: 1, padding: '12px 16px', borderRadius: 12 }}
                    autoFocus
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    className="btn btn-dark"
                    disabled={sending || !text.trim()}
                    style={{
                      background: 'var(--accent, #7C3AED)',
                      padding: '0 22px',
                      fontWeight: 800,
                      borderRadius: 12,
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
                Select a group to start collaborating.
              </div>
            )
          ) : (
            /* DIRECT CHAT VIEW */
            activeChatPartner ? (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* DIRECT HEADER */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: 12,
                    borderBottom: '1px solid var(--border)',
                    marginBottom: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <img
                      src={activeChatPartner.avatar}
                      alt=""
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: '50%',
                        border: '2px solid var(--accent, #7C3AED)',
                        objectFit: 'cover',
                      }}
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

                  <span
                    style={{
                      background: '#ECFDF5',
                      color: '#059669',
                      border: '1px solid #A7F3D0',
                      padding: '3px 10px',
                      borderRadius: 99,
                      fontSize: 10.5,
                      fontWeight: 800,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
                    Active Now
                  </span>
                </div>

                {loadError && (
                  <div style={{ fontSize: 12, color: '#B45309', marginBottom: 8, fontWeight: 600 }}>
                    {loadError}
                  </div>
                )}

                {/* DIRECT CONVERSATION FEED */}
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
                      No direct messages yet. Say hello to <strong>{activeChatPartner.name}</strong>!
                    </div>
                  ) : (
                    conversation.map((m) => {
                      const isMe = String(m.fromId) === myId;
                      return (
                        <div
                          key={m.id || `${m.fromId}-${m.time}`}
                          style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}
                        >
                          <div
                            style={{
                              maxWidth: '75%',
                              padding: '12px 16px',
                              borderRadius: isMe ? '18px 18px 2px 18px' : '18px 18px 18px 2px',
                              background: isMe ? 'var(--accent, #7C3AED)' : 'var(--bg-surface, #F1F5F9)',
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

                {/* DIRECT SEND INPUT */}
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
                    style={{ flex: 1, padding: '12px 16px', borderRadius: 12 }}
                    autoFocus
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    className="btn btn-dark"
                    disabled={sending || !text.trim()}
                    style={{
                      background: 'var(--accent, #7C3AED)',
                      padding: '0 22px',
                      fontWeight: 800,
                      borderRadius: 12,
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
            )
          )}
        </div>
      </Modal>

      {/* MODAL 1: CREATE NEW GROUP (Authority: HR Admin or Finance / Invoice) */}
      {showCreateGroupModal && (
        <Modal
          open={showCreateGroupModal}
          onClose={() => setShowCreateGroupModal(false)}
          title="Create Team Group"
          subtitle="Authority Verified: HR Admin & Finance / Invoice Portal"
          maxWidth={620}
        >
          <form onSubmit={handleCreateGroup}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* AUTHORITY BANNER */}
              <div
                style={{
                  background: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  borderRadius: 12,
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: '#10B981',
                    color: '#FFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                  }}
                >
                  ✓
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: '#065F46' }}>
                    Admin Authority Confirmed
                  </div>
                  <div style={{ fontSize: 11.5, color: '#047857' }}>
                    As HR or Finance portal administrator, you have full rights to create this group, become the Group Admin, and add any employees.
                  </div>
                </div>
              </div>

              {/* GROUP NAME */}
              <div>
                <label className="form-label" style={{ fontWeight: 800, fontSize: 12.5 }}>
                  Group Name <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  className="form-input"
                  placeholder="e.g. Finance & Invoicing Sync, HR Onboarding, Q3 Project"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 14px' }}
                />
              </div>

              {/* GROUP DESCRIPTION */}
              <div>
                <label className="form-label" style={{ fontWeight: 800, fontSize: 12.5 }}>
                  Group Topic / Description
                </label>
                <input
                  className="form-input"
                  placeholder="e.g. Daily team discussions, invoice approvals, client updates"
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px' }}
                />
              </div>

              {/* COLOR PRESETS */}
              <div>
                <label className="form-label" style={{ fontWeight: 800, fontSize: 12.5 }}>
                  Group Theme Color
                </label>
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  {COLOR_PRESETS.map((p) => (
                    <button
                      key={p.color}
                      type="button"
                      onClick={() => setNewGroupColor(p.color)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: p.color,
                        border: newGroupColor === p.color ? '3px solid #1E293B' : '2px solid transparent',
                        cursor: 'pointer',
                        boxShadow: newGroupColor === p.color ? '0 0 0 2px #FFFFFF inset' : 'none',
                        transition: 'transform 0.15s',
                        transform: newGroupColor === p.color ? 'scale(1.15)' : 'scale(1)',
                      }}
                      title={p.name}
                    />
                  ))}
                </div>
              </div>

              {/* ADD INITIAL EMPLOYEES */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label className="form-label" style={{ fontWeight: 800, fontSize: 12.5, margin: 0 }}>
                    Add Employees ({selectedMemberIds.length} selected)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedMemberIds.length === colleagues.length) {
                        setSelectedMemberIds([]);
                      } else {
                        setSelectedMemberIds(colleagues.map((c) => c.id));
                      }
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent, #7C3AED)',
                      fontSize: 11,
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    {selectedMemberIds.length === colleagues.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <input
                  className="form-input"
                  placeholder=" Filter employees..."
                  value={groupSearch}
                  onChange={(e) => setGroupSearch(e.target.value)}
                  style={{ width: '100%', padding: '7px 12px', fontSize: 12, marginBottom: 8 }}
                />

                <div
                  style={{
                    maxHeight: 160,
                    overflowY: 'auto',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: 6,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  {colleagues
                    .filter(
                      (c) =>
                        (c.name || '').toLowerCase().includes(groupSearch.toLowerCase()) ||
                        (c.title || '').toLowerCase().includes(groupSearch.toLowerCase())
                    )
                    .map((c) => {
                      const isChecked = selectedMemberIds.includes(c.id);
                      return (
                        <div
                          key={c.id}
                          onClick={() => {
                            setSelectedMemberIds((prev) =>
                              isChecked ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                            );
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 10px',
                            borderRadius: 8,
                            background: isChecked ? '#F3E8FF' : '#F9FAFB',
                            cursor: 'pointer',
                            fontSize: 12,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <img
                              src={c.avatar}
                              alt=""
                              style={{ width: 26, height: 26, borderRadius: '50%' }}
                            />
                            <div>
                              <div style={{ fontWeight: 800, color: '#1E293B' }}>{c.name}</div>
                              <div style={{ fontSize: 10, color: '#64748B' }}>
                                {c.title || c.designation || c.role}
                              </div>
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            style={{ cursor: 'pointer', accentColor: 'var(--accent, #7C3AED)' }}
                          />
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* ACTIONS */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowCreateGroupModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-dark"
                  disabled={creatingGroup || !newGroupName.trim()}
                  style={{
                    background: '#10B981',
                    fontWeight: 800,
                    padding: '10px 22px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <IC n="check" s={15} />
                  <span>{creatingGroup ? 'Creating…' : 'Create Group & Add Members'}</span>
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 2: GROUP INFO & MANAGE MEMBERS */}
      {showGroupInfoModal && activeGroup && (
        <Modal
          open={showGroupInfoModal}
          onClose={() => setShowGroupInfoModal(false)}
          title={`Group Info: ${activeGroup.name}`}
          subtitle={`${(activeGroup.members || []).length} members in this group`}
          maxWidth={640}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* HERO CARD */}
            <div
              style={{
                background: `linear-gradient(135deg, ${activeGroup.color || '#10B981'}15 0%, #FFFFFF 100%)`,
                border: `1px solid ${activeGroup.color || '#10B981'}40`,
                borderRadius: 16,
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 18,
                  background: activeGroup.color || '#10B981',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 26,
                  fontWeight: 900,
                  boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
                }}
              >
                👥
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-main)' }}>
                  {activeGroup.name}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>
                  {activeGroup.description || 'No description provided.'}
                </div>
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 6 }}>
                  Created by <strong>{activeGroup.creatorName || 'Admin'}</strong> on{' '}
                  {activeGroup.createdAt ? new Date(activeGroup.createdAt).toLocaleDateString() : 'Recent'}
                </div>
              </div>
            </div>

            {/* ADD EMPLOYEES PANEL (Visible to Group Admins) */}
            {isCurrentGroupAdmin && (
              <div
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: 14,
                  padding: '14px 16px',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 900, color: '#1E293B', marginBottom: 6 }}>
                  + Add More Employees to Group
                </div>
                <div style={{ fontSize: 11.5, color: '#64748B', marginBottom: 10 }}>
                  As group admin, you have authority to add any colleagues to this group whenever you want.
                </div>

                <input
                  className="form-input"
                  placeholder=" Search colleagues to add..."
                  value={memberPickerSearch}
                  onChange={(e) => setMemberPickerSearch(e.target.value)}
                  style={{ width: '100%', padding: '7px 12px', fontSize: 12, marginBottom: 8 }}
                />

                {eligibleColleaguesToAdd.length === 0 ? (
                  <div style={{ fontSize: 11.5, color: '#94A3B8', padding: '6px 0' }}>
                    All eligible colleagues are already members of this group.
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        maxHeight: 120,
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        marginBottom: 10,
                      }}
                    >
                      {eligibleColleaguesToAdd.map((colleague) => {
                        const isPicked = membersToAdd.includes(colleague.id);
                        return (
                          <div
                            key={colleague.id}
                            onClick={() => {
                              setMembersToAdd((prev) =>
                                isPicked ? prev.filter((id) => id !== colleague.id) : [...prev, colleague.id]
                              );
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '6px 10px',
                              borderRadius: 8,
                              background: isPicked ? '#ECFDF5' : '#FFFFFF',
                              border: isPicked ? '1px solid #10B981' : '1px solid #E2E8F0',
                              cursor: 'pointer',
                              fontSize: 12,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <img
                                src={colleague.avatar}
                                alt=""
                                style={{ width: 24, height: 24, borderRadius: '50%' }}
                              />
                              <div>
                                <span style={{ fontWeight: 800 }}>{colleague.name}</span>
                                <span style={{ fontSize: 10.5, color: '#64748B', marginLeft: 6 }}>
                                  ({colleague.title || colleague.role})
                                </span>
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              checked={isPicked}
                              onChange={() => {}}
                              style={{ accentColor: '#10B981' }}
                            />
                          </div>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      className="btn btn-sm btn-dark"
                      disabled={addingMembers || membersToAdd.length === 0}
                      onClick={handleAddMembersToGroup}
                      style={{
                        background: '#10B981',
                        fontWeight: 800,
                        padding: '7px 16px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <IC n="user-plus" s={13} />
                      <span>{addingMembers ? 'Adding…' : `Add ${membersToAdd.length} Employees to Group`}</span>
                    </button>
                  </>
                )}
              </div>
            )}

            {/* MEMBERS LIST */}
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 900,
                  color: 'var(--text-main)',
                  marginBottom: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>Current Members ({(activeGroup.members || []).length})</span>
                {!isCurrentGroupAdmin && (
                  <button
                    type="button"
                    onClick={handleLeaveGroup}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#EF4444',
                      fontSize: 11,
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    Leave Group
                  </button>
                )}
              </div>

              <div
                style={{
                  maxHeight: 220,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                {(activeGroup.members || []).map((m) => {
                  const mId = String(typeof m === 'object' ? m.id || m._id : m);
                  const isUserCreator = String(activeGroup.created_by) === mId;
                  const isMemberAdmin =
                    isUserCreator ||
                    (activeGroup.admins || []).some(
                      (a) => String(typeof a === 'object' ? a.id || a._id : a) === mId
                    );
                  const isMe = mId === myId;

                  // Resolve name and avatar
                  let memberObj = typeof m === 'object' ? m : null;
                  if (!memberObj?.name) {
                    memberObj = colleagues.find((c) => String(c.id) === mId) || {
                      name: isMe ? currentUser?.name : 'Member',
                      avatar: '',
                      designation: '',
                    };
                  }

                  return (
                    <div
                      key={mId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderRadius: 10,
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <img
                          src={
                            memberObj.avatar ||
                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(memberObj.name)}`
                          }
                          alt=""
                          style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>{memberObj.name} {isMe ? '(You)' : ''}</span>
                            {isMemberAdmin && (
                              <span
                                style={{
                                  background: '#ECFDF5',
                                  color: '#059669',
                                  border: '1px solid #A7F3D0',
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                  fontSize: 9.5,
                                  fontWeight: 900,
                                }}
                              >
                                Group Admin
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: '#64748B' }}>
                            {memberObj.designation || memberObj.title || memberObj.role || 'Staff Member'}
                          </div>
                        </div>
                      </div>

                      {/* Remove button (Only for group admins, cannot remove creator or self) */}
                      {isCurrentGroupAdmin && !isUserCreator && !isMe && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(mId, memberObj.name)}
                          style={{
                            background: '#FEE2E2',
                            color: '#DC2626',
                            border: '1px solid #FCA5A5',
                            borderRadius: 6,
                            padding: '4px 8px',
                            fontSize: 10.5,
                            fontWeight: 800,
                            cursor: 'pointer',
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CLOSE BUTTON */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
              <button
                type="button"
                className="btn btn-dark"
                onClick={() => setShowGroupInfoModal(false)}
                style={{ fontWeight: 800, padding: '8px 20px' }}
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
