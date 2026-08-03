import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import { getAuthUser, requireRole } from '@/lib/auth';

function toId(v) { return v?._id?.toString() || v?.toString() || null; }

// GET /api/employees/[id]
export async function GET(request, { params }) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });

  if (authUser.role === 'employee' && authUser.id !== params.id) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  await connectDB();
  const user = await User.findById(params.id).populate('department_id', 'name').populate('reports_to', 'name').lean();

  if (!user) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

  const obj = {
    id: user._id.toString(),
    _id: user._id.toString(),
    employee_id: user.employee_id,
    name: user.name,
    email: user.email,
    role: user.role,
    department_id: toId(user.department_id),
    department_name: user.department_id?.name || null,
    reports_to: toId(user.reports_to),
    reports_to_name: user.reports_to?.name || null,
    designation: user.designation,
    joining_date: user.joining_date,
    contact: user.contact,
    status: user.status,
    basic_salary: user.basic_salary,
    avatar_url: user.avatar_url,
    bank_name: user.bank_name,
    account_number: user.account_number,
    ifsc_code: user.ifsc_code,
    emergency_contact: user.emergency_contact,
    last_login: user.last_login,
    must_change_password: user.must_change_password ? 1 : 0,
  };

  return NextResponse.json(obj);
}

// PUT /api/employees/[id]
export async function PUT(request, { params }) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });

  if (authUser.role === 'employee' && authUser.id !== params.id) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const body = await request.json();
  const { name, email, role: newRole, department_id, reports_to, designation, contact, status, basic_salary, password } = body;

  await connectDB();
  const current = await User.findById(params.id);
  if (!current) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

  const isEmployee = authUser.role === 'employee';
  const updateData = {
    name: name || current.name,
    email: email || current.email,
    role: isEmployee ? current.role : (newRole || current.role),
    department_id: isEmployee ? current.department_id : department_id,
    reports_to: isEmployee ? current.reports_to : reports_to,
    designation: isEmployee ? current.designation : (designation || current.designation),
    contact: contact || current.contact,
    status: isEmployee ? current.status : (status || current.status),
    basic_salary: isEmployee ? current.basic_salary : (basic_salary || current.basic_salary),
  };

  if (password) {
    updateData.password_hash = await bcrypt.hash(password, 10);
  }

  await User.findByIdAndUpdate(params.id, updateData);
  return NextResponse.json({ message: 'Employee profile updated successfully' });
}

// DELETE /api/employees/[id]
export async function DELETE(request, { params }) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });
  if (!requireRole(authUser, ['admin', 'super_admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectDB();
  await User.findByIdAndUpdate(params.id, { status: 'inactive' });
  return NextResponse.json({ message: 'Employee deactivated successfully' });
}
