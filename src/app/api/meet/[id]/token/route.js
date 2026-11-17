import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Meeting from '@/lib/models/Meeting';
import User from '@/lib/models/User';
import { getAuthUser } from '@/lib/auth';
import { generateMeetingToken } from '@/lib/livekit';

export const dynamic = 'force-dynamic';

async function findMeetingByIdOrCode(id) {
  await connectDB();
  if (mongoose.Types.ObjectId.isValid(id)) {
    const meet = await Meeting.findById(id);
    if (meet) return meet;
  }
  return await Meeting.findOne({ meeting_id: String(id).trim().toLowerCase() });
}

/**
 * POST /api/meet/[id]/token
 * Securely mints LiveKit token after verifying user invitation & status.
 */
export async function POST(request, { params }) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required. Please log in.' }, { status: 401 });
    }

    const { id } = params;
    const meeting = await findMeetingByIdOrCode(id);

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found or invalid meeting code' }, { status: 404 });
    }

    if (meeting.status === 'cancelled') {
      return NextResponse.json({
        error: `This meeting was cancelled: "${meeting.cancellation_reason || 'No reason provided'}"`
      }, { status: 410 });
    }

    if (meeting.status === 'completed') {
      return NextResponse.json({
        error: 'This meeting has already ended.'
      }, { status: 410 });
    }

    const userIdStr = String(authUser.id);
    const isHost = String(meeting.host_id) === userIdStr || ['super_admin', 'admin'].includes(authUser.role);
    const isExplicitParticipant = meeting.participant_user_ids.some(pid => String(pid) === userIdStr);
    const isPrivileged = ['admin', 'super_admin'].includes(authUser.role);

    // Permission and privacy validation
    if (meeting.privacy === 'private' && !isHost && !isExplicitParticipant && !isPrivileged) {
      return NextResponse.json({ error: 'Access denied: this is a private invite-only meeting.' }, { status: 403 });
    }

    if (meeting.privacy === 'department' && !isHost && !isExplicitParticipant && !isPrivileged) {
      const userDept = String(authUser.department_id || '');
      const deptAllowed = meeting.allowed_departments.some(d => String(d) === userDept);
      if (!deptAllowed) {
        return NextResponse.json({ error: 'Access denied: meeting restricted to designated departments.' }, { status: 403 });
      }
    }

    // Server-side Attendance tracking: record participant join event
    const now = new Date();
    let participantEntry = meeting.participants.find(p => String(p.user_id) === userIdStr);

    if (!participantEntry) {
      const userDoc = await User.findById(authUser.id).lean();
      participantEntry = {
        user_id: authUser.id,
        name: userDoc?.name || authUser.name || 'CEGS Member',
        email: userDoc?.email || authUser.email || '',
        role: isHost ? 'host' : 'participant',
        avatar_url: userDoc?.avatar_url || '',
        department: userDoc?.department_id ? String(userDoc.department_id) : '',
        invitation_status: 'accepted',
        has_joined: true,
        first_joined_at: now,
        last_left_at: null,
        total_duration_seconds: 0,
        attendance_logs: [{ action: 'join', timestamp: now }]
      };
      meeting.participants.push(participantEntry);
      if (!meeting.participant_user_ids.some(pid => String(pid) === userIdStr)) {
        meeting.participant_user_ids.push(authUser.id);
      }
    } else {
      participantEntry.has_joined = true;
      if (!participantEntry.first_joined_at) {
        participantEntry.first_joined_at = now;
      }
      if (!participantEntry.attendance_logs) {
        participantEntry.attendance_logs = [];
      }
      participantEntry.attendance_logs.push({ action: 'join', timestamp: now });
      participantEntry.invitation_status = 'accepted';
    }

    // Auto update status to in_progress if still scheduled
    if (meeting.status === 'scheduled') {
      meeting.status = 'in_progress';
      if (!meeting.actual_start_time) {
        meeting.actual_start_time = now;
      }
    }

    await meeting.save();

    // Generate LiveKit token using server-side credentials
    const tokenData = await generateMeetingToken({
      roomName: meeting.room_name,
      identity: userIdStr,
      name: participantEntry.name,
      isHost,
      canPublish: true,
      canSubscribe: true,
      canPublishData: meeting.allow_chat !== false,
    });

    return NextResponse.json({
      success: true,
      token: tokenData.token,
      serverUrl: tokenData.serverUrl,
      isConfigured: tokenData.isConfigured,
      roomName: meeting.room_name,
      meetingId: meeting.meeting_id,
      title: meeting.title,
      isHost,
      permissions: {
        allowScreenShare: meeting.allow_screen_share !== false,
        allowChat: meeting.allow_chat !== false,
        muteOnEntry: Boolean(meeting.mute_on_entry),
      },
      participant: {
        id: userIdStr,
        name: participantEntry.name,
        role: participantEntry.role,
      }
    });
  } catch (error) {
    console.error('[POST /api/meet/[id]/token] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

