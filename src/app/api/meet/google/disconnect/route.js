import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import GoogleIntegration from '@/lib/models/GoogleIntegration';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!['admin', 'super_admin'].includes(authUser.role)) {
      return NextResponse.json({ error: 'Only administrators can manage Google Meet integration' }, { status: 403 });
    }

    await connectDB();
    await GoogleIntegration.deleteMany({});

    return NextResponse.json({
      success: true,
      message: 'Google Meet account disconnected successfully.',
    });
  } catch (error) {
    console.error('[POST /api/meet/google/disconnect] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

