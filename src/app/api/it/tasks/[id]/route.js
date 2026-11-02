import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ItTask, { IT_TASK_CATEGORIES, IT_TASK_PRIORITIES, IT_TASK_STATUSES } from '@/lib/models/ItTask';
import User from '@/lib/models/User';
import Notification from '@/lib/models/Notification';
import { getAuthUser } from '@/lib/auth';
import { toIsoDate } from '@/lib/auto-absent';

export const dynamic = 'force-dynamic';

function isPrivilegedAdmin(authUser) {
  if (!authUser) return false;
  return ['admin', 'super_admin'].includes(authUser.role);
}

function isItTeamMember(authUser) {
  if (!authUser) return false;
  const r = (authUser.role || '').toLowerCase();
  return r === 'it_team';
}

// GET /api/it/tasks/[id]
export async function GET(request, { params }) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Access token required' }, { status: 401 });
    }

    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;

    await connectDB();
    const task = await ItTask.findById(id).lean();
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const isAssigned = (task.assigned_to || []).some(
      (a) => String(a.user_id) === String(authUser.id)
    );

    // IT Team members can ONLY view tasks assigned to them
    if (isItTeamMember(authUser) && !isAssigned) {
      return NextResponse.json({ error: 'Forbidden: You are not assigned to this task' }, { status: 403 });
    }

    if (!isPrivilegedAdmin(authUser) && !isAssigned) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const todayIso = toIsoDate(new Date());
    const isOverdue =
      task.status !== 'Completed' &&
      task.status !== 'Cancelled' &&
      Boolean(task.due_date && task.due_date < todayIso);

    return NextResponse.json({
      task: {
        ...task,
        id: task._id.toString(),
        is_overdue: isOverdue,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/it/tasks/[id]:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/it/tasks/[id] (Update status, progress, work submission, or task details)
export async function PUT(request, { params }) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Access token required' }, { status: 401 });
    }

    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;
    const body = await request.json().catch(() => ({}));

    await connectDB();
    const task = await ItTask.findById(id);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const isAssigned = (task.assigned_to || []).some(
      (a) => String(a.user_id) === String(authUser.id)
    );
    const isAdmin = isPrivilegedAdmin(authUser);
    const isIT = isItTeamMember(authUser);

    if (!isAdmin && !isAssigned) {
      return NextResponse.json({ error: 'Forbidden: You cannot modify this task' }, { status: 403 });
    }

    const oldStatus = task.status;
    const now = new Date();
    const nowIso = now.toISOString();

    // ─── Scenario 1: IT Team Employee updating status / progress / submitting work ───
    if (!isAdmin && isIT) {
      const { status, comment, attachments, submission_notes } = body;

      // Disallow IT Employee from directly marking Completed or Cancelled
      if (status === 'Completed') {
        return NextResponse.json(
          { error: 'Employees cannot directly mark tasks as Completed. Please submit for review to request HR Admin approval.' },
          { status: 403 }
        );
      }
      if (status === 'Cancelled') {
        return NextResponse.json(
          { error: 'Only HR Admin can cancel tasks.' },
          { status: 403 }
        );
      }

      let newStatus = status || oldStatus;
      if (status && !IT_TASK_STATUSES.includes(status)) {
        return NextResponse.json({ error: `Invalid task status: ${status}` }, { status: 400 });
      }

      // Check if this is a submission for review or has work attachments
      const isSubmission = newStatus === 'Submitted for Review' || (comment && attachments && attachments.length > 0);
      if (isSubmission && !newStatus) {
        newStatus = 'Submitted for Review';
      }

      if (comment || (attachments && attachments.length > 0) || submission_notes) {
        task.work_submissions.push({
          submitted_by: authUser.id,
          submitted_by_name: authUser.name || 'IT Employee',
          comment: (comment || submission_notes || '').trim(),
          attachments: Array.isArray(attachments) ? attachments : [],
          submitted_at: now,
        });
      }

      if (newStatus && newStatus !== oldStatus) {
        task.status = newStatus;
        task.status_history.push({
          from_status: oldStatus,
          to_status: newStatus,
          changed_by: authUser.id,
          changed_by_name: authUser.name || 'IT Employee',
          changed_by_role: 'it_team',
          comment: comment?.trim() || `Status updated to ${newStatus}`,
          changed_at: now,
        });
      } else if (comment) {
        task.status_history.push({
          from_status: oldStatus,
          to_status: oldStatus,
          changed_by: authUser.id,
          changed_by_name: authUser.name || 'IT Employee',
          changed_by_role: 'it_team',
          comment: comment.trim(),
          changed_at: now,
        });
      }

      await task.save();

      // If submitted for review, notify HR Admins
      if (newStatus === 'Submitted for Review') {
        try {
          const hrUsers = await User.find({ role: { $in: ['admin', 'super_admin'] }, status: { $ne: 'inactive' } }).select('_id').lean();
          for (const hr of hrUsers) {
            await Notification.create({
              sender_id: authUser.id,
              recipient_id: hr._id,
              title: `Task Submitted for Review: ${task.title}`,
              message: `${authUser.name || 'An IT employee'} submitted work for task "${task.title}". Review and approve.`,
              type: 'it_task_submitted',
              is_read: false,
              created_at: nowIso,
            });
          }
        } catch (notifErr) {
          console.warn('Failed to notify HR:', notifErr.message);
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Task updated successfully',
        task: {
          ...task.toObject(),
          id: task._id.toString(),
        },
      });
    }

    // ─── Scenario 2: HR Admin / Super Admin updating task ───
    if (isAdmin) {
      const {
        title,
        description,
        category,
        priority,
        status,
        start_date,
        due_date,
        additional_instructions,
        attachments,
        assigned_to,
        status_comment,
      } = body;

      if (title && title.trim()) task.title = title.trim();
      if (description && description.trim()) task.description = description.trim();
      if (category && IT_TASK_CATEGORIES.includes(category)) task.category = category;
      if (priority && IT_TASK_PRIORITIES.includes(priority)) task.priority = priority;
      if (start_date) task.start_date = start_date;
      if (due_date) task.due_date = due_date;
      if (additional_instructions !== undefined) task.additional_instructions = additional_instructions;
      if (Array.isArray(attachments)) task.attachments = attachments;

      // Handle Reassignment
      let reassigned = false;
      if (assigned_to !== undefined) {
        const assigneeIds = Array.isArray(assigned_to)
          ? assigned_to.map(String).filter(Boolean)
          : assigned_to ? [String(assigned_to)] : [];

        if (assigneeIds.length > 0) {
          const users = await User.find({ _id: { $in: assigneeIds }, status: { $ne: 'inactive' } }).lean();
          if (users.length > 0) {
            task.assigned_to = users.map((u) => ({
              user_id: u._id,
              name: u.name,
              email: u.email || '',
              employee_id: u.employee_id || 'EMP',
              assigned_at: now,
            }));
            reassigned = true;

            // Notify newly assigned employees
            for (const emp of users) {
              await Notification.create({
                sender_id: authUser.id,
                recipient_id: emp._id,
                title: `Task Assigned: ${task.title}`,
                message: `You have been assigned to IT Task "${task.title}". Priority: ${task.priority}. Due: ${task.due_date}.`,
                type: 'it_task_reassigned',
                is_read: false,
                created_at: nowIso,
              });
            }
          }
        }
      }

      // Handle status change by HR
      if (status && IT_TASK_STATUSES.includes(status) && status !== oldStatus) {
        task.status = status;
        if (status === 'Completed') {
          task.completed_at = now;
        }

        task.status_history.push({
          from_status: oldStatus,
          to_status: status,
          changed_by: authUser.id,
          changed_by_name: authUser.name || 'HR Admin',
          changed_by_role: authUser.role || 'admin',
          comment: status_comment?.trim() || `HR status update: ${oldStatus} -> ${status}`,
          changed_at: now,
        });

        // Notify assigned employees about status change
        for (const a of task.assigned_to) {
          await Notification.create({
            sender_id: authUser.id,
            recipient_id: a.user_id,
            title: `Task Status Changed: ${task.title}`,
            message: `HR Admin changed task status to "${status}".`,
            type: 'it_task_status_changed',
            is_read: false,
            created_at: nowIso,
          });
        }
      }

      await task.save();

      return NextResponse.json({
        success: true,
        message: reassigned ? 'Task re-assigned and updated successfully' : 'Task updated successfully',
        task: {
          ...task.toObject(),
          id: task._id.toString(),
        },
      });
    }

    return NextResponse.json({ error: 'Unauthorized request' }, { status: 401 });
  } catch (error) {
    console.error('Error in PUT /api/it/tasks/[id]:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/it/tasks/[id] (HR Admin cancels task with recorded reason)
export async function DELETE(request, { params }) {
  try {
    const authUser = getAuthUser(request);
    if (!isPrivilegedAdmin(authUser)) {
      return NextResponse.json({ error: 'Forbidden: Only HR Admin can cancel tasks' }, { status: 403 });
    }

    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;
    const body = await request.json().catch(() => ({}));
    const reason = body.cancellation_reason || body.reason || 'Cancelled by HR Administrator';

    await connectDB();
    const task = await ItTask.findById(id);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const oldStatus = task.status;
    const now = new Date();
    task.status = 'Cancelled';
    task.cancellation_reason = reason.trim();
    task.status_history.push({
      from_status: oldStatus,
      to_status: 'Cancelled',
      changed_by: authUser.id,
      changed_by_name: authUser.name || 'HR Admin',
      changed_by_role: authUser.role || 'admin',
      comment: `Task cancelled: ${reason.trim()}`,
      changed_at: now,
    });

    await task.save();

    // Notify assigned employees
    const nowIso = now.toISOString();
    for (const a of task.assigned_to) {
      try {
        await Notification.create({
          sender_id: authUser.id,
          recipient_id: a.user_id,
          title: `Task Cancelled: ${task.title}`,
          message: `Reason: ${reason.trim()}`,
          type: 'it_task_cancelled',
          is_read: false,
          created_at: nowIso,
        });
      } catch (e) {
        console.warn('Failed to notify cancellation:', e.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Task cancelled successfully',
      task: {
        ...task.toObject(),
        id: task._id.toString(),
      },
    });
  } catch (error) {
    console.error('Error in DELETE /api/it/tasks/[id]:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

