import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import SystemSetting from '@/lib/models/SystemSetting';
import { signToken, getClientIp, checkIpAllowed, verifyLocationToken } from '@/lib/auth';
import { PORTAL_HOME } from '@/lib/nav';
import { resolveLoginTime } from '@/lib/attendance-policy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  portal: z.enum(['employee', 'admin', 'super_admin', 'finance', 'it_team', 'IT_TEAM']).optional(),
  workMode: z.enum(['WFO', 'WFH']).default('WFH'),
  locationToken: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (!checkIpAllowed(clientIp)) {
      return NextResponse.json(
        { error: 'Access denied. Please connect to the office network to log in.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parseResult = loginSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { email, password, portal, workMode, locationToken } = parseResult.data;
    const nowStr = new Date().toISOString();

    // Production WFO gate — must present a fresh location attestation JWT
    if (workMode === 'WFO') {
      if (!locationToken) {
        return NextResponse.json(
          { error: 'Office location verification required for Work From Office login.' },
          { status: 403 }
        );
      }
      const loc = verifyLocationToken(locationToken);
      if (!loc) {
        return NextResponse.json(
          { error: 'Location verification expired or invalid. Verify office location again.' },
          { status: 403 }
        );
      }
    }

    await connectDB();
    let user = null;
    try {
      user = await User.findOne({ email: String(email).trim().toLowerCase() }).lean();
    } catch (dbErr: any) {
      console.warn('Initial User.findOne failed, reconnecting and retrying...', dbErr.message);
      await connectDB();
      user = await User.findOne({ email: String(email).trim().toLowerCase() }).lean();
    }

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    if (user.status === 'inactive') {
      return NextResponse.json(
        { error: 'Account is deactivated. Contact administrator.' },
        { status: 403 }
      );
    }
    // active and on_leave may log in; inactive is blocked above

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Role-based portal check if specific portal was selected on login screen
    if (portal) {
      const p = String(portal).toLowerCase();
      const userRole = String(user.role || '').toLowerCase();
      if (p === 'it_team') {
        const isItDesignation = /developer|architect|software|system|engineer|it|programmer|tech/i.test(String(user.designation || ''));
        if (userRole !== 'it_team' && !isItDesignation) {
          return NextResponse.json(
            { error: 'Access denied: You do not have permission to access the IT Team portal.' },
            { status: 403 }
          );
        }
        if (userRole !== 'it_team' && isItDesignation) {
          user.role = 'IT_TEAM';
          await User.findByIdAndUpdate(user._id, { role: 'IT_TEAM' });
        }
      }
      if (p === 'finance' && userRole !== 'finance' && userRole !== 'admin' && userRole !== 'super_admin') {
        return NextResponse.json(
          { error: 'Access denied: You do not have permission to access the Finance portal.' },
          { status: 403 }
        );
      }
      if (p === 'admin' && userRole !== 'admin' && userRole !== 'super_admin') {
        return NextResponse.json(
          { error: 'Access denied: You do not have permission to access the HR Admin portal.' },
          { status: 403 }
        );
      }
      if (p === 'super_admin' && userRole !== 'super_admin') {
        return NextResponse.json(
          { error: 'Access denied: You do not have permission to access the Super Admin portal.' },
          { status: 403 }
        );
      }
    }

    // Check HRMS Stop status (Admins and Super Admins can still log in to manage)
    try {
      const hrmsStopSetting = await (SystemSetting as any).findOne({ key: 'hrms_stopped' }).lean();
      if (hrmsStopSetting?.value === 'true' && !['admin', 'super_admin'].includes(user.role)) {
        const annSetting = await (SystemSetting as any).findOne({ key: 'hrms_announcement' }).lean();
        return NextResponse.json(
          { error: annSetting?.value || 'HRMS operations are currently paused by administration. Please check back later.' },
          { status: 503 }
        );
      }
    } catch (e) {
      console.warn('HRMS stop check warning:', e);
    }

    // Check Work From Home (WFH) permission for employees
    if (workMode === 'WFH') {
      const isPrivileged = ['admin', 'super_admin', 'finance'].includes(user.role);
      if (!isPrivileged && !user.wfh_allowed) {
        return NextResponse.json(
          { error: 'Work From Home (WFH) is not enabled for your account. Please select Work From Office (WFO) or contact HR.' },
          { status: 403 }
        );
      }
    }

    // Auto-resolve user's actual role and authorized home portal
    const resolvedPortal = user.role || 'employee';
    const targetHome = PORTAL_HOME[resolvedPortal]?.path || '/dashboard';

    await User.findByIdAndUpdate(user._id, { last_login: nowStr });

    const token = signToken({
      id: user._id.toString(),
      employee_id: user.employee_id,
      name: user.name,
      email: user.email,
      role: user.role,
      department_id: user.department_id?.toString() || null,
      avatar_url: user.avatar_url,
      workMode,
    });

    return NextResponse.json({
      token,
      portal: resolvedPortal,
      homePath: targetHome,
      user: {
        id: user._id.toString(),
        employee_id: user.employee_id,
        name: user.name,
        email: user.email,
        role: user.role,
        department_id: user.department_id?.toString() || null,
        designation: user.designation,
        joining_date: user.joining_date,
        contact: user.contact,
        status: user.status,
        avatar_url: user.avatar_url,
        basic_salary: user.basic_salary ?? 0,
        salary: user.basic_salary ?? 0,
        allowances: user.allowances ?? 0,
        address: user.address || '',
        dob: user.dob || '',
        employment_type: user.employment_type || 'full_time',
        login_time: resolveLoginTime(user),
        bank_name: user.bank_name || '',
        account_number: user.account_number || '',
        ifsc_code: user.ifsc_code || '',
        emergency_contact: user.emergency_contact || '',
        must_change_password: user.must_change_password ? 1 : 0,
        last_login: nowStr,
        wfh_allowed: !!user.wfh_allowed,
        workMode,
      },
    });
  } catch (error: any) {
    console.error('Login Error:', error);
    const msg = String(error?.message || '');
    if (msg.includes('MONGODB_URI')) {
      return NextResponse.json(
        { error: 'Server misconfigured: MONGODB_URI is missing on Vercel. Add it under Environment Variables and redeploy.' },
        { status: 503 }
      );
    }
    if (msg.includes('JWT_SECRET')) {
      return NextResponse.json(
        { error: 'Server misconfigured: JWT_SECRET is missing on Vercel. Add it under Environment Variables and redeploy.' },
        { status: 503 }
      );
    }
    if (
      error?.name === 'MongooseServerSelectionError' ||
      msg.includes('MongoDB') ||
      msg.includes('MONGODB_URI') ||
      msg.includes('Invalid scheme') ||
      msg.includes('Invalid MONGODB_URI') ||
      msg.includes('ECONNREFUSED') ||
      msg.includes('timed out')
    ) {
      return NextResponse.json(
        {
          error:
            msg.includes('Invalid') || msg.includes('scheme')
              ? 'MONGODB_URI on Vercel is invalid. Paste ONLY the connection string (starts with mongodb+srv://), no quotes and no MONGODB_URI= prefix.'
              : 'Cannot reach the database from Vercel. In MongoDB Atlas → Network Access allow 0.0.0.0/0, verify MONGODB_URI on Vercel, then redeploy.',
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
