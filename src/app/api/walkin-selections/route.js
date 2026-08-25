import { NextResponse } from 'next/server';
import { z } from 'zod';
import connectDB from '@/lib/db';
import WalkinSelection from '@/lib/models/WalkinSelection';
import { getAuthUser } from '@/lib/auth';

const schema = z.object({
  slNo: z.number().optional().default(0),
  name: z.string().min(1, 'Name is required'),
  number: z.string().min(1, 'Number is required'),
  company: z.string().optional().default(''),
  process: z.string().optional().default(''),
  recruiterName: z.string().min(1, 'Recruiter name is required'),
  rounds: z.string().optional().default(''),
  furtherUpdate: z.string().optional().default(''),
  date: z.string().optional().default(''),
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

// GET /api/walkin-selections
export async function GET(request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Access token required' }, { status: 401 });
    }

    await connectDB();
    const rows = await WalkinSelection.find({}).sort({ slNo: 1, createdAt: 1 }).lean();
    return NextResponse.json(rows.map(flatten));
  } catch (error) {
    console.error('WalkinSelection GET Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/walkin-selections
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
    let slNo = parsed.data.slNo;
    if (!slNo) {
      const last = await WalkinSelection.findOne({}).sort({ slNo: -1 }).lean();
      slNo = (last?.slNo || 0) + 1;
    }

    const created = await WalkinSelection.create({
      ...parsed.data,
      slNo,
      createdBy: parsed.data.createdBy || authUser.name || authUser.email || '',
    });

    return NextResponse.json(flatten(created), { status: 201 });
  } catch (error) {
    console.error('WalkinSelection POST Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
