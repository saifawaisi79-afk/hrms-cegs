import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Meeting from '@/lib/models/Meeting';
import { getAuthUser } from '@/lib/auth';

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
 * POST /api/meet/[id]/attendance
 * Records leave or heartbeat action for the participant.
 */
export async function POST(request, { params }) {
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

    const body = await request.json().catch(() => ({}));
    const action = body.action || 'leave';
    const now = new Date();

    const participant = meeting.participants.find(p => String(p.user_id) === String(authUser.id));
    if (!participant) {
      return NextResponse.json({ error: 'Participant record not found' }, { status: 404 });
    }

    if (action === 'leave') {
      participant.last_left_at = now;
      if (!participant.attendance_logs) participant.attendance_logs = [];

      // Calculate duration from last join
      const lastJoinLog = [...participant.attendance_logs].reverse().find(l => l.action === 'join');
      if (lastJoinLog) {
        const deltaSecs = Math.max(0, Math.round((now - new Date(lastJoinLog.timestamp)) / 1000));
        participant.total_duration_seconds = (participant.total_duration_seconds || 0) + deltaSecs;
      }

      participant.attendance_logs.push({ action: 'leave', timestamp: now });
      await meeting.save();
    }

    return NextResponse.json({
      success: true,
      participant: {
        totalDurationSeconds: participant.total_duration_seconds,
        lastLeftAt: participant.last_left_at,
      }
    });
  } catch (error) {
    console.error('[POST /api/meet/[id]/attendance] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/meet/[id]/attendance
 * Return meeting attendance report.
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

    const isHost = String(meeting.host_id) === String(authUser.id);
    const isPrivileged = ['admin', 'super_admin'].includes(authUser.role);

    if (!isHost && !isPrivileged) {
      return NextResponse.json({ error: 'Access denied: only meeting host or admins can view attendance reports' }, { status: 403 });
    }

    const attendanceReport = meeting.participants.map(p => ({
      userId: p.user_id,
      name: p.name,
      email: p.email,
      role: p.role,
      hasJoined: p.has_joined,
      firstJoinedAt: p.first_joined_at,
      lastLeftAt: p.last_left_at,
      totalDurationSeconds: p.total_duration_seconds,
      totalDurationMinutes: Math.round((p.total_duration_seconds || 0) / 60),
      invitationStatus: p.invitation_status,
      logs: p.attendance_logs || [],
    }));

    return NextResponse.json({
      success: true,
      meetingId: meeting.meeting_id,
      title: meeting.title,
      scheduledDate: meeting.scheduled_date,
      scheduledStartTime: meeting.scheduled_start_time,
      actualStartTime: meeting.actual_start_time,
      actualEndTime: meeting.actual_end_time,
      status: meeting.status,
      participantsCount: meeting.participants.length,
      joinedCount: meeting.participants.filter(p => p.has_joined).length,
      attendance: attendanceReport,
    });
  } catch (error) {
    console.error('[GET /api/meet/[id]/attendance] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

