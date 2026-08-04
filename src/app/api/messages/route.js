import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Message from '@/lib/models/Message';
import User from '@/lib/models/User';
import { getAuthUser } from '@/lib/auth';

function flattenMessage(m) {
  const obj = m.toObject ? m.toObject() : m;
  return {
    id: obj._id?.toString(),
    _id: obj._id?.toString(),
    fromId: obj.from_id?.toString?.() || String(obj.from_id),
    toId: obj.to_id?.toString?.() || String(obj.to_id),
    text: obj.text,
    time: obj.createdAt ? new Date(obj.createdAt).toISOString() : new Date().toISOString(),
    read: obj.read ? 1 : 0,
  };
}

// GET /api/messages — inbox for current user (optionally filter ?with=userId)
export async function GET(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });

  await connectDB();
  const { searchParams } = new URL(request.url);
  const withId = searchParams.get('with');

  const me = new mongoose.Types.ObjectId(authUser.id);
  let filter;

  if (withId && mongoose.Types.ObjectId.isValid(withId)) {
    const other = new mongoose.Types.ObjectId(withId);
    filter = {
      $or: [
        { from_id: me, to_id: other },
        { from_id: other, to_id: me },
      ],
    };
  } else {
    filter = { $or: [{ from_id: me }, { to_id: me }] };
  }

  const rows = await Message.find(filter).sort({ createdAt: 1 }).lean();
  return NextResponse.json(rows.map(flattenMessage));
}

// POST /api/messages — send a DM
export async function POST(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const toId = String(body.toId || body.to_id || '').trim();
  const text = String(body.text || '').trim();

  if (!toId || !mongoose.Types.ObjectId.isValid(toId)) {
    return NextResponse.json({ error: 'Valid recipient required' }, { status: 400 });
  }
  if (!text) {
    return NextResponse.json({ error: 'Message text is required' }, { status: 400 });
  }
  if (toId === String(authUser.id)) {
    return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 });
  }

  await connectDB();
  const recipient = await User.findById(toId).select('_id status').lean();
  if (!recipient) {
    return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
  }

  const created = await Message.create({
    from_id: authUser.id,
    to_id: toId,
    text: text.slice(0, 4000),
    read: false,
  });

  return NextResponse.json(flattenMessage(created), { status: 201 });
}
