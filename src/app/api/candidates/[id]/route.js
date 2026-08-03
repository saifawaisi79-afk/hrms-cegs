import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Candidate from '@/lib/models/Candidate';
import { getAuthUser, requireRole } from '@/lib/auth';

// PUT /api/candidates/[id]
export async function PUT(request, { params }) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });

  const body = await request.json();
  await connectDB();
  const candidate = await Candidate.findByIdAndUpdate(params.id, body, { new: true });
  
  if (!candidate) {
    return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
  }

  return NextResponse.json({ message: 'Candidate updated successfully', candidate });
}

// DELETE /api/candidates/[id]
export async function DELETE(request, { params }) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });

  await connectDB();
  await Candidate.findByIdAndDelete(params.id);
  
  return NextResponse.json({ message: 'Candidate deleted successfully' });
}
