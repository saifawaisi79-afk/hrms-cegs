'use client';

import { withAppPage } from '@/components/hrms/withAppPage';
import { RecruitmentPage } from '@/components/hrms/HrmsLegacy';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui';
import Link from 'next/link';

function RecruitmentPortalInner(props) {
  const isIT = (props.user?.role || '').toLowerCase() === 'it_team';

  if (isIT) {
    return (
      <div className="feature-page recruitment-portal anim-fadeup feature-page-inner" style={{ paddingBlock: 'clamp(24px, 5vw, 60px)', textAlign: 'center' }}>
        <div style={{ maxWidth: 540, margin: '0 auto', background: '#fff', padding: '36px 28px', borderRadius: 16, border: '1px solid #E5E7EB', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🛡️</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 8 }}>Module Restricted for IT Team</h2>
          <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6, marginBottom: 24 }}>
            The Recruitment Portal and candidate calling workflows are strictly restricted to HR and Recruitment personnel. Your daily assignments and projects are available under <strong>IT Dashboard</strong> and <strong>My Daily Tasks</strong>.
          </p>
          <Link href="/it/tasks" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            Go to My Daily Tasks →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="feature-page recruitment-portal" style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(12px, 2vw, 20px)' }}>
      <PageHeader
        title="Recruitment Portal"
        purpose="Manage hiring pipeline entry points, candidate intake, and jump into daily targets."
        actions={
          <Link href="/campaign/targets" className="btn btn-primary">
            Open Targets Dashboard
          </Link>
        }
      />
      <Card>
        <p className="text-secondary" style={{ marginBottom: 0 }}>
          When employees mark walk-in or selected on Targets datasheets, those candidates appear under <strong>Walk-ins &amp; Selections</strong>. HR can also add extra entries there.
        </p>
      </Card>
      <RecruitmentPage {...props} />
    </div>
  );
}

export const RecruitmentPortalView = withAppPage(RecruitmentPortalInner);
