import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import HRMSDocument from '@/lib/models/Document';
import { getAuthUser } from '@/lib/auth';

// POST /api/documents/request
export async function POST(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });

  const { document_type } = await request.json();
  await connectDB();
  const doc = await HRMSDocument.create({
    user_id: authUser.id,
    title: `${document_type} Request`,
    document_type,
    created_at: new Date().toISOString(),
    status: 'generated',
  });
  return NextResponse.json({ id: doc._id.toString() }, { status: 201 });
}
