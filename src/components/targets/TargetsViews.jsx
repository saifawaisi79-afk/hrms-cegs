'use client';

import { useEffect } from 'react';
import { withAppPage } from '@/components/hrms/withAppPage';
import { RecruitmentPage } from '@/components/hrms/HrmsLegacy';
import { TargetsChrome } from '@/components/targets/TargetsChrome';

function TargetsSheetInner({ initialSheet = 'calls', ...props }) {
  return (
    <TargetsChrome>
      <RecruitmentPage {...props} initialSheet={initialSheet} variant="targets" />
    </TargetsChrome>
  );
}

export const TargetsSheetView = withAppPage(TargetsSheetInner);

function TargetsOverviewInner(props) {
  return (
    <TargetsChrome>
      <RecruitmentPage {...props} initialSheet="calls" variant="targets" />
    </TargetsChrome>
  );
}

export const TargetsOverviewView = withAppPage(TargetsOverviewInner);
