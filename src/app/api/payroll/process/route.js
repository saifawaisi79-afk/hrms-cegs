import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Payroll from '@/lib/models/Payroll';
import User from '@/lib/models/User';
import Timesheet from '@/lib/models/Timesheet';
import { getAuthUser, requireRole } from '@/lib/auth';

// POST /api/payroll/process
export async function POST(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });
  if (!requireRole(authUser, ['admin', 'super_admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { month, year } = await request.json();
  if (!month || !year) return NextResponse.json({ error: 'Month and year are required' }, { status: 400 });

  await connectDB();
  const employees = await User.find({ status: { $in: ['active', 'on_leave'] } }).select('_id basic_salary').lean();
  let count = 0;

  for (const emp of employees) {
    const basic = emp.basic_salary;
    const allowances = Math.round(basic * 0.15);
    const monthStr = String(month).padStart(2, '0');
    const startStr = `${year}-${monthStr}-01`;
    const endStr = `${year}-${monthStr}-31`;

    const tsAgg = await Timesheet.aggregate([
      { $match: { user_id: emp._id, status: 'approved', date: { $gte: startStr, $lte: endStr } } },
      { $group: { _id: null, total: { $sum: '$duration' } } },
    ]);
    const totalHrs = tsAgg[0]?.total || 0;
    const otHours = Math.max(0, totalHrs - 160);
    const overtime = Math.round(otHours * 25);
    const bonus = 0;
    const deductions = Math.round((basic + allowances + overtime) * 0.1);
    const netSalary = (basic + allowances + overtime + bonus) - deductions;
    const processedDate = new Date().toISOString().split('T')[0];

    await Payroll.findOneAndUpdate(
      { user_id: emp._id, month, year },
      { user_id: emp._id, month, year, basic_salary: basic, allowances, overtime, bonus, deductions, net_salary: netSalary, status: 'processed', processed_date: processedDate },
      { upsert: true }
    );
    count++;
  }

  return NextResponse.json({ message: `Successfully processed payroll for ${count} employees.`, processed_count: count });
}
