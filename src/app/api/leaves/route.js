import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Leave from '@/lib/models/Leave';
import { getAuthUser } from '@/lib/auth';

function flattenLeave(l) {
  const obj = l.toObject ? l.toObject() : l;
  return {
    ...obj,
    id: obj._id?.toString(),
    _id: obj._id?.toString(),
    user_id: obj.user_id?._id?.toString() || obj.user_id?.toString() || null,
    employee_name: obj.user_id?.name || null,
    employee_id: obj.user_id?.employee_id || null,
    avatar_url: obj.user_id?.avatar_url || null,
    department_name: obj.user_id?.department_id?.name || null,
    approved_by: obj.approved_by?.toString() || null,
  };
}

// GET /api/leaves
export async function GET(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });

  await connectDB();
  let leaves;
  if (authUser.role === 'employee') {
    leaves = await Leave.find({ user_id: authUser.id })
      .populate('user_id', 'name employee_id avatar_url')
      .sort({ applied_date: -1 }).lean();
  } else {
    leaves = await Leave.find({})
      .populate({ path: 'user_id', select: 'name employee_id avatar_url department_id', populate: { path: 'department_id', select: 'name' } })
      .sort({ applied_date: -1 }).lean();
  }
  return NextResponse.json(leaves.map(flattenLeave));
}

// POST /api/leaves
export async function POST(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });

  const { leave_type, start_date, end_date, reason } = await request.json();
  if (!leave_type || !start_date || !end_date) {
    return NextResponse.json({ error: 'Leave type, start date and end date are required' }, { status: 400 });
  }

  await connectDB();
  const appliedDate = new Date().toISOString().split('T')[0];
  const leave = await Leave.create({ user_id: authUser.id, leave_type, start_date, end_date, reason: reason || '', applied_date: appliedDate });
  return NextResponse.json({ id: leave._id.toString(), leave_type, start_date, end_date, status: 'pending' }, { status: 201 });
}
