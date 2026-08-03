import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import OnboardingHire from '@/lib/models/OnboardingHire';
import OnboardingTask from '@/lib/models/OnboardingTask';
import { getAuthUser, requireRole } from '@/lib/auth';

// GET /api/onboarding
export async function GET(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });
  if (!requireRole(authUser, ['admin', 'super_admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectDB();
  const hires = await OnboardingHire.find({}).populate('user_id', 'name employee_id avatar_url').lean();
  const result = await Promise.all(hires.map(async (h) => {
    const tasks = await OnboardingTask.find({ hire_id: h._id }).lean();
    return {
      ...h,
      id: h._id?.toString(), _id: h._id?.toString(),
      user_id: h.user_id?._id?.toString() || null,
      employee_name: h.user_id?.name || null,
      employee_id: h.user_id?.employee_id || null,
      avatar_url: h.user_id?.avatar_url || null,
      tasks: tasks.map(t => ({ ...t, id: t._id?.toString(), _id: t._id?.toString(), hire_id: t.hire_id?.toString() })),
    };
  }));
  return NextResponse.json(result);
}

// POST /api/onboarding
export async function POST(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });
  if (!requireRole(authUser, ['admin', 'super_admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { user_id, position, start_date, tasks } = await request.json();
  await connectDB();
  const hire = await OnboardingHire.create({ user_id, position, start_date, progress_percent: 0, status: 'in_progress' });

  if (tasks && tasks.length) {
    await OnboardingTask.insertMany(tasks.map(t => ({ hire_id: hire._id, task_name: t.task_name, role_specific: t.role_specific || 'all', is_completed: false })));
  }

  return NextResponse.json({ id: hire._id.toString() }, { status: 201 });
}
