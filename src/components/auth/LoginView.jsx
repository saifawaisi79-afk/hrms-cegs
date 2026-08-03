'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoginPage } from '@/components/hrms/HrmsLegacy';
import { useApp } from '@/contexts/AppContext';

export function LoginView() {
  const { user, ready, login, db } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (ready && user) router.replace('/dashboard');
  }, [ready, user, router]);

  if (!ready) return null;
  if (user) return null;

  return <LoginPage login={login} db={db} />;
}
