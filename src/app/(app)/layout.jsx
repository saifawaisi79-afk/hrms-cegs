'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AppProvider, useApp } from '@/contexts/AppContext';
import { AppShell } from '@/components/layout/AppShell';
import { ErrorBoundary } from '@/components/hrms/HrmsLegacy';
import { safeInternalNextPath } from '@/lib/nav';

function AuthGate({ children }) {
  const { user, ready } = useApp();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (ready && !user) {
      const qs = typeof window !== 'undefined' ? window.location.search : '';
      const intended = safeInternalNextPath(`${pathname || ''}${qs || ''}`);
      router.replace(intended ? `/login?next=${encodeURIComponent(intended)}` : '/login');
    }
  }, [ready, user, pathname, router]);

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
