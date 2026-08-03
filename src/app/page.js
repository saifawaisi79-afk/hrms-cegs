import dynamic from 'next/dynamic';

const HRMSApp = dynamic(() => import('@/components/HRMSApp'), { 
  ssr: false 
});

export default function HomePage() {
  return <HRMSApp />;
}
