import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Message from '@/lib/models/Message';
import { getAuthUser } from '@/lib/auth';

// POST /api/messages/read — mark direct messages or group messages as read
export async function POST(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const fromId = String(body.fromId || body.from_id || '').trim();
  const groupId = String(body.groupId || body.group_id || '').trim();

  await connectDB();
  const myObjectId = new mongoose.Types.ObjectId(authUser.id);

  // 1. Mark group messages as read by current user
  if (groupId && mongoose.Types.ObjectId.isValid(groupId)) {
    const groupObjectId = new mongoose.Types.ObjectId(groupId);
    const result = await Message.updateMany(
      {
        group_id: groupObjectId,
        from_id: { $ne: myObjectId },
        read_by: { $ne: myObjectId },
      },
      {
        $addToSet: { read_by: myObjectId },
        $set: { read: true },
      }
    );
    return NextResponse.json({ updated: result.modifiedCount || 0 });
  }

  // 2. Mark 1-on-1 direct messages as read
  if (fromId && mongoose.Types.ObjectId.isValid(fromId)) {
    const result = await Message.updateMany(
      {
        from_id: new mongoose.Types.ObjectId(fromId),
        to_id: myObjectId,
        read: false,
      },
      {
        $set: { read: true },
        $addToSet: { read_by: myObjectId },
      }
    );
    return NextResponse.json({ updated: result.modifiedCount || 0 });
  }

  return NextResponse.json({ error: 'Valid fromId or groupId required' }, { status: 400 });
}
