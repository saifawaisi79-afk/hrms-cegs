import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import HRMSDocument from '@/lib/models/Document';
import DocumentTemplate from '@/lib/models/DocumentTemplate';
import User from '@/lib/models/User';
import { getAuthUser, requireRole } from '@/lib/auth';

// GET /api/documents
export async function GET(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });

  await connectDB();
  const filter = authUser.role === 'employee' ? { user_id: authUser.id } : {};
  const docs = await HRMSDocument.find(filter).sort({ created_at: -1 }).lean();
  return NextResponse.json(docs.map(d => ({ ...d, id: d._id?.toString(), _id: d._id?.toString(), user_id: d.user_id?.toString() })));
}
