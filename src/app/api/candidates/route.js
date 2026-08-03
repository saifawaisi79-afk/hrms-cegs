import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Candidate from '@/lib/models/Candidate';
import { getAuthUser } from '@/lib/auth';

// GET /api/candidates
export async function GET(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });

  await connectDB();
  const candidates = await Candidate.find({}).sort({ slNo: 1 }).lean();
  
  return NextResponse.json(candidates.map(c => ({
    ...c,
    id: c._id?.toString(),
    _id: c._id?.toString()
  })));
}

// POST /api/candidates
export async function POST(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });

  const body = await request.json();
  await connectDB();
  
  // If bulk insert
  if (Array.isArray(body)) {
    const inserted = await Candidate.insertMany(body);
    return NextResponse.json(inserted.map(c => ({ ...c.toObject(), id: c._id.toString() })), { status: 201 });
  }

  const candidate = await Candidate.create(body);
  return NextResponse.json({ ...candidate.toObject(), id: candidate._id.toString() }, { status: 201 });
}
