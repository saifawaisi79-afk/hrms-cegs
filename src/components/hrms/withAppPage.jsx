'use client';

import { useApp } from '@/contexts/AppContext';

/**
 * Bridges AppContext into legacy page components that expect db/save/user/setView props.
 */
export function withAppPage(PageComponent) {
  return function AppPageBridge(extraProps) {
    const { pageProps } = useApp();
    return <PageComponent {...pageProps} {...extraProps} />;
  };
}
