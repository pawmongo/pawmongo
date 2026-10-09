type RecordData = Record<string, unknown>;

export function parseDatabaseImport(content: string, filename: string): [string, RecordData[]][] {
  const text = content.replace(/^\uFEFF/, '').trim();
  if (!text) throw new Error('The selected file is empty. Choose a collection or database export containing records.');
  const collection = filename.replace(/\.(json|jsonl|ndjson)$/i, '');
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    const lines = text.split(/\r?\n/);
    if (lines.filter(line => line.trim()).length < 2)
      throw new Error('This is not a valid database JSON file. No records were imported.');
    parsed = lines.flatMap((line, index) => {
      if (!line.trim()) return [];
      try { return [JSON.parse(line)]; }
      catch { throw new Error(`This is not a valid database JSON file. Invalid JSON on line ${index + 1}. No records were imported.`); }
    });
  }
  const record = (value: unknown): value is RecordData => !!value && typeof value === 'object' && !Array.isArray(value);
  let entries: [string, unknown][];
  if (Array.isArray(parsed)) entries = [[collection, parsed]];
  else if (record(parsed) && Array.isArray(parsed.collections)) {
    entries = parsed.collections.map(value => {
      if (!record(value) || typeof value.name !== 'string') throw new Error('This is not a valid database JSON file. The file contains an invalid collection entry.');
      return [value.name, value.documents];
    });
  } else if (record(parsed) && Object.values(parsed).length && Object.values(parsed).every(Array.isArray)) {
    entries = Object.entries(parsed);
  } else if (record(parsed)) entries = [[collection, [parsed]]];
  else throw new Error('This is not a valid database JSON file. No records were imported.');
  if (!entries.length || !entries.every(([name, docs]) => name.trim() && Array.isArray(docs) && docs.every(record)))
    throw new Error('This is not a valid database JSON file. Each collection must contain JSON objects. No records were imported.');
  return entries as [string, RecordData[]][];
}
