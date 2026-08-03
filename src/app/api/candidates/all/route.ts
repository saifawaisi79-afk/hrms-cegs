import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Candidate from '@/lib/models/Candidate';
import { getAuthUser, requireRole } from '@/lib/auth';

// DELETE /api/candidates/all
export async function DELETE(request: Request) {
  try {
    const authUser = getAuthUser(request);
    
    if (!authUser) {
      return NextResponse.json({ error: 'Access token required' }, { status: 401 });
    }

    // Only allow admins to clear the whole datasheet
    if (!requireRole(authUser, ['admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Permission denied. Only admins can clear the datasheet.' }, { status: 403 });
    }

    await connectDB();
    await Candidate.deleteMany({});
    
    return NextResponse.json({ message: 'Datasheet cleared successfully' });
  } catch (error: any) {
    console.error('Candidate DELETE ALL Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
