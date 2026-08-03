import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Notification from '@/lib/models/Notification';
import { getAuthUser } from '@/lib/auth';

export async function POST(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });
  await connectDB();
  await Notification.updateMany(
    { $or: [{ recipient_id: authUser.id }, { recipient_id: null }] },
    { is_read: true }
  );
  return NextResponse.json({ message: 'Notifications read' });
}
