import { useState, useRef, useEffect } from 'react';
import { api, query, identifier, scalar, type Detail, type EValue, type Field, type RecordView } from './api';
import { ArrowDown, ArrowUp, ArrowUpRight, Check, ChevronRight, LoaderCircle, Pencil, Trash2, X } from './icons';

const typeLabels: Record<string, string> = { objectId: 'ObjectId', string: 'String', int: 'Int32', long: 'Int64', double: 'Double', decimal: 'Decimal128', bool: 'Boolean', date: 'Date', object: 'Object', array: 'Array', null: 'Null' };
function valueType(value: EValue): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') {
    const types: Record<string, string> = { $oid: 'objectId', $numberInt: 'int', $numberLong: 'long', $numberDouble: 'double', $numberDecimal: 'decimal', $date: 'date' };
    return types[Object.keys(value)[0]] ?? 'object';
  }
  return typeof value === 'boolean' ? 'bool' : typeof value === 'number' ? 'double' : 'string';
}
function Value({ value }: { value: EValue }) {
  const text = scalar(value);
  const type = valueType(value);
  if (type === 'string') return <span className="document-value-string">"<span>{text}</span>"</span>;
  if (type === 'objectId') return <span className="document-value-id">ObjectId('<span>{text}</span>')</span>;
  if (type === 'date') return <span className="document-value-date">ISODate('{text}')</span>;
  return <span className={type === 'null' || type === 'bool' ? 'document-value-literal' : 'document-value-number'}>{text}</span>;
}
function FieldLine({ name, value, type = valueType(value), number, truncated = false, children }: { name: string; value: EValue; type?: string; number: string; truncated?: boolean; children?: React.ReactNode }) {
  const container = scalar(value) === null;
  const entries = container ? Array.isArray(value) ? value.map((item, index) => [String(index), item] as const) : Object.entries(value as Record<string, EValue>) : [];
  const line = <><span className="document-line-number">{number}</span><span className="document-field-code"><strong title={name}>{name}:</strong>{container ? <><ChevronRight className="document-expand-icon" size={11}/><span className="document-value-container">{Array.isArray(value) ? `Array (${entries.length})` : `Object (${entries.length})`}</span></> : <Value value={value}/>} {truncated && <span className="document-bounded" title="Preview shortened">…</span>}{children}</span><span className="document-field-type">{typeLabels[type] ?? type}</span></>;
  return container ? <details className="document-nested-field"><summary className="document-code-line">{line}</summary><div className="document-nested-children">{entries.map(([key, item], index) => <FieldLine key={key} name={key} value={item} number={`${number}.${index + 1}`}/>)}</div></details> : <div className="document-code-line">{line}</div>;
}
type Target = { db: string; collection: string };
function LazyField({ field, record, number, target }: { field: Field; record: RecordView; number: string; target: Target }) {
  const [value, setValue] = useState<EValue | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef<AbortController | null>(null);
  const element = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    pending.current?.abort(); setValue(undefined); setBusy(false); setError('');
    if (element.current) element.current.open = false;
    return () => pending.current?.abort();
  }, [record]);
  async function expand(open: boolean) {
    if (!open || value !== undefined || busy) return;
    const id = identifier(record.identifier);
    if (!id || record.identifier_omitted) { setError('This document has no supported identifier for loading details.'); return; }
    const controller = new AbortController(); pending.current = controller;
    setBusy(true); setError('');
    try {
      const detail = await api<Detail>(query('/api/data/document-details', { ...target, ...id, field: field.name }), 'GET', undefined, controller.signal);
      if (!controller.signal.aborted) setValue(detail.document.fields[0]?.value ?? null);
    } catch (error) { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Could not load this field.'); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  const entries = value && typeof value === 'object' ? Object.entries(value) : [];
  return <details ref={element} className="document-nested-field" onToggle={event => void expand(event.currentTarget.open)}>
    <summary className="document-code-line"><span className="document-line-number">{number}</span><span className="document-field-code"><strong title={field.name}>{field.name}:</strong><ChevronRight className="document-expand-icon" size={11}/><span className="document-value-container">{field.type === 'array' ? scalar(field.value) ?? 'Array' : 'Object'}</span></span><span className="document-field-type">{typeLabels[field.type] ?? field.type}</span></summary>
    <div className="document-nested-children">{busy ? <span className="loading"><LoaderCircle className="spin" size={13}/>Loading field…</span> : error ? <span className="document-field-error" role="alert">{error}</span> : entries.map(([key, item], index) => <FieldLine key={key} name={key} value={item} number={`${number}.${index + 1}`}/>)}{value !== undefined && <span className="document-nested-note">Bounded field preview</span>}</div>
  </details>;
}
function canEdit(record: RecordView, field: Field) {
  if (field.name === '_id' || /[.$]/.test(field.name) || field.truncated || !identifier(record.identifier) || record.identifier_omitted || scalar(field.value) === null) return false;
  return field.value === null || typeof field.value !== 'object' || Object.keys(field.value).some(key => ['$numberInt', '$numberLong', '$numberDouble', '$numberDecimal'].includes(key));
}
function DocumentCard({ record, number, target, onInspect, onEditCell, onDelete }: { record: RecordView; number: number; target: Target; onInspect: (record: RecordView) => void; onEditCell: (record: RecordView, field: string, value: EValue) => Promise<void>; onDelete: (record: RecordView) => void }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const enabled = !!identifier(record.identifier) && !record.identifier_omitted;
  const firstEditable = record.fields.find(field => canEdit(record, field));
  const id = scalar(record.identifier) ?? String(number);
  function begin(field: Field) { if (!busy && canEdit(record, field)) { setEditing(field.name); setDraft(scalar(field.value) ?? ''); setError(''); } }
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!editing || busy) return;
    setBusy(true); setError('');
    try { await onEditCell(record, editing, draft); setEditing(null); }
    catch (error) { setError(error instanceof Error ? error.message : 'Could not save this field.'); }
    finally { setBusy(false); }
  }
  return <article className="document-card" aria-label={`Document ${number}`}>
    <header className="document-card-header"><span>Document {number}</span><div className="document-card-actions">
      <button className="icon-button" title="Inspect document" aria-label={`Inspect document ${id}`} disabled={!enabled || busy} onClick={() => onInspect(record)}><ArrowUpRight size={14}/></button>
      <button className="icon-button" title="Edit document" aria-label={`Edit document ${id}`} disabled={!firstEditable || busy} onClick={() => firstEditable && begin(firstEditable)}><Pencil size={14}/></button>
      <button className="icon-button collection-delete" title="Delete document" aria-label={`Delete document ${id}`} disabled={!enabled || busy} onClick={() => onDelete(record)}><Trash2 size={14}/></button>
    </div></header>
    <div className="document-card-fields">{record.fields.map((field, index) => editing === field.name ? <form key={field.name} className="document-code-line document-inline-editor" onSubmit={save}>
      <span className="document-line-number">{index + 1}</span><span className="document-field-code"><strong title={field.name}>{field.name}:</strong><input aria-label={`Edit ${field.name}`} value={draft} autoFocus disabled={busy} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Escape' && !busy) { event.preventDefault(); setEditing(null); } }}/><button className="icon-button" type="submit" title="Save field" aria-label="Save field" disabled={busy}>{busy ? <LoaderCircle className="spin" size={13}/> : <Check size={13}/>}</button><button className="icon-button" type="button" aria-label="Cancel field edit" title="Cancel field edit" disabled={busy} onClick={() => setEditing(null)}><X size={13}/></button></span><span className="document-field-type">{typeLabels[field.type] ?? field.type}</span>
      {error && <span className="document-field-error" role="alert">{error}</span>}
    </form> : (field.type === 'object' || field.type === 'array') && scalar(field.value) !== null ? <LazyField key={field.name} field={field} record={record} target={target} number={String(index + 1)}/> : <div className="document-top-field" key={field.name} onDoubleClick={() => begin(field)}><FieldLine name={field.name} value={field.value} type={field.type} number={String(index + 1)} truncated={field.truncated}>{canEdit(record, field) && <button className="document-field-edit icon-button" title={`Edit ${field.name}`} aria-label={`Edit field ${field.name}`} onClick={() => begin(field)}><Pencil size={10}/></button>}</FieldLine></div>)}</div>
    {(record.size_limited || record.field_count > record.fields.length || record.fields.some(field => field.truncated)) && <p className="document-card-note">Bounded preview. <button className="text-button" disabled={!enabled} onClick={() => onInspect(record)}>Open details <ArrowUpRight size={12}/></button></p>}
  </article>;
}
export function DocumentList({ target, documents, columns, page, pageSize = 50, sort, loading, onSort, onInspect, onEditCell, onDelete }: {
  target: Target; documents: RecordView[]; columns: string[]; page: number; pageSize?: number; sort: Record<string, number>; loading: boolean;
  onSort: (field: string) => void; onInspect: (record: RecordView) => void; onEditCell: (record: RecordView, field: string, value: EValue) => Promise<void>; onDelete: (record: RecordView) => void;
}) {
  const field = Object.keys(sort)[0] ?? '_id';
  const cards = useRef<HTMLDivElement>(null);
  useEffect(() => { if (cards.current) cards.current.scrollTop = 0; }, [page, field, sort[field]]);
  return <div className="documents-list" aria-busy={loading}>
    <div className="documents-list-toolbar"><label>Sort by <select aria-label="Sort documents" value={field} disabled={loading} onChange={event => onSort(event.target.value)}>{[...new Set([field, ...columns])].map(name => <option key={name} value={name}>{name}</option>)}</select></label><button className="icon-button" aria-label={sort[field] === 1 ? 'Sort descending' : 'Sort ascending'} title={sort[field] === 1 ? 'Sort descending' : 'Sort ascending'} disabled={loading} onClick={() => onSort(field)}>{sort[field] === 1 ? <ArrowUp size={14}/> : <ArrowDown size={14}/>}</button></div>
    <div className="document-cards" ref={cards} inert={loading}>{documents.map((record, index) => <DocumentCard key={identifier(record.identifier) ? JSON.stringify(record.identifier) : `${page}:${index}`} record={record} target={target} number={(page - 1) * pageSize + index + 1} onInspect={onInspect} onEditCell={onEditCell} onDelete={onDelete}/>)}</div>
    {loading && <div className="document-list-loading" role="status"><span className="loading"><LoaderCircle className="spin" size={17}/>Loading documents…</span></div>}
  </div>;
}
