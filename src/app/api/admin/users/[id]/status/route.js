import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import { getAuthUser, requireRole } from '@/lib/auth';

const ALLOWED = ['active', 'inactive', 'on_leave'];

// PUT /api/admin/users/[id]/status
export async function PUT(request, { params }) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Access token required' }, { status: 401 });
    }
    // HR Admin and Super Admin can activate / suspend employees
    if (!requireRole(authUser, ['admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;
    const body = await request.json().catch(() => ({}));
    const status = String(body.status || '').trim().toLowerCase();

    if (!ALLOWED.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Use active, inactive, or on_leave.' },
        { status: 400 }
      );
    }

    await connectDB();

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { _id: id }
      : { $or: [{ employee_id: id }, { email: String(id).toLowerCase() }] };

    const user = await User.findOneAndUpdate(query, { $set: { status } }, { new: true });
    if (!user) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Status updated',
      id: user._id.toString(),
      status: user.status,
      changes: 1,
    });
  } catch (error) {
    console.error('User status update error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
