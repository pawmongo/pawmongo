'use client';

import {DatabaseProvider} from '@/context/DatabaseContext';
import {AppShell} from './AppShell';
import {OverviewView} from './OverviewView';
import DatabasePage from '@/views/DatabasePage';
import CollectionPage from '@/views/CollectionPage';
import MonitoringPage from '@/views/MonitoringPage';
import VisualizePage from '@/views/VisualizePage';
import {usePathname} from '@/lib/navigation';

function CurrentPage() {
  const pathname = usePathname();
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] !== 'databases' || !parts[1]) return <OverviewView />;
  if (parts[2] !== 'collections' || !parts[3]) return <DatabasePage />;
  if (parts[4] === 'monitoring') return <MonitoringPage />;
  if (parts[4] === 'visualize') return <VisualizePage />;
  return <CollectionPage />;
}

export default function ClientApplication() {
  return <DatabaseProvider><AppShell><CurrentPage /></AppShell></DatabaseProvider>;
}
