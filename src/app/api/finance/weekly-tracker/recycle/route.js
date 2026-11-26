import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import JoinerEntry from '@/lib/models/JoinerEntry';
import Candidate from '@/lib/models/Candidate';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function canAccessWeeklyFinance(user) {
  if (!user) return false;
  const r = String(user.role || '').toLowerCase();
  const eid = String(user.employee_id || user.eid || '').toUpperCase();
  const name = String(user.name || '').toLowerCase();
  const email = String(user.email || '').toLowerCase();
  const isRaheel = eid === 'EMP0005' || name.includes('raheel') || email.includes('raheel');
  return ['admin', 'super_admin', 'finance', 'it_team', 'hr', 'management'].includes(r) || isRaheel;
}

async function findExistingEntry({ overlayId, candidateId }) {
  if (overlayId && mongoose.Types.ObjectId.isValid(overlayId)) {
    const byOverlay = await JoinerEntry.findById(overlayId);
    if (byOverlay) return byOverlay;
  }
  if (candidateId) {
    const byCandidate = await JoinerEntry.findOne({ candidateId: String(candidateId) });
    if (byCandidate) return byCandidate;
  }
  return null;
}

// POST /api/finance/weekly-tracker/recycle
// Actions: 'delete' (move to recycle bin), 'restore' (restore to active list), 'permanent_delete' (remove or exclude permanently)
export async function POST(request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Access token required' }, { status: 401 });
    }
    if (!canAccessWeeklyFinance(authUser)) {
      return NextResponse.json({ error: 'Forbidden: Finance/HR/Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const action = String(body.action || '').trim();
    const overlayId = String(body.overlayId || '').trim();
    const candidateId = String(body.candidateId || '').trim();
    const candidateName = String(body.candidateName || '').trim();
    const phone = String(body.phone || '').trim();
    const company = String(body.company || '').trim();
    const process = String(body.process || '').trim();
    const joiningDate = String(body.joiningDate || '').trim();
    const recruiter = String(body.recruiter || '').trim();

    if (!['delete', 'restore', 'permanent_delete'].includes(action)) {
      return NextResponse.json({ error: 'Invalid recycle action' }, { status: 400 });
    }

    await connectDB();

    const actor = String(authUser.name || authUser.email || authUser.employee_id || 'Finance').trim();
    const nowIso = new Date().toISOString();
    const existing = await findExistingEntry({ overlayId, candidateId });

    if (action === 'delete') {
      if (existing) {
        existing.weeklyDeleted = true;
        existing.weeklyDeletedAt = nowIso;
        existing.weeklyDeletedBy = actor;
        existing.weeklyExcluded = false;
        await existing.save();
        return NextResponse.json({ success: true, action, overlayId: existing._id.toString() });
      }

      let candDoc = null;
      if (candidateId && mongoose.Types.ObjectId.isValid(candidateId)) {
        candDoc = await Candidate.findById(candidateId).lean();
      }

      const nameToStore = String(candDoc?.name || candidateName || 'Candidate').trim();
      const created = await JoinerEntry.create({
        candidateId,
        name: nameToStore,
        phone: String(candDoc?.number || phone || '').trim(),
        company: String(candDoc?.company || company || '').trim(),
        process: String(candDoc?.process || process || '').trim(),
        dateOfJoining: String(candDoc?.date || joiningDate || '').trim(),
        recruiterName: String(candDoc?.employee || recruiter || '').trim(),
        createdBy: actor,
        weeklyDeleted: true,
        weeklyDeletedAt: nowIso,
        weeklyDeletedBy: actor,
        weeklyExcluded: false,
      });

      return NextResponse.json({ success: true, action, overlayId: created._id.toString() });
    }

    if (action === 'restore') {
      if (!existing) {
        return NextResponse.json({ error: 'Recycle bin record not found' }, { status: 404 });
      }
      existing.weeklyDeleted = false;
      existing.weeklyDeletedAt = '';
      existing.weeklyDeletedBy = '';
      existing.weeklyExcluded = false;
      await existing.save();
      return NextResponse.json({ success: true, action, overlayId: existing._id.toString() });
    }

    // action === 'permanent_delete'
    if (existing) {
      if (existing.candidateId) {
        // Keep Recruitment Candidate untouched; permanently hide from Weekly Update (A)
        existing.weeklyDeleted = false;
        existing.weeklyExcluded = true;
        existing.weeklyDeletedAt = nowIso;
        existing.weeklyDeletedBy = actor;
        await existing.save();
      } else {
        await JoinerEntry.deleteOne({ _id: existing._id });
      }
      return NextResponse.json({ success: true, action, permanentMode: existing.candidateId ? 'excluded' : 'removed' });
    }

    if (candidateId) {
      await JoinerEntry.create({
        candidateId,
        name: candidateName || 'Candidate',
        phone,
        company,
        process,
        dateOfJoining: joiningDate,
        recruiterName: recruiter,
        createdBy: actor,
        weeklyDeleted: false,
        weeklyDeletedAt: nowIso,
        weeklyDeletedBy: actor,
        weeklyExcluded: true,
      });
      return NextResponse.json({ success: true, action, permanentMode: 'excluded' });
    }

    return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
  } catch (err) {
    console.error('Weekly Tracker Recycle Error:', err);
    return NextResponse.json({ error: 'Failed to process recycle bin action' }, { status: 500 });
  }
}
