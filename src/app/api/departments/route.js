import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Department from '@/lib/models/Department';
import User from '@/lib/models/User';
import { getAuthUser, requireRole } from '@/lib/auth';

// Helper to serialize mongoose doc
function serializeDept(d) {
  const obj = d.toObject ? d.toObject() : d;
  return {
    ...obj,
    id: obj._id?.toString(),
    _id: obj._id?.toString(),
    manager_id: obj.manager_id?.toString() || null,
    manager_name: obj.manager_name || null,
    employee_count: obj.employee_count ?? 0,
  };
}

// GET /api/departments
export async function GET(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });

  await connectDB();
  const departments = await Department.find().populate('manager_id', 'name').lean();

  const result = await Promise.all(
    departments.map(async (d) => {
      const count = await User.countDocuments({ department_id: d._id, status: 'active' });
      return {
        ...d,
        id: d._id.toString(),
        _id: d._id.toString(),
        manager_id: d.manager_id?._id?.toString() || null,
        manager_name: d.manager_id?.name || null,
        employee_count: count,
      };
    })
  );

  return NextResponse.json(result);
}

// POST /api/departments
export async function POST(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });
  if (!requireRole(authUser, ['admin', 'super_admin'])) {
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
  }

  const { name, code, manager_id, budget } = await request.json();
  if (!name || !code) {
    return NextResponse.json({ error: 'Name and code are required' }, { status: 400 });
  }

  await connectDB();
  try {
    const dept = await Department.create({ name, code, manager_id: manager_id || null, budget: budget || 0 });
    return NextResponse.json({ id: dept._id.toString(), name, code, manager_id, budget }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Department code or name already exists' }, { status: 500 });
  }
}
