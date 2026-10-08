import { DATABASES as INITIAL_DBS, INITIAL_COMPANIES, MongoDocument, DatabaseMeta } from './mongodb-mock-data';

// Singleton in-memory state store for API routes
class MockDatabaseStore {
  private databases: DatabaseMeta[];
  private documentsMap: Map<string, MongoDocument[]>;
  private indexesMap: Map<string, Array<{
    name: string;
    keys: Record<string, string | number>;
    size: string;
    unique: boolean;
    sparse?: boolean;
    background?: boolean;
    ttlSeconds?: number;
    partialFilter?: string;
    usage: number;
  }>>;

  constructor() {
    this.databases = JSON.parse(JSON.stringify(INITIAL_DBS));
    this.documentsMap = new Map();
    this.indexesMap = new Map();

    // Initialize sample_training.companies
    const companiesCollKey = 'sample_training:companies';
    this.documentsMap.set(companiesCollKey, JSON.parse(JSON.stringify(INITIAL_COMPANIES)));

    // Initialize default indexes for companies
    this.indexesMap.set(companiesCollKey, [
      {
        name: '_id_',
        keys: { _id: 1 },
        size: '28 KB',
        unique: true,
        background: false,
        usage: 1420
      },
      {
        name: 'name_1',
        keys: { name: 1 },
        size: '16 KB',
        unique: false,
        background: true,
        usage: 320
      },
      {
        name: 'category_code_1_founded_year_-1',
        keys: { category_code: 1, founded_year: -1 },
        size: '22 KB',
        unique: false,
        background: true,
        usage: 185
      }
    ]);

    // Seed mock documents for other collections if accessed
    this.seedOtherCollections();
  }

  private seedOtherCollections() {
    // sample_training:grades
    this.documentsMap.set('sample_training:grades', [
      { _id: '50b51f73b8a436798f0ced85', student_id: 101, class_id: 339, scores: [{ type: 'exam', score: 88.5 }, { type: 'quiz', score: 92.0 }] },
      { _id: '50b51f73b8a436798f0ced86', student_id: 102, class_id: 339, scores: [{ type: 'exam', score: 74.2 }, { type: 'quiz', score: 81.0 }] },
      { _id: '50b51f73b8a436798f0ced87', student_id: 103, class_id: 339, scores: [{ type: 'exam', score: 95.0 }, { type: 'quiz', score: 98.4 }] }
    ]);

    // sample_mflix:movies
    this.documentsMap.set('sample_mflix:movies', [
      { _id: '573a1390f29313caabcd42e8', title: 'The Great Train Robbery', year: 1903, rated: 'TV-G', runtime: 11, genres: ['Short', 'Western'], imdb: { rating: 7.4, votes: 9847 } },
      { _id: '573a1390f29313caabcd446f', title: 'A Corner in Wheat', year: 1909, rated: 'NOT RATED', runtime: 14, genres: ['Short', 'Drama'], imdb: { rating: 6.6, votes: 1375 } }
    ]);

    // sample_analytics:customers
    this.documentsMap.set('sample_analytics:customers', [
      { _id: '5ca4bbcea2dd94ee5813238c', username: 'fmiller', name: 'Frank Miller', address: '17135 Davis Plain Suite 500', email: 'fmiller@gmail.com', accounts: [116508, 775260] },
      { _id: '5ca4bbcea2dd94ee5813238d', username: 'mrodriguez', name: 'Maria Rodriguez', address: '8872 Michael Ports Apt. 248', email: 'mrodriguez@yahoo.com', accounts: [998124] }
    ]);
  }

  public getDatabases(): DatabaseMeta[] {
    return this.databases;
  }

  public getDatabase(dbName: string): DatabaseMeta | undefined {
    return this.databases.find((d) => d.name === dbName);
  }

  public createDatabase(dbName: string, collName: string): DatabaseMeta {
    const existing = this.databases.find((d) => d.name === dbName);
    if (existing) {
      if (!existing.collections.some((c) => c.name === collName)) {
        existing.collections.push({
          name: collName,
          count: 0,
          sizeBytes: 0,
          avgObjSize: 0,
          indexes: 1
        });
      }
      return existing;
    }

    const newDb: DatabaseMeta = {
      name: dbName,
      collections: [
        {
          name: collName,
          count: 0,
          sizeBytes: 0,
          avgObjSize: 0,
          indexes: 1
        }
      ]
    };
    this.databases.unshift(newDb);
    this.documentsMap.set(`${dbName}:${collName}`, []);
    this.indexesMap.set(`${dbName}:${collName}`, [
      { name: '_id_', keys: { _id: 1 }, size: '8 KB', unique: true, background: false, usage: 1 }
    ]);
    return newDb;
  }

  public createCollection(dbName: string, collName: string) {
    const db = this.databases.find((d) => d.name === dbName);
    if (!db) return;
    if (!db.collections.some((c) => c.name === collName)) {
      db.collections.push({
        name: collName,
        count: 0,
        sizeBytes: 0,
        avgObjSize: 0,
        indexes: 1
      });
      this.documentsMap.set(`${dbName}:${collName}`, []);
      this.indexesMap.set(`${dbName}:${collName}`, [
        { name: '_id_', keys: { _id: 1 }, size: '8 KB', unique: true, background: false, usage: 1 }
      ]);
    }
  }

