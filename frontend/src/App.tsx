import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, BookOpen, ChevronDown, ChevronRight, CircleHelp, Code2, Database as DatabaseIcon, FileJson, FolderOpen, Layers3, LoaderCircle, LockKeyhole, LogOut, Menu, RefreshCw, Search, ShieldCheck, SlidersHorizontal, Unplug, X } from 'lucide-react';
import { api, identifier, logoutBeacon, query, scalar, setCsrf, unauthorizedHandler, type Auth, type Database, type Detail, type EValue, type Field, type Preview, type RecordView, type Sponsor, type UiConfig } from './api';

const defaults: UiConfig = { sponsors: {
  login: { label: 'BUILT WITH THE COMMUNITY', title: 'Good tools grow together.', description: 'A small, open-source workspace for curious developers. Explore the docs and help shape what comes next.', href: '#guide' },
  sidebar: { label: 'COMMUNITY SUPPORTED', title: 'Help phpMongo grow', description: 'Explore the developer guide', href: '#guide' },
} };
function Brand({ compact = false }: { compact?: boolean }) {
  return <div className="brand"><span className="brand-mark"><svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 3C8 8 7 17 13 24l3 5 3-5c6-7 5-16-3-21Z" fill="currentColor"/><path d="M16 10v18" stroke="#fff" strokeWidth="1.4" strokeLinecap="round"/></svg></span><span>php<span className="brand-mongo">Mongo</span></span>{!compact && <span className="version">v1</span>}</div>;
}
function ColoredIcon({ name, className = '' }: { name: 'database' | 'collection' | 'lock' | 'connect' | 'community' | 'document'; className?: string }) {
  return <img className={`color-icon ${className}`} src={`/assets/icons/${name}.svg`} alt="" aria-hidden="true" />;
}
function SponsorCard({ sponsor, small = false }: { sponsor: Sponsor; small?: boolean }) {
  return <a className={small ? 'sponsor-small' : 'sponsor-card'} href={sponsor.href} {...(sponsor.href.startsWith('https://') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
    {small ? <><ColoredIcon name="community"/><span><strong>{sponsor.title}</strong><small>{sponsor.description}</small></span><ArrowUpRight size={15}/></> : <><span className="sponsor-eyebrow"><span className="dot"/>{sponsor.label}</span><div className="sponsor-art"><ColoredIcon name="community"/><span className="orbit orbit-one"/><span className="orbit orbit-two"/></div><h2>{sponsor.title}</h2><p>{sponsor.description}</p><span className="sponsor-link">Explore the community <ArrowUpRight size={15}/></span></>}
  </a>;
}
function ErrorMessage({ children }: { children?: ReactNode }) { return children ? <div className="error-message" role="alert">{children}</div> : null; }
function Spinner({ text = 'Loading…' }: { text?: string }) { return <span className="loading"><LoaderCircle className="spin" size={17}/>{text}</span>; }
function ReadOnlyBadge() { return <span className="read-only"><ShieldCheck size={13}/> Read only</span>; }
function Dialog({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog ref={ref} className={wide ? 'detail-dialog' : 'guide-dialog'} onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}><header className="dialog-header"><h2>{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={20}/></button></header>{children}</dialog>;
}
function Guide({ onClose }: { onClose: () => void }) {
  return <Dialog title="A little guide to your workspace" onClose={onClose}><div className="guide-content"><span className="guide-icon"><BookOpen size={27}/></span><h3>Your data, a clearer view.</h3><p>phpMongo is a private, read-only MongoDB workspace. Browse your collections, ask focused questions, and look inside a document.</p><section><h4>1. Connect your database</h4><p>After unlocking phpMongo, paste your MongoDB URI. It stays in your encrypted server session, and is cleared when you sign out.</p></section><section><h4>2. Find what matters</h4><p>Filters use MongoDB Extended JSON. Try an equality filter or a supported comparison:</p><pre>{'{ "status": "active", "amount": { "$gte": 100 } }'}</pre><p>For ObjectIds, use <code>{'{ "_id": { "$oid": "…" } }'}</code>. Shell commands, JavaScript, regex, and writes are unavailable.</p></section><section><h4>3. Take a closer look</h4><p>Click a document to open its bounded detail view. Large values and nested content may be shortened; use a field path such as <code>items.21</code> to inspect another part.</p></section><section><h4>Community supported</h4><p>phpMongo is open source under the MIT License. Contributions to its code, documentation, and accessibility help keep this workspace useful.</p></section><div className="guide-note"><ShieldCheck size={18}/><span>50 documents per page · Up to 200 pages · One-hour idle sessions</span></div></div></Dialog>;
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

export default function App() {
  const [auth, setAuth] = useState<Auth | null>(null);
  const [ui, setUi] = useState(defaults);
  const [bootError, setBootError] = useState('');
  const [guide, setGuide] = useState(location.hash === '#guide');
  const [password, setPassword] = useState('');
  const [uri, setUri] = useState('');
  const [formError, setFormError] = useState('');
  const [formBusy, setFormBusy] = useState(false);
  const [databases, setDatabases] = useState<Database[]>([]);
  const [structureError, setStructureError] = useState('');
  const [structureBusy, setStructureBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [target, setTarget] = useState<{ db: string; collection: string } | null>(null);
  const [filter, setFilter] = useState('{}');
  const [applied, setApplied] = useState('{}');
  const [sort, setSort] = useState<Record<string, number>>({ _id: 1 });
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [queryError, setQueryError] = useState('');
  const [queryBusy, setQueryBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [selected, setSelected] = useState<RecordView | null>(null);
  const [menu, setMenu] = useState(false);
  const [mobile, setMobile] = useState(window.matchMedia('(max-width: 760px)').matches);
  const [directDb, setDirectDb] = useState('');
  const [directCollection, setDirectCollection] = useState('');
  const activeRef = useRef(false);
  const initialAuth = useRef<Promise<Auth> | null>(null);
  const recovery = useRef<Promise<unknown> | null>(null);
  const structurePending = useRef<AbortController | null>(null);

  const clearData = useCallback(() => { structurePending.current?.abort(); setDatabases([]); setTarget(null); setPreview(null); setSelected(null); setStructureError(''); setQueryError(''); setUri(''); setPassword(''); }, []);
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
    const leaving = (event: PageTransitionEvent) => { if (!event.persisted && activeRef.current) logoutBeacon(); };
    window.addEventListener('pagehide', leaving);
    return () => { alive = false; window.removeEventListener('hashchange', hash); window.removeEventListener('pagehide', leaving); };
  }, [loadAuth, clearData]);
  useEffect(() => { activeRef.current = !!auth?.authenticated; }, [auth]);
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
  async function login(event: FormEvent) {
    event.preventDefault(); setFormBusy(true); setFormError('');
    try { const next = await api<Auth>('/api/auth/login', 'POST', { password }); setPassword(''); setCsrf(next.csrf_token); setAuth({ ...next, connected: false }); }
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
    void api<Preview>(query('/api/data/documents', { ...target, filter: applied, sort: JSON.stringify(sort), page }), 'GET', undefined, controller.signal)
      .then(setPreview)
      .catch(error => { if (!controller.signal.aborted) { setQueryError(error.message); setPreview(null); } })
      .finally(() => { if (!controller.signal.aborted) setQueryBusy(false); });
    return () => controller.abort();
  }, [target?.db, target?.collection, auth?.connected, applied, JSON.stringify(sort), page, refresh]);
  const columns = useMemo(() => [...new Set(preview?.documents.flatMap(record => record.fields.map(field => field.name)) ?? [])], [preview]);
  const collectionCount = databases.reduce((total, db) => total + db.collections.length, 0);
  function choose(db: string, collection: string) { setTarget({ db, collection }); setPage(1); setFilter('{}'); setApplied('{}'); setSort({ _id: 1 }); setPreview(null); setSelected(null); setQueryError(''); setMenu(false); }
  function runQuery(event: FormEvent) {
    event.preventDefault();
    try { const parsed: unknown = JSON.parse(filter); if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Use a JSON object at the root of your filter.'); setQueryError(''); setApplied(filter); setPage(1); setSelected(null); setRefresh(value => value + 1); }
    catch (error) { setQueryError(error instanceof Error ? error.message : 'Use a valid JSON filter.'); }
  }
  const visible = databases.map(db => ({ ...db, collections: db.collections.filter(name => `${db.database} ${name}`.toLowerCase().includes(search.toLowerCase())) })).filter(db => db.collections.length || db.database.toLowerCase().includes(search.toLowerCase()));
  return <><a className="skip-link" href="#main">Skip to content</a>{!auth || !auth.connected ? <div className="entry-page"><header className="entry-header"><Brand/><button className="text-button" onClick={() => setGuide(true)}><BookOpen size={15}/> Developer guide <ArrowUpRight size={14}/></button></header><main id="main" className="entry-main"><div className="entry-intro"><span className="eyebrow"><span className="dot"/> YOUR PRIVATE DATABASE WORKSPACE</span><h1>A clearer view<br/>of your <em>data.</em></h1><p>Explore your MongoDB collections.<br/>Find what matters. Keep your data untouched.</p><div className="entry-benefits"><span><ShieldCheck size={16}/> Read-only by design</span><span><LockKeyhole size={16}/> Private by default</span></div></div><div className="entry-workspace"><section className="entry-form"><div className="entry-form-heading"><ColoredIcon name={auth?.authenticated ? 'connect' : 'lock'}/><div><span className="eyebrow">{auth?.authenticated ? 'STEP 02 / CONNECT' : 'STEP 01 / UNLOCK'}</span><h2>{auth?.authenticated ? 'Connect your database' : 'Welcome to phpMongo'}</h2></div></div>{bootError ? <><ErrorMessage>{bootError}</ErrorMessage><button className="secondary-button" onClick={() => location.reload()}>Retry setup</button></> : !auth ? <Spinner text="Opening your workspace…"/> : <><p className="form-description">{auth.authenticated ? 'Paste a MongoDB connection string to start exploring.' : 'Enter your master password to open your workspace.'}</p>{(auth.warnings ?? []).map(warning => <ErrorMessage key={warning}>{warning}</ErrorMessage>)}<form onSubmit={auth.authenticated ? connect : login}><label htmlFor={auth.authenticated ? 'connection-uri' : 'master-password'}>{auth.authenticated ? 'Connection string' : 'Master password'}</label><div className="entry-input-wrap">{auth.authenticated ? <input id="connection-uri" type="password" autoComplete="off" spellCheck={false} placeholder="mongodb://localhost:27017" value={uri} onChange={event => setUri(event.target.value)} required/> : <input id="master-password" type="password" autoComplete="current-password" placeholder="Enter your master password" value={password} onChange={event => setPassword(event.target.value)} required/>}<LockKeyhole size={16}/></div><ErrorMessage>{formError}</ErrorMessage><button className="primary-button entry-submit" disabled={formBusy}>{formBusy ? <Spinner text={auth.authenticated ? 'Verifying connection…' : 'Unlocking…'}/> : <>{auth.authenticated ? 'Connect & explore' : 'Unlock workspace'}<ArrowRight size={17}/></>}</button></form><div className="form-note"><ShieldCheck size={15}/><span>{auth.authenticated ? 'Credentials stay in your encrypted server session.' : 'Your MongoDB credentials come next, after login.'}</span></div>{auth.authenticated && <button className="text-button" onClick={() => void leave(true)} disabled={formBusy}><LogOut size={13}/> Sign out</button>}</>}</section><SponsorCard sponsor={ui.sponsors.login}/></div></main><footer className="entry-footer"><span>phpMongo · Open source, thoughtfully simple.</span><span>MIT License <span className="footer-dot">·</span> Built for your local workspace</span></footer></div> : <div className="workspace"><aside className={`sidebar ${menu ? 'sidebar-open' : ''}`} inert={mobile && !menu} aria-label="Workspace navigation"><div className="sidebar-brand"><Brand compact/><button className="icon-button mobile-close" onClick={() => setMenu(false)} aria-label="Close navigation"><X size={18}/></button></div><div className="workspace-label">WORKSPACE</div><button className="overview-button" onClick={() => { setTarget(null); setSelected(null); setMenu(false); }}><Layers3 size={17}/> Overview{!target && <span className="active-dot"/>}</button><div className="nav-heading"><span>DATABASES</span><button className="icon-button" aria-label="Refresh databases" onClick={() => void loadStructure()} disabled={structureBusy}><RefreshCw size={13} className={structureBusy ? 'spin' : ''}/></button></div><div className="nav-search"><Search size={14}/><input aria-label="Find a collection" placeholder="Find a collection…" value={search} onChange={event => setSearch(event.target.value)}/><span>/</span></div><nav className="database-nav" aria-label="Databases and collections">{structureBusy && <Spinner text="Loading databases…"/>}{structureError && <div className="nav-error" role="alert">{structureError}<button className="text-button" onClick={() => void loadStructure()}>Try again</button></div>}{visible.map(db => <details className="database-group" key={db.database} open><summary><ChevronDown size={13}/><ColoredIcon name="database"/><span>{db.database}</span><small>{db.collections.length}</small></summary><div className="collection-links">{db.collections.map(name => <button key={name} className={`collection-link ${target?.db === db.database && target.collection === name ? 'selected' : ''}`} onClick={() => choose(db.database, name)}><ColoredIcon name="collection"/><span>{name}</span>{target?.db === db.database && target.collection === name && <span className="active-dot"/>}</button>)}</div></details>)}{!structureBusy && !structureError && visible.length === 0 && <p className="nav-empty">{search ? 'No matching collections.' : 'No visible databases yet.'}</p>}</nav><div className="sidebar-bottom"><SponsorCard sponsor={ui.sponsors.sidebar} small/><button className="sidebar-help" onClick={() => setGuide(true)}><CircleHelp size={16}/> Help & documentation<ArrowUpRight size={13}/></button><div className="sidebar-footer"><span>phpMongo</span><span>v1.0</span></div></div></aside>{menu && <button className="nav-backdrop" aria-label="Close navigation" onClick={() => setMenu(false)}/>}<div className="main-area" inert={mobile && menu}><header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMenu(true)}><Menu size={20}/></button><span className="breadcrumb-icon"><DatabaseIcon size={16}/></span><span>{target?.db ?? 'Your workspace'}</span>{target && <><ChevronRight size={13}/><strong>{target.collection}</strong></>}</div><div className="topbar-actions"><span className="connection-badge"><span className="dot"/> Connected</span><span className="topbar-divider"/><button className="icon-button" title="Disconnect database" aria-label="Disconnect database" disabled={formBusy} onClick={() => void leave()}><Unplug size={17}/></button><button className="icon-button" title="Sign out" aria-label="Sign out" disabled={formBusy} onClick={() => void leave(true)}><LogOut size={17}/></button><span className="avatar" title="Administrator">A</span></div></header><main id="main" className="workspace-content">{(auth.warnings ?? []).map(warning => <ErrorMessage key={warning}>{warning}</ErrorMessage>)}<ErrorMessage>{formError}</ErrorMessage>{!target ? <><div className="page-heading"><div><span className="eyebrow">MAKE YOURSELF AT HOME</span><h1>Your database workspace</h1><p>A little clarity for everything in your collections.</p></div><ReadOnlyBadge/></div><div className="overview-stats"><div><ColoredIcon name="database"/><span><strong>{databases.length}</strong><small>Visible databases</small></span></div><div><ColoredIcon name="collection"/><span><strong>{collectionCount}</strong><small>Visible collections</small></span></div><div><ColoredIcon name="lock"/><span><strong>Read only</strong><small>Your data stays untouched</small></span></div></div><section className="database-cards"><div className="section-heading"><h2>Explore your databases</h2><span>{databases.length} available</span></div>{databases.map(db => <article className="database-card" key={db.database}><div className="database-card-icon"><ColoredIcon name="database"/></div><div><h3>{db.database}</h3><p>{db.collections.length} {db.collections.length === 1 ? 'collection' : 'collections'}</p></div><button className="secondary-button" onClick={() => { if (db.collections[0]) choose(db.database, db.collections[0]); }} disabled={db.collections.length === 0}>Explore <ArrowRight size={15}/></button></article>)}{!databases.length && <div className="empty-state"><ColoredIcon name="database"/><h3>{structureBusy ? 'Finding your databases…' : 'No databases to show yet'}</h3><p>{structureError || 'Open a collection directly below if your account cannot list databases.'}</p></div>}</section><section className="direct-open"><div><FolderOpen size={19}/><h3>Open a collection directly</h3></div><p>Useful when your database account has limited discovery permissions.</p><form onSubmit={event => { event.preventDefault(); choose(directDb.trim(), directCollection.trim()); }}><label><span>Database</span><input placeholder="Database name" value={directDb} onChange={event => setDirectDb(event.target.value)} required/></label><label><span>Collection</span><input placeholder="Collection name" value={directCollection} onChange={event => setDirectCollection(event.target.value)} required/></label><button className="secondary-button">Open collection <ArrowRight size={15}/></button></form></section></> : <><div className="page-heading"><div><span className="eyebrow">COLLECTION EXPLORER</span><h1>{target.collection}<ReadOnlyBadge/></h1><p>Browse, filter, and take a closer look.</p></div><button className="secondary-button" onClick={() => setRefresh(value => value + 1)} disabled={queryBusy}><RefreshCw size={14} className={queryBusy ? 'spin' : ''}/> Refresh</button></div><div className="collection-tabs"><span className="tab-active"><ColoredIcon name="document"/>Documents</span><span className="collection-namespace">{target.db}.{target.collection}</span></div><section className="query-panel"><div className="query-heading"><span><Code2 size={16}/> Filter</span><span className="query-format">MongoDB Extended JSON</span><button className="text-button" onClick={() => { setFilter('{}'); setApplied('{}'); setPage(1); setSort({ _id: 1 }); setRefresh(value => value + 1); }}>Reset</button></div><form onSubmit={runQuery}><div className="filter-editor"><span className="line-number">1</span><textarea aria-label="Document filter" rows={2} spellCheck={false} value={filter} onChange={event => setFilter(event.target.value)} onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }}/></div><div className="query-footer"><span><SlidersHorizontal size={13}/> Sort: <code>{Object.entries(sort).map(([field, dir]) => `${field} ${dir === 1 ? '↑' : '↓'}`).join(', ')}</code><span className="keyboard-hint">⌘ / Ctrl + Enter</span></span><button className="primary-button" disabled={queryBusy}><Search size={14}/>{queryBusy ? 'Finding…' : 'Find documents'}</button></div></form></section><ErrorMessage>{queryError}</ErrorMessage><section className="document-panel" aria-label="Document results" aria-busy={queryBusy}><div className="results-heading"><span><strong>{queryBusy ? 'Loading documents' : `${preview?.count ?? 0} documents`}</strong><span className="muted">{preview?.count ? 'in this page' : ''}</span></span><span className="preview-label"><span className="dot"/> Preview mode</span></div>{queryBusy ? <div className="empty-state"><Spinner text="Fetching your documents…"/></div> : preview?.documents.length ? <div className="table-scroll"><table><thead><tr><th className="row-number">#</th>{columns.map(column => <th key={column}><button onClick={() => { setSort({ [column]: sort[column] === 1 ? -1 : 1 }); setPage(1); }} title={`Sort by ${column}`}>{column}{sort[column] ? sort[column] === 1 ? <ArrowUp size={12}/> : <ArrowDown size={12}/> : <span className="sort-idle">↕</span>}</button></th>)}<th className="row-open"/></tr></thead><tbody>{preview.documents.map((record, index) => { const id = identifier(record.identifier); return <tr key={JSON.stringify(record.identifier) + index} className={id ? 'inspectable-row' : ''} onClick={() => { if (id && !record.identifier_omitted) setSelected(record); }}><td className="row-number">{(page - 1) * 50 + index + 1}</td>{columns.map(column => { const field: Field | undefined = record.fields.find(field => field.name === column); const value = field ? scalar(field.value) : null; return <td key={column} className={`value-cell ${field?.type === 'string' ? 'string-value' : ''} ${field?.type === 'object' || field?.type === 'array' ? 'container-value' : ''}`} title={value ?? undefined}>{field ? value ?? (Array.isArray(field.value) ? `[Array(${field.value.length})]` : '[Object Object]') : <span className="missing-value">—</span>}{field?.truncated && <span className="value-truncated" title="Bounded preview">…</span>}</td>; })}<td className="row-open"><button className="icon-button" title={!id || record.identifier_omitted ? 'This identifier type is not supported by the detail view.' : 'Open bounded document details'} aria-label={`Inspect document ${scalar(record.identifier) ?? index + 1}`} disabled={!id || record.identifier_omitted} onClick={event => { event.stopPropagation(); setSelected(record); }}><ArrowUpRight size={15}/></button></td></tr>; })}</tbody></table></div> : <div className="empty-state"><ColoredIcon name="document"/><h3>{queryError ? 'The query needs a little attention' : 'No matching documents'}</h3><p>{queryError ? 'Review the message above and update your filter.' : 'Try a broader filter, or check another collection.'}</p></div>}<div className="pagination"><span>Page <strong>{page}</strong> <span className="pagination-divider">·</span> Up to 50 documents per page</span><div><button className="secondary-button" disabled={page === 1 || queryBusy} onClick={() => setPage(value => value - 1)}><ArrowLeft size={14}/> Previous</button><button className="secondary-button" disabled={!preview?.next_page || queryBusy} onClick={() => setPage(value => value + 1)}>Next <ArrowRight size={14}/></button></div></div></section><div className="explorer-footnote"><ShieldCheck size={14}/><span>Previews are bounded to keep browsing light. Open a document for more detail.</span><span className="result-limit">{page === 200 ? 'Page limit reached. Refine your filter.' : 'Pages may shift when data changes.'}</span></div></>}<footer className="workspace-footer"><span><span className="dot"/> Your data stays yours.</span><button className="text-button" onClick={() => setGuide(true)}>Workspace guide <ArrowUpRight size={13}/></button></footer></main></div></div>}{guide && <Guide onClose={closeGuide}/>} {selected && target && <Inspector target={target} record={selected} onClose={() => setSelected(null)}/>}</>;
}
