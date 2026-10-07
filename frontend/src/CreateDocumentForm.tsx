import { useState, type FormEvent } from 'react';
import { Plus, Trash2 } from './icons';
import { api } from './api';

type Field = { name: string; type: string; value: string };
export function CreateDocumentForm({ target, onSaved, onCancel, onBusy }: {
  target: { db: string; collection: string }; onSaved: () => void; onCancel: () => void; onBusy: (busy: boolean) => void;
}) {
  const [fields, setFields] = useState<Field[]>([{ name: '', type: 'text', value: '' }]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  function update(index: number, patch: Partial<Field>) {
    setFields(previous => previous.map((field, i) => i === index ? { ...field, ...patch } : field));
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setError('');
    try {
      const document = Object.create(null);
      for (const field of fields) {
        const name = field.name.trim();
        if (!name || /[.$\x00]/.test(name)) throw new Error('Use field names without dots or dollar signs.');
        if (Object.hasOwn(document, name)) throw new Error(`Field “${name}” appears more than once.`);
        let value: unknown = field.value;
        if (field.type === 'number') {
          value = Number(field.value);
          if (!field.value.trim() || !Number.isFinite(value)) throw new Error(`Enter a valid number for “${name}”.`);
        } else if (field.type === 'boolean') value = field.value === 'true';
        else if (field.type === 'null') value = null;
        else if (field.type === 'json') {
          try { value = JSON.parse(field.value); } catch { throw new Error(`Enter valid JSON for “${name}”.`); }
        }
        document[name] = value;
      }
      const json = JSON.stringify(document);
      if (new TextEncoder().encode(json).length > 12000) throw new Error('Keep the document under 12 KB.');
      setBusy(true); onBusy(true);
      await api('/api/data/documents', 'POST', { ...target, document: json });
      onSaved();
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not create document.'); }
    finally { setBusy(false); onBusy(false); }
  }
  return <form className="create-collection-form" onSubmit={save}>
    <p>Add a document to <strong>{target.db}.{target.collection}</strong>. MongoDB generates an ID automatically unless you add an <code>_id</code> field.</p>
    <div className="document-create-fields">{fields.map((field, index) => <div className="document-create-field" key={index}>
      <label>Field name<input aria-label={`Field name ${index + 1}`} placeholder="e.g. name" value={field.name} onChange={event => update(index, { name: event.target.value })} disabled={busy} required/></label>
      <label>Type<select aria-label={`Field type ${index + 1}`} value={field.type} onChange={event => update(index, { type: event.target.value, value: event.target.value === 'boolean' ? 'true' : '' })} disabled={busy}><option value="text">Text</option><option value="number">Number</option><option value="boolean">Yes / No</option><option value="null">Empty (null)</option><option value="json">Object / Array / JSON</option></select></label>
      <label>Value{field.type === 'boolean' ? <select aria-label={`Field value ${index + 1}`} value={field.value} onChange={event => update(index, { value: event.target.value })} disabled={busy}><option value="true">Yes</option><option value="false">No</option></select> : field.type === 'json' ? <textarea aria-label={`Field value ${index + 1}`} value={field.value} onChange={event => update(index, { value: event.target.value })} disabled={busy} rows={2} required/> : <input aria-label={`Field value ${index + 1}`} type={field.type === 'number' ? 'number' : 'text'} step="any" value={field.type === 'null' ? 'null' : field.value} onChange={event => update(index, { value: event.target.value })} disabled={busy || field.type === 'null'} required={field.type === 'number'}/>}</label>
      <button type="button" className="icon-button" aria-label={`Remove field ${index + 1}`} disabled={busy || fields.length === 1} onClick={() => setFields(previous => previous.filter((_, i) => i !== index))}><Trash2 size={15}/></button>
    </div>)}</div>
    <button type="button" className="text-button" disabled={busy} onClick={() => setFields(previous => [...previous, { name: '', type: 'text', value: '' }])}><Plus size={15}/>Add field</button>
    {error && <p className="error-message" role="alert">{error}</p>}
    <div className="create-actions"><button type="button" className="secondary-button" disabled={busy} onClick={onCancel}>Cancel</button><button className="primary-button" disabled={busy}>{busy ? 'Creating…' : 'Create document'}</button></div>
  </form>;
}
