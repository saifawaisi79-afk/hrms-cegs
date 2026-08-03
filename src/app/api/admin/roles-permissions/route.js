import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import RolePermission from '@/lib/models/RolePermission';
import { getAuthUser, requireRole } from '@/lib/auth';

// GET /api/admin/roles-permissions
export async function GET(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });
  if (!requireRole(authUser, ['super_admin'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  await connectDB();
  const perms = await RolePermission.find({}).lean();
  return NextResponse.json(perms.map(p => ({ ...p, id: p._id?.toString(), _id: p._id?.toString() })));
}
