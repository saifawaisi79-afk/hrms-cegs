import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import Department from '@/lib/models/Department';
import { getAuthUser, requireRole } from '@/lib/auth';

function serializeUser(u, elevated = true) {
  const obj = u.toObject ? u.toObject() : u;
  const base = {
    id: obj._id?.toString(),
    _id: obj._id?.toString(),
    employee_id: obj.employee_id,
    name: obj.name,
    email: obj.email,
    role: obj.role,
    department_id: obj.department_id?._id?.toString() || obj.department_id?.toString() || null,
    department_name: obj.department_id?.name || null,
    designation: obj.designation,
    joining_date: obj.joining_date,
    contact: obj.contact,
    status: obj.status,
    avatar_url: obj.avatar_url,
    reports_to: obj.reports_to?._id?.toString() || obj.reports_to?.toString() || null,
    reports_to_name: obj.reports_to?.name || null,
  };
  if (elevated) {
    base.basic_salary = obj.basic_salary;
    base.bank_name = obj.bank_name;
    base.account_number = obj.account_number;
    base.ifsc_code = obj.ifsc_code;
    base.emergency_contact = obj.emergency_contact;
    base.last_login = obj.last_login;
    base.must_change_password = obj.must_change_password ? 1 : 0;
  }
  return base;
}

// GET /api/employees
export async function GET(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });

  const elevated = ['admin', 'super_admin'].includes(authUser.role);
  await connectDB();

  let query = User.find(elevated ? {} : { status: 'active' })
    .populate('department_id', 'name')
    .populate('reports_to', 'name');

  if (!elevated) {
    query = query.select('employee_id name email role department_id designation joining_date status avatar_url');
  }

  const users = await query.lean();
  return NextResponse.json(users.map(u => serializeUser(u, elevated)));
}

// POST /api/employees
export async function POST(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });
  if (!requireRole(authUser, ['admin', 'super_admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { name, email, employee_id, role, department_id, reports_to, designation, joining_date, contact, status, basic_salary, password } = body;

  if (!name || !email || !employee_id || !role) {
    return NextResponse.json({ error: 'Name, email, employee ID and role are required' }, { status: 400 });
  }

  const cleanPass = String(password || '').trim();
  if (!cleanPass || cleanPass.length < 6) {
    return NextResponse.json(
      { error: 'A password (min 6 chars) is required — generate one via HR Onboarding' },
      { status: 400 }
    );
  }

  await connectDB();
  try {
    const passwordHash = await bcrypt.hash(cleanPass, 10);
    const user = await User.create({
      employee_id,
      name,
      email: String(email).trim().toLowerCase(),
      password_hash: passwordHash,
      role,
      department_id: department_id || null,
      reports_to: reports_to || null,
      designation: designation || '',
      joining_date: joining_date || new Date().toISOString().split('T')[0],
      contact: contact || '',
      status: status || 'active',
      basic_salary: basic_salary || 3000,
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
      must_change_password: false,
    });
    return NextResponse.json({ id: user._id.toString(), name, email: user.email, employee_id, role }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Employee ID or email already exists' }, { status: 500 });
  }
}
