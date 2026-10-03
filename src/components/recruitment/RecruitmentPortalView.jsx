'use client';

import { withAppPage } from '@/components/hrms/withAppPage';
import { FinanceInvoicesView } from '@/components/finance/FinanceInvoicesView';

function FinancePortalInner() {
  return <FinanceInvoicesView />;
}

export const RecruitmentPortalView = withAppPage(FinancePortalInner);
