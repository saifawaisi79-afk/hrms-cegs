import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import { getAuthUser, requireRole } from '@/lib/auth';

// PUT /api/admin/users/[id]/status
export async function PUT(request, { params }) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });
  if (!requireRole(authUser, ['super_admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { status } = await request.json();
  await connectDB();
  await User.findByIdAndUpdate(params.id, { status });
  return NextResponse.json({ message: 'Status updated', changes: 1 });
}
