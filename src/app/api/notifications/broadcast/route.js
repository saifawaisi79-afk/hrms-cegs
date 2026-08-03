import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Notification from '@/lib/models/Notification';
import { getAuthUser, requireRole } from '@/lib/auth';

export async function POST(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });
  if (!requireRole(authUser, ['admin', 'super_admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { title, message } = await request.json();
  await connectDB();
  await Notification.create({ sender_id: authUser.id, recipient_id: null, title, message, created_at: new Date().toISOString() });
  return NextResponse.json({ message: 'Broadcast sent' });
}
