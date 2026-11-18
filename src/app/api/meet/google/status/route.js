import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getGoogleMeetStatus, getGoogleOAuthConfig } from '@/lib/google-meet';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const status = await getGoogleMeetStatus(authUser.id);
    const config = getGoogleOAuthConfig();

    return NextResponse.json({
      success: true,
      connected: status.connected,
      email: status.email,
      isConfigured: config.isConfigured,
      hasEnvRefreshToken: Boolean(config.envRefreshToken),
    });
  } catch (error) {
    console.error('[GET /api/meet/google/status] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

