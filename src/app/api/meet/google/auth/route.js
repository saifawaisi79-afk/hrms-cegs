import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getGoogleAuthUrl, getGoogleOAuthConfig } from '@/lib/google-meet';

export const dynamic = 'force-dynamic';

function getRequestOrigin(request) {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  const proto = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  if (host) {
    return `${proto}://${host}`;
  }
  return process.env.NEXT_PUBLIC_APP_URL || 'https://cegshrms.in';
}

function wantsJson(request) {
  const accept = request.headers.get('accept') || '';
  const isPost = request.method === 'POST';
  const format = new URL(request.url).searchParams.get('format');
  if (format === 'json' || isPost) return true;
  return accept.includes('application/json') && !accept.includes('text/html');
}

async function handleAuthInitiation(request) {
  const origin = getRequestOrigin(request);
  const jsonPreferred = wantsJson(request);

  try {
    const authUser = getAuthUser(request);

    // 1. Session verification
    if (!authUser) {
      if (jsonPreferred) {
        return NextResponse.json({
          error: 'Authentication required',
          redirectUrl: `${origin}/login?redirect=${encodeURIComponent('/api/meet/google/auth')}`,
        }, { status: 401 });
      }
      // Top-level browser navigation: Redirect to HRMS login page with return url
      return NextResponse.redirect(`${origin}/login?redirect=${encodeURIComponent('/api/meet/google/auth')}`);
    }

    // 2. Role verification (Admin & Super Admin, or HR)
    const userRole = String(authUser.role || '').toLowerCase();
    const allowedRoles = ['admin', 'super_admin', 'hr'];
    if (!allowedRoles.includes(userRole)) {
      if (jsonPreferred) {
        return NextResponse.json({
          error: 'Forbidden: Only administrators can connect the Google Meet integration.',
        }, { status: 403 });
      }
      return NextResponse.redirect(`${origin}/campaign/meetings?google_error=forbidden_role`);
    }

    // 3. OAuth configuration verification
    const config = getGoogleOAuthConfig();
    if (!config.isConfigured) {
      const errMessage = 'Google OAuth credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET) are not configured in environment variables.';
      if (jsonPreferred) {
        return NextResponse.json({ error: errMessage }, { status: 400 });
      }
      return NextResponse.redirect(`${origin}/campaign/meetings?google_error=not_configured`);
    }

    // 4. Generate Google OAuth consent URL with state
    const customCallback = `${origin}/api/meet/google/callback`;
    const stateObj = {
      userId: authUser.id,
      role: authUser.role,
      origin,
      timestamp: Date.now(),
    };
    const state = Buffer.from(JSON.stringify(stateObj)).toString('base64');
    const authUrl = getGoogleAuthUrl(state, customCallback);

    // 5. Response
    if (jsonPreferred) {
      return NextResponse.json({ success: true, authUrl });
    }

    // Standard browser navigation: 302 redirect directly to Google consent screen
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('[GET/POST /api/meet/google/auth] Error:', error);
    if (jsonPreferred) {
      return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
    return NextResponse.redirect(`${origin}/campaign/meetings?google_error=${encodeURIComponent(error.message || 'auth_init_failed')}`);
  }
}

export async function GET(request) {
  return handleAuthInitiation(request);
}

export async function POST(request) {
  return handleAuthInitiation(request);
}
