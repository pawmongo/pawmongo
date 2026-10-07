import { randomUUID } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { scalar, type EValue, type RecordView } from '../api';
type Doc = Record<string, EValue>;
type Index = { name: string; keys: Record<string, number | string>; unique: boolean; sparse: boolean };
type Collection = { documents: Doc[]; indexes: Index[]; validator: Doc; level: string; action: string };
type Session = { databases: Map<string, Map<string, Collection>>; authenticated: boolean; connected: boolean; csrf: string; touched: number };
const globalMock = globalThis as typeof globalThis & { phpMongoDemo?: Map<string, Session> };
const sessions: Map<string, Session> = globalMock.phpMongoDemo ??= new Map<string, Session>();
const oid = (): EValue => ({ $oid: randomUUID().replaceAll('-', '').slice(0, 24) });
const copy = <T,>(value: T): T => structuredClone(value);
const collection = (documents: Doc[] = []): Collection => ({ documents, indexes: [{ name: '_id_', keys: { _id: 1 }, unique: true, sparse: false }], validator: {}, level: 'strict', action: 'error' });
function seed(): Session {
  const orders: Doc[] = Array.from({ length: 120 }, (_, i) => ({ _id: { $oid: (i + 1).toString(16).padStart(24, '0') }, orderNumber: `ORD-${10001 + i}`, status: i % 2 ? 'active' : 'pending', amount: 120 + i, customer: { name: `Customer ${i}`, address: { city: ['London', 'Paris', 'Berlin'][i % 3], country: ['GB', 'FR', 'DE'][i % 3] } }, items: Array.from({ length: 30 }, (_, j) => ({ sku: `SKU-${j + 1}`, quantity: j + 1 })), createdAt: { $date: '2026-10-06T00:00:00.000Z' } }));
  return { authenticated: true, connected: true, csrf: randomUUID(), touched: Date.now(), databases: new Map([
    ['eCommerce', new Map([['orders', collection(orders)], ['products', collection([{ _id: 'product-one', name: 'Notebook', price: 14.95, inStock: true }, { _id: 'product-two', name: 'Desk lamp', price: 39, inStock: false }, { _id: 'product-three', name: 'Mechanical keyboard', price: 89, inStock: true }])]])],
    ['workspace', new Map([['notes', collection([{ _id: 'note-one', title: 'Welcome', content: 'Explore the frontend with demo data.', pinned: true }, { _id: 'note-two', title: 'Getting started', content: 'Create collections, import files, and edit documents.', pinned: false }])]])],
    ['sample_training', new Map([['companies', collection([{ _id: oid(), name: 'Wetpaint', permalink: 'abc2', homepage_url: 'http://www.wetpaint.com', category_code: 'web', number_of_employees: 47, founded_year: 2005, founded_month: 10, founded_day: 17, tag_list: 'wiki, collaboration, media', offices: [{ city: 'Seattle', country_code: 'USA' }] }, { _id: oid(), name: 'Acme Analytics', category_code: 'analytics', number_of_employees: 24, founded_year: 2020, offices: [{ city: 'London', country_code: 'GBR' }] }])]])],
  ]) };
}
class DemoError extends Error { constructor(message: string, public status = 400) { super(message); } }
function object(value: unknown): Doc {
  const parsed = typeof value === 'string' ? JSON.parse(value) : value;
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new DemoError('Enter a JSON object.');
  return parsed as Doc;
}
function type(value: EValue | undefined): string {
  if (value === undefined) return 'missing'; if (value === null) return 'null'; if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return ({ $oid: 'objectId', $numberInt: 'int', $numberLong: 'long', $numberDouble: 'double', $numberDecimal: 'decimal', $date: 'date' } as Record<string, string>)[Object.keys(value)[0]] ?? 'object';
  return typeof value === 'number' ? Number.isInteger(value) ? 'int' : 'double' : typeof value === 'boolean' ? 'bool' : 'string';
}
function canonical(value: EValue): EValue {
  if (typeof value === 'number') return { [Number.isInteger(value) ? '$numberInt' : '$numberDouble']: String(value) };
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object' && type(value) === 'object') return Object.fromEntries(Object.entries(value).map(([name, value]) => [name, canonical(value)]));
  return value;
}
function get(doc: Doc, path: string): EValue | undefined {
  let value: EValue | undefined = doc;
  for (const key of path.split('.')) { if (!value || typeof value !== 'object' || !Object.hasOwn(value, key)) return undefined; value = (value as Doc)[key]; }
  return value;
}
function comparable(value: EValue | undefined): string | number | boolean | null | undefined {
  if (value === undefined || value === null || typeof value !== 'object') return value;
  if (['int', 'long', 'double', 'decimal'].includes(type(value))) return Number(scalar(value));
  return scalar(value) ?? JSON.stringify(value);
}
const equal = (a: EValue | undefined, b: EValue | undefined) => comparable(a) === comparable(b);
function matches(doc: Doc, filter: Doc): boolean {
  return Object.entries(filter).every(([name, condition]) => {
    if (['$and', '$or', '$nor'].includes(name)) {
      if (!Array.isArray(condition)) throw new DemoError(`${name} requires an array.`);
      const results = condition.map(item => matches(doc, object(item)));
      return name === '$and' ? results.every(Boolean) : name === '$or' ? results.some(Boolean) : !results.some(Boolean);
    }
    if (name.startsWith('$')) throw new DemoError(`Unsupported query operator: ${name}`);
    const value = get(doc, name);
    if (condition && typeof condition === 'object' && !Array.isArray(condition) && type(condition) === 'object' && Object.keys(condition).some(key => key.startsWith('$'))) {
      return Object.entries(condition).every(([op, operand]) => {
        const left = comparable(value), right = comparable(operand);
        switch (op) {
          case '$eq': return equal(value, operand); case '$ne': return !equal(value, operand);
          case '$gt': return left != null && right != null && left > right; case '$gte': return left != null && right != null && left >= right;
          case '$lt': return left != null && right != null && left < right; case '$lte': return left != null && right != null && left <= right;
          case '$exists': return (value !== undefined) === Boolean(operand);
          case '$in': case '$nin': if (!Array.isArray(operand)) throw new DemoError(`${op} requires an array.`); return operand.some(item => equal(value, item)) === (op === '$in');
          case '$not': return !matches(doc, { [name]: operand });
          case '$type': return type(value) === operand || (operand === 'number' && ['int', 'long', 'double', 'decimal'].includes(type(value)));
          default: throw new DemoError(`Unsupported query operator: ${op}`);
        }
      });
    }
    return equal(value, condition);
  });
}
function sorted(documents: Doc[], sort: Doc): Doc[] {
  return [...documents].sort((a, b) => {
    for (const [field, direction] of Object.entries(sort)) {
      if (direction !== 1 && direction !== -1) throw new DemoError('Sort directions must be 1 or -1.');
      const left = comparable(get(a, field)), right = comparable(get(b, field));
      const order = left === right ? 0 : left == null ? -1 : right == null ? 1 : left < right ? -1 : 1;
      if (order) return order * direction;
    }
    return 0;
  });
}
function bounded(value: EValue, depth = 0): EValue {
  if (typeof value === 'string') return value.slice(0, 1024);
  if (type(value) === 'array') return depth >= 2 ? `[Array(${(value as EValue[]).length})]` : (value as EValue[]).slice(0, 20).map(item => bounded(item, depth + 1));
  if (type(value) === 'object') return depth >= 2 ? '[Object Object]' : Object.fromEntries(Object.entries(value as Doc).slice(0, 20).map(([key, item]) => [key, bounded(item, depth + 1)]));
  return canonical(value);
}
function record(doc: Doc, detail = false): RecordView {
  const entries = Object.entries(doc); const limit = detail ? 1024 : 64;
  return { identifier: canonical(doc._id ?? null), identifier_omitted: false, field_count: entries.length, truncated: !detail, fields: entries.slice(0, detail ? 20 : 128).map(([name, value]) => {
    const kind = type(value);
    const reduced = !detail && kind === 'object' ? '[Object Object]' : !detail && kind === 'array' ? `[Array(${(value as EValue[]).length})]` : typeof value === 'string' ? value.slice(0, limit) : detail ? bounded(value) : canonical(value);
    return { name, type: kind, value: reduced, truncated: kind === 'object' || kind === 'array' || (typeof value === 'string' && value.length > limit) };
  }) };
}
function validate(target: Collection, doc: Doc, others = target.documents): void {
  if (target.level !== 'off' && target.action !== 'warn') {
    const schema = target.validator.$jsonSchema as Doc | undefined;
    if (schema) {
      for (const name of (schema.required ?? []) as string[]) if (!Object.hasOwn(doc, name)) throw new DemoError('Document does not match collection validation rules.');
      for (const [name, rule] of Object.entries((schema.properties ?? {}) as Doc)) {
        if (!Object.hasOwn(doc, name)) continue;
        const spec = object(rule); const allowed = spec.bsonType ? Array.isArray(spec.bsonType) ? spec.bsonType : [spec.bsonType] : [];
        if (allowed.length && !allowed.includes(type(doc[name]))) throw new DemoError('Document does not match collection validation rules.');
        if (Array.isArray(spec.enum) && !spec.enum.some(value => equal(doc[name], value))) throw new DemoError('Document does not match collection validation rules.');
      }
    } else if (Object.keys(target.validator).length && !matches(doc, target.validator)) throw new DemoError('Document does not match collection validation rules.');
  }
  for (const index of target.indexes.filter(index => index.unique)) {
    if (others.some(other => other !== doc && Object.keys(index.keys).every(field => equal(get(other, field), get(doc, field))))) throw new DemoError('A unique field already exists.', 409);
  }
}
function expression(value: EValue, doc: Doc): EValue {
  if (typeof value === 'string' && value.startsWith('$')) return value === '$$ROOT' ? doc : get(doc, value.slice(1)) ?? null;
  if (Array.isArray(value)) return value.map(item => expression(item, doc));
  if (value && typeof value === 'object' && type(value) === 'object') {
    if ('$literal' in value) return value.$literal;
    if ('$add' in value) return (value.$add as EValue[]).reduce<number>((total, item) => total + Number(comparable(expression(item, doc))), 0);
    if ('$multiply' in value) return (value.$multiply as EValue[]).reduce<number>((total, item) => total * Number(comparable(expression(item, doc))), 1);
    if (Object.keys(value).some(key => key.startsWith('$'))) throw new DemoError('This aggregation expression needs a real MongoDB backend.');
    return Object.fromEntries(Object.entries(value).map(([name, item]) => [name, expression(item, doc)]));
  }
  return value;
}
function aggregate(input: Doc[], pipeline: unknown): Doc[] {
  if (!Array.isArray(pipeline) || pipeline.length > 20) throw new DemoError('Use a pipeline of up to 20 stages.');
  let rows = copy(input);
  for (const raw of pipeline) {
    const stage = object(raw); if (Object.keys(stage).length !== 1) throw new DemoError('Each pipeline stage needs one operator.');
    const [op, value] = Object.entries(stage)[0];
    switch (op) {
      case '$match': rows = rows.filter(doc => matches(doc, object(value))); break;
      case '$sort': rows = sorted(rows, object(value)); break;
      case '$skip': case '$limit': { const count = Number(value); if (!Number.isInteger(count) || count < (op === '$limit' ? 1 : 0)) throw new DemoError('Use a positive integer limit or nonnegative skip.'); rows = op === '$skip' ? rows.slice(count) : rows.slice(0, count); break; }
      case '$count': rows = rows.length ? [{ [String(value)]: rows.length }] : []; break;
      case '$set': case '$addFields': rows = rows.map(doc => ({ ...doc, ...expression(value, doc) as Doc })); break;
      case '$unset': { const names = Array.isArray(value) ? value.map(String) : [String(value)]; rows = rows.map(doc => Object.fromEntries(Object.entries(doc).filter(([name]) => !names.includes(name)))); break; }
      case '$project': {
        const spec = object(value), included = Object.entries(spec).filter(([name, value]) => name !== '_id' && value !== 0 && value !== false);
        rows = rows.map(doc => included.length ? Object.fromEntries([...(spec._id === 0 || spec._id === false || doc._id === undefined ? [] : [['_id', doc._id]]), ...included.map(([name, value]) => [name, value === 1 || value === true ? get(doc, name) ?? null : expression(value, doc)])]) : Object.fromEntries(Object.entries(doc).filter(([name]) => spec[name] !== 0 && spec[name] !== false))); break;
      }
      case '$unwind': { const path = typeof value === 'string' ? value : String(object(value).path); const name = path.replace(/^\$/, ''); rows = rows.flatMap(doc => { const values = get(doc, name); return Array.isArray(values) ? values.map(item => ({ ...doc, [name]: item })) : values == null ? [] : [doc]; }); break; }
      case '$group': {
        const spec = object(value), groups = new Map<string, { id: EValue; rows: Doc[] }>();
        for (const doc of rows) { const id = expression(spec._id, doc); const key = JSON.stringify(id); if (!groups.has(key)) groups.set(key, { id, rows: [] }); groups.get(key)!.rows.push(doc); }
        rows = [...groups.values()].map(group => {
          const doc: Doc = { _id: group.id };
          for (const [name, operation] of Object.entries(spec)) {
            if (name === '_id') continue;
            const accumulator = object(operation); const [kind, operand] = Object.entries(accumulator)[0]; const values = group.rows.map(row => expression(operand, row)); const numbers = values.map(value => Number(comparable(value)));
            switch (kind) {
              case '$sum': doc[name] = numbers.reduce((sum, value) => sum + value, 0); break;
              case '$avg': doc[name] = numbers.reduce((sum, value) => sum + value, 0) / numbers.length; break;
              case '$min': doc[name] = Math.min(...numbers); break; case '$max': doc[name] = Math.max(...numbers); break;
              case '$first': doc[name] = values[0]; break; case '$last': doc[name] = values.at(-1)!; break;
              case '$push': doc[name] = values; break; case '$addToSet': doc[name] = [...new Map(values.map(value => [JSON.stringify(value), value])).values()]; break;
              default: throw new DemoError('This accumulator needs a real MongoDB backend.');
            }
          }
          return doc;
        }); break;
      }
      default: throw new DemoError(`Demo mode does not implement ${op}. Connect the real backend to use it.`);
    }
  }
  return rows.slice(0, 50);
}

