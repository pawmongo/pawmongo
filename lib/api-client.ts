import { DatabaseMeta, MongoDocument } from './mongodb-mock-data';

export interface DocumentQueryParams {
  query?: string;
  sort?: string;
  skip?: number;
  limit?: number;
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

export const apiClient = {
  // Databases & Collections
  async getDatabases(): Promise<DatabaseMeta[]> {
    const res = await fetch('/api/databases', { cache: 'no-store' });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch databases');
    return data.databases;
  },

  async createDatabase(dbName: string, collName: string): Promise<DatabaseMeta> {
    const res = await fetch('/api/databases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'createDatabase', dbName, collName })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to create database');
    return data.database;
  },

  async createCollection(dbName: string, collName: string): Promise<void> {
    const res = await fetch('/api/databases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'createCollection', dbName, collName })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to create collection');
  },

  async dropDatabase(dbName: string): Promise<void> {
    const res = await fetch(`/api/databases?dbName=${encodeURIComponent(dbName)}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to drop database');
  },

  async dropCollection(dbName: string, collName: string): Promise<void> {
    const res = await fetch(`/api/databases?dbName=${encodeURIComponent(dbName)}&collName=${encodeURIComponent(collName)}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to drop collection');
  },

  // Documents
  async getDocuments(
    dbName: string,
    collName: string,
    params: DocumentQueryParams = {}
  ): Promise<{ documents: MongoDocument[]; totalCount: number }> {
    const searchParams = new URLSearchParams();
    if (params.query) searchParams.set('query', params.query);
    if (params.sort) searchParams.set('sort', params.sort);
    if (params.skip !== undefined) searchParams.set('skip', String(params.skip));
    if (params.limit !== undefined) searchParams.set('limit', String(params.limit));

    const url = `/api/databases/${encodeURIComponent(dbName)}/collections/${encodeURIComponent(collName)}/documents?${searchParams.toString()}`;
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch documents');
    return { documents: data.documents, totalCount: data.totalCount };
  },

  async createDocument(dbName: string, collName: string, document: MongoDocument): Promise<MongoDocument> {
    const url = `/api/databases/${encodeURIComponent(dbName)}/collections/${encodeURIComponent(collName)}/documents`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to create document');
    return data.document;
  },

  async bulkInsertDocuments(dbName: string, collName: string, documents: MongoDocument[]): Promise<MongoDocument[]> {
    const url = `/api/databases/${encodeURIComponent(dbName)}/collections/${encodeURIComponent(collName)}/documents`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documents })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to bulk insert documents');
    return data.documents;
  },

  async updateDocument(dbName: string, collName: string, id: string, document: MongoDocument): Promise<MongoDocument> {
    const url = `/api/databases/${encodeURIComponent(dbName)}/collections/${encodeURIComponent(collName)}/documents`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, document })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to update document');
    return data.document;
  },

  async deleteDocument(dbName: string, collName: string, id: string): Promise<boolean> {
    const url = `/api/databases/${encodeURIComponent(dbName)}/collections/${encodeURIComponent(collName)}/documents?id=${encodeURIComponent(id)}`;
    const res = await fetch(url, { method: 'DELETE' });
    const data = await res.json();
    return data.success;
  },

  async bulkDeleteDocuments(dbName: string, collName: string, ids: string[]): Promise<number> {
    const url = `/api/databases/${encodeURIComponent(dbName)}/collections/${encodeURIComponent(collName)}/documents`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids })
    });
    const data = await res.json();
    return data.deletedCount || 0;
  },

  // Indexes
  async getIndexes(dbName: string, collName: string): Promise<any[]> {
    const url = `/api/databases/${encodeURIComponent(dbName)}/collections/${encodeURIComponent(collName)}/indexes`;
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch indexes');
    return data.indexes;
  },

  async createIndex(dbName: string, collName: string, indexData: IndexData): Promise<any> {
    const url = `/api/databases/${encodeURIComponent(dbName)}/collections/${encodeURIComponent(collName)}/indexes`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(indexData)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to create index');
    return data.index;
  },

  async dropIndex(dbName: string, collName: string, indexName: string): Promise<boolean> {
    const url = `/api/databases/${encodeURIComponent(dbName)}/collections/${encodeURIComponent(collName)}/indexes?name=${encodeURIComponent(indexName)}`;
    const res = await fetch(url, { method: 'DELETE' });
    const data = await res.json();
    return data.success;
  },

  // Columns & Schema
  async getCollectionColumns(
    dbName: string,
    collName: string
  ): Promise<Array<{ field: string; type: string; count: number; presencePct: number }>> {
    const url = `/api/databases/${encodeURIComponent(dbName)}/collections/${encodeURIComponent(collName)}/columns`;
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch collection columns');
    return data.columns;
  },

  // Server Stats
  async getServerOverview(): Promise<any> {
    const res = await fetch('/api/server/overview', { cache: 'no-store' });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch server overview');
    return data.overview;
  },

  async getServerMonitoring(): Promise<any> {
    const res = await fetch('/api/server/monitoring', { cache: 'no-store' });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch server monitoring');
    return data.monitoring;
  }
};
