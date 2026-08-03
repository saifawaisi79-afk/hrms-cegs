import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import { getAuthUser } from '@/lib/auth';

export async function GET(request, { params }) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });

  await connectDB();
  const user = await User.findById(params.id).populate('department_id', 'name').lean();
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  return NextResponse.json({
    ...user,
    id: user._id.toString(),
    _id: user._id.toString(),
    department_id: user.department_id?._id?.toString() || null,
    department_name: user.department_id?.name || null,
    password_hash: undefined,
  });
}
