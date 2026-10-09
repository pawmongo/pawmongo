import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PawMongo - Document Explorer',
  description: 'Interactive MongoDB document browser and collection explorer with query filter, syntax highlighting, and multiple view modes matching the Atlas and Compass experience.',
  openGraph: {
    title: 'PawMongo - Document Explorer',
    description: 'Interactive MongoDB document browser and collection explorer with query filter, syntax highlighting, and multiple view modes matching the Atlas and Compass experience.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PawMongo - Document Explorer',
    description: 'Interactive MongoDB document browser and collection explorer with query filter, syntax highlighting, and multiple view modes matching the Atlas and Compass experience.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
