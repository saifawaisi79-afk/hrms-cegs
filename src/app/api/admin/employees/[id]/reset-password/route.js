import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import { getAuthUser, requireRole } from '@/lib/auth';

/**
 * POST /api/admin/employees/[id]/reset-password
 * HR/Super Admin sets a new permanent password for an employee.
 */
export async function POST(request, { params }) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Access token required' }, { status: 401 });
    }
    if (!requireRole(authUser, ['admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;
    const body = await request.json();
    const newPassword = String(body.new_password || body.password || '').trim();

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    await connectDB();

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { _id: id }
      : { $or: [{ employee_id: id }, { email: id }] };

    const password_hash = await bcrypt.hash(newPassword, 10);
    const user = await User.findOneAndUpdate(
      query,
      {
        password_hash,
        must_change_password: false,
        temp_password_expires_at: null,
      },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Password updated successfully',
      id: user._id.toString(),
      email: user.email,
      employee_id: user.employee_id,
    });
  } catch (error) {
    console.error('Reset password Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
