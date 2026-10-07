export type EValue = null | boolean | number | string | EValue[] | { [key: string]: EValue };
export type Field = { name: string; type: string; value: EValue; truncated: boolean };
export type RecordView = { identifier: EValue; identifier_omitted: boolean; fields: Field[]; field_count: number; truncated: boolean; size_limited?: boolean };
export type Auth = { mock?: boolean; setup_required?: boolean; authenticated: boolean; connected?: boolean; csrf_token: string | null; warnings: string[] };
export type Database = { database: string; collections: string[] };
export type Preview = { database: string; collection: string; page: number; count: number; documents: RecordView[]; next_page: number | null; max_page: number };
export type Detail = { document: RecordView; field: string | null };
export type Sponsor = { title: string; description: string; label: string; href: string };
export type UiConfig = { sponsors: { login: Sponsor; sidebar: Sponsor } };

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
let csrf = '';
let onUnauthorized: (() => void) | undefined;
export function setCsrf(token: string | null) { csrf = token ?? ''; }
export function unauthorizedHandler(handler: () => void) { onUnauthorized = handler; }
export async function api<T>(path: string, method = 'GET', body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, {
    method, credentials: 'same-origin', cache: 'no-store', signal,
    headers: { 'Content-Type': 'application/json', ...(method !== 'GET' ? { 'X-CSRF-Token': csrf } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  let data: any;
  try { data = JSON.parse(text); }
  catch { throw new ApiError(response.status === 503 ? 'The server needs setup. Check the PHP prerequisites and private configuration.' : 'The server returned an unexpected response.', response.status); }
  if (!response.ok) {
    if (response.status === 401 && path !== '/api/auth/login' && path !== '/api/auth/status') onUnauthorized?.();
    throw new ApiError(typeof data.error === 'string' ? data.error : 'The request could not be completed.', response.status);
  }
  return data as T;
}
export function query(path: string, params: Record<string, string | number>) { return `${path}?${new URLSearchParams(Object.entries(params).map(([key, value]) => [key, String(value)]))}`; }
export function identifier(value: EValue): { id: string; id_type: string } | null {
  if (typeof value === 'string') return { id: value, id_type: 'String' };
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    if (typeof value.$oid === 'string') return { id: value.$oid, id_type: 'ObjectId' };
    if (typeof value.$numberInt === 'string') return { id: value.$numberInt, id_type: 'Int32' };
    if (typeof value.$numberLong === 'string') return { id: value.$numberLong, id_type: 'Int64' };
  }
  return null;
}
export function scalar(value: EValue): string | null {
  if (value === null) return 'null';
  if (typeof value !== 'object') return String(value);
  if (Array.isArray(value)) return null;
  for (const key of ['$oid', '$numberInt', '$numberLong', '$numberDouble', '$numberDecimal']) if (typeof value[key] === 'string') return value[key];
  if (value.$date && typeof value.$date === 'object' && !Array.isArray(value.$date) && typeof value.$date.$numberLong === 'string') {
    const date = new Date(Number(value.$date.$numberLong));
    return Number.isNaN(date.getTime()) ? value.$date.$numberLong : date.toISOString();
  }
  if (typeof value.$date === 'string') return value.$date;
  return null;
}
