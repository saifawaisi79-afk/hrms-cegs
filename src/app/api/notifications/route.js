import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Notification from '@/lib/models/Notification';
import { getAuthUser, requireRole } from '@/lib/auth';

// GET /api/notifications
export async function GET(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });

  await connectDB();
  const filter = authUser.role === 'employee'
    ? { $or: [{ recipient_id: authUser.id }, { recipient_id: null }] }
    : {};
  const notifs = await Notification.find(filter).sort({ created_at: -1 }).lean();
  return NextResponse.json(notifs.map(n => ({ ...n, id: n._id?.toString(), _id: n._id?.toString() })));
}

// POST /api/notifications/read
export async function POST(request) {
  const url = new URL(request.url);
  const action = url.pathname.split('/').pop();

  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });

  await connectDB();
  await Notification.updateMany(
    { $or: [{ recipient_id: authUser.id }, { recipient_id: null }] },
    { is_read: true }
  );
  return NextResponse.json({ message: 'Notifications read' });
}