  public dropCollection(dbName: string, collName: string) {
    const db = this.databases.find((d) => d.name === dbName);
    if (!db) return;
    db.collections = db.collections.filter((c) => c.name !== collName);
    this.documentsMap.delete(`${dbName}:${collName}`);
    this.indexesMap.delete(`${dbName}:${collName}`);
  }

  public dropDatabase(dbName: string) {
    this.databases = this.databases.filter((d) => d.name !== dbName);
  }

  public getDocuments(dbName: string, collName: string): MongoDocument[] {
    const key = `${dbName}:${collName}`;
    if (!this.documentsMap.has(key)) {
      // Default to initial companies if it's the companies collection or create empty
      if (collName === 'companies') {
        this.documentsMap.set(key, JSON.parse(JSON.stringify(INITIAL_COMPANIES)));
      } else {
        this.documentsMap.set(key, []);
      }
    }
    return this.documentsMap.get(key) || [];
  }

  public insertDocument(dbName: string, collName: string, doc: MongoDocument): MongoDocument {
    const docs = this.getDocuments(dbName, collName);
    const newDoc = { ...doc };
    if (!newDoc._id) {
      newDoc._id = Math.random().toString(16).substring(2, 26);
    }
    docs.unshift(newDoc);

    // Update collection count
    const db = this.databases.find((d) => d.name === dbName);
    const coll = db?.collections.find((c) => c.name === collName);
    if (coll) {
      coll.count = docs.length;
    }
    return newDoc;
  }

  public updateDocument(dbName: string, collName: string, id: string, updatedDoc: MongoDocument): MongoDocument | null {
    const docs = this.getDocuments(dbName, collName);
    const idx = docs.findIndex((d) => d._id === id);
    if (idx === -1) return null;
    docs[idx] = { ...docs[idx], ...updatedDoc, _id: id };
    return docs[idx];
  }

  public deleteDocument(dbName: string, collName: string, id: string): boolean {
    const docs = this.getDocuments(dbName, collName);
    const idx = docs.findIndex((d) => d._id === id);
    if (idx === -1) return false;
    docs.splice(idx, 1);

    const db = this.databases.find((d) => d.name === dbName);
    const coll = db?.collections.find((c) => c.name === collName);
    if (coll) {
      coll.count = docs.length;
    }
    return true;
  }

  public getIndexes(dbName: string, collName: string) {
    const key = `${dbName}:${collName}`;
    if (!this.indexesMap.has(key)) {
      this.indexesMap.set(key, [
        { name: '_id_', keys: { _id: 1 }, size: '28 KB', unique: true, background: false, usage: 1420 }
      ]);
    }
    return this.indexesMap.get(key) || [];
  }

  public createIndex(dbName: string, collName: string, indexData: any) {
    const indexes = this.getIndexes(dbName, collName);
    indexes.push(indexData);

    const db = this.databases.find((d) => d.name === dbName);
    const coll = db?.collections.find((c) => c.name === collName);
    if (coll) {
      coll.indexes = indexes.length;
    }
    return indexData;
  }

  public dropIndex(dbName: string, collName: string, indexName: string): boolean {
    const indexes = this.getIndexes(dbName, collName);
    const idx = indexes.findIndex((i) => i.name === indexName);
    if (idx === -1) return false;
    indexes.splice(idx, 1);

    const db = this.databases.find((d) => d.name === dbName);
    const coll = db?.collections.find((c) => c.name === collName);
    if (coll) {
      coll.indexes = indexes.length;
    }
    return true;
  }

  public getServerOverview() {
    return {
      version: '7.0.8',
      edition: 'Community',
      uptimeSeconds: 84920,
      host: 'cluster0-shard-00-00.mongodb.net:27017',
      primary: true,
      connections: {
        current: 42,
        available: 958,
        totalCreated: 12480
      },
      memory: {
        residentMB: 284,
        virtualMB: 1240
      },
      network: {
        bytesIn: 104857600,
        bytesOut: 524288000,
        numRequests: 849200
      },
      opcounters: {
        insert: 4500,
        query: 82000,
        update: 12400,
        delete: 1100,
        getmore: 4200,
        command: 145000
      }
    };
  }

  public getServerMonitoring() {
    return {
      opsPerSec: [45, 52, 60, 48, 75, 92, 110, 85, 78, 65, 70, 84, 95, 120, 105, 90, 80, 85, 92, 98],
      connections: [38, 39, 40, 41, 41, 42, 42, 43, 42, 41, 42, 42, 43, 44, 43, 42, 42, 42, 41, 42],
      memoryMB: [260, 262, 265, 268, 270, 272, 275, 278, 280, 281, 282, 283, 284, 284, 284, 284, 284, 285, 284, 284]
    };
  }
}

// Global singleton to persist state in Node server
const globalForStore = globalThis as unknown as { mockStore?: MockDatabaseStore };
export const mockStore = globalForStore.mockStore ?? new MockDatabaseStore();
if (process.env.NODE_ENV !== 'production') globalForStore.mockStore = mockStore;
