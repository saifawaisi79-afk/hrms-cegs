'use client';

import { useEffect } from 'react';
import { withAppPage } from '@/components/hrms/withAppPage';
import { RecruitmentPage } from '@/components/hrms/HrmsLegacy';
import { TargetsChrome } from '@/components/targets/TargetsChrome';
import Link from 'next/link';

function TargetsRestrictedView() {
  return (
    <div className="feature-page targets-page anim-fadeup" style={{ padding: '60px 24px', textAlign: 'center' }}>
      <div style={{ maxWidth: 540, margin: '0 auto', background: '#fff', padding: '36px 28px', borderRadius: 16, border: '1px solid #E5E7EB', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🛡️</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 8 }}>Module Restricted for IT Team</h2>
        <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6, marginBottom: 24 }}>
          Target datasheets and calling assignments are strictly restricted to recruitment employees. IT Team operations are tracked under <strong>IT Dashboard</strong> and <strong>My Daily Tasks</strong>.
        </p>
        <Link href="/it/tasks" className="btn btn-primary" style={{ padding: '10px 22px', borderRadius: 10, fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>
          Go to My Daily Tasks →
        </Link>
      </div>
    </div>
  );
}

function TargetsSheetInner({ initialSheet = 'calls', ...props }) {
  const isIT = (props.user?.role || '').toLowerCase() === 'it_team';
  if (isIT) return <TargetsRestrictedView />;

  return (
    <TargetsChrome>
      <RecruitmentPage {...props} initialSheet={initialSheet} variant="targets" />
    </TargetsChrome>
  );
}

export const TargetsSheetView = withAppPage(TargetsSheetInner);

function TargetsOverviewInner(props) {
  const isIT = (props.user?.role || '').toLowerCase() === 'it_team';
  if (isIT) return <TargetsRestrictedView />;

  return (
    <TargetsChrome>
      <RecruitmentPage {...props} initialSheet="calls" variant="targets" />
    </TargetsChrome>
  );
}

export const TargetsOverviewView = withAppPage(TargetsOverviewInner);
