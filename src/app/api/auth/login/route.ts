import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import { signToken, getClientIp, checkIpAllowed } from '@/lib/auth';
import { findSeedUser } from '@/lib/seed-auth';

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

function tokenForSeed(user: NonNullable<ReturnType<typeof findSeedUser>>) {
  return signToken({
    id: user.id,
    employee_id: user.employee_id,
    name: user.name,
    email: user.email,
    role: user.role,
    department_id: user.department_id,
    avatar_url: user.avatar_url,
    seed: true,
  });
}

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

    const { email, password } = parseResult.data;
    const nowStr = new Date().toISOString();

    // MongoDB user first
    try {
      await connectDB();
      const user = await User.findOne({ email }).lean();

      if (user) {
        if (user.status !== 'active') {
          return NextResponse.json(
            { error: 'Account is deactivated. Contact administrator.' },
            { status: 403 }
          );
        }

        const match = await bcrypt.compare(password, user.password_hash);
        if (match) {
          await User.findByIdAndUpdate(user._id, { last_login: nowStr });

          const token = signToken({
            id: user._id.toString(),
            employee_id: user.employee_id,
            name: user.name,
            email: user.email,
            role: user.role,
            department_id: user.department_id?.toString() || null,
            avatar_url: user.avatar_url,
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
            },
          });
        }
        // Wrong Mongo password — fall through to seed auth when enabled
      }
    } catch (dbErr) {
      console.warn('Login Mongo lookup failed, trying seed auth:', (dbErr as Error)?.message);
    }

    // Seed/demo users — JWT still signed with env JWT_SECRET (no hardcoded secret)
    const seed = findSeedUser(email, password);
    if (seed) {
      const token = tokenForSeed(seed);
      return NextResponse.json({
        token,
        user: {
          id: seed.id,
          employee_id: seed.employee_id,
          name: seed.name,
          email: seed.email,
          role: seed.role,
          department_id: seed.department_id,
          designation: seed.designation,
          status: 'active',
          avatar_url: seed.avatar_url,
          must_change_password: 0,
          last_login: nowStr,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  } catch (error: any) {
    console.error('Login Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
