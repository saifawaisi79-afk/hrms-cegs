import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import GoogleIntegration from '@/lib/models/GoogleIntegration';
import { exchangeGoogleCodeForTokens } from '@/lib/google-meet';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state');

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';

    if (error) {
      console.warn('[Google OAuth Callback] Error:', error);
      return NextResponse.redirect(`${appUrl}/campaign/meetings?google_error=${encodeURIComponent(error)}`);
    }

    if (!code) {
      return NextResponse.redirect(`${appUrl}/campaign/meetings?google_error=missing_code`);
    }

    let parsedState = {};
    if (state) {
      try {
        parsedState = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
      } catch (e) {}
    }

    const tokenData = await exchangeGoogleCodeForTokens(code);

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

    return NextResponse.redirect(`${appUrl}/campaign/meetings?google_connected=true&email=${encodeURIComponent(tokenData.email || '')}`);
  } catch (err) {
    console.error('[Google OAuth Callback Exception]:', err);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    return NextResponse.redirect(`${appUrl}/campaign/meetings?google_error=${encodeURIComponent(err.message)}`);
  }
}

