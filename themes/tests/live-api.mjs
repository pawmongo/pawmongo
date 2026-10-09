import assert from "node:assert/strict";
const origin = process.env.TEST_API_URL || "http://127.0.0.1:3000";
const db = process.env.TEST_DATABASE || "modvell_test";
const coll = `pawmongo_api_audit_${Date.now()}`;
const root = `/api/databases/${encodeURIComponent(db)}/collections/${coll}`;
let checks = 0;
async function request(path, method = "GET", body, headers = {}) {
  const res = await fetch(origin + path, {
    method,
    headers: {
      Origin: origin,
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  return { res, data };
}
async function ok(path, method, body) {
  const { res, data } = await request(path, method, body);
  assert.equal(res.ok, true, JSON.stringify(data));
  assert.equal(data.success, true);
  checks++;
  return data;
}
try {
  const connection = await ok('/api/connection');
  assert.equal(connection.connected, true);
  await ok("/api/databases", "POST", {
    action: "createCollection",
    dbName: db,
    collName: coll,
  });
  const empty = await ok(root + "/documents");
  assert.equal(empty.totalCount, 0);
  const inserted = await ok(root + "/documents", "POST", {
    document: {
      name: "live audit",
      score: 1,
      nested: { city: "Paris" },
      date: { $date: "2026-10-08T00:00:00Z" },
    },
  });
  assert.ok(inserted.document._id.startsWith("oid:"));
  await ok(root + "/documents", "PUT", {
    id: inserted.document._id,
    document: { ...inserted.document, score: 2 },
  });
  const persisted = await ok(
    root + "/documents?query=" + encodeURIComponent("{score:{$gte:2}}"),
  );
  assert.equal(persisted.totalCount, 1);
  assert.equal(persisted.documents[0].score, 2);
  const stringId = "a".repeat(24);
  await ok(root + "/documents", "POST", {
    document: { _id: stringId, name: "string id", score: 3 },
  });
  await ok(root + "/documents", "PUT", {
    id: stringId,
    document: { _id: stringId, name: "string id", score: 4 },
  });
  const batch = await ok(root + "/documents", "POST", {
    documents: [
      { name: "bulk a", score: 5 },
      { name: "bulk b", score: 6 },
    ],
  });
  assert.equal(batch.count, 2);
  const page = await ok(
    root +
      "/documents?sort=" +
      encodeURIComponent("{score:-1}") +
      "&skip=1&limit=1",
  );
  assert.equal(page.totalCount, 4);
  assert.equal(page.documents.length, 1);
  assert.equal(page.documents[0].score, 5);
  const columns = await ok(root + "/columns");
  assert.ok(columns.columns.some((c) => c.field === "nested.city"));
  await ok(root + "/indexes", "POST", {
    keys: { score: 1 },
    name: "score_audit",
  });
  const indexes = await ok(root + "/indexes");
  assert.ok(indexes.indexes.some((i) => i.name === "score_audit"));
  assert.deepEqual(indexes.indexes.find(i => i.name === 'score_audit').fields, ['score']);
  await ok(root + "/indexes?name=score_audit", "DELETE");
  const textIndex = await ok(root + '/indexes', 'POST', {keys: {name: 'text'}, name: 'name_text_audit'});
  assert.ok(textIndex.index.fields.includes('name'), 'Text index reports its actual document fields');
  await ok(root + '/indexes?name=name_text_audit', 'DELETE');
  const aggregated = await ok(root + "/tools", "POST", {
    action: "aggregate",
    pipeline: "[{$group:{_id:null,total:{$sum:1}}}]",
  });
  assert.equal(aggregated.documents[0].total, 4);
  const explain = await ok(root + "/tools", "POST", {
    action: "explain",
    query: "{score:{$gte:1}}",
  });
  assert.equal(explain.explain.executionStats.nReturned, 4);
  const saveValidation = await request(root + "/tools", "POST", {
    action: "validation",
    validator:
      '{$jsonSchema:{bsonType:"object",required:["name"],properties:{name:{bsonType:"string"}}}}',
    validationLevel: "strict",
    validationAction: "error",
  });
  if (saveValidation.res.status === 403) {
    assert.match(saveValidation.data.error, /permit/);
    checks++;
    console.log(
      "Validation changes correctly denied by current MongoDB permissions.",
    );
  } else {
    assert.equal(
      saveValidation.res.ok,
      true,
      JSON.stringify(saveValidation.data),
    );
    checks++;
    const validation = await ok(root + "/tools");
    assert.deepEqual(validation.validation.validator.$jsonSchema.required, [
      "name",
    ]);
    const invalid = await request(root + "/documents", "POST", {
      document: { score: 99 },
    });
    assert.equal(invalid.res.ok, false);
    checks++;
  }
  await ok(root + "/documents", "PATCH", {
    query: "{score:{$gte:5}}",
    update: { $set: { checked: true } },
  });
  const checked = await ok(
    root + "/documents?query=" + encodeURIComponent("{checked:true}"),
  );
  assert.equal(checked.totalCount, 2);
  await ok(root + "/documents", "DELETE", { query: "{checked:true}" });
  await ok(
    root + "/documents?id=" + encodeURIComponent(inserted.document._id),
    "DELETE",
  );
  const remaining = await ok(root + "/documents");
  assert.equal(remaining.totalCount, 1);
  assert.equal(remaining.documents[0]._id, "str:" + stringId);
  const bad = await request(root + "/documents?query=invalid");
  assert.equal(bad.res.status, 400);
  checks++;
  const system = await request("/api/databases?dbName=admin", "DELETE");
  assert.equal(system.res.status, 403);
  checks++;
  const cross = await request(
    root + "/documents",
    "POST",
    { document: { name: "blocked" } },
    { Origin: "https://example.com" },
  );
  assert.equal(cross.res.status, 403);
  checks++;
  const blockedPipeline = await request(root + "/tools", "POST", {
    action: "aggregate",
    pipeline: '[{$out:"danger"}]',
  });
  assert.equal(blockedPipeline.res.status, 400);
  checks++;
  const disconnect = await ok("/api/connection", "DELETE");
  const disconnected = await request(root + "/documents", "GET", null, {
    Cookie: "pawmongo_disconnected=1",
  });
  assert.equal(disconnected.res.status, 409);
  checks++;
  await ok("/api/connection", "POST");
  const overview = await ok('/api/server/overview');
  assert.equal(typeof overview.overview.version, 'string');
  const monitoring = await ok('/api/server/monitoring');
  assert.equal(typeof monitoring.monitoring.metricsAvailable, 'boolean');
  const invalidProjection = await request(root + '/documents?project=' + encodeURIComponent('{_id:0}'));
  assert.equal(invalidProjection.res.status, 400); checks++;
  const systemCollection = await request(`/api/databases/${db}/collections/system.users/documents`);
  assert.equal(systemCollection.res.status, 403); checks++;
  const oversized = await request(root + '/documents', 'POST', {document: {name: 'oversized', text: 'x'.repeat(16 * 1024 * 1024)}});
  assert.equal(oversized.res.status, 413); checks++;
  const duplicate = await request(root + '/documents', 'POST', {documents: [{_id:'partial-a', name:'first'}, {_id:stringId, name:'duplicate'}]});
  assert.equal(duplicate.res.status, 409);
  assert.equal(duplicate.data.insertedCount, 1); checks++;
  const typedId = {$numberLong:'9223372036854775807'};
  const typed = await ok(root + '/documents', 'POST', {document:{_id:typedId,name:'int64'}});
  assert.deepEqual(JSON.parse(typed.document._id.slice(6)), typedId);
  await ok(root + '/documents', 'PUT', {id:typed.document._id, document:{name:'int64 updated', empty:{}, list:[]}});
  const typedQuery = await ok(root + '/documents?query=' + encodeURIComponent(JSON.stringify({_id:typedId})));
  assert.deepEqual(typedQuery.documents[0].empty, {});
  assert.deepEqual(typedQuery.documents[0].list, []);
  await ok(root + '/documents?id=' + encodeURIComponent(typed.document._id), 'DELETE');
  console.log(
    `Passed ${checks} live API checks. Persistence, typed IDs, queries, CRUD, bulk operations, indexes, aggregation, validation permissions, explain, and access boundaries verified.`,
  );
} finally {
  const { res, data } = await request(
    `/api/databases?dbName=${db}&collName=${coll}`,
    "DELETE",
  );
  if (!res.ok)
    throw new Error(
      "Temporary test collection cleanup failed: " + JSON.stringify(data),
    );
  console.log("Temporary audit collection removed.");
}
