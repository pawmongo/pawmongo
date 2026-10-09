import type { MongoDocument } from "./mongodb-mock-data";
export const mongoIdentity = Symbol("mongoIdentity");
type Identified = MongoDocument & { [mongoIdentity]?: string };
const identities = new Map<string, string>();
const key = (db: string, coll: string, id: string) =>
  JSON.stringify([db, coll, id]);
export function displayDocument(
  db: string,
  coll: string,
  document: MongoDocument,
): Identified {
  const token = document._id;
  if (typeof token !== "string") return document;
  const id = token.startsWith("oid:")
    ? token.slice(4)
    : token.startsWith("str:")
      ? token.slice(4)
      : token.startsWith("ejson:")
        ? token.slice(6)
        : token;
  identities.set(key(db, coll, id), token);
  return { ...document, _id: id, [mongoIdentity]: token };
}
export function documentSelector(
  db: string,
  coll: string,
  id: string,
  document?: MongoDocument,
) {
  return (
    (document as Identified | undefined)?.[mongoIdentity] ||
    identities.get(key(db, coll, id)) ||
    id
  );
}
