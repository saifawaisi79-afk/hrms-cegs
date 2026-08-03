'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppProvider, useApp } from '@/contexts/AppContext';
import { AppShell } from '@/components/layout/AppShell';
import { ErrorBoundary } from '@/components/hrms/HrmsLegacy';

function AuthGate({ children }) {
  const { user, ready } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (ready && !user) router.replace('/login');
  }, [ready, user, router]);

  if (!ready) {
    return (
      <div className="app-boot-screen" role="status" aria-live="polite">
        Loading CEGS OS…
      </div>
    );
  }

  if (!user) return null;

  return <AppShell>{children}</AppShell>;
}

export default function AppLayout({ children }) {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AuthGate>{children}</AuthGate>
      </AppProvider>
    </ErrorBoundary>
  );
}
