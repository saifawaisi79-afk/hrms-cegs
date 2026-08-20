/** Page purpose copy for wayfinding (UX clarity) */
export const PAGE_META = {
  '/dashboard': {
    title: 'Dashboard',
    purpose: 'Your daily workspace — tasks, schedule, and team pulse at a glance.',
  },
  '/users': {
    title: 'Users',
    purpose: 'Manage system accounts, roles, and access for CEGS OS.',
  },
  '/settings': {
    title: 'System Settings',
    purpose: 'Configure company profile, hours, leave rules, and security defaults.',
  },
  '/employees': {
    title: 'Employees',
    purpose: 'Browse and manage the employee directory and employment records.',
  },
  '/reports': {
    title: 'Reports',
    purpose: 'Review operational and recruitment reports you are permitted to access.',
  },
  '/helpdesk': {
    title: 'Help Desk',
    purpose: 'Raise and track IT or workplace support requests.',
  },
  '/profile': {
    title: 'My Profile',
    purpose: 'View and update your personal profile and contact details.',
  },
  '/directory': {
    title: 'Directory',
    purpose: 'Find colleagues and open a quick profile or chat.',
  },
  '/announcements': {
    title: 'Announcements',
    purpose: 'Read company-wide updates and notices.',
  },
  '/exit': {
    title: 'Exit',
    purpose: 'Start or track an exit / offboarding request.',
  },
  '/notifications': {
    title: 'Notifications',
    purpose: 'Review alerts and mark items as read.',
  },
  '/campaign/recruitment': {
    title: 'Recruitment Portal',
    purpose: 'Hiring workspace entry — intake candidates and open daily targets.',
  },
  '/campaign/targets': {
    title: 'Recruitment Targets',
    purpose: 'Track daily KPIs and open datasheet tabs for each target type.',
  },
  '/campaign/workflows': {
    title: 'Workflows',
    purpose: 'View and manage campaign workflow stages.',
  },
  '/campaign/rewards': {
    title: 'Rewards & Recognition',
    purpose: 'Nominate peers and review badges and awards.',
  },
  '/campaign/jobs': {
    title: 'Internal Job Portal',
    purpose: 'Browse internal openings and submit applications.',
  },
  '/campaign/meetings': {
    title: 'Meeting Scheduler',
    purpose: 'Request and manage meeting slots with HR or leadership.',
  },
  '/billing/payroll': {
    title: 'Payroll',
    purpose: 'View payslips and payroll processing status.',
  },
  '/billing/permissions': {
    title: 'Roles & Permissions',
    purpose: 'Configure functional permissions for each system role.',
  },
  '/it/support': {
    title: 'IT Cell Support',
    purpose: 'Create and track IT tickets, assets, and knowledge base help.',
  },
  '/billing/workstation': {
    title: 'IT & Dev Workstation',
    purpose: 'Developer and IT support workspace for tickets and assets.',
  },
};

export function metaForPath(pathname) {
  if (!pathname) return null;
  if (PAGE_META[pathname]) return PAGE_META[pathname];
  const sheet = pathname.match(/^\/campaign\/targets\/(calls|interviews|walkins|selected|joined)$/);
  if (sheet) {
    const labels = {
      calls: 'Calls Made',
      interviews: 'Interviews Scheduled',
      walkins: 'Walk-ins Today',
      selected: 'Selected Today',
      joined: 'Joiner Sheet',
    };
    return {
      title: labels[sheet[1]],
      purpose: `Datasheet for ${labels[sheet[1]]} — log, search, and sync candidate rows for this target.`,
    };
  }
  return null;
}
