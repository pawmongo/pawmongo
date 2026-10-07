import type { NextRequest } from 'next/server';

async function forward(request: NextRequest) {
  const backend = process.env.PHPMONGO_API_URL ?? 'http://127.0.0.1:8080';
  const url = new URL(request.nextUrl.pathname + request.nextUrl.search, backend);
  const headers = new Headers(request.headers);
  for (const name of ['host', 'connection', 'content-length', 'transfer-encoding']) headers.delete(name);
  try {
    const response = await fetch(url, {
      method: request.method, headers, redirect: 'manual', cache: 'no-store',
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer(),
      signal: request.signal,
    });
    const outgoing = new Headers(response.headers);
    for (const name of ['content-encoding', 'content-length', 'transfer-encoding', 'connection']) outgoing.delete(name);
    outgoing.set('Cache-Control', 'no-store');
    return new Response(response.body, { status: response.status, headers: outgoing });
  } catch {
    return Response.json({ error: 'The PHP backend is unavailable. Start it on port 8080 or set PHPMONGO_API_URL.' }, { status: 502 });
  }
}
export { forward as GET, forward as POST, forward as PATCH, forward as PUT, forward as DELETE, forward as HEAD };
