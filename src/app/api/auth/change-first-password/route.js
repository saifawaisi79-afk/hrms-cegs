import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import { getAuthUser } from '@/lib/auth';

export async function POST(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });

  const { current_password, new_password } = await request.json();
  if (!current_password || !new_password) {
    return NextResponse.json({ error: 'Current password and new password are required' }, { status: 400 });
  }
  if (new_password.length < 6) {
    return NextResponse.json({ error: 'New password must be at least 6 characters long' }, { status: 400 });
  }

  await connectDB();
  const user = await User.findById(authUser.id);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const match = await bcrypt.compare(current_password, user.password_hash);
  if (!match) {
    return NextResponse.json({ error: 'Incorrect temporary/current password' }, { status: 400 });
  }

  const newHash = await bcrypt.hash(new_password, 10);
  await User.findByIdAndUpdate(user._id, {
    password_hash: newHash,
    must_change_password: false,
    temp_password_expires_at: null,
  });

  return NextResponse.json({ message: 'Password updated successfully! Welcome to your Employee Portal.' });
}
