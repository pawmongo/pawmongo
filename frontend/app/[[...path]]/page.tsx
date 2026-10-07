import { notFound } from 'next/navigation';

export default async function Page({ params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  const simple = path.length === 0 || (path.length === 1 && ['setup', 'login', 'connect', 'workspace'].includes(path[0]));
  const collection = path.length === 4 && path[0] === 'databases' && path[2] === 'collections';
  const database = path.length === 2 && path[0] === 'databases';
  if (!simple && !collection && !database) notFound();
  return null;
}
