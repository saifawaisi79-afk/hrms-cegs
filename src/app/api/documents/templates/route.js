import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import DocumentTemplate from '@/lib/models/DocumentTemplate';
import { getAuthUser, requireRole } from '@/lib/auth';

// GET /api/documents/templates
export async function GET(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });

  await connectDB();
  const templates = await DocumentTemplate.find({}).lean();
  return NextResponse.json(templates.map(t => ({ ...t, id: t._id?.toString(), _id: t._id?.toString() })));
}

// POST /api/documents/templates
export async function POST(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });
  if (!requireRole(authUser, ['admin', 'super_admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { name, subject, body_template } = await request.json();
  await connectDB();
  const tmpl = await DocumentTemplate.create({ name, subject, body_template });
  return NextResponse.json({ id: tmpl._id.toString() }, { status: 201 });
}
