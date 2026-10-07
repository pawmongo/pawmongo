import type { Metadata } from 'next';
import { headers } from 'next/headers';
import '../src/fonts.css';
import '@fortawesome/fontawesome-svg-core/styles.css';
import '../src/styles.css';
import Workspace from './Workspace';

export const metadata: Metadata = { title: 'phpMongo', description: 'Your private MongoDB workspace' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? '';
  return <html lang="en" suppressHydrationWarning><head><meta name="style-nonce" content={nonce}/><script nonce={nonce} dangerouslySetInnerHTML={{ __html: `try { document.documentElement.classList.toggle('dark', localStorage.getItem('phpmongo-theme') === 'dark'); } catch {}` }}/></head><body><Workspace/>{children}</body></html>;
}
