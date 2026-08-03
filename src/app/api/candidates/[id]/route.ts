import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { z } from 'zod';
import connectDB from '@/lib/db';
import Candidate from '@/lib/models/Candidate';
import { getAuthUser } from '@/lib/auth';

const updateCandidateSchema = z.object({
  slNo: z.number().optional(),
  date: z.string().optional(),
  name: z.string().optional(),
  number: z.string().optional(),
  languages: z.string().optional(),
  qualification: z.string().optional(),
  response: z.string().optional(),
  callStatus: z.string().optional(),
  location: z.string().optional(),
  experience: z.number().optional(),
  followUp1: z.string().optional(),
  followUp2: z.string().optional(),
  followUp3: z.string().optional(),
  category: z.string().optional(),
  employee: z.string().optional(),
});

// PUT /api/candidates/[id]
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const authUser = getAuthUser(request);
    
    if (!authUser) {
      return NextResponse.json({ error: 'Access token required' }, { status: 401 });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid candidate ID format' }, { status: 400 });
    }

    const body = await request.json();
    const parseResult = updateCandidateSchema.safeParse(body);
    
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Validation failed', details: parseResult.error.issues }, { status: 400 });
    }

    await connectDB();
    const candidate = await Candidate.findByIdAndUpdate(id, parseResult.data, { new: true });
    
    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Candidate updated successfully', candidate });
  } catch (error: any) {
    console.error('Candidate PUT Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/candidates/[id]
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const authUser = getAuthUser(request);
    
    if (!authUser) {
      return NextResponse.json({ error: 'Access token required' }, { status: 401 });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid candidate ID format' }, { status: 400 });
    }

    await connectDB();
    const candidate = await Candidate.findByIdAndDelete(id);
    
    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Candidate deleted successfully' });
  } catch (error: any) {
    console.error('Candidate DELETE Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
