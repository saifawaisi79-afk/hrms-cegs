'use client';

import { AppProvider } from '@/contexts/AppContext';
import { ErrorBoundary } from '@/components/hrms/HrmsLegacy';

export default function AuthLayout({ children }) {
  return (
    <ErrorBoundary>
      <AppProvider>{children}</AppProvider>
    </ErrorBoundary>
  );
}
