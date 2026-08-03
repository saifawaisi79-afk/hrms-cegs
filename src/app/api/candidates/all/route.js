import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Candidate from '@/lib/models/Candidate';
import { getAuthUser, requireRole } from '@/lib/auth';

// DELETE /api/candidates/all
export async function DELETE(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });

  // Only allow admin/super_admin or authorized roles to clear all candidates
  // if (!requireRole(authUser, ['admin', 'super_admin'])) {
  //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  // }

  await connectDB();
  await Candidate.deleteMany({});
  
  return NextResponse.json({ message: 'All candidates deleted successfully' });
}
