import { displayDocument, documentSelector } from "./document-identity";
import { DatabaseMeta, MongoDocument } from "./mongodb-mock-data";

export interface DocumentQueryParams {
  query?: string;
  sort?: string;
  skip?: number;
  limit?: number;
  project?: string;
  maxTimeMS?: number;
  collation?: string;
}

export interface IndexData {
  name?: string;
  keys: Record<string, string | number>;
  unique?: boolean;
  background?: boolean;
  sparse?: boolean;
  ttlSeconds?: number;
  partialFilter?: string;
}

async function responseJson(res: Response) {
  const data = await res.json().catch(() => {
    throw new Error("API returned an invalid response.");
  });
  if (!res.ok || !data.success)
    throw Object.assign(new Error(data.error || "Database request failed."), { insertedCount: data.insertedCount });
  return data;
}

export const apiClient = {
  async connection(method = "GET"): Promise<{ connected: boolean }> {
    return responseJson(
      await fetch("/api/connection", { method, cache: "no-store" }),
    );
  },
  async collectionTool(
    db: string,
    coll: string,
    body?: Record<string, unknown>,
  ) {
    return responseJson(
      await fetch(
        `/api/databases/${encodeURIComponent(db)}/collections/${encodeURIComponent(coll)}/tools`,
        body
          ? {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            }
          : { cache: "no-store" },
      ),
    );
  },
  async bulkUpdate(
    db: string,
    coll: string,
    query: string,
    update: Record<string, unknown>,
  ) {
    return responseJson(
      await fetch(
        `/api/databases/${encodeURIComponent(db)}/collections/${encodeURIComponent(coll)}/documents`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, update }),
        },
      ),
    );
  },
  async deleteMatching(db: string, coll: string, query: string) {
    return responseJson(
      await fetch(
        `/api/databases/${encodeURIComponent(db)}/collections/${encodeURIComponent(coll)}/documents`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        },
      ),
    );
  },
  async allDocuments(db: string, coll: string): Promise<MongoDocument[]> {
    const documents: MongoDocument[] = [];
    let total = Infinity;
    while (documents.length < total) {
      const page = await this.getDocuments(db, coll, {
        skip: documents.length,
        limit: 1000,
        sort: "{_id:1}",
      });
      documents.push(...page.documents);
      total = page.totalCount;
      if (!page.documents.length) break;
    }
    return documents;
  },
  // Databases & Collections
  async getDatabases(): Promise<DatabaseMeta[]> {
    const res = await fetch("/api/databases", { cache: "no-store" });
    const data = await responseJson(res);
    if (!data.success)
      throw new Error(data.error || "Failed to fetch databases");
    return data.databases;
  },

  async createDatabase(
    dbName: string,
    collName: string,
    options: Record<string, unknown> = {},
  ): Promise<DatabaseMeta> {
    const res = await fetch("/api/databases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "createDatabase",
        dbName,
        collName,
        options,
      }),
    });
    const data = await responseJson(res);
    if (!data.success)
      throw new Error(data.error || "Failed to create database");
    return data.database;
  },

  async createCollection(dbName: string, collName: string): Promise<void> {
    const res = await fetch("/api/databases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "createCollection", dbName, collName }),
    });
    const data = await responseJson(res);
    if (!data.success)
      throw new Error(data.error || "Failed to create collection");
  },

  async dropDatabase(dbName: string): Promise<void> {
    const res = await fetch(
      `/api/databases?dbName=${encodeURIComponent(dbName)}`,
      {
        method: "DELETE",
      },
    );
    const data = await responseJson(res);
    if (!data.success) throw new Error(data.error || "Failed to drop database");
  },

  async dropCollection(dbName: string, collName: string): Promise<void> {
    const res = await fetch(
      `/api/databases?dbName=${encodeURIComponent(dbName)}&collName=${encodeURIComponent(collName)}`,
      {
        method: "DELETE",
      },
    );
    const data = await responseJson(res);
    if (!data.success)
      throw new Error(data.error || "Failed to drop collection");
  },

  // Documents
  async getDocuments(
    dbName: string,
    collName: string,
    params: DocumentQueryParams = {},
  ): Promise<{ documents: MongoDocument[]; totalCount: number }> {
    const searchParams = new URLSearchParams();
    if (params.project) searchParams.set("project", params.project);
    if (params.maxTimeMS !== undefined)
      searchParams.set("maxTimeMS", String(params.maxTimeMS));
    if (params.collation) searchParams.set("collation", params.collation);
    if (params.query) searchParams.set("query", params.query);
    if (params.sort) searchParams.set("sort", params.sort);
    if (params.skip !== undefined)
      searchParams.set("skip", String(params.skip));
    if (params.limit !== undefined)
      searchParams.set("limit", String(params.limit));

    const url = `/api/databases/${encodeURIComponent(dbName)}/collections/${encodeURIComponent(collName)}/documents?${searchParams.toString()}`;
    const res = await fetch(url, { cache: "no-store" });
    const data = await responseJson(res);
    if (!data.success)
      throw new Error(data.error || "Failed to fetch documents");
    return {
      documents: data.documents.map((doc: MongoDocument) =>
        displayDocument(dbName, collName, doc),
      ),
      totalCount: data.totalCount,
    };
  },

  async createDocument(
    dbName: string,
    collName: string,
    document: MongoDocument,
  ): Promise<MongoDocument> {
    const url = `/api/databases/${encodeURIComponent(dbName)}/collections/${encodeURIComponent(collName)}/documents`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ document }),
    });
    const data = await responseJson(res);
    if (!data.success)
      throw new Error(data.error || "Failed to create document");
    return displayDocument(dbName, collName, data.document);
  },

  async bulkInsertDocuments(
    dbName: string,
    collName: string,
    documents: Record<string, unknown>[],
  ): Promise<MongoDocument[]> {
    const url = `/api/databases/${encodeURIComponent(dbName)}/collections/${encodeURIComponent(collName)}/documents`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documents }),
    });
    const data = await responseJson(res);
    if (!data.success)
      throw new Error(data.error || "Failed to bulk insert documents");
    return data.documents.map((doc: MongoDocument) =>
      displayDocument(dbName, collName, doc),
    );
  },

  async updateDocument(
    dbName: string,
    collName: string,
    id: string,
    document: MongoDocument,
  ): Promise<MongoDocument> {
    const url = `/api/databases/${encodeURIComponent(dbName)}/collections/${encodeURIComponent(collName)}/documents`;
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: documentSelector(dbName, collName, id, document),
        document,
      }),
    });
    const data = await responseJson(res);
    if (!data.success)
      throw new Error(data.error || "Failed to update document");
    return displayDocument(dbName, collName, data.document);
  },

  async deleteDocument(
    dbName: string,
    collName: string,
    id: string,
  ): Promise<boolean> {
    const url = `/api/databases/${encodeURIComponent(dbName)}/collections/${encodeURIComponent(collName)}/documents?id=${encodeURIComponent(documentSelector(dbName, collName, id))}`;
    const res = await fetch(url, { method: "DELETE" });
    const data = await responseJson(res);
    return data.success;
  },

  async bulkDeleteDocuments(
    dbName: string,
    collName: string,
    ids: string[],
  ): Promise<number> {
    const url = `/api/databases/${encodeURIComponent(dbName)}/collections/${encodeURIComponent(collName)}/documents`;
    const res = await fetch(url, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ids: ids.map((id) => documentSelector(dbName, collName, id)),
      }),
    });
    const data = await responseJson(res);
    return data.deletedCount || 0;
  },

  // Indexes
  async getIndexes(dbName: string, collName: string): Promise<any[]> {
    const url = `/api/databases/${encodeURIComponent(dbName)}/collections/${encodeURIComponent(collName)}/indexes`;
    const res = await fetch(url, { cache: "no-store" });
    const data = await responseJson(res);
    if (!data.success) throw new Error(data.error || "Failed to fetch indexes");
    return data.indexes;
  },

  async createIndex(
    dbName: string,
    collName: string,
    indexData: IndexData,
  ): Promise<any> {
    const url = `/api/databases/${encodeURIComponent(dbName)}/collections/${encodeURIComponent(collName)}/indexes`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(indexData),
    });
    const data = await responseJson(res);
    if (!data.success) throw new Error(data.error || "Failed to create index");
    return data.index;
  },

  async dropIndex(
    dbName: string,
    collName: string,
    indexName: string,
  ): Promise<boolean> {
    const url = `/api/databases/${encodeURIComponent(dbName)}/collections/${encodeURIComponent(collName)}/indexes?name=${encodeURIComponent(indexName)}`;
    const res = await fetch(url, { method: "DELETE" });
    const data = await responseJson(res);
    return data.success;
  },

  // Columns & Schema
  async getCollectionColumns(
    dbName: string,
    collName: string,
  ): Promise<
    Array<{ field: string; type: string; count: number; presencePct: number }>
  > {
    const url = `/api/databases/${encodeURIComponent(dbName)}/collections/${encodeURIComponent(collName)}/columns`;
    const res = await fetch(url, { cache: "no-store" });
    const data = await responseJson(res);
    if (!data.success)
      throw new Error(data.error || "Failed to fetch collection columns");
    return data.columns;
  },

  // Server Stats
  async getServerOverview(): Promise<any> {
    const res = await fetch("/api/server/overview", { cache: "no-store" });
    const data = await responseJson(res);
    if (!data.success)
      throw new Error(data.error || "Failed to fetch server overview");
    return data.overview;
  },

  async getServerMonitoring(): Promise<any> {
    const res = await fetch("/api/server/monitoring", { cache: "no-store" });
    const data = await responseJson(res);
    if (!data.success)
      throw new Error(data.error || "Failed to fetch server monitoring");
    return data.monitoring;
  },
};