export async function mockResponse(request: NextRequest): Promise<Response> {
  const path = request.nextUrl.pathname, method = request.method;
  const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
  if (path === '/api/ui') return json({ sponsors: { login: { title: 'Explore phpMongo', description: 'A frontend workspace with demo data.', label: 'FRONTEND DEMO', href: '#guide' }, sidebar: { title: 'Frontend demo', description: 'Temporary sample data', label: 'DEMO MODE', href: '#guide' } } });
  if (path === '/api/health') return json({ status: 'ok', mode: 'mock' });
  const now = Date.now(); for (const [key, value] of sessions) if (now - value.touched > 3600000) sessions.delete(key);
  let id = request.cookies.get('phpmongo_demo')?.value;
  if (!id || !sessions.has(id)) { if (sessions.size >= 100) return json({ error: 'Demo session limit reached. Try again later.' }, 503); id = randomUUID(); sessions.set(id, seed()); }
  const session = sessions.get(id)!; session.touched = now;
  const reply = (data: unknown, status = 200) => { const response = json(data, status); response.headers.append('Set-Cookie', `phpmongo_demo=${id}; Path=/; HttpOnly; SameSite=Strict${request.nextUrl.protocol === 'https:' ? '; Secure' : ''}`); return response; };
  const auth = () => ({ authenticated: session.authenticated, connected: session.connected, csrf_token: session.csrf, warnings: [], mock: true });
  try {
    if (path === '/api/auth/status') return reply(auth());
    if (!session.authenticated && path !== '/api/auth/login' && path !== '/api/setup') throw new DemoError('Demo sign-in is required.', 401);
    if (!['GET', 'HEAD'].includes(method) && request.headers.get('X-CSRF-Token') !== session.csrf) throw new DemoError('Invalid demo CSRF token.', 403);
    const params: Record<string, any> = ['GET', 'HEAD'].includes(method) ? Object.fromEntries(request.nextUrl.searchParams) : await request.json();
    if (path === '/api/demo/reset' && method === 'POST') { const fresh = seed(); fresh.csrf = session.csrf; sessions.set(id!, fresh); return reply({ reset: true }); }
    if (path === '/api/auth/login' || path === '/api/setup') { session.authenticated = true; session.connected = true; return reply(auth()); }
    if (path === '/api/auth/logout') { session.authenticated = false; session.connected = false; return reply(auth()); }
    if (path === '/api/connection') { session.connected = method !== 'DELETE'; return reply({ connected: session.connected }); }
    if (!session.connected) throw new DemoError('Connect the demo workspace first.', 401);
    if (path === '/api/data/structure') return reply({ databases: [...session.databases].map(([database, collections]) => ({ database, collections: [...collections.keys()] })) });
    const db = String(params.db ?? ''), name = String(params.collection ?? '');
    if (!db || !name || /[\x00]/.test(db + name) || ['admin', 'local', 'config'].includes(db) || name.startsWith('system.')) throw new DemoError('Choose a non-system database and collection.');
    let database = session.databases.get(db); let target = database?.get(name);
    const create = () => { if (target) throw new DemoError('A collection with this name already exists. Choose a new name.', 409); if (!database) { database = new Map(); session.databases.set(db, database); } target = collection(); database.set(name, target); return target; };
    if (path === '/api/data/collections') {
      if (method === 'POST') { create(); return reply({ created: true, database: db, collection: name }, 201); }
      if (!target) throw new DemoError('Collection not found.', 404);
      if (method === 'DELETE') { database!.delete(name); return reply({ deleted: true }); }
      if (method === 'PATCH') { const replacement = String(params.name ?? ''); if (!replacement || replacement.includes('$') || replacement.startsWith('system.')) throw new DemoError('Choose an ordinary collection name.'); if (database!.has(replacement)) throw new DemoError('Collection already exists.', 409); database!.set(replacement, target); database!.delete(name); return reply({ collection: replacement }); }
      throw new DemoError('Method not available.', 405);
    }
    if (path === '/api/data/tools/import' && method === 'POST' && params.create_collection) { target = create(); }
    if (!target) throw new DemoError('Collection not found.', 404);
    const filter = object(params.filter ?? '{}'); const filtered = () => target!.documents.filter(doc => matches(doc, filter));
    const find = () => { const doc = target!.documents.find(doc => String(comparable(doc._id)) === String(params.id)); if (!doc) throw new DemoError('Document no longer exists.', 404); return doc; };
    const insert = (doc: Doc) => { if (!Object.hasOwn(doc, '_id')) doc._id = oid(); validate(target!, doc); target!.documents.push(doc); };
    if (path === '/api/data/documents') {
      if (method === 'GET') { const page = Number(params.page ?? 1), size = Number(params.page_size ?? 50); if (!Number.isInteger(page) || page < 1 || page > 200 || ![10, 25, 50, 100].includes(size)) throw new DemoError('Invalid page or page size.'); const documents = sorted(filtered(), { ...object(params.sort ?? '{}'), _id: object(params.sort ?? '{}')._id ?? 1 }).slice((page - 1) * size, page * size); return reply({ database: db, collection: name, page, page_size: size, count: documents.length, documents: documents.map(doc => record(doc)), next_page: page * size < filtered().length && page < 200 ? page + 1 : null, max_page: 200 }); }
      if (method === 'POST') { insert(object(params.document)); return reply({ created: true }, 201); }
      const doc = find();
      if (method === 'DELETE') { target.documents.splice(target.documents.indexOf(doc), 1); return reply({ deleted: true }); }
      if (method === 'PATCH') { const fields = object(params.document); if (Object.hasOwn(fields, '_id')) throw new DemoError('The ID cannot be changed.'); const updated = { ...doc, ...fields }; validate(target, updated, target.documents.filter(row => row !== doc)); target.documents[target.documents.indexOf(doc)] = updated; return reply({ saved: true }); }
    }
    if (path === '/api/data/document-edit') { const { _id, ...fields } = find(); return reply({ document: JSON.stringify(fields) }); }
    if (path === '/api/data/document-details') { const doc = find(); const field = params.field; const value = field ? get(doc, field) : doc; if (value === undefined) throw new DemoError('Field not found.', 404); return reply({ document: record(field ? { value } : doc, true), field: field ?? null, array_limit: 20, limits: { object_fields: 20, string_characters: 1024, expansion_depth: 2 } }); }
    const tool = path.split('/').at(-1);
    switch (tool) {
      case 'count': return reply({ total: filtered().length });
      case 'monitoring': { const size = new TextEncoder().encode(JSON.stringify(target.documents)).length; return reply({ count: target.documents.length, size, avgObjSize: target.documents.length ? size / target.documents.length : 0, storageSize: size, totalIndexSize: target.indexes.length * 1024, nindexes: target.indexes.length, sampled_at: new Date().toISOString(), simulated: true }); }
      case 'explain': return reply({ queryPlanner: { namespace: `${db}.${name}`, winningPlan: { stage: 'DEMO_FILTER', filter }, simulated: true }, executionStats: { nReturned: filtered().length, totalDocsExamined: target.documents.length, executionTimeMillis: 0 }, simulated: true });
      case 'aggregate': return reply({ documents: aggregate(target.documents, JSON.parse(params.pipeline ?? '[]')).map(doc => record(doc, true)), limit: 50 });
      case 'schema': { const rows = new Map<string, { _id: { name: string; type: string }; count: number }>(); const sample = filtered().slice(0, 1000); for (const doc of sample) for (const [name, value] of Object.entries(doc)) { const key = `${name}:${type(value)}`; if (!rows.has(key)) rows.set(key, { _id: { name, type: type(value) }, count: 0 }); rows.get(key)!.count++; } return reply({ fields: [...rows.values()].sort((a, b) => a._id.name.localeCompare(b._id.name)), sample_size: sample.length, sample_limit: 1000 }); }
      case 'visualize': { const counts = new Map<string, number>(); for (const doc of filtered().slice(0, 10000)) { const key = String(comparable(get(doc, String(params.field))) ?? '(missing/null)'); counts.set(key, (counts.get(key) ?? 0) + 1); } return reply({ rows: [...counts].map(([_id, count]) => ({ _id, count })).sort((a, b) => b.count - a.count).slice(0, 20), sample_limit: 10000 }); }
      case 'indexes': {
        if (method === 'POST') {
          if (params.action === 'delete') { if (params.name === '_id_') throw new DemoError('The ID index is protected.'); target.indexes = target.indexes.filter(index => index.name !== params.name); }
          else if (params.action === 'create') { const keys = object(params.keys) as Record<string, number | string>; if (!Object.keys(keys).length || Object.keys(keys).length > 8) throw new DemoError('Choose 1–8 index fields.'); const name = Object.entries(keys).map(([name, value]) => `${name}_${value}`).join('_'); if (!target.indexes.some(index => index.name === name)) { const index = { name, keys, unique: Boolean(params.unique), sparse: false }; if (index.unique) { const keysSeen = new Set(); for (const doc of target.documents) { const key = JSON.stringify(Object.keys(keys).map(field => comparable(get(doc, field)))); if (keysSeen.has(key)) throw new DemoError('Duplicate values prevent a unique index.', 409); keysSeen.add(key); } } target.indexes.push(index); } }
          else throw new DemoError('Unknown index action.');
        }
        return reply({ indexes: target.indexes });
      }
      case 'validation': if (method === 'POST') { const validator = object(params.validator); target.validator = validator; target.level = params.level ?? 'strict'; target.action = params.action ?? 'error'; } return reply({ validator: target.validator, level: target.level, action: target.action });
      case 'import': {
        if (method !== 'POST') throw new DemoError('Use POST to import.', 405);
        const documents = JSON.parse(params.documents); if (!Array.isArray(documents) || !documents.length || documents.length > 100) throw new DemoError('Import 1–100 documents per batch.');
        let count = 0; try { for (const raw of documents) { insert(object(raw)); count++; } } catch (error) { throw new DemoError(`Import stopped after ${count} inserted documents. ${(error as Error).message}`, 409); }
        return reply({ inserted: count });
      }
      case 'bulk': {
        if (method !== 'POST' || params.confirmed !== true) throw new DemoError('Confirm the bulk operation.');
        const rows = filtered(); if (rows.length > 1000) throw new DemoError('Refine the filter to at most 1,000 matches.', 413);
        if (params.action === 'delete') { const selected = new Set(rows); target.documents = target.documents.filter(doc => !selected.has(doc)); return reply({ deleted: rows.length }); }
        if (params.action !== 'update') throw new DemoError('Unknown bulk action.'); const fields = object(params.document); if ('_id' in fields) throw new DemoError('The ID cannot be changed.');
        for (const doc of rows) { const updated = { ...doc, ...fields }; validate(target, updated, target.documents.filter(row => row !== doc)); target.documents[target.documents.indexOf(doc)] = updated; }
        return reply({ modified: rows.length });
      }
      default: throw new DemoError('Demo endpoint not found.', 404);
    }
  } catch (error) { return reply({ error: error instanceof SyntaxError ? 'Enter valid JSON.' : error instanceof Error ? error.message : 'Demo operation failed.' }, error instanceof DemoError ? error.status : 400); }
}
