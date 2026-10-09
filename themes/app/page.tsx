'use client';

import dynamic from 'next/dynamic';

// Render the existing application only in the browser, including its initial load.
const ClientApplication = dynamic(() => import('@/components/ClientApplication'), {ssr: false});

export default function HomePage() {
  return <ClientApplication />;
}
