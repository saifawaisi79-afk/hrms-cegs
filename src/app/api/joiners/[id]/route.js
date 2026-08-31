import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { z } from 'zod';
import connectDB from '@/lib/db';
import JoinerEntry from '@/lib/models/JoinerEntry';
import { getAuthUser } from '@/lib/auth';

const updateSchema = z.object({
  slNo: z.number().optional(),
  name: z.string().optional(),
  phone: z.string().optional(),
  process: z.string().optional(),
  dateOfJoining: z.string().optional(),
  billingDate: z.string().optional(),
  employeeCode: z.string().optional(),
  interviewDate: z.string().optional(),
  recruiterName: z.string().optional(),
  week1: z.string().optional(),
  week2: z.string().optional(),
  week3: z.string().optional(),
  week4: z.string().optional(),
  week5: z.string().optional(),
  week6: z.string().optional(),
  week7: z.string().optional(),
  week8: z.string().optional(),
  candidateId: z.string().optional(),
});

// PUT /api/joiners/[id]
export async function PUT(request, { params }) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Access token required' }, { status: 401 });
    }

    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    await connectDB();
    const updated = await JoinerEntry.findByIdAndUpdate(id, parsed.data, { new: true });
    if (!updated) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    const o = updated.toObject();
    return NextResponse.json({
      message: 'Updated',
      entry: { ...o, id: o._id.toString(), _id: o._id.toString() },
    });
  } catch (error) {
    console.error('Joiner PUT Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/joiners/[id]
export async function DELETE(request, { params }) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Access token required' }, { status: 401 });
    }

    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    await connectDB();
    const deleted = await JoinerEntry.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    console.error('Joiner DELETE Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
