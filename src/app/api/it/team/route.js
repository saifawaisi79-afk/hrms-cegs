import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import ItTask from '@/lib/models/ItTask';
import { getAuthUser } from '@/lib/auth';
import { toIsoDate } from '@/lib/auto-absent';

export const dynamic = 'force-dynamic';

function isAuthorized(authUser) {
  if (!authUser) return false;
  const r = (authUser.role || '').toLowerCase();
  return ['admin', 'super_admin', 'it_team', 'finance'].includes(r);
}

// GET /api/it/team
export async function GET(request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser || !isAuthorized(authUser)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectDB();
    const todayIso = toIsoDate(new Date());

    // Find IT team members (role IT_TEAM / it_team OR technical title)
    const itUsers = await User.find({
      status: { $ne: 'inactive' },
      $or: [
        { role: { $in: ['IT_TEAM', 'it_team'] } },
        { designation: { $regex: /developer|architect|software|system|engineer|it|programmer|tech/i } },
      ],
    })
      .select('_id name email employee_id designation role avatar_url status')
      .lean();

    // If no specific IT users found yet, include all active users as potential assignees
    let membersPool = itUsers;
    if (membersPool.length === 0) {
      membersPool = await User.find({ status: { $ne: 'inactive' } })
        .select('_id name email employee_id designation role avatar_url status')
        .lean();
    }

    // Also get all tasks to calculate performance stats per member
    const allTasks = await ItTask.find({}).lean();

    const membersWithStats = membersPool.map((u) => {
      const uId = u._id.toString();
      const userTasks = allTasks.filter((t) =>
        (t.assigned_to || []).some((a) => String(a.user_id) === uId)
      );

      const total = userTasks.length;
      const completed = userTasks.filter((t) => t.status === 'Completed').length;
      const in_progress = userTasks.filter((t) => t.status === 'In Progress').length;
      const pending = userTasks.filter((t) => ['Assigned', 'Acknowledged'].includes(t.status)).length;
      const review = userTasks.filter((t) => t.status === 'Submitted for Review').length;
      const overdue = userTasks.filter(
        (t) => t.status !== 'Completed' && t.status !== 'Cancelled' && t.due_date && t.due_date < todayIso
      ).length;

      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        id: uId,
        _id: uId,
        name: u.name,
        email: u.email,
        employee_id: u.employee_id || 'EMP',
        designation: u.designation || 'IT Team Member',
        role: u.role,
        avatar_url: u.avatar_url,
        stats: {
          total,
          completed,
          in_progress,
          pending,
          review,
          overdue,
          completion_percentage: completionRate,
        },
      };
    });

    // Also fetch all active employees so HR can pick anyone to assign or reassign
    const allActiveEmployees = await User.find({ status: { $ne: 'inactive' } })
      .select('_id name email employee_id designation role')
      .lean()
      .then((users) =>
        users.map((u) => ({
          id: u._id.toString(),
          name: u.name,
          email: u.email,
          employee_id: u.employee_id || 'EMP',
          designation: u.designation || 'Employee',
          role: u.role,
        }))
      );

    return NextResponse.json({
      members: membersWithStats,
      allEmployees: allActiveEmployees,
    });
  } catch (error) {
    console.error('Error in GET /api/it/team:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

