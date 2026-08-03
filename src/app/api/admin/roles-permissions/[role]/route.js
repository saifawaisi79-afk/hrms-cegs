import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import RolePermission from '@/lib/models/RolePermission';
import { getAuthUser, requireRole } from '@/lib/auth';

// PUT /api/admin/roles-permissions/[role]
export async function PUT(request, { params }) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });
  if (!requireRole(authUser, ['super_admin'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { permissions_json } = await request.json();
  await connectDB();
  await RolePermission.findOneAndUpdate(
    { role_name: params.role },
    { role_name: params.role, permissions_json },
    { upsert: true }
  );
  return NextResponse.json({ message: 'Permissions updated', changes: 1 });
}
