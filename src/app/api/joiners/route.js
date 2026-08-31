import { NextResponse } from 'next/server';
import { z } from 'zod';
import connectDB from '@/lib/db';
import JoinerEntry from '@/lib/models/JoinerEntry';
import { getAuthUser } from '@/lib/auth';

const schema = z.object({
  slNo: z.number().optional().default(0),
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional().default(''),
  process: z.string().optional().default(''),
  dateOfJoining: z.string().optional().default(''),
  billingDate: z.string().optional().default(''),
  employeeCode: z.string().optional().default(''),
  interviewDate: z.string().optional().default(''),
  recruiterName: z.string().optional().default(''),
  week1: z.string().optional().default(''),
  week2: z.string().optional().default(''),
  week3: z.string().optional().default(''),
  week4: z.string().optional().default(''),
  week5: z.string().optional().default(''),
  week6: z.string().optional().default(''),
  week7: z.string().optional().default(''),
  week8: z.string().optional().default(''),
  candidateId: z.string().optional().default(''),
  createdBy: z.string().optional().default(''),
});

function flatten(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    ...o,
    id: o._id?.toString(),
    _id: o._id?.toString(),
  };
}

// GET /api/joiners
export async function GET(request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Access token required' }, { status: 401 });
    }

    await connectDB();
    const rows = await JoinerEntry.find({}).sort({ slNo: 1, createdAt: 1 }).lean();
    return NextResponse.json(rows.map(flatten));
  } catch (error) {
    console.error('Joiner GET Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/joiners — create or upsert by candidateId
export async function POST(request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Access token required' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    await connectDB();
    const data = {
      ...parsed.data,
      createdBy: parsed.data.createdBy || authUser.name || authUser.email || '',
    };

    if (data.candidateId) {
      const existing = await JoinerEntry.findOne({ candidateId: data.candidateId });
      if (existing) {
        Object.assign(existing, {
          name: data.name || existing.name,
          phone: data.phone || existing.phone,
          process: data.process ?? existing.process,
          dateOfJoining: data.dateOfJoining ?? existing.dateOfJoining,
          billingDate: data.billingDate ?? existing.billingDate,
          employeeCode: data.employeeCode ?? existing.employeeCode,
          interviewDate: data.interviewDate ?? existing.interviewDate,
          recruiterName: data.recruiterName || existing.recruiterName,
          week1: data.week1 ?? existing.week1,
          week2: data.week2 ?? existing.week2,
          week3: data.week3 ?? existing.week3,
          week4: data.week4 ?? existing.week4,
          week5: data.week5 ?? existing.week5,
          week6: data.week6 ?? existing.week6,
          week7: data.week7 ?? existing.week7,
          week8: data.week8 ?? existing.week8,
        });
        await existing.save();
        return NextResponse.json(flatten(existing));
      }
    }

    let slNo = data.slNo;
    if (!slNo) {
      const last = await JoinerEntry.findOne({}).sort({ slNo: -1 }).lean();
      slNo = (last?.slNo || 0) + 1;
    }

    const created = await JoinerEntry.create({ ...data, slNo });
    return NextResponse.json(flatten(created), { status: 201 });
  } catch (error) {
    console.error('Joiner POST Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
