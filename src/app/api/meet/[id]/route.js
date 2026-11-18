import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Meeting from '@/lib/models/Meeting';
import { getAuthUser } from '@/lib/auth';
import { sendMeetingNotifications } from '@/lib/meet-notifications';

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
 * GET /api/meet/[id]
 */
export async function GET(request, { params }) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = params;
    const meeting = await findMeetingByIdOrCode(id);

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Access check
    const isHost = String(meeting.host_id) === String(authUser.id);
    const isParticipant = meeting.participant_user_ids.some(pid => String(pid) === String(authUser.id));
    const isPrivileged = ['admin', 'super_admin'].includes(authUser.role);
    const isInternalOpen = meeting.privacy === 'internal';

    if (!isHost && !isParticipant && !isPrivileged && !isInternalOpen) {
      return NextResponse.json({ error: 'Access denied: this meeting is private.' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      meeting,
      isHost,
      isParticipant,
    });
  } catch (error) {
    console.error('[GET /api/meet/[id]] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/meet/[id]
 * Actions: 'start', 'end', 'cancel', 'reschedule', 'respond_invite'
 */
export async function PUT(request, { params }) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = params;
    const meeting = await findMeetingByIdOrCode(id);
    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    const body = await request.json();
    const { action, cancellation_reason, scheduled_date, scheduled_start_time, duration_minutes, invitation_status } = body;

    const isHost = String(meeting.host_id) === String(authUser.id);
    const isPrivileged = ['admin', 'super_admin'].includes(authUser.role);

    // 1. Respond to invitation (accepted / declined / tentative)
    if (action === 'respond_invite') {
      const partIdx = meeting.participants.findIndex(p => String(p.user_id) === String(authUser.id));
      if (partIdx >= 0) {
        meeting.participants[partIdx].invitation_status = invitation_status || 'accepted';
        await meeting.save();
        return NextResponse.json({ success: true, message: 'Response recorded', meeting });
      }
      return NextResponse.json({ error: 'You are not on the participant list for this meeting' }, { status: 400 });
    }

    // Host or Admin actions below
    if (!isHost && !isPrivileged) {
      return NextResponse.json({ error: 'Only the meeting host or administrators can modify this meeting' }, { status: 403 });
    }

    // 2. Start Meeting
    if (action === 'start') {
      meeting.status = 'in_progress';
      if (!meeting.actual_start_time) {
        meeting.actual_start_time = new Date();
      }
      await meeting.save();
      return NextResponse.json({ success: true, message: 'Meeting started', meeting });
    }

    // 3. End Meeting for all (Host-controlled end meeting)
    if (action === 'end') {
      meeting.status = 'completed';
      meeting.actual_end_time = new Date();

      // Finalize participant durations for anyone still active
      const now = new Date();
      meeting.participants.forEach(p => {
        if (p.has_joined && p.attendance_logs && p.attendance_logs.length > 0) {
          const lastLog = p.attendance_logs[p.attendance_logs.length - 1];
          if (lastLog.action === 'join') {
            p.attendance_logs.push({ action: 'leave', timestamp: now });
            p.last_left_at = now;
            const sessionSecs = Math.max(0, Math.round((now - new Date(lastLog.timestamp)) / 1000));
            p.total_duration_seconds = (p.total_duration_seconds || 0) + sessionSecs;
          }
        }
      });

      await meeting.save();

      return NextResponse.json({ success: true, message: 'Meeting concluded for all participants', meeting });
    }

    // 4. Cancel Meeting
    if (action === 'cancel') {
      meeting.status = 'cancelled';
      meeting.cancellation_reason = cancellation_reason || 'Meeting cancelled by host';
      meeting.cancelled_by = authUser.id;
      await meeting.save();

      // Send cancellation notice to all participants
      const recipientIds = meeting.participants
        .map(p => p.user_id)
        .filter(uid => String(uid) !== String(authUser.id));

      sendMeetingNotifications({
        recipientIds,
        senderId: authUser.id,
        title: `🚫 Meeting Cancelled: ${meeting.title}`,
        message: `The meeting "${meeting.title}" scheduled for ${meeting.scheduled_date} has been cancelled. Reason: ${meeting.cancellation_reason}`,
        type: 'meeting',
        meetingId: meeting.meeting_id,
      }).catch(e => console.warn('[Cancel Notif Warning]:', e));

      return NextResponse.json({ success: true, message: 'Meeting cancelled', meeting });
    }

    // 5. Reschedule Meeting
    if (action === 'reschedule') {
      if (!scheduled_date || !scheduled_start_time) {
        return NextResponse.json({ error: 'Date and time are required to reschedule' }, { status: 400 });
      }
      meeting.scheduled_date = scheduled_date;
      meeting.scheduled_start_time = scheduled_start_time;
      if (duration_minutes) meeting.duration_minutes = Number(duration_minutes);
      meeting.status = 'scheduled';
      await meeting.save();

      // Send reschedule notifications
      const recipientIds = meeting.participants
        .map(p => p.user_id)
        .filter(uid => String(uid) !== String(authUser.id));

      sendMeetingNotifications({
        recipientIds,
        senderId: authUser.id,
        title: `🔄 Meeting Rescheduled: ${meeting.title}`,
        message: `The meeting "${meeting.title}" has been rescheduled to ${scheduled_date} at ${scheduled_start_time}.`,
        type: 'meeting',
        meetingId: meeting.meeting_id,
      }).catch(e => console.warn('[Reschedule Notif Warning]:', e));

      return NextResponse.json({ success: true, message: 'Meeting rescheduled', meeting });
    }

    // Generic update
    if (body.title) meeting.title = body.title;
    if (body.description !== undefined) meeting.description = body.description;
    await meeting.save();

    return NextResponse.json({ success: true, meeting });
  } catch (error) {
    console.error('[PUT /api/meet/[id]] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/meet/[id]
 */
export async function DELETE(request, { params }) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = params;
    const meeting = await findMeetingByIdOrCode(id);
    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    const isHost = String(meeting.host_id) === String(authUser.id);
    const isPrivileged = ['admin', 'super_admin'].includes(authUser.role);

    if (!isHost && !isPrivileged) {
      return NextResponse.json({ error: 'Only the host or administrators can delete this meeting' }, { status: 403 });
    }

    meeting.status = 'cancelled';
    meeting.cancellation_reason = 'Cancelled and removed by host';
    await meeting.save();

    return NextResponse.json({ success: true, message: 'Meeting cancelled' });
  } catch (error) {
    console.error('[DELETE /api/meet/[id]] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

