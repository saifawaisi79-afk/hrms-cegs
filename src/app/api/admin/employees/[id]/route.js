import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import { getAuthUser, requireRole } from '@/lib/auth';
import { resolveLoginTime } from '@/lib/attendance-policy';

/**
 * PUT /api/admin/employees/[id]
 * HR/Super Admin updates employee profile, compensation, and login time.
 */
export async function PUT(request, { params }) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Access token required' }, { status: 401 });
    }
    if (!requireRole(authUser, ['admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Employee id is required' }, { status: 400 });
    }

    const body = await request.json();
    const {
      name,
      designation,
      title,
      contact,
      phone,
      joining_date,
      basic_salary,
      salary,
      allowances,
      role,
      address,
      dob,
      employment_type,
      bank_name,
      bankName,
      account_number,
      bankAccount,
      ifsc_code,
      bankIfsc,
      emergency_contact,
      emergencyPhone,
      login_time,
      loginTime,
      status,
    } = body;

    const allowedRoles = ['employee', 'admin', 'super_admin'];
    const updates = {};

    if (name != null && String(name).trim()) updates.name = String(name).trim();
    if (designation != null || title != null) {
      updates.designation = String(designation ?? title ?? '').trim();
    }
    if (contact != null || phone != null) {
      updates.contact = String(contact ?? phone ?? '').trim();
    }
    if (joining_date != null) updates.joining_date = String(joining_date).slice(0, 10);
    if (basic_salary != null || salary != null) {
      updates.basic_salary = Math.max(0, Number(basic_salary ?? salary) || 0);
    }
    if (allowances != null) {
      updates.allowances = Math.max(0, Number(allowances) || 0);
    }
    if (role != null && allowedRoles.includes(role)) updates.role = role;
    if (address != null) updates.address = String(address);
    if (dob != null) updates.dob = String(dob);
    if (employment_type != null) updates.employment_type = String(employment_type);
    if (bank_name != null || bankName != null) {
      updates.bank_name = String(bank_name ?? bankName ?? '');
    }
    if (account_number != null || bankAccount != null) {
      updates.account_number = String(account_number ?? bankAccount ?? '');
    }
    if (ifsc_code != null || bankIfsc != null) {
      updates.ifsc_code = String(ifsc_code ?? bankIfsc ?? '');
    }
    if (emergency_contact != null || emergencyPhone != null) {
      updates.emergency_contact = String(emergency_contact ?? emergencyPhone ?? '');
    }
    if (login_time != null || loginTime != null) {
      updates.login_time = String(login_time ?? loginTime ?? '10:00').slice(0, 5);
    }
    if (status != null && ['active', 'inactive', 'on_leave'].includes(status)) {
      updates.status = status;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    await connectDB();

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { _id: id }
      : { $or: [{ employee_id: id }, { email: String(id).toLowerCase() }] };

    const user = await User.findOneAndUpdate(query, { $set: updates }, { new: true });
    if (!user) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Ensure known special login schedules are persisted if still blank
    if (!user.login_time) {
      const resolved = resolveLoginTime(user);
      if (resolved !== '10:00') {
        user.login_time = resolved;
        await user.save();
      }
    }

    return NextResponse.json({
      id: user._id.toString(),
      employee_id: user.employee_id,
      name: user.name,
      email: user.email,
      role: user.role,
      designation: user.designation,
      joining_date: user.joining_date,
      contact: user.contact,
      status: user.status,
      basic_salary: user.basic_salary ?? 0,
      allowances: user.allowances ?? 0,
      address: user.address || '',
      dob: user.dob || '',
      employment_type: user.employment_type || 'full_time',
      login_time: resolveLoginTime(user),
      bank_name: user.bank_name || '',
      account_number: user.account_number || '',
      ifsc_code: user.ifsc_code || '',
      emergency_contact: user.emergency_contact || '',
      message: 'Employee details updated',
    });
  } catch (error) {
    console.error('Update employee Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
