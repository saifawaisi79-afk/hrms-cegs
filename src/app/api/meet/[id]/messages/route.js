import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Meeting from '@/lib/models/Meeting';
import MeetingMessage from '@/lib/models/MeetingMessage';
import User from '@/lib/models/User';
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
 * GET /api/meet/[id]/messages
 * Get persistent chat history.
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

    const messages = await MeetingMessage.find({ meeting_id: meeting.meeting_id })
      .sort({ createdAt: 1 })
      .limit(200)
      .lean();

    return NextResponse.json({
      success: true,
      messages: messages.map(m => ({
        id: m._id.toString(),
        senderId: m.sender_id.toString(),
        senderName: m.sender_name,
        senderEmail: m.sender_email,
        message: m.message,
        timestamp: m.timestamp || m.createdAt,
      })),
    });
  } catch (error) {
    console.error('[GET /api/meet/[id]/messages] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/meet/[id]/messages
 * Post a chat message.
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

    const body = await request.json();
    const text = (body.message || '').trim();
    if (!text) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    const userDoc = await User.findById(authUser.id).lean();
    const senderName = userDoc?.name || authUser.name || 'CEGS User';
    const senderEmail = userDoc?.email || authUser.email || '';

    const newMsg = await MeetingMessage.create({
      meeting_id: meeting.meeting_id,
      sender_id: authUser.id,
      sender_name: senderName,
      sender_email: senderEmail,
      message: text,
      timestamp: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: {
        id: newMsg._id.toString(),
        senderId: newMsg.sender_id.toString(),
        senderName: newMsg.sender_name,
        senderEmail: newMsg.sender_email,
        message: newMsg.message,
        timestamp: newMsg.timestamp,
      }
    }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/meet/[id]/messages] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

