import { NextResponse } from 'next/server';
import { z } from 'zod';
import connectDB from '@/lib/db';
import Candidate from '@/lib/models/Candidate';
import { getAuthUser } from '@/lib/auth';
import { candidateDateMongoQuery } from '@/lib/candidate-dates';

function getCurrentTime12(): string {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(new Date()).toUpperCase();
  } catch {
    const d = new Date();
    let hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;
  }
}

function formatTimeFromDate(d: Date | string | null | undefined): string {
  if (!d) return '';
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return '';
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(dt).toUpperCase();
  } catch {
    return '';
  }
}

const candidateSchema = z.object({
  slNo: z.number().optional().default(0),
  date: z.string().optional().default(''),
  time: z.string().optional().default(''),
  name: z.string().optional().default(''),
  number: z.string().optional().default(''),
  languages: z.string().optional().default(''),
  qualification: z.string().optional().default(''),
  response: z.string().optional().default(''),
  callStatus: z.string().optional().default(''),
  location: z.string().optional().default(''),
  company: z.string().optional().default(''),
  experience: z.number().optional().default(0),
  followUp1: z.string().optional().default(''),
  followUp2: z.string().optional().default(''),
  followUp3: z.string().optional().default(''),
  category: z.string().optional().default(''),
  employee: z.string().optional().default(''),
});

export const dynamic = 'force-dynamic';

// GET /api/candidates
export async function GET(request: Request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Access token required' }, { status: 401 });
    }

    await connectDB();
    const url = new URL(request.url);
    const dateParam = url.searchParams.get('date') || '';
    const joinedOnly = url.searchParams.get('joined') === '1';
    const clauses: Record<string, unknown>[] = [];

    const dateQuery = dateParam ? candidateDateMongoQuery(dateParam) : null;
    if (dateQuery) clauses.push(dateQuery);

    if (joinedOnly) {
      clauses.push({
        $or: [
          { category: { $regex: '^joined$', $options: 'i' } },
          { response: { $regex: 'join', $options: 'i' } },
          { followUp1: { $regex: 'join', $options: 'i' } },
          { followUp2: { $regex: 'join', $options: 'i' } },
          { followUp3: { $regex: 'join', $options: 'i' } },
        ],
      });
    }

    const filter =
      clauses.length === 0 ? {} : clauses.length === 1 ? clauses[0] : { $and: clauses };

    const candidates = await Candidate.find(filter).sort({ slNo: 1, createdAt: 1 }).lean();

    return NextResponse.json(candidates.map(c => ({
      ...c,
      id: c._id?.toString(),
      _id: c._id?.toString(),
      time: c.time || formatTimeFromDate((c as any).createdAt) || '',
    })));
  } catch (error: any) {
    console.error('Candidate GET Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/candidates
export async function POST(request: Request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Access token required' }, { status: 401 });
    }

    const body = await request.json();
    await connectDB();
    const autoNowTime = getCurrentTime12();
    
    // Bulk insert
    if (Array.isArray(body)) {
      const parsedArray = z.array(candidateSchema).safeParse(body);
      if (!parsedArray.success) {
        return NextResponse.json({ error: 'Validation failed', details: parsedArray.error.issues }, { status: 400 });
      }
      const dataWithTime = parsedArray.data.map(item => ({
        ...item,
        time: item.time && item.time.trim() ? item.time : autoNowTime,
      }));
      const inserted = await Candidate.insertMany(dataWithTime);
      return NextResponse.json(inserted.map(c => ({ ...c.toObject(), id: c._id.toString() })), { status: 201 });
    }

    // Single insert
    const parsedSingle = candidateSchema.safeParse(body);
    if (!parsedSingle.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsedSingle.error.issues }, { status: 400 });
    }
    const singleData = {
      ...parsedSingle.data,
      time: parsedSingle.data.time && parsedSingle.data.time.trim() ? parsedSingle.data.time : autoNowTime,
    };
    const candidate = await Candidate.create(singleData);
    return NextResponse.json({ ...candidate.toObject(), id: candidate._id.toString() }, { status: 201 });
  } catch (error: any) {
    console.error('Candidate POST Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
