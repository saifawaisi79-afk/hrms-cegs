import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import Department from '@/lib/models/Department';
import { getAuthUser } from '@/lib/auth';

export async function GET(request) {
  const authUser = getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Access token required' }, { status: 401 });
  }

  await connectDB();
  const user = await User.findById(authUser.id).populate('department_id', 'name').lean();

  if (!user) {
    return NextResponse.json({ error: 'User session no longer valid' }, { status: 404 });
  }

  return NextResponse.json({
    user: {
      id: user._id.toString(),
      employee_id: user.employee_id,
      name: user.name,
      email: user.email,
      role: user.role,
      department_id: user.department_id?._id?.toString() || null,
      department_name: user.department_id?.name || null,
      designation: user.designation,
      joining_date: user.joining_date,
      contact: user.contact,
      status: user.status,
      avatar_url: user.avatar_url,
      must_change_password: user.must_change_password ? 1 : 0,
      last_login: user.last_login,
    },
  });
}
