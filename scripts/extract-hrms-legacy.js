const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '../src/components/HRMSApp.jsx');
const outPath = path.join(__dirname, '../src/components/hrms/HrmsLegacy.jsx');
const lines = fs.readFileSync(srcPath, 'utf8').split(/\r?\n/);

const exportFns = new Set([
  'LoginPage', 'PageHdr', 'Modal', 'EmployeeQuickViewModal', 'GlobalMessengerModal',
  'LunchBreakWidget', 'DashboardPage', 'EmployeesPage', 'DepartmentsPage', 'OrgChartPage',
  'LeavesPage', 'AttendancePage', 'PayrollPage', 'TimesheetsPage', 'AssetsPage', 'ExpensesPage',
  'DocumentsPage', 'OnboardingPage', 'NotificationsPage', 'UsersPage', 'SettingsPage', 'TasksPage',
  'SADashboardPage', 'AuditLogsPage', 'BackupsPage', 'SystemHealthPage', 'APIMonitorPage',
  'QueryTerminalPage', 'CredentialAuditorPage', 'OrganizationsPage', 'PermissionsPage',
  'PoliciesPage', 'WorkflowsPage', 'IntegrationsPage', 'SecurityPage', 'ReportsPage',
  'TargetMetricCard', 'RecruitmentPage', 'PerformancePage', 'LearningPage', 'ITTicketsPage',
  'ExitPage', 'DirectoryPage', 'AnnouncementsPage', 'MeetingSchedulerPage', 'InternalJobPortalPage',
  'RewardsPage', 'ProfilePage',
]);

const exportConsts = new Set([
  'Store', 'IC', 'PasswordInput', 'CALL_STATUS_OPTIONS', 'LANGUAGE_OPTIONS',
  'INITIAL_CANDIDATE_DATA', 'GLOBAL_API_BASE', 'SEED_DATA', 'STORE_VERSION',
]);

const out = [];
for (let i = 0; i < lines.length; i++) {
  const lineNum = i + 1;
  if (lineNum >= 422 && lineNum <= 936) continue;
  if (/^export default App/.test(lines[i])) continue;

  let line = lines[i];
  const fnMatch = line.match(/^function ([A-Za-z0-9_]+)/);
  if (fnMatch && exportFns.has(fnMatch[1])) {
    line = 'export function ' + line.slice('function '.length);
  }
  if (/^class ErrorBoundary/.test(line)) {
    line = 'export class ' + line.slice('class '.length);
  }
  const constMatch = line.match(/^const ([A-Za-z0-9_]+) =/);
  if (constMatch && exportConsts.has(constMatch[1])) {
    line = 'export const ' + line.slice('const '.length);
  }
  out.push(line);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, out.join('\n'));
console.log('Wrote', outPath, 'lines:', out.length);
