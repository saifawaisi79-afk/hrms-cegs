/**
 * Official Google Meet REST API Service
 * Reference: https://developers.google.com/workspace/meet/api/guides/overview
 * Handles OAuth 2.0 token management, space creation, and meeting metadata.
 */

import connectDB from '@/lib/db';
import GoogleIntegration from '@/lib/models/GoogleIntegration';

export const GOOGLE_MEET_SCOPES = [
  'https://www.googleapis.com/auth/meetings.space.created',
  'https://www.googleapis.com/auth/meetings.space.readonly',
  'https://www.googleapis.com/auth/meetings.conference.media.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

/**
 * Returns OAuth credentials configured in environment variables.
 */
export function getGoogleOAuthConfig(customRedirectUri = '') {
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || customRedirectUri || `${process.env.NEXT_PUBLIC_APP_URL || 'https://cegshrms.in'}/api/meet/google/callback`;
  const envRefreshToken = process.env.GOOGLE_REFRESH_TOKEN || '';

  return {
    clientId,
    clientSecret,
    redirectUri,
    envRefreshToken,
    isConfigured: Boolean(clientId && clientSecret),
  };
}

/**
 * Builds Google OAuth 2.0 authorization URL for organizer or admin consent.
 */
export function getGoogleAuthUrl(state = '', customRedirectUri = '') {
  const config = getGoogleOAuthConfig(customRedirectUri);
  if (!config.clientId) {
    throw new Error('GOOGLE_CLIENT_ID is not configured in environment variables.');
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: GOOGLE_MEET_SCOPES,
    access_type: 'offline',
    prompt: 'consent',
  });

  if (state) {
    params.set('state', state);
  }

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchanges authorization code for access and refresh tokens.
 */
export async function exchangeGoogleCodeForTokens(code, customRedirectUri = '') {
  const config = getGoogleOAuthConfig(customRedirectUri);
  if (!config.clientId || !config.clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET missing.');
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error_description || data.error || 'Failed to exchange authorization code with Google');
  }

  // Retrieve user's email address
  let email = '';
  if (data.access_token) {
    try {
      const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      const userinfo = await userinfoRes.json();
      if (userinfo.email) email = userinfo.email;
    } catch (e) {
      console.warn('[Google userinfo warning]:', e.message);
    }
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    scope: data.scope,
    email,
  };
}

/**
 * Uses a refresh token to mint a fresh access token.
 */
export async function refreshGoogleAccessToken(refreshToken) {
  const config = getGoogleOAuthConfig();
  if (!config.clientId || !config.clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET missing for token refresh.');
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error_description || data.error || 'Failed to refresh Google access token');
  }

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}

/**
 * Retrieves a valid Google access token, auto-refreshing if necessary.
 */
export async function getGoogleAccessToken(userId = null) {
  await connectDB();
  const config = getGoogleOAuthConfig();

  // 1. Look for user-specific or system-wide GoogleIntegration in MongoDB
  let integration = null;
  if (userId) {
    integration = await GoogleIntegration.findOne({ user_id: userId, is_active: true });
  }
  if (!integration) {
    integration = await GoogleIntegration.findOne({ is_active: true }).sort({ updatedAt: -1 });
  }

  const now = Date.now();

  // If found in database
  if (integration && integration.refresh_token) {
    // If access token is still valid (with 60-second buffer)
    if (integration.access_token && integration.expiry_date > now + 60000) {
      return {
        accessToken: integration.access_token,
        email: integration.google_account_email,
        isConnected: true,
      };
    }

    // Refresh token
    try {
      const refreshed = await refreshGoogleAccessToken(integration.refresh_token);
      integration.access_token = refreshed.accessToken;
      integration.expiry_date = now + (refreshed.expiresIn * 1000);
      await integration.save();

      return {
        accessToken: integration.access_token,
        email: integration.google_account_email,
        isConnected: true,
      };
    } catch (err) {
      console.error('[Google Meet] Token refresh error:', err.message);
      // Fall through to env fallback if database refresh failed
    }
  }

  // 2. Check environment variable fallback
  if (config.envRefreshToken && config.clientId && config.clientSecret) {
    try {
      const refreshed = await refreshGoogleAccessToken(config.envRefreshToken);
      return {
        accessToken: refreshed.accessToken,
        email: 'system-configured@google',
        isConnected: true,
      };
    } catch (err) {
      console.error('[Google Meet] Env token refresh error:', err.message);
    }
  }

  return {
    accessToken: null,
    email: '',
    isConnected: false,
  };
}

