export const MAX_IMPORT_BYTES = 250 * 1024 * 1024;
const MAX_JSON_BYTES = 32 * 1024 * 1024;
const CHUNK_BYTES = 64 * 1024;
const invalid = () => new Error('Use a valid JSON array of documents, one JSON object, or JSON Lines.');

/** Decode one bounded document at a time, including tokens crossing file chunks. */
export async function* importDocuments(file: Blob, progress?: (bytes: number) => void): AsyncGenerator<Record<string, unknown>> {
  if (file.size > MAX_IMPORT_BYTES) throw new Error('Choose a JSON file up to 250 MB.');
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let mode: 'start' | 'array' | 'lines' = 'start';
  let state: 'value' | 'separator' | 'end' = 'value';
  let emptyArray = true, separated = false;
  let parts: string[] = [], documentLength = 0, depth = 0, quoted = false, escaped = false;
  for (let offset = 0; offset < file.size; offset += CHUNK_BYTES) {
    const end = Math.min(offset + CHUNK_BYTES, file.size);
    const text = decoder.decode(await file.slice(offset, end).arrayBuffer(), { stream: end < file.size });
    let partStart = depth > 0 ? 0 : -1;
    for (let index = 0; index < text.length; index++) {
      const char = text[index];
      if (depth === 0) {
        if (char === ' ' || char === '\n' || char === '\r' || char === '\t') { separated = true; continue; }
        if (mode === 'start') {
          if (char === '[') { mode = 'array'; continue; }
          mode = 'lines';
        }
        if (state === 'end') throw invalid();
        if (mode === 'array' && state === 'separator') {
          if (char === ']') { state = 'end'; continue; }
          if (char !== ',') throw invalid();
          state = 'value'; continue;
        }
        if (mode === 'array' && char === ']' && emptyArray) { state = 'end'; continue; }
        if (char !== '{' || (mode === 'lines' && state === 'separator' && !separated)) throw invalid();
        parts = []; documentLength = 1; partStart = index; depth = 1; quoted = false; escaped = false; separated = false;
        continue;
      }
      documentLength++;
      if (documentLength > MAX_JSON_BYTES) throw new Error('One document exceeds the import JSON size limit (32 MB). MongoDB documents must fit within 16 MB of BSON.');
      if (quoted) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') quoted = false;
      } else if (char === '"') quoted = true;
      else if (char === '{' || char === '[') depth++;
      else if (char === '}' || char === ']') depth--;
      if (depth === 0) {
        let parsed: Record<string, unknown>;
        parts.push(text.slice(partStart, index + 1));
        try { parsed = JSON.parse(parts.join('')); } catch { throw invalid(); }
        state = 'separator'; emptyArray = false; parts = []; partStart = -1;
        yield parsed;
      }
    }
    if (depth > 0) parts.push(text.slice(partStart));
    progress?.(end);
  }
  if (depth !== 0 || mode === 'start' || (mode === 'array' && state !== 'end')) throw invalid();
}

/** Retain only one request batch; the API's existing request limits still apply. */
export async function* importBatches(file: Blob, database: string, collection: string, progress?: (bytes: number) => void): AsyncGenerator<{ json: string; count: number }> {
  const encoder = new TextEncoder();
  const envelopeBytes = encoder.encode(JSON.stringify({ db: database, collection, documents: '', create_collection: true })).length;
  let entries: string[] = [], jsonBytes = 2, escapedBytes = 2;
  for await (const document of importDocuments(file, progress)) {
    const json = JSON.stringify(document);
    const bytes = encoder.encode(json).length;
    const wireBytes = encoder.encode(JSON.stringify(json)).length - 2;
    if (bytes + 2 > MAX_JSON_BYTES || envelopeBytes + wireBytes + 2 > 64 * 1024 * 1024) throw new Error('One document exceeds the import JSON size limit (32 MB). MongoDB documents must fit within 16 MB of BSON.');
    const comma = entries.length ? 1 : 0;
    if (entries.length === 100 || jsonBytes + bytes + comma > MAX_JSON_BYTES || envelopeBytes + escapedBytes + wireBytes + comma > 64 * 1024 * 1024) {
      yield { json: `[${entries.join(',')}]`, count: entries.length };
      entries = []; jsonBytes = 2; escapedBytes = 2;
    }
    const separator = entries.length ? 1 : 0;
    entries.push(json); jsonBytes += bytes + separator; escapedBytes += wireBytes + separator;
  }
  if (entries.length) yield { json: `[${entries.join(',')}]`, count: entries.length };
}
