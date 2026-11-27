import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Payroll from '@/lib/models/Payroll';
import User from '@/lib/models/User';
import { getAuthUser, requireRole } from '@/lib/auth';
import {
  flattenPayrollSlip,
  processMonthlyPayroll,
  syncPayrollAttendanceDeduction,
} from '@/lib/attendance-deductions';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });

  await connectDB();
  // Only Super Admin can view all staff payroll records
  const canViewAll = authUser.role === 'super_admin';
  const filter = canViewAll ? {} : { user_id: authUser.id };
  const slips = await Payroll.find(filter)
    .populate({ path: 'user_id', select: 'name employee_id avatar_url designation department_id', populate: { path: 'department_id', select: 'name' } })
    .sort({ year: -1, month: -1 })
    .lean();
  const validSlips = slips.filter((s) => s.user_id != null);
  return NextResponse.json(validSlips.map(flattenPayrollSlip));
}

export async function POST(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });
  if (!requireRole(authUser, ['super_admin'])) {
    return NextResponse.json({ error: 'Forbidden. Only Super Admin can run payroll.' }, { status: 403 });
  }

  const { month, year } = await request.json();
  if (!month || !year) return NextResponse.json({ error: 'Month and year are required' }, { status: 400 });

  const numMonth = parseInt(String(month), 10);
  const numYear = parseInt(String(year), 10);

  await connectDB();
  try {
    const result = await processMonthlyPayroll(numMonth, numYear);
    return NextResponse.json({
      message: `Successfully processed payroll for ${result.processed_count} employees.`,
      ...result,
    });
  } catch (err) {
    console.error('payroll POST', err);
    return NextResponse.json({ error: 'Failed to process payroll' }, { status: 500 });
  }
}

export async function PATCH(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });
  if (!requireRole(authUser, ['super_admin'])) {
    return NextResponse.json(
      { error: 'Forbidden. Only Super Admin can hold or release staff salaries.' },
      { status: 403 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const userId = String(body?.userId || '').trim();
  const numMonth = parseInt(String(body?.month ?? ''), 10);
  const numYear = parseInt(String(body?.year ?? ''), 10);
  const hold = body?.hold;

  if (!userId || !mongoose.Types.ObjectId.isValid(userId) || !Number.isInteger(numMonth) || numMonth < 1 || numMonth > 12 || !Number.isInteger(numYear) || typeof hold !== 'boolean') {
    return NextResponse.json(
      { error: 'userId, valid month (1-12), year, and boolean hold flag are required.' },
      { status: 400 }
    );
  }

  await connectDB();
  try {
    const emp = await User.findById(userId).select('_id').lean();
    if (!emp) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    let existing = await Payroll.findOne({ user_id: userId, month: numMonth, year: numYear }).lean();
    if (!existing) {
      const created = await syncPayrollAttendanceDeduction(userId, numMonth, numYear);
      existing = created?.toObject ? created.toObject() : created;
    }

    const currentStatus = String(existing?.status || 'draft').toLowerCase();
    const restoredStatus =
      existing?.previous_status && existing.previous_status !== 'on_hold'
        ? existing.previous_status
        : existing?.processed_date
        ? 'processed'
        : 'draft';

    const updateFields = hold
      ? {
          status: 'on_hold',
          previous_status: currentStatus === 'on_hold' ? existing?.previous_status || 'processed' : currentStatus,
          held_by: String(authUser.id || authUser.email || 'super_admin'),
          held_at: new Date().toISOString(),
        }
      : {
          status: restoredStatus,
          held_by: null,
          held_at: null,
        };

    const updated = await Payroll.findOneAndUpdate(
      { user_id: userId, month: numMonth, year: numYear },
      { $set: updateFields },
      { new: true }
    )
      .populate({
        path: 'user_id',
        select: 'name employee_id avatar_url designation department_id',
        populate: { path: 'department_id', select: 'name' },
      })
      .lean();

    return NextResponse.json({
      message: hold ? 'Salary placed on hold.' : 'Salary hold released.',
      slip: flattenPayrollSlip(updated),
    });
  } catch (err) {
    console.error('payroll PATCH hold', err);
    return NextResponse.json({ error: 'Failed to update salary hold status' }, { status: 500 });
  }
}