/**
 * Creates an official Google Meet Space using Google Workspace Meet REST API v2
 * API: POST https://meet.googleapis.com/v2/spaces
 * Fallback: Google Calendar API with conferenceDataVersion=1
 */
export async function createGoogleMeetSpace({
  title = 'CEGS Team Meeting',
  userId = null,
  startIso = null,
  endIso = null,
}) {
  const { accessToken, isConnected, email } = await getGoogleAccessToken(userId);

  if (!isConnected || !accessToken) {
    throw new Error(
      'Google Meet is not connected. Please connect your Google account in CEGS Meet Settings or configure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REFRESH_TOKEN.'
    );
  }

  let lastError = null;

  // 1. PRIMARY METHOD: Official Google Meet REST API v2 (spaces.create)
  try {
    const meetRes = await fetch('https://meet.googleapis.com/v2/spaces', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        config: {
          accessType: 'OPEN',
        },
      }),
    });

    const meetData = await meetRes.json();

    if (meetRes.ok && meetData.meetingUri) {
      return {
        googleMeetUrl: meetData.meetingUri, // e.g. "https://meet.google.com/abc-defg-hij"
        googleMeetSpaceName: meetData.name || '', // e.g. "spaces/abc-defg-hij"
        googleMeetCode: meetData.meetingCode || (meetData.meetingUri.split('/').pop() || ''),
        method: 'meet_api_v2',
      };
    } else {
      lastError = meetData.error?.message || meetData.message || 'Google Meet API returned an unexpected response.';
      console.warn('[Google Meet API v2 warning]:', lastError);
    }
  } catch (err) {
    lastError = err.message;
    console.warn('[Google Meet API v2 fetch error]:', err.message);
  }

  // 2. FALLBACK METHOD: Google Calendar API with Hangouts/Meet conferenceData
  // Enables Google Meet space creation for personal and non-Workspace Google Accounts
  try {
    const startTime = startIso ? new Date(startIso) : new Date();
    const endTime = endIso ? new Date(endIso) : new Date(startTime.getTime() + 30 * 60000);
    const requestId = `cegs-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const calRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: title,
        description: 'Scheduled via CEGS HRMS Meet Module',
        start: { dateTime: startTime.toISOString() },
        end: { dateTime: endTime.toISOString() },
        conferenceData: {
          createRequest: {
            requestId,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      }),
    });

    const calData = await calRes.json();

    if (calRes.ok) {
      const meetEntryPoint = calData.conferenceData?.entryPoints?.find(ep => ep.entryPointType === 'video');
      const meetUrl = meetEntryPoint?.uri || calData.hangoutLink;

      if (meetUrl) {
        const meetCode = meetUrl.split('/').pop() || '';
        return {
          googleMeetUrl: meetUrl,
          googleMeetSpaceName: `spaces/${meetCode}`,
          googleMeetCode: meetCode,
          method: 'calendar_conference',
        };
      }
    }

    if (calData.error?.message) {
      lastError = calData.error.message;
    }
  } catch (calErr) {
    console.warn('[Google Calendar Meet fallback error]:', calErr.message);
  }

  // If neither method succeeded, throw a clear error with the Google API message
  throw new Error(`Google Meet creation failed: ${lastError || 'Unable to generate Google Meet space.'}`);
}

/**
 * Checks Google Meet connection status for current user / system.
 */
export async function getGoogleMeetStatus(userId = null) {
  try {
    const { isConnected, email } = await getGoogleAccessToken(userId);
    return {
      connected: isConnected,
      email: email || '',
      isConfigured: getGoogleOAuthConfig().isConfigured,
    };
  } catch (e) {
    return {
      connected: false,
      email: '',
      isConfigured: getGoogleOAuthConfig().isConfigured,
      error: e.message,
    };
  }
}

