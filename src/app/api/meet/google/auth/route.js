import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getGoogleAuthUrl, getGoogleOAuthConfig } from '@/lib/google-meet';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const config = getGoogleOAuthConfig();
    if (!config.isConfigured) {
      return NextResponse.json({
        error: 'Google OAuth credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET) are not configured in environment variables.',
      }, { status: 400 });
    }

    const state = JSON.stringify({ userId: authUser.id, role: authUser.role });
    const authUrl = getGoogleAuthUrl(Buffer.from(state).toString('base64'));

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('[GET /api/meet/google/auth] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

