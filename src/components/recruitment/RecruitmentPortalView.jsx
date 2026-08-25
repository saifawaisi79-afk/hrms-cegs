'use client';

import { withAppPage } from '@/components/hrms/withAppPage';
import { RecruitmentPage } from '@/components/hrms/HrmsLegacy';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui';
import Link from 'next/link';

function RecruitmentPortalInner(props) {
  return (
    <div className="feature-page recruitment-portal">
      <PageHeader
        title="Recruitment Portal"
        purpose="Manage hiring pipeline entry points, candidate intake, and jump into daily targets."
        actions={
          <Link href="/campaign/targets" className="btn btn-primary">
            Open Targets Dashboard
          </Link>
        }
      />
      <Card className="mb-4">
        <p className="text-secondary" style={{ marginBottom: 12 }}>
          Use Targets for KPI tracking and datasheets (Calls, Interviews, Walk-ins, Selected, Joined). On this portal, HR can open <strong>Walk-ins & Selections</strong> to log walk-in / selection entries with recruiter and company.
        </p>
      </Card>
      <RecruitmentPage {...props} />
    </div>
  );
}

export const RecruitmentPortalView = withAppPage(RecruitmentPortalInner);
