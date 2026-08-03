import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';

export async function POST(request) {
  const { email } = await request.json();
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  await connectDB();
  const user = await User.findOne({ email });

  if (!user) {
    return NextResponse.json({ message: 'If the email exists, a password reset link has been sent.' });
  }

  const hash = await bcrypt.hash('Password123', 10);
  await User.findByIdAndUpdate(user._id, {
    password_hash: hash,
    must_change_password: true,
  });

  return NextResponse.json({
    message: 'Password reset successful! Temporary password is "Password123". Please login and change it.',
  });
}
