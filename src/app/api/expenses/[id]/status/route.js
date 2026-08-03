import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Expense from '@/lib/models/Expense';
import { getAuthUser, requireRole } from '@/lib/auth';

// PUT /api/expenses/[id]/status
export async function PUT(request, { params }) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });
  if (!requireRole(authUser, ['admin', 'super_admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { status } = await request.json();
  if (!['approved', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  await connectDB();
  await Expense.findByIdAndUpdate(params.id, { status, approved_by: authUser.id });
  return NextResponse.json({ message: `Expense request has been ${status}` });
}
