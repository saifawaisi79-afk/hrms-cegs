import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getAuthUser, requireRole } from '@/lib/auth';
import { processMonthlyPayroll } from '@/lib/attendance-deductions';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });
  if (!requireRole(authUser, ['super_admin'])) {
    return NextResponse.json({ error: 'Forbidden. Only Super Admin can process payroll.' }, { status: 403 });
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
    console.error('payroll/process POST', err);
    return NextResponse.json({ error: 'Failed to process payroll' }, { status: 500 });
  }
}
