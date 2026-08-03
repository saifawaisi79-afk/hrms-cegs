'use client';

import { usePathname } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { metaForPath } from '@/lib/page-meta';

/**
 * Adds a clear title + purpose line when the route has meta and the page
 * has not already opted into TargetsChrome / Recruitment portal headers.
 */
export function RouteWayfinding({ children }) {
  const pathname = usePathname();
  const skip =
    pathname?.startsWith('/campaign/targets') ||
    pathname === '/campaign/recruitment' ||
    pathname === '/dashboard';

  const meta = !skip ? metaForPath(pathname) : null;

  return (
    <>
      {meta && <PageHeader title={meta.title} purpose={meta.purpose} />}
      {children}
    </>
  );
}
