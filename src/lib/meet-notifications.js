import Notification from '@/lib/models/Notification';
import connectDB from '@/lib/db';

/**
 * Sends notifications to invited meeting participants.
 */
export async function sendMeetingNotifications({
  recipientIds = [],
  senderId = null,
  title,
  message,
  type = 'meeting',
  meetingId = null,
}) {
  if (!recipientIds || !recipientIds.length) return [];
  try {
    await connectDB();
    const createdDocs = [];
    const nowIso = new Date().toISOString();

    for (const rId of recipientIds) {
      if (String(rId) === String(senderId)) continue; // Don't notify the sender themselves
      try {
        const notif = await Notification.create({
          sender_id: senderId,
          recipient_id: rId,
          title,
          message,
          type,
          is_read: false,
          created_at: nowIso,
          dedupeKey: `meet_${meetingId}_${rId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        });
        createdDocs.push(notif);
      } catch (innerErr) {
        console.warn('[Meeting Notifications] Single item insert err:', innerErr.message);
      }
    }
    return createdDocs;
  } catch (err) {
    console.error('[Meeting Notifications] Error sending notifications:', err);
    return [];
  }
}

