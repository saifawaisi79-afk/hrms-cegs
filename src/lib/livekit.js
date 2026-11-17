import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';

export function isLiveKitConfigured() {
  return Boolean(
    process.env.LIVEKIT_API_KEY &&
    process.env.LIVEKIT_API_SECRET &&
    (process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL)
  );
}

export function getLiveKitUrl() {
  return process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL || '';
}

/**
 * Generates a signed LiveKit AccessToken for a participant.
 */
export async function generateMeetingToken({
  roomName,
  identity,
  name,
  isHost = false,
  canPublish = true,
  canSubscribe = true,
  canPublishData = true,
}) {
  const apiKey = process.env.LIVEKIT_API_KEY || 'cegs-meet-dev-key';
  const apiSecret = process.env.LIVEKIT_API_SECRET || 'cegs-meet-dev-secret-at-least-32-chars';
  const serverUrl = getLiveKitUrl();

  const at = new AccessToken(apiKey, apiSecret, {
    identity: String(identity),
    name: String(name || 'Participant'),
    ttl: '8h',
  });

  at.addGrant({
    roomJoin: true,
    room: String(roomName),
    canPublish: Boolean(canPublish),
    canSubscribe: Boolean(canSubscribe),
    canPublishData: Boolean(canPublishData),
    roomAdmin: Boolean(isHost),
    roomRecord: Boolean(isHost),
  });

  const token = await at.toJwt();
  return {
    token,
    serverUrl,
    isConfigured: isLiveKitConfigured(),
  };
}

/**
 * Close/delete a LiveKit room when the host ends the meeting.
 */
export async function closeLiveKitRoom(roomName) {
  if (!isLiveKitConfigured()) return false;
  try {
    const livekitUrl = getLiveKitUrl().replace('wss://', 'https://').replace('ws://', 'http://');
    const svc = new RoomServiceClient(
      livekitUrl,
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET
    );
    await svc.deleteRoom(roomName);
    return true;
  } catch (err) {
    console.warn('[LiveKit] deleteRoom notice:', err.message);
    return false;
  }
}

