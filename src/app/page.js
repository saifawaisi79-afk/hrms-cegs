'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthToken } from '@/lib/auth-client';
import { Store } from '@/components/hrms/HrmsLegacy';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    let user = null;
    try {
      user = Store.get('currentUser');
    } catch {}
    const token = getAuthToken();
    if (user || token) router.replace('/dashboard');
    else router.replace('/login');
  }, [router]);

  return (
    <div className="app-boot-screen" role="status" aria-live="polite">
      Loading CEGS OS…
    </div>
  );
}
