import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import Department from '@/lib/models/Department';
import { signToken, getClientIp, checkIpAllowed } from '@/lib/auth';

export async function POST(request) {
  const clientIp = getClientIp(request);
  if (!checkIpAllowed(clientIp)) {
    return NextResponse.json(
      { error: 'Access denied. Please connect to the office network to log in.' },
      { status: 403 }
    );
  }

  const { email, password } = await request.json();
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  await connectDB();
  const user = await User.findOne({ email }).lean();

  if (!user) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  if (user.status !== 'active') {
    return NextResponse.json({ error: 'Account is deactivated. Contact administrator.' }, { status: 403 });
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  const nowStr = new Date().toISOString();
  await User.findByIdAndUpdate(user._id, { last_login: nowStr });

  const token = signToken({
    id: user._id.toString(),
    employee_id: user.employee_id,
    name: user.name,
    email: user.email,
    role: user.role,
    department_id: user.department_id?.toString() || null,
    avatar_url: user.avatar_url,
  });

  return NextResponse.json({
    token,
    user: {
      id: user._id.toString(),
      employee_id: user.employee_id,
      name: user.name,
      email: user.email,
      role: user.role,
      department_id: user.department_id?.toString() || null,
      designation: user.designation,
      joining_date: user.joining_date,
      contact: user.contact,
      status: user.status,
      avatar_url: user.avatar_url,
      must_change_password: user.must_change_password ? 1 : 0,
      last_login: nowStr,
    },
  });
}
