import { mongoIdentity } from "./document-identity";
import { apiClient } from "./api-client";
export function exportDocument(doc: Record<string, any>) {
  const copy = { ...doc };
  const identity = (doc as { [mongoIdentity]?: string })[mongoIdentity];
  if (identity) copy._id = identity;
  if (typeof copy._id === "string" && copy._id.startsWith("oid:"))
    copy._id = { $oid: copy._id.slice(4) };
  else if (typeof copy._id === "string" && copy._id.startsWith("ejson:"))
    copy._id = JSON.parse(copy._id.slice(6));
  else if (typeof copy._id === "string" && copy._id.startsWith("str:"))
    copy._id = copy._id.slice(4);
  return copy;
}
export async function databaseExport(
  name: string,
  collections: Array<{ name: string }>,
) {
  return {
    database: name,
    exportedAt: new Date().toISOString(),
    collections: await Promise.all(
      collections.map(async (c) => ({
        name: c.name,
        documents: (await apiClient.allDocuments(name, c.name)).map(
          exportDocument,
        ),
        indexes: await apiClient.getIndexes(name, c.name),
      })),
    ),
  };
}
export function collectionText(docs: Record<string, any>[], format: string) {
  const documents = docs.map(exportDocument);
  if (format === "ndjson")
    return documents.map((d) => JSON.stringify(d)).join("\n");
  if (format === "csv") {
    const fields = Array.from(
      new Set(documents.flatMap((d) => Object.keys(d))),
    );
    const cell = (v: any) =>
      '"' +
      (typeof v === "object" ? JSON.stringify(v) : String(v ?? "")).replaceAll(
        '"',
        '""',
      ) +
      '"';
    return [
      fields.map(cell).join(","),
      ...documents.map((d) => fields.map((f) => cell(d[f])).join(",")),
    ].join("\n");
  }
  return JSON.stringify(documents, null, 2);
}
export function download(
  content: BlobPart,
  filename: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
