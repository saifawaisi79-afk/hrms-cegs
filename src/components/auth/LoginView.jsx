'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoginPage } from '@/components/hrms/HrmsLegacy';
import { useApp } from '@/contexts/AppContext';
import { homePathForPortal, normalizePortal, safeInternalNextPath } from '@/lib/nav';

export function LoginView() {
  const { user, ready, login, db } = useApp();
  const router = useRouter();
  const [initialPortal, setInitialPortal] = useState('employee');
  const [nextPath, setNextPath] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const paramPortal = normalizePortal(params.get('portal'));
    if (paramPortal) setInitialPortal(paramPortal);
    setNextPath(safeInternalNextPath(params.get('next')));
  }, []);

  useEffect(() => {
    if (ready && user) {
      const target = nextPath || homePathForPortal(user.role);
      router.replace(target);
    }
  }, [ready, user, nextPath, router]);

  if (!ready) return null;
  if (user) return null;

  return <LoginPage login={login} db={db} initialPortal={initialPortal} nextPath={nextPath} />;
}
