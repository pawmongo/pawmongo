import type { Metadata } from 'next';
import './globals.css';
import { DatabaseProvider } from '@/context/DatabaseContext';
import { AppShell } from '@/components/AppShell';

export const metadata: Metadata = {
  title: 'MongoDB Compass - Document Explorer',
  description: 'Interactive MongoDB document browser and collection explorer with query filter, syntax highlighting, and multiple view modes matching the Atlas and Compass experience.',
  openGraph: {
    title: 'MongoDB Compass - Document Explorer',
    description: 'Interactive MongoDB document browser and collection explorer with query filter, syntax highlighting, and multiple view modes matching the Atlas and Compass experience.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MongoDB Compass - Document Explorer',
    description: 'Interactive MongoDB document browser and collection explorer with query filter, syntax highlighting, and multiple view modes matching the Atlas and Compass experience.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <DatabaseProvider>
          <AppShell>{children}</AppShell>
        </DatabaseProvider>
      </body>
    </html>
  );
}
