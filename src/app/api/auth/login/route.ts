import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import { signToken, getClientIp, checkIpAllowed, verifyLocationToken } from '@/lib/auth';
import { PORTAL_HOME } from '@/lib/nav';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  portal: z.enum(['employee', 'admin', 'super_admin']).optional(),
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
    const user = await User.findOne({ email: String(email).trim().toLowerCase() }).lean();

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    if (user.status !== 'active') {
      return NextResponse.json(
        { error: 'Account is deactivated. Contact administrator.' },
        { status: 403 }
      );
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    if (portal) {
      const required = PORTAL_HOME[portal]?.role;
      if (required && required !== user.role) {
        return NextResponse.json(
          {
            error: `This account (${user.role.replace('_', ' ')}) cannot access the ${PORTAL_HOME[portal].label}. Select the matching portal.`,
          },
          { status: 403 }
        );
      }
    }

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
        must_change_password: user.must_change_password ? 1 : 0,
        last_login: nowStr,
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
      msg.includes('ECONNREFUSED') ||
      msg.includes('timed out')
    ) {
      return NextResponse.json(
        {
          error:
            'Cannot reach the database from Vercel. In MongoDB Atlas → Network Access, allow 0.0.0.0/0, verify MONGODB_URI on Vercel, then redeploy.',
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
