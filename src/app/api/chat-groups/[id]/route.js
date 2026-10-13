import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import ChatGroup from '@/lib/models/ChatGroup';
import Message from '@/lib/models/Message';
import User from '@/lib/models/User';
import { getAuthUser } from '@/lib/auth';
import { canCreateMessengerGroup, isGroupAdmin } from '@/lib/messenger-auth';

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

// GET /api/chat-groups/[id]
export async function GET(request, { params }) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });

  const { id } = params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid group ID' }, { status: 400 });
  }

  await connectDB();
  const group = await ChatGroup.findById(id)
    .populate('created_by', 'name email role designation avatar_url')
    .populate('admins', 'name email role designation avatar_url')
    .populate('members', 'name email role designation avatar_url')
    .lean();

  if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

  return NextResponse.json(formatGroup(group));
}

// PATCH /api/chat-groups/[id] — add/remove members, update group, toggle admin
export async function PATCH(request, { params }) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });

  const { id } = params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid group ID' }, { status: 400 });
  }

  await connectDB();
  const group = await ChatGroup.findById(id);
  if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

  // Get user details to check admin authority
  const dbUser = await User.findById(authUser.id).lean();
  const effectiveUser = dbUser ? { ...authUser, ...dbUser } : authUser;

  const body = await request.json().catch(() => ({}));
  const isUserAdminOfGroup = isGroupAdmin(group, effectiveUser);

  // Self leaving group: allowed for any member
  if (body.action === 'leave' || body.leave) {
    const myIdStr = String(authUser.id);
    group.members = group.members.filter((m) => m.toString() !== myIdStr);
    group.admins = group.admins.filter((a) => a.toString() !== myIdStr);
    await group.save();

    // System message
    await Message.create({
      from_id: authUser.id,
      group_id: group._id,
      text: `${effectiveUser.name || 'A member'} left the group.`,
    });

    return NextResponse.json({ success: true, message: 'You have left the group.' });
  }

  // All other management actions (add members, remove members, rename) require Group Admin authority!
  if (!isUserAdminOfGroup) {
    return NextResponse.json(
      { error: 'Admin authority required: Only group admins can manage group members or settings.' },
      { status: 403 }
    );
  }

  // 1. Add members: array of user IDs
  if (Array.isArray(body.addMemberIds) && body.addMemberIds.length > 0) {
    const existingStrIds = new Set(group.members.map((m) => m.toString()));
    const addedNames = [];

    for (const newId of body.addMemberIds) {
      const sId = String(newId || '').trim();
      if (sId && mongoose.Types.ObjectId.isValid(sId) && !existingStrIds.has(sId)) {
        group.members.push(new mongoose.Types.ObjectId(sId));
        existingStrIds.add(sId);
        const addedUser = await User.findById(sId).select('name').lean();
        if (addedUser?.name) addedNames.push(addedUser.name);
      }
    }

    if (addedNames.length > 0) {
      await Message.create({
        from_id: authUser.id,
        group_id: group._id,
        text: `${effectiveUser.name || 'Admin'} added ${addedNames.join(', ')} to the group.`,
      });
    }
  }

  // 2. Remove member: single user ID
  if (body.removeMemberId) {
    const targetId = String(body.removeMemberId).trim();
    if (mongoose.Types.ObjectId.isValid(targetId)) {
      const targetUser = await User.findById(targetId).select('name').lean();
      group.members = group.members.filter((m) => m.toString() !== targetId);
      group.admins = group.admins.filter((a) => a.toString() !== targetId);

      await Message.create({
        from_id: authUser.id,
        group_id: group._id,
        text: `${effectiveUser.name || 'Admin'} removed ${targetUser?.name || 'a member'} from the group.`,
      });
    }
  }

  // 3. Promote / Demote admin
  if (body.addAdminId) {
    const aId = String(body.addAdminId).trim();
    if (mongoose.Types.ObjectId.isValid(aId) && !group.admins.some((a) => a.toString() === aId)) {
      group.admins.push(new mongoose.Types.ObjectId(aId));
    }
  }
  if (body.removeAdminId) {
    const rId = String(body.removeAdminId).trim();
    // Cannot remove creator as admin
    if (rId !== group.created_by.toString()) {
      group.admins = group.admins.filter((a) => a.toString() !== rId);
    }
  }

  // 4. Update basic info (name, description, color, avatar)
  if (typeof body.name === 'string' && body.name.trim()) {
    group.name = body.name.trim().slice(0, 100);
  }
  if (typeof body.description === 'string') {
    group.description = body.description.trim().slice(0, 500);
  }
  if (body.color) group.color = String(body.color).trim();
  if (body.avatar) group.avatar = String(body.avatar).trim();

  await group.save();

  const updated = await ChatGroup.findById(group._id)
    .populate('created_by', 'name email role designation avatar_url')
    .populate('admins', 'name email role designation avatar_url')
    .populate('members', 'name email role designation avatar_url')
    .lean();

  return NextResponse.json(formatGroup(updated));
}

// DELETE /api/chat-groups/[id] — disband / delete group (Creator or super admin only)
export async function DELETE(request, { params }) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });

  const { id } = params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid group ID' }, { status: 400 });
  }

  await connectDB();
  const group = await ChatGroup.findById(id);
  if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

  const dbUser = await User.findById(authUser.id).lean();
  const effectiveUser = dbUser ? { ...authUser, ...dbUser } : authUser;

  const isCreator = group.created_by.toString() === String(authUser.id);
  const isSuperOrHr = canCreateMessengerGroup(effectiveUser);

  if (!isCreator && !isSuperOrHr) {
    return NextResponse.json({ error: 'Authority required: Only the creator or HR/Finance admin can delete this group.' }, { status: 403 });
  }

  // Delete messages in this group
  await Message.deleteMany({ group_id: group._id });
  await ChatGroup.findByIdAndDelete(group._id);

  return NextResponse.json({ success: true, message: 'Group deleted successfully.' });
}
