import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Leave from '@/lib/models/Leave';
import User from '@/lib/models/User';
import { getAuthUser } from '@/lib/auth';
import {
  allocateLeavePay,
  calcLeaveBalance,
  countLeaveDays,
  typeRemainingFor,
} from '@/lib/leave-policy';

function flattenLeave(l) {
  const obj = l.toObject ? l.toObject() : l;
  return {
    ...obj,
    id: obj._id?.toString(),
    _id: obj._id?.toString(),
    user_id: obj.user_id?._id?.toString() || obj.user_id?.toString() || null,
    uid: obj.user_id?._id?.toString() || obj.user_id?.toString() || null,
    type: obj.leave_type,
    start: obj.start_date,
    end: obj.end_date,
    applied: obj.applied_date,
    payType: obj.pay_type || 'paid',
    paidDays: obj.paid_days || 0,
    unpaidDays: obj.unpaid_days || 0,
    totalDays: obj.total_days || 0,
    employee_name: obj.user_id?.name || null,
    employee_id: obj.user_id?.employee_id || null,
    avatar_url: obj.user_id?.avatar_url || null,
    department_name: obj.user_id?.department_id?.name || null,
    approved_by: obj.approved_by?.toString() || null,
  };
}

function toBalanceLeaves(rows, userId) {
  return rows.map((r) => ({
    uid: userId,
    type: r.leave_type,
    start: r.start_date,
    end: r.end_date,
    status: r.status,
    payType: r.pay_type || 'paid',
    paidDays: r.paid_days || 0,
    unpaidDays: r.unpaid_days || 0,
    totalDays: r.total_days || 0,
  }));
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
      .sort({ applied_date: -1 })
      .lean();
  } else {
    leaves = await Leave.find({})
      .populate({
        path: 'user_id',
        select: 'name employee_id avatar_url department_id joining_date',
        populate: { path: 'department_id', select: 'name' },
      })
      .sort({ applied_date: -1 })
      .lean();
  }

  const myRows = await Leave.find({ user_id: authUser.id }).lean();
  const me = await User.findById(authUser.id).select('joining_date').lean();
  const balance = calcLeaveBalance(
    toBalanceLeaves(myRows, authUser.id),
    authUser.id,
    new Date(),
    me?.joining_date
  );

  return NextResponse.json({
    leaves: leaves.map(flattenLeave),
    balance,
  });
}

// POST /api/leaves
export async function POST(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });

  // Super Admin may apply too; policy covers employee + admin primarily
  const { leave_type, start_date, end_date, reason } = await request.json();
  if (!leave_type || !start_date || !end_date) {
    return NextResponse.json({ error: 'Leave type, start date and end date are required' }, { status: 400 });
  }

  const days = countLeaveDays(start_date, end_date);
  if (days < 1) {
    return NextResponse.json({ error: 'Invalid leave date range' }, { status: 400 });
  }

  await connectDB();
  const myRows = await Leave.find({ user_id: authUser.id }).lean();
  const me = await User.findById(authUser.id).select('joining_date').lean();
  const balance = calcLeaveBalance(
    toBalanceLeaves(myRows, authUser.id),
    authUser.id,
    new Date(),
    me?.joining_date
  );
  const alloc = allocateLeavePay(
    days,
    balance.available,
    typeRemainingFor(balance, leave_type)
  );

  const appliedDate = new Date().toISOString().split('T')[0];
  const leave = await Leave.create({
    user_id: authUser.id,
    leave_type,
    start_date,
    end_date,
    reason: reason || '',
    applied_date: appliedDate,
    pay_type: alloc.payType,
    paid_days: alloc.paidDays,
    unpaid_days: alloc.unpaidDays,
    total_days: alloc.totalDays,
  });

  return NextResponse.json(
    {
      id: leave._id.toString(),
      leave_type,
      start_date,
      end_date,
      status: 'pending',
      pay_type: alloc.payType,
      paid_days: alloc.paidDays,
      unpaid_days: alloc.unpaidDays,
      total_days: alloc.totalDays,
      balance_after_request: Math.max(0, balance.available - alloc.paidDays),
    },
    { status: 201 }
  );
}
