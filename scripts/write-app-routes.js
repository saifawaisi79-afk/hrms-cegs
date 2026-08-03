const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../src/app');

function writePage(rel, importPath, componentName) {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  const content = `'use client';

import { ${componentName} } from '${importPath}';

export default function Page() {
  return <${componentName} />;
}
`;
  fs.writeFileSync(full, content);
  console.log('wrote', rel);
}

// Auth
writePage('(auth)/login/page.jsx', '@/components/auth/LoginView', 'LoginView');

// Main
const views = '@/components/views';
[
  ['(app)/dashboard/page.jsx', 'DashboardView'],
  ['(app)/users/page.jsx', 'UsersView'],
  ['(app)/settings/page.jsx', 'SettingsView'],
  ['(app)/employees/page.jsx', 'EmployeesView'],
  ['(app)/reports/page.jsx', 'ReportsView'],
  ['(app)/helpdesk/page.jsx', 'HelpdeskView'],
  ['(app)/profile/page.jsx', 'ProfileView'],
  ['(app)/directory/page.jsx', 'DirectoryView'],
  ['(app)/announcements/page.jsx', 'AnnouncementsView'],
  ['(app)/exit/page.jsx', 'ExitView'],
  ['(app)/notifications/page.jsx', 'NotificationsView'],
  ['(app)/campaign/workflows/page.jsx', 'WorkflowsView'],
  ['(app)/campaign/rewards/page.jsx', 'RewardsView'],
  ['(app)/campaign/jobs/page.jsx', 'JobsView'],
  ['(app)/campaign/meetings/page.jsx', 'MeetingsView'],
  ['(app)/campaign/onboarding/page.jsx', 'OnboardingView'],
  ['(app)/campaign/performance/page.jsx', 'PerformanceView'],
  ['(app)/campaign/learning/page.jsx', 'LearningView'],
  ['(app)/campaign/timesheets/page.jsx', 'TimesheetsView'],
  ['(app)/billing/workstation/page.jsx', 'ITSupportView'],
  ['(app)/billing/payroll/page.jsx', 'PayrollView'],
  ['(app)/billing/organizations/page.jsx', 'OrganizationsView'],
  ['(app)/billing/permissions/page.jsx', 'PermissionsView'],
  ['(app)/billing/departments/page.jsx', 'DepartmentsView'],
  ['(app)/billing/policies/page.jsx', 'PoliciesView'],
  ['(app)/billing/integrations/page.jsx', 'IntegrationsView'],
  ['(app)/billing/audit-logs/page.jsx', 'AuditLogsView'],
  ['(app)/billing/security/page.jsx', 'SecurityView'],
  ['(app)/billing/attendance/page.jsx', 'AttendanceView'],
  ['(app)/billing/leaves/page.jsx', 'LeavesView'],
  ['(app)/billing/documents/page.jsx', 'DocumentsView'],
  ['(app)/billing/assets/page.jsx', 'AssetsView'],
  ['(app)/billing/auditor/page.jsx', 'AuditorView'],
  ['(app)/it/support/page.jsx', 'ITSupportView'],
  ['(app)/admin/orgchart/page.jsx', 'OrgChartView'],
  ['(app)/admin/expenses/page.jsx', 'ExpensesView'],
  ['(app)/admin/tasks/page.jsx', 'TasksView'],
  ['(app)/admin/backups/page.jsx', 'BackupsView'],
  ['(app)/admin/system-health/page.jsx', 'SystemHealthView'],
  ['(app)/admin/api-monitor/page.jsx', 'APIMonitorView'],
  ['(app)/admin/query-terminal/page.jsx', 'QueryTerminalView'],
].forEach(([rel, name]) => writePage(rel, views, name));

// Recruitment portal
fs.mkdirSync(path.join(root, '(app)/campaign/recruitment'), { recursive: true });
fs.writeFileSync(
  path.join(root, '(app)/campaign/recruitment/page.jsx'),
  `'use client';

import { RecruitmentPortalView } from '@/components/recruitment/RecruitmentPortalView';

export default function Page() {
  return <RecruitmentPortalView />;
}
`
);

// Targets overview + nested sheets
fs.mkdirSync(path.join(root, '(app)/campaign/targets'), { recursive: true });
fs.writeFileSync(
  path.join(root, '(app)/campaign/targets/page.jsx'),
  `'use client';

import { TargetsOverviewView } from '@/components/targets/TargetsViews';

export default function Page() {
  return <TargetsOverviewView />;
}
`
);

['calls', 'interviews', 'walkins', 'selected', 'joined'].forEach((slug) => {
  const dir = path.join(root, `(app)/campaign/targets/${slug}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'page.jsx'),
    `'use client';

import { TargetsSheetView } from '@/components/targets/TargetsViews';

export default function Page() {
  return <TargetsSheetView initialSheet="${slug}" />;
}
`
  );
});

console.log('All routes written');
