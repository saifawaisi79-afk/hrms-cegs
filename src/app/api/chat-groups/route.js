import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import ChatGroup from '@/lib/models/ChatGroup';
import User from '@/lib/models/User';
import { getAuthUser } from '@/lib/auth';
import { canCreateMessengerGroup } from '@/lib/messenger-auth';

function formatGroup(g) {
  const obj = g.toObject ? g.toObject() : g;
  return {
    id: obj._id?.toString(),
    _id: obj._id?.toString(),
    name: obj.name,
    description: obj.description || '',
    avatar: obj.avatar || '',
    color: obj.color || '#10B981',
    created_by: obj.created_by?._id?.toString() || obj.created_by?.toString(),
    creatorName: obj.created_by?.name || 'Admin',
    creatorRole: obj.created_by?.role || '',
    admins: (obj.admins || []).map((a) =>
      typeof a === 'object' && a !== null
        ? {
            id: a._id?.toString(),
            name: a.name,
            email: a.email,
            designation: a.designation || a.role,
            role: a.role,
            avatar: a.avatar_url,
          }
        : a?.toString()
    ),
    members: (obj.members || []).map((m) =>
      typeof m === 'object' && m !== null
        ? {
            id: m._id?.toString(),
            name: m.name,
            email: m.email,
            designation: m.designation || m.role,
            role: m.role,
            avatar: m.avatar_url,
          }
        : m?.toString()
    ),
    last_message: obj.last_message || null,
    createdAt: obj.createdAt ? new Date(obj.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: obj.updatedAt ? new Date(obj.updatedAt).toISOString() : new Date().toISOString(),
  };
}

// GET /api/chat-groups — list groups the user is a member of (or all if admin)
export async function GET(request) {
  const authUser = getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Access token required' }, { status: 401 });
  }

  await connectDB();
  const myObjectId = new mongoose.Types.ObjectId(authUser.id);

  // Return all groups where the user is a member or admin
  const groups = await ChatGroup.find({
    $or: [{ members: myObjectId }, { admins: myObjectId }, { created_by: myObjectId }],
  })
    .populate('created_by', 'name email role designation avatar_url')
    .populate('admins', 'name email role designation avatar_url')
    .populate('members', 'name email role designation avatar_url')
    .sort({ 'last_message.time': -1, updatedAt: -1 })
    .lean();

  return NextResponse.json(groups.map(formatGroup));
}

// POST /api/chat-groups — create a new group (Authority: HR Admin or Finance/Invoice only)
export async function POST(request) {
  const authUser = getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Access token required' }, { status: 401 });
  }

  await connectDB();

  // Fetch full user record to verify authority
  const dbUser = await User.findById(authUser.id).lean();
  const effectiveUser = dbUser
    ? {
        ...authUser,
        role: dbUser.role || authUser.role,
        designation: dbUser.designation || authUser.designation,
        title: dbUser.designation || authUser.title,
        department: dbUser.department_id ? String(dbUser.department_id) : '',
      }
    : authUser;

  if (!canCreateMessengerGroup(effectiveUser)) {
    return NextResponse.json(
      {
        error:
          'Authority Denied: Only HR (Admin) and Finance & Invoice portal members have authority to create groups.',
      },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const description = String(body.description || '').trim();
  const color = String(body.color || '#10B981').trim();
  const avatar = String(body.avatar || '').trim();
  const rawMemberIds = Array.isArray(body.memberIds) ? body.memberIds : [];

  if (!name) {
    return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
  }

  const creatorId = new mongoose.Types.ObjectId(authUser.id);
  const memberObjectIds = [creatorId];

  for (const mid of rawMemberIds) {
    const sId = String(mid || '').trim();
    if (sId && mongoose.Types.ObjectId.isValid(sId) && sId !== String(authUser.id)) {
      memberObjectIds.push(new mongoose.Types.ObjectId(sId));
    }
  }

  const newGroup = await ChatGroup.create({
    name: name.slice(0, 100),
    description: description.slice(0, 500),
    color,
    avatar,
    created_by: creatorId,
    admins: [creatorId],
    members: memberObjectIds,
    last_message: {
      text: `Group "${name}" was created by ${effectiveUser.name || 'Admin'}`,
      from_id: creatorId,
      from_name: effectiveUser.name || 'Admin',
      time: new Date(),
    },
  });

  const populated = await ChatGroup.findById(newGroup._id)
    .populate('created_by', 'name email role designation avatar_url')
    .populate('admins', 'name email role designation avatar_url')
    .populate('members', 'name email role designation avatar_url')
    .lean();

  return NextResponse.json(formatGroup(populated), { status: 201 });
}
