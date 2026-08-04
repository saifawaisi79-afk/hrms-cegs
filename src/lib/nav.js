/**
 * Role-aware navbar — single source of truth for CEGS OS routes.
 * Paths match Phase A route map (single routes + nested targets).
 */

export const VIEW_TO_PATH = {
  login: '/login',
  dashboard: '/dashboard',
  users: '/users',
  settings: '/settings',
  employees: '/employees',
  reports: '/reports',
  helpdesk: '/helpdesk',
  profile: '/profile',
  directory: '/directory',
  announcements: '/announcements',
  exit: '/exit',
  notifications: '/notifications',
  recruitment: '/campaign/recruitment',
  targets: '/campaign/targets',
  workflows: '/campaign/workflows',
  rewards: '/campaign/rewards',
  jobs: '/campaign/jobs',
  meetings: '/campaign/meetings',
  onboarding: '/campaign/onboarding',
  performance: '/campaign/performance',
  learning: '/campaign/learning',
  timesheets: '/campaign/timesheets',
  ittickets: '/it/support',
  workstation: '/billing/workstation',
  payroll: '/billing/payroll',
  organizations: '/billing/organizations',
  permissions: '/billing/permissions',
  departments: '/billing/departments',
  policies: '/billing/policies',
  integrations: '/billing/integrations',
  auditlogs: '/billing/audit-logs',
  security: '/billing/security',
  attendance: '/billing/attendance',
  leaves: '/billing/leaves',
  documents: '/billing/documents',
  assets: '/billing/assets',
  auditor: '/billing/auditor',
  orgchart: '/admin/orgchart',
  expenses: '/admin/expenses',
  tasks: '/admin/tasks',
  backups: '/admin/backups',
  systemhealth: '/admin/system-health',
  apimonitor: '/admin/api-monitor',
  queryterminal: '/admin/query-terminal',
};

export const TARGET_SHEETS = [
  { slug: 'calls', label: 'Calls Made', viewKey: 'calls' },
  { slug: 'interviews', label: 'Interviews Scheduled', viewKey: 'interviews' },
  { slug: 'walkins', label: 'Walk-ins Today', viewKey: 'walkins' },
  { slug: 'selected', label: 'Selected Today', viewKey: 'selected' },
  { slug: 'joined', label: 'Joined Today', viewKey: 'joined' },
];

export function pathForView(viewKey) {
  return VIEW_TO_PATH[viewKey] || '/dashboard';
}

/** Portal selection → required Mongo role + post-login home */
export const PORTAL_HOME = {
  employee: { role: 'employee', path: '/dashboard', label: 'Employee Portal' },
  admin: { role: 'admin', path: '/employees', label: 'HR Admin Panel' },
  super_admin: { role: 'super_admin', path: '/dashboard', label: 'Super Admin' },
};

export function portalMatchesRole(portal, role) {
  if (!portal) return true;
  const meta = PORTAL_HOME[portal];
  if (!meta) return false;
  return meta.role === role;
}

export function homePathForPortal(portal) {
  return PORTAL_HOME[portal]?.path || '/dashboard';
}

export function portalLabel(portal) {
  return PORTAL_HOME[portal]?.label || 'workspace';
}

/** Canonical permission defaults when db.permissions is missing a key */
export const DEFAULT_PERMISSIONS = {
  super_admin: { payroll: true, attendance: true, deleteEmp: true, approveLeave: true, reports: true, onboard: true },
  admin: { payroll: true, attendance: true, deleteEmp: true, approveLeave: true, reports: true, onboard: true },
  manager: { payroll: true, attendance: true, deleteEmp: false, approveLeave: true, reports: true, onboard: false },
  employee: { payroll: true, attendance: false, deleteEmp: false, approveLeave: false, reports: false, onboard: false },
  recruiter: { payroll: true, attendance: false, deleteEmp: false, approveLeave: false, reports: true, onboard: false },
  finance: { payroll: true, attendance: false, deleteEmp: false, approveLeave: false, reports: true, onboard: false },
};

