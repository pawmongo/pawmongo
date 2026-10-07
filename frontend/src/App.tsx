'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { DatabasePage } from './DatabasePage';
import { CollectionWorkspace } from './CollectionWorkspace';
import { CreateDocumentForm } from './CreateDocumentForm';
import { useCallback, useEffect, useMemo, useRef, useId, useState, type FormEvent, type ReactNode } from 'react';
import { SectionIcon as ColoredIcon, Sun, Moon, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, BookOpen, ChevronDown, ChevronRight, CircleHelp, Code2, Database as DatabaseIcon, FileJson, FolderOpen, Layers3, LoaderCircle, LockKeyhole, LogOut, Menu, Pencil, Trash2, Plus, RefreshCw, Search, ShieldCheck, SlidersHorizontal, Unplug, X } from './icons';
import { api, identifier, query, scalar, setCsrf, unauthorizedHandler, type Auth, type Database, type Detail, type EValue, type Field, type Preview, type RecordView, type Sponsor, type UiConfig } from './api';

const defaults: UiConfig = { sponsors: {
  login: { label: 'BUILT WITH THE COMMUNITY', title: 'Good tools grow together.', description: 'A small, open-source workspace for curious developers. Explore the docs and help shape what comes next.', href: '#guide' },
  sidebar: { label: 'COMMUNITY SUPPORTED', title: 'Help phpMongo grow', description: 'Explore the developer guide', href: '#guide' },
} };
function Brand({ compact = false }: { compact?: boolean }) {
  return <div className="brand"><img className="brand-logo" src="/assets/icons/phpmongo-logo.svg" alt="phpMongo"/>{!compact && <span className="version">v1</span>}</div>;
}
function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try { localStorage.setItem('phpmongo-theme', theme); } catch { /* The selected mode still applies when storage is unavailable. */ }
  }, [theme]);
  const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  return <button type="button" className="icon-button theme-toggle" aria-label={label} title={label} onClick={() => setTheme(current => current === 'dark' ? 'light' : 'dark')}>
    {theme === 'dark' ? <Sun size={17}/> : <Moon size={17}/>}
  </button>;
}
function SponsorCard({ sponsor, small = false }: { sponsor: Sponsor; small?: boolean }) {
  return <a className={small ? 'sponsor-small' : 'sponsor-card'} href={sponsor.href} {...(sponsor.href.startsWith('https://') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
    {small ? <><ColoredIcon name="community"/><span><strong>{sponsor.title}</strong><small>{sponsor.description}</small></span><ArrowUpRight size={15}/></> : <><span className="sponsor-eyebrow"><span className="dot"/>{sponsor.label}</span><div className="sponsor-art"><ColoredIcon name="community"/><span className="orbit orbit-one"/><span className="orbit orbit-two"/></div><h2>{sponsor.title}</h2><p>{sponsor.description}</p><span className="sponsor-link">Explore the community <ArrowUpRight size={15}/></span></>}
  </a>;
}
function ErrorMessage({ children }: { children?: ReactNode }) { return children ? <div className="error-message" role="alert">{children}</div> : null; }
function Spinner({ text = 'Loading…' }: { text?: string }) { return <span className="loading"><LoaderCircle className="spin" size={17}/>{text}</span>; }
function ReadOnlyBadge() { return <span className="read-only"><ShieldCheck size={13}/> Document browsing</span>; }
function Dialog({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog ref={ref} aria-labelledby={headingId} className={wide ? 'detail-dialog' : 'guide-dialog'} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}><header className="dialog-header"><h2 id={headingId}>{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={20}/></button></header>{children}</dialog>;
}
function Guide({ onClose }: { onClose: () => void }) {
  return <Dialog title="A little guide to your workspace" onClose={onClose}><div className="guide-content"><span className="guide-icon"><BookOpen size={27}/></span><h3>Your data, a clearer view.</h3><p>phpMongo is a private MongoDB workspace with document browsing, document creation, and collection management. Browse your collections, ask focused questions, and look inside a document.</p><section><h4>1. Connect your database</h4><p>After unlocking phpMongo, paste your MongoDB URI. It is saved in encrypted private configuration and restored after you unlock the workspace.</p></section><section><h4>2. Find what matters</h4><p>Filters use MongoDB Extended JSON. Try an equality filter or a supported comparison:</p><pre>{'{ "status": "active", "amount": { "$gte": 100 } }'}</pre><p>For ObjectIds, use <code>{'{ "_id": { "$oid": "…" } }'}</code>. Shell commands, JavaScript, and regex are unavailable. Use Create document to add a document with a field-and-value form. Use Create collection to add an empty collection if your database account permits it.</p></section><section><h4>3. Take a closer look</h4><p>Click a document to open its bounded detail view. Large values and nested content may be shortened; use a field path such as <code>items.21</code> to inspect another part.</p></section><section><h4>Community supported</h4><p>phpMongo is open source under the MIT License. Contributions to its code, documentation, and accessibility help keep this workspace useful.</p></section><div className="guide-note"><ShieldCheck size={18}/><span>50 documents per page · Up to 200 pages · One-hour idle sessions</span></div></div></Dialog>;
}
function Tree({ value, name, depth = 0 }: { value: EValue; name?: string; depth?: number }) {
  const display = scalar(value);
  if (display !== null) return <div className="tree-leaf">{name !== undefined && <span className="tree-key">{name}: </span>}<span className={typeof value === 'string' ? 'tree-string' : 'tree-scalar'}>{typeof value === 'string' ? JSON.stringify(display) : display}</span></div>;
  const entries = Array.isArray(value) ? value.map((item, index) => [String(index), item] as const) : Object.entries(value as Record<string, EValue>);
  return <details className="tree-node" open={depth < 1}><summary><ChevronRight size={13}/><span className="tree-key">{name ?? (Array.isArray(value) ? 'Array' : 'Object')}</span><span className="tree-count">{Array.isArray(value) ? `[${entries.length}]` : `{${entries.length}}`}</span></summary><div className="tree-children">{entries.map(([key, item]) => <Tree key={key} name={key} value={item} depth={depth + 1}/>)}</div></details>;
}
function Inspector({ target, record, onClose }: { target: { db: string; collection: string }; record: RecordView; onClose: () => void }) {
  const id = identifier(record.identifier);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [path, setPath] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef<AbortController | null>(null);
  const load = useCallback(async (field?: string) => {
    if (!id) return;
    pending.current?.abort();
    const controller = new AbortController(); pending.current = controller;
    setBusy(true); setError('');
    try { setDetail(await api<Detail>(query('/api/data/document-details', { ...target, ...id, ...(field ? { field } : {}) }), 'GET', undefined, controller.signal)); }
    catch (error) { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Could not load document.'); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }, [target.db, target.collection, JSON.stringify(id)]);
  useEffect(() => { void load(); return () => pending.current?.abort(); }, [load]);
  return <Dialog title="Document details" onClose={onClose} wide><div className="inspector-heading"><span className="eyebrow">{target.db} / {target.collection}</span><div className="document-id"><FileJson size={17}/><code>{scalar(record.identifier)}</code><ReadOnlyBadge/></div></div><form className="field-form" onSubmit={event => { event.preventDefault(); void load(path.trim()); }}><label htmlFor="field-path">Explore a field</label><div className="input-action"><input id="field-path" placeholder="e.g. customer.address or items.21" value={path} onChange={event => setPath(event.target.value)}/><button className="secondary-button" disabled={busy}>Open</button></div>{detail?.field && <button type="button" className="text-button" onClick={() => { setPath(''); void load(); }}><ArrowLeft size={13}/> Back to document</button>}</form><ErrorMessage>{error}</ErrorMessage><div className="inspector-content">{busy ? <Spinner text="Opening document…"/> : detail && <><div className="bounded-note"><ShieldCheck size={16}/><p>This is a bounded view. Arrays show up to 20 items; large values and deep objects may be shortened.</p></div>{detail.document.size_limited && <div className="empty-message"><h3>This part is too large to display.</h3><p>Enter a specific field path above to inspect a smaller part.</p></div>}<div className="document-fields">{detail.document.fields.map(field => <section className="document-field" key={field.name}><header><strong>{field.name}</strong><span className="type-badge">{field.type}</span>{field.truncated && <span className="truncation-badge">bounded</span>}</header><Tree value={field.value}/>{field.truncated && !detail.field && <button className="text-button" onClick={() => { setPath(field.name); void load(field.name); }}>Explore this field <ArrowRight size={13}/></button>}</section>)}</div>{detail.document.field_count > detail.document.fields.length && <p className="footnote">Showing {detail.document.fields.length} of {detail.document.field_count} fields. Use a field path to inspect omitted fields.</p>}</>}</div></Dialog>;
}

function collectionFromPath(path: string): { db: string; collection: string } | null {
  const match = /^\/databases\/([^/]+)\/collections\/([^/]+)$/.exec(path);
  if (!match) return null;
  try { return { db: decodeURIComponent(match[1]), collection: decodeURIComponent(match[2]) }; } catch { return null; }
}
function databaseFromPath(path: string): string | null {
  const match = /^\/databases\/([^/]+)$/.exec(path);
  if (!match) return null;
  try { return decodeURIComponent(match[1]); } catch { return null; }
}
function databasePath(db: string) { return `/databases/${encodeURIComponent(db)}`; }
function collectionPath(db: string, collection: string) { return `/databases/${encodeURIComponent(db)}/collections/${encodeURIComponent(collection)}`; }
export default function App() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const route = { pathname, search: searchParams.toString() };
  const navigate = useCallback((path: string, options?: { replace?: boolean }) => { if (options?.replace) router.replace(path); else router.push(path); }, [router]);
  const [auth, setAuth] = useState<Auth | null>(null);
  const [ui, setUi] = useState(defaults);
  const [bootError, setBootError] = useState('');
  const [guide, setGuide] = useState(location.hash === '#guide');
  const [password, setPassword] = useState('');
  const [uri, setUri] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [setupComplete, setSetupComplete] = useState(false);
  const [formError, setFormError] = useState('');
  const [formBusy, setFormBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createDb, setCreateDb] = useState('');
  const [createName, setCreateName] = useState('');
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState('');
  const [notice, setNotice] = useState('');
  const [documentTarget, setDocumentTarget] = useState<{ db: string; collection: string } | null>(null);
  const [documentBusy, setDocumentBusy] = useState(false);
  const [documentAction, setDocumentAction] = useState<{ db: string; collection: string; record: RecordView; kind: 'edit' | 'delete' } | null>(null);
  const [documentJson, setDocumentJson] = useState('');
  const [documentError, setDocumentError] = useState('');
  const [collectionAction, setCollectionAction] = useState<{ db: string; collection: string; kind: 'edit' | 'delete' } | null>(null);
  const [actionName, setActionName] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [databases, setDatabases] = useState<Database[]>([]);
  const [structureError, setStructureError] = useState('');
  const [structureBusy, setStructureBusy] = useState(false);
  const [search, setSearch] = useState('');
  const target = collectionFromPath(route.pathname);
  const databaseName = databaseFromPath(route.pathname);
  const [filter, setFilter] = useState('{}');
  const [applied, setApplied] = useState('{}');
  const [sort, setSort] = useState<Record<string, number>>({ _id: 1 });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [queryError, setQueryError] = useState('');
  const [queryBusy, setQueryBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [selected, setSelected] = useState<RecordView | null>(null);
  const [menu, setMenu] = useState(false);
  const [mobile, setMobile] = useState(window.matchMedia('(max-width: 760px)').matches);
  const [directDb, setDirectDb] = useState('');
  const [directCollection, setDirectCollection] = useState('');
  const initialAuth = useRef<Promise<Auth> | null>(null);
  const recovery = useRef<Promise<unknown> | null>(null);
  const structurePending = useRef<AbortController | null>(null);

  const clearData = useCallback(() => { structurePending.current?.abort(); setDatabases([]); setPreview(null); setSelected(null); setStructureError(''); setQueryError(''); setUri(''); setPassword(''); setCreating(false); setDocumentTarget(null); setDocumentAction(null); setCollectionAction(null); setNotice(''); }, []);
  const loadAuth = useCallback(async () => {
    const state = await api<Auth>('/api/auth/status'); setCsrf(state.csrf_token); setAuth(state); return state;
  }, []);
  useEffect(() => {
    let alive = true;
    initialAuth.current ??= api<Auth>('/api/auth/status');
    void initialAuth.current.then(state => { if (alive) { setCsrf(state.csrf_token); setAuth(state); } }).catch(error => { if (alive) setBootError(error.message); });
    void api<UiConfig>('/api/ui').then(config => { if (alive) setUi(config); }).catch(() => {});
    unauthorizedHandler(() => {
      if (recovery.current) return;
      clearData();
      recovery.current = loadAuth().catch(() => { setAuth(null); setBootError('Session ended. Reload to sign in again.'); }).finally(() => { recovery.current = null; });
    });
    const hash = () => setGuide(location.hash === '#guide'); window.addEventListener('hashchange', hash);
    return () => { alive = false; window.removeEventListener('hashchange', hash); };
  }, [loadAuth, clearData]);
  useEffect(() => {
    setPage(1); setFilter('{}'); setApplied('{}'); setSort({ _id: 1 }); setPreview(null); setSelected(null); setQueryError(''); setMenu(false);
  }, [route.pathname]);
  useEffect(() => {
    if (!auth) return;
    const requested = new URLSearchParams(route.search).get('next');
    const next = requested && (collectionFromPath(requested) || databaseFromPath(requested) || requested === '/workspace') ? requested : '/workspace';
    const required = auth.setup_required ? '/setup' : !auth.authenticated ? '/login' : !auth.connected ? '/connect' : null;
    if (required && route.pathname !== required) {
      const destination = (collectionFromPath(route.pathname) || databaseFromPath(route.pathname)) ? route.pathname : next;
      navigate(`${required}?${new URLSearchParams({ next: destination })}`, { replace: true });
    } else if (!required && ['/', '/setup', '/login', '/connect'].includes(route.pathname)) navigate(next, { replace: true });
  }, [auth, route.pathname, route.search, navigate]);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)');
    const update = () => setMobile(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!mobile || !menu) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenu(false); };
    document.querySelector<HTMLButtonElement>('.mobile-close')?.focus();
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [mobile, menu]);
  const closeGuide = () => { setGuide(false); if (location.hash === '#guide') history.replaceState(null, '', location.pathname); };
  async function install(event: FormEvent) {
    event.preventDefault(); setFormBusy(true); setFormError('');
    try {
      await api('/api/setup', 'POST', { password, password_confirmation: confirmation });
      setPassword(''); setConfirmation(''); setSetupComplete(true); await loadAuth();
    } catch (error) { setFormError(error instanceof Error ? error.message : 'Setup failed.'); }
    finally { setFormBusy(false); }
  }
  async function login(event: FormEvent) {
    event.preventDefault(); setFormBusy(true); setFormError('');
    try { const next = await api<Auth>('/api/auth/login', 'POST', { password }); setPassword(''); setCsrf(next.csrf_token); setAuth(next); }
    catch (error) { setFormError(error instanceof Error ? error.message : 'Login failed.'); }
    finally { setFormBusy(false); }
  }
  async function connect(event: FormEvent) {
    event.preventDefault(); setFormBusy(true); setFormError('');
    try { await api('/api/connection', 'POST', { uri }); setUri(''); setAuth(previous => previous && { ...previous, connected: true }); }
    catch (error) { setFormError(error instanceof Error ? error.message : 'Connection failed.'); }
    finally { setFormBusy(false); }
  }
  async function leave(logout = false) {
    setFormBusy(true); setFormError('');
    try { await api(logout ? '/api/auth/logout' : '/api/connection', logout ? 'POST' : 'DELETE', logout ? {} : undefined); clearData(); await loadAuth(); }
    catch (error) { setFormError(error instanceof Error ? error.message : 'Could not end session.'); }
    finally { setFormBusy(false); }
  }
  const loadStructure = useCallback(async () => {
    structurePending.current?.abort();
    const controller = new AbortController(); structurePending.current = controller;
    setStructureBusy(true); setStructureError('');
    try { const data = await api<{ databases: Database[] }>('/api/data/structure', 'GET', undefined, controller.signal); if (!controller.signal.aborted) setDatabases(data.databases); }
    catch (error) { if (!controller.signal.aborted) setStructureError(error instanceof Error ? error.message : 'Could not load databases.'); }
    finally { if (!controller.signal.aborted) setStructureBusy(false); }
  }, []);
  useEffect(() => { if (auth?.connected) void loadStructure(); }, [auth?.connected, loadStructure]);
  useEffect(() => {
    if (!target || !auth?.connected) return;
    const controller = new AbortController();
    setQueryBusy(true); setQueryError('');
    void api<Preview>(query('/api/data/documents', { ...target, filter: applied, sort: JSON.stringify(sort), page, page_size: pageSize }), 'GET', undefined, controller.signal)
      .then(data => { if (!controller.signal.aborted) setPreview(data); })
      .catch(error => { if (!controller.signal.aborted) { setQueryError(error.message); setPreview(null); } })
      .finally(() => { if (!controller.signal.aborted) setQueryBusy(false); });
    return () => controller.abort();
  }, [target?.db, target?.collection, auth?.connected, applied, JSON.stringify(sort), page, pageSize, refresh]);
  const columns = useMemo(() => [...new Set(preview?.documents.flatMap(record => record.fields.map(field => field.name)) ?? [])], [preview]);
  const collectionCount = databases.reduce((total, db) => total + db.collections.length, 0);
  const choose = useCallback((db: string, collection: string) => { navigate(collectionPath(db, collection)); setPage(1); setFilter('{}'); setApplied('{}'); setSort({ _id: 1 }); setPreview(null); setSelected(null); setQueryError(''); setMenu(false); }, [navigate]);
  function runQuery(event: FormEvent) {
    event.preventDefault();
    try { const parsed: unknown = JSON.parse(filter); if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Use a JSON object at the root of your filter.'); setQueryError(''); setApplied(filter); setPage(1); setSelected(null); setRefresh(value => value + 1); }
    catch (error) { setQueryError(error instanceof Error ? error.message : 'Use a valid JSON filter.'); }
  }
  const openCreate = useCallback((db: string) => {
    setCreateDb(db);
    setCreateName(''); setCreateError(''); setNotice(''); setCreating(true);
  }, []);
  async function createCollection(event: FormEvent) {
    event.preventDefault(); setCreateBusy(true); setCreateError('');
    const db = createDb.trim(), name = createName.trim();
    try {
      await api('/api/data/collections', 'POST', { db, collection: name });
      await loadStructure();
      setDatabases(previous => {
        const existing = previous.find(item => item.database === db);
        return existing ? previous.map(item => item.database === db ? { ...item, collections: item.collections.includes(name) ? item.collections : [...item.collections, name] } : item) : [...previous, { database: db, collections: [name] }];
      });
      choose(db, name); setCreating(false); setNotice(`Collection “${name}” created in “${db}”.`);
    } catch (error) { setCreateError(error instanceof Error ? error.message : 'Could not create collection.'); }
    finally { setCreateBusy(false); }
  }
  const openCollectionAction = useCallback((db: string, collection: string, kind: 'edit' | 'delete') => {
    setCollectionAction({ db, collection, kind }); setActionName(collection); setActionError(''); setNotice('');
  }, []);
  async function changeCollection(event: FormEvent) {
    event.preventDefault();
    if (!collectionAction) return;
    const { db, collection, kind } = collectionAction;
    const name = actionName.trim();
    setActionBusy(true); setActionError('');
    try {
      await api('/api/data/collections', kind === 'delete' ? 'DELETE' : 'PATCH', { db, collection, ...(kind === 'edit' ? { name } : {}) });
      structurePending.current?.abort();
      setDatabases(previous => previous.map(item => item.database === db ? { ...item, collections: kind === 'delete' ? item.collections.filter(value => value !== collection) : item.collections.map(value => value === collection ? name : value) } : item));
      if (target?.db === db && target.collection === collection) {
        if (kind === 'edit') choose(db, name);
        else { navigate('/workspace', { replace: true }); setSelected(null); setPreview(null); }
      }
      setCollectionAction(null); setNotice(kind === 'delete' ? `Collection “${collection}” deleted.` : `Collection renamed to “${name}”.`);
    } catch (error) { setActionError(error instanceof Error ? error.message : 'Could not change collection.'); }
    finally { setActionBusy(false); }
  }
  async function editDocumentCell(record: RecordView, name: string, input: EValue) {
    if (!target) return;
    const id = identifier(record.identifier), field = record.fields.find(field => field.name === name);
    if (!id || !field) return;
    const text = String(input); let value: EValue = text;
    if (typeof field.value === 'boolean') {
      if (!['true', 'false'].includes(text)) throw new Error('Enter true or false for a boolean field.');
      value = text === 'true';
    } else if (typeof field.value === 'number') {
      value = Number(text); if (!text.trim() || !Number.isFinite(value)) throw new Error('Enter a valid number.');
    } else if (field.value === null) {
      value = JSON.parse(text);
    } else if (typeof field.value === 'object' && !Array.isArray(field.value)) {
      const key = Object.keys(field.value).find(key => ['$numberInt', '$numberLong', '$numberDouble', '$numberDecimal', '$oid'].includes(key));
      if (!key) throw new Error('This BSON type cannot be edited inline.');
      value = { [key]: text };
    }
    await api('/api/data/documents', 'PATCH', { ...target, ...id, document: JSON.stringify({ [name]: value }) });
    setPreview(previous => previous && { ...previous, documents: previous.documents.map(item => JSON.stringify(item.identifier) === JSON.stringify(record.identifier) ? { ...item, fields: item.fields.map(field => field.name === name ? { ...field, value } : field) } : item) });
    setFormError(''); setNotice('Document saved.');
  }
  async function openDocumentAction(record: RecordView, kind: 'edit' | 'delete') {
    if (!target) return;
    const id = identifier(record.identifier); if (!id) return;
    setDocumentAction({ ...target, record, kind }); setDocumentError(''); setDocumentJson('');
    if (kind === 'edit') {
      setDocumentBusy(true);
      try { const result = await api<{ document: string }>(query('/api/data/document-edit', { ...target, ...id })); setDocumentJson(JSON.stringify(JSON.parse(result.document), null, 2)); }
      catch (error) { setDocumentError(error instanceof Error ? error.message : 'Could not load document.'); }
      finally { setDocumentBusy(false); }
    }
  }
  async function saveDocumentAction(event: FormEvent) {
    event.preventDefault(); if (!documentAction) return;
    const id = identifier(documentAction.record.identifier); if (!id) return;
    setDocumentBusy(true); setDocumentError('');
    try {
      const editing = documentAction.kind === 'edit';
      await api('/api/data/documents', editing ? 'PATCH' : 'DELETE', { db: documentAction.db, collection: documentAction.collection, ...id, ...(editing ? { document: JSON.stringify(JSON.parse(documentJson)) } : {}) });
      setDocumentAction(null); setSelected(null); setRefresh(value => value + 1); setNotice(editing ? 'Document saved.' : 'Document deleted.');
    } catch (error) { setDocumentError(error instanceof Error ? error.message : 'Could not change document.'); }
    finally { setDocumentBusy(false); }
  }
  const visible = databases.map(db => ({ ...db, collections: db.collections.filter(name => `${db.database} ${name}`.toLowerCase().includes(search.toLowerCase())) })).filter(db => db.collections.length || db.database.toLowerCase().includes(search.toLowerCase()));
  if (auth?.setup_required) return <div className="entry-page"><header className="entry-header"><Brand/><ThemeToggle/></header><main className="setup-main"><section className="entry-form setup-form"><div className="entry-form-heading"><ColoredIcon name="lock"/><div><span className="eyebrow">FIRST-TIME SETUP</span><h1>Welcome to phpMongo</h1></div></div><p className="form-description">Choose a master password to protect your private workspace. You’ll enter your MongoDB credentials after signing in.</p><form onSubmit={install}><label htmlFor="setup-password">Master password</label><input id="setup-password" type="password" autoComplete="new-password" minLength={12} maxLength={4096} value={password} onChange={event => setPassword(event.target.value)} required/><p className="setup-hint">Use at least 12 characters. Save this password somewhere safe.</p><label htmlFor="setup-confirmation">Confirm master password</label><input id="setup-confirmation" type="password" autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} required/><ErrorMessage>{formError}</ErrorMessage><button className="primary-button entry-submit" disabled={formBusy}>{formBusy ? <Spinner text="Setting up your workspace…"/> : <>Set up phpMongo<ArrowRight size={17}/></>}</button></form><p className="form-note"><ShieldCheck size={15}/><span>Your password is stored as a secure hash. This setup screen closes after installation.</span></p></section></main></div>;
  if (auth?.connected && ['/', '/setup', '/login', '/connect'].includes(route.pathname)) return <Spinner text="Opening your workspace…"/>;
  return <><a className="skip-link" href="#main">Skip to content</a>{!auth || !auth.connected ? <div className="entry-page"><header className="entry-header"><Brand/><div className="entry-header-actions"><ThemeToggle/><button className="text-button" onClick={() => setGuide(true)}><BookOpen size={15}/> Developer guide <ArrowUpRight size={14}/></button></div></header><main id="main" className="entry-main"><div className="entry-intro"><span className="eyebrow"><span className="dot"/> YOUR PRIVATE DATABASE WORKSPACE</span><h1>A clearer view<br/>of your <em>data.</em></h1><p>Explore your MongoDB collections.<br/>Find what matters. Browse documents and create collections.</p><div className="entry-benefits"><span><ShieldCheck size={16}/> Browse & create documents</span><span><LockKeyhole size={16}/> Private by default</span></div></div><div className="entry-workspace"><section className="entry-form"><div className="entry-form-heading"><ColoredIcon name={auth?.authenticated ? 'connect' : 'lock'}/><div><span className="eyebrow">{auth?.authenticated ? 'STEP 02 / CONNECT' : 'STEP 01 / UNLOCK'}</span><h2>{auth?.authenticated ? 'Connect your database' : 'Welcome to phpMongo'}</h2></div></div>{bootError ? <><ErrorMessage>{bootError}</ErrorMessage><button className="secondary-button" onClick={() => location.reload()}>Retry setup</button></> : !auth ? <Spinner text="Opening your workspace…"/> : <><>{setupComplete && <p className="setup-success" role="status">Setup complete. Sign in with your new master password.</p>}</><p className="form-description">{auth.authenticated ? 'Paste a MongoDB connection string to start exploring.' : 'Enter your master password to open your workspace.'}</p>{(auth.warnings ?? []).map(warning => <ErrorMessage key={warning}>{warning}</ErrorMessage>)}<form onSubmit={auth.authenticated ? connect : login}><label htmlFor={auth.authenticated ? 'connection-uri' : 'master-password'}>{auth.authenticated ? 'Connection string' : 'Master password'}</label><div className="entry-input-wrap">{auth.authenticated ? <input id="connection-uri" type="text" autoComplete="off" spellCheck={false} placeholder="mongodb://localhost:27017" value={uri} onChange={event => setUri(event.target.value)} required/> : <input id="master-password" type="password" autoComplete="current-password" placeholder="Enter your master password" value={password} onChange={event => setPassword(event.target.value)} required/>}<LockKeyhole size={16}/></div><ErrorMessage>{formError}</ErrorMessage><button className="primary-button entry-submit" disabled={formBusy}>{formBusy ? <Spinner text={auth.authenticated ? 'Verifying connection…' : 'Unlocking…'}/> : <>{auth.authenticated ? 'Connect & explore' : 'Unlock workspace'}<ArrowRight size={17}/></>}</button></form><div className="form-note"><ShieldCheck size={15}/><span>{auth.authenticated ? 'Your verified connection is saved in encrypted private configuration.' : 'Your MongoDB credentials come next, after login.'}</span></div>{auth.authenticated && <button className="text-button" onClick={() => void leave(true)} disabled={formBusy}><LogOut size={13}/> Sign out</button>}</>}</section><SponsorCard sponsor={ui.sponsors.login}/></div></main><footer className="entry-footer"><span>phpMongo · Open source, thoughtfully simple.</span><span>MIT License <span className="footer-dot">·</span> Built for your local workspace</span></footer></div> : <div className="workspace"><aside className={`sidebar ${menu ? 'sidebar-open' : ''}`} inert={mobile && !menu} aria-label="Workspace navigation"><div className="sidebar-brand"><Brand compact/><button className="icon-button mobile-close" onClick={() => setMenu(false)} aria-label="Close navigation"><X size={18}/></button></div><div className="workspace-label">WORKSPACE</div><button className="overview-button" onClick={() => { navigate('/workspace'); setSelected(null); setMenu(false); }}><Layers3 size={17}/> Overview{!target && !databaseName && <span className="active-dot"/>}</button><div className="nav-heading"><span>DATABASES</span><button className="icon-button" aria-label="Refresh databases" onClick={() => void loadStructure()} disabled={structureBusy}><RefreshCw size={13} className={structureBusy ? 'spin' : ''}/></button></div><div className="nav-search"><Search size={14}/><input aria-label="Find a collection" placeholder="Find a collection…" value={search} onChange={event => setSearch(event.target.value)}/><span>/</span></div><nav className="database-nav" aria-label="Databases and collections">{structureBusy && <Spinner text="Loading databases…"/>}{structureError && <div className="nav-error" role="alert">{structureError}<button className="text-button" onClick={() => void loadStructure()}>Try again</button></div>}{visible.map(db => <details className="database-group" key={db.database} open><summary><ChevronDown size={13}/><ColoredIcon name="database"/><button type="button" className="database-name" aria-current={databaseName === db.database ? 'page' : undefined} onClick={event => { event.preventDefault(); event.stopPropagation(); navigate(databasePath(db.database)); }} >{db.database}</button><small>{db.collections.length}</small><button type="button" className="icon-button database-create" aria-label={`Create collection in ${db.database}`} title="Create collection" onClick={event => { event.preventDefault(); event.stopPropagation(); openCreate(db.database); }}><Plus size={13}/></button></summary><div className="collection-links">{db.collections.map(name => <div key={name} className={`collection-row ${target?.db === db.database && target.collection === name ? 'selected' : ''}`}><button className={`collection-link ${target?.db === db.database && target.collection === name ? 'selected' : ''}`} onClick={() => choose(db.database, name)}><ColoredIcon name="collection"/><span>{name}</span></button><div className="collection-actions"><button className="icon-button" title="Edit collection" aria-label={`Edit collection ${db.database}.${name}`} onClick={() => openCollectionAction(db.database, name, 'edit')}><Pencil size={13}/></button><button className="icon-button collection-delete" title="Delete collection" aria-label={`Delete collection ${db.database}.${name}`} onClick={() => openCollectionAction(db.database, name, 'delete')}><Trash2 size={13}/></button></div></div>)}</div></details>)}{!structureBusy && !structureError && visible.length === 0 && <p className="nav-empty">{search ? 'No matching collections.' : 'No visible databases yet.'}</p>}</nav><div className="sidebar-bottom"><SponsorCard sponsor={ui.sponsors.sidebar} small/><button className="sidebar-help" onClick={() => setGuide(true)}><CircleHelp size={16}/> Help & documentation<ArrowUpRight size={13}/></button><div className="sidebar-footer"><span>phpMongo</span><span>v1.0</span></div></div></aside>{menu && <button className="nav-backdrop" aria-label="Close navigation" onClick={() => setMenu(false)}/>}<div className="main-area" inert={mobile && menu}><header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMenu(true)}><Menu size={20}/></button><span className="breadcrumb-icon"><DatabaseIcon size={16}/></span>{target || databaseName ? <button className="breadcrumb-database" onClick={() => navigate(databasePath(target?.db ?? databaseName!))}>{target?.db ?? databaseName}</button> : <span>Your workspace</span>}{target && <><ChevronRight size={13}/><strong>{target.collection}</strong></>}</div><div className="topbar-actions"><ThemeToggle/><span className="connection-badge"><span className="dot"/> Connected</span><span className="topbar-divider"/><button className="icon-button" title="Disconnect database" aria-label="Disconnect database" disabled={formBusy} onClick={() => void leave()}><Unplug size={17}/></button><button className="icon-button" title="Sign out" aria-label="Sign out" disabled={formBusy} onClick={() => void leave(true)}><LogOut size={17}/></button><span className="avatar" title="Administrator">A</span></div></header><main id="main" className="workspace-content">{(auth.warnings ?? []).map(warning => <ErrorMessage key={warning}>{warning}</ErrorMessage>)}<ErrorMessage>{formError}</ErrorMessage>{notice && <p className="setup-success" role="status">{notice}</p>}{databaseName ? <DatabasePage key={databaseName} database={databaseName} collections={databases.find(db => db.database === databaseName)?.collections} loading={structureBusy} error={structureError} onRefresh={() => void loadStructure()} onCreate={openCreate} onOpen={choose} onAction={openCollectionAction}/> : !target ? <><div className="page-heading"><div><span className="eyebrow">MAKE YOURSELF AT HOME</span><h1>Your database workspace</h1><p>A little clarity for everything in your collections.</p></div><ReadOnlyBadge/></div><div className="overview-stats"><div><ColoredIcon name="database"/><span><strong>{databases.length}</strong><small>Visible databases</small></span></div><div><ColoredIcon name="collection"/><span><strong>{collectionCount}</strong><small>Visible collections</small></span></div><div><ColoredIcon name="lock"/><span><strong>Browse & create</strong><small>Create, edit, and inspect documents</small></span></div></div><section className="database-cards"><div className="section-heading"><h2>Explore your databases</h2><span>{databases.length} available</span></div>{databases.map(db => <article className="database-card" key={db.database}><div className="database-card-icon"><ColoredIcon name="database"/></div><div><h3>{db.database}</h3><p>{db.collections.length} {db.collections.length === 1 ? 'collection' : 'collections'}</p></div><button className="secondary-button" onClick={() => navigate(databasePath(db.database))}>Explore <ArrowRight size={15}/></button></article>)}{!databases.length && <div className="empty-state"><ColoredIcon name="database"/><h3>{structureBusy ? 'Finding your databases…' : 'No databases to show yet'}</h3><p>{structureError || 'Open a collection directly below if your account cannot list databases.'}</p></div>}</section><section className="direct-open"><div><FolderOpen size={19}/><h3>Open a collection directly</h3></div><p>Useful when your database account has limited discovery permissions.</p><form onSubmit={event => { event.preventDefault(); choose(directDb.trim(), directCollection.trim()); }}><label><span>Database</span><input placeholder="Database name" value={directDb} onChange={event => setDirectDb(event.target.value)} required/></label><label><span>Collection</span><input placeholder="Collection name" value={directCollection} onChange={event => setDirectCollection(event.target.value)} required/></label><button className="secondary-button">Open collection <ArrowRight size={15}/></button></form></section></> : <CollectionWorkspace key={`${target.db}.${target.collection}`} target={target} filter={filter} applied={applied} sort={sort} page={page} pageSize={pageSize} preview={preview} busy={queryBusy} error={queryError} columns={columns} setFilter={setFilter} setSort={setSort} setPage={setPage} setPageSize={setPageSize} reset={() => { setFilter('{}'); setApplied('{}'); setPage(1); setSort({ _id: 1 }); setRefresh(value => value + 1); }} run={runQuery} refresh={() => setRefresh(value => value + 1)} create={() => { setDocumentTarget(target); setNotice(''); }} inspect={setSelected} edit={editDocumentCell} remove={record => void openDocumentAction(record, 'delete')}/>}<footer className="workspace-footer"><span><span className="dot"/> Your data stays yours.</span><button className="text-button" onClick={() => setGuide(true)}>Workspace guide <ArrowUpRight size={13}/></button></footer></main></div></div>}{creating && <Dialog title="Create collection" onClose={() => { if (!createBusy) setCreating(false); }}><form className="create-collection-form" onSubmit={createCollection}><p>Create an empty collection in <strong>{createDb}</strong>.</p><label htmlFor="create-collection">Collection name</label><input id="create-collection" value={createName} onChange={event => setCreateName(event.target.value)} maxLength={120} disabled={createBusy} autoComplete="off" required/><ErrorMessage>{createError}</ErrorMessage><div className="create-actions"><button type="button" className="secondary-button" disabled={createBusy} onClick={() => setCreating(false)}>Cancel</button><button className="primary-button" disabled={createBusy}>{createBusy ? <Spinner text="Creating…"/> : <><Plus size={16}/>Create collection</>}</button></div></form></Dialog>}{collectionAction && <Dialog title={collectionAction.kind === 'edit' ? 'Edit collection' : 'Delete collection'} onClose={() => { if (!actionBusy) setCollectionAction(null); }}><form className="create-collection-form" onSubmit={changeCollection}><p>{collectionAction.kind === 'edit' ? `Rename “${collectionAction.collection}” in “${collectionAction.db}”. Its documents will be preserved.` : `Delete “${collectionAction.db}.${collectionAction.collection}” and all its documents? This cannot be undone.`}</p>{collectionAction.kind === 'edit' && <><label htmlFor="rename-collection">Collection name</label><input id="rename-collection" value={actionName} onChange={event => setActionName(event.target.value)} maxLength={120} disabled={actionBusy} autoComplete="off" required/></>}<ErrorMessage>{actionError}</ErrorMessage><div className="create-actions"><button type="button" className="secondary-button" disabled={actionBusy} onClick={() => setCollectionAction(null)}>Cancel</button><button className={`primary-button ${collectionAction.kind === 'delete' ? 'danger-button' : ''}`} disabled={actionBusy || (collectionAction.kind === 'edit' && (!actionName.trim() || actionName.trim() === collectionAction.collection))}>{actionBusy ? <Spinner text="Saving…"/> : collectionAction.kind === 'edit' ? 'Save name' : 'Delete collection'}</button></div></form></Dialog>}{documentTarget && <Dialog title="Create document" onClose={() => { if (!documentBusy) setDocumentTarget(null); }}><CreateDocumentForm target={documentTarget} onBusy={setDocumentBusy} onCancel={() => setDocumentTarget(null)} onSaved={() => { setDocumentTarget(null); setRefresh(value => value + 1); setNotice('Document created.'); }}/></Dialog>}{documentAction && <Dialog title={documentAction.kind === 'edit' ? 'Edit document' : 'Delete document'} onClose={() => { if (!documentBusy) setDocumentAction(null); }}><form className="create-collection-form" onSubmit={saveDocumentAction}><p>{documentAction.kind === 'edit' ? 'Edit the field values below. The document ID stays unchanged. Omitted fields are preserved.' : 'Delete this document permanently? This cannot be undone.'}</p><code>{scalar(documentAction.record.identifier)}</code>{documentAction.kind === 'edit' && <><label htmlFor="document-json">Document fields (MongoDB JSON)</label><textarea id="document-json" className="document-json-editor" rows={10} value={documentJson} onChange={event => setDocumentJson(event.target.value)} disabled={documentBusy} required/></>}<ErrorMessage>{documentError}</ErrorMessage><div className="create-actions"><button type="button" className="secondary-button" disabled={documentBusy} onClick={() => setDocumentAction(null)}>Cancel</button><button className={`primary-button ${documentAction.kind === 'delete' ? 'danger-button' : ''}`} disabled={documentBusy || (documentAction.kind === 'edit' && !documentJson)}>{documentBusy ? 'Please wait…' : documentAction.kind === 'edit' ? 'Save changes' : 'Delete document'}</button></div></form></Dialog>}{guide && <Guide onClose={closeGuide}/>} {selected && target && <Inspector target={target} record={selected} onClose={() => setSelected(null)}/>}</>;
}
