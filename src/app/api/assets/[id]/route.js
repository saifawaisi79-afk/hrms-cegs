import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Asset from '@/lib/models/Asset';
import { getAuthUser, requireRole } from '@/lib/auth';

// PUT /api/assets/[id]
export async function PUT(request, { params }) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });
  if (!requireRole(authUser, ['admin', 'super_admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { asset_name, serial_number, category, status, assigned_to, condition, location } = await request.json();
  await connectDB();
  await Asset.findByIdAndUpdate(params.id, { asset_name, serial_number, category, status, assigned_to: assigned_to || null, condition, location });
  return NextResponse.json({ message: 'Asset updated successfully' });
}

// DELETE /api/assets/[id]
export async function DELETE(request, { params }) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });
  if (!requireRole(authUser, ['admin', 'super_admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectDB();
  await Asset.findByIdAndDelete(params.id);
  return NextResponse.json({ message: 'Asset deleted successfully' });
}
