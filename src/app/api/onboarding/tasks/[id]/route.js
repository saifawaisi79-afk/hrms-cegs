import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import OnboardingTask from '@/lib/models/OnboardingTask';
import OnboardingHire from '@/lib/models/OnboardingHire';
import { getAuthUser } from '@/lib/auth';

// PUT /api/onboarding/tasks/[id]
export async function PUT(request, { params }) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });

  const { is_completed } = await request.json();
  await connectDB();

  const task = await OnboardingTask.findByIdAndUpdate(params.id, { is_completed: !!is_completed }, { new: true });
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  // Recalculate progress
  const allTasks = await OnboardingTask.find({ hire_id: task.hire_id });
  const completed = allTasks.filter(t => t.is_completed).length;
  const progress = Math.round((completed / allTasks.length) * 100);
  await OnboardingHire.findByIdAndUpdate(task.hire_id, {
    progress_percent: progress,
    status: progress === 100 ? 'completed' : 'in_progress',
  });

  return NextResponse.json({ message: 'Task updated', changes: 1 });
}
