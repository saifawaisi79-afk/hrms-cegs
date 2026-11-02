import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ItTask from '@/lib/models/ItTask';
import Notification from '@/lib/models/Notification';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function isPrivilegedAdmin(authUser) {
  if (!authUser) return false;
  return ['admin', 'super_admin'].includes(authUser.role);
}

// POST /api/it/tasks/[id]/review
export async function POST(request, { params }) {
  try {
    const authUser = getAuthUser(request);
    if (!isPrivilegedAdmin(authUser)) {
      return NextResponse.json({ error: 'Forbidden: Only HR Admin or Super Admin can review tasks' }, { status: 403 });
    }

    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;
    const body = await request.json().catch(() => ({}));
    const { action, feedback } = body;

    if (!['approved', 'changes_requested', 'reopened'].includes(action)) {
      return NextResponse.json({ error: 'Action must be "approved", "changes_requested", or "reopened"' }, { status: 400 });
    }

    await connectDB();
    const task = await ItTask.findById(id);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const oldStatus = task.status;
    const now = new Date();
    const nowIso = now.toISOString();

    const isApprove = action === 'approved';
    const newStatus = isApprove ? 'Completed' : 'Reopened';

    task.status = newStatus;
    if (isApprove) {
      task.completed_at = now;
    }

    task.review_feedback.push({
      reviewer_id: authUser.id,
      reviewer_name: authUser.name || 'HR Admin',
      reviewer_role: authUser.role || 'admin',
      action,
      feedback: feedback?.trim() || '',
      reviewed_at: now,
    });

    task.status_history.push({
      from_status: oldStatus,
      to_status: newStatus,
      changed_by: authUser.id,
      changed_by_name: authUser.name || 'HR Admin',
      changed_by_role: authUser.role || 'admin',
      comment: feedback?.trim() || (isApprove ? 'Submission approved by HR' : 'Changes requested / task reopened by HR'),
      changed_at: now,
    });

    await task.save();

    // Send notifications to assignees
    for (const a of task.assigned_to) {
      try {
        await Notification.create({
          sender_id: authUser.id,
          recipient_id: a.user_id,
          title: isApprove ? `Task Approved: ${task.title}` : `Changes Requested: ${task.title}`,
          message: feedback?.trim()
            ? `HR Feedback: ${feedback.trim()}`
            : isApprove
            ? `Great job! HR Admin has approved your completed task.`
            : `HR Admin requested changes on your submission. Please check task details and resubmit.`,
          type: isApprove ? 'it_task_approved' : 'it_task_changes_requested',
          is_read: false,
          created_at: nowIso,
        });
      } catch (e) {
        console.warn('Failed to notify assignee:', e.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: isApprove ? 'Task successfully approved and marked Completed' : 'Changes requested, task reopened',
      task: {
        ...task.toObject(),
        id: task._id.toString(),
      },
    });
  } catch (error) {
    console.error('Error in POST /api/it/tasks/[id]/review:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

