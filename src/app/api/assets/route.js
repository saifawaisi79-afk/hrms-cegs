import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Asset from '@/lib/models/Asset';
import { getAuthUser, requireRole } from '@/lib/auth';

function flattenAsset(a) {
  const obj = a.toObject ? a.toObject() : a;
  return {
    ...obj,
    id: obj._id?.toString(), _id: obj._id?.toString(),
    assigned_to: obj.assigned_to?._id?.toString() || obj.assigned_to?.toString() || null,
    assigned_name: obj.assigned_to?.name || null,
    assigned_employee_id: obj.assigned_to?.employee_id || null,
  };
}

// GET /api/assets
export async function GET(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });

  await connectDB();
  const filter = authUser.role === 'employee' ? { assigned_to: authUser.id } : {};
  const assets = await Asset.find(filter).populate('assigned_to', 'name employee_id').lean();
  return NextResponse.json(assets.map(flattenAsset));
}

// POST /api/assets
export async function POST(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });
  if (!requireRole(authUser, ['admin', 'super_admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { asset_name, serial_number, category, status, assigned_to, condition, location } = await request.json();
  if (!asset_name || !serial_number || !category) {
    return NextResponse.json({ error: 'Asset name, serial number, and category are required' }, { status: 400 });
  }

  await connectDB();
  try {
    const today = new Date().toISOString().split('T')[0];
    const asset = await Asset.create({ asset_name, serial_number, category, status: status || 'available', assigned_to: assigned_to || null, condition: condition || 'new', location: location || 'main_office', date_added: today });
    return NextResponse.json({ id: asset._id.toString(), asset_name, serial_number, category }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Serial number already exists' }, { status: 500 });
  }
}
