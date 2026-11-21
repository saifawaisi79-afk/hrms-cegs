import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Message from '@/lib/models/Message';
import ChatGroup from '@/lib/models/ChatGroup';
import User from '@/lib/models/User';
import { getAuthUser } from '@/lib/auth';

function flattenMessage(m) {
  const obj = m.toObject ? m.toObject() : m;
  const fromObj = typeof obj.from_id === 'object' && obj.from_id !== null ? obj.from_id : null;
  const rawAv = fromObj?.avatar_url || obj.fromAvatar || '';
  const fromAvatar = typeof rawAv === 'string' && rawAv.startsWith('data:') && rawAv.length > 500
    ? ''
    : rawAv;

  return {
    id: obj._id?.toString(),
    _id: obj._id?.toString(),
    fromId: fromObj ? fromObj._id?.toString() : obj.from_id?.toString?.() || String(obj.from_id),
    fromName: fromObj?.name || obj.fromName || '',
    fromAvatar: fromAvatar,
    fromRole: fromObj?.role || obj.fromRole || '',
    fromDesignation: fromObj?.designation || obj.fromDesignation || '',
    toId: obj.to_id?.toString?.() || (obj.to_id ? String(obj.to_id) : null),
    groupId: obj.group_id?.toString?.() || (obj.group_id ? String(obj.group_id) : null),
    text: obj.text || '',
    imageUrl: obj.image_url || obj.imageUrl || '',
    time: obj.createdAt ? new Date(obj.createdAt).toISOString() : new Date().toISOString(),
    read: obj.read ? 1 : 0,
    readBy: (obj.read_by || []).map((id) =>
      typeof id === 'object' && id !== null ? id._id?.toString() || id.toString() : String(id)
    ),
  };
}

// GET /api/messages — direct messages or group messages (?groupId=...)
export async function GET(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });

  await connectDB();
  const { searchParams } = new URL(request.url);
  const withId = searchParams.get('with');
  const groupId = searchParams.get('groupId') || searchParams.get('group_id');

  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '60', 10)));
  const since = searchParams.get('since');

  // If querying messages for a group
  if (groupId && mongoose.Types.ObjectId.isValid(groupId)) {
    const groupObjectId = new mongoose.Types.ObjectId(groupId);
    let groupFilter = { group_id: groupObjectId };
    if (since) {
      const sinceDate = new Date(since);
      if (!isNaN(sinceDate.getTime())) {
        groupFilter.createdAt = { $gt: sinceDate };
      }
    }

    let groupQuery = Message.find(groupFilter)
      .populate('from_id', 'name email role designation avatar_url');

    if (since) {
      groupQuery = groupQuery.sort({ createdAt: 1 }).limit(limit);
    } else {
      groupQuery = groupQuery.sort({ createdAt: -1 }).limit(limit);
    }

    let rows = await groupQuery.lean();
    if (!since) rows.reverse();
    return NextResponse.json(rows.map(flattenMessage));
  }

  // Direct 1-on-1 messages or all relevant messages for user
  const me = new mongoose.Types.ObjectId(authUser.id);
  let filter;

  if (withId && mongoose.Types.ObjectId.isValid(withId)) {
    const other = new mongoose.Types.ObjectId(withId);
    filter = {
      group_id: null,
      $or: [
        { from_id: me, to_id: other },
        { from_id: other, to_id: me },
      ],
    };
  } else {
    // Return all direct messages involving current user + messages in groups user belongs to
    let groupIds = [];
    try {
      const userGroups = await ChatGroup.find({
        $or: [{ members: me }, { admins: me }],
      }).select('_id').lean();
      groupIds = userGroups.map((g) => g._id);
    } catch (gErr) {
      console.warn('Error fetching user groups for messages:', gErr.message);
    }

    filter = {
      $or: [
        { from_id: me, to_id: { $ne: null } },
        { to_id: me },
        ...(groupIds.length > 0 ? [{ group_id: { $in: groupIds } }] : []),
      ],
    };
  }

  if (since) {
    const sinceDate = new Date(since);
    if (!isNaN(sinceDate.getTime())) {
      filter = { $and: [filter, { createdAt: { $gt: sinceDate } }] };
    }
  }

  let query = Message.find(filter)
    .populate('from_id', 'name email role designation avatar_url');

  if (since) {
    query = query.sort({ createdAt: 1 }).limit(limit);
  } else {
    query = query.sort({ createdAt: -1 }).limit(limit);
  }

  let rows = await query.lean();
  if (!since) rows.reverse();

  return NextResponse.json(rows.map(flattenMessage));
}

// POST /api/messages — send a DM or a group message
export async function POST(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const toId = String(body.toId || body.to_id || '').trim();
  const groupId = String(body.groupId || body.group_id || '').trim();
  const text = String(body.text || '').trim();
  const imageUrl = String(body.imageUrl || body.image_url || body.image || '').trim();

  if (!text && !imageUrl) {
    return NextResponse.json({ error: 'Message text or image is required' }, { status: 400 });
  }

  await connectDB();
  const senderUser = await User.findById(authUser.id).select('name role designation avatar_url').lean();

  // 1. Sending to a Chat Group
  if (groupId) {
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return NextResponse.json({ error: 'Invalid group ID' }, { status: 400 });
    }

    const group = await ChatGroup.findById(groupId);
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const myIdStr = String(authUser.id);
    const isMember = group.members.some((m) => m.toString() === myIdStr);
    const isAdmin = group.admins.some((a) => a.toString() === myIdStr);

    if (!isMember && !isAdmin) {
      return NextResponse.json({ error: 'You are not a member of this group' }, { status: 403 });
    }

    const created = await Message.create({
      from_id: authUser.id,
      group_id: group._id,
      to_id: null,
      text: text.slice(0, 4000),
      image_url: imageUrl,
      read: false,
      read_by: [new mongoose.Types.ObjectId(authUser.id)],
    });

    // Update last message on the group
    group.last_message = {
      text: text ? text.slice(0, 200) : '📷 Photo',
      from_id: authUser.id,
      from_name: senderUser?.name || authUser.name || 'Member',
      time: new Date(),
    };
    await group.save();

    const populated = await Message.findById(created._id)
      .populate('from_id', 'name email role designation avatar_url')
      .lean();

    return NextResponse.json(flattenMessage(populated), { status: 201 });
  }

  // 2. Sending a Direct Message (DM)
  if (!toId || !mongoose.Types.ObjectId.isValid(toId)) {
    return NextResponse.json({ error: 'Valid recipient or group ID required' }, { status: 400 });
  }
  if (toId === String(authUser.id)) {
    return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 });
  }

  const recipient = await User.findById(toId).select('_id status').lean();
  if (!recipient) {
    return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
  }

  const created = await Message.create({
    from_id: authUser.id,
    to_id: toId,
    group_id: null,
    text: text.slice(0, 4000),
    image_url: imageUrl,
    read: false,
    read_by: [new mongoose.Types.ObjectId(authUser.id)],
  });

  const populated = await Message.findById(created._id)
    .populate('from_id', 'name email role designation avatar_url')
    .lean();

  return NextResponse.json(flattenMessage(populated), { status: 201 });
}
