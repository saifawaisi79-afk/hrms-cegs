import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Candidate from '@/lib/models/Candidate';
import { getAuthUser, requireRole } from '@/lib/auth';
import { normalizeCandidateDate, todayIsoDate } from '@/lib/candidate-dates';

/**
 * DELETE /api/candidates/all?date=YYYY-MM-DD&employee=Name
 * - Employees: may only clear their own rows for the given date
 * - Admin/SA: may clear a filtered employee or all rows for that date
 * - Without date: admin/SA only — wipe entire collection (legacy)
 */
export async function DELETE(request: Request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Access token required' }, { status: 401 });
    }

    const url = new URL(request.url);
    const dateParam = url.searchParams.get('date') || '';
    const employeeParam = (url.searchParams.get('employee') || '').trim();
    const sheetDate = normalizeCandidateDate(dateParam) || todayIsoDate();

    const isAdmin = requireRole(authUser, ['admin', 'super_admin']);
    const selfName = String(authUser.name || '').trim();

    await connectDB();

    // Legacy full wipe — admin only, and only when no date scoped
    if (!dateParam && !employeeParam) {
      if (!isAdmin) {
        return NextResponse.json(
          { error: 'Permission denied. Employees must clear by date (own entries).' },
          { status: 403 }
        );
      }
      const wiped = await Candidate.deleteMany({});
      return NextResponse.json({
        message: 'Datasheet cleared successfully',
        deletedCount: wiped.deletedCount || 0,
      });
    }

    // Load candidates and filter by normalized date (dates stored as DD/MM/YYYY or ISO)
    const all = await Candidate.find({}).lean();
    const targetEmployee = isAdmin
      ? employeeParam && employeeParam.toUpperCase() !== 'ALL'
        ? employeeParam
        : null
      : selfName;

    if (!isAdmin && !selfName) {
      return NextResponse.json({ error: 'Cannot clear: missing user name on session.' }, { status: 400 });
    }

    const idsToDelete = all
      .filter((c) => {
        const candDate = normalizeCandidateDate(c.date);
        const dateOk = candDate === sheetDate || (!candDate && sheetDate === todayIsoDate());
        if (!dateOk) return false;
        if (!targetEmployee) return true;
        return String(c.employee || '').trim().toLowerCase() === targetEmployee.toLowerCase();
      })
      .map((c) => c._id);

    if (idsToDelete.length === 0) {
      return NextResponse.json({
        message: 'No matching entries for that date',
        deletedCount: 0,
        date: sheetDate,
        employee: targetEmployee,
      });
    }

    const result = await Candidate.deleteMany({ _id: { $in: idsToDelete } });

    return NextResponse.json({
      message: 'Daily sheet cleared successfully',
      deletedCount: result.deletedCount || 0,
      date: sheetDate,
      employee: targetEmployee,
    });
  } catch (error: any) {
    console.error('Candidate DELETE ALL Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
