import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import { getAuthUser, requireRole } from '@/lib/auth';

// GET /api/users - alias for /api/employees
export async function GET(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });

  const elevated = ['admin', 'super_admin'].includes(authUser.role);
  await connectDB();
  let q = elevated ? User.find({}) : User.find({ status: 'active' });
  if (!elevated) q = q.select('employee_id name email role department_id designation joining_date status avatar_url');
  const users = await q.populate('department_id', 'name').lean();
  return NextResponse.json(users.map(u => ({
    ...u,
    id: u._id.toString(),
    _id: u._id.toString(),
    department_id: u.department_id?._id?.toString() || u.department_id?.toString() || null,
    department_name: u.department_id?.name || null,
  })));
}
