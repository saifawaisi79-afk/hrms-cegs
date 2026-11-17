import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Meeting from '@/lib/models/Meeting';
import User from '@/lib/models/User';
import { getAuthUser } from '@/lib/auth';
import { sendMeetingNotifications } from '@/lib/meet-notifications';

export const dynamic = 'force-dynamic';

function generateMeetingId() {
  const p1 = Math.random().toString(36).substring(2, 5);
  const p2 = Math.random().toString(36).substring(2, 6);
  const p3 = Math.random().toString(36).substring(2, 5);
  return `cegs-${p1}-${p2}-${p3}`.toLowerCase();
}

/**
 * GET /api/meet
 * Fetch meetings accessible to the authenticated user.
 */
export async function GET(request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    await connectDB();
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';
    const dateQuery = searchParams.get('date');
    const monthQuery = searchParams.get('month'); // YYYY-MM
    const search = (searchParams.get('search') || '').trim().toLowerCase();

    const isPrivileged = ['admin', 'super_admin'].includes(authUser.role);
    const userObjectId = authUser.id;

    // Base query: Privileged users see all company meetings; others see public/internal OR meetings they host or participate in
    let query = {};
    if (!isPrivileged) {
      query.$or = [
        { host_id: userObjectId },
        { participant_user_ids: userObjectId },
        { privacy: 'internal' },
        { privacy: 'department', allowed_departments: authUser.department_id }
      ];
    }

    if (dateQuery) {
      query.scheduled_date = dateQuery;
    } else if (monthQuery) {
      query.scheduled_date = { $regex: `^${monthQuery}` };
    }

    if (filter === 'upcoming') {
      query.status = { $in: ['scheduled', 'in_progress'] };
    } else if (filter === 'history' || filter === 'completed') {
      query.status = 'completed';
    } else if (filter === 'cancelled') {
      query.status = 'cancelled';
    }

    let meetings = await Meeting.find(query)
      .sort({ scheduled_date: 1, scheduled_start_time: 1, createdAt: -1 })
      .lean();

    if (search) {
      meetings = meetings.filter(m =>
        m.title.toLowerCase().includes(search) ||
        m.meeting_id.toLowerCase().includes(search) ||
        m.host_name.toLowerCase().includes(search) ||
        (m.description && m.description.toLowerCase().includes(search))
      );
    }

    // Calculate aggregated statistics for current user/company
    const allUserMeetings = await Meeting.find(
      isPrivileged
        ? {}
        : {
            $or: [
              { host_id: userObjectId },
              { participant_user_ids: userObjectId },
              { privacy: 'internal' }
            ]
          }
    ).lean();

    const totalMeetings = allUserMeetings.length;
    const upcomingCount = allUserMeetings.filter(m => ['scheduled', 'in_progress'].includes(m.status)).length;
    const completedCount = allUserMeetings.filter(m => m.status === 'completed').length;
    const cancelledCount = allUserMeetings.filter(m => m.status === 'cancelled').length;
    const totalMinutes = allUserMeetings
      .filter(m => m.status === 'completed')
      .reduce((acc, m) => acc + (m.duration_minutes || 0), 0);

    return NextResponse.json({
      success: true,
      meetings,
      stats: {
        totalMeetings,
        upcomingCount,
        completedCount,
        cancelledCount,
        totalMinutes,
      }
    });
  } catch (error) {
    console.error('[GET /api/meet] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/meet
 * Create an instant or scheduled meeting.
 */
export async function POST(request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    await connectDB();
    const body = await request.json();
    const {
      title,
      description = '',
      type = 'scheduled',
      scheduled_date,
      scheduled_start_time,
      duration_minutes = 30,
      privacy = 'internal',
      allowed_departments = [],
      participant_user_ids = [],
      waiting_room_enabled = false,
      allow_screen_share = true,
      allow_chat = true,
      mute_on_entry = false,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Meeting title is required' }, { status: 400 });
    }

    const todayIso = new Date().toISOString().slice(0, 10);
    const nowTimeStr = new Date().toTimeString().slice(0, 5);

    const isInstant = type === 'instant';
    const effectiveDate = isInstant ? todayIso : (scheduled_date || todayIso);
    const effectiveTime = isInstant ? nowTimeStr : (scheduled_start_time || nowTimeStr);

    const meetingId = generateMeetingId();
    const roomName = `cegs-room-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // Resolve host details
    const hostUser = await User.findById(authUser.id).lean();
    const hostName = hostUser?.name || authUser.name || 'CEGS Host';
    const hostEmail = hostUser?.email || authUser.email || '';

    // Resolve participants from employee directory
    let resolvedParticipantIds = Array.isArray(participant_user_ids)
      ? participant_user_ids.filter(Boolean)
      : [];

    // If departments selected, auto-add department members
    if (allowed_departments && allowed_departments.length > 0) {
      const deptUsers = await User.find({
        department_id: { $in: allowed_departments },
        status: 'active'
      }).select('_id').lean();
      deptUsers.forEach(u => {
        const uidStr = u._id.toString();
        if (!resolvedParticipantIds.some(id => String(id) === uidStr)) {
          resolvedParticipantIds.push(u._id);
        }
      });
    }

    // Load full user details for participants
    const participantUsers = await User.find({
      _id: { $in: resolvedParticipantIds }
    }).lean();

    const participantsList = [
      // Always include host as host role
      {
        user_id: authUser.id,
        name: hostName,
        email: hostEmail,
        role: 'host',
        avatar_url: hostUser?.avatar_url || '',
        department: hostUser?.department_id ? String(hostUser.department_id) : '',
        invitation_status: 'accepted',
        has_joined: isInstant,
        first_joined_at: isInstant ? new Date() : null,
        attendance_logs: isInstant ? [{ action: 'join', timestamp: new Date() }] : []
      },
      ...participantUsers
        .filter(u => String(u._id) !== String(authUser.id))
        .map(u => ({
          user_id: u._id,
          name: u.name,
          email: u.email,
          role: 'participant',
          avatar_url: u.avatar_url || '',
          department: u.department_id ? String(u.department_id) : '',
          invitation_status: 'pending',
          has_joined: false,
          first_joined_at: null,
          last_left_at: null,
          total_duration_seconds: 0,
          attendance_logs: []
        }))
    ];

    const meeting = await Meeting.create({
      meeting_id: meetingId,
      room_name: roomName,
      title: title.trim(),
      description: description.trim(),
      type: isInstant ? 'instant' : 'scheduled',
      status: isInstant ? 'in_progress' : 'scheduled',
      privacy,
      allowed_departments,
      host_id: authUser.id,
      host_name: hostName,
      host_email: hostEmail,
      scheduled_date: effectiveDate,
      scheduled_start_time: effectiveTime,
      duration_minutes: Number(duration_minutes) || 30,
      actual_start_time: isInstant ? new Date() : null,
      waiting_room_enabled: Boolean(waiting_room_enabled),
      allow_screen_share: Boolean(allow_screen_share),
      allow_chat: Boolean(allow_chat),
      mute_on_entry: Boolean(mute_on_entry),
      participants: participantsList,
      participant_user_ids: participantsList.map(p => p.user_id),
    });

    // Send notifications to all invited participants
    const inviteeIds = participantsList
      .map(p => p.user_id)
      .filter(id => String(id) !== String(authUser.id));

    if (inviteeIds.length > 0) {
      const notifTitle = isInstant
        ? `🔴 Instant CEGS Meet: ${meeting.title}`
        : `📅 CEGS Meet Invitation: ${meeting.title}`;
      const notifMsg = isInstant
        ? `${hostName} has started an instant video meeting "${meeting.title}". Click to join now!`
        : `You are invited by ${hostName} to "${meeting.title}" on ${effectiveDate} at ${effectiveTime}.`;

      sendMeetingNotifications({
        recipientIds: inviteeIds,
        senderId: authUser.id,
        title: notifTitle,
        message: notifMsg,
        type: 'meeting',
        meetingId: meeting.meeting_id,
      }).catch(err => console.warn('[Meet Notification Warning]:', err));
    }

    return NextResponse.json({
      success: true,
      meeting,
      message: isInstant ? 'Instant meeting created & live!' : 'Meeting successfully scheduled!',
    }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/meet] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

