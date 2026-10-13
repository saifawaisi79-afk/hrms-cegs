'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, IC } from '@/components/hrms/HrmsLegacy';
import { apiFetch, API_BASE } from '@/lib/auth-client';
import { canCreateMessengerGroup, isGroupAdmin } from '@/lib/messenger-auth';
import { ModernWhatsAppEmojiPicker } from '@/components/chat/ModernWhatsAppEmojiPicker';

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

// Compress high-res photos to high quality lightweight JPEG data URL
function compressImage(file, maxWidth = 1200, maxHeight = 1200, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * WhatsApp-style message ticks:
 * - One grey tick: Sent
 * - Two grey ticks: Delivered
 * - Two blue ticks (#34B7F1): Seen / Read
 */
function WhatsAppTicks({ isMe, read, readBy = [], isGroup = false, myId }) {
  if (!isMe) return null;

  const isSeen = isGroup
    ? (readBy || []).some((id) => String(id) !== String(myId))
    : Boolean(read);

  if (isSeen) {
    // Double Blue Ticks (#34B7F1 WhatsApp Blue)
    return (
      <span
        title="Seen / Read"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          marginLeft: 4,
          verticalAlign: 'middle',
        }}
      >
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none" style={{ display: 'inline-block' }}>
          <path d="M11.05 0.7L4.9 6.85L2.85 4.8L1.45 6.2L4.9 9.65L12.45 2.1L11.05 0.7Z" fill="#34B7F1" />
          <path d="M14.55 2.1L7 9.65L6.05 8.7L7.45 7.3L13.15 0.7L14.55 2.1Z" fill="#34B7F1" />
        </svg>
      </span>
    );
  }

  // Double Grey Ticks (Delivered)
  return (
    <span
      title="Delivered"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        marginLeft: 4,
        verticalAlign: 'middle',
      }}
    >
      <svg width="16" height="11" viewBox="0 0 16 11" fill="none" style={{ display: 'inline-block' }}>
        <path d="M11.05 0.7L4.9 6.85L2.85 4.8L1.45 6.2L4.9 9.65L12.45 2.1L11.05 0.7Z" fill="#94A3B8" />
        <path d="M14.55 2.1L7 9.65L6.05 8.7L7.45 7.3L13.15 0.7L14.55 2.1Z" fill="#94A3B8" />
      </svg>
    </span>
  );
}

