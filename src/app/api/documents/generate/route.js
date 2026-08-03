import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import HRMSDocument from '@/lib/models/Document';
import DocumentTemplate from '@/lib/models/DocumentTemplate';
import User from '@/lib/models/User';
import { getAuthUser, requireRole } from '@/lib/auth';

// POST /api/documents/generate
export async function POST(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });
  if (!requireRole(authUser, ['admin', 'super_admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { user_id, template_name } = await request.json();
  await connectDB();

  const template = await DocumentTemplate.findOne({ name: template_name }).lean();
  const user = await User.findById(user_id).lean();

  if (!template || !user) {
    return NextResponse.json({ error: 'Template or user not found' }, { status: 404 });
  }

  // Compile template with user data
  let content = template.body_template
    .replace(/\{\{name\}\}/g, user.name)
    .replace(/\{\{employee_id\}\}/g, user.employee_id)
    .replace(/\{\{designation\}\}/g, user.designation || '')
    .replace(/\{\{joining_date\}\}/g, user.joining_date || '')
    .replace(/\{\{date\}\}/g, new Date().toLocaleDateString());

  const doc = await HRMSDocument.create({
    user_id: user._id,
    title: template.subject,
    document_type: template_name,
    template_name,
    content,
    status: 'generated',
    created_at: new Date().toISOString(),
  });

  return NextResponse.json({ id: doc._id.toString(), status: 'generated' }, { status: 201 });
}
