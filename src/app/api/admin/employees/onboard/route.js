import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import { getAuthUser, requireRole } from '@/lib/auth';

/**
 * POST /api/admin/employees/onboard
 * HR/Super Admin creates an employee with a generated permanent password.
 */
export async function POST(request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Access token required' }, { status: 401 });
    }
    if (!requireRole(authUser, ['admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      email,
      employee_id,
      password,
      role = 'employee',
      department_id,
      reports_to,
      designation,
      joining_date,
      contact,
      basic_salary,
      bank_name,
      account_number,
      ifsc_code,
      emergency_contact,
      address,
      dob,
      employment_type,
    } = body;

    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanId = String(employee_id || '').trim();
    const cleanPass = String(password || '').trim();
    const cleanName = String(name || '').trim();

    if (!cleanName || !cleanEmail || !cleanId || !cleanPass) {
      return NextResponse.json(
        { error: 'Name, email, employee ID, and password are required' },
        { status: 400 }
      );
    }
    if (cleanPass.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const allowedRoles = ['employee', 'admin', 'super_admin'];
    const safeRole = allowedRoles.includes(role) ? role : 'employee';

    await connectDB();

    const existing = await User.findOne({
      $or: [{ email: cleanEmail }, { employee_id: cleanId }],
    }).lean();
    if (existing) {
      return NextResponse.json(
        { error: 'Employee ID or email already exists' },
        { status: 409 }
      );
    }

    const password_hash = await bcrypt.hash(cleanPass, 10);
    const deptId =
      department_id && mongoose.Types.ObjectId.isValid(String(department_id))
        ? department_id
        : null;
    const reportsToId =
      reports_to && mongoose.Types.ObjectId.isValid(String(reports_to))
        ? reports_to
        : null;

    const user = await User.create({
      employee_id: cleanId,
      name: cleanName,
      email: cleanEmail,
      password_hash,
      role: safeRole,
      department_id: deptId,
      reports_to: reportsToId,
      designation: designation || '',
      joining_date: joining_date || new Date().toISOString().split('T')[0],
      contact: contact || '',
      status: 'active',
      basic_salary: Number(basic_salary) || 30000,
      bank_name: bank_name || '',
      account_number: account_number || '',
      ifsc_code: ifsc_code || '',
      emergency_contact: emergency_contact || '',
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanName)}`,
      must_change_password: false,
      temp_password_expires_at: null,
    });

    return NextResponse.json(
      {
        id: user._id.toString(),
        employee_id: user.employee_id,
        name: user.name,
        email: user.email,
        role: user.role,
        designation: user.designation,
        status: user.status,
        message: 'Employee onboarded. Share the generated credentials securely.',
        meta: { address, dob, employment_type },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Onboard Error:', error);
    if (error?.code === 11000) {
      return NextResponse.json({ error: 'Employee ID or email already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
