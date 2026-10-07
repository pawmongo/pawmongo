import { useState } from 'react';
import { ImportCollection } from './ImportCollection';
import { Plus, RefreshCw, ArrowUpRight, ArrowUp, ArrowDown, Pencil, Trash2, LoaderCircle, SectionIcon } from './icons';

export function DatabasePage({ database, collections = [], loading, error, onRefresh, onCreate, onOpen, onAction }: {
  database: string; collections?: string[]; loading: boolean; error: string;
  onRefresh: () => void; onCreate: (db: string) => void; onOpen: (db: string, collection: string) => void;
  onAction: (db: string, collection: string, kind: 'edit' | 'delete') => void;
}) {
  const [ascending, setAscending] = useState(true);
  const [importing, setImporting] = useState(false);
  const names = [...collections].sort((a, b) => ascending ? a.localeCompare(b) : b.localeCompare(a));
  return <>
    <div className="page-heading"><div><span className="eyebrow">DATABASE</span><h1>{database}</h1><p>Browse and manage your collections.</p></div><button className="secondary-button" onClick={onRefresh} disabled={loading}><RefreshCw size={14}/>Refresh</button></div>
    <section className="document-panel" aria-busy={loading}><div className="results-heading"><strong>{loading ? 'Loading collections' : `${collections.length} ${collections.length === 1 ? 'collection' : 'collections'}`}</strong><div className="document-header-actions"><button className="text-button" onClick={() => setImporting(true)}><SectionIcon name="collection"/>Import collection</button><button className="text-button" onClick={() => onCreate(database)}><Plus size={14}/>Create collection</button></div></div>
      {error && <div className="error-message" role="alert">{error}</div>}
      <div className="collections-table-scroll"><table className="collections-table"><thead><tr><th aria-sort={ascending ? 'ascending' : 'descending'}><button onClick={() => setAscending(value => !value)}>Collection {ascending ? <ArrowUp size={13}/> : <ArrowDown size={13}/>}</button></th><th>Actions</th></tr></thead><tbody>{names.map(name => <tr key={name}><td><button className="collection-table-link" onClick={() => onOpen(database, name)}><SectionIcon name="collection"/>{name}</button></td><td><div className="collection-table-actions">
        <button className="icon-button" aria-label={`Open collection ${name}`} title="Open collection" onClick={() => onOpen(database, name)}><ArrowUpRight size={15}/></button>
        <button className="icon-button" aria-label={`Rename collection ${name}`} title="Rename collection" onClick={() => onAction(database, name, 'edit')}><Pencil size={14}/></button>
        <button className="icon-button collection-delete" aria-label={`Delete collection ${name} from database page`} title="Delete collection" onClick={() => onAction(database, name, 'delete')}><Trash2 size={14}/></button>
      </div></td></tr>)}</tbody></table>{!names.length && <div className="empty-state">{loading ? <span className="loading"><LoaderCircle className="spin" size={17}/>Loading collections…</span> : <p>No collections available</p>}</div>}</div>
    </section>
    {importing && <ImportCollection database={database} close={() => setImporting(false)} changed={onRefresh} imported={name => { setImporting(false); onOpen(database, name); }}/>}
  </>;
}
