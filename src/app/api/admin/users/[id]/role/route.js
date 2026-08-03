import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import { getAuthUser, requireRole } from '@/lib/auth';

// PUT /api/admin/users/[id]/role
export async function PUT(request, { params }) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });
  if (!requireRole(authUser, ['super_admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { role } = await request.json();
  await connectDB();
  await User.findByIdAndUpdate(params.id, { role });
  return NextResponse.json({ message: 'Role updated', changes: 1 });
}