/**
 * Modern Live Team Messenger with WhatsApp-style Groups, Direct Messaging,
 * Image Uploads, Emoji Picker, and Blue Ticks.
 * Note: Messages are permanent — no delete option.
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

  // Image upload and emoji picker states
  const [selectedImage, setSelectedImage] = useState(null); // { dataUrl, name }
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [previewImage, setPreviewImage] = useState(null); // For fullscreen lightbox preview

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
  const fileInputRef = useRef(null);
  const textInputRef = useRef(null);
  const emojiPickerRef = useRef(null);

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
            !m.groupId &&
            !m.group_id &&
            String(m.fromId) === String(activeChatPartner.id) &&
            String(m.toId) === myId
              ? { ...m, read: 1 }
              : m
          )
        );
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeTab, activeChatPartner?.id, myId]);

  // Mark group messages as read by current user
  useEffect(() => {
    if (!open || activeTab !== 'groups' || !activeGroup?.id || !myId) return;
    (async () => {
      try {
        await apiFetch('/api/messages/read', {
          method: 'POST',
          body: JSON.stringify({ groupId: activeGroup.id }),
        });
        setMessages((prev) =>
          prev.map((m) => {
            if (
              String(m.groupId || m.group_id) === String(activeGroup.id) &&
              String(m.fromId) !== myId
            ) {
              const currentReadBy = (m.readBy || m.read_by || []).map(String);
              if (!currentReadBy.includes(myId)) {
                return { ...m, readBy: [...currentReadBy, myId] };
              }
            }
            return m;
          })
        );
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeTab, activeGroup?.id, myId]);

  // Close emoji picker on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target) &&
        !e.target.closest('#emoji-toggle-btn')
      ) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showEmojiPicker]);

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

  // Image selection handler
  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, JPEG, GIF, WEBP)');
      return;
    }

    try {
      const dataUrl = await compressImage(file);
      setSelectedImage({
        dataUrl,
        name: file.name,
      });
      setShowEmojiPicker(false);
      textInputRef.current?.focus();
    } catch {
      alert('Failed to process image. Please try another image.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Emoji click handler
  const handleEmojiSelect = (emoji) => {
    setText((prev) => prev + emoji);
    textInputRef.current?.focus();
  };

  // Send message handler (Direct or Group, Text + Image)
  const handleSendMessage = async (e) => {
    e?.preventDefault?.();
    if ((!text.trim() && !selectedImage) || sending) return;

    const bodyText = text.trim();
    const bodyImage = selectedImage?.dataUrl || '';
    setSending(true);

    try {
      if (activeTab === 'groups' && activeGroup) {
        // Send to Group
        const res = await apiFetch('/api/messages', {
          method: 'POST',
          body: JSON.stringify({
            groupId: activeGroup.id,
            text: bodyText,
            imageUrl: bodyImage,
          }),
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
            imageUrl: bodyImage,
            time: new Date().toISOString(),
            readBy: [myId],
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
          body: JSON.stringify({
            toId: activeChatPartner.id,
            text: bodyText,
            imageUrl: bodyImage,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const localMsg = {
            id: `local-d-${Date.now()}`,
            fromId: myId,
            toId: activeChatPartner.id,
            text: bodyText,
            imageUrl: bodyImage,
            time: new Date().toISOString(),
            read: 0,
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
      setSelectedImage(null);
      setShowEmojiPicker(false);
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
        subtitle="Real-time 1-on-1 direct messaging, team groups, image sharing, and WhatsApp ticks"
        maxWidth={980}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '290px 1fr', gap: 18, height: 540 }}>
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
                          setTargetGroup?.(null);
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
                        onClick={() => {
                          setActiveGroup(g);
                          setTargetGroup?.(g);
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
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
            {/* HIDDEN FILE INPUT FOR PHOTO ATTACHMENT */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleImageSelect}
            />

            {/* HEADER */}
            {activeTab === 'groups' ? (
              activeGroup ? (
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
              ) : null
            ) : (
              activeChatPartner ? (
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
              ) : null
            )}

            {loadError && (
              <div style={{ fontSize: 12, color: '#B45309', marginBottom: 8, fontWeight: 600 }}>
                {loadError}
              </div>
            )}

            {/* CONVERSATION FEED */}
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
                  {activeTab === 'groups' ? (
                    <>
                      No messages in <strong>{activeGroup?.name || 'group'}</strong> yet.
                      <div style={{ fontSize: 12, marginTop: 4 }}>
                        Say hello to your team and kick off the discussion!
                      </div>
                    </>
                  ) : (
                    <>
                      No messages yet with <strong>{activeChatPartner?.name}</strong>.
                      <div style={{ fontSize: 12, marginTop: 4 }}>
                        Say hello to start the conversation!
                      </div>
                    </>
                  )}
                </div>
              ) : (
                conversation.map((m) => {
                  const isMe = String(m.fromId) === myId;
                  const senderName = m.fromName || (isMe ? 'You' : 'Member');
                  const nameColor = getUserColor(senderName);
                  const isSystem = m.isSystem || senderName === 'System';

                  if (isSystem) {
                    return (
                      <div key={m.id || `${m.fromId}-${m.time}`} style={{ display: 'flex', justifyContent: 'center' }}>
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
                            objectFit: 'cover',
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

                        {/* ATTACHED IMAGE (Clickable Lightbox) */}
                        {m.imageUrl && (
                          <div
                            onClick={() => setPreviewImage(m.imageUrl)}
                            style={{
                              borderRadius: 12,
                              overflow: 'hidden',
                              marginBottom: m.text ? 8 : 4,
                              cursor: 'pointer',
                              position: 'relative',
                            }}
                          >
                            <img
                              src={m.imageUrl}
                              alt="Photo"
                              style={{
                                display: 'block',
                                maxWidth: '100%',
                                maxHeight: 260,
                                borderRadius: 10,
                                objectFit: 'cover',
                              }}
                            />
                            <div
                              style={{
                                position: 'absolute',
                                bottom: 6,
                                right: 6,
                                background: 'rgba(0,0,0,0.6)',
                                color: '#FFF',
                                borderRadius: 6,
                                padding: '2px 6px',
                                fontSize: 10,
                                fontWeight: 700,
                              }}
                            >
                              🔍 View
                            </div>
                          </div>
                        )}

                        {/* TEXT MESSAGE */}
                        {m.text && <div style={{ wordBreak: 'break-word' }}>{m.text}</div>}

                        {/* TIMESTAMP & WHATSAPP TICKS */}
                        <div
                          style={{
                            fontSize: 10,
                            opacity: 0.8,
                            marginTop: 4,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: 3,
                            fontFamily: 'JetBrains Mono, monospace',
                          }}
                        >
                          <span>
                            {new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>

                          {/* ONE TICK, TWO TICK, BLUE TICK */}
                          <WhatsAppTicks
                            isMe={isMe}
                            read={m.read}
                            readBy={m.readBy || m.read_by}
                            isGroup={activeTab === 'groups'}
                            myId={myId}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* IMAGE PREVIEW DRAWER (Before Sending) */}
            {selectedImage && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '8px 12px',
                  background: '#F1F5F9',
                  borderRadius: '12px 12px 0 0',
                  border: '1px solid var(--border)',
                  borderBottom: 'none',
                }}
              >
                <div style={{ position: 'relative' }}>
                  <img
                    src={selectedImage.dataUrl}
                    alt="Preview"
                    style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover' }}
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedImage(null)}
                    style={{
                      position: 'absolute',
                      top: -6,
                      right: -6,
                      background: '#EF4444',
                      color: '#FFF',
                      border: 'none',
                      borderRadius: '50%',
                      width: 18,
                      height: 18,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      cursor: 'pointer',
                      fontWeight: 900,
                    }}
                    title="Remove Image"
                  >
                    ✕
                  </button>
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#1E293B', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                    {selectedImage.name || 'Photo selected'}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>
                    Ready to send with your message
                  </div>
                </div>
              </div>
            )}

            {/* MODERN WHATSAPP EMOJI PICKER POPUP */}
            {showEmojiPicker && (
              <div
                ref={emojiPickerRef}
                style={{
                  position: 'absolute',
                  bottom: selectedImage ? '135px' : '65px',
                  left: 8,
                  zIndex: 1000,
                  maxWidth: 'calc(100% - 16px)',
                }}
              >
                <ModernWhatsAppEmojiPicker
                  onSelectEmoji={handleEmojiSelect}
                  onClose={() => setShowEmojiPicker(false)}
                />
              </div>
            )}

            {/* WHATSAPP-STYLE INPUT BAR (Attachment + Emoji + Input + Send - IMAGE 2 STYLE) */}
            <form
              className="wa-input-capsule-form"
              onSubmit={handleSendMessage}
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                marginTop: selectedImage ? 0 : 10,
                paddingTop: selectedImage ? 6 : 10,
                borderTop: selectedImage ? 'none' : '1px solid var(--border)',
                background: '#FFFFFF',
                position: 'relative',
                width: '100%',
                boxSizing: 'border-box',
              }}
            >
              {/* UNIFIED WHATSAPP INPUT CAPSULE (IMAGE 2 STYLE) */}
              <div className="wa-chat-capsule-pill">
                {/* ATTACHMENT / PAPERCLIP ICON */}
                <button
                  type="button"
                  className="wa-chat-icon-btn"
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach photo or image"
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                </button>

                {/* EMOJI ICON (WHATSAPP OUTLINE SMILEY MATCHING IMAGE 2) */}
                <button
                  id="emoji-toggle-btn"
                  type="button"
                  className={`wa-chat-icon-btn ${showEmojiPicker ? 'active' : ''}`}
                  onClick={() => setShowEmojiPicker((prev) => !prev)}
                  title="Insert modern emoji & reactions"
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="9.5" />
                    <path d="M8 14.3c.9 1.6 2.4 2.4 4 2.4s3.1-.8 4-2.4" />
                    <circle cx="9" cy="9.5" r="1.25" fill="currentColor" stroke="none" />
                    <circle cx="15" cy="9.5" r="1.25" fill="currentColor" stroke="none" />
                  </svg>
                </button>

                {/* TEXT INPUT */}
                <input
                  ref={textInputRef}
                  placeholder={
                    selectedImage
                      ? 'Add a caption...'
                      : activeTab === 'groups'
                      ? `Type a message (#${activeGroup?.name || 'group'})...`
                      : 'Type a message'
                  }
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: 14,
                    color: '#0F172A',
                    fontWeight: 450,
                    padding: '8px 4px',
                    minWidth: 0,
                  }}
                  autoFocus
                  disabled={sending}
                />
              </div>

              {/* SEND BUTTON */}
              <button
                type="submit"
                disabled={sending || (!text.trim() && !selectedImage)}
                title="Send message"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background:
                    sending || (!text.trim() && !selectedImage)
                      ? '#CBD5E1'
                      : 'var(--accent, #7C3AED)',
                  color: '#FFFFFF',
                  border: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: sending || (!text.trim() && !selectedImage) ? 'not-allowed' : 'pointer',
                  flexShrink: 0,
                  boxShadow:
                    sending || (!text.trim() && !selectedImage)
                      ? 'none'
                      : '0 4px 12px rgba(124, 58, 237, 0.35)',
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                  transform: 'scale(1)',
                }}
                onMouseEnter={(e) => {
                  if (!sending && (text.trim() || selectedImage)) {
                    e.currentTarget.style.transform = 'scale(1.08)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 2 }}>
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </Modal>

      {/* FULLSCREEN LIGHTBOX PHOTO MODAL */}
      {previewImage && (
        <Modal
          open={Boolean(previewImage)}
          onClose={() => setPreviewImage(null)}
          title="Photo Preview"
          maxWidth={760}
        >
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <img
              src={previewImage}
              alt="Photo preview"
              style={{
                maxWidth: '100%',
                maxHeight: '68vh',
                borderRadius: 14,
                objectFit: 'contain',
                boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
              }}
            />
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 12 }}>
              <a
                href={previewImage}
                download="chat-photo.jpg"
                className="btn btn-sm btn-dark"
                style={{
                  background: '#10B981',
                  fontWeight: 800,
                  textDecoration: 'none',
                  padding: '8px 20px',
                  borderRadius: 99,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>Download Photo</span>
              </a>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => setPreviewImage(null)}
                style={{ fontWeight: 800, borderRadius: 99 }}
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

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

            {/* MEMBERS LIST (Permanent, no message delete option) */}
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
