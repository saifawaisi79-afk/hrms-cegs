import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import Attendance from '@/lib/models/Attendance';
import AttendanceWarning from '@/lib/models/AttendanceWarning';
import SystemSetting from '@/lib/models/SystemSetting';
import PermissionLog from '@/lib/models/PermissionLog';
import { getAuthUser } from '@/lib/auth';
import { toIsoDate } from '@/lib/auto-absent';
import { syncPayrollAttendanceDeduction } from '@/lib/attendance-deductions';
import { getRequiredShiftHours } from '@/lib/attendance-policy';

export const dynamic = 'force-dynamic';

function isAllowedAdmin(authUser) {
  if (!authUser) return false;
  return ['admin', 'super_admin', 'finance'].includes(authUser.role);
}

// GET /api/admin/permissions?date=YYYY-MM-DD&type=...&q=...
export async function GET(request) {
  try {
    const authUser = getAuthUser(request);
    if (!isAllowedAdmin(authUser)) {
      return NextResponse.json({ error: 'Forbidden: Admin, Finance, or Super Admin required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const dateQuery = searchParams.get('date');
    const typeFilter = searchParams.get('type') || '';
    const searchQuery = searchParams.get('q') || '';
    const targetDate = dateQuery && /^\d{4}-\d{2}-\d{2}$/.test(dateQuery.trim())
      ? dateQuery.trim()
      : toIsoDate(new Date());

    await connectDB();

    // 1. Fetch active employees
    const users = await User.find({ status: { $ne: 'inactive' } })
      .select('name email employee_id role designation status avatar_url wfh_allowed login_time department_id')
      .populate('department_id', 'name')
      .sort({ name: 1 })
      .lean();

    // 2. Fetch attendance for target date
    const attendanceRecords = await Attendance.find({ date: targetDate }).lean();
    const attendanceMap = new Map();
    attendanceRecords.forEach((att) => {
      attendanceMap.set(String(att.user_id), att);
    });

    // 3. Fetch late & early warnings for target date
    const lateWarnings = await AttendanceWarning.find({ date: targetDate, type: 'late_clock_in' }).lean();
    const lateWarningUserIds = new Set(lateWarnings.map((w) => String(w.user_id)));

    const earlyWarnings = await AttendanceWarning.find({ date: targetDate, type: 'early_clock_out' }).lean();
    const earlyWarningUserIds = new Set(earlyWarnings.map((w) => String(w.user_id)));

    // 4. Fetch SystemSettings: HRMS Stop, Announcement, 40% clause waivers, and early logout waivers
    const settings = await SystemSetting.find({
      key: {
        $in: [
          'hrms_stopped',
          'hrms_announcement',
          'hrms_announcement_level',
          'hrms_announcement_updated_at',
          `clause40_waivers_${targetDate}`,
          `early_logout_waivers_${targetDate}`,
        ],
      },
    }).lean();

    const settingsMap = new Map(settings.map((s) => [s.key, s.value]));
    const hrmsStopped = settingsMap.get('hrms_stopped') === 'true';
    const hrmsAnnouncement = settingsMap.get('hrms_announcement') || '';
    const hrmsAnnouncementLevel = settingsMap.get('hrms_announcement_level') || 'info';
    const hrmsAnnouncementUpdatedAt = settingsMap.get('hrms_announcement_updated_at') || null;

    let clause40Waivers = [];
    try {
      const rawWaivers = settingsMap.get(`clause40_waivers_${targetDate}`);
      if (rawWaivers) clause40Waivers = JSON.parse(rawWaivers);
    } catch {}

    const isAllWaived = clause40Waivers.includes('ALL');
    const waivedSet = new Set(clause40Waivers.map(String));

    let earlyLogoutWaivers = [];
    try {
      const rawEarly = settingsMap.get(`early_logout_waivers_${targetDate}`);
      if (rawEarly) earlyLogoutWaivers = JSON.parse(rawEarly);
    } catch {}

    const isAllEarlyAllowed = earlyLogoutWaivers.includes('ALL');
    const earlySet = new Set(earlyLogoutWaivers.map(String));

    const requiredShiftHours = getRequiredShiftHours(targetDate);
    const dateObj = new Date(targetDate + 'T12:00:00Z');
    const isSaturday = dateObj.getDay() === 6;

    // Merge employees with their permissions and status
    const employees = users.map((u) => {
      const uid = String(u._id);
      const att = attendanceMap.get(uid);
      const isLateRecorded = lateWarningUserIds.has(uid) || att?.status === 'late';
      const isEarlyRecorded = earlyWarningUserIds.has(uid);
      const isWaived = isAllWaived || waivedSet.has(uid);
      const isEarlyAllowed = isAllEarlyAllowed || earlySet.has(uid) || !!att?.early_logout_allowed;

      return {
        id: uid,
        employee_id: u.employee_id || 'EMP',
        name: u.name,
        email: u.email,
        role: u.role,
        designation: u.designation || 'Staff',
        department_name: u.department_id?.name || 'General',
        avatar_url: u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.name)}`,
        wfh_allowed: !!u.wfh_allowed,
        login_time: u.login_time || '10:00',
        attendance: att
          ? {
              status: att.status,
              check_in_time: att.check_in_time || null,
              check_out_time: att.check_out_time || null,
              work_hours: att.work_hours || 0,
              is_late: isLateRecorded,
              is_early_warning: isEarlyRecorded,
              is_overridden: att.status === 'present' && att.source === 'override',
            }
          : {
              status: 'no_record',
              check_in_time: null,
              check_out_time: null,
              work_hours: 0,
              is_late: false,
              is_early_warning: false,
              is_overridden: false,
            },
        clause40_waived: isWaived,
        early_logout_allowed: isEarlyAllowed,
        early_logout_reason: att?.early_logout_reason || '',
      };
    });

    // 5. Fetch Permission History & Audit Logs
    const historyQuery = {};
    if (typeFilter && typeFilter !== 'all') {
      historyQuery.permission_type = typeFilter;
    }
    if (searchQuery.trim()) {
      const regex = new RegExp(searchQuery.trim(), 'i');
      historyQuery.$or = [
        { user_name: regex },
        { employee_id: regex },
        { reason: regex },
        { granted_by: regex },
      ];
    }

    const historyLogs = await PermissionLog.find(historyQuery)
      .sort({ createdAt: -1 })
      .limit(120)
      .lean();

    return NextResponse.json({
      date: targetDate,
      isSaturday,
      requiredShiftHours,
      systemStatus: {
        hrms_stopped: hrmsStopped,
        hrms_announcement: hrmsAnnouncement,
        hrms_announcement_level: hrmsAnnouncementLevel,
        hrms_announcement_updated_at: hrmsAnnouncementUpdatedAt,
      },
      clause40_all_waived: isAllWaived,
      early_logout_all_allowed: isAllEarlyAllowed,
      employees,
      history: historyLogs,
    });
  } catch (error) {
    console.error('Error in GET /api/admin/permissions:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/permissions
export async function POST(request) {
  try {
    const authUser = getAuthUser(request);
    if (!isAllowedAdmin(authUser)) {
      return NextResponse.json({ error: 'Forbidden: Admin, Finance, or Super Admin required' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { action, reason: reqReason } = body;
    const authorName = authUser.name || authUser.email || 'HR Admin';
    const authorRole = authUser.role || 'admin';

    await connectDB();

    // Helper: log permission to PermissionLog collection
    const recordPermissionLog = async ({ userId, userName, userEmail, employeeId, permissionType, actionType, effectiveDate, reason, metadata }) => {
      try {
        await PermissionLog.create({
          user_id: userId,
          user_name: userName || 'Employee',
          user_email: userEmail || '',
          employee_id: employeeId || '',
          permission_type: permissionType,
          action: actionType || 'granted',
          effective_date: effectiveDate || toIsoDate(new Date()),
          reason: reason?.trim() || 'Approved by HR',
          granted_by: authorName,
          granted_by_role: authorRole,
          metadata: metadata || {},
        });
      } catch (err) {
        console.error('Failed to write PermissionLog:', err);
      }
    };

    // 1. Toggle WFH for a single employee
    if (action === 'toggle_wfh') {
      const { userId, wfh_allowed, reason } = body;
      if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 });

      const updated = await User.findByIdAndUpdate(userId, { wfh_allowed: !!wfh_allowed }, { new: true });
      if (!updated) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

      await recordPermissionLog({
        userId: updated._id,
        userName: updated.name,
        userEmail: updated.email,
        employeeId: updated.employee_id,
        permissionType: 'wfh',
        actionType: wfh_allowed ? 'granted' : 'revoked',
        effectiveDate: toIsoDate(new Date()),
        reason: reason || (wfh_allowed ? 'WFH permission granted' : 'WFH revoked'),
      });

      return NextResponse.json({
        success: true,
        message: `WFH ${wfh_allowed ? 'granted' : 'disabled'} for ${updated.name}`,
        userId,
        wfh_allowed: !!wfh_allowed,
      });
    }

    // 2. Toggle WFH for ALL active employees
    if (action === 'toggle_all_wfh') {
      const { wfh_allowed, reason } = body;
      await User.updateMany({ status: 'active' }, { wfh_allowed: !!wfh_allowed });

      await recordPermissionLog({
        userId: authUser.id,
        userName: 'All Active Employees',
        userEmail: 'all@company.com',
        employeeId: 'ALL',
        permissionType: 'wfh',
        actionType: wfh_allowed ? 'granted' : 'revoked',
        effectiveDate: toIsoDate(new Date()),
        reason: reason || (wfh_allowed ? 'Batch WFH granted for all staff' : 'Batch WFH revoked'),
      });

      return NextResponse.json({
        success: true,
        message: `WFH ${wfh_allowed ? 'granted to' : 'revoked from'} all active employees`,
        wfh_allowed: !!wfh_allowed,
      });
    }

    // 3. Auto Attendance Override: convert Late/Missed to ON-TIME
    if (action === 'override_attendance_ontime') {
      const { userId, date, check_in_time, reason } = body;
      if (!userId || !date) return NextResponse.json({ error: 'userId and date are required' }, { status: 400 });

      const user = await User.findById(userId).lean();
      if (!user) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

      const officialLoginTime = user.login_time || '10:00';
      const onTimePunch = check_in_time || `${officialLoginTime}:00`;

      // Upsert attendance record: set status to present (on-time), source to override
      const attendance = await Attendance.findOneAndUpdate(
        { user_id: userId, date },
        {
          $set: {
            status: 'present',
            check_in_time: onTimePunch,
            source: 'override',
            location_verified: true,
          },
        },
        { upsert: true, new: true }
      );

      // Remove late warning for this date if one exists
      await AttendanceWarning.deleteMany({ user_id: userId, date, type: 'late_clock_in' });

      // Recalculate payroll deduction for this month
      const [yearStr, monthStr] = date.split('-');
      const month = parseInt(monthStr, 10);
      const year = parseInt(yearStr, 10);
      try {
        await syncPayrollAttendanceDeduction(userId, month, year);
      } catch (e) {
        console.warn('Sync payroll deduction on override warning:', e.message);
      }

      await recordPermissionLog({
        userId: user._id,
        userName: user.name,
        userEmail: user.email,
        employeeId: user.employee_id,
        permissionType: 'auto_attendance_ontime',
        actionType: 'overridden',
        effectiveDate: date,
        reason: reason || 'Reached early/on-time; login failure overridden by HR',
        metadata: { onTimePunch },
      });

      return NextResponse.json({
        success: true,
        message: `Attendance for ${user.name} on ${date} marked ON-TIME. Late deductions cleared.`,
        attendance,
      });
    }

    // 4. Toggle 40% performance clause waiver for a date
    if (action === 'toggle_40_clause') {
      const { userId, date, ignore, reason } = body;
      if (!userId || !date) return NextResponse.json({ error: 'userId and date are required' }, { status: 400 });

      const key = `clause40_waivers_${date}`;
      const existing = await SystemSetting.findOne({ key }).lean();
      let waivers = [];
      try {
        if (existing?.value) waivers = JSON.parse(existing.value);
      } catch {}

      const targetIdStr = String(userId);
      let targetUser = null;
      if (userId !== 'ALL') {
        targetUser = await User.findById(userId).lean();
      }

      if (ignore) {
        if (!waivers.includes(targetIdStr)) waivers.push(targetIdStr);
      } else {
        waivers = waivers.filter((id) => id !== targetIdStr && id !== 'ALL');
      }

      await SystemSetting.findOneAndUpdate(
        { key },
        { value: JSON.stringify(waivers) },
        { upsert: true, new: true }
      );

      await recordPermissionLog({
        userId: targetUser ? targetUser._id : authUser.id,
        userName: targetUser ? targetUser.name : 'All Staff Members',
        userEmail: targetUser ? targetUser.email : 'all@company.com',
        employeeId: targetUser ? targetUser.employee_id : 'ALL',
        permissionType: 'clause_40_waive',
        actionType: ignore ? 'granted' : 'revoked',
        effectiveDate: date,
        reason: reason || (ignore ? '40% Performance Clause waived' : '40% Clause re-enforced'),
      });

      return NextResponse.json({
        success: true,
        message: `40% clause ${ignore ? 'waived / ignored' : 'enforced'} for ${date}`,
        userId,
        date,
        waived: !!ignore,
        waivers,
      });
    }

    // 5. Early Logout Permission: Grant or revoke early departure authorization
    if (action === 'toggle_early_logout') {
      const { userId, date, allowed, reason } = body;
      if (!userId || !date) return NextResponse.json({ error: 'userId and date are required' }, { status: 400 });

      const targetIdStr = String(userId);
      let targetUser = null;
      if (userId !== 'ALL') {
        targetUser = await User.findById(userId).lean();
      }

      // Update Attendance record if single employee
      if (targetUser) {
        const updateFields = {
          early_logout_allowed: !!allowed,
          early_logout_reason: allowed ? (reason || 'Approved early departure') : '',
        };

        // If currently half_day due to early clock out, restore to present
        const currentAtt = await Attendance.findOne({ user_id: userId, date }).lean();
        if (allowed && currentAtt?.status === 'half_day') {
          updateFields.status = 'present';
        }

        await Attendance.findOneAndUpdate(
          { user_id: userId, date },
          { $set: updateFields },
          { upsert: true }
        );

        // Delete any early_clock_out warning for this employee on this date
        if (allowed) {
          await AttendanceWarning.deleteMany({ user_id: userId, date, type: 'early_clock_out' });

          // Sync payroll deduction
          const [yearStr, monthStr] = date.split('-');
          try {
            await syncPayrollAttendanceDeduction(userId, parseInt(monthStr, 10), parseInt(yearStr, 10));
          } catch (e) {
            console.warn('Sync payroll deduction on early logout clearance:', e.message);
          }
        }
      }

      // Also persist in SystemSettings array for fast lookup during check-out
      const key = `early_logout_waivers_${date}`;
      const existing = await SystemSetting.findOne({ key }).lean();
      let waivers = [];
      try {
        if (existing?.value) waivers = JSON.parse(existing.value);
      } catch {}

      if (allowed) {
        if (!waivers.includes(targetIdStr)) waivers.push(targetIdStr);
      } else {
        waivers = waivers.filter((id) => id !== targetIdStr && id !== 'ALL');
      }

      await SystemSetting.findOneAndUpdate(
        { key },
        { value: JSON.stringify(waivers) },
        { upsert: true, new: true }
      );

      await recordPermissionLog({
        userId: targetUser ? targetUser._id : authUser.id,
        userName: targetUser ? targetUser.name : 'All Staff Members',
        userEmail: targetUser ? targetUser.email : 'all@company.com',
        employeeId: targetUser ? targetUser.employee_id : 'ALL',
        permissionType: 'early_logout',
        actionType: allowed ? 'granted' : 'revoked',
        effectiveDate: date,
        reason: reason || (allowed ? 'Early logout authorized by HR' : 'Early logout revoked'),
      });

      return NextResponse.json({
        success: true,
        message: `Early Logout permission ${allowed ? 'granted' : 'revoked'} for ${targetUser ? targetUser.name : 'staff'} on ${date}`,
        userId,
        date,
        allowed: !!allowed,
      });
    }

    // 6. Stop HRMS / Emergency Announcement Broadcast
    if (action === 'set_hrms_stop') {
      const { stopped, announcement, level, reason } = body;
      const nowIso = new Date().toISOString();

      await SystemSetting.findOneAndUpdate(
        { key: 'hrms_stopped' },
        { value: stopped ? 'true' : 'false' },
        { upsert: true }
      );

      await SystemSetting.findOneAndUpdate(
        { key: 'hrms_announcement' },
        { value: announcement || '' },
        { upsert: true }
      );

      await SystemSetting.findOneAndUpdate(
        { key: 'hrms_announcement_level' },
        { value: level || 'info' },
        { upsert: true }
      );

      await SystemSetting.findOneAndUpdate(
        { key: 'hrms_announcement_updated_at' },
        { value: nowIso },
        { upsert: true }
      );

      await recordPermissionLog({
        userId: authUser.id,
        userName: 'System Control',
        userEmail: authUser.email,
        employeeId: 'SYS',
        permissionType: stopped ? 'early_logout' : 'clause_40_waive',
        actionType: stopped ? 'overridden' : 'granted',
        effectiveDate: toIsoDate(new Date()),
        reason: reason || (stopped ? 'Emergency HRMS Stop activated' : announcement ? `Broadcast: ${announcement}` : 'System status reset'),
        metadata: { stopped: !!stopped, level, announcement },
      });

      return NextResponse.json({
        success: true,
        message: stopped
          ? 'HRMS Emergency Stop activated and broadcast to all portals'
          : announcement
          ? 'System announcement broadcast updated'
          : 'HRMS status set to normal',
        systemStatus: {
          hrms_stopped: !!stopped,
          hrms_announcement: announcement || '',
          hrms_announcement_level: level || 'info',
          hrms_announcement_updated_at: nowIso,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid action provided' }, { status: 400 });
  } catch (error) {
    console.error('Error in POST /api/admin/permissions:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
