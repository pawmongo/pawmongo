# Collection workspace

The collection explorer implements the controls in the supplied MongoDB workspace reference with native React components, Font Awesome icons, and the existing Tailwind Light/Dark palette. AG Grid is not required.

## Navigation and views

Collection URLs remain `/databases/<database>/collections/<collection>`. The `tab` query parameter selects `documents`, `aggregations`, `schema`, `indexes`, or `validation`, including on reload and browser Back/Forward. Document results support list cards, Extended JSON previews, and a native table. Cards show line numbers, BSON types, inline scalar editing, lazy nested details, and document deletion. Table scalar cells support double-click editing.

The document count badge and pagination range use an actual filtered `countDocuments` request. Pages support 10, 25, 50 (default), or 100 documents, up to page 200. Counts and pages are separate reads and may shift with concurrent writes.

## Query controls

- Query history retains the twelve most recently submitted filters per namespace in localStorage. Passwords and connection URIs are never saved there.
- Generate query opens a local typed query builder: choose a field, operator, and value type. It does not use an external AI service. Find or Command/Ctrl+Enter executes the generated filter.
- Explain shows the MongoDB execution plan and execution statistics.
- Reset clears filter and sort. Options provides a JSON sort editor; the existing sort dropdown and direction toggle remain available.
- Export Code generates MongoDB Shell, Node.js, or Python code for the active query. Connection credentials come from `MONGODB_URI` in generated application code.

## Data actions

The database page also offers **Import collection**: choose a new name and a JSON, JSON Lines, or NDJSON file up to 250 MB. The filename proposes the collection name. The server refuses existing names; successful imports open the new collection and refresh the sidebar. Files are read incrementally in 64 KB chunks, validated before writes, and split into bounded batches without loading the entire file into memory, with MongoDB’s 16 MB BSON limit per document. An error stops further batches and reports completed imports; existing inserted documents remain.

Add Data opens the document builder or imports JSON arrays/JSON Lines files. File imports accept up to 250 MB and stream requests of at most 100 documents and 32 MB of source JSON, including Extended JSON types. Each document is checked against MongoDB’s 16 MB BSON limit before insertion. Import requests allow up to 64 MB of JSON-encoded request data; other API requests retain their smaller budgets. Ordered imports stop at the first error and report how many documents were already inserted. Imports are not transactional.

Bulk update sets ordinary top-level fields on documents matching the active filter. Bulk delete permanently removes matching documents. Both require an explicit confirmation checkbox and support at most 1,000 matches. The server first fixes the set of IDs to prevent newly matching documents from joining that operation. Concurrent changes can still affect outcomes. Bulk writes are not transactional.

Export current page previews downloads only the bounded data already displayed, with its preview limitations clearly indicated.

## Collection tools

- **Aggregations:** execute up to 20 collection-local pipeline stages. Results are reduced on the server to at most 50 bounded documents. Cross-collection stages, writing stages, and server-side JavaScript are excluded. Export pipeline downloads MongoDB Shell code.
- **Schema:** inspect field names, BSON types, counts, and presence percentages from up to 1,000 matching documents; at most 500 field/type combinations are returned.
- **Indexes:** list actual indexes, create compound indexes (up to eight keys) with supported directions/types and an optional unique constraint, or confirm deletion of a named index. The `_id_` index is protected.
- **Validation:** read and save the MongoDB validator, validation level, and action. MongoDB enforces these rules on subsequent writes. Changes require the account's `collMod` permission.
- **View monitoring:** display current collection storage/count/index metrics from the `$collStats` aggregation stage. Metadata counts can be approximate. Refresh retrieves another snapshot.
- **Visualize Your Data:** group by a selected field and show the top twenty values in a bar chart. The chart samples up to 10,000 matching documents and can export its data.

All tools use the authenticated encrypted connection. Mutations require CSRF protection and MongoDB permissions. Queries have a five-second server execution limit and responses retain the existing size budgets. The historical read-only v1 scope does not describe this expanded collection workspace.

## Implementation and verification

`frontend/src/CollectionWorkspace.tsx` connects the UI to `/api/data/tools/<tool>`, implemented in `src/Handlers/ExplorerController.php`. Document browsing and inline editing retain the existing document APIs. The isolated backend and browser suites exercise real MongoDB reads and writes in test-only databases.

API references: [PHP collection aggregation](https://www.mongodb.com/docs/php-library/current/reference/method/MongoDBCollection-aggregate/), [index management](https://www.mongodb.com/docs/php-library/current/indexes/index-mgmt/), [collection statistics](https://www.mongodb.com/docs/manual/reference/operator/aggregation/collstats/), and [collection validation changes](https://www.mongodb.com/docs/manual/reference/command/collmod/).

Run `npm run test:import` to check the streaming parser, malformed files, chunk boundaries, bounded batches, rejection above 250 MB, and parsing a full 250 MB source. Browser checks also import a file larger than the previous 10 MB limit.

MongoDB’s per-document limit is defined in [BSON document limits](https://www.mongodb.com/docs/manual/reference/limits/#bson-documents).
