import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import SystemSetting from '@/lib/models/SystemSetting';
import { getAuthUser, requireRole } from '@/lib/auth';

// GET /api/settings
export async function GET(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });
  await connectDB();
  const settings = await SystemSetting.find({}).lean();
  const obj = {};
  settings.forEach(s => { obj[s.key] = s.value; });
  return NextResponse.json(obj);
}

// POST /api/settings
export async function POST(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });
  if (!requireRole(authUser, ['super_admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { key, value } = await request.json();
  await connectDB();
  await SystemSetting.findOneAndUpdate({ key }, { key, value }, { upsert: true });
  return NextResponse.json({ message: 'Setting saved' });
}
