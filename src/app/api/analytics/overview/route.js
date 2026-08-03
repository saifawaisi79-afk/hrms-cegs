import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import Leave from '@/lib/models/Leave';
import Expense from '@/lib/models/Expense';
import Attendance from '@/lib/models/Attendance';
import { getAuthUser, requireRole } from '@/lib/auth';

// GET /api/analytics/overview
export async function GET(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });
  if (!requireRole(authUser, ['admin', 'super_admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectDB();
  const todayStr = new Date().toISOString().split('T')[0];

  const [employees_count, on_leave_count, pending_leaves, expense_agg, present_today] = await Promise.all([
    User.countDocuments({ status: 'active' }),
    User.countDocuments({ status: 'on_leave' }),
    Leave.countDocuments({ status: 'pending' }),
    Expense.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
    Attendance.countDocuments({ date: todayStr, status: { $in: ['present', 'late'] } }),
  ]);

  return NextResponse.json({
    employees_count,
    on_leave_count,
    pending_leaves,
    expenses_sum: expense_agg[0]?.total || 0,
    present_today,
  });
}
