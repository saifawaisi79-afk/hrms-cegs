import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Message from '@/lib/models/Message';
import { getAuthUser } from '@/lib/auth';

// POST /api/messages/read — mark messages from a colleague as read
export async function POST(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const fromId = String(body.fromId || body.from_id || '').trim();

  if (!fromId || !mongoose.Types.ObjectId.isValid(fromId)) {
    return NextResponse.json({ error: 'Valid fromId required' }, { status: 400 });
  }

  await connectDB();
  const result = await Message.updateMany(
    {
      from_id: new mongoose.Types.ObjectId(fromId),
      to_id: new mongoose.Types.ObjectId(authUser.id),
      read: false,
    },
    { $set: { read: true } }
  );

  return NextResponse.json({ updated: result.modifiedCount || 0 });
}
