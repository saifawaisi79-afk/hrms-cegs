import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import { getAuthUser } from '@/lib/auth';
import { resolveLoginTime } from '@/lib/attendance-policy';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    await connectDB();
    let user = null;
    if (authUser.id) {
      user = await User.findById(authUser.id).populate('department_id', 'name').lean();
    }
    if (!user && authUser.email) {
      user = await User.findOne({ email: authUser.email.toLowerCase() }).populate('department_id', 'name').lean();
    }

    if (!user) {
      return NextResponse.json({ success: false, error: 'User profile not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        _id: user._id.toString(),
        employee_id: user.employee_id,
        name: user.name,
        email: user.email,
        role: user.role,
        designation: user.designation,
        title: user.designation,
        joining_date: user.joining_date,
        contact: user.contact,
        phone: user.contact,
        status: user.status,
        avatar_url: user.avatar_url,
        avatar: user.avatar_url,
        basic_salary: user.basic_salary ?? 0,
        salary: user.basic_salary ?? 0,
        allowances: user.allowances ?? 0,
        address: user.address || '',
        dob: user.dob || '',
        employment_type: user.employment_type || 'full_time',
        login_time: resolveLoginTime(user),
        bank_name: user.bank_name || '',
        bankName: user.bank_name || '',
        account_number: user.account_number || '',
        bankAccount: user.account_number || '',
        ifsc_code: user.ifsc_code || '',
        bankIfsc: user.ifsc_code || '',
        emergency_contact: user.emergency_contact || '',
        emergencyPhone: user.emergency_contact || '',
        degrees: user.degrees || '',
      },
    });
  } catch (err) {
    console.error('GET /api/auth/profile error:', err);
    return NextResponse.json({ success: false, error: 'Failed to retrieve profile' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    await connectDB();

    const updates = {};

    // 1. Avatar persistence (always permitted for all logged-in users)
    const newAvatar = body.avatar_url ?? body.avatar;
    if (newAvatar !== undefined) {
      const cleanAvatar = typeof newAvatar === 'string' ? newAvatar.trim() : '';
      if (cleanAvatar.length > 100000) {
        return NextResponse.json({ success: false, error: 'Avatar image is too large. Max allowed compressed size is 75KB.' }, { status: 400 });
      }
      updates.avatar_url = cleanAvatar;
    }

    // 2. Personal contact entries (always permitted for self-management)
    const newContact = body.contact ?? body.phone;
    if (newContact !== undefined) {
      updates.contact = String(newContact).trim();
    }

    const newEmergency = body.emergency_contact ?? body.emergencyPhone;
    if (newEmergency !== undefined) {
      updates.emergency_contact = String(newEmergency).trim();
    }

    if (body.address !== undefined) {
      updates.address = String(body.address).trim();
    }

    if (body.dob !== undefined) {
      updates.dob = String(body.dob).trim();
    }

    if (body.degrees !== undefined) {
      updates.degrees = String(body.degrees).trim();
    }

    // 3. Admin / HR elevated edits
    const isAdminOrHR = ['admin', 'super_admin'].includes(authUser.role);
    if (isAdminOrHR) {
      if (body.name) updates.name = String(body.name).trim();
      if (body.designation || body.title) updates.designation = String(body.designation || body.title).trim();
      if (body.basic_salary != null || body.salary != null) {
        updates.basic_salary = Math.max(0, Number(body.basic_salary ?? body.salary) || 0);
      }
      if (body.allowances != null) {
        updates.allowances = Math.max(0, Number(body.allowances) || 0);
      }
      if (body.bank_name || body.bankName) updates.bank_name = String(body.bank_name || body.bankName).trim();
      if (body.account_number || body.bankAccount) updates.account_number = String(body.account_number || body.bankAccount).trim();
      if (body.ifsc_code || body.bankIfsc) updates.ifsc_code = String(body.ifsc_code || body.bankIfsc).trim();
      if (body.joining_date) updates.joining_date = String(body.joining_date).slice(0, 10);
      if (body.employment_type) updates.employment_type = String(body.employment_type);
      if (body.login_time || body.loginTime) {
        updates.login_time = String(body.login_time || body.loginTime).slice(0, 5);
      }
    }

    let updated = null;
    if (authUser.id) {
      updated = await User.findByIdAndUpdate(
        authUser.id,
        { $set: updates },
        { new: true }
      ).populate('department_id', 'name').lean();
    }

    if (!updated && authUser.email) {
      updated = await User.findOneAndUpdate(
        { email: authUser.email.toLowerCase() },
        { $set: updates },
        { new: true }
      ).populate('department_id', 'name').lean();
    }

    if (!updated) {
      return NextResponse.json({ success: false, error: 'User not found in database' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updated._id.toString(),
        _id: updated._id.toString(),
        employee_id: updated.employee_id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        designation: updated.designation,
        title: updated.designation,
        contact: updated.contact,
        phone: updated.contact,
        avatar_url: updated.avatar_url,
        avatar: updated.avatar_url,
        status: updated.status,
        basic_salary: updated.basic_salary ?? 0,
        salary: updated.basic_salary ?? 0,
        allowances: updated.allowances ?? 0,
        address: updated.address || '',
        dob: updated.dob || '',
        employment_type: updated.employment_type || 'full_time',
        login_time: resolveLoginTime(updated),
        bank_name: updated.bank_name || '',
        bankName: updated.bank_name || '',
        account_number: updated.account_number || '',
        bankAccount: updated.account_number || '',
        ifsc_code: updated.ifsc_code || '',
        bankIfsc: updated.ifsc_code || '',
        emergency_contact: updated.emergency_contact || '',
        emergencyPhone: updated.emergency_contact || '',
        degrees: updated.degrees || '',
      },
    });
  } catch (err) {
    console.error('PUT /api/auth/profile error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to update profile' },
      { status: 500 }
    );
  }
}