function getPermissionRole(u) {
  if (!u) return 'employee';
  if (u.role === 'super_admin') return 'super_admin';
  if (u.role === 'admin') return 'admin';
  const title = (u.title || u.designation || '').toLowerCase();
  if (title.includes('manager')) return 'manager';
  if (title.includes('recruiter')) return 'recruiter';
  if (title.includes('billing') || title.includes('finance') || title.includes('accounts')) return 'finance';
  return 'employee';
}

export function getUserPerms(user, db) {
  const currentPermRole = getPermissionRole(user);
  const fromDb = db?.permissions && db.permissions[currentPermRole];
  const defaults = DEFAULT_PERMISSIONS[currentPermRole] || DEFAULT_PERMISSIONS.employee;
  return { ...defaults, ...(fromDb || {}) };
}

/** Super Admin never does personal daily tasks — oversight of all employees only. */
export function isOversightOnly(user) {
  return user?.role === 'super_admin';
}

/**
 * Active employee recruiters for team progress views.
 * Prefers db.users with role=employee; merges candidate.employee names that are not admin/SA.
 */
export function getRecruiters(db, candidates = []) {
  const names = new Set();
  const elevatedNames = new Set();

  (db?.users || []).forEach((u) => {
    if (!u?.name) return;
    const name = String(u.name).trim();
    if (!name) return;
    const status = String(u.status || 'active').toLowerCase();
    if (status && status !== 'active') return;
    if (u.role === 'super_admin' || u.role === 'admin') {
      elevatedNames.add(name.toLowerCase());
      return;
    }
    if (u.role === 'employee') {
      names.add(name);
    }
  });

  (candidates || []).forEach((c) => {
    const name = String(c?.employee || '').trim();
    if (!name) return;
    if (elevatedNames.has(name.toLowerCase())) return;
    names.add(name);
  });

  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

/**
 * Build nav groups for header dropdowns based on role.
 */
export function buildNavConfig(user, db) {
  const isSA = user?.role === 'super_admin';
  const isHR = user?.role === 'admin';
  const isEmp = user?.role === 'employee';
  const perms = getUserPerms(user, db);
  const canAccessReports = perms.reports;
  const canEditAttendance = perms.attendance;
  const canApproveLeaves = perms.approveLeave;
  const canOnboard = !!perms.onboard;

  const main = [];
  const campaign = [];
  const billing = [];

  if (isSA) {
    main.push(
      { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
      { href: '/users', label: 'Users', icon: 'users' },
      { href: '/settings', label: 'System Settings', icon: 'settings' },
    );
    campaign.push(
      { href: '/campaign/recruitment', label: 'Recruitment Portal', icon: 'adduser' },
      { href: '/campaign/targets', label: 'Targets', icon: 'trending' },
      { href: '/campaign/workflows', label: 'Workflows', icon: 'activity' },
      ...(canOnboard ? [{ href: '/campaign/onboarding', label: 'Onboarding', icon: 'file' }] : []),
      ...(canAccessReports ? [{ href: '/reports', label: 'Reports', icon: 'trending' }] : []),
      { href: '/campaign/rewards', label: 'Rewards & Recognition', icon: 'star' },
      { href: '/campaign/jobs', label: 'Internal Job Portal', icon: 'briefcase' },
      { href: '/campaign/meetings', label: 'Meeting Scheduler', icon: 'video' },
    );
    billing.push(
      { href: '/billing/workstation', label: 'IT & Dev Workstation', icon: 'help' },
      { href: '/billing/payroll', label: 'Payroll Management', icon: 'card' },
      { href: '/billing/organizations', label: 'Organizations', icon: 'building' },
      { href: '/billing/permissions', label: 'Roles & Permissions', icon: 'shield' },
      { href: '/billing/departments', label: 'Departments', icon: 'building' },
      { href: '/billing/policies', label: 'Policies', icon: 'file' },
      { href: '/billing/integrations', label: 'Integrations', icon: 'settings' },
      { href: '/billing/audit-logs', label: 'Audit Logs', icon: 'file' },
      { href: '/billing/security', label: 'Security', icon: 'shield' },
    );
  } else if (isHR) {
    main.push(
      { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
      { href: '/employees', label: 'Employees', icon: 'users' },
      ...(canAccessReports ? [{ href: '/reports', label: 'Reports', icon: 'trending' }] : []),
      { href: '/helpdesk', label: 'Help Desk', icon: 'help' },
    );
    campaign.push(
      { href: '/campaign/recruitment', label: 'Recruitment Portal', icon: 'adduser' },
      { href: '/campaign/targets', label: 'Targets', icon: 'trending' },
      ...(canOnboard ? [{ href: '/campaign/onboarding', label: 'Onboarding', icon: 'file' }] : []),
      { href: '/campaign/performance', label: 'Performance', icon: 'trending' },
      { href: '/campaign/learning', label: 'Training', icon: 'help' },
      { href: '/campaign/rewards', label: 'Rewards & Recognition', icon: 'star' },
      { href: '/campaign/jobs', label: 'Internal Job Portal', icon: 'briefcase' },
      { href: '/campaign/meetings', label: 'Meeting Scheduler', icon: 'video' },
    );
    billing.push(
      { href: '/billing/workstation', label: 'IT Support & Assets', icon: 'help' },
      { href: '/billing/payroll', label: 'Payroll & Salary Slips', icon: 'card' },
      ...(canEditAttendance ? [{ href: '/billing/attendance', label: 'Attendance', icon: 'clock' }] : []),
      ...(canApproveLeaves ? [{ href: '/billing/leaves', label: 'Leave', icon: 'calendar' }] : []),
      { href: '/billing/documents', label: 'Documents', icon: 'file' },
      { href: '/billing/assets', label: 'Assets', icon: 'monitor' },
      { href: '/billing/auditor', label: 'Compliance', icon: 'shield' },
    );
  } else if (isEmp) {
    main.push(
      { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
      { href: '/profile', label: 'My Profile', icon: 'users' },
      { href: '/directory', label: 'Directory', icon: 'users' },
      { href: '/announcements', label: 'Announcements', icon: 'bell' },
      { href: '/helpdesk', label: 'Help Desk', icon: 'help' },
      { href: '/exit', label: 'Exit', icon: 'logout' },
    );
    campaign.push(
      { href: '/campaign/targets', label: 'Recruitment Targets', icon: 'adduser' },
      { href: '/campaign/performance', label: 'Performance', icon: 'trending' },
      { href: '/campaign/learning', label: 'Learning', icon: 'help' },
      { href: '/campaign/timesheets', label: 'Timesheets', icon: 'file' },
      ...(canAccessReports ? [{ href: '/reports', label: 'Reports', icon: 'trending' }] : []),
      { href: '/campaign/rewards', label: 'Rewards & Recognition', icon: 'star' },
      { href: '/campaign/jobs', label: 'Internal Job Portal', icon: 'briefcase' },
      { href: '/campaign/meetings', label: 'Meeting Scheduler', icon: 'video' },
    );
    billing.push(
      { href: '/it/support', label: 'IT & Dev Support', icon: 'help' },
      { href: '/billing/payroll', label: 'My Payroll & Payslips', icon: 'card' },
      { href: '/billing/attendance', label: 'Attendance', icon: 'clock' },
      { href: '/billing/leaves', label: 'Leave', icon: 'calendar' },
      { href: '/billing/documents', label: 'Documents', icon: 'file' },
      { href: '/billing/assets', label: 'Assets', icon: 'monitor' },
    );
  }

  return {
    main,
    campaign,
    billing,
    itSupport: { href: '/it/support', label: 'IT Cell Support', icon: 'help' },
    perms,
    roles: { isSA, isHR, isEmp },
  };
}

export function isNavGroupActive(pathname, items) {
  if (!pathname || !items?.length) return false;
  return items.some((item) => pathname === item.href || pathname.startsWith(item.href + '/'));
}
