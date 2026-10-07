import assert from 'node:assert/strict';
import { importDocuments, importBatches, MAX_IMPORT_BYTES } from '../frontend/src/importFile.ts';

async function records(source) {
  const result = [];
  for await (const document of importDocuments(new Blob([source]))) result.push(document);
  return result;
}
assert.deepEqual(await records('[{"text":"braces } [ and \\\"quotes\\\"","nested":[{},[1]]},{"n":2}]'), [{ text: 'braces } [ and "quotes"', nested: [{}, [1]] }, { n: 2 }]);
assert.deepEqual(await records('\ufeff{"name":"é😀"}\r\n{"n":2}\n'), [{ name: 'é😀' }, { n: 2 }]);
for (const invalid of ['[{},]', '[{}', '{}{}', '[1]', '{"x":}', '[{}]oops', '[{},,{}]', '']) {
  await assert.rejects(() => records(invalid));
}
const boundary = ' '.repeat(65530) + '[{"name":"é😀","escape":"\\\\\\\""}]';
assert.deepEqual(await records(boundary), [{ name: 'é😀', escape: '\\"' }]);
const largeBatches = [];
for await (const batch of importBatches(new Blob([JSON.stringify([{ text: 'x'.repeat(1024 * 1024) }])]), 'test', 'import')) largeBatches.push(batch);
assert.equal(JSON.parse(largeBatches[0].json)[0].text.length, 1024 * 1024);
const batches = [];
for await (const batch of importBatches(new Blob([JSON.stringify(Array.from({ length: 201 }, (_, i) => ({ i, padding: 'x'.repeat(120) })))]), 'test', 'import')) batches.push(batch);
assert.equal(batches.reduce((count, batch) => count + batch.count, 0), 201);
assert.ok(batches.every(batch => batch.count <= 100 && Buffer.byteLength(batch.json) <= 32 * 1024 * 1024));
await assert.rejects(async () => { for await (const batch of importBatches(new Blob([JSON.stringify([{ text: 'x'.repeat(32 * 1024 * 1024 + 1) }])]), 'test', 'import')) {} }, /size limit/);
await assert.rejects(async () => { for await (const document of importDocuments({ size: MAX_IMPORT_BYTES + 1 })) {} }, /250 MB/);
// Exercise an entire 250 MB source without allocating a 250 MB test buffer.
let slices = 0;
const endDocument = '[{"fullSize":true}]';
const fullSizeFile = {
  size: MAX_IMPORT_BYTES,
  slice(start, end) {
    slices++;
    assert.ok(end - start <= 65536, 'file reads stay bounded');
    return new Blob([end === MAX_IMPORT_BYTES ? ' '.repeat(end - start - endDocument.length) + endDocument : ' '.repeat(end - start)]);
  },
};
const full = [];
for await (const document of importDocuments(fullSizeFile)) full.push(document);
assert.deepEqual(full, [{ fullSize: true }]);
assert.equal(slices, MAX_IMPORT_BYTES / 65536);
console.log('PASS: import parser, batch bounds, chunk boundaries, and full 250 MB file limit.');
