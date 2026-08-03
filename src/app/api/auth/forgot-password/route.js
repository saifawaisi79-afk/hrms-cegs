import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';

/**
 * Forgot-password no longer resets to a hardcoded password or returns credentials.
 * Safe acknowledgement only until email-based reset is wired.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const email = String(body?.email || '').trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    await connectDB();
    await User.findOne({ email });

    return NextResponse.json({
      message: 'If an account exists for that email, password reset instructions will be sent when email delivery is enabled. Contact your administrator for urgent access.',
    });
  } catch {
    return NextResponse.json({
      message: 'If an account exists for that email, password reset instructions will be sent when email delivery is enabled. Contact your administrator for urgent access.',
    });
  }
}
