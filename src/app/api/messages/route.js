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
  return {
    id: obj._id?.toString(),
    _id: obj._id?.toString(),
    fromId: fromObj ? fromObj._id?.toString() : obj.from_id?.toString?.() || String(obj.from_id),
    fromName: fromObj?.name || obj.fromName || '',
    fromAvatar: fromObj?.avatar_url || obj.fromAvatar || '',
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

  // If querying messages for a group
  if (groupId && mongoose.Types.ObjectId.isValid(groupId)) {
    const groupObjectId = new mongoose.Types.ObjectId(groupId);
    const rows = await Message.find({ group_id: groupObjectId })
      .populate('from_id', 'name email role designation avatar_url')
      .sort({ createdAt: 1 })
      .lean();

    return NextResponse.json(rows.map(flattenMessage));
  }

  // Direct 1-on-1 messages
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
    // Return all direct messages involving current user
    filter = {
      $or: [
        { from_id: me, to_id: { $ne: null } },
        { to_id: me },
      ],
    };
  }

  const rows = await Message.find(filter)
    .populate('from_id', 'name email role designation avatar_url')
    .sort({ createdAt: 1 })
    .lean();

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
