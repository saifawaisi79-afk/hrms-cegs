import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import GoogleIntegration from '@/lib/models/GoogleIntegration';
import { exchangeGoogleCodeForTokens } from '@/lib/google-meet';

export const dynamic = 'force-dynamic';

function getRequestOrigin(request) {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  const proto = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  if (host) {
    return `${proto}://${host}`;
  }
  return process.env.NEXT_PUBLIC_APP_URL || 'https://cegshrms.in';
}

export async function GET(request) {
  const origin = getRequestOrigin(request);

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state');

    if (error) {
      console.warn('[Google OAuth Callback] Error:', error);
      return NextResponse.redirect(`${origin}/campaign/meetings?google_error=${encodeURIComponent(error)}`);
    }

    if (!code) {
      return NextResponse.redirect(`${origin}/campaign/meetings?google_error=missing_code`);
    }

    let parsedState = {};
    if (state) {
      try {
        parsedState = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
      } catch (e) {}
    }

    // Prefer origin recorded in state to preserve domain (www vs non-www)
    const targetOrigin = parsedState.origin || origin;
    const customCallback = `${targetOrigin}/api/meet/google/callback`;

    const tokenData = await exchangeGoogleCodeForTokens(code, customCallback);

    await connectDB();

    // Store or update integration record
    const userId = parsedState.userId || null;
    const now = Date.now();
    const expiryDate = now + ((tokenData.expiresIn || 3600) * 1000);

    let integration = null;
    if (userId) {
      integration = await GoogleIntegration.findOne({ user_id: userId });
    }
    if (!integration && tokenData.email) {
      integration = await GoogleIntegration.findOne({ google_account_email: tokenData.email });
    }

    if (!integration) {
      integration = new GoogleIntegration({
        user_id: userId,
        google_account_email: tokenData.email || '',
        access_token: tokenData.accessToken,
        refresh_token: tokenData.refreshToken,
        expiry_date: expiryDate,
        scope: tokenData.scope || '',
        is_active: true,
      });
    } else {
      integration.access_token = tokenData.accessToken;
      if (tokenData.refreshToken) {
        integration.refresh_token = tokenData.refreshToken;
      }
      integration.expiry_date = expiryDate;
      integration.google_account_email = tokenData.email || integration.google_account_email;
      integration.is_active = true;
    }

    await integration.save();

    return NextResponse.redirect(`${targetOrigin}/campaign/meetings?google_connected=true&email=${encodeURIComponent(tokenData.email || '')}`);
  } catch (err) {
    console.error('[Google OAuth Callback Exception]:', err);
    return NextResponse.redirect(`${origin}/campaign/meetings?google_error=${encodeURIComponent(err.message || 'callback_failed')}`);
  }
}
