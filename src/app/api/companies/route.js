import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import RecruitmentCompany from '@/lib/models/RecruitmentCompany';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const DEFAULT_SEED_COMPANIES = [
  'ALTRUIST',
  'ONE POINT ONE',
  'STARTEK',
  'TRIO',
  'ISON',
  'RADICAL MINDS',
  'ILEADS',
  'FIVES DIGITAL',
];

async function ensureSeedCompanies() {
  const count = await RecruitmentCompany.countDocuments();
  if (count === 0) {
    const ops = DEFAULT_SEED_COMPANIES.map((name) => ({
      name,
      status: 'ACTIVE',
      createdBy: 'SEED',
    }));
    await RecruitmentCompany.insertMany(ops, { ordered: false }).catch(() => {});
  }
}

export async function GET(request) {
  try {
    await connectDB();
    await ensureSeedCompanies();

    const companies = await RecruitmentCompany.find({ status: 'ACTIVE' })
      .sort({ name: 1 })
      .lean();

    const names = companies.map((c) => c.name.toUpperCase());

    return NextResponse.json({
      success: true,
      companies: companies.map((c) => ({
        id: c._id.toString(),
        name: c.name.toUpperCase(),
        status: c.status,
        createdAt: c.createdAt,
      })),
      names,
    });
  } catch (err) {
    console.error('GET /api/companies error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch companies' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const rawName = body?.name;

    if (!rawName || typeof rawName !== 'string' || !rawName.trim()) {
      return NextResponse.json(
        { success: false, error: 'Company name is required' },
        { status: 400 }
      );
    }

    const cleanName = rawName.trim().toUpperCase();

    await connectDB();

    // Upsert or reactivate company
    const existing = await RecruitmentCompany.findOne({ name: cleanName });
    if (existing) {
      if (existing.status !== 'ACTIVE') {
        existing.status = 'ACTIVE';
        await existing.save();
      }
    } else {
      await RecruitmentCompany.create({
        name: cleanName,
        status: 'ACTIVE',
        createdBy: authUser.name || authUser.email || 'USER',
      });
    }

    const companies = await RecruitmentCompany.find({ status: 'ACTIVE' })
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      message: `Company ${cleanName} added successfully`,
      companies: companies.map((c) => ({
        id: c._id.toString(),
        name: c.name.toUpperCase(),
        status: c.status,
      })),
      names: companies.map((c) => c.name.toUpperCase()),
    });
  } catch (err) {
    console.error('POST /api/companies error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to add company' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const url = new URL(request.url);
    const rawName = body?.name || url.searchParams.get('name');
    const rawId = body?.id || url.searchParams.get('id');

    if (!rawName && !rawId) {
      return NextResponse.json(
        { success: false, error: 'Company name or ID is required for deletion' },
        { status: 400 }
      );
    }

    await connectDB();

    if (rawId) {
      await RecruitmentCompany.findByIdAndDelete(rawId);
    } else if (rawName) {
      const cleanName = String(rawName).trim().toUpperCase();
      await RecruitmentCompany.deleteOne({ name: cleanName });
    }

    const companies = await RecruitmentCompany.find({ status: 'ACTIVE' })
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      message: 'Company removed successfully',
      companies: companies.map((c) => ({
        id: c._id.toString(),
        name: c.name.toUpperCase(),
        status: c.status,
      })),
      names: companies.map((c) => c.name.toUpperCase()),
    });
  } catch (err) {
    console.error('DELETE /api/companies error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to remove company' },
      { status: 500 }
    );
  }
}
