import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Payroll from '@/lib/models/Payroll';
import { getAuthUser, requireRole, isSelfServiceRole } from '@/lib/auth';
import { flattenPayrollSlip, processMonthlyPayroll } from '@/lib/attendance-deductions';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });

  await connectDB();
  const filter = isSelfServiceRole(authUser.role) ? { user_id: authUser.id } : {};
  const slips = await Payroll.find(filter)
    .populate({ path: 'user_id', select: 'name employee_id avatar_url designation department_id', populate: { path: 'department_id', select: 'name' } })
    .sort({ year: -1, month: -1 })
    .lean();
  return NextResponse.json(slips.map(flattenPayrollSlip));
}

export async function POST(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });
  if (!requireRole(authUser, ['admin', 'super_admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { month, year } = await request.json();
  if (!month || !year) return NextResponse.json({ error: 'Month and year are required' }, { status: 400 });

  await connectDB();
  try {
    const result = await processMonthlyPayroll(month, year);
    return NextResponse.json({
      message: `Successfully processed payroll for ${result.processed_count} employees.`,
      ...result,
    });
  } catch (err) {
    console.error('payroll POST', err);
    return NextResponse.json({ error: 'Failed to process payroll' }, { status: 500 });
  }
}
