/**
 * Authority check for Live Team Messenger Group creation and administration.
 *
 * Requirements:
 * - Only HR (Admin / Super Admin) and Finance & Invoice Portal members
 *   have authority to create groups.
 * - Group Admins (and HR / Finance admins) have authority to add/remove members.
 */

export function canCreateMessengerGroup(user, dbUsers = []) {
  if (!user) return false;

  const role = String(user.role || '').toLowerCase();

  // 1. HR (Admin / Super Admin)
  if (role === 'admin' || role === 'super_admin') return true;

  // 2. Finance role
  if (role === 'finance') return true;

  // 3. Check designation / title / department strings
  const title = String(user.title || user.designation || '').toLowerCase();
  const dept = String(
    user.department || user.department_name || user.dept || ''
  ).toLowerCase();

  const isHrDesignation =
    title.includes('hr') ||
    title.includes('human resource') ||
    dept.includes('hr') ||
    dept.includes('human resource');

  if (isHrDesignation) return true;

  const isFinanceOrInvoice =
    title.includes('finance') ||
    title.includes('invoice') ||
    title.includes('billing') ||
    title.includes('account') ||
    dept.includes('finance') ||
    dept.includes('invoice') ||
    dept.includes('billing') ||
    dept.includes('account');

  if (isFinanceOrInvoice) return true;

  // Cross-reference with dbUsers if user object is partial
  if (Array.isArray(dbUsers) && dbUsers.length > 0) {
    const uid = String(user.id || user._id || '');
    const email = String(user.email || '').toLowerCase();
    const matched = dbUsers.find(
      (u) =>
        u &&
        u !== user &&
        ((uid && String(u.id || u._id) === uid) ||
          (email && String(u.email || '').toLowerCase() === email))
    );
    if (matched) {
      return canCreateMessengerGroup(matched, []);
    }
  }

  return false;
}

export function isGroupAdmin(group, user, dbUsers = []) {
  if (!group || !user) return false;
  const uid = String(user.id || user._id || '');

  // Super admin / HR / Finance always have administrative authority
  if (canCreateMessengerGroup(user, dbUsers)) return true;

  // Group creator is always an admin
  const creatorId = String(group.created_by || group.creatorId || '');
  if (creatorId && creatorId === uid) return true;

  // Check admins list
  const adminIds = (group.admins || []).map((a) =>
    String(typeof a === 'object' && a !== null ? a.id || a._id : a)
  );

  return adminIds.includes(uid);
}
