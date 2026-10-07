'use client';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

const App = dynamic(() => import('../src/App'), { ssr: false, loading: () => <p className="loading">Opening your workspace…</p> });
export default function Workspace() {
  const path = usePathname();
  if (!['/', '/setup', '/login', '/connect', '/workspace'].includes(path) && !/^\/databases\/[^/]+(?:\/collections\/[^/]+)?$/.test(path)) return null;
  return <App/>;
}
