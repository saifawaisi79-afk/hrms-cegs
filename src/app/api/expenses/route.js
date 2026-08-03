import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Expense from '@/lib/models/Expense';
import { getAuthUser } from '@/lib/auth';

function flattenExpense(e) {
  const obj = e.toObject ? e.toObject() : e;
  return {
    ...obj,
    id: obj._id?.toString(), _id: obj._id?.toString(),
    user_id: obj.user_id?._id?.toString() || obj.user_id?.toString() || null,
    employee_name: obj.user_id?.name || null,
    employee_id: obj.user_id?.employee_id || null,
    department_name: obj.user_id?.department_id?.name || null,
    approved_by: obj.approved_by?.toString() || null,
  };
}

// GET /api/expenses
export async function GET(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });

  await connectDB();
  const filter = authUser.role === 'employee' ? { user_id: authUser.id } : {};
  const expenses = authUser.role === 'employee'
    ? await Expense.find(filter).sort({ date: -1 }).lean()
    : await Expense.find(filter)
        .populate({ path: 'user_id', select: 'name employee_id department_id', populate: { path: 'department_id', select: 'name' } })
        .sort({ date: -1 }).lean();

  return NextResponse.json(expenses.map(e => authUser.role === 'employee'
    ? { ...e, id: e._id?.toString(), _id: e._id?.toString(), user_id: e.user_id?.toString() }
    : flattenExpense(e)));
}

// POST /api/expenses
export async function POST(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });

  const { title, category, amount, date, receipt_url } = await request.json();
  if (!title || !category || !amount || !date) {
    return NextResponse.json({ error: 'Title, category, amount, and date are required' }, { status: 400 });
  }

  await connectDB();
  const expense = await Expense.create({ user_id: authUser.id, title, category, amount, date, receipt_url: receipt_url || null });
  return NextResponse.json({ id: expense._id.toString(), title, category, amount, date, status: 'pending' }, { status: 201 });
}
