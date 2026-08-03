import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Department from '@/lib/models/Department';
import { getAuthUser, requireRole } from '@/lib/auth';

// PUT /api/departments/[id]
export async function PUT(request, { params }) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });
  if (!requireRole(authUser, ['admin', 'super_admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { name, code, manager_id, budget } = await request.json();
  await connectDB();
  await Department.findByIdAndUpdate(params.id, { name, code, manager_id: manager_id || null, budget: budget || 0 });
  return NextResponse.json({ message: 'Department updated successfully' });
}

// DELETE /api/departments/[id]
export async function DELETE(request, { params }) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });
  if (!requireRole(authUser, ['admin', 'super_admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectDB();
  await Department.findByIdAndDelete(params.id);
  return NextResponse.json({ message: 'Department deleted successfully' });
}
