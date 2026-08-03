'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TARGET_SHEETS } from '@/lib/nav';
import { PageHeader } from '@/components/layout/PageHeader';

export function TargetsNav({ counts = {} }) {
  const pathname = usePathname();
  return (
    <div className="targets-tab-nav" role="tablist" aria-label="Recruitment target datasheets">
      <Link
        href="/campaign/targets"
        className={`targets-tab ${pathname === '/campaign/targets' ? 'is-active' : ''}`}
        role="tab"
        aria-selected={pathname === '/campaign/targets'}
      >
        Overview
      </Link>
      {TARGET_SHEETS.map((sheet) => {
        const href = `/campaign/targets/${sheet.slug}`;
        const active = pathname === href;
        const count = counts[sheet.slug];
        return (
          <Link
            key={sheet.slug}
            href={href}
            className={`targets-tab ${active ? 'is-active' : ''}`}
            role="tab"
            aria-selected={active}
          >
            {sheet.label}
            {typeof count === 'number' ? ` (${count})` : ''}
          </Link>
        );
      })}
    </div>
  );
}

export function TargetsChrome({ children, title = 'Recruitment Targets', purpose }) {
  return (
    <div className="targets-chrome">
      <PageHeader
        title={title}
        purpose={
          purpose ||
          'Track daily call, interview, walk-in, selection, and joining targets. Open a datasheet tab to work that queue.'
        }
      />
      <TargetsNav />
      {children}
    </div>
  );
}
