import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Leave from '@/lib/models/Leave';
import User from '@/lib/models/User';
import { getAuthUser, requireRole } from '@/lib/auth';

// PUT /api/leaves/[id]/status
export async function PUT(request, { params }) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });
  if (!requireRole(authUser, ['admin', 'super_admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { status, rejection_reason } = await request.json();
  if (!['approved', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'Invalid leave status' }, { status: 400 });
  }

  await connectDB();
  const leave = await Leave.findById(params.id);
  if (!leave) return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });

  leave.status = status;
  leave.approved_by = authUser.id;
  leave.rejection_reason = rejection_reason || null;
  await leave.save();

  if (status === 'approved') {
    const todayStr = new Date().toISOString().split('T')[0];
    if (todayStr >= leave.start_date && todayStr <= leave.end_date) {
      await User.findByIdAndUpdate(leave.user_id, { status: 'on_leave' });
    }
  }

  return NextResponse.json({ message: `Leave request has been ${status}` });
}
