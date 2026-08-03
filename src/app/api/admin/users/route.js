import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import { getAuthUser, requireRole } from '@/lib/auth';

// GET /api/admin/users
export async function GET(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });
  if (!requireRole(authUser, ['super_admin'])) {
    return NextResponse.json({ error: 'Forbidden: Super Admin only' }, { status: 403 });
  }
  await connectDB();
  const users = await User.find({}).select('-password_hash').populate('department_id', 'name').lean();
  return NextResponse.json(users.map(u => ({
    ...u,
    id: u._id?.toString(),
    _id: u._id?.toString(),
    department_id: u.department_id?._id?.toString() || null,
    department_name: u.department_id?.name || null,
  })));
}
