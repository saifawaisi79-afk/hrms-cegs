import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ItTask, { IT_TASK_CATEGORIES, IT_TASK_PRIORITIES } from '@/lib/models/ItTask';
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

// GET /api/it/tasks?status=...&category=...&priority=...&employee=...&q=...
export async function GET(request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Access token required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') || 'all';
    const categoryFilter = searchParams.get('category') || 'all';
    const priorityFilter = searchParams.get('priority') || 'all';
    const employeeFilter = searchParams.get('employee') || 'all';
    const query = (searchParams.get('q') || '').trim().toLowerCase();
    const todayIso = toIsoDate(new Date());

    await connectDB();

    const filter = {};

    // Strict Access Control: IT Team members can ONLY view tasks assigned to them!
    if (isItTeamMember(authUser)) {
      filter['assigned_to.user_id'] = authUser.id;
    } else if (isPrivilegedAdmin(authUser)) {
      // HR Admin can optionally filter by specific employee
      if (employeeFilter !== 'all' && employeeFilter) {
        filter['assigned_to.user_id'] = employeeFilter;
      }
    } else {
      return NextResponse.json({ error: 'Forbidden: Access restricted to IT Team and HR Admins' }, { status: 403 });
    }

    if (categoryFilter !== 'all' && categoryFilter) {
      filter.category = categoryFilter;
    }
    if (priorityFilter !== 'all' && priorityFilter) {
      filter.priority = priorityFilter;
    }

    if (statusFilter !== 'all' && statusFilter) {
      if (statusFilter === 'overdue') {
        filter.status = { $nin: ['Completed', 'Cancelled'] };
        filter.due_date = { $lt: todayIso };
      } else if (statusFilter === 'today') {
        filter.status = { $nin: ['Completed', 'Cancelled'] };
        filter.due_date = todayIso;
      } else {
        filter.status = statusFilter;
      }
    }

    if (query) {
      const regex = new RegExp(query, 'i');
      filter.$or = [
        { title: regex },
        { description: regex },
        { category: regex },
        { 'assigned_to.name': regex },
        { 'assigned_to.employee_id': regex },
      ];
    }

    const tasks = await ItTask.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    // Map tasks and annotate with dynamic is_overdue flag
    const mappedTasks = tasks.map((t) => {
      const isOverdue =
        t.status !== 'Completed' &&
        t.status !== 'Cancelled' &&
        Boolean(t.due_date && t.due_date < todayIso);

      return {
        ...t,
        id: t._id.toString(),
        is_overdue: isOverdue,
      };
    });

    // Calculate summary statistics
    const allUserFilter = isItTeamMember(authUser) ? { 'assigned_to.user_id': authUser.id } : {};
    const allRelevant = await ItTask.find(allUserFilter).select('status due_date').lean();

    const stats = {
      total: allRelevant.length,
      pending: allRelevant.filter((t) => ['Assigned', 'Acknowledged'].includes(t.status)).length,
      in_progress: allRelevant.filter((t) => t.status === 'In Progress').length,
      on_hold: allRelevant.filter((t) => t.status === 'On Hold').length,
      review: allRelevant.filter((t) => t.status === 'Submitted for Review').length,
      completed: allRelevant.filter((t) => t.status === 'Completed').length,
      overdue: allRelevant.filter(
        (t) => t.status !== 'Completed' && t.status !== 'Cancelled' && t.due_date && t.due_date < todayIso
      ).length,
      today: allRelevant.filter(
        (t) => t.status !== 'Completed' && t.status !== 'Cancelled' && t.due_date === todayIso
      ).length,
    };

    return NextResponse.json({
      tasks: mappedTasks,
      stats,
      today: todayIso,
    });
  } catch (error) {
    console.error('Error in GET /api/it/tasks:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// POST /api/it/tasks (HR Admin assigns new IT tasks)
export async function POST(request) {
  try {
    const authUser = getAuthUser(request);
    if (!isPrivilegedAdmin(authUser)) {
      return NextResponse.json({ error: 'Forbidden: Only HR Admin or Super Admin can assign IT tasks' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      title,
      description,
      category,
      priority,
      assigned_to,
      start_date,
      due_date,
      additional_instructions,
      attachments,
    } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Task Title is required' }, { status: 400 });
    }
    if (!description?.trim()) {
      return NextResponse.json({ error: 'Task Description is required' }, { status: 400 });
    }
    if (!due_date || !/^\d{4}-\d{2}-\d{2}$/.test(due_date.trim())) {
      return NextResponse.json({ error: 'A valid Due Date (YYYY-MM-DD) is required' }, { status: 400 });
    }

    await connectDB();

    // Normalize assignees array (supports single ID or array of IDs)
    const assigneeIds = Array.isArray(assigned_to)
      ? assigned_to.map(String).filter(Boolean)
      : assigned_to ? [String(assigned_to)] : [];

    if (assigneeIds.length === 0) {
      return NextResponse.json({ error: 'At least one assigned IT Team employee is required' }, { status: 400 });
    }

    // Resolve employee records
    const users = await User.find({ _id: { $in: assigneeIds }, status: { $ne: 'inactive' } }).lean();
    if (users.length === 0) {
      return NextResponse.json({ error: 'No active employees found for the provided assignees' }, { status: 404 });
    }

    const formattedAssignees = users.map((u) => ({
      user_id: u._id,
      name: u.name,
      email: u.email || '',
      employee_id: u.employee_id || 'EMP',
      assigned_at: new Date(),
    }));

    const validCategory = IT_TASK_CATEGORIES.includes(category) ? category : 'Technical Support';
    const validPriority = IT_TASK_PRIORITIES.includes(priority) ? priority : 'Medium';
    const todayIso = toIsoDate(new Date());

    const newTask = await ItTask.create({
      title: title.trim(),
      description: description.trim(),
      category: validCategory,
      priority: validPriority,
      status: 'Assigned',
      assigned_to: formattedAssignees,
      start_date: start_date && /^\d{4}-\d{2}-\d{2}$/.test(start_date.trim()) ? start_date.trim() : todayIso,
      due_date: due_date.trim(),
      additional_instructions: additional_instructions?.trim() || '',
      attachments: Array.isArray(attachments) ? attachments : [],
      status_history: [
        {
          from_status: '',
          to_status: 'Assigned',
          changed_by: authUser.id,
          changed_by_name: authUser.name || 'HR Admin',
          changed_by_role: authUser.role || 'admin',
          comment: 'Task assigned by HR Administration',
          changed_at: new Date(),
        },
      ],
      created_by: {
        user_id: authUser.id,
        name: authUser.name || 'HR Admin',
        role: authUser.role || 'admin',
      },
      assigned_at: new Date(),
    });

    // Send notifications to all assigned employees
    const nowIso = new Date().toISOString();
    for (const emp of users) {
      try {
        await Notification.create({
          sender_id: authUser.id,
          recipient_id: emp._id,
          title: `New IT Task: ${title.trim()}`,
          message: `Category: ${validCategory} • Priority: ${validPriority} • Due Date: ${due_date.trim()}`,
          type: 'it_task_assigned',
          is_read: false,
          created_at: nowIso,
        });
      } catch (notifErr) {
        console.warn('Notification creation warning:', notifErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Task successfully assigned to ${formattedAssignees.map((a) => a.name).join(', ')}`,
      task: {
        ...newTask.toObject(),
        id: newTask._id.toString(),
      },
    });
  } catch (error) {
    console.error('Error in POST /api/it/tasks:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

