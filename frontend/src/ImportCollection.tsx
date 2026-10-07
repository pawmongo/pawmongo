'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api } from './api';
import { importBatches, MAX_IMPORT_BYTES } from './importFile';
import { LoaderCircle, X } from './icons';

export function ImportCollection({ database, close, changed, imported }: {
  database: string; close: () => void; changed: () => void;
  imported: (name: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [reading, setReading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');
  useEffect(() => { const element = dialog.current!; element.showModal(); return () => element.close(); }, []);
  function read(selected?: File) {
    setError(''); setFile(null);
    if (!selected) return;
    if (selected.size > MAX_IMPORT_BYTES) { setError('Choose a JSON file up to 250 MB.'); return; }
    setFile(selected);
    if (!name) setName(selected.name.replace(/\.(json|jsonl|ndjson)$/i, ''));
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!file) return;
    setError(''); setProgress(''); setReading(true);
    const collection = name.trim();
    let total = 0;
    // Stream a validation pass before any writes, then stream the same immutable file for import.
    try {
      for await (const batch of importBatches(file, database, collection, bytes => setProgress(`Validating file… ${Math.floor(bytes / file.size * 100)}%`))) total += batch.count;
      if (!total) throw new Error('The file must contain at least one document.');
    } catch (error) { setError((error as Error).message); setReading(false); setProgress(''); return; }
    setReading(false); setBusy(true);
    let count = 0;
    try {
      for await (const batch of importBatches(file, database, collection)) {
        setProgress(`Importing ${count.toLocaleString()} of ${total.toLocaleString()} documents…`);
        const result = await api<{ inserted: number }>('/api/data/tools/import', 'POST', { db: database, collection, documents: batch.json, create_collection: count === 0 });
        count += result.inserted;
      }
      imported(collection);
    } catch (error) { setError(`${count.toLocaleString()} documents imported in completed batches. ${error instanceof Error ? error.message : 'Import failed.'}`); }
    finally { setBusy(false); setProgress(''); changed(); }
  }
  return <dialog ref={dialog} aria-label="Import collection" className="guide-dialog collection-tool-dialog" onCancel={event => { event.preventDefault(); if (!busy && !reading) close(); }}>
    <header><h2>Import collection</h2><button className="icon-button" aria-label="Close import" disabled={busy || reading} onClick={close}><X/></button></header>
    <div className="collection-tool-body"><form className="tool-form" onSubmit={submit}>
      <p>Create a new collection in <strong>{database}</strong> from a JSON or JSON Lines file, up to 250 MB. Existing collections require a different name.</p>
      <label>Collection name<input aria-label="Import collection name" maxLength={120} value={name} onChange={event => setName(event.target.value)} disabled={busy || reading} required autoComplete="off"/></label>
      <label>Data file<input type="file" aria-label="Collection data file" accept=".json,.jsonl,.ndjson" disabled={busy || reading} required onChange={event => void read(event.target.files?.[0])}/></label>
      <p>Documents can be up to 16 MB of BSON and are imported in batches. An error stops the import; documents already inserted remain in the collection. Extended JSON preserves BSON types.</p>
      {error && <p className="tool-error" role="alert">{error}</p>}
      {(busy || reading) && <p className="loading" role="status"><LoaderCircle className="spin"/>{progress}</p>}
      <div className="tool-actions"><button type="button" className="secondary-button" disabled={busy || reading} onClick={close}>Cancel</button><button className="primary-button" disabled={busy || reading || !file || !name.trim()}>Import collection</button></div>
    </form></div>
  </dialog>;
}
